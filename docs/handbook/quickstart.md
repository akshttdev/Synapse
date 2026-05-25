# Quickstart

Get Synapse running locally in ~60 seconds. You'll have a working multimodal vector search stack — backend, workers, Qdrant, Postgres, Redis — bound to `http://localhost:8000`.

## Prerequisites

- Docker Desktop or `docker` + `docker compose` v2
- ~3 GB free disk for images
- A GPU is *not* required — embedding workers fall back to CPU (slower but functional)

## Bring it up

```bash
git clone https://github.com/akshttdev/synapse.git
cd synapse
cp .env.example .env
docker compose up -d
```

The first boot pulls images and downloads the ImageBind weights (~3 GB). Subsequent boots are seconds.

Check everything is healthy:

```bash
docker compose ps
curl http://localhost:8000/health
# { "status": "ok", "qdrant": "ok", "redis": "ok", "db": "ok" }
```

## Index your first item

```bash
curl -X POST http://localhost:8000/v1/ingest \
  -F "file=@./sample.jpg" \
  -F 'metadata={"tag":"sample"}'
```

Response:

```json
{ "id": "01HXYZ...", "modality": "image", "queued": true }
```

The worker embeds the asset asynchronously. Poll `/v1/items/{id}` until `status: "indexed"`.

## Query it back

Same shape works for any modality — image, audio, video, or text:

```bash
curl -X POST http://localhost:8000/v1/search \
  -H "content-type: application/json" \
  -d '{ "text": "a sunny garden", "k": 10 }'
```

You get back results across *every* modality, ranked by cosine distance in the shared 1024-D space.

## Next

- [API Reference](./api-reference.md) — every endpoint, every knob
- [Deploy Guide](./deploy.md) — production checklist
- [Cookbook](./cookbook.md) — recipes for common patterns
