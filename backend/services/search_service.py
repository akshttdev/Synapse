"""
SearchService — accepts a text query or an uploaded file (image/audio/video),
embeds it in the right modality, queries Qdrant, records metrics, and shapes
the response.
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import tempfile
import time
import uuid
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional

import aiofiles
from fastapi import UploadFile

from core.config import get_settings
from core.embeddings import get_embedder
from core.metrics import incr_counter, record_event, record_query_latency
from core.qdrant_client import get_qdrant_client
from core.cache import get_cache_manager
from core import storage

logger = logging.getLogger(__name__)


class SearchService:
    def __init__(self):
        self.settings = get_settings()

        self.embedder = get_embedder(
            device=self.settings.MODEL_DEVICE,
            batch_size=self.settings.BATCH_SIZE,
        )

        self.qdrant = get_qdrant_client(
            url=self.settings.QDRANT_URL,
            api_key=self.settings.QDRANT_API_KEY,
        )

        self.collection = self.settings.QDRANT_COLLECTION

    # --- public ----------------------------------------------------------

    async def search_text(
        self,
        text: str,
        top_k: int = 50,
        filters: Optional[Dict] = None,
    ) -> Dict:
        # Cache text-query responses — embedding on CPU is the slow part, so a
        # repeat query becomes instant. Cached presigned urls stay valid as long
        # as S3_PRESIGNED_EXPIRATION > CACHE_TTL (default 86400 > 3600).
        cache = self._cache()
        ckey = None
        if cache is not None:
            raw = json.dumps({"q": text, "k": top_k, "f": filters}, sort_keys=True, default=str)
            ckey = "search:text:" + hashlib.sha1(raw.encode()).hexdigest()
            try:
                hit = cache.get(ckey)
                if hit:
                    hit["cached"] = True
                    return hit
            except Exception:  # noqa: BLE001
                pass

        t0 = time.time()
        vec = self.embedder.embed_text([text])[0]
        embed_ms = (time.time() - t0) * 1000
        result = self._do_search(
            vec=vec.tolist(),
            query_label=text,
            query_modality="text",
            top_k=top_k,
            filters=filters,
            embed_ms=embed_ms,
        )
        if cache is not None and ckey:
            try:
                cache.set(ckey, result, ex=self.settings.CACHE_TTL)
            except Exception:  # noqa: BLE001
                pass
        return result

    async def search_file(
        self,
        file: UploadFile,
        modality: str,
        top_k: int = 50,
        filters: Optional[Dict] = None,
    ) -> Dict:
        # Persist to a temp file so the embedder can read it from disk
        suffix = Path(file.filename or "upload").suffix or _default_suffix(modality)
        tmp_path = Path(tempfile.gettempdir()) / f"synapse-q-{uuid.uuid4().hex}{suffix}"
        try:
            async with aiofiles.open(tmp_path, "wb") as f:
                while True:
                    chunk = await file.read(1024 * 1024)
                    if not chunk:
                        break
                    await f.write(chunk)

            t0 = time.time()
            vec = self.embedder.embed_single(str(tmp_path), modality)
            embed_ms = (time.time() - t0) * 1000
        finally:
            try:
                os.remove(tmp_path)
            except OSError:
                pass

        label = file.filename or f"({modality} upload)"
        return self._do_search(
            vec=list(map(float, vec.tolist())),
            query_label=label,
            query_modality=modality,
            top_k=top_k,
            filters=filters,
            embed_ms=embed_ms,
        )

    # --- internal --------------------------------------------------------

    @staticmethod
    def _cache():
        """Redis cache manager, or None if Redis is unavailable (never raises)."""
        try:
            return get_cache_manager()
        except Exception:  # noqa: BLE001
            return None

    @staticmethod
    def _presign(key: Optional[str]) -> Optional[str]:
        """Best-effort presigned GET url for an S3 key; never raises."""
        if not key:
            return None
        try:
            return storage.generate_presigned_url(key)
        except Exception:  # noqa: BLE001
            return None

    def _media_url(self, key: Optional[str]) -> Optional[str]:
        """
        Browser-reachable URL for an object key. If S3_PUBLIC_BASE_URL is set
        (e.g. the /api/v1/media proxy in front of box-local MinIO), build a
        direct URL; otherwise fall back to a presigned GET (R2/Oracle/S3).
        """
        if not key:
            return None
        base = self.settings.S3_PUBLIC_BASE_URL
        if base:
            return f"{base.rstrip('/')}/{key.lstrip('/')}"
        return self._presign(key)

    def _do_search(
        self,
        vec: List[float],
        query_label: str,
        query_modality: str,
        top_k: int,
        filters: Optional[Dict],
        embed_ms: float,
    ) -> Dict:
        t0 = time.time()
        results = self.qdrant.search(
            collection_name=self.collection,
            query_vector=vec,
            limit=top_k,
            with_payload=True,
            query_filter=filters,  # qdrant-client tolerates a plain dict here
        )
        search_ms = (time.time() - t0) * 1000

        out: List[Dict[str, Any]] = []
        for r in results:
            payload = r.payload or {}
            # Re-presign from stored S3 keys so URLs never go stale (the stored
            # *_url fields are only a fallback for older points without keys).
            thumb = (
                self._media_url(payload.get("thumbnail_key") or payload.get("file_key"))
                or payload.get("thumbnail_url")
            )
            preview = (
                self._media_url(payload.get("preview_key") or payload.get("file_key"))
                or payload.get("preview_url")
            )
            out.append(
                {
                    "id": r.id,
                    "score": r.score,
                    "modality": payload.get("modality"),
                    "thumbnail_url": thumb,
                    "preview_url": preview,
                    "metadata": payload,
                }
            )

        total_ms = embed_ms + search_ms
        # Fire-and-forget metrics
        record_query_latency(total_ms)
        incr_counter("queries")
        record_event(
            "SEARCH",
            f'"{query_label}" · {query_modality} · k={top_k} · {total_ms:.0f}ms',
            modality=query_modality,
            top_k=str(top_k),
            latency_ms=f"{total_ms:.2f}",
        )

        return {
            "results": out,
            "total": len(out),
            "query": query_label,
            "query_modality": query_modality,
            "latency_ms": round(total_ms, 2),
            "metrics": {
                "embedding_ms": round(embed_ms, 2),
                "search_ms": round(search_ms, 2),
            },
        }


def _default_suffix(modality: str) -> str:
    return {"image": ".jpg", "audio": ".wav", "video": ".mp4"}.get(modality, "")


@lru_cache()
def get_search_service() -> SearchService:
    return SearchService()
