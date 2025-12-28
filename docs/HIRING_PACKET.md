# NivoxAI Hiring Packet

## 30‑second pitch (Influmatch-aligned)
NivoxAI is a multi-tenant MarTech AI platform that lets brands discover influencers, run explainable recommendations, and generate campaign strategies with an agentic LLM workflow. It demonstrates production-ready AI engineering: governance, observability, evaluation, and end‑to‑end UX that exercises every backend capability.

## 2‑minute reviewer checklist
1) Open `/demo` and start the guided flow.
2) `/qa/agent` → run strategy and inspect trace + fallback flags.
3) `/qa/rag` → run hybrid search and view provenance + freshness.
4) `/qa/recommend` → compare baseline vs hybrid outputs.
5) `/qa/ops` → run smoke test and confirm request IDs.

## JD mapping (feature → endpoint → QA page)
| JD Requirement | Repo Feature | Endpoint | QA Page |
| --- | --- | --- | --- |
| Multi‑tenant isolation | JWT + tenant scope | `/v1/analytics/*`, `/recommend`, `/rag/influencers` | `/qa/ops`, `/qa/analytics` |
| Agentic workflows | Planner → draft → review trace | `/chat-strategy` | `/qa/agent` |
| RAG governance | Hybrid retrieval + freshness | `/rag/influencers` | `/qa/rag` |
| Explainability | Score breakdown + reasons | `/recommend` | `/qa/recommend` |
| Observability | x-request-id + unified errors | all APIs | Inspector drawer |
| Evaluation | offline eval + redteam | `eval/run_eval.py`, `eval/run_redteam.py` | N/A |

## Production-grade highlights
- Unified error schema and request correlation IDs
- Tenant-scoped analytics + recommendations
- Agent safety: tool allowlist, prompt sanitization, deterministic fallback
- CI gates: tests, eval, redteam, smoke

## Key files (top 10)
1) `backend-ai/app/agents/runner.py` — agent orchestration + trace
2) `backend-ai/app/services/rag.py` — hybrid retrieval + freshness
3) `backend-ai/app/services/recommender.py` — explainable ranking
4) `backend-api/src/index.ts` — auth/tenant enforcement + gateway
5) `frontend/src/lib/apiClient.ts` — request inspector
6) `frontend/app/qa/agent/page.tsx` — full agent QA
7) `frontend/app/qa/rag/page.tsx` — RAG QA
8) `frontend/app/qa/recommend/page.tsx` — recommender QA + A/B
9) `.github/workflows/ci.yml` — CI quality gates
10) `eval/run_redteam.py` — safety validation
