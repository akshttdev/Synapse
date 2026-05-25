#!/usr/bin/env python3
"""
synapse-ingest — feed a file or folder to a running Synapse backend.

What it does for you, per file:
    detect modality (image | audio | video | text)  →
    POST to /api/v1/upload/    (multipart for media files)
              /api/v1/upload/text (JSON for .txt / .md)
    backend pipeline takes over: stores in S3, makes thumbnail/preview,
    embeds via ImageBind, upserts to Qdrant.

Examples
    python scripts/ingest.py /path/to/photos
    python scripts/ingest.py ./single-file.jpg
    python scripts/ingest.py /data --concurrency 6 --tag "research-2026"
    python scripts/ingest.py /data --dry-run            # list, don't upload
    python scripts/ingest.py /data --skip-existing      # use local manifest

The backend stack must be running (`make up`). The CLI just orchestrates
HTTP calls — all heavy lifting (S3 upload, thumbnail, embedding) happens
asynchronously on the worker.
"""
from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import mimetypes
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional

try:
    import httpx
except ImportError:
    sys.stderr.write(
        "missing dependency: httpx\n"
        "  pip install httpx\n"
    )
    sys.exit(2)


IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tiff"}
AUDIO_EXTS = {".wav", ".mp3", ".m4a", ".flac", ".ogg", ".aac"}
VIDEO_EXTS = {".mp4", ".mov", ".mkv", ".webm", ".avi", ".m4v"}
TEXT_EXTS = {".txt", ".md", ".markdown"}


def detect_modality(path: Path) -> Optional[str]:
    ext = path.suffix.lower()
    if ext in IMAGE_EXTS: return "image"
    if ext in AUDIO_EXTS: return "audio"
    if ext in VIDEO_EXTS: return "video"
    if ext in TEXT_EXTS:  return "text"
    return None


def file_signature(path: Path) -> str:
    """Cheap stable id for skip-existing tracking — sha1(path + size + mtime)."""
    stat = path.stat()
    raw = f"{path.resolve()}|{stat.st_size}|{int(stat.st_mtime)}"
    return hashlib.sha1(raw.encode()).hexdigest()


def human_size(n: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.1f}{unit}" if unit != "B" else f"{n}B"
        n /= 1024
    return f"{n:.1f}TB"


class Manifest:
    """JSON-on-disk record of what we've already pushed."""

    def __init__(self, path: Path):
        self.path = path
        self.entries: Dict[str, Dict] = {}
        if path.exists():
            try:
                self.entries = json.loads(path.read_text())
            except Exception:
                self.entries = {}

    def has(self, sig: str) -> bool:
        return sig in self.entries

    def add(self, sig: str, info: Dict) -> None:
        self.entries[sig] = info

    def save(self) -> None:
        self.path.write_text(json.dumps(self.entries, indent=2))


async def ingest_one(
    client: httpx.AsyncClient,
    api: str,
    path: Path,
    metadata: Dict,
    sem: asyncio.Semaphore,
) -> Dict:
    modality = detect_modality(path)
    if not modality:
        return {"path": str(path), "status": "skipped", "reason": "unknown extension"}

    async with sem:
        try:
            if modality == "text":
                content = path.read_text(encoding="utf-8", errors="replace")
                body = {"text": content}
                if metadata:
                    body["metadata"] = metadata
                r = await client.post(
                    f"{api}/api/v1/upload/text", json=body, timeout=60.0
                )
            else:
                ct = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
                with path.open("rb") as fh:
                    files = {"file": (path.name, fh, ct)}
                    data = {"media_type": modality}
                    if metadata:
                        data["metadata"] = json.dumps(metadata)
                    r = await client.post(
                        f"{api}/api/v1/upload/", files=files, data=data, timeout=180.0
                    )

            if r.status_code >= 400:
                return {
                    "path": str(path),
                    "status": "failed",
                    "modality": modality,
                    "error": f"{r.status_code} {r.text[:200]}",
                }

            payload = r.json()
            return {
                "path": str(path),
                "status": "queued",
                "modality": modality,
                "media_id": payload.get("media_id"),
                "task_id": payload.get("task_id"),
            }
        except Exception as e:  # noqa: BLE001
            return {
                "path": str(path),
                "status": "failed",
                "modality": modality,
                "error": str(e)[:200],
            }


async def main_async(args: argparse.Namespace) -> int:
    root = Path(args.path).expanduser().resolve()
    if not root.exists():
        sys.stderr.write(f"path not found: {root}\n")
        return 1

    if root.is_file():
        candidates: List[Path] = [root]
    else:
        candidates = sorted(p for p in root.rglob("*") if p.is_file())

    files = [p for p in candidates if detect_modality(p) is not None]
    if not files:
        print(f"no ingestible files under {root}")
        return 0

    by_mod: Dict[str, int] = {"image": 0, "audio": 0, "video": 0, "text": 0}
    total_bytes = 0
    for f in files:
        m = detect_modality(f)
        if m:
            by_mod[m] += 1
        try:
            total_bytes += f.stat().st_size
        except OSError:
            pass

    print(
        f"\nFound {len(files)} files ({human_size(total_bytes)}) under {root}\n"
        f"  image: {by_mod['image']:>5}   audio: {by_mod['audio']:>5}   "
        f"video: {by_mod['video']:>5}   text: {by_mod['text']:>5}\n"
        f"API: {args.api}\n"
        f"concurrency: {args.concurrency}\n"
    )

    if args.dry_run:
        for f in files[:50]:
            print(f"  [{detect_modality(f):5}] {f}")
        if len(files) > 50:
            print(f"  …and {len(files) - 50} more")
        return 0

    # Optional skip-existing via manifest
    manifest: Optional[Manifest] = None
    if args.skip_existing:
        manifest_path = Path(args.manifest)
        manifest = Manifest(manifest_path)
        before = len(files)
        files = [f for f in files if not manifest.has(file_signature(f))]
        skipped = before - len(files)
        if skipped:
            print(f"manifest: skipping {skipped} already-ingested files")
        if not files:
            print("nothing new to upload")
            return 0

    metadata = json.loads(args.metadata) if args.metadata else {}
    if args.tag:
        metadata["tag"] = args.tag
    if args.collection:
        metadata["collection"] = args.collection

    sem = asyncio.Semaphore(args.concurrency)
    results: List[Dict] = []
    start = time.time()

    async with httpx.AsyncClient() as client:
        # Health check first — fail fast if the backend isn't up.
        try:
            r = await client.get(f"{args.api}/health/health", timeout=5.0)
            r.raise_for_status()
        except Exception as e:
            sys.stderr.write(f"backend unreachable at {args.api}: {e}\n")
            sys.stderr.write("hint: `make up` to start the stack\n")
            return 1

        tasks = [
            asyncio.create_task(ingest_one(client, args.api, f, metadata, sem))
            for f in files
        ]

        # Report progress as each task settles
        done = 0
        width = len(str(len(tasks)))
        for coro in asyncio.as_completed(tasks):
            res = await coro
            results.append(res)
            done += 1
            tag = res["status"].upper()
            mod = res.get("modality", "?")
            path = res["path"]
            extra = ""
            if res["status"] == "failed":
                extra = f"  ← {res.get('error', '')[:140]}"
            print(f"  [{done:>{width}}/{len(tasks)}] {tag:<8} {mod:<5} {path}{extra}")

            if manifest and res["status"] == "queued":
                manifest.add(
                    file_signature(Path(res["path"])),
                    {
                        "media_id": res.get("media_id"),
                        "modality": mod,
                        "ts": int(time.time()),
                    },
                )

    if manifest:
        manifest.save()

    elapsed = time.time() - start
    queued = sum(1 for r in results if r["status"] == "queued")
    failed = sum(1 for r in results if r["status"] == "failed")
    skipped = sum(1 for r in results if r["status"] == "skipped")

    print(
        f"\nDone in {elapsed:.1f}s — "
        f"{queued} queued · {skipped} skipped · {failed} failed"
    )
    if failed:
        print("\nFailures (first 10):")
        for r in [x for x in results if x["status"] == "failed"][:10]:
            print(f"  {r['path']}\n    {r.get('error', '')[:200]}")
        return 1

    print(
        "\nQueued for embedding. Workers will upload to S3, embed via ImageBind,\n"
        "and upsert into Qdrant. Watch progress at /api/v1/stats/activity."
    )
    return 0


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        prog="synapse-ingest",
        description="Feed a file or folder to a running Synapse backend.",
    )
    p.add_argument("path", help="file or folder to ingest")
    p.add_argument("--api", default="http://localhost:8000",
                   help="base URL of the Synapse backend (default: %(default)s)")
    p.add_argument("--concurrency", type=int, default=4,
                   help="parallel uploads (default: %(default)s)")
    p.add_argument("--tag", default=None,
                   help="adds metadata.tag to every item")
    p.add_argument("--collection", default=None,
                   help="adds metadata.collection to every item")
    p.add_argument("--metadata", default=None,
                   help="extra metadata as a JSON string, merged onto every item")
    p.add_argument("--dry-run", action="store_true",
                   help="list what would be uploaded, don't actually upload")
    p.add_argument("--skip-existing", action="store_true",
                   help="track ingested files in a local manifest and skip them next run")
    p.add_argument("--manifest", default=".synapse-ingest.json",
                   help="path to the skip-existing manifest (default: %(default)s)")
    return p.parse_args()


def main() -> None:
    try:
        rc = asyncio.run(main_async(parse_args()))
    except KeyboardInterrupt:
        sys.stderr.write("\ninterrupted\n")
        rc = 130
    sys.exit(rc)


if __name__ == "__main__":
    main()
