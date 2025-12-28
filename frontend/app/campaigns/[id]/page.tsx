"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  type AgentStatus,
  type CampaignInput,
  type ChatStrategyResponse,
  type ModelStatus,
  type RecommendationResponse,
} from "@/lib/api";
import { getCampaignAnalytics, logAnalyticsEvent, type CampaignAnalytics } from "@/lib/analytics";
import { buildCampaignPayload } from "@/lib/payloads";
import { useI18n } from "@/i18n";
import {
  getAuthToken,
  bootstrapDemoSession,
  getStoredTenantId,
  getTokenRole,
  subscribeAuth,
} from "@/lib/auth";
import { recordActivity } from "@/lib/activity";
import { pushToast } from "@/lib/toast";

type CampaignDetailPageProps = {
  params: { id: string };
};

export default function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignId = params.id;
  const isValidCampaignId = Boolean(campaignId && campaignId !== "undefined");
  const [campaign, setCampaign] = useState<CampaignInput | null>(null);
  const [campaignError, setCampaignError] = useState<string | null>(null);
  const [campaignStatus, setCampaignStatus] = useState<number | null>(null);
  const [campaignRequestId, setCampaignRequestId] = useState<string | null>(null);
  const [isCampaignLoading, setIsCampaignLoading] = useState(false);
  const [campaignLastUpdated, setCampaignLastUpdated] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState("overview");
  const [recommendation, setRecommendation] = useState<RecommendationResponse | null>(null);
  const [strategy, setStrategy] = useState<ChatStrategyResponse | null>(null);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [campaignAnalytics, setCampaignAnalytics] = useState<CampaignAnalytics | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [analyticsStatus, setAnalyticsStatus] = useState<number | null>(null);
  const [analyticsRequestId, setAnalyticsRequestId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [isLoadingStrategy, setIsLoadingStrategy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorRequestId, setErrorRequestId] = useState<string | null>(null);
  const [strategyRaw, setStrategyRaw] = useState<string | null>(null);
  const [lastRecommendationAt, setLastRecommendationAt] = useState<string | null>(null);
  const [lastStrategyAt, setLastStrategyAt] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(getTokenRole());
  const [sessionActive, setSessionActive] = useState<boolean>(
    Boolean(getAuthToken() && getStoredTenantId())
  );
  const [tenantId, setTenantId] = useState<string | null>(getStoredTenantId());

  useEffect(() => {
    const unsub = subscribeAuth(() => {
      setRole(getTokenRole());
      setSessionActive(Boolean(getAuthToken() && getStoredTenantId()));
      setTenantId(getStoredTenantId());
    });
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!isValidCampaignId) {
      setCampaign(null);
      setCampaignError("Select a campaign to view details.");
      setCampaignStatus(400);
      setIsCampaignLoading(false);
      return () => {
        active = false;
      };
    }
    setIsCampaignLoading(true);
    getCampaignById(campaignId).then((result) => {
      if (!active) {
        return;
      }
      setCampaign(result.data);
      setCampaignError(result.error);
      setCampaignStatus(result.status ?? null);
      setCampaignRequestId(result.requestId ?? null);
      setIsCampaignLoading(false);
      setCampaignLastUpdated(new Date().toLocaleTimeString());
    });
    return () => {
      active = false;
    };
  }, [campaignId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!isValidCampaignId) {
      return;
    }
    const stored = window.localStorage.getItem(`strategy:${campaignId}`);
    if (stored) {
      try {
        setStrategy(JSON.parse(stored) as ChatStrategyResponse);
      } catch {
        // ignore
      }
    }
  }, [campaignId]);

  useEffect(() => {
    let active = true;
    if (!isValidCampaignId) {
      setCampaignAnalytics(null);
      setAnalyticsError("Select a campaign to view analytics.");
      setAnalyticsStatus(400);
      return () => {
        active = false;
      };
    }
    getCampaignAnalytics(campaignId).then((result) => {
      if (!active) {
        return;
      }
      setCampaignAnalytics(result.data);
      setAnalyticsError(result.error);
      setAnalyticsStatus(result.status ?? null);
      setAnalyticsRequestId(result.requestId ?? null);
      setLastUpdated(new Date().toLocaleTimeString());
    });
    return () => {
      active = false;
    };
  }, [campaignId]);

  useEffect(() => {
    if (!sessionActive || !isValidCampaignId) {
      return;
    }
    const interval = setInterval(() => {
      getCampaignById(campaignId).then((result) => {
        setCampaign(result.data);
        setCampaignError(result.error);
        setCampaignStatus(result.status ?? null);
        setCampaignRequestId(result.requestId ?? null);
        setCampaignLastUpdated(new Date().toLocaleTimeString());
      });
      void refreshAnalytics();
    }, 15000);
    return () => {
      clearInterval(interval);
    };
  }, [campaignId, sessionActive, isValidCampaignId]);

  const tabs = [
    { label: t("tab_overview"), value: "overview" },
    { label: "Analytics", value: "analytics" },
    { label: t("tab_influencers"), value: "recommendations" },
    { label: t("tab_strategy"), value: "strategy" },
    { label: "Activity", value: "activity" },
  ];

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["overview", "analytics", "recommendations", "strategy", "activity"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeTab === "strategy") {
      void getAgentStatus().then((result) => setAgentStatus(result.data));
    }
    if (activeTab === "activity") {
      void getModelStatus().then((result) => setModelStatus(result.data));
    }
  }, [activeTab]);

  async function handleRecommendation() {
    if (!campaign) {
      setError("Campaign data is not available.");
      setErrorStatus(null);
      setErrorRequestId(null);
      return;
    }
    if (!sessionActive) {
      setError("Session missing. Paste JWT + tenant id in Settings.");
      setErrorStatus(401);
      setErrorRequestId(null);
      return;
    }
    if (role === "viewer") {
      setError("Viewer role cannot generate recommendations.");
      setErrorStatus(403);
      setErrorRequestId(null);
      return;
    }
    setIsLoadingRecs(true);
    setError(null);
    setErrorStatus(null);
    setErrorRequestId(null);

    const response = await getSampleRecommendation();
    if (response.error || !response.data) {
      setError(response.error ?? "Recommendation failed.");
      setErrorStatus(response.status ?? null);
      setErrorRequestId(response.requestId ?? null);
      setIsLoadingRecs(false);
      return;
    }

    const aligned = {
      ...response.data,
      campaign_id: campaign.id,
    };
    setRecommendation(aligned);
    setLastRecommendationAt(new Date().toISOString());
    recordActivity({
      title: "Recommendations generated",
      detail: `${campaign.brand_name} • ${response.data.recommendations.length} influencers`,
      campaignId: campaign.id,
    });
    void logAnalyticsEvent({
      event_type: "influencer_recommended",
      campaign_id: aligned.campaign_id,
      metadata: {
        recommendation_count: aligned.recommendations.length,
        top_influencers: response.data.recommendations
          .slice(0, 5)
          .map((item) => item.influencer_id),
      },
    });
    pushToast({
      title: "Recommendations ready",
      description: `Top ${aligned.recommendations.length} influencers`,
      variant: "success",
    });
    void refreshAnalytics();
    setIsLoadingRecs(false);
  }

  async function handleStrategy() {
    console.log("Generate Strategy clicked", { campaignId });
    if (!campaign) {
      setError("Campaign data is not available.");
      setErrorStatus(null);
      setErrorRequestId(null);
      return;
    }
    if (!sessionActive) {
      setError("Session missing. Paste JWT + tenant id in Settings.");
      setErrorStatus(401);
      setErrorRequestId(null);
      return;
    }
    if (role === "viewer") {
      setError("Viewer role cannot generate strategy.");
      setErrorStatus(403);
      setErrorRequestId(null);
      return;
    }
    setIsLoadingStrategy(true);
    setError(null);
    setErrorStatus(null);
    setErrorRequestId(null);
    setStrategyRaw(null);

    let recs = recommendation;
    if (!recs) {
      const sample = await getSampleRecommendation();
      recs = sample.data
        ? { ...sample.data, campaign_id: campaign.id }
        : null;
    }

    if (!recs) {
      setError("Please generate recommendations before running strategy.");
      setErrorStatus(null);
      setErrorRequestId(null);
      setIsLoadingStrategy(false);
      return;
    }

    const payloadCampaign = buildCampaignPayload(campaign);
    const response = await chatStrategy(payloadCampaign, recs);
    if (response.error || !response.data) {
      setError(response.error ?? "Strategy generation failed.");
      setErrorStatus(response.status ?? null);
      setErrorRequestId(response.requestId ?? null);
      setIsLoadingStrategy(false);
      return;
    }

    setStrategy(response.data);
    setLastStrategyAt(new Date().toISOString());
    if (!response.data.reply) {
      setStrategyRaw(JSON.stringify(response.data, null, 2));
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        `strategy:${campaignId}`,
        JSON.stringify(response.data)
      );
    }
    recordActivity({
      title: "Strategy generated",
      detail: `${campaign.brand_name} • Agentic plan delivered`,
      campaignId: campaign.id,
    });
    void logAnalyticsEvent({
      event_type: "strategy_generated",
      campaign_id: campaign.id,
      metadata: {
        goal: campaign.goal,
        question: null,
      },
    });
    const status = await getAgentStatus();
    setAgentStatus(status.data);
    pushToast({
      title: "Strategy generated",
      description: "Agent output ready.",
      variant: "success",
    });
    void refreshAnalytics();
    setIsLoadingStrategy(false);
  }

  async function refreshAnalytics() {
    if (!isValidCampaignId) {
      setAnalyticsError("Select a campaign to view analytics.");
      setAnalyticsStatus(400);
      return;
    }
    const result = await getCampaignAnalytics(campaignId);
    setCampaignAnalytics(result.data);
    setLastUpdated(new Date().toLocaleTimeString());
    setAnalyticsError(result.error);
    setAnalyticsStatus(result.status ?? null);
    setAnalyticsRequestId(result.requestId ?? null);
  }

  useEffect(() => {
    if (!campaign || !recommendation) {
      return;
    }
    recommendation.recommendations.slice(0, 10).forEach((rec) => {
      void logAnalyticsEvent({
        event_type: "influencer_viewed",
        campaign_id: campaign.id,
        influencer_id: rec.influencer_id,
      });
    });
  }, [campaign, recommendation]);

  if (isCampaignLoading && !campaign) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-80" />
          </CardHeader>
          <CardBody>
            <div className="grid gap-4 md:grid-cols-4">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="space-y-6">
        <EmptyState
          title="Campaign unavailable"
          description={
            campaignStatus === 404 && sessionActive
              ? "This campaign does not belong to the active tenant."
              : campaignError
              ? friendlyErrorMessage(campaignError, campaignStatus)
              : "This campaign does not exist or is still loading."
          }
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Link
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                href="/campaigns"
              >
                Back to campaigns
              </Link>
              {campaignStatus === 404 && sessionActive ? (
                <button
                  type="button"
                  onClick={() => {
                    void bootstrapDemoSession().then(() => router.push("/campaigns"));
                  }}
                  className="rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  Switch to demo tenant
                </button>
              ) : null}
              {campaignStatus === 401 ? (
                <button
                  type="button"
                  onClick={() => {
                    void bootstrapDemoSession().then(() => router.push("/campaigns"));
                  }}
                  className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700"
                >
                  Start demo session
                </button>
              ) : null}
            </div>
          }
        />
        {campaignStatus === 404 && sessionActive ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
            Active tenant: {tenantId ?? "unknown"} • Campaign ID: {campaignId}
          </div>
        ) : null}
      </div>
    );
  }

  const tenantMismatch = campaignStatus === 404 && sessionActive;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="info">Campaign</Badge>
            <h2 className="text-2xl font-semibold text-slate-900">
              {campaign.brand_name}
            </h2>
            <Badge variant="neutral">Tenant: {tenantId ?? "unknown"}</Badge>
          </div>
          <p className="text-sm text-slate-500">
            {campaign.description}
          </p>
        </CardHeader>
        <CardBody>
          <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
            <span>Last updated: {campaignLastUpdated ?? "—"}</span>
          </div>
          {campaignError ? (
            <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">
              <p>{friendlyErrorMessage(campaignError, campaignStatus)}</p>
              {campaignRequestId ? (
                <p className="mt-1 text-[11px] text-rose-600">
                  Request ID: {campaignRequestId}
                </p>
              ) : null}
            </div>
          ) : null}
          {isCampaignLoading ? (
            <div className="grid gap-4 md:grid-cols-4">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-4">
              <SummaryItem label="Goal" value={campaign.goal} />
              <SummaryItem label="Region" value={campaign.target_region} />
              <SummaryItem label="Age Range" value={campaign.target_age_range} />
              <SummaryItem
                label="Budget"
                value={`$${campaign.budget.toLocaleString()}`}
              />
            </div>
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

      {activeTab === "analytics" ? (
        <Card>
          <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Campaign analytics</h3>
              <p className="text-sm text-slate-500">
                Tenant-scoped KPIs for this campaign.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>Last updated: {lastUpdated ?? "—"}</span>
              <Button variant="ghost" onClick={refreshAnalytics}>
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            {campaignAnalytics ? (
              <div className="grid gap-4 md:grid-cols-3">
                <SummaryItem
                  label="Total events"
                  value={campaignAnalytics.total_events.toString()}
                />
                <SummaryItem
                  label="Recommendations"
                  value={campaignAnalytics.total_recommendations.toString()}
                />
                <SummaryItem
                  label="CTR"
                  value={`${campaignAnalytics.ctr.toFixed(2)}%`}
                />
                <SummaryItem
                  label="Spend"
                  value={`$${campaignAnalytics.spend.toLocaleString()}`}
                />
                <SummaryItem
                  label="Revenue"
                  value={`$${campaignAnalytics.revenue.toLocaleString()}`}
                />
                <SummaryItem
                  label="ROI"
                  value={`${campaignAnalytics.roi.toFixed(2)}%`}
                />
              </div>
            ) : (
              <EmptyState
                title="No analytics yet"
                description={
                  analyticsError ??
                  "Generate recommendations or strategy to populate KPIs."
                }
              />
            )}
            {analyticsError ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">
                <p>{friendlyErrorMessage(analyticsError, analyticsStatus)}</p>
                {analyticsRequestId ? (
                  <p className="mt-1 text-[11px] text-rose-600">
                    Request ID: {analyticsRequestId}
                  </p>
                ) : null}
              </div>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {activeTab === "recommendations" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold">Recommendations</h3>
                <p className="text-sm text-slate-500">
                  Weighted ranker output from AI service.
                </p>
              </div>
              <Button
                onClick={handleRecommendation}
                disabled={!sessionActive || tenantMismatch || isLoadingRecs}
                title={
                  !sessionActive
                    ? "Paste JWT + tenant id in Settings to run recommendations."
                    : tenantMismatch
                    ? "Campaign does not belong to the active tenant."
                    : undefined
                }
              >
                {isLoadingRecs
                  ? "Running..."
                  : t("action_run_recommendation")}
              </Button>
            </CardHeader>
            <CardBody>
              {lastRecommendationAt ? (
                <p className="mb-3 text-xs text-slate-500">
                  Last generated {formatRelativeTime(lastRecommendationAt)}
                </p>
              ) : null}
              {isLoadingRecs ? (
                <div className="grid gap-3">
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                </div>
              ) : recommendation ? (
                <div className="grid gap-3">
                  {recommendation.recommendations.map((rec, index) => (
                    <div
                      key={rec.influencer_id}
                      className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          #{index + 1} {rec.influencer_id}
                        </p>
                        <p className="text-xs text-slate-500">
                          Influencer reference • {campaign?.target_region ?? "Region"}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {rec.reasons.slice(0, 3).map((reason) => (
                            <Badge key={reason} variant="neutral">
                              {reason}
                            </Badge>
                          ))}
                          <Badge variant="info">
                            Confidence {scoreToConfidence(rec.score)}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">
                          Score {rec.score.toFixed(3)}
                        </p>
                        <p className="text-xs text-slate-500">Ranked signal</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title={t("empty_recommendations_title")}
                  description={t("empty_recommendations_desc")}
                />
              )}
              {error && activeTab === "recommendations" ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">
                  <p>{friendlyErrorMessage(error, errorStatus)}</p>
                  {errorRequestId ? (
                    <p className="mt-1 text-[11px] text-rose-600">
                      Request ID: {errorRequestId}
                    </p>
                  ) : null}
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
              <Button
                onClick={handleStrategy}
                disabled={!sessionActive || tenantMismatch || isLoadingStrategy || !recommendation}
                title={
                  !sessionActive
                    ? "Paste JWT + tenant id in Settings to run strategy."
                    : tenantMismatch
                    ? "Campaign does not belong to the active tenant."
                    : !recommendation
                    ? "Generate recommendations first."
                    : undefined
                }
              >
                {isLoadingStrategy
                  ? "Generating..."
                  : t("action_generate_strategy_button")}
              </Button>
            </CardHeader>
            <div className="px-6 text-xs text-slate-500">
              Estimated 8-12s • Agent trace enabled
            </div>
            <CardBody>
              {lastStrategyAt ? (
                <p className="mb-3 text-xs text-slate-500">
                  Last generated {formatRelativeTime(lastStrategyAt)}
                </p>
              ) : null}
              {!sessionActive ? (
                <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
                  Session missing. Paste JWT + tenant id in Settings to run strategy.
                </div>
              ) : null}
              {isLoadingStrategy ? (
                <Skeleton className="h-56" />
              ) : strategy ? (
                <div className="space-y-4 text-sm text-slate-600">
                  <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                    <StrategyRow label="Goals" value={campaign.goal} />
                    <StrategyRow
                      label="Target Audience"
                      value={`${campaign.target_region} • ${campaign.target_age_range}`}
                    />
                    <StrategyRow
                      label="Channels"
                      value={recommendation ? "Influencer-led social content" : "Influencer-led social"}
                    />
                    <StrategyRow
                      label="Timeline"
                      value="3-phase rollout (tease → launch → retarget)"
                    />
                  </div>
                  {strategy.reply ? (
                    <div className="whitespace-pre-wrap">{strategy.reply}</div>
                  ) : null}
                  {strategyRaw ? (
                    <pre className="rounded-2xl bg-slate-900 p-4 text-xs text-slate-100">
{strategyRaw}
                    </pre>
                  ) : null}
                </div>
              ) : (
                <EmptyState
                  title={t("empty_strategy_title")}
                  description={t("empty_strategy_desc")}
                />
              )}
              {error ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">
                  <p>{friendlyErrorMessage(error, errorStatus)}</p>
                  {errorRequestId ? (
                    <p className="mt-1 text-[11px] text-rose-600">
                      Request ID: {errorRequestId}
                    </p>
                  ) : null}
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

      {activeTab === "activity" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Activity feed</h3>
              <p className="text-sm text-slate-500">
                Actions captured during this session.
              </p>
            </CardHeader>
            <CardBody>
              <ActivityFeed campaignId={campaign.id} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Strategy snapshot</h3>
              <p className="text-sm text-slate-500">Latest strategy response.</p>
            </CardHeader>
            <CardBody>
              <pre className="max-h-72 overflow-auto rounded-2xl bg-slate-900 p-4 text-xs text-slate-100">
{strategy ? JSON.stringify(strategy, null, 2) : "No strategy response"}
              </pre>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
                <p className="font-semibold text-slate-700">Model status</p>
                <p>
                  {modelStatus
                    ? `${modelStatus.model_name} • ${modelStatus.version}`
                    : "Connect /v1/model/status"}
                </p>
                <p>Status: {modelStatus?.status ?? "unknown"}</p>
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

function ActivityFeed({ campaignId }: { campaignId: string }) {
  const [items, setItems] = useState<Array<{ title: string; detail: string; time: string }>>([]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const raw = window.localStorage.getItem("nivoxai_activity");
    if (!raw) {
      return;
    }
    try {
      const list = JSON.parse(raw) as Array<{
        title: string;
        detail: string;
        time: string;
        campaignId?: string;
      }>;
      setItems(list.filter((item) => item.campaignId === campaignId));
    } catch {
      // ignore
    }
  }, [campaignId]);

  if (!items.length) {
    return (
      <EmptyState
        title="No activity yet"
        description="Generate recommendations or a strategy to populate this feed."
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={`${item.title}-${index}`}
          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3"
        >
          <div>
            <p className="text-sm font-semibold text-slate-900">{item.title}</p>
            <p className="text-xs text-slate-500">{item.detail}</p>
          </div>
          <span className="text-xs text-slate-400">{item.time}</span>
        </div>
      ))}
    </div>
  );
}

function friendlyErrorMessage(message: string, status: number | null) {
  if (status === 401) {
    return "Session missing. Start a demo session to continue.";
  }
  if (status === 403) {
    return "Tenant mismatch or forbidden: check tenant id in Settings.";
  }
  if (status === 404) {
    return "Campaign not found for this tenant.";
  }
  return message;
}

function scoreToConfidence(score: number) {
  if (score >= 0.8) {
    return "High";
  }
  if (score >= 0.5) {
    return "Medium";
  }
  return "Low";
}

function formatRelativeTime(iso: string) {
  const deltaMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(1, Math.round(deltaMs / 60000));
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}

function StrategyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
        {label}
      </span>
      <span className="text-xs font-semibold text-slate-700">{value}</span>
    </div>
  );
}
