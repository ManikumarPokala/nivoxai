from fastapi import APIRouter

from app.analytics.service import get_analytics_summary, get_campaign_analytics

router = APIRouter()

@router.get("/summary")
def summary():
    # Simple passthrough to keep routing thin.
    return get_analytics_summary()

@router.get("/campaign/{campaign_id}")
def campaign(campaign_id: int):
    # Stateless demo data for campaign KPIs.
    return get_campaign_analytics(campaign_id)
