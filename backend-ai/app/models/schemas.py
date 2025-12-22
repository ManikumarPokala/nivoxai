from typing import List

from pydantic import BaseModel


class Influencer(BaseModel):
    id: str
    name: str
    platform: str
    category: str
    followers: int
    engagement_rate: float
    region: str
    languages: List[str]
    audience_age_range: str
    bio: str


class Campaign(BaseModel):
    id: str
    brand_name: str
    goal: str
    target_region: str
    target_age_range: str
    budget: float
    description: str


class RecommendationRequest(BaseModel):
    campaign: Campaign
    influencers: List[Influencer]


class RecommendationResponseItem(BaseModel):
    influencer_id: str
    score: float
    reasons: List[str]


class RecommendationResponse(BaseModel):
    campaign_id: str
    recommendations: List[RecommendationResponseItem]
