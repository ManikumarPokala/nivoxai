def adjust_ranking_weights(analytics: dict):
    if analytics.get("avg_roi", 0) < 0.2:
        return {
            "engagement_weight": 0.4,
            "content_weight": 0.2
        }

    return {
        "engagement_weight": 0.25,
        "content_weight": 0.3
    }
