#!/usr/bin/env python3
"""
synapse-fetch-samples — populate data/samples/ with a small test set across
all four modalities, so you can ingest something without sourcing files yourself.

What you get (about 60-80 MB total):
    data/samples/images/   10 random 800×600 photos from Picsum
    data/samples/audio/    5  generated WAV clips (sine / chord / sweep / noise / beats)
    data/samples/video/    3  public-domain MP4s from Google's sample bucket
    data/samples/text/     10 Wikipedia article extracts on varied topics

Then ingest with:
    make ingest PATH=data/samples
"""
from __future__ import annotations

import argparse
import json
import math
import struct
import sys
import time
import wave
from pathlib import Path
from typing import List, Tuple

try:
    import httpx
except ImportError:
    sys.stderr.write("missing dependency: httpx\n  pip install httpx\n")
    sys.exit(2)


ROOT = Path(__file__).resolve().parents[1] / "data" / "samples"

IMAGES_DIR = ROOT / "images"
AUDIO_DIR = ROOT / "audio"
VIDEO_DIR = ROOT / "video"
TEXT_DIR = ROOT / "text"


# ---------------------------------------------------------------- images
# Picsum is reliable, no API key. We pin seeds so the same image lands every
# time, which is nice for reproducible debugging.
IMAGE_SEEDS = [
    "thunderstorm", "rain", "ocean", "mountain", "forest",
    "city", "desert", "snow", "sunset", "river",
]


def fetch_images(client: httpx.Client) -> List[Tuple[Path, str]]:
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    out: List[Tuple[Path, str]] = []
    for seed in IMAGE_SEEDS:
        url = f"https://picsum.photos/seed/{seed}/800/600.jpg"
        target = IMAGES_DIR / f"{seed}.jpg"
        if target.exists():
            out.append((target, "exists"))
            continue
        try:
            r = client.get(url, follow_redirects=True, timeout=30)
            r.raise_for_status()
            target.write_bytes(r.content)
            out.append((target, "ok"))
        except Exception as e:  # noqa: BLE001
            out.append((target, f"failed: {e}"))
    return out


# ---------------------------------------------------------------- text
# Wikipedia REST API returns a short page summary — perfect "passage" size.
WIKI_TOPICS = [
    "Thunderstorm", "Rain", "Pacific_Ocean", "Mount_Everest",
    "Forest", "City", "Sahara", "Snow", "Sunset", "Amazon_River",
]


def fetch_text(client: httpx.Client) -> List[Tuple[Path, str]]:
    TEXT_DIR.mkdir(parents=True, exist_ok=True)
    out: List[Tuple[Path, str]] = []
    for topic in WIKI_TOPICS:
        target = TEXT_DIR / f"{topic.lower()}.txt"
        if target.exists():
            out.append((target, "exists"))
            continue
        try:
            url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{topic}"
            r = client.get(
                url,
                follow_redirects=True,
                timeout=20,
                headers={"User-Agent": "synapse-samples/1.0 (akshttt.dev@gmail.com)"},
            )
            r.raise_for_status()
            data = r.json()
            title = data.get("title", topic)
            extract = data.get("extract", "")
            target.write_text(f"{title}\n\n{extract}\n", encoding="utf-8")
            out.append((target, "ok"))
        except Exception as e:  # noqa: BLE001
            out.append((target, f"failed: {e}"))
    return out


# ---------------------------------------------------------------- video
# Google's gtv-videos-bucket is public and has been stable for years.
# Picking smaller clips so the download is bearable on home internet.
VIDEO_URLS = [
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
]


def fetch_videos(client: httpx.Client) -> List[Tuple[Path, str]]:
    VIDEO_DIR.mkdir(parents=True, exist_ok=True)
    out: List[Tuple[Path, str]] = []
    for url in VIDEO_URLS:
        name = url.rsplit("/", 1)[-1]
        target = VIDEO_DIR / name
        if target.exists():
            out.append((target, "exists"))
            continue
        try:
            with client.stream("GET", url, follow_redirects=True, timeout=120) as r:
                r.raise_for_status()
                with target.open("wb") as f:
                    for chunk in r.iter_bytes(chunk_size=1 << 16):
                        f.write(chunk)
            out.append((target, "ok"))
        except Exception as e:  # noqa: BLE001
            out.append((target, f"failed: {e}"))
    return out


# ---------------------------------------------------------------- audio
# Generated locally — no flaky URLs. Each clip is a distinct waveform so
# ImageBind embeds them into distinguishable points in the audio sub-space.

def _write_wav(path: Path, samples: List[float], rate: int = 22050) -> None:
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        for s in samples:
            s = max(-1.0, min(1.0, s))
            w.writeframesraw(struct.pack("<h", int(s * 32767)))


def _sine(freq: float, dur: float, rate: int = 22050, amp: float = 0.6) -> List[float]:
    n = int(rate * dur)
    return [amp * math.sin(2 * math.pi * freq * i / rate) for i in range(n)]


def _chord(freqs: List[float], dur: float, rate: int = 22050) -> List[float]:
    n = int(rate * dur)
    return [
        sum(0.6 / len(freqs) * math.sin(2 * math.pi * f * i / rate) for f in freqs)
        for i in range(n)
    ]


def _sweep(f0: float, f1: float, dur: float, rate: int = 22050) -> List[float]:
    n = int(rate * dur)
    out = []
    for i in range(n):
        t = i / rate
        f = f0 + (f1 - f0) * (t / dur)
        out.append(0.6 * math.sin(2 * math.pi * f * t))
    return out


def _noise(dur: float, rate: int = 22050) -> List[float]:
    # Simple deterministic pseudo-noise so reruns produce the same file
    n = int(rate * dur)
    out = []
    state = 0x1234567
    for _ in range(n):
        state = (state * 1103515245 + 12345) & 0x7FFFFFFF
        out.append((state / 0x40000000 - 1.0) * 0.35)
    return out


def _beats(dur: float, bpm: int = 120, rate: int = 22050) -> List[float]:
    n = int(rate * dur)
    period = int(60 * rate / bpm)
    out = []
    for i in range(n):
        # Short click envelope every beat
        phase = i % period
        env = math.exp(-phase / (rate * 0.05)) if phase < rate * 0.1 else 0.0
        out.append(env * math.sin(2 * math.pi * 110 * i / rate) * 0.8)
    return out


def fetch_audio() -> List[Tuple[Path, str]]:
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    plan = [
        ("tone-440.wav", _sine(440, 4.0), "440Hz tone"),
        ("chord-cmaj.wav", _chord([261.6, 329.6, 392.0], 4.0), "C major chord"),
        ("sweep-100-2k.wav", _sweep(100, 2000, 5.0), "100→2000Hz sweep"),
        ("noise.wav", _noise(3.0), "pink-ish noise"),
        ("beats-120bpm.wav", _beats(5.0, 120), "drum click 120bpm"),
    ]
    out: List[Tuple[Path, str]] = []
    for name, samples, label in plan:
        target = AUDIO_DIR / name
        if target.exists():
            out.append((target, "exists"))
            continue
        try:
            _write_wav(target, samples)
            out.append((target, f"ok · {label}"))
        except Exception as e:  # noqa: BLE001
            out.append((target, f"failed: {e}"))
    return out


# ---------------------------------------------------------------- driver


def main() -> int:
    ap = argparse.ArgumentParser(description="Fetch sample data for Synapse")
    ap.add_argument("--skip", nargs="*", default=[],
                    choices=["images", "audio", "video", "text"],
                    help="modalities to skip (e.g. --skip video)")
    args = ap.parse_args()

    ROOT.mkdir(parents=True, exist_ok=True)
    print(f"Sample data → {ROOT}")

    started = time.time()
    summary = {}

    with httpx.Client() as client:
        if "images" not in args.skip:
            print("\n[images]  Picsum 800×600, 10 files")
            summary["images"] = fetch_images(client)
            _print_results(summary["images"])

        if "text" not in args.skip:
            print("\n[text]    Wikipedia summaries, 10 topics")
            summary["text"] = fetch_text(client)
            _print_results(summary["text"])

        if "video" not in args.skip:
            print("\n[video]   Google sample bucket, 3 MP4s (~5-15 MB each)")
            summary["video"] = fetch_videos(client)
            _print_results(summary["video"])

    if "audio" not in args.skip:
        print("\n[audio]   Generated locally (sine / chord / sweep / noise / beats)")
        summary["audio"] = fetch_audio()
        _print_results(summary["audio"])

    # Totals
    total_ok = sum(1 for r in summary.values() for _, s in r if s == "ok" or s == "exists" or s.startswith("ok"))
    total_failed = sum(1 for r in summary.values() for _, s in r if s.startswith("failed"))
    total_bytes = 0
    for r in summary.values():
        for p, _ in r:
            try:
                total_bytes += p.stat().st_size
            except OSError:
                pass

    print(
        f"\nDone in {time.time() - started:.1f}s — "
        f"{total_ok} files ready · {total_failed} failed · "
        f"{total_bytes / (1024**2):.1f} MB total"
    )

    if total_failed:
        print("\nFailures (you can re-run; existing files won't redownload):")
        for kind, r in summary.items():
            for p, s in r:
                if s.startswith("failed"):
                    print(f"  [{kind}] {p.name} → {s}")

    print(
        "\nNext step:\n"
        "  make up                              # boot the stack\n"
        "  make ingest PATH=data/samples        # feed everything to Qdrant\n"
        "  make stats && make activity          # watch it land\n"
    )
    return 0 if total_failed == 0 else 1


def _print_results(items: List[Tuple[Path, str]]) -> None:
    for p, status in items:
        marker = "·" if status in ("ok", "exists") or status.startswith("ok") else "✗"
        print(f"  {marker} {p.relative_to(ROOT.parent.parent)}  {status}")


if __name__ == "__main__":
    sys.exit(main())
