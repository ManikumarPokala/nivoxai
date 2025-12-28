"use client";

import { useMemo, useState } from "react";
import { PlayCircle, Zap } from "lucide-react";
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

type Influencer = {
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

type RecommendationItem = {
  influencer_id: string;
  score: number;
  reasons: string[];
  score_breakdown?: Record<string, number>;
  confidence?: number;
};

type RecommendationResponse = {
  campaign_id: string;
  recommendations: RecommendationItem[];
};

const demoInfluencers: Influencer[] = [
  {
    id: "inf-qa-001",
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
    id: "inf-qa-002",
    name: "Maya Moves",
    platform: "TikTok",
    category: "fitness",
    followers: 95000,
    engagement_rate: 0.054,
    region: "Singapore",
    languages: ["en"],
    audience_age_range: "18-35",
    bio: "HIIT, wellness, and fitness habits.",
  },
  {
    id: "inf-qa-003",
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
  {
    id: "inf-qa-004",
    name: "Ivy Style",
    platform: "Instagram",
    category: "fashion",
    followers: 67000,
    engagement_rate: 0.038,
    region: "United Kingdom",
    languages: ["en"],
    audience_age_range: "25-34",
    bio: "Sustainable fashion edits and styling tips.",
  },
];

export default function QARecommendPage() {
  const { t } = useI18n();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState<string>("");
  const [payloadJson, setPayloadJson] = useState<string>("");
  const [topK, setTopK] = useState(5);
  const [results, setResults] = useState<RecommendationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"baseline" | "hybrid" | "rerank">("hybrid");
  const [abCompare, setAbCompare] = useState<{
    baseline: RecommendationItem[];
    hybrid: RecommendationItem[];
    rerank: RecommendationItem[];
  } | null>(null);

  const activeCampaign = useMemo(
    () => campaigns.find((c) => c.id === campaignId) ?? null,
    [campaigns, campaignId]
  );

  const buildPayload = () => {
    const campaign = activeCampaign ?? {
      id: "camp-qa-001",
      brand_name: "QA Brand",
      goal: "Launch skincare line",
      target_region: "Thailand",
      target_age_range: "18-24",
      budget: 25000,
      description: "Demo campaign for recommendations.",
    };
    return { campaign, influencers: demoInfluencers };
  };

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
    setError(null);
  };

  const runRecommend = async () => {
    let payload;
    if (payloadJson) {
      try {
        payload = JSON.parse(payloadJson);
      } catch {
        setError("Invalid JSON payload.");
        return;
      }
    } else {
      payload = buildPayload();
    }
    setPayloadJson(JSON.stringify(payload, null, 2));
    const result = await requestJson<RecommendationResponse>("/api/recommendations", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (result.error) {
      setError(result.error);
      return;
    }
    setResults(result.data);
    setError(null);
  };

  const runAbCompare = async () => {
    const payload = buildPayload();
    const response = await requestJson<RecommendationResponse>("/api/recommendations", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (response.error || !response.data) {
      setError(response.error ?? "Failed to run recommendations.");
      return;
    }
    const hybrid = response.data.recommendations.slice(0, topK);
    const baseline = [...payload.influencers]
      .sort((a, b) => b.followers - a.followers)
      .slice(0, topK)
      .map((inf) => ({
        influencer_id: inf.id,
        score: inf.followers,
        reasons: ["Baseline by followers"],
      }));
    const rerank = hybrid;
    setAbCompare({ baseline, hybrid, rerank });
  };

  return (
    <div className="space-y-6 px-6 py-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">QA Console</p>
        <h1 className="text-2xl font-semibold text-slate-900">Recommendations</h1>
        <p className="text-sm text-slate-600">
          Send recommendation requests and compare baseline vs hybrid outputs.
        </p>
      </header>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Request Builder</h3>
          <p className="text-sm text-slate-500">POST /api/recommendations</p>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button onClick={loadCampaigns}>
              <span className="flex items-center gap-2">
                <PlayCircle className="h-4 w-4" />
                {t("action_load_campaigns")}
              </span>
            </Button>
            <Button onClick={runRecommend}>
              <span className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                {t("action_run_recommend")}
              </span>
            </Button>
            <Button variant="ghost" onClick={runAbCompare}>
              Run A/B compare
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-xs text-slate-500">
              Campaign
              <select
                value={campaignId}
                onChange={(event) => setCampaignId(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
              >
                <option value="">Demo campaign</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.brand_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-500">
              Mode
              <select
                value={mode}
                onChange={(event) => setMode(event.target.value as typeof mode)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
              >
                <option value="baseline">Baseline</option>
                <option value="hybrid">Hybrid</option>
                <option value="rerank">Hybrid + Rerank</option>
              </select>
            </label>
            <label className="text-xs text-slate-500">
              top_k
              <input
                type="number"
                min={1}
                value={topK}
                onChange={(event) => setTopK(Number(event.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
              />
            </label>
          </div>
          <textarea
            value={payloadJson}
            onChange={(event) => setPayloadJson(event.target.value)}
            placeholder="Paste or generate payload JSON"
            rows={6}
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
          />
          {error ? <p className="text-xs text-rose-600">{error}</p> : null}
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Results</h3>
            <p className="text-sm text-slate-500">Ranked influencer list</p>
          </CardHeader>
          <CardBody className="space-y-3">
            {results?.recommendations?.length ? (
              results.recommendations.map((item) => (
                <div key={item.influencer_id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{item.influencer_id}</span>
                    <span className="text-emerald-600">score {item.score.toFixed(3)}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {item.reasons?.join(" • ") || "No reasons returned"}
                  </p>
                  {item.score_breakdown ? (
                    <pre className="mt-2 rounded-lg bg-slate-50 p-2 text-[11px] text-slate-700">
                      {JSON.stringify(item.score_breakdown, null, 2)}
                    </pre>
                  ) : (
                    <p className="mt-2 text-[11px] text-slate-400">No score breakdown provided.</p>
                  )}
                </div>
              ))
            ) : (
            <p className="text-xs text-slate-500">{t("empty_no_results")}</p>
          )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">A/B Compare</h3>
            <p className="text-sm text-slate-500">Baseline vs hybrid vs rerank</p>
          </CardHeader>
          <CardBody className="space-y-3 text-xs text-slate-600">
            {abCompare ? (
              ["baseline", "hybrid", "rerank"].map((key) => (
                <div key={key}>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{key}</p>
                  <div className="mt-2 space-y-1">
                    {(abCompare as any)[key].map((item: RecommendationItem, idx: number) => (
                      <div key={item.influencer_id} className="flex items-center justify-between">
                        <span>
                          {idx + 1}. {item.influencer_id}
                        </span>
                        <span className="text-slate-500">{item.score.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500">Run A/B compare to view rankings.</p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
