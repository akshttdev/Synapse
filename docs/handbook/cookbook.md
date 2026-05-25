# Cookbook

Practical recipes for building on Synapse. Each one is a self-contained pattern you can lift into your own service.

## Reverse image search

Upload an image, get back visually similar images, plus related audio/video/text.

```python
import requests

with open("query.jpg", "rb") as f:
    r = requests.post(
        "http://localhost:8000/v1/search",
        files={"image": f},
        data={"k": 20, "filter": '{"modality": ["image"]}'},
    )

for hit in r.json()["hits"]:
    print(f"{hit['score']:.3f}  {hit['metadata']['title']}")
```

Drop the `filter` to get cross-modal hits — image query → audio, video, text results.

## Hybrid: vector + metadata

Combine semantic similarity with structured filters. Synapse pushes the filter into Qdrant's payload index *before* the ANN scan, so it stays fast.

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

## Streaming ingest

Push a folder, watch the SSE stream for indexed events.

```python
from pathlib import Path
import requests, sseclient

# Fire-and-forget upload
for p in Path("./assets").glob("*"):
    with p.open("rb") as f:
        requests.post(
            "http://localhost:8000/v1/ingest",
            files={"file": f},
            data={"metadata": '{"source": "batch-1"}'},
        )

# Listen for completion
client = sseclient.SSEClient("http://localhost:8000/v1/stream")
for event in client:
    if event.event == "indexed":
        print(event.data)
```

## MMR reranking

Cosine similarity rewards near-duplicates. Maximum Marginal Relevance trades a bit of similarity for diversity.

```json
{
  "text": "vintage cameras",
  "k": 30,
  "rerank": "mmr",
  "rerank_lambda": 0.3
}
```

`lambda=0` → max diversity. `lambda=1` → pure cosine (no rerank).

## Gotchas

- **HEIC images** — convert to jpg/png before upload, ImageBind doesn't ship a HEIC decoder
- **Audio > 30s** — Synapse chunks it into 10s windows and stores one vector per window. Search returns the best-scoring window plus a `timestamp` in metadata.
- **Text > 1024 tokens** — same idea, chunked. Use `chunking: "sentence"` to chunk at boundaries instead of fixed length.
- **Quantization vs recall** — int8 is the default. Recall@10 ≈ 0.98 vs float32. If you need higher, set `quantization: "none"` and pay the 4× RAM cost.

## More

The full recipe collection lives in [`recipes/`](../recipes/). PRs welcome.
