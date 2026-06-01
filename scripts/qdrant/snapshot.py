#!/usr/bin/env python3
"""
Snapshot a Qdrant collection to S3 — tier-agnostic, survives cluster loss.

We don't rely on Qdrant Cloud's native snapshots (unavailable / wiped when a
free cluster is reclaimed — which is exactly how the previous cluster's vectors
were lost). Instead we scroll every point (vector + payload) and write a gzipped
JSONL to S3. `restore.py` re-creates the collection and re-upserts.

    s3://<bucket>/backups/qdrant/<collection>-<UTC>.jsonl.gz
    s3://<bucket>/backups/qdrant/<collection>-latest.txt   (-> the key above)

Run:
    python scripts/qdrant/snapshot.py
"""
from __future__ import annotations

import gzip
import json
import logging
import sys
import tempfile
import time
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "backend"))

from core.config import get_settings  # noqa: E402
from core.qdrant_client import get_qdrant_client  # noqa: E402
from core import storage  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("snapshot")


def main() -> int:
    settings = get_settings()
    collection = settings.QDRANT_COLLECTION
    client = get_qdrant_client(settings.QDRANT_URL, settings.QDRANT_API_KEY)

    stamp = time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())
    key = f"backups/qdrant/{collection}-{stamp}.jsonl.gz"
    tmp = Path(tempfile.gettempdir()) / f"{collection}-{stamp}.jsonl.gz"

    n = 0
    offset = None
    with gzip.open(tmp, "wt", encoding="utf-8") as gz:
        while True:
            points, offset = client.scroll(
                collection_name=collection,
                limit=256,
                offset=offset,
                with_payload=True,
                with_vectors=True,
            )
            for p in points:
                gz.write(json.dumps({"id": p.id, "vector": p.vector, "payload": p.payload}) + "\n")
                n += 1
            log.info("scrolled %d …", n)
            if offset is None:
                break

    if n == 0:
        log.warning("collection '%s' is empty — nothing to snapshot", collection)

    storage.upload_file_to_s3(tmp, key)
    # write the 'latest' pointer
    ptr = Path(tempfile.gettempdir()) / f"{collection}-latest.txt"
    ptr.write_text(key, encoding="utf-8")
    storage.upload_file_to_s3(ptr, f"backups/qdrant/{collection}-latest.txt")

    size_mb = tmp.stat().st_size / 1e6
    log.info("snapshot OK: %d points -> s3://%s/%s (%.2f MB)",
             n, settings.AWS_S3_BUCKET, key, size_mb)
    tmp.unlink(missing_ok=True)
    ptr.unlink(missing_ok=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
