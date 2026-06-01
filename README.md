<div align="center">

# Synapse

**Search anything with anything.** One 1024‑dimensional embedding space for **image, audio, video, and text** — query with a photo, get back sounds; query with a word, get back clips. The geometry does the work.

`ImageBind` · `Qdrant` · `FastAPI` · `Next.js` · `Backblaze B2`

</div>

---

## What it is

Most vector search is single‑modality — text‑only or image‑only — and the moment you need to mix modalities you end up with one index per type, separate query paths, and a brittle fusion layer.

Synapse takes one bet: **one model, one space, one index.** [ImageBind](https://github.com/facebookresearch/ImageBind) projects every modality into the *same* 1024‑D unit sphere, so a single cosine similarity is meaningful no matter what's on either end. Type `"dog barking"` and you get the dog photo, the bark recording, the dog clip, and the encyclopedia entry — ranked together, from one query against one collection.

This repo is a **working, end‑to‑end build**: a real cross‑modal index of **5,712 vectors across 293 subjects** (images, audio, video, text), embedded on a GPU, stored in Qdrant Cloud + Backblaze B2, and served by a FastAPI backend behind a Next.js frontend.

---

## How it works

**Serving (a query):**

```
Browser ──POST /api/v1/search (text | image | audio | video)──▶ FastAPI
                                                                  │
                                          embed the query with ImageBind
                                          → one 1024-D vector
                                                                  │
                                  balanced per-modality k-NN ─────┼────▶ Qdrant Cloud
                                  (HNSW + int8, modality filter)  │      (5,712 vectors)
                                                                  ◀──── top-k + payload
                                          presign each item's key │
                                                                  ▼
                                                          Backblaze B2  ──media URLs──▶ Browser grid
```

**Ingestion (one-time, on a GPU):**

```
fetch_aligned.py        download a keyless, cross-modal dataset
        │               (Pixabay images · ESC-50 audio · Wikipedia text · Wikimedia video)
        ▼
build_index.py          embed each item on the GPU (ImageBind, fp16)
        │               → upload original/thumbnail to B2  → upsert vector+payload to Qdrant
        ▼
snapshot.py             scroll every vector → gzipped JSONL → B2 (disaster recovery)
```

The interesting part is the **shared space**: every asset becomes one normalized 1024‑D vector, and so does every query. Search is just `cosine(query, candidate)` over Qdrant's HNSW index, with a `modality` payload index for filtering. Because ImageBind has a mild **modality gap** (same‑modality vectors cluster a little tighter), the default search pulls the best of *each* modality and merges — so the result grid is a true cross‑modal mix, not all text.

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Embeddings | **ImageBind‑Huge** (1024‑D) | one model, six modalities, one shared space — beats stitching CLIP + CLAP |
| Vector DB | **Qdrant Cloud** — HNSW (M=16, ef=200) + **int8** scalar quant | fast ANN, payload filtering, ~4× RAM win at ~0.98 recall |
| Object store | **Backblaze B2** (S3‑compatible) | free 10 GB tier, no card; `boto3` works unchanged via an endpoint URL |
| API | **FastAPI** + Pydantic v2 | async, OpenAPI for free, multipart query (text/image/audio/video) |
| Cache | **Redis** (optional) | caches text‑query responses; degrades gracefully if absent |
| Frontend | **Next.js** + Tailwind | landing + search dashboard |
| Embedding host | **rented GPU** (one‑time) | ImageBind‑Huge is 4.5 GB + GPU‑hungry; used to bulk‑embed, then released |

---

## Run it locally

ImageBind‑Huge (~4.5 GB weights, GPU‑hungry) can't run on a free web host, so Synapse runs **locally** and reads from the same hosted Qdrant + B2.

```bash
git clone https://github.com/akshttdev/synapse.git
cd synapse
cp .env.example .env        # fill B2 keys + Qdrant Cloud URL/key (see comments)
docker compose -f docker-compose.serve.yml up --build
```

That brings up:

- **Backend** on `:8000` (FastAPI + ImageBind on CPU for query embedding) + **Redis** for caching
- **Frontend** on `:3000`

First boot downloads the ImageBind weights once (cached in a volume). Then open **http://localhost:3000** and search.

> The data is already populated in Qdrant Cloud + B2. To rebuild it from scratch on a GPU box, see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#rebuilding-the-index).

---

## API

All endpoints under `/api/v1`. OpenAPI at `http://localhost:8000/docs`.

```bash
# Text → all modalities (balanced cross-modal mix)
curl -X POST http://localhost:8000/api/v1/search -F text="ocean waves" -F top_k=20

# Image → all modalities
curl -X POST http://localhost:8000/api/v1/search -F image_file=@cat.jpg -F top_k=20

# Restrict results to one modality (e.g. only audio)
curl -X POST http://localhost:8000/api/v1/search \
  -F text="thunderstorm" \
  -F 'filters={"must":[{"key":"modality","match":{"value":"audio"}}]}'
```

Returns `{ results: [{ id, score, modality, thumbnail_url, preview_url, metadata }], latency_ms, … }`. Media URLs are short‑lived **presigned B2** links.

---

## Performance & scale (this build)

Measured against the live demo index — honest numbers, not synthetic benchmarks:

| Fact | Value |
|---|---|
| Indexed vectors | **5,712** (≈3,516 image · 1,640 audio · ~556 text · ~120 video) |
| Distinct subjects | **293** |
| Vector dim / metric | 1024 / cosine, int8 quantized |
| Qdrant k‑NN latency | sub‑100 ms (tiny index; HNSW + int8) |
| Dominant query cost | **the ImageBind embed** — fast on GPU, a few seconds on CPU |
| Storage | media in B2 (~5–6 GB), vectors in Qdrant Cloud (well under 1 GB quantized) |

A text query runs **one** embed + **four** filtered Qdrant queries (one per modality) and merges. The backend is stateless and reads from hosted Qdrant + B2, so it scales horizontally; the real bottleneck is GPU availability for embedding.

---

## Design decisions & tradeoffs

- **One shared space, one collection.** ImageBind makes all modalities comparable, so per‑modality collections would only add N query paths and block cross‑modal recall. We use a single Qdrant collection with a `modality` payload index.
- **int8 quantization.** ~4× RAM reduction at ~0.98 recall@10 vs float32 — the right call at this scale.
- **Balanced retrieval over raw top‑k.** Works around ImageBind's modality gap so the grid shows a real mix instead of all text.
- **B2 + Qdrant Cloud, not AWS.** Built under a hard "no credit card / free‑tier only" constraint — both are free and S3/standard‑compatible, so the code is provider‑agnostic via one endpoint variable.
- **GPU for ingest, CPU for serving.** The GPU is rented only to bulk‑embed; serving runs the model on CPU (slower per query, but free and self‑hostable).
- **Snapshot to object storage.** Free‑tier vector clusters can be reclaimed — `snapshot.py`/`restore.py` keep a full vector dump in B2 so the index is always recoverable.
- **pytorchvideo‑free video.** Video is embedded by ffmpeg frame‑sampling + mean‑pooling into the vision space, sidestepping a notoriously fragile dependency on Python 3.12.

---

## Limitations (honest)

- Serving needs the 4.5 GB model locally — there's no free GPU host for it, so this is a **run‑locally / record‑a‑demo** project, not a hosted SaaS.
- CPU query embedding is a few seconds; the snappy version needs a GPU.
- Demo‑scale dataset (thousands, not millions) — chosen to fit free tiers.
- Audio is capped to ESC‑50's 50 sound classes (the only keyless labelled audio source); images/text are far broader.

---

## Project layout

```
synapse/
├── backend/                    # FastAPI app
│   ├── api/                    # routes: search, upload, media, stats, health
│   ├── core/                   # config, embeddings (ImageBind), qdrant, storage (S3/B2), cache, metrics
│   └── services/               # search_service (balanced cross-modal), upload_service
├── scripts/
│   ├── demo_dataset/           # fetch_aligned.py (dataset) + build_index.py (GPU embed → B2 + Qdrant)
│   └── qdrant/                 # create_collection.py · snapshot.py · restore.py
├── frontend/                   # Next.js app (landing + search)
├── docker-compose.serve.yml    # local serving stack (backend + redis + frontend)
└── docs/ARCHITECTURE.md        # deep dive
```

---

## License & credits

MIT — see [`LICENSE`](LICENSE). ImageBind © Meta AI (CC‑BY‑NC 4.0 weights, research/demo use). ESC‑50 © Karol Piczak (CC BY‑NC). Images via Pixabay & Wikimedia Commons; text via Wikipedia.

Built by [Akshat Dhami](https://x.com/akshttdev) · [LinkedIn](https://www.linkedin.com/in/akshatdhami/) · [Contact](mailto:akshttt.dev@gmail.com)
