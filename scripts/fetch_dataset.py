#!/usr/bin/env python3
"""
synapse-fetch-dataset — pull a real cross-modal dataset (~2-3 GB by default,
configurable up to whatever you want). For testing the stack at meaningful
scale: thousands of vectors in Qdrant, gigabytes in S3.

Defaults (about 2.5 GB total, ~6000 items):
    data/dataset/images/   2000  random photos from Picsum (800x600 jpg)
    data/dataset/audio/    2000  ESC-50 environmental sound clips (5s wav)
    data/dataset/video/    13    Google sample bucket (BigBuckBunny, Sintel, etc.)
    data/dataset/text/     2000  Wikipedia random article summaries

After it lands, ingest with:
    make ingest PATH=data/dataset

Sized for the AWS S3 free tier (5 GB) and well under Qdrant Cloud free tier
(1M vectors). Bump --images, --text, --audio to push higher.
"""
from __future__ import annotations

import argparse
import asyncio
import io
import sys
import time
import zipfile
from pathlib import Path
from typing import List, Tuple

try:
    import httpx
except ImportError:
    sys.stderr.write("missing dependency: httpx\n  pip install httpx\n")
    sys.exit(2)


ROOT = Path(__file__).resolve().parents[1] / "data" / "dataset"
IMAGES_DIR = ROOT / "images"
AUDIO_DIR = ROOT / "audio"
VIDEO_DIR = ROOT / "video"
TEXT_DIR = ROOT / "text"


def human(n: int) -> str:
    f = float(n)
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if f < 1024:
            return f"{f:.1f}{unit}" if unit != "B" else f"{int(f)}B"
        f /= 1024
    return f"{f:.1f}PB"


def progress(prefix: str, done: int, total: int, extra: str = "") -> None:
    bar_w = 24
    filled = int(bar_w * done / total) if total else bar_w
    bar = "█" * filled + "·" * (bar_w - filled)
    sys.stdout.write(f"\r  {prefix} [{bar}] {done}/{total}  {extra}    ")
    sys.stdout.flush()
    if done == total:
        sys.stdout.write("\n")


# ---------------------------------------------------------------- IMAGES

async def fetch_images(client: httpx.AsyncClient, count: int, concurrency: int) -> Tuple[int, int]:
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    sem = asyncio.Semaphore(concurrency)
    done = 0
    ok = 0
    failed = 0
    lock = asyncio.Lock()

    async def one(i: int) -> None:
        nonlocal done, ok, failed
        seed = f"synapse-{i:05d}"
        target = IMAGES_DIR / f"img-{i:05d}.jpg"
        if target.exists() and target.stat().st_size > 0:
            async with lock:
                done += 1
                ok += 1
                progress("images", done, count, f"{human(target.stat().st_size)}")
            return
        url = f"https://picsum.photos/seed/{seed}/800/600.jpg"
        async with sem:
            try:
                r = await client.get(url, follow_redirects=True, timeout=30.0)
                r.raise_for_status()
                target.write_bytes(r.content)
                async with lock:
                    done += 1
                    ok += 1
                    progress("images", done, count, human(target.stat().st_size))
            except Exception:  # noqa: BLE001
                async with lock:
                    done += 1
                    failed += 1
                    progress("images", done, count, f"{failed} failed")

    print(f"\n[images]  {count} from Picsum")
    await asyncio.gather(*(one(i) for i in range(count)))
    return ok, failed


# ---------------------------------------------------------------- TEXT

async def fetch_text(client: httpx.AsyncClient, count: int, concurrency: int) -> Tuple[int, int]:
    TEXT_DIR.mkdir(parents=True, exist_ok=True)
    sem = asyncio.Semaphore(concurrency)
    done = 0
    ok = 0
    failed = 0
    lock = asyncio.Lock()

    async def one(i: int) -> None:
        nonlocal done, ok, failed
        target = TEXT_DIR / f"wiki-{i:05d}.txt"
        if target.exists() and target.stat().st_size > 0:
            async with lock:
                done += 1
                ok += 1
                progress("text", done, count)
            return
        async with sem:
            try:
                r = await client.get(
                    "https://en.wikipedia.org/api/rest_v1/page/random/summary",
                    follow_redirects=True,
                    timeout=20.0,
                    headers={"User-Agent": "synapse-dataset/1.0 (akshttt.dev@gmail.com)"},
                )
                r.raise_for_status()
                data = r.json()
                title = data.get("title", "")
                extract = data.get("extract", "")
                if not extract:
                    raise ValueError("empty extract")
                target.write_text(f"{title}\n\n{extract}\n", encoding="utf-8")
                async with lock:
                    done += 1
                    ok += 1
                    progress("text", done, count)
            except Exception:  # noqa: BLE001
                async with lock:
                    done += 1
                    failed += 1
                    progress("text", done, count, f"{failed} failed")

    print(f"\n[text]    {count} random Wikipedia summaries")
    await asyncio.gather(*(one(i) for i in range(count)))
    return ok, failed


# ---------------------------------------------------------------- VIDEO

# Google's gtv-videos-bucket — public sample MP4s used in HLS/DASH demos
# everywhere. Stable URLs for years.
VIDEO_URLS = [
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4",
]


async def fetch_videos(client: httpx.AsyncClient, count: int, concurrency: int) -> Tuple[int, int]:
    VIDEO_DIR.mkdir(parents=True, exist_ok=True)
    urls = VIDEO_URLS[:count]
    sem = asyncio.Semaphore(concurrency)
    done = 0
    ok = 0
    failed = 0
    total_bytes = 0
    lock = asyncio.Lock()

    async def one(url: str) -> None:
        nonlocal done, ok, failed, total_bytes
        name = url.rsplit("/", 1)[-1]
        target = VIDEO_DIR / name
        if target.exists() and target.stat().st_size > 0:
            async with lock:
                done += 1
                ok += 1
                total_bytes += target.stat().st_size
                progress("video", done, len(urls), human(total_bytes))
            return
        async with sem:
            try:
                async with client.stream("GET", url, follow_redirects=True, timeout=300.0) as r:
                    r.raise_for_status()
                    with target.open("wb") as f:
                        async for chunk in r.aiter_bytes(chunk_size=1 << 16):
                            f.write(chunk)
                async with lock:
                    done += 1
                    ok += 1
                    total_bytes += target.stat().st_size
                    progress("video", done, len(urls), human(total_bytes))
            except Exception:  # noqa: BLE001
                if target.exists():
                    target.unlink()  # don't leave half-files
                async with lock:
                    done += 1
                    failed += 1
                    progress("video", done, len(urls), f"{failed} failed")

    print(f"\n[video]   {len(urls)} files from gtv-videos-bucket (~50-150 MB each)")
    await asyncio.gather(*(one(u) for u in urls))
    return ok, failed


# ---------------------------------------------------------------- AUDIO (ESC-50)

# ESC-50 — 2000 environmental sound clips, 5s each, 50 classes.
# https://github.com/karolpiczak/ESC-50  (CC BY-NC; fine for personal testing)
ESC50_ZIP_URL = "https://github.com/karolpiczak/ESC-50/archive/refs/heads/master.zip"


def fetch_audio_esc50(limit: int) -> Tuple[int, int]:
    """
    Download ESC-50 as a single zip and extract the audio/*.wav files.
    `limit` caps how many we keep (full set is 2000).
    """
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)

    # Skip download if we already have at least `limit` wavs
    existing = list(AUDIO_DIR.glob("*.wav"))
    if len(existing) >= limit:
        print(f"\n[audio]   already have {len(existing)} wavs in {AUDIO_DIR.relative_to(ROOT.parent.parent)}, skipping")
        return min(limit, len(existing)), 0

    print(f"\n[audio]   downloading ESC-50 (~620 MB zip) → extracting {limit} clips")
    print(f"          {ESC50_ZIP_URL}")

    try:
        with httpx.Client(timeout=600.0, follow_redirects=True) as client:
            total = 0
            chunks: List[bytes] = []
            with client.stream("GET", ESC50_ZIP_URL) as r:
                r.raise_for_status()
                size_hint = int(r.headers.get("content-length", 0))
                for chunk in r.iter_bytes(chunk_size=1 << 18):
                    chunks.append(chunk)
                    total += len(chunk)
                    if size_hint:
                        pct = total / size_hint * 100
                        sys.stdout.write(f"\r          downloading: {human(total)} / {human(size_hint)} ({pct:.1f}%)   ")
                    else:
                        sys.stdout.write(f"\r          downloading: {human(total)}   ")
                    sys.stdout.flush()
            sys.stdout.write("\n")
        zip_bytes = b"".join(chunks)
    except Exception as e:  # noqa: BLE001
        print(f"\n          download failed: {e}")
        return 0, 1

    print("          extracting wav files…")
    extracted = 0
    try:
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            wav_members = [n for n in zf.namelist() if n.endswith(".wav") and "/audio/" in n]
            wav_members.sort()
            for name in wav_members[:limit]:
                filename = Path(name).name
                target = AUDIO_DIR / filename
                if target.exists() and target.stat().st_size > 0:
                    extracted += 1
                    continue
                with zf.open(name) as src, target.open("wb") as dst:
                    dst.write(src.read())
                extracted += 1
                if extracted % 100 == 0:
                    sys.stdout.write(f"\r          extracted {extracted}/{min(limit, len(wav_members))}   ")
                    sys.stdout.flush()
            sys.stdout.write(f"\r          extracted {extracted}/{min(limit, len(wav_members))}   \n")
    except zipfile.BadZipFile as e:
        print(f"          zip corrupted: {e}")
        return 0, 1

    return extracted, 0


# ---------------------------------------------------------------- DRIVER

async def main_async(args: argparse.Namespace) -> int:
    ROOT.mkdir(parents=True, exist_ok=True)
    print(f"Target: {ROOT}")
    print(
        f"Plan: {args.images} images · {args.text} text · "
        f"{args.video} video · {args.audio} audio"
    )

    started = time.time()
    counts = {"images": (0, 0), "text": (0, 0), "video": (0, 0), "audio": (0, 0)}

    async with httpx.AsyncClient() as client:
        if args.images > 0:
            counts["images"] = await fetch_images(client, args.images, concurrency=args.concurrency)
        if args.text > 0:
            counts["text"] = await fetch_text(client, args.text, concurrency=min(args.concurrency, 6))
        if args.video > 0:
            counts["video"] = await fetch_videos(client, args.video, concurrency=3)

    if args.audio > 0:
        counts["audio"] = fetch_audio_esc50(limit=args.audio)

    # Tally
    total_ok = sum(ok for ok, _ in counts.values())
    total_failed = sum(failed for _, failed in counts.values())

    total_bytes = 0
    for d in (IMAGES_DIR, AUDIO_DIR, VIDEO_DIR, TEXT_DIR):
        if d.exists():
            for f in d.rglob("*"):
                if f.is_file():
                    try:
                        total_bytes += f.stat().st_size
                    except OSError:
                        pass

    elapsed = time.time() - started
    print(
        f"\nDone in {elapsed:.0f}s\n"
        f"  images: {counts['images'][0]:>6}   text:  {counts['text'][0]:>6}\n"
        f"  video:  {counts['video'][0]:>6}   audio: {counts['audio'][0]:>6}\n"
        f"  total: {total_ok} files · {human(total_bytes)}\n"
        + (f"  failures: {total_failed}\n" if total_failed else "")
    )
    print(
        "Ingest into Qdrant + S3:\n"
        "  make ingest PATH=data/dataset CONCURRENCY=8\n"
        "Watch:\n"
        "  make stats && make activity"
    )
    return 0


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        prog="synapse-fetch-dataset",
        description="Pull a real cross-modal dataset (~2-3 GB by default).",
    )
    p.add_argument("--images", type=int, default=2000, help="Picsum images (default %(default)s, each ~50 KB)")
    p.add_argument("--text", type=int, default=2000, help="Wikipedia summaries (default %(default)s)")
    p.add_argument(
        "--video", type=int, default=len(VIDEO_URLS),
        help=f"Google sample bucket videos, max {len(VIDEO_URLS)} (default all)",
    )
    p.add_argument("--audio", type=int, default=2000, help="ESC-50 wav clips (max 2000, default %(default)s)")
    p.add_argument("--concurrency", type=int, default=10, help="parallel downloads per modality")
    return p.parse_args()


def main() -> None:
    args = parse_args()
    try:
        rc = asyncio.run(main_async(args))
    except KeyboardInterrupt:
        sys.stderr.write("\ninterrupted — partial files are fine, re-run to resume\n")
        rc = 130
    sys.exit(rc)


if __name__ == "__main__":
    main()
