# Synapse — Architecture

A deep dive into how Synapse does cross‑modal search, why each piece was chosen, and the engineering problems that came up building it. For the quick version, see the [README](../README.md).

---

## 1. The core idea: one shared embedding space

Traditional multimodal search keeps a separate index per modality and bolts a fusion layer on top. Synapse instead uses **[ImageBind](https://github.com/facebookresearch/ImageBind)**, a model that maps image, audio, video, and text into a **single 1024‑dimensional space**, all normalized to a unit sphere.

The consequence is simple and powerful: **a cosine similarity between *any* two items is meaningful**, regardless of modality. So:

- a **text** query vector can rank **audio** clips,
- an **image** query vector can rank **videos**,
- everything lives in one Qdrant collection, reached by one query path.

You commit to ImageBind's geometry — but you gain enormous simplicity. No per‑modality towers, no fusion heuristics, no N‑way query fan‑out at the storage layer.

---

## 2. System overview

```
                        ┌──────────────────────────────────────────────┐
                        │                  Browser                      │
                        │            Next.js (landing + search)         │
                        └───────────────┬───────────────▲───────────────┘
                POST /api/v1/search     │               │ presigned media URLs
              (text|image|audio|video)  ▼               │
                        ┌──────────────────────────────────────────────┐
                        │                  FastAPI                      │
                        │  • embed query with ImageBind → 1024-D vector │
                        │  • balanced per-modality k-NN                 │
                        │  • presign object keys for the browser        │
                        │  • Redis cache (optional, fail-safe)          │
                        └───────┬───────────────────────────┬──────────┘
                  query+filter  │                            │ presign keys
                                ▼                            ▼
                  ┌──────────────────────────┐   ┌──────────────────────────┐
                  │      Qdrant Cloud         │   │       Backblaze B2        │
                  │  HNSW + int8, 5,712 pts   │   │  originals + thumbnails   │
                  │  modality payload index   │   │  (S3-compatible)          │
                  └──────────────────────────┘   └──────────────────────────┘
```

**No Postgres, no message broker on the serving path.** Search is synchronous: embed → query → presign → return. Redis is used only as an optional response cache and degrades silently if it isn't running.

---

## 3. Components

| Component | Path | Responsibility |
|---|---|---|
| **Embedder** | `backend/core/embeddings.py` | Loads ImageBind‑Huge; embeds text/image/audio/video to 1024‑D. fp16 autocast on CUDA. Video via ffmpeg frame‑sampling. |
| **Vector client** | `backend/core/qdrant_client.py` | Thin Qdrant Cloud client (HTTPS + API key). |
| **Object storage** | `backend/core/storage.py` | S3‑compatible (`S3_ENDPOINT_URL`) — works with B2, R2, MinIO, AWS. Upload, presign, stream, bucket‑ensure. |
| **Search** | `backend/services/search_service.py` | Embeds query, runs balanced per‑modality k‑NN, presigns results, caches text queries. |
| **API** | `backend/api/routes/` | `search`, `upload`, `media` (proxy), `stats`, `health`. |
| **Ingest pipeline** | `scripts/demo_dataset/` | `fetch_aligned.py` (dataset) → `build_index.py` (GPU embed → B2 + Qdrant). |
| **Ops** | `scripts/qdrant/` | `create_collection.py`, `snapshot.py`, `restore.py`. |

---

## 4. Data flow

### Query
1. Client `POST`s multipart `/api/v1/search` with exactly one of `text` / `image_file` / `audio_file` / `video_file`.
2. The service embeds the query once with ImageBind → a 1024‑D vector.
3. **Balanced retrieval**: if no modality filter is given, it issues one filtered k‑NN per modality (`image`, `audio`, `video`, `text`), merges, and sorts by score — guaranteeing a cross‑modal mix. If the client *does* pass a modality filter (e.g. a UI pill), it's a single filtered query.
4. Each result's stored B2 key is **presigned** at query time, so URLs never go stale.
5. Response: ranked `results[]` + latency metrics. Text queries are cached in Redis.

### Ingest (one‑time, GPU)
1. `fetch_aligned.py` downloads a keyless, cross‑modal‑aligned dataset to disk and writes `manifest.jsonl`.
2. `build_index.py` reads the manifest, embeds each item on the GPU (batched, fp16), uploads the original + thumbnail/poster to B2, and upserts `{vector, payload}` to Qdrant. It's **idempotent** (point id = `uuid5(sha256(bytes))`) and **resumable** (a local `indexed.json`), and deletes local originals after upload to respect disk.
3. `snapshot.py` scrolls every point (vectors + payloads) into a gzipped JSONL in B2 for disaster recovery.

---

## 5. Qdrant schema

One collection (`media`):

```
VectorParams(size=1024, distance=COSINE, on_disk=False)
HnswConfigDiff(m=16, ef_construct=200, full_scan_threshold=10000)
ScalarQuantization(int8, quantile=0.99, always_ram=True)
payload indexes:  modality (keyword),  tag (keyword)
```

Payload per point: `media_id, modality, tag, title, source, license, file_key, thumbnail_key, preview_key, snippet (text), indexed_at`. The `*_key` fields are B2 object keys, presigned on read.

---

## 6. Infrastructure under constraints

This build was done under a hard real‑world constraint: **no credit card, free tiers only.** That shaped the stack:

- **AWS S3 → Backblaze B2.** The original bucket's account was closed; R2 and Oracle want a card; **B2's 10 GB free tier needs none.** Because the storage layer is S3‑compatible (`_s3_client()` just takes an `S3_ENDPOINT_URL`), switching providers was a config change, not a rewrite.
- **Qdrant Cloud free tier** for vectors (a previous free cluster had been reclaimed — taking its vectors with it, which is exactly why `snapshot.py` exists).
- **GPU rented for ~12 h, for embedding only.** ImageBind‑Huge is 4.5 GB and GPU‑hungry; it can't run on a free web host. So the GPU box is a disposable *embedding factory* — it bulk‑embeds to Qdrant + B2, then it's released. Serving runs the model on CPU locally.

The takeaway: vectors live in Qdrant Cloud, media in B2, a backup in B2 — none of it depends on the ephemeral GPU box surviving.

---

## 7. Engineering problems solved

Real issues hit while bringing this up, and how they were fixed — these are the interesting bits:

- **Qdrant client/server drift.** `qdrant-client 1.7` couldn't parse the current Qdrant Cloud server's response (new fields), and `.search()` was removed in 1.16. → pinned `>=1.12` and moved to `query_points()`.
- **ImageBind on Python 3.12 without pytorchvideo.** `pytorchvideo` is painful to install on modern torch/3.12. Video is instead embedded by sampling frames with ffmpeg and mean‑pooling their vision embeddings (same shared space). A tiny shim satisfies ImageBind's import without the real package.
- **Audio clip sampler.** ImageBind's audio path *does* need `ConstantClipsPerVideoSampler`; a reimplemented version had to **reset its clip index between files**, or files after the first in a batch got out‑of‑bounds, zero‑sample clips (kaldi fbank crash).
- **`setuptools ≥ 81` removed `pkg_resources`,** which ImageBind imports → pinned `<81`.
- **The modality gap.** A raw text→top‑k search returns almost all text (same‑modality vectors cluster tighter). Fixed with **balanced per‑modality retrieval**.
- **Presigned‑URL expiry.** Storing presigned URLs in payload means they expire; we store **object keys** and presign at query time instead.
- **CORS + S3 ACLs.** `allow_origins="*"` with credentials is rejected by browsers (fixed); modern buckets reject `ACL=private` (dropped — private buckets are private by default).

---

## 8. Rebuilding the index

On a CUDA GPU box (Python 3.10–3.12):

```bash
# deps
pip install torch torchvision torchaudio "numpy<2" soundfile timm ftfy regex einops iopath \
            qdrant-client boto3 pillow "setuptools<81"
pip install -e /path/to/ImageBind --no-deps      # + copy its bpe/ next to where you run

# env: B2 + Qdrant Cloud creds in .env, MODEL_DEVICE=cuda:0
python scripts/qdrant/create_collection.py
python scripts/demo_dataset/fetch_aligned.py --pixabay-key YOUR_KEY   # or keyless Wikimedia
python scripts/demo_dataset/build_index.py        # embed → B2 + Qdrant (idempotent, resumable)
python scripts/qdrant/snapshot.py                 # back the vectors up to B2

# restore later, anywhere:
python scripts/qdrant/restore.py                  # pulls latest snapshot from B2 → Qdrant
```

---

## 9. What's next

- Verify the full local app (frontend ↔ backend) end‑to‑end and record a demo.
- Optional: warm a small GPU endpoint for snappy hosted query embedding.
- Grow the aligned audio set beyond ESC‑50 if a larger keyless labelled source is found.
