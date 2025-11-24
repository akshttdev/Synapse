"""
High-level orchestration tasks (exposed to backend)
These tasks enqueue lower-level tasks implemented in tasks/*.py
"""

from celery_app import app
from workers.tasks.embedding_tasks import embed_media_task
from workers.tasks.upload_tasks import upload_file_task
from workers.tasks.cleanup_tasks import cleanup_file_task
import logging

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


@app.task(name="workers.worker_tasks.process_and_embed")
def process_and_embed(media_id: str, source_url: str, media_type: str, storage_hint: str = "r2"):
    """
    Orchestrator task called by FastAPI / upload endpoint.
    - Downloads the file
    - Generates thumbnail/preview (upload to R2/S3)
    - Schedules embedding task
    """
    logger.info(f"Orchestrator started for {media_id} ({media_type}) from {source_url}")

    # Step 1: download + generate thumbnail/preview & upload
    res = upload_file_task.s(media_id, source_url, media_type, storage_hint).apply()
    upload_result = res.get()

    if not upload_result.get("success", False):
        logger.error(f"Upload/processing failed for {media_id}: {upload_result.get('error')}")
        return upload_result

    # Step 2: call embedding task (GPU-enabled code will run here when device available)
    embed_job = embed_media_task.delay(media_id, upload_result["local_path"], media_type, upload_result)
    logger.info(f"Scheduled embedding task {embed_job.id} for {media_id}")

    return {"status": "enqueued", "media_id": media_id, "embed_task_id": embed_job.id}
