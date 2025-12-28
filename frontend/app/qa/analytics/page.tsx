"use client";

import { useEffect, useState } from "react";
import { Activity, BarChart3, RefreshCcw, Zap } from "lucide-react";
import { requestJson } from "@/lib/apiClient";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import JsonPanel from "@/components/ui/JsonPanel";
import { useI18n } from "@/i18n";

type AnalyticsSummary = {
  total_events: number;
  total_recommendations: number;
  top_goals: { goal: string; count: number }[];
  lastUpdatedAt?: string;
};

type CampaignAnalytics = {
  campaign_id: string;
  total_events: number;
  total_recommendations: number;
  impressions: number;
  clicks: number;
  ctr: number;
  spend: number;
  revenue: number;
  roi: number;
  lastUpdatedAt?: string;
};

type AnalyticsEvent = {
  id: string;
  created_at: string;
  event_type: string;
  campaign_id?: string | null;
  influencer_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

export default function QAAnalyticsPage() {
  const { t } = useI18n();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [campaignId, setCampaignId] = useState("");
  const [campaignAnalytics, setCampaignAnalytics] = useState<CampaignAnalytics | null>(null);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [eventType, setEventType] = useState<string>("");

  const loadSummary = async () => {
    const result = await requestJson<AnalyticsSummary>("/api/analytics/summary");
    if (result.error) {
      setError(result.error);
      return;
    }
    setSummary(result.data);
  };

  const loadCampaignAnalytics = async () => {
    if (!campaignId) {
      setCampaignAnalytics(null);
      return;
    }
    const result = await requestJson<CampaignAnalytics>(
      `/api/analytics/campaign/${campaignId}`
    );
    if (result.error) {
      setError(result.error);
      return;
    }
    setCampaignAnalytics(result.data);
  };

  const loadEvents = async () => {
    const search = new URLSearchParams();
    if (eventType) {
      search.set("event_type", eventType);
    }
    if (campaignId) {
      search.set("campaign_id", campaignId);
    }
    const result = await requestJson<{ events: AnalyticsEvent[] }>(
      `/api/analytics/events?${search.toString()}`
    );
    if (result.error) {
      setError(result.error);
      return;
    }
    setEvents(result.data?.events ?? []);
  };

  const fireTestEvent = async () => {
    const result = await requestJson("/api/analytics/event", {
      method: "POST",
      body: JSON.stringify({
        event_type: "qa_test_event",
        campaign_id: campaignId || null,
        metadata: { source: "qa-console" },
      }),
    });
    if (result.error) {
      setError(result.error);
      return;
    }
    await loadEvents();
  };

  useEffect(() => {
    loadSummary();
    loadEvents();
  }, []);

  return (
    <div className="space-y-6 px-6 py-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
          {t("qa_console_label")}
        </p>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
          <BarChart3 className="h-6 w-6 text-slate-700" />
          {t("nav_qa_analytics")}
        </h1>
        <p className="text-sm text-slate-600">{t("qa_analytics_desc")}</p>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button onClick={loadSummary} className="w-full sm:w-auto">
          <span className="flex items-center gap-2">
            <RefreshCcw className="h-4 w-4" />
            {t("action_refresh")}
          </span>
        </Button>
        <Button variant="ghost" onClick={loadEvents} className="w-full sm:w-auto">
          <span className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            {t("action_refresh")}
          </span>
        </Button>
        <Button variant="ghost" onClick={fireTestEvent} className="w-full sm:w-auto">
          <span className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            {t("action_fire_test_event")}
          </span>
        </Button>
      </div>

      {error ? <p className="text-xs text-rose-600">{error}</p> : null}

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">{t("qa_analytics_summary")}</h3>
          <p className="text-sm text-slate-500">{t("qa_analytics_summary_desc")}</p>
        </CardHeader>
        <CardBody className="grid gap-4 md:grid-cols-3 text-sm text-slate-600">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              {t("qa_analytics_total_events")}
            </p>
            <p className="text-xl font-semibold text-slate-900">
              {summary?.total_events ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              {t("qa_analytics_recommendations")}
            </p>
            <p className="text-xl font-semibold text-slate-900">
              {summary?.total_recommendations ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              {t("qa_analytics_top_goals")}
            </p>
            <p className="text-xl font-semibold text-slate-900">
              {summary?.top_goals?.length ?? 0}
            </p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">{t("qa_analytics_campaign")}</h3>
          <p className="text-sm text-slate-500">{t("qa_analytics_campaign_desc")}</p>
        </CardHeader>
        <CardBody className="space-y-3">
          <input
            value={campaignId}
            onChange={(event) => setCampaignId(event.target.value)}
            placeholder={t("qa_analytics_campaign_placeholder")}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
          />
          <Button onClick={loadCampaignAnalytics} className="w-full sm:w-auto">
            {t("qa_analytics_load_campaign")}
          </Button>
          {campaignAnalytics ? (
            <JsonPanel
              title={t("qa_analytics_campaign")}
              data={campaignAnalytics}
              defaultOpen
            />
          ) : (
            <p className="text-xs text-slate-500">{t("empty_no_results")}</p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">{t("qa_analytics_events")}</h3>
          <p className="text-sm text-slate-500">{t("qa_analytics_events_desc")}</p>
        </CardHeader>
        <CardBody className="space-y-3 text-sm text-slate-600">
          <div className="grid gap-2 md:grid-cols-2">
            <input
              value={eventType}
              onChange={(event) => setEventType(event.target.value)}
              placeholder={t("qa_filter_event_type")}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
            />
            <input
              value={campaignId}
              onChange={(event) => setCampaignId(event.target.value)}
              placeholder={t("qa_filter_campaign_id")}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
            />
          </div>
          <div className="max-h-72 overflow-auto space-y-2">
            {events.map((event) => (
              <div key={event.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">{event.event_type}</span>
                  <span className="text-slate-500">{event.created_at}</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {t("qa_analytics_campaign_label")}: {event.campaign_id ?? "—"} •{" "}
                  {t("qa_analytics_influencer_label")}: {event.influencer_id ?? "—"}
                </p>
                <div className="mt-2">
                  <JsonPanel
                    title={t("qa_analytics_event_metadata")}
                    data={event.metadata ?? {}}
                  />
                </div>
              </div>
            ))}
            {!events.length ? (
              <p className="text-xs text-slate-500">{t("qa_analytics_events_empty")}</p>
            ) : null}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
