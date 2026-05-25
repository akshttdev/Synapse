# backend/services/upload_service.py
import json
import uuid
from pathlib import Path
import aiofiles
import logging
from functools import lru_cache
from typing import Any, Dict, Optional

from core.config import get_settings
from core.metrics import incr_counter, record_event

logger = logging.getLogger(__name__)
settings = get_settings()


class UploadService:
    def __init__(self):
        self.upload_dir = Path(settings.UPLOAD_DIR)
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    async def upload_and_process(
        self, file, media_type: str, metadata: Optional[str] = None
    ) -> Dict:
        media_id = str(uuid.uuid4())
        ext = Path(file.filename).suffix or ""
        out_path = self.upload_dir / f"{media_id}{ext}"

        # save file locally
        async with aiofiles.open(out_path, "wb") as f:
            content = await file.read()
            await f.write(content)

        logger.info(f"Saved upload to {out_path}")

        # Import orchestrator
        from workers.worker_tasks import process_and_embed

        # enqueue
        task = process_and_embed.delay(
            media_id=media_id,
            source_url=str(out_path),
            media_type=media_type,
            storage_hint="s3",
        )
        logger.info(f"Enqueued orchestrator task: {task.id}")

        incr_counter("ingest")
        record_event(
            "INGEST",
            f"{file.filename or '(upload)'} · {media_type} · queued",
            modality=media_type,
            media_id=media_id,
        )

        return {
            "media_id": media_id,
            "task_id": task.id,
            "status": "processing",
            "message": "Upload accepted and processing started",
        }

    async def upload_text(self, text: str, metadata: Optional[Dict[str, Any]] = None) -> Dict:
        """
        Ingest a raw text passage. We store it as a .txt file in the upload dir
        so the worker can read it from disk like any other media type, then
        enqueue the same orchestrator with media_type='text'.
        """
        media_id = str(uuid.uuid4())
        out_path = self.upload_dir / f"{media_id}.txt"
        async with aiofiles.open(out_path, "w", encoding="utf-8") as f:
            await f.write(text)

        # Stash optional metadata next to the file so the worker can pick it up
        # without us needing to widen the Celery task signature.
        if metadata:
            meta_path = self.upload_dir / f"{media_id}.meta.json"
            async with aiofiles.open(meta_path, "w", encoding="utf-8") as f:
                await f.write(json.dumps(metadata, ensure_ascii=False))

        logger.info("Saved text upload to %s (%d chars)", out_path, len(text))

        from workers.worker_tasks import process_and_embed

        task = process_and_embed.delay(
            media_id=media_id,
            source_url=str(out_path),
            media_type="text",
            storage_hint="local",
        )

        incr_counter("ingest")
        record_event(
            "INGEST",
            f"text passage · {len(text)} chars · queued",
            modality="text",
            media_id=media_id,
        )

        return {
            "media_id": media_id,
            "task_id": task.id,
            "status": "processing",
            "message": "Text accepted and embedding started",
        }

    async def get_task_status(self, task_id: str) -> Dict:
        from celery.result import AsyncResult
        res = AsyncResult(task_id)
        return {"task_id": task_id, "status": res.state, "result": res.result if res.ready() else None}


@lru_cache()
def get_upload_service():
    return UploadService()
