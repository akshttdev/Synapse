"""
Media proxy — streams objects from the (possibly private / box-local) object
store through the public API.

Used when the object store isn't directly reachable by the browser — e.g.
self-hosted MinIO on the GPU box, exposed only via the API's public port. The
frontend gets URLs like  <public-api>/api/v1/media/images/<id>.jpg  which this
route resolves to a streamed object.

When the store IS publicly reachable (R2/Oracle/S3 with presigned GETs), set
S3_PUBLIC_BASE_URL to the presign base instead and this route is unused.
"""
import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from core import storage

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/{key:path}")
def get_media(key: str):
    try:
        body, content_type, content_length = storage.open_object(key)
    except Exception as e:  # noqa: BLE001
        logger.debug("media miss for %s: %s", key, e)
        raise HTTPException(status_code=404, detail="object not found")

    headers = {"Cache-Control": "public, max-age=86400"}
    if content_length is not None:
        headers["Content-Length"] = str(content_length)
    return StreamingResponse(body, media_type=content_type, headers=headers)
