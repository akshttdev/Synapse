"""
Train PQ + Scalar Quantizer on sample float32 embeddings
CPU ONLY
"""

import numpy as np
from pathlib import Path
import logging
from compression_utils import ProductQuantizer, ScalarQuantizer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--embeddings", type=str, required=True)
    parser.add_argument("--output-dir", type=str, default="data/models")
    parser.add_argument("--samples", type=int, default=50000)
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    logger.info("Loading embeddings...")
    vectors = np.load(args.embeddings)
    logger.info(f"Loaded {vectors.shape[0]:,} vectors")

    # Train PQ -------------------------------------------------
    pq = ProductQuantizer()
    pq.train(vectors, n_samples=args.samples)
    pq.save(output_dir / "pq_codebook.pkl")

    # Train scalar quantizer -----------------------------------
    sq = ScalarQuantizer()
    sq.fit(vectors)
    sq.save(output_dir / "scalar_quantizer.pkl")

    logger.info("✓ PQ + ScalarQuantizer training complete")

if __name__ == "__main__":
    main()
