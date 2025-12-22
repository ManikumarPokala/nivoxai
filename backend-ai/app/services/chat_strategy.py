from __future__ import annotations

from typing import List, Optional, TypedDict


class CampaignDict(TypedDict):
    id: str
    brand_name: str
    goal: str
    target_region: str
    target_age_range: str
    budget: float
    description: str


class RecommendationHitDict(TypedDict):
    influencer_id: str
    score: float
    reasons: List[str]


def _format_reasons(reasons: List[str]) -> str:
    if not reasons:
        return "Profile fit"
    if len(reasons) == 1:
        return reasons[0]
    return f"{reasons[0]}; {reasons[1]}"


def generate_strategy_reply(
    campaign: CampaignDict,
    recommendations: List[RecommendationHitDict],
    user_question: Optional[str],
) -> str:
    goal = campaign["goal"]
    target_region = campaign["target_region"]
    target_age_range = campaign["target_age_range"]
    brand_name = campaign["brand_name"]

    summary = (
        f"Campaign focus: {brand_name} aims to {goal} for audiences in {target_region} "
        f"({target_age_range})."
    )

    top_recs = recommendations[:5]
    if top_recs:
        influencer_lines = [
            f"- {rec['influencer_id']} (score {rec['score']:.3f}): {_format_reasons(rec['reasons'])}"
            for rec in top_recs
        ]
        influencer_block = "Top influencer matches:\n" + "\n".join(influencer_lines)
    else:
        influencer_block = "Top influencer matches:\n- No recommendations available yet."

    tactics = (
        "Tactical recommendations:\n"
        "- Content formats: combine short-form reels with 1 longer tutorial to build trust.\n"
        "- Posting schedule: 3x per week, anchor posts Tue/Thu and a weekend recap.\n"
        "- Calls to action: highlight limited-time bundles and trackable discount codes."
    )

    response_parts = [summary, influencer_block, tactics]

    if user_question:
        response_parts.append(
            f"Regarding your question ('{user_question}'): focus on the top two creators "
            "first, then expand once early engagement data confirms lift."
        )

    return "\n\n".join(response_parts)
