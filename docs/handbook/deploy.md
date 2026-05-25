# Deploy Guide

Synapse ships as a docker-compose stack out of the box. This guide covers single-node, sharded, and cloud-managed setups, plus the production checklist.

## Single node

The default `docker-compose.yml` is production-shaped — bring up everything on one host:

```bash
docker compose up -d
```

Components:

- **backend** — FastAPI, port 8000
- **workers** — Celery, 4 procs by default
- **qdrant** — vector index, port 6333
- **postgres** — metadata + auth
- **redis** — task broker
- **minio** (optional) — S3-compatible asset store

Scale horizontally by setting `WORKER_REPLICAS` and re-running `up -d`.

## Sharded

For >50M vectors per collection, point at a managed Qdrant cluster or run multiple Qdrant nodes:

```yaml
# docker-compose.override.yml
services:
  qdrant-1: { image: qdrant/qdrant, ... }
  qdrant-2: { image: qdrant/qdrant, ... }
```

Set `QDRANT_NODES=qdrant-1:6333,qdrant-2:6333` in `.env`. Synapse hashes vector IDs across nodes; queries fan out and merge.

## Cloud

### AWS

- Push images to ECR
- Run backend + workers on ECS Fargate
- Use RDS Postgres + ElastiCache Redis
- Qdrant Cloud or self-host on EKS

### GCP

- Cloud Run for backend + workers
- Cloud SQL Postgres + Memorystore Redis
- Qdrant Cloud or self-host on GKE

A reference Terraform module ships in `infra/aws` and `infra/gcp`.

## Production checklist

- [ ] Set `SYNAPSE_AUTH=required` and rotate tokens
- [ ] Configure object storage (S3 / GCS / R2) for raw assets
- [ ] Schedule Qdrant snapshots to S3 — `qdrant-snapshot` cronjob
- [ ] Wire metrics — Prometheus scrape at `/metrics`
- [ ] Wire logs — JSON to stdout, ship via Vector / Fluentbit
- [ ] Set worker concurrency to `cpu_count - 1` per node
- [ ] Enable rate limit middleware — `SYNAPSE_RATE_LIMIT=100/min`
- [ ] Front with a reverse proxy that terminates TLS (Caddy, nginx, Traefik)

## Scaling notes

- A single Qdrant node holds ~50M int8 vectors at 1024-D in ~12 GB RAM
- Backend is stateless — scale on RPS
- Workers are GPU-bound for embedding — scale by adding GPU nodes, not by upping concurrency
- Postgres is metadata-only — small instance is fine
