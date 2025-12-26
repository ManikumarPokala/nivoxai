// frontend/src/lib/analytics.ts

import { API_BASE_URL } from "./urls";

/* =============================
   Types (Exported for UI)
============================= */

export type TopGoal = {
  goal: string;
  count: number;
};

export type AnalyticsSummary = {
  total_events: number;
  total_recommendations: number;
  top_goals: TopGoal[];
  lastUpdatedAt: string;
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

/* =============================
   Result Wrapper (Enterprise)
============================= */

type Ok<T> = { data: T; error: null };
type Err = { data: null; error: string };
export type Result<T> = Ok<T> | Err;

/* =============================
   Summary Analytics
============================= */

export async function getAnalyticsSummary(): Promise<
  Result<AnalyticsSummary>
> {
  try {
    const res = await fetch(`${API_BASE_URL}/analytics/summary`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return { data: null, error: `HTTP ${res.status}` };
    }

    const json = await res.json();

    return {
      data: {
        ...json,
        lastUpdatedAt: new Date().toISOString(),
      },
      error: null,
    };
  } catch {
    return {
      data: null,
      error: "Failed to load analytics summary",
    };
  }
}

/* =============================
   Campaign-Level Analytics
============================= */

export async function getCampaignAnalytics(
  campaignId: string
): Promise<Result<CampaignAnalytics>> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/analytics/campaign/${campaignId}`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      return { data: null, error: `HTTP ${res.status}` };
    }

    const json = await res.json();
    return { data: json, error: null };
  } catch {
    return {
      data: null,
      error: "Failed to load campaign analytics",
    };
  }
}
