from collections import Counter
from typing import Dict, List


def summarize_recommendations(
    recommendations: List[dict], top_n: int = 5
) -> Dict[str, object]:
    top = sorted(recommendations, key=lambda r: r.get("score", 0), reverse=True)[
        :top_n
    ]
    reason_counter: Counter[str] = Counter()
    for rec in top:
        for reason in rec.get("reasons", []) or []:
            if isinstance(reason, str) and reason.strip():
                reason_counter[reason.strip()] += 1

    return {
        "top": [
            {
                "influencer_id": rec.get("influencer_id"),
                "score": rec.get("score"),
                "reasons": rec.get("reasons", []),
            }
            for rec in top
        ],
        "reason_counts": dict(reason_counter),
    }


def extract_constraints(campaign: dict) -> Dict[str, object]:
    return {
        "brand_name": campaign.get("brand_name"),
        "goal": campaign.get("goal"),
        "target_region": campaign.get("target_region"),
        "target_age_range": campaign.get("target_age_range"),
        "budget": campaign.get("budget"),
        "description": campaign.get("description"),
    }
