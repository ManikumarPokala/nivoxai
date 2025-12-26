export type CampaignInput = {
  id: string;
  brand_name: string;
  goal: string;
  target_region: string;
  target_age_range: string;
  budget: number;
  description: string;
};

export type InfluencerInput = {
  id: string;
  name: string;
  platform: string;
  category: string;
  followers: number;
  engagement_rate: number;
  region: string;
  languages: string[];
  audience_age_range: string;
  bio: string;
};

export type RecommendationItem = {
  influencer_id: string;
  score: number;
  reasons: string[];
};

export type RecommendationResponse = {
  campaign_id: string;
  recommendations: RecommendationItem[];
};

export type ChatStrategyResponse = {
  reply: string;
  trace: { name: string; summary: string; latency_ms: number | null }[];
  model: string | null;
  fallback_used: boolean;
};

export type AgentStatus = {
  agent_version: string;
  default_model: string | null;
  last_run_at: string | null;
  last_error: string | null;
};

export type ModelStatus = {
  model_version: string;
  last_trained: string;
  data_freshness_days: number;
  drift_detected: boolean;
  retrain_required: boolean;
};

export type RagResult = {
  id?: string;
  name?: string;
  score?: number;
  summary?: string;
  [key: string]: unknown;
};

export type RagResponse = {
  results: RagResult[];
};

export type ApiResult<T> = {
  data: T | null;
  error: string | null;
};

export type CampaignPayload = CampaignInput & {
  title: string;
};

const DEFAULT_TIMEOUT_MS = 8000;

async function fetchJson<T>(
  url: string,
  options?: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        data: null,
        error: `Request failed (${response.status} ${response.statusText})`,
      };
    }

    const data = (await response.json()) as T;
    return { data, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    return { data: null, error: message };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getHealthAI(): Promise<ApiResult<{ status: string }>> {
  return fetchJson<{ status: string }>(`/api/ai/health`);
}

export async function getHealthAPI(): Promise<ApiResult<{ status: string }>> {
  return fetchJson<{ status: string }>(`/api/health`);
}

export async function getModelStatus(): Promise<ApiResult<ModelStatus>> {
  return fetchJson<ModelStatus>(`/api/ai/model-status`);
}

export async function getAgentStatus(): Promise<ApiResult<AgentStatus>> {
  return fetchJson<AgentStatus>(`/api/ai/agent-status`);
}

export async function getSampleRecommendation(): Promise<
  ApiResult<RecommendationResponse>
> {
  return fetchJson<RecommendationResponse>(`/api/ai/sample-recommendation`);
}

export async function getCampaigns(): Promise<ApiResult<CampaignInput[]>> {
  return fetchJson<CampaignInput[]>(`/api/campaigns`);
}

export async function getCampaignById(
  campaignId: string
): Promise<ApiResult<CampaignInput>> {
  return fetchJson<CampaignInput>(`/api/campaigns/${campaignId}`);
}

export async function createCampaign(input: {
  title: string;
  country: string;
  budget: number;
}): Promise<ApiResult<CampaignInput>> {
  return fetchJson<CampaignInput>(`/api/campaigns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function recommend(
  campaign: CampaignPayload,
  influencers: InfluencerInput[]
): Promise<ApiResult<RecommendationResponse>> {
  return fetchJson<RecommendationResponse>(`/api/ai/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ campaign, influencers }),
  });
}

export async function chatStrategy(
  campaign: CampaignPayload,
  recommendations: RecommendationResponse,
  question?: string | null
): Promise<ApiResult<ChatStrategyResponse>> {
  return fetchJson<ChatStrategyResponse>(`/api/ai/chat-strategy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ campaign, recommendations, question }),
  });
}

export async function ragInfluencers(
  query: string,
  topK: number
): Promise<ApiResult<RagResponse>> {
  return fetchJson<RagResponse>(`/api/rag`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, top_k: topK }),
  });
}
