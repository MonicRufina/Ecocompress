import os
import math
import collections

def analyze_file(filepath: str):
    """
    File, Entropy, and Compressibility Analysis.
    Reads a file and extracts key characteristics.
    """
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"File not found: {filepath}")
    
    file_stats = os.stat(filepath)
    original_size = file_stats.st_size
    filename = os.path.basename(filepath)
    ext = os.path.splitext(filename)[1].lower().replace('.', '')
    
    try:
        with open(filepath, 'rb') as f:
            data = f.read()
    except Exception as e:
        raise RuntimeError(f"Could not read file {filepath}: {e}")
        
    num_bytes = len(data)
    
    if num_bytes == 0:
        return {
            "file_name": filename,
            "file_type": ext.upper() if ext else "EMPTY",
            "original_size": 0,
            "entropy": 0.0,
            "repetition_level": "None",
            "compressibility": "None",
            "unique_symbols": 0,
            "redundancy_score": 0.0,
            "ascii_ratio": 0.0
        }
    
    # Frequency analysis
    counter = collections.Counter(data)
    probabilities = [count / num_bytes for count in counter.values()]
    
    # Shannon Entropy (0.0 to 8.0 bits/byte)
    entropy = -sum(p * math.log2(p) for p in probabilities if p > 0)
    
    # Redundancy score (1 - H / 8)
    redundancy_score = max(0.0, min(1.0, 1.0 - (entropy / 8.0)))
    
    # ASCII ratio
    ascii_count = sum(1 for b in data if 32 <= b <= 126 or b in (9, 10, 13))
    ascii_ratio = round(ascii_count / num_bytes, 4)
    
    # Repetition Level & Compressibility
    if entropy < 4.0:
        repetition_level = "High"
        compressibility = "High (Highly Redundant)"
    elif entropy < 7.0:
        repetition_level = "Medium"
        compressibility = "Medium"
    else:
        repetition_level = "Low"
        compressibility = "Low (High Entropy)"
        
    already_compressed = ext in ['zip', 'gz', 'mp4', 'jpg', 'jpeg', 'png', 'rar', '7z', 'mp3', 'webp']
    if already_compressed:
        compressibility = "Low (Pre-compressed Media/Archive)"
        
    return {
        "file_name": filename,
        "file_type": ext.upper() if ext else "BINARY",
        "original_size": original_size,
        "entropy": round(entropy, 4),
        "repetition_level": repetition_level,
        "compressibility": compressibility,
        "unique_symbols": len(counter),
        "redundancy_score": round(redundancy_score * 100, 2),
        "ascii_ratio": ascii_ratio
    }

def profile_file_deep(data: bytes, filename: str = "sample.bin"):
    """
    Generates detailed profiling data: byte frequencies (0..255),
    histogram buckets, chunk map, and learned selector prediction.
    """
    num_bytes = len(data)
    ext = os.path.splitext(filename)[1].lower().replace('.', '')
    
    if num_bytes == 0:
        return {
            "file_name": filename,
            "file_type": ext.upper() if ext else "EMPTY",
            "original_size": 0,
            "entropy": 0.0,
            "repetition_level": "None",
            "compressibility": "None",
            "unique_symbols": 0,
            "byte_frequencies": [0] * 256,
            "entropy_histogram": [0] * 16,
            "chunk_map": [],
            "prediction": {
                "predicted_codec": "DEFLATE",
                "confidence": 50.0,
                "reason": "Empty file",
                "features": {}
            }
        }
        
    counter = collections.Counter(data)
    probabilities = [count / num_bytes for count in counter.values()]
    entropy = -sum(p * math.log2(p) for p in probabilities if p > 0)
    redundancy_score = max(0.0, min(1.0, 1.0 - (entropy / 8.0)))
    
    # 256-byte frequency distribution
    byte_freq = [counter.get(i, 0) for i in range(256)]
    
    # 16-bucket entropy histogram (divide bytes 0..255 into 16 slices of 16 values)
    entropy_histogram = []
    for b in range(16):
        bucket_count = sum(byte_freq[b * 16 : (b + 1) * 16])
        entropy_histogram.append(bucket_count)
        
    # Chunk map: divide file into 16 or 32 blocks
    num_chunks = 16 if num_bytes < 100000 else 32
    chunk_size = max(1, math.ceil(num_bytes / num_chunks))
    chunk_map = []
    
    for c in range(min(num_chunks, math.ceil(num_bytes / chunk_size))):
        start = c * chunk_size
        end = min(start + chunk_size, num_bytes)
        chunk = data[start:end]
        if not chunk:
            continue
        c_counter = collections.Counter(chunk)
        c_probs = [cnt / len(chunk) for cnt in c_counter.values()]
        c_entropy = -sum(p * math.log2(p) for p in c_probs if p > 0)
        
        # Decide chunk codec recommendation based on slice entropy and repetition
        if c_entropy < 3.2:
            chunk_codec = "LZ77"
            chunk_color = "#3b82f6" # Blue
            tag = "Repetitive Stream"
        elif c_entropy < 5.8:
            chunk_codec = "Eco-LZH"
            chunk_color = "#10b981" # Green
            tag = "Structured Mix"
        elif c_entropy < 7.2:
            chunk_codec = "DEFLATE"
            chunk_color = "#8b5cf6" # Purple
            tag = "Standard Block"
        else:
            chunk_codec = "Huffman" if len(c_counter) < 120 else "Raw/Bypass"
            chunk_color = "#f59e0b" # Amber
            tag = "High Entropy Slice"
            
        chunk_map.append({
            "block_index": c + 1,
            "start_byte": start,
            "end_byte": end,
            "size": len(chunk),
            "entropy": round(c_entropy, 3),
            "recommended_codec": chunk_codec,
            "color": chunk_color,
            "tag": tag
        })
        
    # Learned Selector Prediction (Heuristic ML feature model)
    unique_symbols = len(counter)
    ascii_count = sum(1 for b in data if 32 <= b <= 126 or b in (9, 10, 13))
    ascii_ratio = ascii_count / num_bytes
    
    # Feature scores
    features = {
        "shannon_entropy": round(entropy, 4),
        "redundancy_pct": round(redundancy_score * 100, 2),
        "unique_symbols": unique_symbols,
        "ascii_ratio": round(ascii_ratio, 4),
        "file_size_kb": round(num_bytes / 1024, 2)
    }
    
    # Prediction logic
    if ext in ['zip', 'gz', 'mp4', 'jpg', 'png', 'rar', '7z', 'mp3']:
        pred_codec = "Bypass / Store"
        confidence = 96.5
        pred_reason = "File is pre-compressed binary data; re-compressing wastes compute and increases carbon emissions."
    elif entropy < 3.8:
        pred_codec = "Eco-LZH"
        confidence = 94.2
        pred_reason = "High redundancy detected; adaptive Eco-LZH will strip pattern matches with minimal CPU cycles."
    elif ascii_ratio > 0.8:
        pred_codec = "DEFLATE"
        confidence = 91.8
        pred_reason = "Structured text / code detected; DEFLATE provides optimal trade-off of LZ77 sliding window and Huffman entropy."
    elif entropy < 6.5:
        pred_codec = "Eco-LZH"
        confidence = 88.4
        pred_reason = "Medium entropy payload; bounded window compression minimizes watt-seconds while maintaining solid ratio."
    else:
        pred_codec = "Huffman"
        confidence = 84.1
        pred_reason = "High entropy with non-uniform frequency distribution; single-pass Huffman coding avoids sliding window overhead."
        
    return {
        "file_name": filename,
        "file_type": ext.upper() if ext else "BINARY",
        "original_size": num_bytes,
        "entropy": round(entropy, 4),
        "repetition_level": "High" if entropy < 4.0 else ("Medium" if entropy < 7.0 else "Low"),
        "compressibility": "High" if entropy < 4.0 else ("Medium" if entropy < 7.0 else "Low"),
        "unique_symbols": unique_symbols,
        "redundancy_score": round(redundancy_score * 100, 2),
        "ascii_ratio": round(ascii_ratio, 4),
        "byte_frequencies": byte_freq,
        "entropy_histogram": entropy_histogram,
        "chunk_map": chunk_map,
        "prediction": {
            "predicted_codec": pred_codec,
            "confidence": confidence,
            "reason": pred_reason,
            "features": features
        }
    }
