"""
office_engine.py
Carbon-Aware Office Document Compression Engine for EcoCompress.
Optimizes Microsoft Office documents (DOCX, XLSX, PPTX) and ZIP archives by
recompressing embedded media and maximizing DEFLATE packaging.
Preserves 100% valid Office Open XML formats.
"""

import io
import os
import time
import zipfile
import psutil
from typing import Tuple, List, Dict, Any

try:
    from PIL import Image
except ImportError:
    Image = None

try:
    from .energy import estimate_energy_joules, estimate_energy, estimate_carbon_emission
except (ImportError, ValueError):
    from energy import estimate_energy_joules, estimate_energy, estimate_carbon_emission


OFFICE_EXTENSIONS = {'.docx', '.xlsx', '.pptx', '.docm', '.xlsm', '.pptm'}


def is_office(filepath_or_name: str) -> bool:
    if not filepath_or_name:
        return False
    ext = os.path.splitext(filepath_or_name)[1].lower()
    if ext in OFFICE_EXTENSIONS:
        return True
    return False


def _compress_office_core(
    data: bytes,
    recompress_media: bool = True,
    media_quality: int = 75,
    max_media_dim: int = 1600,
    compress_level: int = 9
) -> bytes:
    """
    Unpacks Office Open XML (ZIP container) in memory, optimizes internal media files,
    re-compresses all streams with maximum Deflate level, and reassembles a valid Office file.
    """
    try:
        in_buf = io.BytesIO(data)
        if not zipfile.is_zipfile(in_buf):
            return data

        out_buf = io.BytesIO()

        with zipfile.ZipFile(in_buf, 'r') as in_zip:
            with zipfile.ZipFile(out_buf, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=compress_level) as out_zip:
                for item in in_zip.infolist():
                    file_data = in_zip.read(item.filename)
                    filename_lower = item.filename.lower()

                    # Check if this item is an embedded image in the media/ folder
                    is_media_image = (
                        ('/media/' in filename_lower or filename_lower.startswith('media/')) and
                        any(filename_lower.endswith(e) for e in ['.jpg', '.jpeg', '.png', '.webp', '.bmp'])
                    )

                    if recompress_media and is_media_image and Image:
                        try:
                            img = Image.open(io.BytesIO(file_data))
                            w, h = img.size
                            if max_media_dim and max(w, h) > max_media_dim:
                                img.thumbnail((max_media_dim, max_media_dim), Image.Resampling.LANCZOS)

                            img_buf = io.BytesIO()
                            if filename_lower.endswith(('.jpg', '.jpeg')):
                                if img.mode != 'RGB':
                                    img = img.convert('RGB')
                                img.save(img_buf, format='JPEG', quality=media_quality, optimize=True)
                            elif filename_lower.endswith('.png'):
                                img.save(img_buf, format='PNG', optimize=True, compress_level=9)
                            else:
                                if img.mode != 'RGB':
                                    img = img.convert('RGB')
                                img.save(img_buf, format='JPEG', quality=media_quality, optimize=True)

                            opt_media = img_buf.getvalue()
                            if len(opt_media) < len(file_data):
                                file_data = opt_media
                        except Exception:
                            pass

                    # Write back with Deflate compression
                    out_zip.writestr(item, file_data)

        compressed = out_buf.getvalue()
        if len(compressed) < len(data):
            return compressed
        return data

    except Exception as e:
        print(f"Error optimizing Office document: {e}")
        return data


def run_office_compression_experiment(
    filepath: str,
    carbon_intensity: float = 500.0
) -> Tuple[List[Dict[str, Any]], Dict[str, bytes]]:
    """
    Executes multi-objective carbon-aware Office document benchmarking.
    Evaluates:
    - Fast-Docx: Recompresses XML streams at Level 1, skips heavy image re-encoding
    - Eco-Docx: Dynamic adaptive media compression based on grid carbon intensity
    - Balanced-Docx: Recompresses XML at Level 6, optimizes media with quality 75
    - Deep-Docx: Deep media optimization (quality 65, max 1280px) + Level 9 packaging
    """
    try:
        with open(filepath, 'rb') as f:
            data = f.read()
    except Exception as e:
        raise RuntimeError(f"Could not read Office file {filepath}: {e}")

    original_size = len(data)
    results = []
    compressed_artifacts = {}

    process = psutil.Process(os.getpid())

    # Dynamic Eco level based on grid carbon
    if carbon_intensity > 550:
        eco_quality = 70
        eco_dim = 1440
        eco_lvl = 6
    elif carbon_intensity > 300:
        eco_quality = 75
        eco_dim = 1600
        eco_lvl = 6
    else:
        eco_quality = 80
        eco_dim = 1920
        eco_lvl = 9

    strategies = [
        ("Fast-Docx", {"recompress_media": False, "media_quality": 85, "max_media_dim": 1920, "compress_level": 1}),
        ("Balanced-Docx", {"recompress_media": True, "media_quality": 75, "max_media_dim": 1600, "compress_level": 6}),
        ("Eco-Docx", {"recompress_media": True, "media_quality": eco_quality, "max_media_dim": eco_dim, "compress_level": eco_lvl}),
        ("Deep-Docx", {"recompress_media": True, "media_quality": 65, "max_media_dim": 1280, "compress_level": 9})
    ]

    for alg_name, params in strategies:
        start_time = time.perf_counter()
        cpu_start = process.cpu_percent(interval=None)

        try:
            compressed = _compress_office_core(
                data,
                recompress_media=params["recompress_media"],
                media_quality=params["media_quality"],
                max_media_dim=params["max_media_dim"],
                compress_level=params["compress_level"]
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
            "energy_joules": energy_j,
            "energy": energy_wh,
            "carbon": carbon_g,
            "skipped": False
        })

    # Baseline comparison: Fast-Docx baseline
    fast_result = next((r for r in results if r["algorithm"] == "Fast-Docx"), results[0])
    base_carbon = fast_result["carbon"]
    base_energy_j = fast_result["energy_joules"]

    for r in results:
        r["baseline_gzip_carbon"] = base_carbon
        r["carbon_saved_vs_gzip"] = round(base_carbon - r["carbon"], 6)
        r["energy_saved_vs_gzip_j"] = round(base_energy_j - r["energy_joules"], 4)

    return results, compressed_artifacts
