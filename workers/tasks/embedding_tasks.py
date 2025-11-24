"""
Embedding tasks: GPU-only logic marked clearly.
This task supports running in CPU placeholder mode too (random vectors).
When GPU is present, import your ImageBind model and replace the placeholder.
"""

import os
import logging
from pathlib import Path
import numpy as np
from celery_app import app
from typing import Dict
import json
import shutil
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Qdrant client
def qdrant_client():
    host = os.getenv("QDRANT_HOST", "localhost")
    port = int(os.getenv("QDRANT_PORT", "6333"))
    return QdrantClient(host=host, port=port)


# Placeholder embedder (use real ImageBind when GPU available)
class PlaceholderEmbedder:
    def __init__(self, dim: int = 1024, device: str = "cpu"):
        self.dim = dim
        self.device = device
        logger.warning("Using PlaceholderEmbedder. Replace with ImageBind when GPU available.")

    def embed_image(self, path: str):
        vec = np.random.randn(self.dim).astype(np.float32)
        vec /= (np.linalg.norm(vec) + 1e-8)
        return vec

    def embed_audio(self, path: str):
        vec = np.random.randn(self.dim).astype(np.float32)
        vec /= (np.linalg.norm(vec) + 1e-8)
        return vec

    def embed_video(self, path: str):
        # treat frame as image for placeholder
        return self.embed_image(path)


EMBEDDING_DIM = int(os.getenv("EMBEDDING_DIM", "1024"))
USE_REAL_MODEL = os.getenv("USE_REAL_MODEL", "false").lower() in ("1", "true", "yes")


def load_real_imagebind(device="cuda"):
    """
    When GPU is available, implement actual ImageBind import and model loading here.
    Example:
    from imagebind.models import imagebind_huge
    model = imagebind_huge(pretrained=True).to(device).eval()
    return model
    """
    raise NotImplementedError("Implement model loading for ImageBind when GPU is available.")


@app.task(name="workers.tasks.embedding_tasks.embed_media_task", bind=True)
def embed_media_task(self, media_id: str, local_path: str, media_type: str, upload_result: Dict):
    """
    Embeds a single media file and writes a float32 embedding to disk or directly to Qdrant.
    For production, embedder should output float32 vectors that you compress later.
    """
    try:
        local_path = Path(local_path)
        logger.info(f"Embedding {media_id} from {local_path} (type={media_type})")

        # Choose embedder
        if USE_REAL_MODEL:
            model = load_real_imagebind(device="cuda")
            # real model usage TODO
            raise NotImplementedError("GPU embedding not implemented in this placeholder")
        else:
            embedder = PlaceholderEmbedder(dim=EMBEDDING_DIM, device="cpu")

        # Generate embedding
        if media_type == "image":
            vec = embedder.embed_image(str(local_path))
        elif media_type == "audio":
            vec = embedder.embed_audio(str(local_path))
        elif media_type == "video":
            vec = embedder.embed_video(str(local_path))
        else:
            raise ValueError("Unknown media_type")

        # Save the float32 embedding to disk (embeddings directory)
        embeddings_dir = Path(os.getenv("EMBEDDINGS_DIR", "data/embeddings"))
        embeddings_dir.mkdir(parents=True, exist_ok=True)
        out_file = embeddings_dir / f"{media_id}.npy"
        np.save(out_file, vec.astype(np.float32))

        # Optionally push directly to Qdrant (uncompressed) or store for later compression
        if os.getenv("UPLOAD_DIRECT_TO_QDRANT", "false").lower() in ("1", "true", "yes"):
            client = qdrant_client()
            point = PointStruct(id=media_id, vector=vec.tolist(), payload={
                "media_id": media_id,
                "media_type": media_type,
                "thumbnail_url": upload_result.get("thumbnail_url"),
                "preview_url": upload_result.get("preview_url"),
            })
            client.upsert(collection_name=os.getenv("QDRANT_COLLECTION", "media"), points=[point])
            logger.info(f"Pushed raw embedding to Qdrant for {media_id}")

        # Cleanup: delete local original file (Option A)
        try:
            if local_path.exists():
                local_path.unlink()
                # remove temporary folder
                parent = local_path.parent
                if parent.exists():
                    try:
                        parent.rmdir()
                    except Exception:
                        pass
        except Exception as e:
            logger.warning(f"Cleanup of {local_path} failed: {e}")

        return {"status": "ok", "media_id": media_id, "embedding_file": str(out_file)}

    except Exception as exc:
        logger.exception(f"Embedding failed for {media_id}: {exc}")
        raise self.retry(exc=exc, countdown=10)
