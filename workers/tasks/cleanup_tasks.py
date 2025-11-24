"""
Cleanup tasks: remove temporary files and stale data
"""

import logging
from pathlib import Path
from celery_app import app
import shutil
import os

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


@app.task(name="workers.tasks.cleanup_tasks.cleanup_file")
def cleanup_file(path: str):
    try:
        p = Path(path)
        if p.exists():
            if p.is_file():
                p.unlink()
            else:
                shutil.rmtree(p)
        logger.info(f"Cleaned up {path}")
        return {"status": "ok", "path": path}
    except Exception as e:
        logger.exception(f"Cleanup failed for {path}: {e}")
        return {"status": "error", "error": str(e)}
