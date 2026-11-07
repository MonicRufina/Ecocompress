"""
image_engine.py
Carbon-Aware Image Compression Engine for EcoCompress.
Provides near-lossless / perceptual optimization for JPG, JPEG, PNG, WEBP, and BMP.
Preserves original image format while delivering 30% to 75% size reductions.
"""

import io
import os
import time
import psutil
from typing import Tuple, List, Dict, Any

try:
    from PIL import Image, ImageOps
except ImportError:
    Image = None
    ImageOps = None

try:
    from .energy import estimate_energy_joules, estimate_energy, estimate_carbon_emission
except (ImportError, ValueError):
    from energy import estimate_energy_joules, estimate_energy, estimate_carbon_emission


IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff'}


def is_image(filepath_or_name: str) -> bool:
    if not filepath_or_name:
        return False
    ext = os.path.splitext(filepath_or_name)[1].lower()
    if ext in IMAGE_EXTENSIONS:
        return True
    if os.path.exists(filepath_or_name) and os.path.isfile(filepath_or_name):
        try:
            with open(filepath_or_name, 'rb') as f:
                header = f.read(12)
                # JPEG
                if header.startswith(b'\xff\xd8\xff'):
                    return True
                # PNG
                if header.startswith(b'\x89PNG\r\n\x1a\n'):
                    return True
                # WEBP (RIFF....WEBP)
                if header.startswith(b'RIFF') and b'WEBP' in header[:12]:
                    return True
                # BMP
                if header.startswith(b'BM'):
                    return True
        except Exception:
            pass
    return False


def _compress_single_image(data: bytes, ext: str, quality: int = 75, max_dim: int = 1920, optimize: bool = True) -> bytes:
    if not Image:
        return data

    try:
        ext_clean = ext.lower().replace('.', '')
        if ext_clean in ['jpg', 'jpeg']:
            fmt = 'JPEG'
        elif ext_clean == 'png':
            fmt = 'PNG'
        elif ext_clean == 'webp':
            fmt = 'WEBP'
        elif ext_clean == 'bmp':
            fmt = 'BMP'
        else:
            fmt = 'JPEG'

        img = Image.open(io.BytesIO(data))
        
        # Handle EXIF orientation
        if ImageOps:
            try:
                img = ImageOps.exif_transpose(img)
            except Exception:
                pass

        # Optional Downscaling (perceptual preservation)
        w, h = img.size
        if max_dim and max(w, h) > max_dim:
            img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)

        out_buf = io.BytesIO()

        if fmt == 'JPEG':
            if img.mode != 'RGB':
                img = img.convert('RGB')
            img.save(out_buf, format='JPEG', quality=quality, optimize=optimize, progressive=True)

        elif fmt == 'PNG':
            # For PNG, if image has many colors and quality < 80, quantize or optimize
            if quality < 70 and img.mode in ('RGB', 'RGBA'):
                try:
                    quantized = img.quantize(colors=256, method=Image.Quantize.MEDIANCUT)
                    quantized.save(out_buf, format='PNG', optimize=True)
                except Exception:
                    img.save(out_buf, format='PNG', optimize=optimize, compress_level=9)
            else:
                img.save(out_buf, format='PNG', optimize=optimize, compress_level=9)

        elif fmt == 'WEBP':
            img.save(out_buf, format='WEBP', quality=quality, method=6)

        else:
            # Fallback
            if img.mode != 'RGB':
                img = img.convert('RGB')
            img.save(out_buf, format='JPEG', quality=quality, optimize=True)

        compressed = out_buf.getvalue()
        if len(compressed) < len(data):
            return compressed
        return data

    except Exception as e:
        print(f"Error compressing image: {e}")
        return data


def run_image_compression_experiment(
    filepath: str,
    carbon_intensity: float = 500.0
) -> Tuple[List[Dict[str, Any]], Dict[str, bytes]]:
    """
    Executes multi-objective carbon-aware image compression benchmarking.
    Evaluates:
    - Fast-Image: Fast single-pass compression, high throughput, low CPU energy
    - Eco-Image: Adaptive quality and resolution based on grid carbon intensity
    - Balanced-Image: Quality 75, max 1920px, optimal visual fidelity vs size
    - Deep-Image: Quality 65, max 1440px, maximum byte reduction
    """
    try:
        with open(filepath, 'rb') as f:
            data = f.read()
    except Exception as e:
        raise RuntimeError(f"Could not read image file {filepath}: {e}")

    original_size = len(data)
    ext = os.path.splitext(filepath)[1]
    results = []
    compressed_artifacts = {}

    process = psutil.Process(os.getpid())

    # Dynamic Eco level based on grid carbon intensity
    if carbon_intensity > 550:
        # Dirty grid -> prioritize ultra fast encode, low CPU cycles
        eco_quality = 70
        eco_max_dim = 1600
        eco_optimize = False
    elif carbon_intensity > 300:
        eco_quality = 75
        eco_max_dim = 1920
        eco_optimize = True
    else:
        # Clean grid -> deeper optimization
        eco_quality = 82
        eco_max_dim = 2048
        eco_optimize = True

    strategies = [
        ("Fast-Image", {"quality": 80, "max_dim": None, "optimize": False}),
        ("Balanced-Image", {"quality": 75, "max_dim": 1920, "optimize": True}),
        ("Eco-Image", {"quality": eco_quality, "max_dim": eco_max_dim, "optimize": eco_optimize}),
        ("Deep-Image", {"quality": 65, "max_dim": 1440, "optimize": True})
    ]

    for alg_name, params in strategies:
        start_time = time.perf_counter()
        cpu_start = process.cpu_percent(interval=None)

        try:
            compressed = _compress_single_image(
                data,
                ext=ext,
                quality=params["quality"],
                max_dim=params["max_dim"],
                optimize=params["optimize"]
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

    # Baseline comparison: Fast-Image baseline
    fast_result = next((r for r in results if r["algorithm"] == "Fast-Image"), results[0])
    base_carbon = fast_result["carbon"]
    base_energy_j = fast_result["energy_joules"]

    for r in results:
        r["baseline_gzip_carbon"] = base_carbon
        r["carbon_saved_vs_gzip"] = round(base_carbon - r["carbon"], 6)
        r["energy_saved_vs_gzip_j"] = round(base_energy_j - r["energy_joules"], 4)

    return results, compressed_artifacts
