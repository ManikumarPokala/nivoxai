// src/lib/analytics.ts

/* -----------------------------
 * Summary Analytics (Dashboard)
 * ----------------------------- */

export type TopGoal = {
  goal: string;
  count: number;
};

export type AnalyticsSummary = {
  /* Fields required by AnalyticsSummaryView */
  total_events: number;
  total_recommendations: number;
  top_goals: TopGoal[];

  /* Existing / backward-compatible fields */
  totalClicks: number;
  totalLinks: number;
  totalCampaigns: number;

  lastUpdatedAt: string;
};

/* ---------------------------------
 * Campaign-Level Analytics (Detail)
 * --------------------------------- */
export type CampaignAnalytics = {
  campaignId: string;

  /* Metrics required by UI */
  avg_engagement: number;
  avg_roi: number;
  total_kols: number;

  /* Optional / extended metrics */
  impressions: number;
  clicks: number;
  ctr: number; // 0..100

  lastUpdatedAt: string;
};

/* -----------------------------
 * Shared Result Type
 * ----------------------------- */
type Ok<T> = { data: T; error: null };
type Err = { data: null; error: string };
type Result<T> = Ok<T> | Err;

/* -----------------------------
 * Summary Analytics (Stub)
 * ----------------------------- */
export async function getAnalyticsSummary(): Promise<Result<AnalyticsSummary>> {
  return {
    data: {
      /* UI-required fields */
      total_events: 0,
      total_recommendations: 0,
      top_goals: [],

      /* Backward-compatible fields */
      totalClicks: 0,
      totalLinks: 0,
      totalCampaigns: 0,

      lastUpdatedAt: new Date().toISOString(),
    },
    error: null,
  };
}

/* -----------------------------
 * Campaign Analytics (Stub)
 * ----------------------------- */
export async function getCampaignAnalytics(
  campaignId: string
): Promise<Result<CampaignAnalytics>> {
  return {
    data: {
      campaignId,

      /* UI-required fields */
      avg_engagement: 0,
      avg_roi: 0,
      total_kols: 0,

      /* Extended metrics */
      impressions: 0,
      clicks: 0,
      ctr: 0,

      lastUpdatedAt: new Date().toISOString(),
    },
    error: null,
  };
}
