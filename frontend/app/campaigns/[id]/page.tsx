"use client";

import { useEffect, useMemo, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import Tabs from "@/components/ui/Tabs";
import {
  chatStrategy,
  getAgentStatus,
  getCampaignById,
  getModelStatus,
  getSampleRecommendation,
  recommend,
  type AgentStatus,
  type CampaignInput,
  type ChatStrategyResponse,
  type ModelStatus,
  type RecommendationResponse,
} from "@/lib/api";
import { demoInfluencers } from "@/lib/demo-data";
import { useI18n } from "@/lib/i18n";

type CampaignDetailPageProps = {
  params: { id: string };
};

export default function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  const { t } = useI18n();
  const campaignId = params.id;
  const [campaign, setCampaign] = useState<CampaignInput | null>(null);
  const [campaignError, setCampaignError] = useState<string | null>(null);
  const [isCampaignLoading, setIsCampaignLoading] = useState(false);

  const [activeTab, setActiveTab] = useState("overview");
  const [recommendation, setRecommendation] = useState<RecommendationResponse | null>(null);
  const [strategy, setStrategy] = useState<ChatStrategyResponse | null>(null);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [isLoadingStrategy, setIsLoadingStrategy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsCampaignLoading(true);
    getCampaignById(campaignId).then((result) => {
      if (!active) {
        return;
      }
      setCampaign(result.data);
      setCampaignError(result.error);
      setIsCampaignLoading(false);
    });
    return () => {
      active = false;
    };
  }, [campaignId]);

  const tabs = [
    { label: t("tab_overview"), value: "overview" },
    { label: t("tab_influencers"), value: "influencers" },
    { label: t("tab_strategy"), value: "strategy" },
    { label: t("tab_performance"), value: "performance" },
    { label: t("tab_audit"), value: "audit" },
  ];

  useEffect(() => {
    if (activeTab === "strategy") {
      void getAgentStatus().then((result) => setAgentStatus(result.data));
    }
    if (activeTab === "audit") {
      void getModelStatus().then((result) => setModelStatus(result.data));
    }
  }, [activeTab]);

  async function handleRecommendation() {
    if (!campaign) {
      setError("Campaign data is not available.");
      return;
    }
    setIsLoadingRecs(true);
    setError(null);

    const response = await recommend(campaign, demoInfluencers);
    if (response.error || !response.data) {
      setError(response.error ?? "Recommendation failed.");
      setIsLoadingRecs(false);
      return;
    }

    setRecommendation(response.data);
    setIsLoadingRecs(false);
  }

  async function handleStrategy() {
    if (!campaign) {
      setError("Campaign data is not available.");
      return;
    }
    setIsLoadingStrategy(true);
    setError(null);

    let recs = recommendation;
    if (!recs) {
      const sample = await getSampleRecommendation();
      recs = sample.data ?? null;
    }

    if (!recs) {
      setError("Please generate recommendations before running strategy.");
      setIsLoadingStrategy(false);
      return;
    }

    const response = await chatStrategy(campaign, recs);
    if (response.error || !response.data) {
      setError(response.error ?? "Strategy generation failed.");
      setIsLoadingStrategy(false);
      return;
    }

    setStrategy(response.data);
    const status = await getAgentStatus();
    setAgentStatus(status.data);
    setIsLoadingStrategy(false);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="info">Campaign</Badge>
            <h2 className="text-2xl font-semibold text-slate-900">
              {campaign?.brand_name ?? "Campaign"}
            </h2>
          </div>
          <p className="text-sm text-slate-500">
            {campaign?.description ?? "Campaign details are loading."}
          </p>
        </CardHeader>
        <CardBody>
          {isCampaignLoading ? (
            <div className="grid gap-4 md:grid-cols-4">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : campaign ? (
            <div className="grid gap-4 md:grid-cols-4">
              <SummaryItem label="Goal" value={campaign.goal} />
              <SummaryItem label="Region" value={campaign.target_region} />
              <SummaryItem label="Age Range" value={campaign.target_age_range} />
              <SummaryItem
                label="Budget"
                value={`$${campaign.budget.toLocaleString()}`}
              />
            </div>
          ) : (
            <EmptyState
              title="Campaign not found"
              description={campaignError ?? "Unable to load campaign details."}
            />
          )}
        </CardBody>
      </Card>

      <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} />

      {activeTab === "overview" ? (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Campaign briefing</h3>
              <p className="text-sm text-slate-500">
                Keep creative and messaging aligned with the audience signals.
              </p>
            </CardHeader>
            <CardBody>
              <div className="space-y-3 text-sm text-slate-600">
                <p>Primary goal: {campaign.goal}</p>
                <p>Target region: {campaign.target_region}</p>
                <p>Audience age: {campaign.target_age_range}</p>
                <p>Budget: ${campaign.budget.toLocaleString()}</p>
              </div>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Next step: run recommendations and move into strategy to produce a launch plan.
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Workflow progress</h3>
              <p className="text-sm text-slate-500">Campaign-first operating model.</p>
            </CardHeader>
            <CardBody className="space-y-3 text-sm text-slate-600">
              <ProgressItem label="Select campaign" status="complete" />
              <ProgressItem label="Generate recommendations" status={recommendation ? "complete" : "pending"} />
              <ProgressItem label="Generate strategy" status={strategy ? "complete" : "pending"} />
              <ProgressItem label="Review performance" status="pending" />
            </CardBody>
          </Card>
        </div>
      ) : null}

      {activeTab === "influencers" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold">Recommendations</h3>
                <p className="text-sm text-slate-500">
                  Weighted ranker output from AI service.
                </p>
              </div>
              <Button onClick={handleRecommendation} disabled={isLoadingRecs}>
                {isLoadingRecs
                  ? "Running..."
                  : t("action_run_recommendation")}
              </Button>
            </CardHeader>
            <CardBody>
              {isLoadingRecs ? (
                <div className="grid gap-3">
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                </div>
              ) : recommendation ? (
                <div className="grid gap-3">
                  {recommendation.recommendations.map((rec, index) => {
                    const influencer = demoInfluencers.find((inf) => inf.id === rec.influencer_id);
                    return (
                      <div
                        key={rec.influencer_id}
                        className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            #{index + 1} {influencer?.name ?? rec.influencer_id}
                          </p>
                          <p className="text-xs text-slate-500">
                            {influencer?.platform ?? "Multi-platform"} •{" "}
                            {influencer?.region ??
                              campaign?.target_region ??
                              "Region"}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {rec.reasons.slice(0, 3).map((reason) => (
                              <Badge key={reason} variant="neutral">
                                {reason}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-900">
                            Score {rec.score.toFixed(3)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {influencer
                              ? influencer.followers.toLocaleString()
                              : "—"}{" "}
                            followers
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  title={t("empty_recommendations_title")}
                  description={t("empty_recommendations_desc")}
                />
              )}
              {error && activeTab === "influencers" ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">
                  {error}
                </div>
              ) : null}
            </CardBody>
          </Card>
        </div>
      ) : null}

      {activeTab === "strategy" ? (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          <Card>
            <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold">Strategy Draft</h3>
                <p className="text-sm text-slate-500">
                  Agentic plan with phases, creative cues, and measurement focus.
                </p>
              </div>
              <Button onClick={handleStrategy} disabled={isLoadingStrategy}>
                {isLoadingStrategy
                  ? "Generating..."
                  : t("action_generate_strategy_button")}
              </Button>
            </CardHeader>
            <CardBody>
              {isLoadingStrategy ? (
                <Skeleton className="h-56" />
              ) : strategy ? (
                <div className="whitespace-pre-wrap text-sm text-slate-600">
                  {strategy.reply}
                </div>
              ) : (
                <EmptyState
                  title={t("empty_strategy_title")}
                  description={t("empty_strategy_desc")}
                />
              )}
              {error ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">
                  {error}
                </div>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Agent Trace</h3>
              <p className="text-sm text-slate-500">
                Transparency into planning, drafting, and review steps.
              </p>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
                <p className="font-semibold text-slate-700">Agent status</p>
                <p>Last run: {agentStatus?.last_run_at ?? "—"}</p>
                <p>Last error: {agentStatus?.last_error ?? "None"}</p>
              </div>
              <div className="space-y-3">
                {strategy?.trace?.length ? (
                  strategy.trace.map((step) => (
                    <div
                      key={step.name}
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-3"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-900">{step.name}</p>
                        <Badge variant="info">{step.latency_ms ?? "—"} ms</Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{step.summary}</p>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title={t("empty_trace_title")}
                    description={t("empty_trace_desc")}
                  />
                )}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-600">
                <p className="font-semibold text-slate-700">Model</p>
                <p>{strategy?.model ?? "heuristic"}</p>
                <p>Fallback used: {strategy?.fallback_used ? "Yes" : "No"}</p>
              </div>
            </CardBody>
          </Card>
        </div>
      ) : null}

      {activeTab === "performance" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Reach & impressions</h3>
              <p className="text-sm text-slate-500">Placeholder for KPI charting.</p>
            </CardHeader>
            <CardBody>
              <div className="h-40 rounded-2xl border border-dashed border-slate-200 bg-slate-50" />
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">ROI tracking</h3>
              <p className="text-sm text-slate-500">Hook for analytics dashboard.</p>
            </CardHeader>
            <CardBody>
              <div className="h-40 rounded-2xl border border-dashed border-slate-200 bg-slate-50" />
            </CardBody>
          </Card>
        </div>
      ) : null}

      {activeTab === "audit" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Recommendation payload</h3>
              <p className="text-sm text-slate-500">Last output sent to the strategy agent.</p>
            </CardHeader>
            <CardBody>
              <pre className="max-h-72 overflow-auto rounded-2xl bg-slate-900 p-4 text-xs text-slate-100">
{recommendation
  ? JSON.stringify(recommendation, null, 2)
  : "No recommendation payload"}
              </pre>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Strategy response</h3>
              <p className="text-sm text-slate-500">Response and trace stored for audit.</p>
            </CardHeader>
            <CardBody>
              <pre className="max-h-72 overflow-auto rounded-2xl bg-slate-900 p-4 text-xs text-slate-100">
{strategy ? JSON.stringify(strategy, null, 2) : "No strategy response"}
              </pre>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
                <p className="font-semibold text-slate-700">Model status</p>
                <p>{modelStatus?.model_version ?? "Connect /model/status"}</p>
                <p>Drift detected: {modelStatus?.drift_detected ? "Yes" : "No"}</p>
              </div>
            </CardBody>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function ProgressItem({ label, status }: { label: string; status: "complete" | "pending" }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <span className="text-sm text-slate-700">{label}</span>
      <Badge variant={status === "complete" ? "success" : "neutral"}>
        {status === "complete" ? "Done" : "Pending"}
      </Badge>
    </div>
  );
}
