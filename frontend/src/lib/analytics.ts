export type AnalyticsSummary = {
  total_events: number;
  total_recommendations: number;
  top_goals: { goal: string; count: number }[];
  lastUpdatedAt: string;
};

export type CampaignAnalytics = {
  campaign_id: string;
  total_events: number;
  total_recommendations: number;
  total_kols: number;
  avg_engagement: number;
  avg_roi: number;
  impressions: number;
  clicks: number;
  ctr: number;
  spend: number;
  revenue: number;
  roi: number;
  lastUpdatedAt: string;
};

import { requestJson, type ApiResult } from "@/lib/apiClient";

export type AnalyticsEventPayload = {
  user_id?: string;
  tenant_id?: string;
  event_type: string;
  campaign_id?: string;
  influencer_id?: string;
  metadata?: Record<string, unknown>;
};

export async function getAnalyticsSummary(): Promise<ApiResult<AnalyticsSummary>> {
  return requestJson<AnalyticsSummary>(`/api/analytics/summary`);
}

export async function getCampaignAnalytics(
  campaignId: string
): Promise<ApiResult<CampaignAnalytics>> {
  return requestJson<CampaignAnalytics>(`/api/analytics/campaign/${campaignId}`);
}

export async function logAnalyticsEvent(
  payload: AnalyticsEventPayload
): Promise<ApiResult<{ status: string }>> {
  return requestJson<{ status: string }>(`/api/analytics/event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
