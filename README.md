AI-Powered Brand–Influencer Matching & Campaign Intelligence Platform
Contact: manikumarp183@gmail.com
## Demo & Proof
This repo demonstrates:
- AI ranking (recommendation system) with explainability
- Agentic campaign strategy generation
- RAG influencer discovery
- Analytics feedback loop (events + recommendation logging)
- Dockerized deployment with health checks

### Run Locally
docker-compose up -d --build

### Health
- API: http://localhost:4000/health
- AI: http://localhost:8000/health
- UI: http://localhost:3000


NivoxAI is an end-to-end MarTech system that uses AI, LLM agents, recommendation systems, and RAG pipelines to match brands with the most suitable influencers (KOLs) and generate autonomous campaign strategies.

This monorepo contains:

backend-ai → AI microservice (FastAPI + ML + RAG + LLM agentic strategy)

backend-api → Public API Gateway (Node.js + TypeScript)

frontend → Marketing/UI Dashboard (Next.js)

postgres → Analytics + events database

1. Features
Recommendation Engine

Combined heuristic + ML scoring (Logistic Regression)

Category/region/age matching

Engagement-driven feature scoring

Expandable to neural embedding ranking

RAG Search

Fast influencer discovery via semantic search

Vector scoring with metadata

Agentic AI Strategy

LLM-powered autonomous strategy generation

Tool-calling for recommendation insights

Full Docker Orchestration

One-command setup

Backend + AI + Frontend + DB

2. Tech Stack

Backend AI: FastAPI, Scikit-Learn, Pandas, NumPy, OpenAI API
Backend API: Node.js, TypeScript, Express, PostgreSQL
Frontend: Next.js, React, TailwindCSS
Infra: Docker, PostgreSQL 16

3. Repository Structure
nivoxai/
│
├── backend-ai/
├── backend-api/
├── frontend/
├── docker-compose.yml
├── .env
└── README.md

4. Environment Setup

Create a .env in the root:

POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
OPENAI_API_KEY=your_openai_key

5. Run the Project
Start all services:
docker compose down --remove-orphans
docker compose up --build

Services:

Frontend: http://localhost:3000

Backend API: http://localhost:4000

Backend AI: http://localhost:8000

PostgreSQL: localhost:5432

6. Database Setup (Run once)

Enter PostgreSQL:

docker exec -it nivoxai-postgres psql -U postgres -d nivoxai


Create tables:

CREATE TABLE IF NOT EXISTS app_events (
    id SERIAL PRIMARY KEY,
    event_name TEXT NOT NULL,
    user_id TEXT,
    campaign_id TEXT,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recommendation_logs (
    id SERIAL PRIMARY KEY,
    campaign_id TEXT,
    influencer_id TEXT,
    score NUMERIC,
    reasons JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

7. Test Endpoints
Health
curl http://localhost:8000/health

Recommendation
curl -X POST http://localhost:8000/recommend \
  -H "Content-Type: application/json" \
  -d '{ "campaign": { ... }, "influencers": [] }'

RAG Search
curl -X POST http://localhost:8000/rag/influencers \
  -H "Content-Type: application/json" \
  -d '{"query": "skincare thailand", "top_k": 5 }'

Strategy AI
curl -X POST http://localhost:8000/chat-strategy \
  -H "Content-Type: application/json" \
  -d '{ "campaign": { ... }, "recommendations": { ... } }'

8. Train ML Model
cd backend-ai
python3 train_model.py
docker compose restart backend-ai

9. Rebuild Individual Services

Frontend:

docker compose build frontend
docker compose restart frontend


Backend-AI:

docker compose build backend-ai
docker compose restart backend-ai


Backend-API:

docker compose build backend-api
docker compose restart backend-api

10. Stop System
docker compose down


Remove volumes + images:

docker compose down --rmi all --volumes --remove-orphans

11. For Production

Move secrets to environment variables

Add HTTPS reverse proxy (Nginx/Traefik)

Consider Supabase for managed DB

Add Redis for caching embeddings

Upgrade ML model to transformer-based ranking

Contact

For collaboration, support, or hiring opportunities:
manikumarp183@gmail.com