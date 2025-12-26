"use client";

import Link from \"next/link\";
import { useEffect, useState } from \"react\";
import { Card, CardBody, CardHeader } from \"@/components/ui/Card\";
import Badge from \"@/components/ui/Badge\";
import { getAnalyticsSummary, type AnalyticsSummary } from \"@/lib/analytics\";
import { getModelStatus, type ModelStatus } from \"@/lib/api\";
import { demoCampaigns } from \"@/lib/demo-data\";
import { useI18n } from \"@/lib/i18n\";

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
    detail: "\"Southeast Asia skincare creators\"",
    time: "3 hours ago",
  },
];

export default function DashboardPage() {
  const { t } = useI18n();
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);

  useEffect(() => {
    let active = true;
    getAnalyticsSummary().then((result) => {
      if (!active) {
        return;
      }
      setAnalytics(result.data);
      setAnalyticsError(result.error);
    });
    getModelStatus().then((result) => {
      if (!active) {
        return;
      }
      setModelStatus(result.data);
    });
    return () => {
      active = false;
    };
  }, []);

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
              {modelStatus ? "Operational" : "Unknown"}
            </h2>
          </CardHeader>
          <CardBody className="flex items-center gap-2 text-sm text-slate-500">
            <Badge variant={modelStatus ? "success" : "warning"}>
              {modelStatus?.model_version ?? "Connect AI service"}
            </Badge>
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
