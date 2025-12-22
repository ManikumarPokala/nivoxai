from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel

from app.models.schemas import (
    Campaign,
    Influencer,
    RecommendationRequest,
    RecommendationResponse,
)
from app.services.chat_strategy import generate_strategy_reply
from app.services.rag import InfluencerDoc, search_influencers
from app.services.recommender import compute_recommendations

app = FastAPI(title="NivoxAI Backend AI Service")


# --------- RAG MODELS ---------


class RagQuery(BaseModel):
    query: str
    top_k: int = 5


class RagInfluencerHit(BaseModel):
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
    campaign: Campaign
    recommendations: RecommendationResponse
    question: str | None = None


class ChatResponse(BaseModel):
    reply: str


# --------- HEALTH ---------


@app.get("/health")
def health_check() -> dict:
    """
    Basic health endpoint used by the Node backend and Docker
    health checks to verify the AI service is up.
    """
    return {"status": "ok"}


# --------- RECOMMENDATION ENDPOINTS ---------


@app.post("/recommend", response_model=RecommendationResponse)
def recommend(request: RecommendationRequest) -> RecommendationResponse:
    """
    Main recommendation endpoint.

    Delegates to app.services.recommender.compute_recommendations,
    which can internally combine heuristic and ML-based scoring.
    """
    return compute_recommendations(request)


@app.get("/sample-recommendation", response_model=RecommendationResponse)
def sample_recommendation() -> RecommendationResponse:
    """
    Convenience endpoint that returns a sample campaign +
    a small influencer set to demonstrate the ranking logic.
    """

    campaign = Campaign(
        id="camp-001",
        brand_name="Luma Beauty",
        goal="Launch a summer skincare line",
        target_region="Thailand",
        target_age_range="18-24",
        budget=25000.0,
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
        ),
    ]

    req = RecommendationRequest(campaign=campaign, influencers=influencers)
    return compute_recommendations(req)


# --------- RAG ENDPOINTS ---------


@app.post("/rag/influencers", response_model=list[RagInfluencerHit])
def rag_influencers(query: RagQuery) -> list[RagInfluencerHit]:
    """
    RAG-style influencer search. Uses app.services.rag.search_influencers
    to retrieve the most relevant influencer documents for a free-text query.
    """

    results: list[tuple[InfluencerDoc, float]] = search_influencers(
        query.query, query.top_k
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


# --------- STRATEGY / AGENTIC CHAT ---------


@app.post("/chat-strategy", response_model=ChatResponse)
def chat_strategy(req: ChatRequest) -> ChatResponse:
    """
    Strategy endpoint.

    Delegates to app.services.chat_strategy.generate_strategy_reply,
    which is a heuristic placeholder for a future LLM call.
    """

    reply = generate_strategy_reply(
        campaign=req.campaign.dict(),
        recommendations=[
            {
                "influencer_id": r.influencer_id,
                "score": r.score,
                "reasons": r.reasons,
            }
            for r in req.recommendations.recommendations
        ],
        user_question=req.question,
    )
    return ChatResponse(reply=reply)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
