from typing import Literal, List, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.models.schemas import (
    Campaign,
    Influencer,
    RecommendationRequest,
    RecommendationResponse,
)
from app.services.chat_strategy import generate_strategy_reply
from app.services.rag import search_influencers
from app.services.recommender import compute_recommendations
from app.analytics.router import router as analytics_router

# -------------------------------------------------
# APP INITIALIZATION (SINGLE SOURCE OF TRUTH)
# -------------------------------------------------

app = FastAPI(
    title="NivoxAI Backend AI Service",
    description="AI microservice for influencer recommendations, RAG search, analytics, and agentic strategy generation.",
    version="0.2.1",
)

# -------------------------------------------------
# CORS (safe defaults for local/dev + Docker compose)
# -------------------------------------------------
# In production, restrict origins (e.g., your domain).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(analytics_router, prefix="/analytics", tags=["analytics"])

# -------------------------------------------------
# BASIC ROUTES
# -------------------------------------------------

@app.get("/", tags=["Root"])
def root():
    return {"service": "nivoxai-backend-ai", "status": "ok"}

# -------------------------------------------------
# HEALTH
# -------------------------------------------------

@app.get("/health", tags=["Health"])
def health_check():
    # Keep healthcheck cheap/fast; do deeper checks in /analytics endpoints.
    return {"status": "ok"}

# -------------------------------------------------
# RAG MODELS
# -------------------------------------------------

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

# -------------------------------------------------
# CHAT / STRATEGY MODELS
# -------------------------------------------------

class ChatMessage(BaseModel):
    role: Literal["user", "system", "assistant"]
    content: str


class ChatRequest(BaseModel):
    campaign: Campaign
    recommendations: RecommendationResponse
    question: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str

# -------------------------------------------------
# RECOMMENDATION ENDPOINTS
# -------------------------------------------------

@app.post(
    "/recommend",
    response_model=RecommendationResponse,
    response_model_exclude_none=True,
    tags=["Recommendation"],
)
def recommend(request: RecommendationRequest):
    return compute_recommendations(request)


@app.get(
    "/sample-recommendation",
    response_model=RecommendationResponse,
    response_model_exclude_none=True,
    tags=["Recommendation"],
)
def sample_recommendation():
    campaign = Campaign(
        id="camp-001",
        brand_name="Luma Beauty",
        goal="Launch a summer skincare line",
        target_region="Thailand",
        target_age_range="18-24",
        budget=25_000.0,
        description="Skincare and beauty focus for humid climates with glow routines.",
    )

    influencers: List[Influencer] = [
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

# -------------------------------------------------
# RAG ENDPOINT
# -------------------------------------------------

@app.post(
    "/rag/influencers",
    response_model=List[RagInfluencerHit],
    response_model_exclude_none=True,
    tags=["RAG"],
)
def rag_influencers(query: RagQuery):
    results = search_influencers(query.query, query.top_k)
    return [
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

# -------------------------------------------------
# STRATEGY / AGENTIC CHAT
# -------------------------------------------------

def _model_to_dict(model):
    """Pydantic v2 uses model_dump(); v1 uses dict()."""
    if hasattr(model, "model_dump"):
        return model.model_dump()
    return model.dict()

@app.post("/chat-strategy", response_model=ChatResponse, tags=["Agent"])
def chat_strategy(req: ChatRequest):
    reply = generate_strategy_reply(
        campaign=_model_to_dict(req.campaign),
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
