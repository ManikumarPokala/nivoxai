from __future__ import annotations

from dataclasses import dataclass
from typing import List, Tuple

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


@dataclass(frozen=True)
class InfluencerDoc:
    id: str
    name: str
    bio: str
    category: str
    region: str


INFLUENCER_DOCS: List[InfluencerDoc] = [
    InfluencerDoc(
        id="doc-001",
        name="Nina Glow",
        bio="Skincare creator sharing humid-weather routines, glass skin tips, and product reviews.",
        category="beauty",
        region="Thailand",
    ),
    InfluencerDoc(
        id="doc-002",
        name="Ari Skin",
        bio="Ingredient-focused skincare deep dives with before-and-after routines for sensitive skin.",
        category="skincare",
        region="Vietnam",
    ),
    InfluencerDoc(
        id="doc-003",
        name="Dex Plays",
        bio="High-energy gaming streams, FPS tournaments, and gear reviews for competitive players.",
        category="gaming",
        region="United States",
    ),
    InfluencerDoc(
        id="doc-004",
        name="Maya Moves",
        bio="Daily fitness programming, HIIT workouts, and wellness habits for busy professionals.",
        category="fitness",
        region="Singapore",
    ),
    InfluencerDoc(
        id="doc-005",
        name="Ravi Tech",
        bio="Gadget reviews, AI productivity tips, and smart home setups for tech enthusiasts.",
        category="tech",
        region="India",
    ),
    InfluencerDoc(
        id="doc-006",
        name="Luca Trails",
        bio="Adventure travel diaries with coastal hikes, drone shots, and creator gear breakdowns.",
        category="travel",
        region="Italy",
    ),
    InfluencerDoc(
        id="doc-007",
        name="Sori Eats",
        bio="Food creator highlighting street eats, cafe openings, and culinary storytelling.",
        category="food",
        region="South Korea",
    ),
    InfluencerDoc(
        id="doc-008",
        name="Ivy Style",
        bio="Sustainable fashion edits, capsule wardrobe advice, and seasonal styling tips.",
        category="fashion",
        region="United Kingdom",
    ),
]


def _doc_text(doc: InfluencerDoc) -> str:
    return f"{doc.bio} {doc.category} {doc.region}"


_VECTORIZER = TfidfVectorizer(stop_words="english")
_DOC_MATRIX = _VECTORIZER.fit_transform([_doc_text(doc) for doc in INFLUENCER_DOCS])


def search_influencers(query: str, top_k: int = 5) -> List[Tuple[InfluencerDoc, float]]:
    if not query.strip():
        return []

    query_vector = _VECTORIZER.transform([query])
    scores = cosine_similarity(query_vector, _DOC_MATRIX).flatten()
    ranked_indices = scores.argsort()[::-1][:top_k]

    return [(INFLUENCER_DOCS[index], float(scores[index])) for index in ranked_indices]
