"""
Lightweight metrics + activity tracking, backed by Redis.

- Query latencies → sorted set keyed by epoch ms (auto-trimmed to 24h).
- Counters     → INCR with daily key for queries_24h-style counts.
- Activity log → Redis stream so we can tail recent events for the dashboard.

Everything is fire-and-forget: failures are swallowed and logged. We never
want a metrics blip to break a user-facing request.
"""
from __future__ import annotations

import logging
import time
from typing import Dict, List, Optional

import redis

from .cache import get_cache_manager

logger = logging.getLogger(__name__)

# Keys
_LAT_KEY = "synapse:metrics:latency_ms"      # ZSET — score = epoch ms, member = "<epoch>:<ms>"
_EVENTS_KEY = "synapse:activity"             # Redis stream
_COUNTER_PREFIX = "synapse:counter"          # f"{prefix}:{name}:{yyyy-mm-dd}"

# Retention
LATENCY_WINDOW_MS = 24 * 60 * 60 * 1000      # 24h
MAX_EVENTS = 500


def _client() -> Optional[redis.Redis]:
    try:
        return get_cache_manager().client
    except Exception as e:  # noqa: BLE001
        logger.debug("Redis unavailable for metrics: %s", e)
        return None


# --- Latency --------------------------------------------------------------

def record_query_latency(ms: float) -> None:
    """Record a single query latency (milliseconds)."""
    c = _client()
    if not c:
        return
    try:
        now_ms = int(time.time() * 1000)
        c.zadd(_LAT_KEY, {f"{now_ms}:{ms:.3f}": now_ms})
        # Trim entries older than the window
        c.zremrangebyscore(_LAT_KEY, 0, now_ms - LATENCY_WINDOW_MS)
    except Exception as e:  # noqa: BLE001
        logger.debug("record_query_latency failed: %s", e)


def latency_percentiles(window_ms: int = LATENCY_WINDOW_MS) -> Dict[str, Optional[float]]:
    """Return {p50, p99, count} over the trailing window. Values are ms or None."""
    c = _client()
    if not c:
        return {"p50": None, "p99": None, "count": 0}
    try:
        now_ms = int(time.time() * 1000)
        members = c.zrangebyscore(_LAT_KEY, now_ms - window_ms, now_ms)
        if not members:
            return {"p50": None, "p99": None, "count": 0}
        latencies = sorted(float(m.split(":", 1)[1]) for m in members)
        n = len(latencies)
        p50 = latencies[int(n * 0.50)] if n else None
        p99 = latencies[max(int(n * 0.99) - 1, 0)] if n else None
        return {"p50": p50, "p99": p99, "count": n}
    except Exception as e:  # noqa: BLE001
        logger.debug("latency_percentiles failed: %s", e)
        return {"p50": None, "p99": None, "count": 0}


# --- Counters -------------------------------------------------------------

def incr_counter(name: str) -> None:
    """Bump a daily counter. Bucketed by UTC date for cheap rolling-24h reads."""
    c = _client()
    if not c:
        return
    try:
        day = time.strftime("%Y-%m-%d", time.gmtime())
        key = f"{_COUNTER_PREFIX}:{name}:{day}"
        c.incr(key)
        c.expire(key, 72 * 60 * 60)  # keep 3 days for safety
    except Exception as e:  # noqa: BLE001
        logger.debug("incr_counter failed: %s", e)


def counter_total(name: str, days: int = 1) -> int:
    """Sum counter over the last `days` UTC days."""
    c = _client()
    if not c:
        return 0
    try:
        total = 0
        now = time.gmtime()
        for d in range(days):
            t = time.gmtime(time.mktime(now) - d * 86400)
            day = time.strftime("%Y-%m-%d", t)
            val = c.get(f"{_COUNTER_PREFIX}:{name}:{day}")
            if val is not None:
                total += int(val)
        return total
    except Exception as e:  # noqa: BLE001
        logger.debug("counter_total failed: %s", e)
        return 0


# --- Activity / events ----------------------------------------------------

def record_event(kind: str, detail: str, **extra: str) -> None:
    """
    Push an activity event to the Redis stream.
    kind: short uppercase tag (e.g. 'SEARCH', 'INGEST', 'INDEX').
    detail: human-readable one-liner.
    """
    c = _client()
    if not c:
        return
    try:
        fields = {"kind": kind, "detail": detail, "ts_ms": str(int(time.time() * 1000))}
        for k, v in extra.items():
            fields[k] = str(v)
        c.xadd(_EVENTS_KEY, fields, maxlen=MAX_EVENTS, approximate=True)
    except Exception as e:  # noqa: BLE001
        logger.debug("record_event failed: %s", e)


def recent_events(n: int = 20) -> List[Dict[str, str]]:
    """Return the latest `n` events, newest first."""
    c = _client()
    if not c:
        return []
    try:
        # XREVRANGE returns newest → oldest
        raw = c.xrevrange(_EVENTS_KEY, count=n)
        out: List[Dict[str, str]] = []
        for entry_id, fields in raw:
            row = dict(fields)
            row["id"] = entry_id
            out.append(row)
        return out
    except Exception as e:  # noqa: BLE001
        logger.debug("recent_events failed: %s", e)
        return []
