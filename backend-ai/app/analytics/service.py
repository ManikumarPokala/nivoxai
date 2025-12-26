def calculate_roi(actual_engagement: int, cost: float) -> float:
    # Defensive guard for demo math.
    if not cost or cost == 0:
        return 0.0
    return round(actual_engagement / cost, 4)


def get_campaign_analytics(campaign_id: int) -> dict:
    # Stateless demo KPIs for a single campaign.
    return {
        "campaign_id": campaign_id,
        "avg_engagement": 0.64,
        "avg_roi": 1.82,
        "total_kols": 6,
        "top_regions": ["Thailand", "Singapore"],
        "sentiment_score": 0.71,
        "mode": "heuristic",
    }


def get_analytics_summary() -> dict:
    # Influmatch-style rollup KPIs for dashboard cards.
    return {
        "total_campaigns": 18,
        "total_kols": 142,
        "avg_roi": 1.76,
        "avg_engagement": 0.062,
        "active_regions": ["Thailand", "Singapore", "Vietnam", "Indonesia"],
        "mode": "heuristic",
    }
