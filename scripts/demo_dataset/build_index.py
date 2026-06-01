#!/usr/bin/env python3
"""
Bulk-embed a fetched demo dataset and load it into S3 + Qdrant — in ONE process,
on the GPU box. No Celery, no Redis, no running API required.

Per item (from manifest.jsonl):
    media_id = sha256(original bytes)[:16]          (stable, dedup key)
    point_id = uuid5(URL, media_id)                 (valid Qdrant id)
    embed on cuda via ImageBind  →  1024-d L2-normalised vector
    upload original (+ thumb / poster / 3s preview) to S3   (keeps ALL media in S3)
    upsert {vector, payload} to Qdrant              (payload stores S3 *keys*)

Idempotent + resumable: completed media_ids are tracked in <out>/indexed.json and
skipped on re-run. Video is trimmed to <=10 s / 720p mp4 so the S3 free tier holds.

Run (GPU box, after fetch_aligned.py):
    export MODEL_DEVICE=cuda            # or cuda:0
    python scripts/demo_dataset/build_index.py --manifest data/demo/manifest.jsonl

Requires (pip): qdrant-client boto3 pillow  + torch + the local ImageBind install.
ffmpeg must be on PATH for video.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import logging
import shutil
import subprocess
import sys
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Dict, List, Optional

# --- make `core.*` importable from the repo layout (mirrors PYTHONPATH=/app) ---
REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "backend"))

import numpy as np  # noqa: E402
from qdrant_client.http.models import PointStruct  # noqa: E402

from core.config import get_settings  # noqa: E402
from core.embeddings import get_embedder  # noqa: E402
from core.qdrant_client import get_qdrant_client  # noqa: E402
from core import storage  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("build_index")

# Per-modality embed batch sizes. Tuned for an 8 GB card (RTX 2060) with fp16;
# override the whole map via --batch if you have more VRAM.
BATCH = {"image": 16, "text": 64, "audio": 4, "video": 2}
PRESIGN_TTL = 7 * 24 * 3600  # 7 days (SigV4 max) — fallback urls in payload

try:
    from PIL import Image  # noqa: E402
    _PIL = True
except Exception:  # noqa: BLE001
    _PIL = False

_HAS_FFMPEG = shutil.which("ffmpeg") is not None


# ------------------------------------------------------------------ helpers

def sha16(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()[:16]


def point_id(media_id: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, media_id))


def s3_key(media_id: str, kind: str, ext: str) -> str:
    folder = {
        "image": "images", "audio": "audio", "video": "video", "text": "text",
        "thumbnail": "thumbnails", "preview": "previews",
    }[kind]
    return f"{folder}/{media_id}{ext}"


def run_ffmpeg(args: List[str]) -> bool:
    try:
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *args],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        return True
    except Exception as e:  # noqa: BLE001
        log.warning("ffmpeg failed: %s", e)
        return False


def transcode_video(src: Path, dst: Path, seconds: int = 10) -> bool:
    return run_ffmpeg([
        "-ss", "0", "-t", str(seconds), "-i", str(src),
        "-vf", "scale=-2:720", "-c:v", "libx264", "-preset", "veryfast",
        "-pix_fmt", "yuv420p", "-c:a", "aac", "-movflags", "+faststart", str(dst),
    ])


def video_poster(src: Path, dst: Path) -> bool:
    return run_ffmpeg(["-ss", "1", "-i", str(src), "-vframes", "1",
                       "-vf", "scale=300:-2", str(dst)])


def make_thumb(src: Path, dst: Path, size=(400, 400)) -> bool:
    if not _PIL:
        return False
    try:
        with Image.open(src) as im:
            im = im.convert("RGB")
            im.thumbnail(size)
            im.save(dst, format="JPEG", quality=82)
        return True
    except Exception as e:  # noqa: BLE001
        log.warning("thumb failed for %s: %s", src, e)
        return False


def upload(local: Path, key: str) -> Optional[str]:
    """Upload to S3 and return a long-lived presigned GET url (or None on failure)."""
    try:
        storage.upload_file_to_s3(local, key)
        return storage.generate_presigned_url(key, expires_in=PRESIGN_TTL)
    except Exception as e:  # noqa: BLE001
        log.error("S3 upload failed for %s: %s", key, e)
        return None


# ------------------------------------------------------------------ per-item S3 work

def stage_and_upload(item: Dict, media_id: str, work: Path) -> Dict:
    """
    Place the right objects in S3 for this item and return the payload fragment
    with keys + presigned urls. `work` is a scratch dir for derived files.
    """
    modality = item["modality"]
    src = Path(item["path"])
    frag: Dict = {}

    if modality == "image":
        ext = src.suffix or ".jpg"
        frag["file_key"] = s3_key(media_id, "image", ext)
        frag["file_url"] = upload(src, frag["file_key"])
        thumb = work / f"{media_id}_thumb.jpg"
        if make_thumb(src, thumb):
            frag["thumbnail_key"] = s3_key(media_id, "thumbnail", ".jpg")
            frag["thumbnail_url"] = upload(thumb, frag["thumbnail_key"])
        else:
            frag["thumbnail_key"] = frag["file_key"]
            frag["thumbnail_url"] = frag["file_url"]

    elif modality == "audio":
        ext = src.suffix or ".wav"
        frag["file_key"] = s3_key(media_id, "audio", ext)
        frag["file_url"] = upload(src, frag["file_key"])

    elif modality == "video":
        # store the trimmed mp4 as the canonical object (small + browser-friendly)
        trimmed = item.get("_embed_path")
        trimmed = Path(trimmed) if trimmed else src
        frag["file_key"] = s3_key(media_id, "video", ".mp4")
        frag["file_url"] = upload(trimmed, frag["file_key"])
        frag["preview_key"] = frag["file_key"]
        frag["preview_url"] = frag["file_url"]
        poster = work / f"{media_id}_poster.jpg"
        if video_poster(trimmed, poster):
            frag["thumbnail_key"] = s3_key(media_id, "thumbnail", ".jpg")
            frag["thumbnail_url"] = upload(poster, frag["thumbnail_key"])

    elif modality == "text":
        frag["file_key"] = s3_key(media_id, "text", ".txt")
        frag["file_url"] = upload(src, frag["file_key"])
        try:
            frag["snippet"] = src.read_text(encoding="utf-8", errors="replace")[:400]
        except OSError:
            pass

    return frag


# ------------------------------------------------------------------ embedding

def embed_batch(embedder, modality: str, paths: List[str], texts: List[str]) -> np.ndarray:
    if modality == "image":
        return embedder.embed_images(paths)
    if modality == "audio":
        return embedder.embed_audio(paths)
    if modality == "video":
        return embedder.embed_videos(paths)
    if modality == "text":
        return embedder.embed_text(texts)
    raise ValueError(modality)


# ------------------------------------------------------------------ driver

def load_manifest(path: Path) -> List[Dict]:
    rows = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def main() -> int:
    ap = argparse.ArgumentParser(description="Embed a demo dataset into S3 + Qdrant.")
    ap.add_argument("--manifest", type=Path, default=Path("data/demo/manifest.jsonl"))
    ap.add_argument("--device", default=None, help="override MODEL_DEVICE (e.g. cuda:0)")
    ap.add_argument("--limit", type=int, default=0, help="cap items (0 = all), for smoke tests")
    ap.add_argument("--keep-local", action="store_true", help="don't delete originals after upload")
    ap.add_argument("--upload-workers", type=int, default=8)
    args = ap.parse_args()

    settings = get_settings()
    device = args.device or settings.MODEL_DEVICE
    collection = settings.QDRANT_COLLECTION
    out_dir = args.manifest.parent
    work = out_dir / "_work"
    work.mkdir(parents=True, exist_ok=True)
    progress_path = out_dir / "indexed.json"
    done = set(json.loads(progress_path.read_text())) if progress_path.exists() else set()

    rows = load_manifest(args.manifest)
    if args.limit:
        rows = rows[: args.limit]

    storage.ensure_bucket()  # no-op if it exists; creates it on MinIO
    qdrant = get_qdrant_client(settings.QDRANT_URL, settings.QDRANT_API_KEY)
    log.info("device=%s collection=%s items=%d (already done=%d)",
             device, collection, len(rows), len(done))
    log.info("loading ImageBind … (first run downloads ~4.5 GB weights)")
    embedder = get_embedder(device=device, batch_size=max(BATCH.values()))

    # group by modality, then chunk
    by_mod: Dict[str, List[Dict]] = {}
    for r in rows:
        if not Path(r["path"]).exists():
            continue
        by_mod.setdefault(r["modality"], []).append(r)

    total_ok = total_skip = total_fail = 0

    for modality, items in by_mod.items():
        if modality == "video" and not _HAS_FFMPEG:
            log.warning("ffmpeg missing — skipping %d video items", len(items))
            continue
        bsz = BATCH.get(modality, 16)
        for i in range(0, len(items), bsz):
            batch = items[i: i + bsz]

            # compute ids, skip done; prep embed inputs (transcode video)
            prepared = []
            for it in batch:
                src = Path(it["path"])
                mid = sha16(src)
                if mid in done:
                    total_skip += 1
                    continue
                if modality == "video":
                    trimmed = work / f"{mid}.mp4"
                    if not transcode_video(src, trimmed):
                        total_fail += 1
                        continue
                    it["_embed_path"] = str(trimmed)
                    embed_path = str(trimmed)
                elif modality == "text":
                    embed_path = None
                else:
                    embed_path = str(src)
                prepared.append((it, mid, embed_path))

            if not prepared:
                continue

            try:
                if modality == "text":
                    texts = [Path(it["path"]).read_text(encoding="utf-8", errors="replace")
                             for it, _, _ in prepared]
                    vecs = embed_batch(embedder, modality, [], texts)
                else:
                    paths = [p for _, _, p in prepared]
                    vecs = embed_batch(embedder, modality, paths, [])
            except Exception as e:  # noqa: BLE001
                log.error("embed batch failed (%s): %s", modality, e)
                total_fail += len(prepared)
                continue

            # upload to S3 (threaded) + build points
            def _do_upload(triple):
                it, mid, _ = triple
                return mid, stage_and_upload(it, mid, work)

            with ThreadPoolExecutor(max_workers=args.upload_workers) as ex:
                upload_results = dict(ex.map(_do_upload, prepared))

            points = []
            now = int(time.time())
            for (it, mid, _), vec in zip(prepared, vecs):
                frag = upload_results.get(mid, {})
                payload = {
                    "media_id": mid,
                    "modality": modality,
                    "tag": it.get("tag"),
                    "title": it.get("title"),
                    "source": it.get("source"),
                    "license": it.get("license"),
                    "ref_url": it.get("url"),
                    "indexed_at": now,
                    **frag,
                }
                payload = {k: v for k, v in payload.items() if v is not None}
                points.append(PointStruct(
                    id=point_id(mid),
                    vector=np.asarray(vec, dtype=np.float32).tolist(),
                    payload=payload,
                ))

            try:
                qdrant.upsert(collection_name=collection, points=points)
            except Exception as e:  # noqa: BLE001
                log.error("qdrant upsert failed: %s", e)
                total_fail += len(points)
                continue

            for (it, mid, _) in prepared:
                done.add(mid)
                if not args.keep_local:
                    try:
                        Path(it["path"]).unlink(missing_ok=True)
                        ep = it.get("_embed_path")
                        if ep:
                            Path(ep).unlink(missing_ok=True)
                    except OSError:
                        pass
            total_ok += len(points)
            progress_path.write_text(json.dumps(sorted(done)))
            log.info("%s %d/%d  (ok=%d skip=%d fail=%d)",
                     modality, min(i + bsz, len(items)), len(items),
                     total_ok, total_skip, total_fail)

    # tidy scratch
    try:
        shutil.rmtree(work, ignore_errors=True)
    except OSError:
        pass

    log.info("DONE  ok=%d skipped=%d failed=%d  collection=%s",
             total_ok, total_skip, total_fail, collection)
    try:
        cnt = qdrant.count(collection_name=collection, exact=True).count
        log.info("qdrant now holds %d points", cnt)
    except Exception:  # noqa: BLE001
        pass
    return 0


if __name__ == "__main__":
    sys.exit(main())
