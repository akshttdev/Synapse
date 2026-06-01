# Backend Alive + Demo Dataset Pipeline — Design

> Date: 2026-06-01
> Delta execution spec on top of `SYNAPSE_PLAN.md`. Scope: make the backend serve real
> cross-modal search, populate it with a keyless demo dataset embedded on a rented GPU box,
> and protect the embeddings with an S3-backed Qdrant snapshot/restore.
> Time box: ~10 hours. Operator runs GPU-box commands manually and pastes output back.

## Constraints (hard)

- **GPU box** is an NVIDIA NGC PyTorch/Jupyter container, reachable only by the operator
  pasting commands + output. No direct network/SSH from the build machine. ~50 GB disk.
- **Qdrant Cloud free tier** (~1 GB). INT8-quantized 1024-d vectors → demo scale is trivial.
- **AWS S3 free tier** (~5 GB for 12 months). ALL originals (image/audio/video/text) live
  in S3 → total media budget kept **< ~4 GB**.
- Search-time query embedding **must use the same model (ImageBind)** as indexing. CLIP is a
  different vector space and cannot substitute. → serving backend runs on the GPU box (GPU).

## Architecture

```
GPU BOX (NGC container, CUDA)
  ├─ scripts/demo_dataset/build_index.py   # one-shot bulk loader
  │     download → ImageBind embed (cuda) → S3 PUT (original+thumb/preview) → Qdrant upsert
  └─ uvicorn api.main:app                   # serving API (GPU query embedding)
        exposed via the box's public proxy URL  ──►  consumed by the frontend

QDRANT CLOUD (shared collection `synapse`, 1024 / Cosine / INT8 / modality keyword index)
AWS S3       (originals + thumbnails/previews + backups/qdrant/*.jsonl.gz)
```

No Redis/Celery needed for this session: bulk indexing is a direct script, and the search
path never touches the queue. (The compose worker stays available for the interactive
`/api/v1/index` upload path, but is not on the critical path here.)

## Workstreams

### A. Backend correctness (build machine, verifiable locally)
1. **Qdrant point-ID fix.** `embed_media_task` upserts `PointStruct(id=media_id, …)`. Verify
   where `media_id` is minted; Qdrant only accepts **unsigned int or UUID** ids. If it is a
   bare `sha256[:16]` hex string, every upsert 400s. Fix: derive a stable UUID
   (`uuid.uuid5(NAMESPACE, media_id)`) at upsert time, keep the hex in `payload.media_id`.
2. **Collection bootstrap.** Idempotent `scripts/qdrant/create_collection.py`:
   `VectorParams(1024, COSINE)`, INT8 scalar quant, HNSW m=16/ef_construct=200,
   `modality` keyword payload index. Safe to re-run.
3. **CORS.** Allow the frontend origin(s) (local + deployed) without the `*`+credentials
   invalid combo.
4. **Smoke test.** Index one local sample image end-to-end → assert it appears in search.

### B. Datasets (download on GPU box, keyless)
| Modality | Count | Source | Notes |
|---|---|---|---|
| Image | ~500 | Openverse API (CC, no key) | categories matched to audio/text for cross-modal hits |
| Audio | ~500 | ESC-50 (single zip, keyless) | 5 s, 16 kHz mono |
| Video | ~100–200 | Wikimedia Commons / keyless short clips | ≤15 s, ≤720p |
| Text | ~500 | Wikipedia REST `summary` (keyless) | topics aligned to the above |

Shared category list drives all four so a query in one modality retrieves the others.
Total S3 footprint target **< ~4 GB**.

### C. Bulk embed + load (`scripts/demo_dataset/build_index.py`, runs on box)
- Reuses `core.embeddings`, `core.storage`, `core.qdrant_client` — no dual implementation.
- Per item: `media_id = sha256(bytes)[:16]` → embed on `cuda` → S3 PUT original
  (+ thumb for image/video, + preview for video) → Qdrant upsert (UUID id, rich payload).
- Idempotent (skip if S3 object + Qdrant point exist) and resumable (manifest checkpoint).
- Batched embedding; deletes local originals after S3 PUT to respect the 50 GB disk.

### D. Qdrant ↔ S3 persistence
- `scripts/qdrant/snapshot.py`: scroll **all** points (vectors + payloads) →
  gzipped JSONL → `s3://<bucket>/backups/qdrant/synapse-<UTC>.jsonl.gz` (+ `latest` pointer).
- `scripts/qdrant/restore.py`: download → create collection if missing → batched re-upsert.
- Tier-agnostic (works without native Cloud snapshots); survives cluster reclaim/deletion.

### E. Serving
- Run `uvicorn api.main:app` on the GPU box; confirm `/health/ready` green against Cloud
  Qdrant + S3 and CUDA available.
- Expose via the box's public proxy URL; point the frontend `NEXT_PUBLIC_API_URL` at it.
- Validate the 10 cross-modal demo queries from `SYNAPSE_PLAN.md` §6.4.

## Risks / open items
- Box port exposure mechanism unknown until recon (proxy URL vs needing a tunnel).
- Openverse/Wikimedia result quality variance; may top-up categories that come back thin.
- ImageBind weight download (~4.5 GB) + datasets must fit alongside venv in 50 GB — delete
  originals post-upload; embed in streaming batches.

## Out of scope (this session)
New frontend screens, WS streaming, stats dashboard, deploy automation, CI, tests beyond the
smoke check — all already tracked in `SYNAPSE_PLAN.md` for later.
