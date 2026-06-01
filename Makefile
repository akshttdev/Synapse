.PHONY: help up down build rebuild logs ps shell-backend shell-worker shell-redis shell-qdrant clean nuke health demo snapshot ingest ingest-dry stats activity samples dataset

COMPOSE ?= docker compose
# Apple's /usr/bin/python3 has httpx + works; brew's 3.14 has a broken pyexpat
# on this machine. Override with PYTHON=... if you have a venv.
PYTHON ?= /usr/bin/python3

help:
	@echo "make up          start full stack"
	@echo "make down        stop stack (keep volumes)"
	@echo "make build       build all images"
	@echo "make rebuild     build without cache"
	@echo "make logs        tail backend + worker logs"
	@echo "make ps          show running services"
	@echo "make health      hit /health/ready"
	@echo "make shell-*     open shell into a container"
	@echo "make clean       stop + remove volumes"
	@echo "make nuke        clean + remove built images"
	@echo "make demo        download + index demo dataset (run after stack is up)"
	@echo "make snapshot    build static demo bank for frontend"
	@echo "make samples             tiny test set (~30 MB) into data/samples/"
	@echo "make dataset             full dataset (~2-3 GB) into data/dataset/"
	@echo "make ingest SRC=...      ingest a file or folder via scripts/ingest.py"
	@echo "make ingest-dry SRC=...  list what would be ingested, don't upload"
	@echo "make stats               curl /api/v1/stats"
	@echo "make activity            curl /api/v1/stats/activity"

up:
	$(COMPOSE) up -d --build
	@echo "Backend  → http://localhost:8000"
	@echo "Frontend → http://localhost:3000"
	@echo "Qdrant   → http://localhost:6333/dashboard"

down:
	$(COMPOSE) down

build:
	$(COMPOSE) build

rebuild:
	$(COMPOSE) build --no-cache

logs:
	$(COMPOSE) logs -f backend worker

ps:
	$(COMPOSE) ps

health:
	@curl -fsS http://localhost:8000/health/ready | $(PYTHON) -m json.tool || echo "backend not ready"

shell-backend:
	$(COMPOSE) exec backend bash

shell-worker:
	$(COMPOSE) exec worker bash

shell-redis:
	$(COMPOSE) exec redis redis-cli

shell-qdrant:
	$(COMPOSE) exec qdrant bash

clean:
	$(COMPOSE) down -v

nuke:
	$(COMPOSE) down -v --rmi local

demo:
	@echo "todo: scripts/demo_dataset/download.py && index.py (task #19)"

snapshot:
	@echo "todo: scripts/build_demo_bank.py (task #28)"

# Fetch a starter set of public-domain media (~80 MB) into data/samples/.
# Audio is generated locally; everything else is downloaded.
samples:
	@$(PYTHON) scripts/fetch_samples.py

# Fetch a real cross-modal dataset (~2-3 GB) into data/dataset/.
# Default: 2000 images + 2000 text + 13 videos + 2000 ESC-50 audio clips.
# Override per-modality counts:
#   make dataset IMAGES=5000 TEXT=10000 VIDEO=0 AUDIO=2000
IMAGES ?=
TEXT ?=
VIDEO ?=
AUDIO ?=
dataset:
	@$(PYTHON) scripts/fetch_dataset.py \
		$(if $(IMAGES),--images $(IMAGES)) \
		$(if $(TEXT),--text $(TEXT)) \
		$(if $(VIDEO),--video $(VIDEO)) \
		$(if $(AUDIO),--audio $(AUDIO))

# Ingest a file or folder. Auto-detects modality and posts to /api/v1/upload.
#   make ingest SRC=~/Pictures/dataset
#   make ingest SRC=./song.mp3 TAG=research-2026 CONCURRENCY=6
# Note: use SRC, not PATH — PATH would shadow the shell's $PATH and break python3.
SRC ?=
TAG ?=
COLLECTION ?=
CONCURRENCY ?= 4
ingest:
	@test -n "$(SRC)" || (echo 'usage: make ingest SRC=/path/to/data [TAG=...] [COLLECTION=...] [CONCURRENCY=N]'; exit 1)
	@$(PYTHON) scripts/ingest.py "$(SRC)" \
		--concurrency $(CONCURRENCY) \
		$(if $(TAG),--tag "$(TAG)") \
		$(if $(COLLECTION),--collection "$(COLLECTION)") \
		--skip-existing

ingest-dry:
	@test -n "$(SRC)" || (echo 'usage: make ingest-dry SRC=/path/to/data'; exit 1)
	@$(PYTHON) scripts/ingest.py "$(SRC)" --dry-run

stats:
	@curl -fsS http://localhost:8000/api/v1/stats | $(PYTHON) -m json.tool || echo "backend not reachable"

activity:
	@curl -fsS http://localhost:8000/api/v1/stats/activity | $(PYTHON) -m json.tool || echo "backend not reachable"
