# syntax=docker/dockerfile:1.7
# FastAPI backend image (ImageBind embedding + Qdrant + S3-compatible storage).

FROM python:3.10-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# System deps:
#   ffmpeg, libsm6, libxext6 → media decoding
#   libmagic1              → MIME sniffing (python-magic, future task #4)
#   git                    → pip can fetch pytorchvideo by SHA
#   curl                   → healthcheck inside container
RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg \
        libsm6 \
        libxext6 \
        libmagic1 \
        git \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# CPU torch wheels first (largest, slowest) so they cache.
RUN pip install --index-url https://download.pytorch.org/whl/cpu \
        torch==2.1.2 torchvision==0.16.2 torchaudio==2.1.2

# Python deps next.
COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install -r /tmp/requirements.txt

# ImageBind from local checkout. --no-deps: we avoid pytorchvideo (stubbed in
# core/embeddings.py); its other deps (timm/ftfy/regex/einops/iopath) come from
# requirements.txt above.
COPY backend/ImageBind /opt/ImageBind
RUN pip install -e /opt/ImageBind --no-deps

# App code.
COPY backend/ /app/
COPY scripts/ /app/scripts/

# ImageBind's text tokenizer loads "bpe/..." relative to CWD (/app). The vocab
# lives inside the package (imagebind/bpe/); fall back to repo root just in case.
RUN cp -r /opt/ImageBind/imagebind/bpe /app/bpe 2>/dev/null || cp -r /opt/ImageBind/bpe /app/bpe

# Default data dirs (compose mounts ./data over this).
RUN mkdir -p /app/data/uploads /app/data/embeddings /app/data/thumbnails

# PYTHONPATH lets `core.config`, `api.main`, `scripts.*` resolve.
ENV PYTHONPATH=/app

EXPOSE 8000

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
