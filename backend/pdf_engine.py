import io
import os
import time
import psutil
from typing import Tuple, List, Dict, Any

try:
    from pypdf import PdfReader, PdfWriter
except ImportError:
    PdfReader = None
    PdfWriter = None

try:
    from PIL import Image
except ImportError:
    Image = None

try:
    from .energy import estimate_energy_joules, estimate_energy, estimate_carbon_emission
except (ImportError, ValueError):
    from energy import estimate_energy_joules, estimate_energy, estimate_carbon_emission


def is_pdf(filepath_or_bytes) -> bool:
    """
    Detects if the file is a PDF either by path or by header magic bytes.
    """
    if isinstance(filepath_or_bytes, str):
        if filepath_or_bytes.lower().endswith('.pdf'):
            return True
        if os.path.exists(filepath_or_bytes):
            try:
                with open(filepath_or_bytes, 'rb') as f:
                    header = f.read(5)
                    return header.startswith(b'%PDF-')
            except Exception:
                return False
        return False
    elif isinstance(filepath_or_bytes, (bytes, bytearray)):
        return filepath_or_bytes.startswith(b'%PDF-')
    return False


def _compress_pdf_core(
    data: bytes,
    level: int = 6,
    deduplicate: bool = True,
    optimize_images: bool = False,
    image_quality: int = 75,
    max_image_dim: int = 1400
) -> bytes:
    """
    Compresses PDF content streams and object dictionaries while preserving 100% valid PDF structure.
    """
    if not PdfReader or not PdfWriter:
        return data

    try:
        reader = PdfReader(io.BytesIO(data))
        if reader.is_encrypted:
            try:
                reader.decrypt("")
            except Exception:
                # Password-protected PDF, return original
                return data

        writer = PdfWriter()

        for page in reader.pages:
            writer.add_page(page)
            try:
                writer.pages[-1].compress_content_streams(level=level)
            except Exception:
                pass

        if deduplicate:
            try:
                # pypdf 6+ compatible deduplication
                writer.compress_identical_objects(remove_duplicates=True, remove_unreferenced=True)
            except Exception:
                try:
                    writer.compress_identical_objects(remove_identicals=True, remove_orphans=True)
                except Exception:
                    pass

        # Embedded image optimization
        if optimize_images and Image:
            for page in writer.pages:
                try:
                    for img_file in page.images:
                        try:
                            img_data = img_file.data
                            img_obj = Image.open(io.BytesIO(img_data))
                            w, h = img_obj.size
                            if max_image_dim and max(w, h) > max_image_dim:
                                img_obj.thumbnail((max_image_dim, max_image_dim), Image.Resampling.LANCZOS)
                                
                            out_img_buf = io.BytesIO()
                            has_alpha = img_obj.mode in ('RGBA', 'LA') or (img_obj.mode == 'P' and 'transparency' in img_obj.info)
                            
                            if has_alpha:
                                img_obj.save(out_img_buf, format='PNG', optimize=True, compress_level=9)
                            else:
                                img_rgb = img_obj.convert('RGB')
                                img_rgb.save(out_img_buf, format='JPEG', quality=image_quality, optimize=True)
                                
                            opt_val = out_img_buf.getvalue()
                            if len(opt_val) < len(img_data) * 0.98:
                                img_file.replace(Image.open(io.BytesIO(opt_val)), quality=image_quality)
                        except Exception:
                            continue
                except Exception:
                    pass

        out_buf = io.BytesIO()
        writer.write(out_buf)
        compressed_bytes = out_buf.getvalue()

        # Sanity check: must be valid PDF header
        if compressed_bytes.startswith(b'%PDF-'):
            # Return compressed bytes (or original if compressed is unexpectedly larger)
            return compressed_bytes if len(compressed_bytes) <= len(data) else data
        return data

    except Exception as e:
        print(f"PDF compression error: {e}")
        return data


def run_pdf_compression_experiment(filepath: str, carbon_intensity: float = 500.0) -> Tuple[List[Dict[str, Any]], Dict[str, bytes]]:
    """
    Executes multi-objective carbon-aware PDF compression benchmarking.
    Evaluates:
    - Eco-PDF (Dynamic adaptive Flate level based on grid carbon intensity)
    - Flate-PDF (Standard ISO 32000-1 level 6)
    - Fast-PDF (Level 1 fast linear stream pass)
    - Deep-PDF (Level 9 + deep deduplication + stream compaction)
    
    Returns:
    - results (list of algorithm benchmark dicts)
    - compressed_artifacts (dict mapping algorithm name to compressed PDF bytes)
    """
    try:
        with open(filepath, 'rb') as f:
            data = f.read()
    except Exception as e:
        raise RuntimeError(f"Could not read PDF {filepath}: {e}")

    original_size = len(data)
    results = []
    compressed_artifacts = {}

    process = psutil.Process(os.getpid())

    # Determine dynamic eco level based on grid carbon
    eco_level = 4 if carbon_intensity > 550 else (6 if carbon_intensity > 300 else 8)

    strategies = [
        ("Fast-PDF", {"level": 1, "deduplicate": False, "optimize_images": False, "image_quality": 85, "max_image_dim": None}),
        ("Flate-PDF", {"level": 6, "deduplicate": True, "optimize_images": False, "image_quality": 80, "max_image_dim": 1600}),
        ("Eco-PDF", {"level": eco_level, "deduplicate": True, "optimize_images": True, "image_quality": 75, "max_image_dim": 1400}),
        ("Deep-PDF", {"level": 9, "deduplicate": True, "optimize_images": True, "image_quality": 65, "max_image_dim": 1100})
    ]

    for alg_name, params in strategies:
        start_time = time.perf_counter()
        cpu_start = process.cpu_percent(interval=None)

        try:
            compressed = _compress_pdf_core(
                data,
                level=params["level"],
                deduplicate=params["deduplicate"],
                optimize_images=params["optimize_images"],
                image_quality=params.get("image_quality", 75),
                max_image_dim=params.get("max_image_dim", 1400)
            )
            compressed_size = len(compressed)
            compressed_artifacts[alg_name] = compressed
        except Exception as e:
            print(f"Error in {alg_name}: {e}")
            compressed = data
            compressed_size = original_size
            compressed_artifacts[alg_name] = data

        end_time = time.perf_counter()
        cpu_end = process.cpu_percent(interval=None)

        comp_time = max(0.001, round(end_time - start_time, 4))
        mem_info = process.memory_info()
        cpu_usage = max(1.0, cpu_end)

        energy_j = estimate_energy_joules(comp_time, cpu_usage)
        energy_wh = estimate_energy(comp_time, cpu_usage)
        carbon_g = estimate_carbon_emission(energy_wh, carbon_intensity)

        ratio = round(original_size / max(1, compressed_size), 3) if original_size > 0 else 1.0

        results.append({
            "algorithm": alg_name,
            "compressed_size": compressed_size,
            "compression_ratio": ratio,
            "compression_time": comp_time,
            "cpu_usage": cpu_usage,
            "memory_usage_mb": round(mem_info.rss / (1024 * 1024), 2),
            "energy_joules": energy_j,
            "energy": energy_wh,
            "carbon": carbon_g,
            "skipped": False
        })

    # Baseline comparison: Flate-PDF (Standard PDF Level 6 baseline)
    flate_result = next((r for r in results if r["algorithm"] == "Flate-PDF"), results[0])
    baseline_carbon = flate_result["carbon"]
    baseline_energy_j = flate_result["energy_joules"]

    for r in results:
        r["baseline_gzip_carbon"] = baseline_carbon
        r["carbon_saved_vs_gzip"] = round(baseline_carbon - r["carbon"], 6)
        r["energy_saved_vs_gzip_j"] = round(baseline_energy_j - r["energy_joules"], 4)

    return results, compressed_artifacts
