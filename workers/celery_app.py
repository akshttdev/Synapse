"""Celery app entrypoint. Broker + result backend resolve from Settings."""
from celery import Celery

from core.config import get_settings

settings = get_settings()

app = Celery(
    "synapse",
    broker=settings.celery_broker,
    backend=settings.celery_backend,
)

app.conf.update(
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_default_queue="default",
    result_expires=3600,
    enable_utc=True,
    timezone="UTC",
    task_routes={
        "workers.tasks.embedding_tasks.*": {"queue": "embeddings"},
        "workers.tasks.upload_tasks.*": {"queue": "uploads"},
        "workers.tasks.cleanup_tasks.*": {"queue": "cleanup"},
    },
)
