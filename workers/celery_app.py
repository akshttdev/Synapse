import os
from celery import Celery
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
BROKER_URL = os.getenv("BROKER_URL", REDIS_URL)
BACKEND_URL = os.getenv("RESULT_BACKEND", REDIS_URL)

app = Celery(
    "workers",
    broker=BROKER_URL,
    backend=BACKEND_URL,
)

# Celery configuration
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

# Ensure tasks package is loaded
# tasks are discovered automatically if using app.autodiscover_tasks in Django-like setups
