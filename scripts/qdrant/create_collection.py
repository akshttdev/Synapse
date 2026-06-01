#!/usr/bin/env python3
"""
Create / ensure the Qdrant collection with the schema Synapse expects:

    1024-d  ·  Cosine  ·  HNSW(m=16, ef_construct=200)  ·  INT8 scalar quant
    payload indexes:  modality (keyword), tag (keyword)

Driven by Settings (.env): works against Qdrant Cloud (URL + api_key) or a local
container. Non-interactive and idempotent — safe to run on every deploy.

    python scripts/qdrant/create_collection.py            # ensure (no-op if present)
    python scripts/qdrant/create_collection.py --recreate # drop + recreate
"""
from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "backend"))

from qdrant_client import QdrantClient  # noqa: E402
from qdrant_client.models import (  # noqa: E402
    Distance, HnswConfigDiff, OptimizersConfigDiff, PayloadSchemaType,
    ScalarQuantization, ScalarQuantizationConfig, ScalarType, VectorParams,
)

from core.config import get_settings  # noqa: E402
from core.qdrant_client import get_qdrant_client  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("create_collection")

PAYLOAD_INDEXES = {
    "modality": PayloadSchemaType.KEYWORD,
    "tag": PayloadSchemaType.KEYWORD,
}


def client_from_settings() -> QdrantClient:
    s = get_settings()
    return get_qdrant_client(s.QDRANT_URL, s.QDRANT_API_KEY)


def _ensure_payload_indexes(client: QdrantClient, name: str) -> None:
    for field, schema in PAYLOAD_INDEXES.items():
        try:
            client.create_payload_index(
                collection_name=name, field_name=field, field_schema=schema
            )
            log.info("payload index ready: %s (%s)", field, schema)
        except Exception as e:  # noqa: BLE001 — already exists / racing is fine
            log.debug("payload index %s skipped: %s", field, e)


def ensure_collection(
    client: QdrantClient,
    name: str,
    dim: int = 1024,
    recreate: bool = False,
    quantize: bool = True,
) -> None:
    existing = {c.name for c in client.get_collections().collections}

    if name in existing and not recreate:
        log.info("collection '%s' already exists — ensuring indexes", name)
        _ensure_payload_indexes(client, name)
        return

    if name in existing and recreate:
        log.warning("dropping existing collection '%s'", name)
        client.delete_collection(name)

    log.info("creating collection '%s' (dim=%d, Cosine, INT8)", name, dim)
    client.create_collection(
        collection_name=name,
        vectors_config=VectorParams(size=dim, distance=Distance.COSINE, on_disk=False),
        hnsw_config=HnswConfigDiff(m=16, ef_construct=200, full_scan_threshold=10000),
        optimizers_config=OptimizersConfigDiff(indexing_threshold=20000),
        quantization_config=(
            ScalarQuantization(
                scalar=ScalarQuantizationConfig(
                    type=ScalarType.INT8, quantile=0.99, always_ram=True
                )
            ) if quantize else None
        ),
    )
    _ensure_payload_indexes(client, name)

    info = client.get_collection(name)
    log.info("collection ready: points=%s vectors=%s",
             info.points_count, info.config.params.vectors.size)


def main() -> int:
    ap = argparse.ArgumentParser(description="Ensure the Synapse Qdrant collection exists.")
    ap.add_argument("--recreate", action="store_true", help="drop + recreate (DESTROYS data)")
    ap.add_argument("--name", default=None, help="override QDRANT_COLLECTION")
    args = ap.parse_args()

    s = get_settings()
    name = args.name or s.QDRANT_COLLECTION
    client = client_from_settings()
    ensure_collection(client, name, dim=s.EMBEDDING_DIM, recreate=args.recreate)
    log.info("✓ done")
    return 0


if __name__ == "__main__":
    sys.exit(main())
