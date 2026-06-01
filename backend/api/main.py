# backend/api/main.py
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import time
import logging

from api.routes import search, health, stats, media
from core.config import get_settings
from core.cache import get_cache_manager

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s - %(message)s")
logger = logging.getLogger(__name__)
settings = get_settings()

app_state = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.PROJECT_NAME}...")
    # initialize cache (redis)
    try:
        app_state["cache"] = get_cache_manager()
        logger.info("✓ Redis cache initialized")
    except Exception as e:
        logger.warning(f"Cache init failed: {e}")

    # warm embedder lazily (do not block startup)
    try:
        from core.embeddings import get_embedder
        get_embedder(device=settings.MODEL_DEVICE, batch_size=settings.BATCH_SIZE)
        logger.info("✓ Embedder initialized (singleton)")
    except Exception as e:
        logger.warning(f"Embedder warm-up failed: {e}")

    yield

    logger.info("Shutting down...")
    app_state.clear()


app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION, lifespan=lifespan)

# NOTE: "*" origins are only valid when credentials are disabled. We use bearer-
# free, cookie-free requests from the frontend, so this is the correct combo
# (the previous "*" + allow_credentials=True is rejected by browsers at preflight).
# Override with CORS_ORIGINS=comma,separated,origins to lock down later.
import os as _os

_cors_origins = [o.strip() for o in _os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    response.headers["X-Process-Time"] = f"{time.time() - start_time:.3f}"
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception")
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


app.include_router(search.router, prefix=f"{settings.API_V1_PREFIX}/search", tags=["search"])
app.include_router(stats.router, prefix=f"{settings.API_V1_PREFIX}/stats", tags=["stats"])
app.include_router(media.router, prefix=f"{settings.API_V1_PREFIX}/media", tags=["media"])
app.include_router(health.router, prefix="/health", tags=["health"])


@app.get("/")
async def root():
    return {"message": settings.PROJECT_NAME, "version": settings.VERSION, "docs": "/docs"}
