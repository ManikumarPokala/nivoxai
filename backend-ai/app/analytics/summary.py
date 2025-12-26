# app/analytics/service.py

def get_campaign_analytics(campaign_id: int):
    return {
        "campaign_id": campaign_id,
        "avg_engagement": 0.64,
        "avg_roi": 1.82,
        "total_kols": 6,
        "top_regions": ["Thailand", "Singapore"],
        "sentiment_score": 0.71,
        "mode": "heuristic",
    }


def get_analytics_summary():
    return {
        "total_campaigns": 3,
        "total_kols": 18,
        "avg_roi": 1.74,
        "avg_engagement": 0.61,
        "active_regions": ["Thailand", "Singapore", "Vietnam"],
        "mode": "heuristic",
    }
