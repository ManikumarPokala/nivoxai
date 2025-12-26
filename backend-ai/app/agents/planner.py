from typing import Dict, Any

def plan_campaign(campaign: Dict[str, Any]) -> Dict[str, Any]:
    goal = campaign.get("goal", "Unknown goal")
    region = campaign.get("target_region", "Unknown region")
    budget = campaign.get("budget", 0)

    kpis = ["CTR", "Engagement Rate", "Conversion Proxy"]
    return {
        "goal": goal,
        "region": region,
        "budget": budget,
        "kpis": kpis,
        "plan": [
            "Select KOL mix aligned to goal + region",
            "Prioritize high engagement for efficiency",
            "Validate audience age fit",
            "Generate content angles and posting cadence",
        ],
    }
