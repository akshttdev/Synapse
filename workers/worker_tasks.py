# backend/workers/worker_tasks.py
from workers.celery_app import app
from workers.tasks.upload_tasks import upload_file_task
from workers.tasks.embedding_tasks import embed_media_task
import logging

logger = logging.getLogger(__name__)

@app.task(name="workers.worker_tasks.process_and_embed")
def process_and_embed(media_id: str, source_url: str, media_type: str, storage_hint: str = "r2"):
    logger.info(f"Orchestrator for {media_id}")
    upload_result = upload_file_task.apply(kwargs={"media_id": media_id, "source_url": source_url, "media_type": media_type, "storage_hint": storage_hint}).get()
    if not upload_result.get("success", False):
        logger.error(f"Upload failed for {media_id}")
        return {"status": "failed", "error": upload_result}
    # schedule embedding task
    job = embed_media_task.delay(media_id, upload_result["local_path"], media_type, upload_result)
    logger.info(f"Scheduled embedding task {job.id}")
    return {"status": "enqueued", "media_id": media_id, "embed_task_id": job.id}
