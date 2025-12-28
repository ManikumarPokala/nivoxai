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
  status: "online" | "degraded" | "offline";
  model_name: string;
  provider: string;
  version: string;
  last_reload_at: string | null;
  last_embedding_refresh_at: string | null;
  uptime_s: number;
  time: string;
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

import { requestJson, type ApiResult } from "@/lib/apiClient";

export type CampaignPayload = CampaignInput & {
  title: string;
};

export async function getHealthAI(): Promise<ApiResult<{ status: string }>> {
  return requestJson<{ status: string }>(`/api/healthz`);
}

export async function getHealthAPI(): Promise<ApiResult<{ status: string }>> {
  return requestJson<{ status: string }>(`/api/health`);
}

export async function getModelStatus(): Promise<ApiResult<ModelStatus>> {
  return requestJson<ModelStatus>(`/api/model/status`);
}

export async function getAgentStatus(): Promise<ApiResult<AgentStatus>> {
  return requestJson<AgentStatus>(`/api/ai/agent-status`);
}

export async function getSampleRecommendation(): Promise<
  ApiResult<RecommendationResponse>
> {
  return requestJson<RecommendationResponse>(`/api/ai/sample-recommendation`);
}

export async function getCampaigns(): Promise<ApiResult<CampaignInput[]>> {
  return requestJson<CampaignInput[]>(`/api/campaigns`);
}

export async function getCampaignById(
  campaignId: string
): Promise<ApiResult<CampaignInput>> {
  return requestJson<CampaignInput>(`/api/campaigns/${campaignId}`);
}

export async function createCampaign(input: {
  title: string;
  country: string;
  budget: number;
}): Promise<ApiResult<CampaignInput>> {
  return requestJson<CampaignInput>(`/api/campaigns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function recommend(
  campaign: CampaignPayload,
  influencers: InfluencerInput[]
): Promise<ApiResult<RecommendationResponse>> {
  return requestJson<RecommendationResponse>(`/api/ai/recommend`, {
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
  return requestJson<ChatStrategyResponse>(`/api/ai/chat-strategy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ campaign, recommendations, question }),
  });
}

export async function ragInfluencers(
  query: string,
  topK: number
): Promise<ApiResult<RagResponse>> {
  return requestJson<RagResponse>(`/api/rag`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, top_k: topK }),
  });
}

export async function loginDemo(
  email: string,
  password: string
): Promise<ApiResult<{ token: string; tenant_id: string; role: string }>> {
  return requestJson<{ token: string; tenant_id: string; role: string }>(
    `/api/auth/login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }
  );
}
