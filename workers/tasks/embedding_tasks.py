"""Embedding worker task. Computes ImageBind vector + upserts to Qdrant."""
import json
import logging
import time
from pathlib import Path

import numpy as np
from qdrant_client.http.models import PointStruct

from workers.celery_app import app
from core.config import get_settings
from core.embeddings import get_embedder
from core.metrics import record_event
from core.qdrant_client import get_qdrant_client

logger = logging.getLogger(__name__)


@app.task(
    bind=True,
    name="workers.tasks.embedding_tasks.embed_media_task",
    max_retries=3,
)
def embed_media_task(
    self,
    media_id: str,
    local_path: str,
    media_type: str,
    upload_result: dict,
):
    settings = get_settings()
    start = time.time()
    try:
        embedder = get_embedder(
            device=settings.MODEL_DEVICE,
            batch_size=settings.BATCH_SIZE,
        )

        # Text media is stored as a .txt blob — read its contents and embed
        # the *text*, not the file path. Other modalities embed directly from
        # the file on disk.
        if media_type == "text":
            with open(local_path, "r", encoding="utf-8") as f:
                content = f.read()
            vec = np.asarray(embedder.embed_text([content])[0], dtype=np.float32)
        else:
            vec = np.asarray(
                embedder.embed_single(local_path, media_type), dtype=np.float32
            )

        settings.EMBEDDINGS_DIR.mkdir(parents=True, exist_ok=True)
        out_file = settings.EMBEDDINGS_DIR / f"{media_id}.npy"
        np.save(out_file, vec)
        logger.info("Saved embedding %s", out_file)

        # Pull optional metadata sidecar (only written for text ingest today)
        extra_meta: dict = {}
        meta_sidecar = Path(local_path).with_suffix(".meta.json")
        if meta_sidecar.exists():
            try:
                with open(meta_sidecar, "r", encoding="utf-8") as f:
                    extra_meta = json.load(f) or {}
            except Exception as e:  # noqa: BLE001
                logger.warning("metadata sidecar parse failed: %s", e)

        if settings.UPLOAD_DIRECT_TO_QDRANT:
            client = get_qdrant_client(settings.QDRANT_URL, settings.QDRANT_API_KEY)
            payload = {
                "media_id": media_id,
                "modality": media_type,
                "thumbnail_url": upload_result.get("thumbnail_url"),
                "preview_url": upload_result.get("preview_url"),
                "file_key": upload_result.get("file_key"),
                "indexed_at": int(time.time()),
                **extra_meta,
            }
            # Stash a snippet for text so search results can show a preview
            # without having to re-read the file.
            if media_type == "text":
                try:
                    with open(local_path, "r", encoding="utf-8") as f:
                        snippet = f.read(280)
                    payload["snippet"] = snippet
                except OSError:
                    pass

            point = PointStruct(id=media_id, vector=vec.tolist(), payload=payload)
            client.upsert(collection_name=settings.QDRANT_COLLECTION, points=[point])
            logger.info("Upserted to Qdrant: %s", media_id)

        elapsed_ms = (time.time() - start) * 1000
        record_event(
            "INDEX",
            f"{media_id[:8]} · {media_type} · {elapsed_ms:.0f}ms",
            modality=media_type,
            media_id=media_id,
            latency_ms=f"{elapsed_ms:.2f}",
        )

        return {
            "status": "ok",
            "media_id": media_id,
            "embedding_file": str(out_file),
            "elapsed_ms": round(elapsed_ms, 2),
        }
    except Exception as exc:
        logger.exception("Embedding failed")
        record_event(
            "INDEX",
            f"{media_id[:8]} · {media_type} · failed",
            modality=media_type,
            media_id=media_id,
            error=str(exc)[:200],
        )
        raise self.retry(exc=exc, countdown=10)
