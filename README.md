# Synapse

**One 1024-dimensional embedding space for image, audio, video, and text. Search anything with anything.**

Synapse is a self-hostable multimodal vector search stack. You drop in any asset — a photo, a 30-second clip, a paragraph — and Synapse embeds it into a shared 1024-D space using ImageBind, indexes it with Qdrant (HNSW + int8 quantization), and serves cross-modal nearest-neighbor queries at ~30ms P50.

Query with a photo, get back audio. Query with text, get back video. The geometry handles it.

[Handbook →](./docs/handbook)

---

## Why Synapse

Most vector search stacks are unimodal — text-only, or image-only, or a custom multi-tower setup glued together. The minute a product needs to mix modalities, the team ends up with one index per modality, separate query paths, and a bolt-on fusion layer that's slow and brittle.

Synapse takes a different bet: **one model, one space, one index**. ImageBind projects every modality into the same 1024-D sphere, so a cosine similarity in that space is meaningful regardless of what's on either end of the comparison. The infrastructure shrinks to one query path. Ranking, filtering, and reranking work uniformly.

Tradeoff: you commit to ImageBind's latent geometry. If your domain needs a domain-specific encoder, swap it at the collection level — Synapse is pluggable on the encoder side.

---

## How it works

```
┌──────────┐    ┌───────────────┐    ┌─────────────┐    ┌────────────┐    ┌──────────┐
│  CLIENT  │───▶│  FastAPI /v1  │───▶│   Celery    │───▶│ ImageBind  │───▶│  Qdrant  │
│ ANY MODE │    │  ingest · srch│    │  workers    │    │   1024-D   │    │ HNSW·int8│
└──────────┘    └───────┬───────┘    └─────────────┘    └────────────┘    └─────┬────┘
                        │                                                       │
                        │              ┌─────────────┐                          │
                        │              │   Postgres  │  ← metadata, auth        │
                        │              │   Redis     │  ← broker, cache         │
                        │              │   MinIO/S3  │  ← raw assets            │
                        │              └─────────────┘                          │
                        └───────────────────────────────────────────────────────┘
                                       k-NN results streamed back (SSE)
```

The interesting bit is the **shared space**: every asset gets one 1024-D vector regardless of modality, normalized to a unit sphere. A query is also a vector. Search is `cosine(query, candidate)` against the HNSW index, with optional metadata filters pushed into Qdrant's payload index *before* the ANN scan.

---

## What's in the box

- **`backend/`** — FastAPI service. REST + SSE on port 8000. Auth, ingest, search, collections, streams.
- **`workers/`** — Celery workers. Embedding jobs, async indexing, batch ingest.
- **`frontend/`** — Next.js app. Landing page + dashboard (`/dashboard/search`, `/dashboard/upload`).
- **`docs/handbook/`** — Quickstart, API Reference, Deploy Guide, Cookbook.
- **`docker-compose.yml`** — One-shot dev + prod stack: backend, workers, Qdrant, Postgres, Redis, MinIO (optional).

---

## Quick start

```bash
git clone https://github.com/akshttdev/synapse.git
cd synapse
cp .env.example .env
docker compose up -d
```

First boot pulls images and downloads the ImageBind weights (~3 GB). Then:

```bash
# Ingest something
curl -X POST http://localhost:8000/v1/ingest \
  -F "file=@./sample.jpg" \
  -F 'metadata={"tag":"sample"}'

# Query across all modalities
curl -X POST http://localhost:8000/v1/search \
  -H "content-type: application/json" \
  -d '{ "text": "a sunny garden", "k": 10 }'
```

Full walkthrough in [`docs/handbook/quickstart.md`](./docs/handbook/quickstart.md).

---

## More API examples

**Cross-modal: query with audio, get back images.**
```bash
curl -X POST http://localhost:8000/v1/search \
  -F "audio=@./bird-call.wav" \
  -F 'filter={"modality":"image"}' \
  -F 'k=20'
```

**Hybrid: vector + metadata.**
```json
{
  "text": "calm electronic music",
  "k": 25,
  "filter": {
    "modality": "audio",
    "metadata.bpm": { "lte": 110 },
    "metadata.tag": { "any": ["ambient", "lofi"] }
  }
}
```

**MMR rerank** — trade some similarity for diversity:
```json
{ "text": "vintage cameras", "k": 30, "rerank": "mmr", "rerank_lambda": 0.3 }
```

**Streaming ingest events** via SSE at `/v1/stream`:
```
event: indexed
data: { "id": "01HXYZ...", "modality": "image", "ms": 38 }
```

---

## Stack

| Layer | Tech |
|---|---|
| Embedding | **ImageBind** — shared 1024-D space across image / audio / video / text |
| Vector index | **Qdrant** — HNSW (M=16, ef=128) + int8 quantization |
| API | **FastAPI** — REST + SSE, OpenAPI 3.1 at `/v1/openapi.json` |
| Workers | **Celery** + **Redis** broker |
| Metadata | **Postgres** |
| Storage | **MinIO** (dev) / S3 / GCS / R2 (prod) |
| Frontend | **Next.js 16** + **Tailwind v4** + **GSAP** + **Lenis** |
| Deploy | **Docker Compose** — single-node or sharded; Terraform refs for AWS + GCP |

---

## Configuration

All config is via `.env`. The interesting knobs:

| Variable | Default | Purpose |
|---|---|---|
| `SYNAPSE_AUTH` | `open` | `required` to enforce bearer tokens on every request |
| `SYNAPSE_RATE_LIMIT` | `none` | e.g. `100/min` to enable token-bucket rate limiting |
| `QDRANT_NODES` | `qdrant:6333` | comma-separated list for sharded deploys |
| `WORKER_REPLICAS` | `4` | Celery worker process count |
| `EMBED_MODEL` | `imagebind/huge` | encoder used; pluggable |
| `EMBED_BATCH` | `32` | embedding batch size per worker tick |
| `QUANTIZATION` | `int8` | `int8` (4× RAM win, ~0.98 recall) or `none` |
| `MAX_UPLOAD_MB` | `128` | rejected above this |
| `S3_BUCKET` | `synapse-assets` | object store for raw files |

Full reference in [`docs/handbook/deploy.md`](./docs/handbook/deploy.md).

---

## Handbook

The product handbook lives in [`docs/handbook/`](./docs/handbook):

- [**Quickstart**](./docs/handbook/quickstart.md) — get running in ~60 seconds
- [**API Reference**](./docs/handbook/api-reference.md) — every endpoint, every knob
- [**Deploy Guide**](./docs/handbook/deploy.md) — self-host, cloud, hybrid
- [**Cookbook**](./docs/handbook/cookbook.md) — reverse image search, hybrid filters, streaming ingest, MMR rerank

---

## Performance

Benchmarked on a single-node deployment with 1M vectors at 1024-D, int8 quantized, on a modest GPU box:

| Metric | Value |
|---|---|
| P50 query | ~30 ms |
| P99 query | < 90 ms |
| Index size | ~12 GB RAM / 50M vectors |
| Recall @ 10 (vs float32) | ~0.98 |
| Embedding throughput | 32 items/batch · GPU |
| Cold start (first request) | ~200 ms (model warmup) |

Scale notes:

- **Backend is stateless** — scale on RPS, no session affinity needed.
- **Qdrant** holds ~50M int8 vectors at 1024-D in ~12 GB RAM per node. Shard across nodes for bigger workloads.
- **Workers** are GPU-bound for embedding. Adding GPU nodes scales throughput linearly; upping concurrency on a single GPU does not.
- **Postgres + Redis** are tiny — small instances suffice.

---

## Project layout

```
synapse/
├── backend/              # FastAPI app
│   ├── core/             # config, auth, db, logging
│   ├── api/              # v1 routers (ingest, search, collections, stream)
│   └── services/         # embedding orchestration, qdrant client
├── workers/              # Celery workers
│   ├── celery_app.py     # broker + beat schedule
│   └── tasks/            # embedding_tasks.py, ingest_tasks.py
├── frontend/             # Next.js 16 app
│   ├── app/
│   │   ├── page.tsx            # landing
│   │   └── dashboard/
│   │       ├── search/page.tsx # dashboard search
│   │       └── upload/page.tsx # dashboard upload
│   ├── components/             # sections, motion, icons, ui
│   └── lib/                    # mockData, lenis bridge, burst system
├── docs/
│   └── handbook/         # quickstart, api, deploy, cookbook
└── docker-compose.yml
```

---

## Troubleshooting

**`docker compose up` hangs on the workers service.** First boot downloads ImageBind weights (~3 GB). Tail `docker compose logs -f workers` — you should see `Downloading: 100%`. After the first boot they're cached.

**Queries return 503.** Probably the embedding worker hasn't warmed up yet. Hit `/health` — once it returns `embedder: "ready"`, queries will land.

**HEIC images get rejected at ingest.** ImageBind ships without a HEIC decoder. Convert to jpg/png before upload, or add a preprocessor in front of the ingest endpoint.

**Audio > 30 s gets chunked.** Synapse splits into 10 s windows and stores one vector per window. Search returns the best-scoring window plus a `timestamp` in metadata.

**Recall feels low after int8.** Default is `int8` (~4× RAM win, ~0.98 recall @ 10 vs float32). For higher recall, set `QUANTIZATION=none` — pay the 4× RAM cost.

**Force-pushed history doesn't show on a teammate's clone.** They need `git fetch && git reset --hard origin/main` (or a fresh clone) to pick up rewritten history.

---

## Roadmap

- [ ] First-class video embedding (currently chunk-and-pool)
- [ ] Per-collection model overrides (CLIP, OpenCLIP, custom)
- [ ] Dashboard analytics (query latency, cache hit rate)
- [ ] gRPC alongside REST
- [ ] Terraform modules in `infra/aws` and `infra/gcp`
- [ ] Helm chart for Kubernetes
- [ ] First-party Python + TypeScript SDKs (generated from OpenAPI)

---

## Contributing

PRs welcome. Open an issue first for anything bigger than a small fix or doc tweak. The cookbook ([`docs/handbook/cookbook.md`](./docs/handbook/cookbook.md)) is a great place to add recipes.

Run the dev stack with `docker compose up -d` and the frontend with `cd frontend && npm run dev` for hot reload. Tests: `pytest backend/` and `cd frontend && npm test`.

---

## License

MIT — see [`LICENSE`](./LICENSE).

---

Built by [Akshat Dhami](https://x.com/akshttdev) · [LinkedIn](https://www.linkedin.com/in/akshatdhami/) · [Contact](mailto:akshttt.dev@gmail.com)
