#!/usr/bin/env python3
"""
Restore a Qdrant collection from an S3 snapshot written by snapshot.py.

    python scripts/qdrant/restore.py                 # restore the latest snapshot
    python scripts/qdrant/restore.py --key backups/qdrant/media-20260601T....jsonl.gz
    python scripts/qdrant/restore.py --recreate      # drop + recreate before loading

Re-creates the collection (correct schema + payload indexes) if it doesn't exist,
then batched-upserts every point. Safe to re-run.
"""
from __future__ import annotations

import argparse
import gzip
import json
import logging
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "backend"))
sys.path.insert(0, str(Path(__file__).resolve().parent))  # sibling create_collection

from qdrant_client.http.models import PointStruct  # noqa: E402

from core.config import get_settings  # noqa: E402
from core.qdrant_client import get_qdrant_client  # noqa: E402
from core import storage  # noqa: E402
from create_collection import ensure_collection  # type: ignore  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("restore")


def s3_download(key: str, dst: Path) -> None:
    storage._s3_client().download_file(get_settings().AWS_S3_BUCKET, key, str(dst))


def s3_read_text(key: str) -> str:
    obj = storage._s3_client().get_object(Bucket=get_settings().AWS_S3_BUCKET, Key=key)
    return obj["Body"].read().decode("utf-8").strip()


def main() -> int:
    ap = argparse.ArgumentParser(description="Restore Qdrant from an S3 snapshot.")
    ap.add_argument("--key", default=None, help="explicit S3 key; default = the latest pointer")
    ap.add_argument("--recreate", action="store_true", help="drop + recreate the collection first")
    ap.add_argument("--batch", type=int, default=256)
    args = ap.parse_args()

    settings = get_settings()
    collection = settings.QDRANT_COLLECTION
    client = get_qdrant_client(settings.QDRANT_URL, settings.QDRANT_API_KEY)

    key = args.key
    if not key:
        key = s3_read_text(f"backups/qdrant/{collection}-latest.txt")
    log.info("restoring from s3://%s/%s", settings.AWS_S3_BUCKET, key)

    tmp = Path(tempfile.gettempdir()) / Path(key).name
    s3_download(key, tmp)

    ensure_collection(client, collection, dim=settings.EMBEDDING_DIM, recreate=args.recreate)

    batch: list = []
    n = 0

    def flush():
        nonlocal batch, n
        if batch:
            client.upsert(collection_name=collection, points=batch)
            n += len(batch)
            log.info("upserted %d …", n)
            batch = []

    with gzip.open(tmp, "rt", encoding="utf-8") as gz:
        for line in gz:
            line = line.strip()
            if not line:
                continue
            rec = json.loads(line)
            batch.append(PointStruct(id=rec["id"], vector=rec["vector"], payload=rec.get("payload")))
            if len(batch) >= args.batch:
                flush()
        flush()

    tmp.unlink(missing_ok=True)
    log.info("restore OK: %d points into '%s'", n, collection)
    return 0


if __name__ == "__main__":
    sys.exit(main())
