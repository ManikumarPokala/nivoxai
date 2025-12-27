import math
from datetime import datetime, timezone
from typing import List, Tuple

from app.models.schemas import (
    RecommendationRequest,
    RecommendationResponse,
    RecommendationResponseItem,
)


def _normalize_engagement(influencers: List[float]) -> Tuple[float, float]:
    if not influencers:
        return 0.0, 0.0
    min_rate = min(influencers)
    max_rate = max(influencers)
    return min_rate, max_rate


def compute_recommendations(
    request: RecommendationRequest,
    top_n: int = 10,
) -> RecommendationResponse:
    campaign = request.campaign
    now = datetime.now(timezone.utc)
    engagement_values = [influencer.engagement_rate for influencer in request.influencers]
    min_rate, max_rate = _normalize_engagement(engagement_values)

    items: List[RecommendationResponseItem] = []
    for influencer in request.influencers:
        content_haystack = f"{campaign.description} {campaign.goal}".lower()
        category_match = influencer.category.lower() in content_haystack
        content_score = 1.0 if category_match else 0.2

        region_score = 1.0 if influencer.region == campaign.target_region else 0.0

        if max_rate == min_rate:
            engagement_score = 1.0
        else:
            engagement_score = (influencer.engagement_rate - min_rate) / (max_rate - min_rate)

        age_match_score = 1.0 if influencer.audience_age_range == campaign.target_age_range else 0.3

        base_score = (
            0.4 * content_score
            + 0.25 * region_score
            + 0.25 * engagement_score
            + 0.10 * age_match_score
        )
        freshness_multiplier = 1.0
        if influencer.stats_updated_at:
            updated_at = influencer.stats_updated_at
            if updated_at.tzinfo is None:
                updated_at = updated_at.replace(tzinfo=timezone.utc)
            freshness_days = max((now - updated_at).days, 0)
            freshness_multiplier = max(0.6, math.exp(-freshness_days / 30))
        score = base_score * freshness_multiplier

        reasons: List[str] = []
        if category_match:
            reasons.append(f"Strong category match with '{influencer.category}'")
        if region_score == 1.0:
            reasons.append(f"Region match for '{campaign.target_region}'")
        if engagement_score >= 0.7:
            reasons.append("High engagement rate relative to peers")
        elif engagement_score >= 0.4:
            reasons.append("Solid engagement rate relative to peers")
        if age_match_score == 1.0:
            reasons.append("Audience age aligns with target range")
        if freshness_multiplier < 0.85:
            reasons.append("Freshness decay applied due to stale stats")

        if not reasons:
            reasons.append("General relevance based on profile fit")

        items.append(
            RecommendationResponseItem(
                influencer_id=influencer.id,
                score=round(score, 4),
                reasons=reasons,
            )
        )

    ranked = sorted(items, key=lambda item: item.score, reverse=True)[:top_n]
    return RecommendationResponse(
        campaign_id=campaign.id,
        recommendations=ranked,
    )
