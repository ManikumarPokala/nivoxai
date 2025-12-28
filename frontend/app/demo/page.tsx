"use client";

import Link from "next/link";
import { useState } from "react";
import { PlayCircle } from "lucide-react";
import { requestJson } from "@/lib/apiClient";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useI18n } from "@/i18n";

export default function DemoPage() {
  const { t } = useI18n();
  const [status, setStatus] = useState<string | null>(null);

  const startDemo = async () => {
    const result = await requestJson("/api/auth/demo", { method: "POST" });
    setStatus(
      result.error
        ? `${t("demo_session_failed")}: ${result.error}`
        : t("demo_session_active")
    );
  };

  return (
    <div className="space-y-6 px-6 py-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{t("demo_flow")}</p>
        <h1 className="text-2xl font-semibold text-slate-900">{t("demo_title")}</h1>
        <p className="text-sm text-slate-600">{t("demo_flow_desc")}</p>
      </header>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">
            {t("demo_step_prefix")} 1 — {t("demo_step_auth")}
          </h3>
          <p className="text-sm text-slate-500">{t("demo_step_auth_desc")}</p>
        </CardHeader>
        <CardBody className="space-y-3">
          <Button onClick={startDemo} className="w-full sm:w-auto">
            <span className="flex items-center gap-2">
              <PlayCircle className="h-4 w-4" />
              {t("demo_start_session")}
            </span>
          </Button>
          {status ? <p className="text-xs text-slate-500">{status}</p> : null}
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">
              {t("demo_step_prefix")} 2 — {t("demo_step_campaigns")}
            </h3>
            <p className="text-sm text-slate-500">{t("demo_step_campaigns_desc")}</p>
          </CardHeader>
          <CardBody>
            <Link href="/qa/campaigns" className="text-sm font-semibold text-slate-700">
              {t("demo_link_campaigns")} →
            </Link>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">
              {t("demo_step_prefix")} 3 — {t("demo_step_recommend")}
            </h3>
            <p className="text-sm text-slate-500">{t("demo_step_recommend_desc")}</p>
          </CardHeader>
          <CardBody>
            <Link href="/qa/recommend" className="text-sm font-semibold text-slate-700">
              {t("demo_link_recommend")} →
            </Link>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">
              {t("demo_step_prefix")} 4 — {t("demo_step_agent")}
            </h3>
            <p className="text-sm text-slate-500">{t("demo_step_agent_desc")}</p>
          </CardHeader>
          <CardBody>
            <Link href="/qa/agent" className="text-sm font-semibold text-slate-700">
              {t("demo_link_agent")} →
            </Link>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">{t("demo_diagnostics")}</h3>
          <p className="text-sm text-slate-500">{t("demo_diagnostics_desc")}</p>
        </CardHeader>
        <CardBody>
          <Link href="/qa/ops" className="text-sm font-semibold text-slate-700">
            {t("demo_link_ops")} →
          </Link>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">{t("demo_signals_title")}</h3>
          <p className="text-sm text-slate-500">{t("demo_signals_desc")}</p>
        </CardHeader>
        <CardBody className="flex flex-wrap gap-3 text-sm">
          <Link href="/qa/ops" className="rounded-full border border-slate-200 px-3 py-2 text-slate-700">
            {t("demo_signals_diagnostics")}
          </Link>
          <Link href="/qa/rag" className="rounded-full border border-slate-200 px-3 py-2 text-slate-700">
            {t("demo_signals_rag")}
          </Link>
          <a
            href="https://github.com/manikumarpokala/nivoxai/blob/main/docs/SAFETY.md"
            className="rounded-full border border-slate-200 px-3 py-2 text-slate-700"
            target="_blank"
            rel="noreferrer"
          >
            {t("demo_signals_safety")}
          </a>
          <a
            href="https://github.com/manikumarpokala/nivoxai/actions/workflows/ci.yml"
            className="rounded-full border border-slate-200 px-3 py-2 text-slate-700"
          >
            {t("demo_signals_ci")}
          </a>
        </CardBody>
      </Card>
    </div>
  );
}
