"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { getAnalyticsSummary, type AnalyticsSummary } from "@/lib/analytics";
import { getHealthAI, getHealthAPI, getModelStatus, type ModelStatus } from "@/lib/api";
import { demoCampaigns } from "@/lib/demo-data";
import { useI18n } from "@/lib/i18n";

const recentActivity = [
  {
    title: "Recommendations generated",
    detail: "Luma Beauty • 12 influencers ranked",
    time: "2 min ago",
  },
  {
    title: "Strategy draft updated",
    detail: "Pulse Activewear • Phase 2 launch",
    time: "48 min ago",
  },
  {
    title: "RAG discovery query",
    detail: "Southeast Asia skincare creators",
    time: "3 hours ago",
  },
];

export default function DashboardPage() {
  const { t } = useI18n();
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [modelStatusError, setModelStatusError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [aiHealth, setAiHealth] = useState<boolean | null>(null);
  const [apiHealth, setApiHealth] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    const updateModelStatus = async () => {
      const result = await getModelStatus();
      if (!active) {
        return;
      }
      setModelStatus(result.data);
      setModelStatusError(result.error);
      setLastChecked(new Date().toLocaleTimeString());
    };

    getAnalyticsSummary().then((result) => {
      if (!active) {
        return;
      }
      setAnalytics(result.data);
      setAnalyticsError(result.error);
    });
    void updateModelStatus();
    const interval = setInterval(updateModelStatus, 30_000);
    getHealthAI().then((result) => {
      if (active) {
        setAiHealth(Boolean(result.data));
      }
    });
    getHealthAPI().then((result) => {
      if (active) {
        setApiHealth(Boolean(result.data));
      }
    });
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const modelStatusLabel = modelStatus?.status ?? "offline";
  const modelBadgeVariant =
    modelStatusLabel === "online"
      ? "success"
      : modelStatusLabel === "degraded"
      ? "warning"
      : "neutral";

  return (
    <div className="space-y-8">
      <section className="grid gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Active Campaigns
            </p>
            <h2 className="text-2xl font-semibold text-slate-900">
              {demoCampaigns.length}
            </h2>
          </CardHeader>
          <CardBody className="text-sm text-slate-500">
            Across core markets and seasonal launches.
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Recommendations
            </p>
            <h2 className="text-2xl font-semibold text-slate-900">
              {analytics?.total_recommendations ?? "—"}
            </h2>
          </CardHeader>
          <CardBody className="text-sm text-slate-500">
            {analyticsError
              ? "Connect analytics endpoint."
              : "Generated across all campaigns."}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Total Events
            </p>
            <h2 className="text-2xl font-semibold text-slate-900">
              {analytics?.total_events ?? "—"}
            </h2>
          </CardHeader>
          <CardBody className="text-sm text-slate-500">
            Attribution-ready tracking signals.
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Model Status
            </p>
            <h2 className="text-xl font-semibold text-slate-900">
              {modelStatus
                ? modelStatus.status === "online"
                  ? "Online"
                  : modelStatus.status === "degraded"
                  ? "Degraded"
                  : "Offline"
                : "Unknown"}
            </h2>
          </CardHeader>
          <CardBody className="space-y-2 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <Badge variant={modelBadgeVariant}>
                {modelStatus
                  ? `${modelStatus.model_name} • ${modelStatus.version}`
                  : "Connect AI service"}
              </Badge>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      aiHealth ? "bg-emerald-500" : "bg-amber-400"
                    }`}
                  />
                  AI
                </span>
                <span className="flex items-center gap-1">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      apiHealth ? "bg-emerald-500" : "bg-amber-400"
                    }`}
                  />
                  API
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Last checked: {lastChecked ?? "—"}
            </p>
            {modelStatusLabel === "offline" || modelStatusError ? (
              <p className="text-xs font-semibold text-rose-600">
                AI service unreachable. Check logs.
              </p>
            ) : null}
          </CardBody>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Recent Activity
            </p>
            <h3 className="text-lg font-semibold text-slate-900">
              {t("page_dashboard_title")}
            </h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {recentActivity.map((item) => (
                <div
                  key={item.title}
                  className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200/70 bg-white px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {item.title}
                    </p>
                    <p className="text-xs text-slate-500">{item.detail}</p>
                  </div>
                  <span className="text-xs text-slate-400">{item.time}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Quick Actions
            </p>
            <h3 className="text-lg font-semibold text-slate-900">
              Campaign-first workflow
            </h3>
          </CardHeader>
          <CardBody className="space-y-3">
            <Link
              href="/campaigns"
              className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              {t("action_create_campaign")}
              <span className="text-slate-400">→</span>
            </Link>
            <Link
              href="/discovery"
              className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              {t("action_discover")}
              <span className="text-slate-400">→</span>
            </Link>
            <Link
              href="/campaigns/camp-demo-001"
              className="flex items-center justify-between rounded-2xl border border-slate-900 bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              {t("action_generate_strategy")}
              <span className="text-white/70">→</span>
            </Link>
            <Link
              href="/analytics"
              className="flex items-center justify-center rounded-full border border-transparent px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-200 hover:bg-slate-100"
            >
              View analytics
            </Link>
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
