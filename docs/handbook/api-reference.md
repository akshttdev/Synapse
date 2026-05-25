# API Reference

Synapse exposes a versioned REST API at `/v1`. All responses are JSON. Streaming endpoints use SSE.

## Base

```
http://localhost:8000/v1
```

## Auth

Bearer token in `Authorization`. Tokens are issued from `/v1/tokens` or via the dashboard. Self-host deployments default to open access — flip `SYNAPSE_AUTH=required` in `.env` to enforce.

```
Authorization: Bearer sk_live_...
```

## Endpoints

### POST /v1/ingest

Upload an asset. The worker queues it for embedding.

| Field | Type | Notes |
| --- | --- | --- |
| `file` | binary | image/audio/video/text |
| `metadata` | json | arbitrary, indexed for filtering |
| `collection` | string | default: `default` |

Returns `{ id, modality, queued }`.

### POST /v1/search

Run a query.

```json
{
  "text": "a thunderstorm at night",
  "k": 50,
  "filter": { "modality": ["audio", "video"] },
  "rerank": "mmr"
}
```

`text`, `image`, `audio`, `video` are all valid query keys — exactly one required.

### GET /v1/items/{id}

Inspect a single item. Returns embedding status, metadata, and the raw vector if `?include=vector`.

### DELETE /v1/items/{id}

Remove from index. The underlying asset in object storage is *not* touched.

### POST /v1/collections

Create a collection with its own index config.

```json
{
  "name": "product-catalog",
  "metric": "cosine",
  "dim": 1024,
  "quantization": "int8"
}
```

### GET /v1/stream

SSE stream of indexing events — useful for dashboards.

```
event: indexed
data: { "id": "01HXYZ...", "modality": "image", "ms": 38 }
```

## Errors

Standard problem+json shape:

```json
{
  "type": "/errors/invalid-modality",
  "title": "Unsupported modality",
  "status": 400,
  "detail": "file is image/heic — convert to jpg or png first"
}
```

## OpenAPI

The full schema lives at `/v1/openapi.json`. Generate typed clients with `openapi-generator` or `openapi-typescript`.
