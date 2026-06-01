"""
Multimodal search endpoint.

POST /api/v1/search    multipart/form-data

Exactly one of these query sources must be present:
  - text:        a string in the `text` form field
  - image_file:  an uploaded image file
  - audio_file:  an uploaded audio file
  - video_file:  an uploaded video file

Optional knobs:
  - top_k:   int (default 50)
  - filters: JSON string applied as a Qdrant payload filter
"""
import json
import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from typing import List

from services.search_service import get_search_service, SearchService

logger = logging.getLogger(__name__)
router = APIRouter()


class SearchResult(BaseModel):
    id: Any
    score: float
    modality: Optional[str] = None
    thumbnail_url: Optional[str] = None
    preview_url: Optional[str] = None
    metadata: Dict = {}


class SearchResponse(BaseModel):
    results: List[SearchResult]
    total: int
    query: str
    query_modality: str
    latency_ms: float
    metrics: Optional[Dict] = None


def _parse_filters(raw: Optional[str]) -> Optional[Dict]:
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"filters is not valid JSON: {e}")


@router.post("", response_model=SearchResponse)
async def search_api(
    text: Optional[str] = Form(default=None),
    image_file: Optional[UploadFile] = File(default=None),
    audio_file: Optional[UploadFile] = File(default=None),
    video_file: Optional[UploadFile] = File(default=None),
    top_k: int = Form(default=50),
    filters: Optional[str] = Form(default=None),
    search_service: SearchService = Depends(get_search_service),
):
    sources = [
        ("text", text),
        ("image", image_file),
        ("audio", audio_file),
        ("video", video_file),
    ]
    provided = [(mod, src) for mod, src in sources if src is not None]

    if len(provided) != 1:
        raise HTTPException(
            status_code=400,
            detail="Provide exactly one query source: text OR image_file OR audio_file OR video_file",
        )

    parsed_filters = _parse_filters(filters)
    modality, source = provided[0]

    try:
        if modality == "text":
            return await search_service.search_text(
                text=str(source), top_k=top_k, filters=parsed_filters
            )

        # File-based search (image / audio / video). We don't hard-assert the
        # type or content-type — browsers send varied/blank content-types and
        # the embedder validates the actual bytes anyway.
        return await search_service.search_file(
            file=source, modality=modality, top_k=top_k, filters=parsed_filters
        )
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        logger.exception("Search failed")
        # Surface the class name when the message is empty, so the client/log
        # never shows a bare {"detail":""} again.
        raise HTTPException(status_code=500, detail=str(e) or e.__class__.__name__)
