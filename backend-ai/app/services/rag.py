from __future__ import annotations

import json
import logging
import os
import time
import urllib.request
from dataclasses import dataclass
from typing import Dict, List, Tuple

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
_KEYWORD_VECTORIZER = TfidfVectorizer(stop_words="english", use_idf=True, norm=None)
_KEYWORD_MATRIX = _KEYWORD_VECTORIZER.fit_transform(
    [f"{doc.bio} {doc.category} {doc.region} {doc.name}" for doc in INFLUENCER_DOCS]
)

logger = logging.getLogger(__name__)

DEFAULT_MODE = os.environ.get("RAG_DEFAULT_MODE", "hybrid")
VECTOR_WEIGHT = float(os.environ.get("RAG_VECTOR_WEIGHT", "0.6"))
KEYWORD_WEIGHT = float(os.environ.get("RAG_KEYWORD_WEIGHT", "0.4"))
RERANK_MODE = os.environ.get("RAG_RERANK_MODE", "none")
RERANK_MODEL = os.environ.get("RAG_RERANK_MODEL", "gpt-4o-mini")
RERANK_TIMEOUT_S = float(os.environ.get("RAG_RERANK_TIMEOUT_S", "8"))


def search_influencers(
    query: str,
    top_k: int = 5,
    mode: str | None = None,
    rerank: bool = False,
    candidate_k: int | None = None,
) -> List[Tuple[InfluencerDoc, float]]:
    if not query.strip():
        return []

    start = time.perf_counter()
    selected_mode = mode or DEFAULT_MODE
    candidate_k = candidate_k or max(top_k * 3, top_k)

    vector_scores = _score_vector(query)
    keyword_scores = _score_keyword(query)

    if selected_mode == "vector":
        combined_scores = vector_scores
    elif selected_mode == "keyword":
        combined_scores = keyword_scores
    else:
        combined_scores = _combine_scores(vector_scores, keyword_scores)

    ranked_indices = sorted(
        range(len(combined_scores)),
        key=lambda idx: combined_scores[idx],
        reverse=True,
    )[:candidate_k]
    candidates = [(INFLUENCER_DOCS[index], combined_scores[index]) for index in ranked_indices]

    final_results = _maybe_rerank(query, candidates, rerank)
    final_results = final_results[:top_k]

    latency_ms = int(round((time.perf_counter() - start) * 1000))
    scores = [score for _, score in final_results]
    avg_score = sum(scores) / len(scores) if scores else 0.0
    top_score = scores[0] if scores else 0.0
    logger.info(
        "rag.search mode=%s rerank=%s k=%s candidate_k=%s latency_ms=%s avg_score=%.4f top_score=%.4f",
        selected_mode,
        rerank,
        top_k,
        candidate_k,
        latency_ms,
        avg_score,
        top_score,
    )

    return final_results


def refresh_documents(docs: List[InfluencerDoc]) -> None:
    global INFLUENCER_DOCS, _DOC_MATRIX, _KEYWORD_MATRIX
    INFLUENCER_DOCS = docs
    _DOC_MATRIX = _VECTORIZER.fit_transform([_doc_text(doc) for doc in INFLUENCER_DOCS])
    _KEYWORD_MATRIX = _KEYWORD_VECTORIZER.fit_transform(
        [f"{doc.bio} {doc.category} {doc.region} {doc.name}" for doc in INFLUENCER_DOCS]
    )


def _score_vector(query: str) -> List[float]:
    query_vector = _VECTORIZER.transform([query])
    scores = cosine_similarity(query_vector, _DOC_MATRIX).flatten()
    return _normalize_scores(scores.tolist())


def _score_keyword(query: str) -> List[float]:
    query_vector = _KEYWORD_VECTORIZER.transform([query])
    scores = (query_vector @ _KEYWORD_MATRIX.T).toarray().flatten().tolist()
    return _normalize_scores(scores)


def _normalize_scores(scores: List[float]) -> List[float]:
    if not scores:
        return scores
    min_score = min(scores)
    max_score = max(scores)
    if max_score == min_score:
        return [0.0 for _ in scores]
    return [(score - min_score) / (max_score - min_score) for score in scores]


def _combine_scores(vector_scores: List[float], keyword_scores: List[float]) -> List[float]:
    combined: List[float] = []
    for vec_score, key_score in zip(vector_scores, keyword_scores):
        combined.append(VECTOR_WEIGHT * vec_score + KEYWORD_WEIGHT * key_score)
    return combined


def _maybe_rerank(
    query: str,
    candidates: List[Tuple[InfluencerDoc, float]],
    rerank: bool,
) -> List[Tuple[InfluencerDoc, float]]:
    if not rerank:
        return candidates
    if RERANK_MODE != "llm":
        return candidates
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return candidates

    try:
        reranked = _llm_rerank(query, candidates, api_key)
        if reranked:
            return reranked
    except Exception:
        logger.exception("rag.rerank.failed")
    return candidates


def _llm_rerank(
    query: str,
    candidates: List[Tuple[InfluencerDoc, float]],
    api_key: str,
) -> List[Tuple[InfluencerDoc, float]]:
    prompt_items = [
        {
            "id": doc.id,
            "name": doc.name,
            "category": doc.category,
            "region": doc.region,
            "bio": doc.bio,
        }
        for doc, _ in candidates
    ]
    payload = {
        "model": RERANK_MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a strict reranker. Return JSON only with schema: "
                    "{'ranking':[{'id':string,'score':number}]} where higher score is better."
                ),
            },
            {
                "role": "user",
                "content": json.dumps({"query": query, "candidates": prompt_items}),
            },
        ],
        "temperature": 0,
    }

    request = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    with urllib.request.urlopen(request, timeout=RERANK_TIMEOUT_S) as response:
        body = json.loads(response.read().decode("utf-8"))
        content = body["choices"][0]["message"]["content"]

    parsed = json.loads(content)
    ranking = parsed.get("ranking", [])
    score_map: Dict[str, float] = {
        item["id"]: float(item.get("score", 0)) for item in ranking if "id" in item
    }
    reranked = sorted(
        candidates,
        key=lambda item: score_map.get(item[0].id, item[1]),
        reverse=True,
    )
    return [(doc, float(score_map.get(doc.id, score))) for doc, score in reranked]
