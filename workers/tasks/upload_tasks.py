# backend/workers/tasks/upload_tasks.py
from workers.celery_app import app
import logging
from pathlib import Path
from typing import Dict
from core.config import get_settings
from core.storage import upload_file_to_s3, generate_presigned_url, s3_key_for_media
import os
import ffmpeg
from PIL import Image

logger = logging.getLogger(__name__)
settings = get_settings()


def make_thumbnail(local_path: Path, size=(300, 300)) -> Path:
    out = local_path.with_name(f"{local_path.stem}_thumb.jpg")
    with Image.open(local_path) as img:
        img.thumbnail(size)
        img.save(out, format="JPEG", quality=85)
    return out


def make_video_preview(local_video: Path, seconds: int = 3) -> Path:
    out = local_video.with_suffix(".preview.mp4")
    (
        ffmpeg.input(str(local_video), ss=0)
        .output(str(out), t=seconds, vcodec="libx264", acodec="aac", preset="veryfast")
        .overwrite_output()
        .run(quiet=True)
    )
    return out


@app.task(bind=True, name="workers.tasks.upload_tasks.upload_file_task", max_retries=2)
def upload_file_task(self, media_id: str, source_path: str, media_type: str, storage_hint: str = "s3") -> Dict:
    """
    Upload local file (source_path) or already remote -> upload to S3,
    generate presigned URLs for thumbnail and preview (if any).
    Returns dict with thumbnail_url, preview_url, local_path.
    """
    try:
        local = Path(source_path)
        # If it's a remote URL (not local file), you should download it prior to calling this task.
        if not local.exists():
            raise FileNotFoundError(f"Local path not found: {local}")

        thumbnail_url = None
        preview_url = None
        file_key = None

        if media_type == "image":
            # upload original
            file_key = s3_key_for_media(media_id, "image", local.name)
            upload_file_to_s3(local, file_key)
            # thumbnail
            thumb = make_thumbnail(local)
            thumb_key = s3_key_for_media(media_id, "thumbnail", thumb.name)
            upload_file_to_s3(thumb, thumb_key)
            thumbnail_url = generate_presigned_url(thumb_key)

        elif media_type == "audio":
            file_key = s3_key_for_media(media_id, "audio", local.name)
            upload_file_to_s3(local, file_key)
            thumbnail_url = generate_presigned_url(file_key)

        elif media_type == "video":
            # upload original video
            file_key = s3_key_for_media(media_id, "video", local.name)
            upload_file_to_s3(local, file_key)
            # preview
            preview = make_video_preview(local)
            preview_key = s3_key_for_media(media_id, "preview", preview.name)
            upload_file_to_s3(preview, preview_key)
            preview_url = generate_presigned_url(preview_key)
            # thumbnail
            tmp_frame = local.with_name(f"{local.stem}_frame.jpg")
            (ffmpeg.input(str(local), ss=0).output(str(tmp_frame), vframes=1).overwrite_output().run(quiet=True))
            thumb = make_thumbnail(tmp_frame)
            thumb_key = s3_key_for_media(media_id, "thumbnail", thumb.name)
            upload_file_to_s3(thumb, thumb_key)
            thumbnail_url = generate_presigned_url(thumb_key)

        else:
            # generic file
            file_key = s3_key_for_media(media_id, "media", local.name)
            upload_file_to_s3(local, file_key)
            thumbnail_url = generate_presigned_url(file_key)

        return {"success": True, "thumbnail_url": thumbnail_url, "preview_url": preview_url, "file_key": file_key, "local_path": str(local)}
    except Exception as exc:
        logger.exception("Upload worker failed")
        raise self.retry(exc=exc, countdown=10)
