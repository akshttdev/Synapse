"""
Ingest compressed embeddings into Qdrant
CPU ONLY
"""

import numpy as np
import pandas as pd
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct
from pathlib import Path
from tqdm import tqdm
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def ingest_qdrant(
    pq_codes: str,
    metadata_csv: str,
    host: str = "localhost",
    port: int = 6333,
    collection: str = "media",
    batch_size: int = 5000
):
    client = QdrantClient(host=host, port=port)

    pq_codes = np.load(pq_codes)
    metadata = pd.read_csv(metadata_csv)

    assert len(pq_codes) == len(metadata)

    logger.info(f"Uploading {len(metadata):,} items to Qdrant")

    for i in tqdm(range(0, len(metadata), batch_size), desc="Uploading"):
        batch_meta = metadata.iloc[i:i+batch_size]
        batch_codes = pq_codes[i:i+batch_size]

        points = []
        for idx, row in batch_meta.iterrows():
            points.append(PointStruct(
                id=str(row["media_id"]),
                vector=batch_codes[idx % batch_size].tolist(),
                payload=row.to_dict()
            ))

        client.upsert(
            collection_name=collection,
            points=points
        )

    logger.info("✓ Ingestion completed successfully")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--pq-codes", required=True)
    parser.add_argument("--metadata", required=True)
    parser.add_argument("--collection", default="media")
    args = parser.parse_args()

    ingest_qdrant(
        pq_codes=args.pq_codes,
        metadata_csv=args.metadata,
        collection=args.collection
    )
