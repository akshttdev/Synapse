# scripts/qdrant/create_collection.py
"""
Create Qdrant collection with PQ + INT8 compression
CPU ONLY
"""

from qdrant_client import QdrantClient
from qdrant_client.models import (
    VectorParams, Distance, OptimizersConfigDiff,
    HnswConfigDiff, QuantizationConfig, ScalarQuantization,
    ScalarType, ProductQuantization, CompressionRatio
)
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_qdrant_collection(
    host: str = "localhost",
    port: int = 6333,
    collection_name: str = "media",
    vector_size: int = 1024,  # Original ImageBind dimension
    use_quantization: bool = True
):
    """Create optimized Qdrant collection"""
    
    logger.info(f"Connecting to Qdrant at {host}:{port}")
    client = QdrantClient(host=host, port=port)
    
    # Check if collection exists
    collections = client.get_collections().collections
    if any(c.name == collection_name for c in collections):
        logger.warning(f"Collection '{collection_name}' already exists!")
        response = input("Delete and recreate? (yes/no): ")
        if response.lower() == 'yes':
            client.delete_collection(collection_name)
            logger.info(f"Deleted existing collection")
        else:
            logger.info("Keeping existing collection")
            return
    
    logger.info(f"Creating collection '{collection_name}'...")
    
    # Vector configuration
    vectors_config = VectorParams(
        size=vector_size,
        distance=Distance.COSINE,
        on_disk=False  # Keep vectors in RAM for speed
    )
    
    # HNSW configuration
    hnsw_config = HnswConfigDiff(
        m=16,  # Number of edges per node
        ef_construct=200,  # Quality during indexing
        full_scan_threshold=10000  # Switch to brute force below this
    )
    
    # Optimizers configuration
    optimizers_config = OptimizersConfigDiff(
        indexing_threshold=20000  # Start HNSW after 20k vectors
    )
    
    # Create collection
    client.create_collection(
        collection_name=collection_name,
        vectors_config=vectors_config,
        hnsw_config=hnsw_config,
        optimizers_config=optimizers_config
    )
    
    logger.info("✓ Collection created")
    
    # Enable quantization after creation
    if use_quantization:
        logger.info("Enabling Scalar Quantization (INT8)...")
        
        client.update_collection(
            collection_name=collection_name,
            quantization_config=ScalarQuantization(
                scalar=ScalarType.INT8,
                quantile=0.99,  # Use 99th percentile for scaling
                always_ram=True  # Keep quantized vectors in RAM
            )
        )
        
        logger.info("✓ Scalar Quantization enabled")
    
    # Verify collection
    info = client.get_collection(collection_name)
    logger.info(f"\n=== Collection Info ===")
    logger.info(f"Name: {info.config.params.vectors.size}")
    logger.info(f"Vectors: {info.points_count}")
    logger.info(f"HNSW M: {info.config.hnsw_config.m}")
    logger.info(f"HNSW ef_construct: {info.config.hnsw_config.ef_construct}")
    logger.info(f"Quantization: {info.config.quantization_config}")
    
    logger.info("\n✓ Qdrant collection ready!")

if __name__ == "__main__":
    create_qdrant_collection(
        host="localhost",
        port=6333,
        collection_name="media",
        vector_size=1024,
        use_quantization=True
    )