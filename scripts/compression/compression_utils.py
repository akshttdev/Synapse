"""
Product Quantization (PQ) + Scalar Quantization (INT8)
Utility functions for vector compression
CPU ONLY
"""

import numpy as np
import pickle
from pathlib import Path
import logging
from typing import Optional, Tuple
from sklearn.cluster import MiniBatchKMeans
from tqdm import tqdm

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------
# PRODUCT QUANTIZER
# ---------------------------------------------------------
class ProductQuantizer:
    def __init__(
        self,
        n_subspaces: int = 8,      # M
        n_centroids: int = 256,    # 2^8 centers
        vector_dim: int = 1024
    ):
        self.n_subspaces = n_subspaces
        self.n_centroids = n_centroids
        self.vector_dim = vector_dim

        assert vector_dim % n_subspaces == 0
        self.subvector_dim = vector_dim // n_subspaces

        self.codebooks = []
        self.is_trained = False

    def train(self, vectors: np.ndarray, n_samples: int = 50000):
        """ Train PQ codebooks on CPU """
        logger.info(f"Training PQ with {self.n_subspaces} subspaces...")

        # Sample subset
        if len(vectors) > n_samples:
            idx = np.random.choice(len(vectors), n_samples, replace=False)
            vectors = vectors[idx]

        vectors = vectors.astype(np.float32)

        for m in tqdm(range(self.n_subspaces), desc="Training PQ"):
            start = m * self.subvector_dim
            end = start + self.subvector_dim

            subvectors = vectors[:, start:end]

            kmeans = MiniBatchKMeans(
                n_clusters=self.n_centroids,
                batch_size=1000,
                max_iter=50,
                verbose=0,
                random_state=42
            )
            kmeans.fit(subvectors)
            self.codebooks.append(kmeans.cluster_centers_)

        self.is_trained = True
        logger.info("✓ PQ training complete")

    def encode(self, vectors: np.ndarray) -> np.ndarray:
        """ Encode vectors into PQ codes """
        if not self.is_trained:
            raise ValueError("PQ is not trained yet")

        vectors = vectors.astype(np.float32)
        n_vectors = len(vectors)
        codes = np.zeros((n_vectors, self.n_subspaces), dtype=np.uint8)

        for m, codebook in enumerate(self.codebooks):
            start = m * self.subvector_dim
            end = start + self.subvector_dim

            subvectors = vectors[:, start:end]
            distances = np.linalg.norm(
                subvectors[:, None, :] - codebook[None, :, :],
                axis=2
            )
            codes[:, m] = np.argmin(distances, axis=1)

        return codes

    def decode(self, codes: np.ndarray) -> np.ndarray:
        """ Decode PQ codes back into coarse vectors """
        n_vectors = len(codes)
        reconstructed = np.zeros((n_vectors, self.vector_dim), dtype=np.float32)

        for m, codebook in enumerate(self.codebooks):
            start = m * self.subvector_dim
            end = start + self.subvector_dim
            reconstructed[:, start:end] = codebook[codes[:, m]]

        return reconstructed

    def save(self, path: str):
        data = {
            "n_subspaces": self.n_subspaces,
            "n_centroids": self.n_centroids,
            "vector_dim": self.vector_dim,
            "codebooks": self.codebooks,
            "is_trained": self.is_trained
        }
        with open(path, "wb") as f:
            pickle.dump(data, f)
        logger.info(f"✓ Saved PQ model to {path}")

    def load(self, path: str):
        with open(path, "rb") as f:
            data = pickle.load(f)

        self.n_subspaces = data["n_subspaces"]
        self.n_centroids = data["n_centroids"]
        self.vector_dim = data["vector_dim"]
        self.codebooks = data["codebooks"]
        self.is_trained = data["is_trained"]

        logger.info(f"✓ Loaded PQ model from {path}")


# ---------------------------------------------------------
# SCALAR QUANTIZER (FLOAT32 → INT8)
# ---------------------------------------------------------
class ScalarQuantizer:
    def __init__(self):
        self.min_val = None
        self.max_val = None
        self.is_fitted = False

    def fit(self, vectors: np.ndarray):
        """Learn min/max values per dimension"""
        self.min_val = vectors.min(axis=0)
        self.max_val = vectors.max(axis=0)
        self.is_fitted = True
        logger.info("✓ ScalarQuantizer fitted")

    def quantize(self, vectors: np.ndarray) -> np.ndarray:
        """Normalize → scale to [0,255] → uint8"""
        if not self.is_fitted:
            raise ValueError("Quantizer not fitted")

        normalized = (vectors - self.min_val) / (self.max_val - self.min_val + 1e-8)
        return (normalized * 255).astype(np.uint8)

    def dequantize(self, quantized: np.ndarray) -> np.ndarray:
        """uint8 → float32"""
        normalized = quantized.astype(np.float32) / 255.0
        return normalized * (self.max_val - self.min_val) + self.min_val

    def save(self, path: str):
        data = {
            "min_val": self.min_val,
            "max_val": self.max_val,
            "is_fitted": self.is_fitted
        }
        with open(path, "wb") as f:
            pickle.dump(data, f)
        logger.info(f"✓ Saved scalar quantizer to {path}")

    def load(self, path: str):
        with open(path, "rb") as f:
            data = pickle.load(f)
        self.min_val = data["min_val"]
        self.max_val = data["max_val"]
        self.is_fitted = data["is_fitted"]
        logger.info(f"✓ Loaded scalar quantizer from {path}")


# ---------------------------------------------------------
# OPTIONAL: EVALUATION METRICS
# ---------------------------------------------------------
def evaluate_compression(original: np.ndarray, reconstructed: np.ndarray):
    mse = np.mean((original - reconstructed) ** 2)
    mae = np.mean(np.abs(original - reconstructed))
    cosine = np.mean(
        np.sum(
            original / (np.linalg.norm(original, axis=1, keepdims=True) + 1e-8) *
            reconstructed / (np.linalg.norm(reconstructed, axis=1, keepdims=True) + 1e-8),
            axis=1
        )
    )

    return {
        "mse": mse,
        "mae": mae,
        "cosine_similarity": cosine
    }
