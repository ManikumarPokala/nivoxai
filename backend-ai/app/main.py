import json
import logging
import os
import time
from datetime import datetime, timezone
from typing import Literal, List

from uuid import uuid4

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.models.schemas import (
    Campaign,
    Influencer,
    RecommendationRequest,
    RecommendationResponse,
)
from app.agents import runner
from app.services import ingestion, observability
from app.services.rag import search_influencers
from app.services.recommender import compute_recommendations

app = FastAPI(
    title="NivoxAI Backend AI Service",
    description="AI microservice for influencer recommendations, RAG search, and agentic strategy generation.",
    version="0.2.0",
)

logger = logging.getLogger(__name__)
START_TIME = time.time()

cors_origins_env = os.environ.get("CORS_ORIGINS", "http://localhost:3000")
cors_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_context_middleware(request, call_next):
    request_id = request.headers.get("x-request-id") or uuid4().hex
    start = time.perf_counter()
    try:
        response = await call_next(request)
        status_code = response.status_code
        latency_ms = max(1, int(round((time.perf_counter() - start) * 1000)))
        observability.record_request(request.url.path, status_code, latency_ms)
        log_payload = {
            "request_id": request_id,
            "method": request.method,
            "route": request.url.path,
            "status_code": status_code,
            "latency_ms": latency_ms,
        }
        logger.info(json.dumps(log_payload))
        response.headers["X-Request-Id"] = request_id
        return response
    except Exception:
        status_code = 500
        latency_ms = max(1, int(round((time.perf_counter() - start) * 1000)))
        observability.record_request(request.url.path, status_code, latency_ms)
        log_payload = {
            "request_id": request_id,
            "method": request.method,
            "route": request.url.path,
            "status_code": status_code,
            "latency_ms": latency_ms,
        }
        logger.info(json.dumps(log_payload))
        raise


# --------- RAG MODELS ---------


class RagQuery(BaseModel):
    """Incoming query model for influencer RAG search."""
    query: str
    top_k: int = 5
    mode: Literal["vector", "keyword", "hybrid"] | None = None
    rerank: bool = False
    candidate_k: int | None = None


class RagInfluencerHit(BaseModel):
    """Single RAG search hit for an influencer."""
    id: str
    name: str
    bio: str
    category: str
    region: str
    score: float


# --------- CHAT / STRATEGY MODELS ---------


class ChatMessage(BaseModel):
    role: Literal["user", "system", "assistant"]
    content: str


class ChatRequest(BaseModel):
    """
    Request payload for the strategy / agentic chat endpoint.

    - campaign: the campaign brief and targeting constraints
    - recommendations: ranked influencers from the /recommend endpoint
    - question: optional user question, e.g. “How should I phase this campaign?”
    """
    campaign: "ChatCampaign"
    recommendations: RecommendationResponse
    question: str | None = None


class ChatCampaign(BaseModel):
    id: str
    brand_name: str | None = None
    goal: str | None = None
    target_region: str | None = None
    target_age_range: str | None = None
    budget: float | None = None
    description: str | None = None
    title: str | None = None
    country: str | None = None

    class Config:
        extra = "allow"


class AgentStep(BaseModel):
    name: str
    summary: str
    latency_ms: int | None = None


class ChatResponse(BaseModel):
    """LLM / agent reply as plain text."""
    reply: str
    trace: List[AgentStep] = Field(default_factory=list)
    model: str | None = None
    fallback_used: bool = False


# --------- HEALTH ---------


@app.get("/health")
def health_check() -> dict:
    """
    Basic health endpoint used by the Node backend and Docker
    health checks to verify the AI service is up.
    """
    return {"status": "ok"}


@app.get("/metrics")
def metrics() -> dict:
    return observability.get_metrics()


@app.get("/healthz")
def healthz_check() -> dict:
    return {
        "status": "ok",
        "service": "backend-ai",
        "time": datetime.now(timezone.utc).isoformat(),
        "git_sha": os.environ.get("GIT_SHA"),
    }


@app.get("/v1/model/status", tags=["Model"])
def model_status_v1() -> dict:
    now = datetime.now(timezone.utc).isoformat()
    model_name = os.environ.get("MODEL_NAME", "nivoxai-heuristic")
    model_version = os.environ.get("MODEL_VERSION", "0.1.0")
    provider = os.environ.get("MODEL_PROVIDER", "heuristic")
    last_reload_at = os.environ.get("MODEL_LAST_RELOAD_AT")
    last_embedding_refresh_at = os.environ.get("MODEL_LAST_EMBED_REFRESH_AT")
    status = "online"

    try:
        if provider != "heuristic" and not os.environ.get("OPENAI_API_KEY"):
            status = "degraded"
    except Exception:
        status = "offline"

    return {
        "status": status,
        "model_name": model_name,
        "provider": provider,
        "version": model_version,
        "last_reload_at": last_reload_at,
        "last_embedding_refresh_at": last_embedding_refresh_at,
        "uptime_s": int(time.time() - START_TIME),
        "time": now,
    }


@app.get("/model/status", tags=["Model"])
def model_status():
    return {
        "model_version": "heuristic_v1",
        "last_trained": "2025-12-26",
        "data_freshness_days": 0,
        "drift_detected": False,
        "retrain_required": False,
    }

@app.get("/agent/status", tags=["Agent"])
def agent_status():
    default_model = os.environ.get("OPENAI_MODEL")
    return {
        "agent_version": "v1",
        "default_model": default_model,
        "last_run_at": runner.LAST_RUN_AT,
        "last_error": runner.LAST_ERROR,
    }


@app.get("/v1/ingestion/status", tags=["Ingestion"])
def ingestion_status() -> dict:
    return {
        "last_run_at": ingestion.LAST_RUN_AT,
        "records_updated": ingestion.LAST_RECORDS_UPDATED,
        "last_error": ingestion.LAST_ERROR,
    }


# --------- RECOMMENDATION ENDPOINTS ---------


@app.post("/recommend", response_model=RecommendationResponse)
def recommend(request: RecommendationRequest) -> RecommendationResponse:
    """
    Main recommendation endpoint.

    Delegates to app.services.recommender.compute_recommendations,
    which can internally combine heuristic and ML-based scoring
    for influencer–campaign fit.
    """
    return compute_recommendations(request)


@app.get("/sample-recommendation", response_model=RecommendationResponse)
def sample_recommendation() -> RecommendationResponse:
    """
    Convenience endpoint that returns a sample campaign +
    a small influencer set to demonstrate the ranking logic.

    Useful for smoke tests and demos without needing frontend input.
    """

    campaign = Campaign(
        id="camp-001",
        brand_name="Luma Beauty",
        goal="Launch a summer skincare line",
        target_region="Thailand",
        target_age_range="18-24",
        budget=25_000.0,
        description="Skincare and beauty focus for humid climates with glow routines.",
    )

    influencers: list[Influencer] = [
        Influencer(
            id="inf-001",
            name="Nina Glow",
            platform="Instagram",
            category="beauty",
            followers=120_000,
            engagement_rate=0.062,
            region="Thailand",
            languages=["Thai", "English"],
            audience_age_range="18-24",
            bio="Beauty creator sharing skincare routines and summer glow tips.",
            source="sample",
            last_crawled_at=datetime.now(timezone.utc),
            stats_updated_at=datetime.now(timezone.utc),
        ),
        Influencer(
            id="inf-002",
            name="Kai Fit",
            platform="TikTok",
            category="fitness",
            followers=90_000,
            engagement_rate=0.045,
            region="Singapore",
            languages=["English", "Mandarin"],
            audience_age_range="25-34",
            bio="Fitness coach with a focus on wellness and outdoor workouts.",
            source="sample",
            last_crawled_at=datetime.now(timezone.utc),
            stats_updated_at=datetime.now(timezone.utc),
        ),
        Influencer(
            id="inf-003",
            name="Mina Style",
            platform="YouTube",
            category="fashion",
            followers=250_000,
            engagement_rate=0.038,
            region="Thailand",
            languages=["Thai"],
            audience_age_range="18-24",
            bio="Fashion hauls and beauty collaborations across Asia.",
            source="sample",
            last_crawled_at=datetime.now(timezone.utc),
            stats_updated_at=datetime.now(timezone.utc),
        ),
        Influencer(
            id="inf-004",
            name="Ari Skin",
            platform="Instagram",
            category="skincare",
            followers=54_000,
            engagement_rate=0.072,
            region="Vietnam",
            languages=["Vietnamese", "English"],
            audience_age_range="18-24",
            bio="Skincare reviews, ingredient deep dives, and glow routines.",
            source="sample",
            last_crawled_at=datetime.now(timezone.utc),
            stats_updated_at=datetime.now(timezone.utc),
        ),
        Influencer(
            id="inf-005",
            name="Luca Travel",
            platform="TikTok",
            category="travel",
            followers=180_000,
            engagement_rate=0.028,
            region="Italy",
            languages=["Italian", "English"],
            audience_age_range="25-34",
            bio="Travel vlogs with a focus on coastal destinations.",
            source="sample",
            last_crawled_at=datetime.now(timezone.utc),
            stats_updated_at=datetime.now(timezone.utc),
        ),
        Influencer(
            id="inf-006",
            name="Somi Care",
            platform="Instagram",
            category="beauty",
            followers=75_000,
            engagement_rate=0.055,
            region="Thailand",
            languages=["Thai", "English"],
            audience_age_range="18-24",
            bio="Daily skincare habits and product spotlights for humid weather.",
            source="sample",
            last_crawled_at=datetime.now(timezone.utc),
            stats_updated_at=datetime.now(timezone.utc),
        ),
    ]

    req = RecommendationRequest(campaign=campaign, influencers=influencers)
    return compute_recommendations(req)


# --------- RAG ENDPOINTS ---------


@app.post("/rag/influencers", response_model=list[RagInfluencerHit])
def rag_influencers(query: RagQuery) -> list[RagInfluencerHit]:
    """
    RAG-style influencer search.

    Uses app.services.rag.search_influencers to retrieve the most relevant
    influencer documents for a free-text query (e.g. “Thai skincare KOLs”).
    """

    results: list[tuple[InfluencerDoc, float]] = search_influencers(
        query.query,
        top_k=query.top_k,
        mode=query.mode,
        rerank=query.rerank,
        candidate_k=query.candidate_k,
    )

    hits: list[RagInfluencerHit] = [
        RagInfluencerHit(
            id=doc.id,
            name=doc.name,
            bio=doc.bio,
            category=doc.category,
            region=doc.region,
            score=round(score, 4),
        )
        for doc, score in results
    ]
    return hits


@app.on_event("startup")
def start_ingestion_scheduler() -> None:
    if os.environ.get("INGESTION_ENABLED", "true").lower() != "true":
        return
    ingestion.schedule_daily_ingestion()


# --------- STRATEGY / AGENTIC CHAT ---------


@app.post("/chat-strategy", response_model=ChatResponse)
def chat_strategy(req: ChatRequest) -> ChatResponse:
    """
    Strategy endpoint.

    Delegates to app.services.chat_strategy.generate_strategy_reply,
    which is implemented as an LLM-based, tool-using agent that:
    - Reads the campaign brief and ranked influencers
    - Optionally calls internal tools (e.g., recommendation summary)
    - Produces a structured, actionable KOL campaign strategy.
    """

    request_id = uuid4().hex
    start_time = time.perf_counter()
    campaign = req.campaign
    normalized_campaign = {
        "id": campaign.id,
        "brand_name": campaign.brand_name or "Unknown Brand",
        "goal": campaign.goal or "brand awareness",
        "target_region": campaign.target_region or campaign.country or "global",
        "target_age_range": campaign.target_age_range or "18-35",
        "description": campaign.description or campaign.title or "",
        "budget": campaign.budget or 0.0,
    }

    recs = [
        {
            "influencer_id": r.influencer_id,
            "score": r.score,
            "reasons": r.reasons,
        }
        for r in req.recommendations.recommendations
    ]
    try:
        result = runner.run_strategy_agent(
            campaign=normalized_campaign,
            recommendations=recs,
            user_question=req.question,
        )
        runner.LAST_RUN_AT = datetime.now(timezone.utc).isoformat()
        runner.LAST_ERROR = None
        logger.info("Agent state updated: last_run_at=%s", runner.LAST_RUN_AT)
    except Exception as exc:
        runner.LAST_ERROR = str(exc)
        logger.info("Agent state updated: last_run_at=%s", runner.LAST_RUN_AT)
        raise
    ms = (time.perf_counter() - start_time) * 1000
    total_ms = max(1, int(round(ms)))
    logger.info("chat-strategy executed for campaign %s", campaign.id)
    print(
        json.dumps(
            {
                "request_id": request_id,
                "endpoint": "/chat-strategy",
                "total_ms": total_ms,
                "fallback_used": result.get("fallback_used", False),
                "trace": result.get("trace", []),
            }
        )
    )
    return ChatResponse(
        reply=result["reply"],
        trace=[AgentStep(**step) for step in result.get("trace", [])],
        model=result.get("model"),
        fallback_used=result.get("fallback_used", False),
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
