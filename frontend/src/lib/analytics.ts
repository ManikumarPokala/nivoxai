// src/lib/analytics.ts

export type AnalyticsSummary = {
  totalClicks: number;
  totalLinks: number;
  totalCampaigns: number;
  lastUpdatedAt: string;
};

export type CampaignAnalytics = {
  campaignId: string;
  impressions: number;
  clicks: number;
  ctr: number; // 0..100
  lastUpdatedAt: string;
};

type Ok<T> = { data: T; error: null };
type Err = { data: null; error: string };
type Result<T> = Ok<T> | Err;

/**
 * Temporary stub to unblock production builds.
 * Replace with real DB/API calls when analytics backend is ready.
 */
export async function getAnalyticsSummary(): Promise<Result<AnalyticsSummary>> {
  return {
    data: {
      totalClicks: 0,
      totalLinks: 0,
      totalCampaigns: 0,
      lastUpdatedAt: new Date().toISOString(),
    },
    error: null,
  };
}

/**
 * Temporary stub to unblock production builds.
 * Replace with real DB/API calls when campaign analytics backend is ready.
 */
export async function getCampaignAnalytics(
  campaignId: string
): Promise<Result<CampaignAnalytics>> {
  return {
    data: {
      campaignId,
      impressions: 0,
      clicks: 0,
      ctr: 0,
      lastUpdatedAt: new Date().toISOString(),
    },
    error: null,
  };
}
