#!/usr/bin/env python3
"""
Stress / latency benchmark for the Synapse search API (text queries).

Measures cold-query latency percentiles (p50/p95/p99), the server-reported
embed vs vector-search split, and the Redis cache speedup on repeat queries.
Pure stdlib — runs with the system python3.

    python scripts/bench.py                       # defaults to localhost:8000
    python scripts/bench.py --api http://localhost:8000 --rounds 3
"""
from __future__ import annotations

import argparse
import json
import statistics
import time
import urllib.request

QUERIES = [
    "thunderstorm", "ocean waves", "a red sports car", "dog barking",
    "guitar solo", "fireworks at night", "snowy mountain", "city traffic",
    "rain on a window", "campfire crackling", "a cat meowing", "train station",
    "helicopter flying", "church bells", "laughing children", "broken glass",
    "sunflower field", "pizza", "waterfall", "airplane taking off",
]


def encode_multipart(fields: dict) -> tuple[str, bytes]:
    boundary = "----synapse-bench-boundary"
    parts = []
    for k, v in fields.items():
        parts.append(f"--{boundary}")
        parts.append(f'Content-Disposition: form-data; name="{k}"')
        parts.append("")
        parts.append(str(v))
    parts.append(f"--{boundary}--")
    parts.append("")
    return boundary, "\r\n".join(parts).encode()


def search(api: str, text: str, top_k: int) -> tuple[float, dict]:
    boundary, body = encode_multipart({"text": text, "top_k": top_k})
    req = urllib.request.Request(
        f"{api}/api/v1/search",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    t0 = time.perf_counter()
    with urllib.request.urlopen(req, timeout=120) as r:
        payload = json.loads(r.read().decode())
    wall_ms = (time.perf_counter() - t0) * 1000
    return wall_ms, payload


def pct(xs: list[float], p: float) -> float:
    xs = sorted(xs)
    return xs[min(len(xs) - 1, int(len(xs) * p))]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--api", default="http://localhost:8000")
    ap.add_argument("--top-k", type=int, default=40)
    ap.add_argument("--rounds", type=int, default=2, help="passes over the query set")
    args = ap.parse_args()

    print(f"warming up {args.api} …")
    search(args.api, "warmup query", args.top_k)

    wall, embed, vsearch, total = [], [], [], []
    print(f"\nrunning {args.rounds} round(s) × {len(QUERIES)} distinct queries (cold)…")
    for _ in range(args.rounds):
        for q in QUERIES:
            w, p = search(args.api, q, args.top_k)
            wall.append(w)
            total.append(p.get("latency_ms", 0))
            m = p.get("metrics") or {}
            embed.append(m.get("embedding_ms", 0))
            vsearch.append(m.get("search_ms", 0))
            print(f"  {w:7.0f} ms  ·  {len(p.get('results', []))} results  ·  {q}")

    # Cache test: same query 5×; first = miss, rest = Redis hits.
    print("\ncache test (same query × 5)…")
    cache = [search(args.api, "ocean waves at sunset", args.top_k)[0] for _ in range(5)]

    def row(name, xs):
        print(f"  {name:14} n={len(xs):3}  mean={statistics.mean(xs):7.0f}  "
              f"p50={pct(xs,0.5):7.0f}  p95={pct(xs,0.95):7.0f}  p99={pct(xs,0.99):7.0f}  (ms)")

    print("\n================ RESULTS ================")
    row("wall (e2e)", wall)
    row("server total", total)
    row("  embed", embed)
    row("  vec search", vsearch)
    print(f"\n  cache MISS (1st): {cache[0]:.0f} ms   cache HIT (2-5 avg): "
          f"{statistics.mean(cache[1:]):.0f} ms   "
          f"speedup: {cache[0]/max(statistics.mean(cache[1:]),1):.1f}x")
    print(f"  throughput (sequential): {1000/statistics.mean(wall):.2f} req/s")
    print("=========================================")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
