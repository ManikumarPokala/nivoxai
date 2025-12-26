# JD Mapping — Amity Solutions × Egg Digital (Influmatch)

This project is intentionally built to demonstrate an Influmatch-style AI Engineering skill set.

## Recommendation / Ranking
- Feature-based ranking with explainability (reasons per recommendation)
- Logged recommendations for analytics feedback

## Agentic + LLM Systems
- Strategy endpoint with tool-like structure + fallbacks
- Agent separation (planner / selector / reviewer) is added to show production patterns

## RAG / Knowledge
- Influencer discovery endpoint (RAG)
- Structured schema for retrieved hits

## Data Handling & Analytics
- Event ingestion endpoint `/events`
- Summary endpoint `/analytics/summary` (counts + top goals)

## Integration & Deployment
- Docker Compose microservices
- Health checks with gating dependencies

## System Optimization & Maintenance
- Model status endpoint `/model/status`
- Versioning + “retrain_required” signaling
