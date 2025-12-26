import { API_BASE_URL } from "./urls";

export type AnalyticsSummary = {
  total_events: number;
  total_recommendations: number;
  top_goals: { goal: string; count: number }[];
};

export type CampaignAnalytics = {
  campaign_id: string;
  total_events: number;
  total_recommendations: number;
  impressions: number;
  clicks: number;
  ctr: number;
  spend: number;
  revenue: number;
  roi: number;
};

type ApiResult<T> = {
  data: T | null;
  error: string | null;
};

async function handleJsonResponse<T>(response: Response): Promise<ApiResult<T>> {
  if (!response.ok) {
    return {
      data: null,
      error: `Request failed (${response.status} ${response.statusText})`,
    };
  }

  try {
    const data = (await response.json()) as T;
    return { data, error: null };
  } catch {
    return { data: null, error: "Failed to parse response JSON" };
  }
}

export async function getAnalyticsSummary(): Promise<ApiResult<AnalyticsSummary>> {
  try {
    // Avoid caching so dashboards stay fresh in SSR and client transitions.
    const response = await fetch(`${API_BASE_URL}/analytics/summary`, {
      cache: "no-store",
    });
    return await handleJsonResponse<AnalyticsSummary>(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    return { data: null, error: message };
  }
}

export async function getCampaignAnalytics(
  campaignId: string
): Promise<ApiResult<CampaignAnalytics>> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/analytics/campaign/${campaignId}`,
      { cache: "no-store" }
    );
    return await handleJsonResponse<CampaignAnalytics>(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    return { data: null, error: message };
  }
}
