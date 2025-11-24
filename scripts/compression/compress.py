"""
Compress full embedding dataset using PQ + Scalar Quantizer
CPU ONLY
"""

import numpy as np
import logging
from pathlib import Path
from compression_utils import ProductQuantizer, ScalarQuantizer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--embeddings", required=True)
    parser.add_argument("--model-dir", default="data/models")
    parser.add_argument("--output-dir", default="data/compressed")
    args = parser.parse_args()

    emb_file = Path(args.embeddings)
    model_dir = Path(args.model_dir)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    logger.info(f"Loading embeddings from {emb_file}")
    vectors = np.load(emb_file)

    # Load PQ model
    pq = ProductQuantizer()
    pq.load(model_dir / "pq_codebook.pkl")

    # Load scalar quantizer
    sq = ScalarQuantizer()
    sq.load(model_dir / "scalar_quantizer.pkl")

    logger.info(f"Encoding {vectors.shape[0]:,} vectors...")

    # PQ encode
    pq_codes = pq.encode(vectors)

    # INT8 quantization
    quantized = sq.quantize(vectors)

    # Save
    np.save(output_dir / "pq_codes.npy", pq_codes)
    np.save(output_dir / "int8_vectors.npy", quantized)

    logger.info("✓ Compression complete")
    logger.info(f"PQ codes saved to: {output_dir/'pq_codes.npy'}")
    logger.info(f"INT8 vectors saved to: {output_dir/'int8_vectors.npy'}")

if __name__ == "__main__":
    main()
