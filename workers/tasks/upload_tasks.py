"""
Download media, generate thumbnail/preview, upload small assets to R2/S3.
This file is CPU-only and safe to run without GPU.
"""

import os
import tempfile
import logging
from pathlib import Path
from urllib.parse import urlparse
import requests
from PIL import Image
import ffmpeg
from celery_app import app
from typing import Dict
from minio import Minio
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


# ------------------------------
# Storage clients (R2 + S3)
# ------------------------------
def create_r2_client():
    # R2-compatible MinIO client (set env vars accordingly)
    endpoint = os.getenv("R2_ENDPOINT", "https://<account>.r2.cloudflarestorage.com")
    access_key = os.getenv("R2_ACCESS_KEY", "")
    secret_key = os.getenv("R2_SECRET_KEY", "")
    # If using Cloudflare R2, endpoint must be passed without schema to Minio automatically;
    # Here we create a Minio client for general use. Users must set env vars.
    if not access_key or not secret_key:
        logger.warning("R2 credentials not set; R2 uploads will fail until configured.")
    # Minio expects endpoint without https://
    parsed = urlparse(endpoint)
    netloc = parsed.netloc or parsed.path
    return Minio(endpoint=netloc, access_key=access_key, secret_key=secret_key, secure=True)


def create_s3_client():
    session = boto3.session.Session()
    s3 = session.client(
        "s3",
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        region_name=os.getenv("AWS_REGION", "us-east-1"),
    )
    return s3


# ------------------------------
# Helpers
# ------------------------------
def download_file_to_temp(url: str, timeout: int = 30) -> Path:
    """Download a remote file and return local path"""
    tmp = Path(tempfile.mkdtemp())
    filename = os.path.basename(urlparse(url).path) or "file"
    local_path = tmp / filename
    logger.info(f"Downloading {url} to {local_path}")
    try:
        with requests.get(url, stream=True, timeout=timeout) as resp:
            resp.raise_for_status()
            with open(local_path, "wb") as f:
                for chunk in resp.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
        return local_path
    except Exception as e:
        logger.error(f"Download failed for {url}: {e}")
        raise


def make_image_thumbnail(local_image_path: Path, size=(300, 300)) -> Path:
    out = local_image_path.with_name(f"{local_image_path.stem}_thumb_{size[0]}x{size[1]}{local_image_path.suffix}")
    try:
        with Image.open(local_image_path) as img:
            img.thumbnail(size)
            img.save(out, format="JPEG", quality=82)
        return out
    except Exception as e:
        logger.error(f"Thumbnail failed for {local_image_path}: {e}")
        raise


def extract_video_preview(local_video_path: Path, seconds: float = 3.0, out_name: str = None) -> Path:
    out_name = out_name or local_video_path.with_suffix(".preview.mp4")
    try:
        (
            ffmpeg
            .input(str(local_video_path), ss=0)
            .filter('scale', 'iw*min(1,640/iw)', '-2')
            .output(str(out_name), t=seconds, vcodec='libx264', acodec='aac', strict='experimental', preset='veryfast')
            .overwrite_output()
            .run(quiet=True)
        )
        return Path(out_name)
    except Exception as e:
        logger.error(f"Video preview extraction failed: {e}")
        raise


def upload_to_r2(local_path: Path, bucket: str, object_name: str) -> str:
    client = create_r2_client()
    try:
        if not client.bucket_exists(bucket):
            client.make_bucket(bucket)
        client.fput_object(bucket, object_name, str(local_path))
        # Construct public URL (user should configure proper domain)
        endpoint = os.getenv("R2_PUBLIC_URL", "").rstrip("/")
        if endpoint:
            return f"{endpoint}/{bucket}/{object_name}"
        # Fallback: minio URL format
        return f"{client._endpoint_url}/{bucket}/{object_name}"
    except Exception as e:
        logger.error(f"R2 upload failed: {e}")
        raise


def upload_to_s3(local_path: Path, bucket: str, object_name: str) -> str:
    s3 = create_s3_client()
    try:
        region = os.getenv("AWS_REGION", "us-east-1")
        s3.upload_file(str(local_path), bucket, object_name)
        endpoint = f"https://{bucket}.s3.{region}.amazonaws.com"
        return f"{endpoint}/{object_name}"
    except ClientError as e:
        logger.error(f"S3 upload failed: {e}")
        raise


# ------------------------------
# Celery task
# ------------------------------
@app.task(name="workers.tasks.upload_tasks.upload_file_task", bind=True, max_retries=2)
def upload_file_task(self, media_id: str, source_url: str, media_type: str, storage_hint: str = "r2") -> Dict:
    """
    Download file, create small assets, upload them to R2/S3.
    Returns dict with keys: success, local_path, thumbnail_url, preview_url
    """
    try:
        local_path = download_file_to_temp(source_url)

        thumbnail_url = None
        preview_url = None

        # image
        if media_type == "image":
            try:
                thumb = make_image_thumbnail(local_path, size=(300, 300))
                thumbnail_object = f"thumbnails/300x300/{media_id}.jpg"
                thumbnail_url = upload_to_r2(thumb, bucket=os.getenv("R2_BUCKET", "thumbnails"), object_name=thumbnail_object)
                # cleanup local thumb
                try:
                    thumb.unlink()
                except Exception:
                    pass
            except Exception as e:
                logger.warning(f"Thumbnail generation/upload failed: {e}")

        # audio
        elif media_type == "audio":
            # upload short snippet or the original small audio to R2
            object_name = f"audio/{media_id}{local_path.suffix}"
            thumbnail_url = None
            thumbnail_url = upload_to_r2(local_path, bucket=os.getenv("R2_BUCKET", "audio"), object_name=object_name)

        # video
        elif media_type == "video":
            try:
                preview = extract_video_preview(local_path, seconds=3.0)
                preview_object = f"previews/{media_id}_preview.mp4"
                # Upload preview to S3 (you said S3 for videos)
                preview_url = upload_to_s3(preview, bucket=os.getenv("S3_BUCKET", "videos"), object_name=preview_object)
                # Also create a thumbnail from first frame
                thumb = make_image_thumbnail(preview.with_suffix(".jpg") if preview.with_suffix(".jpg").exists() else preview, size=(300,300))
                # If ffmpeg didn't create jpg, extract frame separately
                if not thumb.exists():
                    # Extract 1st frame using ffmpeg
                    frame_out = local_path.with_name(f"{local_path.stem}_frame.jpg")
                    (
                        ffmpeg.input(str(local_path), ss=0)
                        .output(str(frame_out), vframes=1)
                        .overwrite_output()
                        .run(quiet=True)
                    )
                    thumb = make_image_thumbnail(frame_out, size=(300, 300))
                thumb_object = f"thumbnails/300x300/{media_id}.jpg"
                thumbnail_url = upload_to_r2(thumb, bucket=os.getenv("R2_BUCKET", "thumbnails"), object_name=thumb_object)
                # cleanup
                try:
                    preview.unlink()
                    thumb.unlink()
                except Exception:
                    pass
            except Exception as e:
                logger.warning(f"Video preview generation failed: {e}")

        # Upload local original for temporary access if needed (Option A: do NOT store original permanently)
        # For Option A we do NOT persist original; we return local_path so embedder can use it and then cleanup runs.
        result = {
            "success": True,
            "local_path": str(local_path),
            "thumbnail_url": thumbnail_url,
            "preview_url": preview_url
        }
        logger.info(f"Upload task finished for {media_id}")
        return result

    except Exception as exc:
        logger.exception(f"upload_file_task failed for {media_id}: {exc}")
        raise self.retry(exc=exc, countdown=10)
