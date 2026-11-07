# Re-export from compression_engine to avoid stdlib conflict in Python 3.14+
try:
    from .compression_engine import (
        HuffmanNode,
        compress_huffman,
        compress_lz77,
        compress_deflate,
        compress_ecolzh,
        run_compression_experiment
    )
except ImportError:
    from compression_engine import (
        HuffmanNode,
        compress_huffman,
        compress_lz77,
        compress_deflate,
        compress_ecolzh,
        run_compression_experiment
    )
