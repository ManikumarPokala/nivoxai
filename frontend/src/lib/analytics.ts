// frontend/src/lib/analytics.ts

/* -----------------------------
 * Types
 * ----------------------------- */

export type TopGoal = {
  goal: string;
  count: number;
};

export type AnalyticsSummary = {
  // Fields required by AnalyticsSummaryView
  total_events: number;
  total_recommendations: number;
  top_goals: TopGoal[];

  // Backward-compatible fields (kept so UI doesn't break)
  totalClicks: number;
  totalLinks: number;
  totalCampaigns: number;

  lastUpdatedAt: string;
};

export type CampaignAnalytics = {
  campaignId: string;

  // Metrics required by UI
  avg_engagement: number;
  avg_roi: number;
  total_kols: number;

  // Optional / extended metrics
  impressions: number;
  clicks: number;
  ctr: number; // 0..100

  lastUpdatedAt: string;
};

type Ok<T> = { data: T; error: null };
type Err = { data: null; error: string };
type Result<T> = Ok<T> | Err;

/* -----------------------------
 * Config
 * ----------------------------- */

/**
 * Primary backend API (Express).
 * Dev default: http://localhost:4000
 *
 * In Docker, set:
 *   NEXT_PUBLIC_API_BASE_URL=http://backend-api:4000
 */
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000")
  .trim()
  .replace(/\/$/, "");

/* -----------------------------
 * Helpers
 * ----------------------------- */

async function parseJsonSafe(res: Response): Promise<unknown> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

/* -----------------------------
 * Summary Analytics
 * ----------------------------- */

export async function getAnalyticsSummary(): Promise<Result<AnalyticsSummary>> {
  try {
    const res = await fetch(`${API_BASE_URL}/analytics/summary`, { cache: "no-store" });

    if (!res.ok) {
      const body = await parseJsonSafe(res);
      return {
        data: null,
        error: `Analytics summary failed: HTTP ${res.status} ${res.statusText}${
          body ? ` | body=${JSON.stringify(body)}` : ""
        }`,
      };
    }

    const json = (await res.json()) as Partial<{
      total_events: number;
      total_recommendations: number;
      top_goals: TopGoal[];
      // optional extra fields your backend may add later
      totalClicks: number;
      totalLinks: number;
      totalCampaigns: number;
    }>;

    return {
      data: {
        // UI-required fields
        total_events: Number(json.total_events ?? 0),
        total_recommendations: Number(json.total_recommendations ?? 0),
        top_goals: Array.isArray(json.top_goals) ? json.top_goals : [],

        // Backward compatible fields (use backend values if present)
        totalClicks: Number((json as any).totalClicks ?? 0),
        totalLinks: Number((json as any).totalLinks ?? 0),
        totalCampaigns: Number((json as any).totalCampaigns ?? 0),

        lastUpdatedAt: nowIso(),
      },
      error: null,
    };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : "Unknown error fetching analytics summary",
    };
  }
}

/* -----------------------------
 * Campaign Analytics
 * ----------------------------- */

export async function getCampaignAnalytics(
  campaignId: string
): Promise<Result<CampaignAnalytics>> {
  try {
    const res = await fetch(`${API_BASE_URL}/analytics/campaign/${encodeURIComponent(campaignId)}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await parseJsonSafe(res);
      return {
        data: null,
        error: `Campaign analytics failed: HTTP ${res.status} ${res.statusText}${
          body ? ` | body=${JSON.stringify(body)}` : ""
        }`,
      };
    }

    const json = (await res.json()) as Partial<{
      avg_engagement: number;
      avg_roi: number;
      total_kols: number;
      impressions: number;
      clicks: number;
      ctr: number;
    }>;

    return {
      data: {
        campaignId,

        // UI-required
        avg_engagement: Number(json.avg_engagement ?? 0),
        avg_roi: Number(json.avg_roi ?? 0),
        total_kols: Number(json.total_kols ?? 0),

        // Optional/extended
        impressions: Number(json.impressions ?? 0),
        clicks: Number(json.clicks ?? 0),
        ctr: Number(json.ctr ?? 0),

        lastUpdatedAt: nowIso(),
      },
      error: null,
    };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : "Unknown error fetching campaign analytics",
    };
  }
}
