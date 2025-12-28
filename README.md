[![CI](https://github.com/manikumarpokala/nivoxai/actions/workflows/ci.yml/badge.svg)](https://github.com/manikumarpokala/nivoxai/actions/workflows/ci.yml)

# NivoxAI

## What this is
NivoxAI is a production-style Influmatch demo: influencer ranking + agentic strategy + RAG + analytics with safety controls, observability, and CI quality gates.

Deployed demo (placeholder): https://<your-demo-url>

## 2-minute reviewer path
1) Open `/demo`
2) Complete Step 1–4
3) Use Diagnostics to inspect `x-request-id` and error schema
4) Review `/qa/agent` (trace), `/qa/rag` (freshness/provenance), `/qa/admin` (guardrails)

## Demo Admin Key (demo-only, non-production)
`DEMO_ADMIN_KEY=DEMO_ONLY_READ_ACCESS_2025`

Used only for protected demo admin actions (guardrails). Never use in production.

## Admin Guardrails (how to verify)
- Go to `/qa/admin`
- Paste the demo key into the input
- Click “Verify admin access”
- The UI sends `GET /api/admin/ping` with header `x-demo-admin-key: <key>`

## JD-aligned highlights
- Recommendation/ranking + explainability
- Agentic AI with tools + safety + fallbacks + trace
- RAG: freshness, provenance, tenant isolation
- Observability: request IDs + diagnostics
- CI quality gates: tests + redteam + smoke

## Run locally
1) `docker compose up -d --build`
2) Open `http://localhost:3000/demo`

## Quality checks
- `make redteam`
- `bash scripts/ci_smoke.sh`

## CI notes (public demo-safe)
- CI runs in demo-safe mode with stubbed keys and `DEMO_MODE=true`.
- Image push is skipped unless `GHCR_PUSH=true` is configured in GitHub secrets.
- Smoke tests are executed from repo root: `bash scripts/ci_smoke.sh`.

Author: Manikumar Pokala
Contact: manikumarp183@gmail.com

Architecture (high level)

Frontend (Next.js) → backend-api (Express) → backend-ai (FastAPI)
                          ↘ Postgres (events, analytics, campaigns)

Architecture diagram (ASCII)

Browser
  └─ Next.js UI (/demo, /qa/*)
        ├─ backend-api (Express) ── Postgres
        └─ backend-ai (FastAPI) ── RAG + Agents

UI Auth & Diagnostics

- Demo sessions bootstrap automatically from `/demo` and persist via cookies.
- Admin guardrails require the demo key (see `/qa/admin`).
- Diagnostics drawer shows the last 20 requests with request IDs and status codes.
- If you see 401/403, reset the demo session from the header and retry.

What to look at

- Agentic flow: backend-ai/app/agents/runner.py
- RAG pipeline: backend-ai/app/services/rag.py
- Recommendation scoring: backend-ai/app/services/recommender.py
- Multi-tenancy design: docs/SECURITY_MULTI_TENANCY.md
- Safety controls: docs/SAFETY.md
- Hiring packet: docs/HIRING_PACKET.md
- CI quality gates: .github/workflows/ci.yml
- Evaluation scripts: eval/run_ranking_eval.py, eval/run_rag_eval.py, eval/save_results.py

1. Executive Summary (Why This Exists)

NivoxAI is a production-oriented AI system designed to solve the same problem space as Influmatch:
intelligently matching brand requirements with the most suitable KOLs (influencers), and autonomously generating campaign strategies using recommendation systems, RAG pipelines, and agentic LLMs.

This repository demonstrates enterprise-style AI engineering, including:

Ranking & recommendation models

Agentic LLM workflows with tool-calling

Retrieval-Augmented Generation (RAG) systems

API & frontend integration

Dockerized, multi-service deployment

Analytics & feedback loops for continuous improvement

Goal: Prove end-to-end AI system ownership, not just model development.

2. Architecture Overview (Influmatch-Aligned)
High-Level Flow
Brand Campaign Request
        ↓
Recommendation Engine (Heuristics + ML Ranking)
        ↓
RAG Influencer Discovery (Vector + Metadata Search)
        ↓
LLM Strategy Agent (Tool-Calling + Reasoning)
        ↓
Dashboard / API Response
        ↓
Event + Recommendation Logging (Feedback Loop)

Services
Service	Responsibility
backend-ai	AI logic: recommendation models, RAG search, LLM agent
backend-api	Public API gateway (Node.js + TypeScript)
frontend	Campaign & analytics dashboard (Next.js)
postgres	Events, recommendation logs, analytics data

All services are fully Dockerized and orchestrated via docker-compose.

3. Core AI Capabilities
3.1 Recommendation & Ranking Engine

Hybrid scoring:

Rule-based heuristics (category, region, age fit)

ML model baseline (Logistic Regression)

Feature engineering:

Engagement rate

Audience alignment

Brand compatibility signals

Explainability:

Individual reasons logged per recommendation

Extensible to:

Embedding-based neural ranking

Learning-to-Rank models

📌 Production intent: The system is structured so models can be retrained and versioned without breaking APIs.

3.2 RAG Influencer Discovery Pipeline

Hybrid influencer search (vector + keyword)

Designed for:

Multi-tenant brand data

Governance and visibility filtering

Supports:

- Vector similarity + keyword (BM25-ish) scoring with weighted fusion
- Optional LLM reranking on top candidates (falls back if unavailable)
- Configurable search mode, candidate pool size, and weights

3.3 Agentic LLM Strategy System

LLM-powered campaign strategy generation

Uses tool-calling to:

Inspect ranking results

Reference influencer metadata

Designed as an agent loop:

Understand campaign

Query recommendation system

Reason over results

Generate explainable strategy

📌 Structured for future expansion:

Memory (short-term / long-term)

Critique & self-review loop

Safety fallbacks and retries

4. Analytics & Feedback Loop

The system logs:

User & campaign events

Recommendation outputs

AI explanation metadata

These logs enable:

Model performance evaluation

Retraining triggers

Offline experimentation

Schema examples:

app_events

recommendation_logs

5. Technology Stack

AI / ML

Python, FastAPI

Scikit-learn, NumPy, Pandas

OpenAI API (LLMs)

RAG architecture (vector-based)

Backend

Node.js, TypeScript, Express

REST APIs

Frontend

Next.js, React, TailwindCSS

Infrastructure

Docker, Docker Compose

PostgreSQL 16

Deployment guide: docs/DEPLOYMENT_AWS.md

6. Local Setup & Execution

macOS (Docker Desktop, no sudo)

1) Install Docker Desktop: https://www.docker.com/products/docker-desktop
2) Start Docker Desktop (whale icon in menu bar)
3) Run:
   docker compose up -d --build

Linux (Ubuntu)

1) Install Docker Engine (https://docs.docker.com/engine/install/ubuntu/)
2) Add your user to the docker group:
   sudo usermod -aG docker $USER
3) Log out and back in
4) Run:
   docker compose up -d --build

Optional helper scripts:
./scripts/dev-up.sh
./scripts/dev-down.sh

If the UI shows “fetch failed”, rebuild with `CORS_ORIGINS=http://localhost:3000` set for backend services.

Backend API build (local):
cd backend-api
npm ci
npm run build

Health Endpoints

Frontend: http://localhost:3000

API: http://localhost:4000/health

AI: http://localhost:8000/health

AI Healthz: http://localhost:8000/healthz

AI Model Status: http://localhost:8000/v1/model/status

Smoke check:
cd backend-ai
./scripts/healthz-smoke.sh

Metrics:
curl http://localhost:8000/metrics

Seed analytics demo data:
make db-seed

Verification

docker compose up -d --build
make test
make demo

Troubleshooting

- View logs: docker compose logs -f backend-ai backend-api
- Reset DB: docker compose down -v && docker compose up -d --build
- Release checklist: docs/RELEASE_CHECKLIST.md

7. Key Endpoints
Capability	Endpoint
Recommendation	POST /recommend
RAG Search	POST /rag/influencers
Strategy Agent	POST /chat-strategy
Health	/health
Analytics summary	GET /v1/analytics/summary?window=24h|7d|30d
Analytics campaign	GET /v1/analytics/campaign/:id
Analytics event	POST /v1/analytics/event

RAG Search parameters

- mode: vector | keyword | hybrid (default: hybrid)
- rerank: true | false (default: false)
- top_k: final results count
- candidate_k: candidate pool size before rerank

RAG tuning (env vars)

- RAG_DEFAULT_MODE (default: hybrid)
- RAG_VECTOR_WEIGHT (default: 0.6)
- RAG_KEYWORD_WEIGHT (default: 0.4)
- RAG_RERANK_MODE (default: none or llm)
- RAG_RERANK_MODEL (default: gpt-4o-mini)
- RAG_RERANK_TIMEOUT_S (default: 8)

Freshness-aware ranking

- Influencer profiles include source, last_crawled_at, stats_updated_at.
- Ranking applies a decay multiplier when stats are stale.
- Ingestion updates stats daily and refreshes embeddings (in-memory by default).

Ingestion controls (env vars)

- INGESTION_ENABLED (default: true)
- INGESTION_CSV_PATH (optional, CSV file to load influencer profiles)

Agent Trace
The /chat-strategy response includes agent metadata for plan → draft → review:
- reply: final strategy text
- trace: list of { name, summary, latency_ms }
- model: model identifier when LLM is used (nullable)
- fallback_used: true when deterministic fallback is used

Example:
curl -X POST http://localhost:8000/chat-strategy \
  -H "Content-Type: application/json" \
  -d '{"campaign":{"id":"camp-001","brand_name":"Luma","goal":"Launch skincare","target_region":"Thailand","target_age_range":"18-24","budget":25000,"description":"Summer serum"},"recommendations":{"campaign_id":"camp-001","recommendations":[{"influencer_id":"inf-1","score":0.9,"reasons":["Category fit"]}]}}'

{"reply":"...","trace":[{"name":"plan","summary":"Generated 3 phases with measurement and risks.","latency_ms":4}],"model":null,"fallback_used":true}
8. ML Model Training
cd backend-ai
python train_model.py
docker compose restart backend-ai


Supports iterative model improvements without changing inference contracts.

9. Production Readiness Roadmap (In Progress)

Planned / being implemented:

Offline evaluation (NDCG@K, Recall@K)

Agent orchestration & memory

CI/CD with GitHub Actions

Troubleshooting

- docker: command not found
  - macOS: install Docker Desktop
  - Linux: install Docker Engine
- Cannot connect to the Docker daemon
  - macOS: start Docker Desktop
  - Linux: start the docker service (`sudo systemctl start docker`)
- sudo password prompt on macOS
  - It uses your macOS login password, but Docker Desktop should not require sudo for Docker commands

Environment (optional)

- AI_SERVICE_BASE_URL (backend-api → backend-ai base URL)
- MODEL_NAME (backend-ai model name for /v1/model/status)
- MODEL_VERSION (backend-ai model version for /v1/model/status)
- JWT_SECRET (backend-api JWT signing secret)
- DEMO_AUTH_TOKEN (frontend → backend-api Authorization token)
- DEMO_TENANT_ID / DEMO_USER_ID (seeded tenant/user IDs)

Multi-tenant demo

- Default tenant/user are seeded on backend-api startup.
- Frontend proxies attach DEMO_AUTH_TOKEN for tenant-scoped access, and backend-ai derives tenant_id from JWT claims.
- RBAC roles: admin, brand_user, viewer (writes require admin/brand_user).

Security & Multi-tenancy

- Docs: docs/SECURITY_MULTI_TENANCY.md
- Demo login:
  - POST http://localhost:4000/auth/login
  - body: {"email":"admin@nivoxai.local","password":"demo"}
- Tenant B login:
  - POST http://localhost:4000/auth/login
  - body: {"email":"user@tenantb.local","password":"demo"}

Evaluation

Run evaluation locally:

cd backend-ai
python -m app.eval.retrieval_eval --dataset ../docs/eval/datasets/sample.jsonl --k 5,10
python -m app.eval.ranking_eval --dataset ../docs/eval/datasets/sample.jsonl --k 5,10

Or with Makefile:

make eval

Snapshot results: eval/results.md
Regenerate: make eval-save (requires docker compose running)
Include timestamp: INCLUDE_TIMESTAMP=1 make eval-save

Latest metrics (sample dataset):

Retrieval (hybrid)
| Metric | Value |
| --- | --- |
| mrr | 0.75 |
| precision@5 | 0.5 |
| recall@5 | 0.8333 |
| ndcg@5 | 0.7812 |
| precision@10 | 0.3 |
| recall@10 | 1.0 |
| ndcg@10 | 0.8421 |

Ranking (recommendations)
| Metric | Value |
| --- | --- |
| mrr | 0.7083 |
| precision@5 | 0.4667 |
| recall@5 | 0.7778 |
| ndcg@5 | 0.7425 |
| precision@10 | 0.3 |
| recall@10 | 1.0 |
| ndcg@10 | 0.8214 |

Baseline vs hybrid vs rerank (sample):

| Method | Recall@5 | NDCG@5 | MRR@5 |
| --- | --- | --- | --- |
| Baseline (keyword) | 0.62 | 0.58 | 0.48 |
| Hybrid (vector+keyword) | 0.81 | 0.74 | 0.66 |
| Hybrid + rerank | 0.86 | 0.79 | 0.71 |

Kubernetes manifests

Monitoring & model observability

Redis for caching embeddings

10. Why This Matters

This project demonstrates:

Ownership of end-to-end AI systems

Ability to translate AI research into deployable products

Readiness to work in client-facing MarTech AI teams

Strong alignment with Influmatch & Amity AI Labs

## Offline Evaluation (Ranking Metrics)

NivoxAI includes an offline evaluation harness to validate influencer ranking quality using standard IR metrics:

NDCG@K (graded relevance ranking quality)

Precision@K / Recall@K (binary relevance where relevant = relevance ≥ 2)

Run locally:

cd backend-ai
python -m eval.run_eval


Run in Docker:

docker exec -it nivoxai-backend-ai python -m eval.run_eval


Aggregate results (8 campaign scenarios):

Metric	Model (weighted ranker)	Baseline (followers)	Baseline (engagement)
NDCG@5	0.95	0.36	0.81
Precision@5	0.75	0.25	0.70
Recall@5	0.95	0.31	0.90
NDCG@10	0.97	0.66	0.86
Precision@10	0.49	0.49	0.49
Recall@10	1.00	1.00	1.00

Interpretation: Engagement is a strong single-signal baseline, but it can fail when the campaign has hard constraints (e.g., region/category/age fit). The weighted ranker improves shortlist quality at K=5 while maintaining strong overall retrieval at K=10—aligned with real influencer shortlisting workflows.
