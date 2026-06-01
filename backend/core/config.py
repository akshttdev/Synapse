"""
Centralised settings for backend + workers.

Every env var the codebase reads MUST be declared here. Undeclared vars are
ignored by pydantic-settings, which silently produces AttributeError at
runtime. Add fields before adding os.getenv calls.
"""
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # App
    PROJECT_NAME: str = "Synapse"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"

    # Qdrant (cloud OR local container)
    QDRANT_URL: str = "http://qdrant:6333"
    QDRANT_API_KEY: str = ""
    QDRANT_COLLECTION: str = "synapse"
    QDRANT_HOST: str | None = None
    QDRANT_PORT: int | None = None

    # Redis (broker, cache, REST)
    REDIS_URL: str = "redis://redis:6379/0"
    REDIS_REST_URL: str = ""
    REDIS_REST_TOKEN: str = ""
    CACHE_TTL: int = 3600

    # Celery (defaults to REDIS_URL when unset)
    CELERY_BROKER_URL: str = ""
    CELERY_RESULT_BACKEND: str = ""
    BROKER_URL: str = ""
    RESULT_BACKEND: str = ""

    # Object storage (S3-compatible: AWS S3, Cloudflare R2, Oracle, MinIO, …)
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "auto"
    AWS_S3_BUCKET: str = "synapse-media"
    S3_PRESIGNED_EXPIRATION: int = 3600
    # Set for non-AWS providers, e.g.:
    #   R2:    https://<account>.r2.cloudflarestorage.com
    #   MinIO: http://localhost:9000
    #   Oracle:https://<namespace>.compat.objectstorage.<region>.oraclecloud.com
    S3_ENDPOINT_URL: str = ""
    # Public base for serving objects (CDN/proxy). If empty we presign instead.
    S3_PUBLIC_BASE_URL: str = ""

    # Embedder
    EMBED_BACKEND: Literal["local", "hf", "hybrid"] = "local"
    HF_SPACE_URL: str = ""
    MODEL_DEVICE: str = "cpu"
    BATCH_SIZE: int = 32
    EMBEDDING_DIM: int = 1024
    USE_REAL_MODEL: bool = True
    # fp16 autocast on CUDA — halves activation memory so ImageBind-Huge fits an
    # 8 GB card (RTX 2060). Ignored on CPU. Set MODEL_FP16=false to force fp32.
    MODEL_FP16: bool = True

    # Filesystem
    UPLOAD_DIR: Path = Path("/app/data/uploads")
    EMBEDDINGS_DIR: Path = Path("/app/data/embeddings")

    # Pipeline switches
    UPLOAD_DIRECT_TO_QDRANT: bool = True

    @field_validator("MODEL_DEVICE")
    @classmethod
    def _validate_device(cls, v: str) -> str:
        if v == "cpu" or v.startswith("cuda"):
            return v
        raise ValueError(f"MODEL_DEVICE must be 'cpu' or 'cuda[:N]', got {v!r}")

    @property
    def celery_broker(self) -> str:
        return self.BROKER_URL or self.CELERY_BROKER_URL or self.REDIS_URL

    @property
    def celery_backend(self) -> str:
        return self.RESULT_BACKEND or self.CELERY_RESULT_BACKEND or self.REDIS_URL


@lru_cache
def get_settings() -> Settings:
    return Settings()
