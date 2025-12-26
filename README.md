AI-Powered Brand–Influencer Matching & Campaign Intelligence Platform

Author: Manikumar Pokala
Contact: manikumarp183@gmail.com

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

Semantic influencer search

Vector similarity + metadata filtering

Designed for:

Multi-tenant brand data

Governance and visibility filtering

Roadmap-ready for:

Hybrid search (BM25 + vector)

Re-ranking (cross-encoder / LLM reranker)

Freshness-aware retrieval

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

6. Local Setup & Execution
docker compose up -d --build

Health Endpoints

Frontend: http://localhost:3000

API: http://localhost:4000/health

AI: http://localhost:8000/health

7. Key Endpoints
Capability	Endpoint
Recommendation	POST /recommend
RAG Search	POST /rag/influencers
Strategy Agent	POST /chat-strategy
Health	/health

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

Run the offline ranking evaluation harness:

cd backend-ai && python -m eval.run_eval

Example output:

=== Offline Ranking Eval ===
Campaigns: 2
- camp-eval-001 NDCG@5=0.87 P@5=0.80 R@5=0.67 | Baseline NDCG@5=0.62
- camp-eval-002 NDCG@5=0.83 P@5=0.80 R@5=0.57 | Baseline NDCG@5=0.58

Model (weighted ranker) vs Baseline (followers)
NDCG@10: model 0.84 | baseline 0.61
Precision@10: model 0.60 | baseline 0.40
Recall@10: model 0.78 | baseline 0.52
