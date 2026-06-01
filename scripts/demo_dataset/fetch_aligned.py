#!/usr/bin/env python3
"""
Fetch a SMALL, cross-modal-ALIGNED, keyless demo dataset.

Unlike scripts/fetch_dataset.py (random Picsum images + random Wikipedia), every
item here is tied to a shared category (see categories.py) so cross-modal search
actually lands: "thunderstorm" text retrieves thunder audio + storm images +
storm video + the Thunderstorm article.

Sources (all keyless):
    image  Openverse API            (CC-licensed, no key)
    audio  ESC-50 zip               (category-labelled, CC BY-NC)
    text   Wikipedia REST summary   (CC BY-SA)
    video  Wikimedia Commons search (CC, transcoded/trimmed later by build_index)

Output:
    <out>/image/*.jpg  <out>/audio/*.wav  <out>/text/*.txt  <out>/video/*
    <out>/manifest.jsonl   one row per item: {path, modality, tag, title?, url?, source}

Run (on the GPU box, stdlib only — no pip needed for this step):
    python scripts/demo_dataset/fetch_aligned.py --out data/demo

Sized for the S3 (~5 GB) + Qdrant (~1 GB) free tiers. Re-runnable: existing
files are skipped, so a re-run only fills gaps.
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import sys
import time
import urllib.parse
import urllib.request
import zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Dict, List, Optional

# Allow `python scripts/demo_dataset/fetch_aligned.py` from anywhere.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from categories import CATEGORIES  # type: ignore  # noqa: E402

UA = "synapse-demo-dataset/1.0 (https://github.com/akshttdev/synapse; bodhimgmt@gmail.com)"
ESC50_ZIP = "https://github.com/karolpiczak/ESC-50/archive/refs/heads/master.zip"


# ------------------------------------------------------------------ http utils

def _req(url: str, accept: Optional[str] = None) -> urllib.request.Request:
    headers = {"User-Agent": UA}
    if accept:
        headers["Accept"] = accept
    return urllib.request.Request(url, headers=headers)


def get_json(url: str, timeout: float = 30.0) -> dict:
    with urllib.request.urlopen(_req(url, "application/json"), timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8"))


def get_bytes(url: str, timeout: float = 120.0) -> bytes:
    with urllib.request.urlopen(_req(url), timeout=timeout) as r:
        return r.read()


def log(msg: str) -> None:
    print(msg, flush=True)


# ------------------------------------------------------------------ images

def fetch_images(out: Path, per_cat: int, workers: int) -> List[Dict]:
    """Category-relevant CC images from Wikimedia Commons — keyless (no token)."""
    d = out / "image"
    d.mkdir(parents=True, exist_ok=True)
    rows: List[Dict] = []

    def one_category(cat) -> List[Dict]:
        local_rows: List[Dict] = []
        q = urllib.parse.urlencode({
            "action": "query", "format": "json",
            "generator": "search",
            "gsrsearch": f"{cat.query} filetype:bitmap",
            "gsrnamespace": "6", "gsrlimit": min(per_cat, 200),
            "prop": "imageinfo", "iiprop": "url|size|mime",
            "iiurlwidth": "1600",   # scaled thumb url → reasonable file size
        })
        url = f"https://commons.wikimedia.org/w/api.php?{q}"
        try:
            data = get_json(url)
        except Exception as e:  # noqa: BLE001
            log(f"  [image:{cat.key}] search failed: {e}")
            return local_rows
        pages = (data.get("query") or {}).get("pages", {})
        got = 0
        for page in pages.values():
            if got >= per_cat:
                break
            info = (page.get("imageinfo") or [{}])[0]
            mime = info.get("mime", "")
            if not mime.startswith("image/"):
                continue
            src = info.get("thumburl") or info.get("url")
            if not src:
                continue
            ext = ".png" if "png" in mime else ".jpg"
            target = d / f"{cat.key}_{abs(hash(src)) % 10**9}{ext}"
            if target.exists() and target.stat().st_size > 0:
                got += 1
                local_rows.append(_img_row(target, cat, page))
                continue
            try:
                blob = get_bytes(src, timeout=90.0)
                if len(blob) < 2000:
                    continue
                target.write_bytes(blob)
                got += 1
                local_rows.append(_img_row(target, cat, page))
            except Exception:  # noqa: BLE001
                continue
        log(f"  [image:{cat.key}] {got}")
        return local_rows

    with ThreadPoolExecutor(max_workers=workers) as ex:
        futs = [ex.submit(one_category, c) for c in CATEGORIES]
        for f in as_completed(futs):
            rows.extend(f.result())
    return rows


def _img_row(target: Path, cat, page: dict) -> Dict:
    info = (page.get("imageinfo") or [{}])[0]
    return {
        "path": str(target), "modality": "image", "tag": cat.key,
        "title": page.get("title"), "source": "wikimedia_commons",
        "license": "CC", "url": info.get("descriptionurl"),
    }


# ------------------------------------------------------------------ audio (ESC-50)

def fetch_audio(out: Path, per_cat: int) -> List[Dict]:
    d = out / "audio"
    d.mkdir(parents=True, exist_ok=True)
    wanted = {c.key for c in CATEGORIES}
    rows: List[Dict] = []

    log(f"  [audio] downloading ESC-50 (~620 MB) …")
    try:
        zip_bytes = get_bytes(ESC50_ZIP, timeout=900.0)
    except Exception as e:  # noqa: BLE001
        log(f"  [audio] ESC-50 download failed: {e}")
        return rows

    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        meta_name = next(n for n in zf.namelist() if n.endswith("meta/esc50.csv"))
        with zf.open(meta_name) as fh:
            reader = csv.DictReader(io.TextIOWrapper(fh, encoding="utf-8"))
            by_cat: Dict[str, List[str]] = {}
            for r in reader:
                cat = r["category"]
                if cat in wanted:
                    by_cat.setdefault(cat, []).append(r["filename"])

        for cat, files in by_cat.items():
            for fname in files[:per_cat]:
                member = next((n for n in zf.namelist()
                               if n.endswith(f"audio/{fname}")), None)
                if not member:
                    continue
                target = d / fname
                if not (target.exists() and target.stat().st_size > 0):
                    target.write_bytes(zf.read(member))
                rows.append({
                    "path": str(target), "modality": "audio", "tag": cat,
                    "title": None, "source": "ESC-50", "license": "CC BY-NC",
                })
            log(f"  [audio:{cat}] {min(per_cat, len(files))}")
    return rows


# ------------------------------------------------------------------ text (Wikipedia)

def fetch_text(out: Path, per_cat: int) -> List[Dict]:
    d = out / "text"
    d.mkdir(parents=True, exist_ok=True)
    rows: List[Dict] = []

    def summary(title: str) -> Optional[dict]:
        t = urllib.parse.quote(title.replace(" ", "_"))
        try:
            return get_json(f"https://en.wikipedia.org/api/rest_v1/page/summary/{t}")
        except Exception:  # noqa: BLE001
            return None

    def save(cat, j: dict) -> Optional[Dict]:
        extract = (j or {}).get("extract")
        title = (j or {}).get("title")
        if not extract or not title:
            return None
        safe = "".join(ch if ch.isalnum() else "_" for ch in title)[:48]
        target = d / f"{cat.key}_{safe}.txt"
        target.write_text(f"{title}\n\n{extract}\n", encoding="utf-8")
        return {
            "path": str(target), "modality": "text", "tag": cat.key,
            "title": title, "source": "wikipedia", "license": "CC BY-SA",
            "url": (j.get("content_urls") or {}).get("desktop", {}).get("page"),
        }

    for cat in CATEGORIES:
        seen_titles = set()
        # 1) the canonical article
        j = summary(cat.wiki)
        if j:
            row = save(cat, j)
            if row:
                rows.append(row)
                seen_titles.add(j.get("title"))
        # 2) top-up via search to reach per_cat
        if per_cat > 1:
            q = urllib.parse.urlencode({
                "action": "query", "list": "search", "srsearch": cat.query,
                "srlimit": per_cat + 2, "format": "json",
            })
            try:
                res = get_json(f"https://en.wikipedia.org/w/api.php?{q}")
                for hit in res.get("query", {}).get("search", []):
                    if len([r for r in rows if r["tag"] == cat.key]) >= per_cat:
                        break
                    title = hit.get("title")
                    if not title or title in seen_titles:
                        continue
                    jj = summary(title)
                    if jj:
                        row = save(cat, jj)
                        if row:
                            rows.append(row)
                            seen_titles.add(title)
            except Exception:  # noqa: BLE001
                pass
        log(f"  [text:{cat.key}] {len([r for r in rows if r['tag'] == cat.key])}")
    return rows


# ------------------------------------------------------------------ video (Wikimedia Commons)

def fetch_video(out: Path, total: int) -> List[Dict]:
    d = out / "video"
    d.mkdir(parents=True, exist_ok=True)
    rows: List[Dict] = []
    per_cat = max(1, total // len(CATEGORIES))

    for cat in CATEGORIES:
        if len(rows) >= total:
            break
        q = urllib.parse.urlencode({
            "action": "query", "format": "json",
            "generator": "search",
            "gsrsearch": f"{cat.query} filetype:video",
            "gsrnamespace": "6", "gsrlimit": per_cat + 3,
            "prop": "imageinfo", "iiprop": "url|size|mediatype|duration",
        })
        try:
            res = get_json(f"https://commons.wikimedia.org/w/api.php?{q}")
        except Exception:  # noqa: BLE001
            continue
        pages = (res.get("query") or {}).get("pages", {})
        got = 0
        for page in pages.values():
            if got >= per_cat or len(rows) >= total:
                break
            info = (page.get("imageinfo") or [{}])[0]
            if info.get("mediatype") != "VIDEO":
                continue
            dur = info.get("duration") or 0
            if dur and dur > 90:   # skip long files; we trim to <=10s later
                continue
            src = info.get("url")
            if not src:
                continue
            ext = Path(urllib.parse.urlparse(src).path).suffix or ".webm"
            target = d / f"{cat.key}_{abs(hash(src)) % 10**8}{ext}"
            if not (target.exists() and target.stat().st_size > 0):
                try:
                    blob = get_bytes(src, timeout=300.0)
                    if len(blob) < 10000:
                        continue
                    target.write_bytes(blob)
                except Exception:  # noqa: BLE001
                    continue
            rows.append({
                "path": str(target), "modality": "video", "tag": cat.key,
                "title": page.get("title"), "source": "wikimedia_commons",
                "license": "CC", "url": src,
            })
            got += 1
        log(f"  [video:{cat.key}] {got}")
    return rows


# ------------------------------------------------------------------ driver

def main() -> int:
    ap = argparse.ArgumentParser(description="Fetch a keyless, cross-modal-aligned demo dataset.")
    ap.add_argument("--out", type=Path, default=Path("data/demo"))
    # Defaults sized to fill the B2 free tier (≈5-7 GB) with an image-heavy,
    # diverse, cross-modal set. Scale up/down with these flags.
    ap.add_argument("--images-per-cat", type=int, default=120)  # ~41*120 ≈ 4900 imgs
    ap.add_argument("--audio-per-cat", type=int, default=40)    # all ESC-50 clips/class
    ap.add_argument("--text-per-cat", type=int, default=6)
    ap.add_argument("--videos-total", type=int, default=180)
    ap.add_argument("--workers", type=int, default=8)
    ap.add_argument("--skip", default="", help="comma list of modalities to skip: image,audio,video,text")
    args = ap.parse_args()

    skip = {s.strip() for s in args.skip.split(",") if s.strip()}
    args.out.mkdir(parents=True, exist_ok=True)
    rows: List[Dict] = []
    started = time.time()

    if "image" not in skip:
        log("[image] Openverse"); rows += fetch_images(args.out, args.images_per_cat, args.workers)
    if "audio" not in skip:
        log("[audio] ESC-50"); rows += fetch_audio(args.out, args.audio_per_cat)
    if "text" not in skip:
        log("[text] Wikipedia"); rows += fetch_text(args.out, args.text_per_cat)
    if "video" not in skip:
        log("[video] Wikimedia Commons"); rows += fetch_video(args.out, args.videos_total)

    manifest = args.out / "manifest.jsonl"
    with manifest.open("w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r) + "\n")

    total_bytes = sum(p.stat().st_size for p in args.out.rglob("*") if p.is_file())
    counts: Dict[str, int] = {}
    for r in rows:
        counts[r["modality"]] = counts.get(r["modality"], 0) + 1
    log("\n" + "=" * 48)
    log(f"manifest: {manifest}  ({len(rows)} items)")
    log(f"  " + "  ".join(f"{k}:{v}" for k, v in sorted(counts.items())))
    log(f"  size: {total_bytes/1e9:.2f} GB   time: {time.time()-started:.0f}s")
    log("next: python scripts/demo_dataset/build_index.py --manifest " + str(manifest))
    return 0


if __name__ == "__main__":
    sys.exit(main())
