"use client";

import { useMemo, useState } from "react";
import { Bot, PlayCircle } from "lucide-react";
import { requestJson } from "@/lib/apiClient";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useI18n } from "@/i18n";

type Campaign = {
  id: string;
  brand_name: string;
  goal: string;
  target_region: string;
  target_age_range: string;
  budget: number;
  description: string;
};

type RecommendationItem = {
  influencer_id: string;
  score: number;
  reasons: string[];
};

type RecommendationResponse = {
  campaign_id: string;
  recommendations: RecommendationItem[];
};

type AgentStep = {
  name: string;
  summary: string;
  latency_ms?: number | null;
  tool_input?: unknown;
  tool_output?: unknown;
  replanned?: boolean;
};

type AgentResponse = {
  reply: string;
  trace?: AgentStep[];
  model?: string | null;
  fallback_used?: boolean;
};

const demoInfluencers = [
  {
    id: "inf-qa-101",
    name: "Nina Glow",
    platform: "Instagram",
    category: "beauty",
    followers: 120000,
    engagement_rate: 0.062,
    region: "Thailand",
    languages: ["th", "en"],
    audience_age_range: "18-24",
    bio: "Skincare creator focused on glow routines.",
  },
  {
    id: "inf-qa-102",
    name: "Ari Skin",
    platform: "Instagram",
    category: "skincare",
    followers: 80000,
    engagement_rate: 0.071,
    region: "Vietnam",
    languages: ["vi", "en"],
    audience_age_range: "18-24",
    bio: "Ingredient deep dives for sensitive skin.",
  },
];

export default function QAAgentPage() {
  const { t } = useI18n();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState<string>("");
  const [response, setResponse] = useState<AgentResponse | null>(null);
  const [trace, setTrace] = useState<AgentStep[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const activeCampaign = useMemo(
    () => campaigns.find((c) => c.id === campaignId) ?? null,
    [campaigns, campaignId]
  );

  const loadCampaigns = async () => {
    const result = await requestJson<Campaign[] | { campaigns?: Campaign[] }>("/api/campaigns");
    if (result.error) {
      setError(result.error);
      return;
    }
    const list = Array.isArray(result.data)
      ? result.data
      : result.data?.campaigns ?? [];
    setCampaigns(list as Campaign[]);
    if (!campaignId && list.length) {
      setCampaignId(list[0].id);
    }
  };

  const runAgent = async () => {
    if (running) {
      return;
    }
    setRunning(true);
    const campaign = activeCampaign ?? {
      id: "camp-qa-001",
      brand_name: "QA Brand",
      goal: "Launch skincare line",
      target_region: "Thailand",
      target_age_range: "18-24",
      budget: 25000,
      description: "Demo campaign for agent strategy.",
    };
    const recResult = await requestJson<RecommendationResponse>("/api/recommendations", {
      method: "POST",
      body: JSON.stringify({ campaign, influencers: demoInfluencers }),
    });
    if (recResult.error || !recResult.data) {
      setError(recResult.error ?? "Recommendation failed.");
      setRunning(false);
      return;
    }
    const agentResult = await requestJson<AgentResponse>("/api/chat-strategy", {
      method: "POST",
      body: JSON.stringify({
        campaign,
        recommendations: recResult.data,
        question: "How should we phase the launch over 4 weeks?",
      }),
    });
    if (agentResult.error || !agentResult.data) {
      setError(agentResult.error ?? "Agent failed.");
      setRunning(false);
      return;
    }
    setResponse(agentResult.data);
    setTrace(agentResult.data.trace ?? []);
    setError(null);
    setRunning(false);
  };

  return (
    <div className="space-y-6 px-6 py-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">QA Console</p>
        <h1 className="text-2xl font-semibold text-slate-900">Agent Strategy</h1>
        <p className="text-sm text-slate-600">Run the strategy agent and inspect trace.</p>
      </header>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Run agent</h3>
          <p className="text-sm text-slate-500">POST /api/chat-strategy</p>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button onClick={loadCampaigns}>
              <span className="flex items-center gap-2">
                <PlayCircle className="h-4 w-4" />
                {t("action_load_campaigns")}
              </span>
            </Button>
            <Button onClick={runAgent} disabled={running}>
              <span className="flex items-center gap-2">
                <Bot className="h-4 w-4" />
                {running ? t("status_loading") : t("action_run_agent")}
              </span>
            </Button>
          </div>
          <select
            value={campaignId}
            onChange={(event) => setCampaignId(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
          >
            <option value="">Demo campaign</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.brand_name}
              </option>
            ))}
          </select>
          {error ? <p className="text-xs text-rose-600">{error}</p> : null}
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Strategy Output</h3>
            <p className="text-sm text-slate-500">Final reply</p>
          </CardHeader>
          <CardBody>
            {response?.reply ? (
              <pre className="whitespace-pre-wrap rounded-2xl bg-slate-900 p-4 text-xs text-slate-100">
                {response.reply}
              </pre>
            ) : (
              <p className="text-xs text-slate-500">No agent output yet.</p>
            )}
            {response ? (
              <p className="mt-2 text-xs text-slate-500">
                model: {response.model ?? "n/a"} • fallback:{" "}
                {String(response.fallback_used ?? false)}
              </p>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Trace Timeline</h3>
            <p className="text-sm text-slate-500">Planner → tools → reviewer</p>
          </CardHeader>
          <CardBody className="space-y-3 text-xs text-slate-600">
            {trace.length ? (
              trace.map((step, idx) => (
                <div key={`${step.name}-${idx}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-900">{step.name}</p>
                    <span className="text-slate-500">{step.latency_ms ?? 0}ms</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">{step.summary}</p>
                  {step.replanned ? (
                    <p className="mt-2 text-[11px] text-amber-600">replanned</p>
                  ) : null}
                  {step.tool_input ? (
                    <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-950 p-3 text-[10px] text-slate-200">
                      {JSON.stringify(step.tool_input, null, 2)}
                    </pre>
                  ) : null}
                  {step.tool_output ? (
                    <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-900 p-3 text-[10px] text-slate-100">
                      {JSON.stringify(step.tool_output, null, 2)}
                    </pre>
                  ) : (
                    <p className="mt-2 text-[11px] text-slate-400">
                      tool_input/output not provided by backend
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500">No trace yet.</p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
