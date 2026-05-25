"""
Ingest endpoints.

POST /api/v1/upload/        multipart — image / audio / video file
POST /api/v1/upload/text    JSON      — text passage
GET  /api/v1/upload/status/{task_id}
"""
# backend/api/routes/upload.py
from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
import logging
from services.upload_service import get_upload_service, UploadService

logger = logging.getLogger(__name__)
router = APIRouter()


class UploadResponse(BaseModel):
    media_id: str
    task_id: str
    status: str
    message: str
    modality: str


class TextIngestRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=100_000)
    metadata: Optional[Dict[str, Any]] = None


@router.post("/", response_model=UploadResponse)
async def upload_media(
    file: UploadFile = File(...),
    media_type: str = Form(...),
    metadata: Optional[str] = Form(None),
    upload_service: UploadService = Depends(get_upload_service)
):
    try:
        if media_type not in ("image", "audio", "video"):
            raise HTTPException(status_code=400, detail="Invalid media_type")

        # Validate MIME type
        ct = file.content_type or ""
        if media_type == "image" and not ct.startswith("image/"):
            raise HTTPException(status_code=400, detail="Invalid image file")
        if media_type == "audio" and not ct.startswith("audio/"):
            raise HTTPException(status_code=400, detail="Invalid audio file")
        if media_type == "video" and not ct.startswith("video/"):
            raise HTTPException(status_code=400, detail="Invalid video file")

        result = await upload_service.upload_and_process(file=file, media_type=media_type, metadata=metadata)
        result["modality"] = media_type
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Upload failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/text", response_model=UploadResponse)
async def upload_text(
    body: TextIngestRequest,
    upload_service: UploadService = Depends(get_upload_service),
):
    """
    Ingest a text passage. The text is saved as a `.txt` blob in the upload
    dir and the worker embeds its content (not the path) before upserting.
    """
    try:
        result = await upload_service.upload_text(
            text=body.text, metadata=body.metadata
        )
        result["modality"] = "text"
        return result
    except Exception as e:
        logger.exception("Text ingest failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{task_id}")
async def status(task_id: str, upload_service: UploadService = Depends(get_upload_service)):
    try:
        status = await upload_service.get_task_status(task_id)
        return status
    except Exception as e:
        logger.exception("Status check failed")
        raise HTTPException(status_code=500, detail=str(e))
