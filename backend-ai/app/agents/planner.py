from typing import Dict, List


def _phase_content(goal: str) -> List[str]:
    if "launch" in goal.lower():
        return ["Teaser reels", "Countdown stories", "Product reveal posts"]
    if "awareness" in goal.lower():
        return ["Brand intro videos", "Community Q&A", "Top-of-funnel reels"]
    return ["Creator recommendations", "Short-form demos", "UGC prompts"]


def build_plan(
    campaign: dict, rec_summary: dict, user_question: str | None
) -> Dict[str, object]:
    goal = campaign.get("goal") or "Drive campaign outcomes"
    region = campaign.get("target_region") or "Primary markets"
    age_range = campaign.get("target_age_range") or "Target audience"
    budget = campaign.get("budget") or "Flexible"
    top_kols = [
        rec.get("influencer_id")
        for rec in rec_summary.get("top", [])
        if rec.get("influencer_id")
    ]
    phase_content = _phase_content(goal)

    phases = [
        {
            "name": "Phase 1 - Tease",
            "duration_days": 7,
            "kols": top_kols[:2],
            "content": phase_content[:2],
        },
        {
            "name": "Phase 2 - Launch",
            "duration_days": 10,
            "kols": top_kols[:4],
            "content": phase_content,
        },
        {
            "name": "Phase 3 - Retarget",
            "duration_days": 7,
            "kols": top_kols[2:5],
            "content": ["Retargeting ads", "Creator follow-ups", "UGC highlights"],
        },
    ]

    return {
        "objective": goal,
        "audience": f"{region} · {age_range}",
        "budget": budget,
        "phases": phases,
        "measurement": ["CTR", "Engagement Rate", "CPA", "ROAS"],
        "risks": [
            "Creative fatigue if cadence is too aggressive",
            "Audience mismatch if targeting shifts mid-flight",
            "Budget concentration on a single creator cluster",
        ],
        "user_question": user_question,
    }
