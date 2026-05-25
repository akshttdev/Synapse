"""
Stats + activity feed for the dashboard overview page.

GET /stats     → indexed_count, p50_ms, p99_ms, queries_24h, storage_gb, uptime
GET /activity  → recent activity events tail
"""
from __future__ import annotations

import logging
import os
import time
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query

from core.config import get_settings
from core.metrics import (
    counter_total,
    latency_percentiles,
    recent_events,
)
from core.qdrant_client import get_qdrant_client

logger = logging.getLogger(__name__)
router = APIRouter()

_BOOT_TS = time.time()


def _human_uptime(seconds: float) -> str:
    s = int(seconds)
    d, s = divmod(s, 86400)
    h, s = divmod(s, 3600)
    m, _ = divmod(s, 60)
    return f"{d}d {h}h {m}m"


def _qdrant_count() -> Optional[int]:
    settings = get_settings()
    try:
        client = get_qdrant_client(settings.QDRANT_URL, settings.QDRANT_API_KEY)
        info = client.count(collection_name=settings.QDRANT_COLLECTION, exact=False)
        return int(info.count)
    except Exception as e:  # noqa: BLE001
        logger.debug("qdrant count unavailable: %s", e)
        return None


def _embeddings_storage_bytes() -> int:
    settings = get_settings()
    root = getattr(settings, "EMBEDDINGS_DIR", None)
    if not root:
        return 0
    try:
        total = 0
        for dirpath, _, files in os.walk(str(root)):
            for f in files:
                fp = os.path.join(dirpath, f)
                try:
                    total += os.path.getsize(fp)
                except OSError:
                    pass
        return total
    except Exception as e:  # noqa: BLE001
        logger.debug("storage walk failed: %s", e)
        return 0


@router.get("")
async def get_stats() -> Dict:
    """Snapshot for the dashboard overview tiles."""
    indexed = _qdrant_count()
    pct = latency_percentiles()
    queries_24h = counter_total("queries", days=1)
    storage_bytes = _embeddings_storage_bytes()

    return {
        "indexed_count": indexed,
        "queries_24h": queries_24h,
        "p50_ms": round(pct["p50"], 2) if pct["p50"] is not None else None,
        "p99_ms": round(pct["p99"], 2) if pct["p99"] is not None else None,
        "sample_size": pct["count"],
        "storage_bytes": storage_bytes,
        "storage_gb": round(storage_bytes / (1024**3), 2) if storage_bytes else 0.0,
        "uptime_seconds": int(time.time() - _BOOT_TS),
        "uptime_human": _human_uptime(time.time() - _BOOT_TS),
    }


@router.get("/activity")
async def get_activity(limit: int = Query(20, ge=1, le=200)) -> Dict:
    """Recent activity events (newest first)."""
    try:
        events: List[Dict] = recent_events(n=limit)
        return {"events": events, "count": len(events)}
    except Exception as e:  # noqa: BLE001
        logger.exception("activity fetch failed")
        raise HTTPException(status_code=500, detail=str(e))
