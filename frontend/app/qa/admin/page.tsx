"use client";

import { useState } from "react";
import { KeyRound, Lock } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { requestJson } from "@/lib/apiClient";
import { useI18n } from "@/i18n";

export default function QAAdminPage() {
  const { t } = useI18n();
  const [demoKey, setDemoKey] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAdminPing = async () => {
    setError(null);
    const response = await requestJson<{ status?: string }>("/api/admin/ping", {
      headers: demoKey ? { "x-demo-admin-key": demoKey } : undefined,
    });
    if (response.error) {
      setError(response.error);
      setResult(null);
      return;
    }
    setResult(response.data?.status ?? "ok");
  };

  return (
    <div className="space-y-6 px-6 py-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
          {t("qa_console_label")}
        </p>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
          <Lock className="h-6 w-6 text-slate-700" />
          {t("admin_guardrails_title")}
        </h1>
        <p className="text-sm text-slate-600">{t("admin_guardrails_desc")}</p>
      </header>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">{t("admin_guardrails_check_title")}</h3>
          <p className="text-sm text-slate-500">{t("admin_guardrails_check_desc")}</p>
        </CardHeader>
        <CardBody className="space-y-3 text-sm text-slate-600">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
            <p className="font-semibold">{t("admin_guardrails_title")}</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>{t("admin_guardrails_list_rates")}</li>
              <li>{t("admin_guardrails_list_protected")}</li>
              <li>{t("admin_guardrails_list_key")}</li>
            </ul>
            <p className="mt-2 text-[11px] text-amber-700">
              {t("admin_guardrails_key_hint")}
            </p>
          </div>
          <input
            value={demoKey}
            onChange={(event) => setDemoKey(event.target.value)}
            placeholder={t("admin_guardrails_input_placeholder")}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
          />
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            {t("admin_guardrails_confirm")}
          </label>
          <Button onClick={runAdminPing} disabled={!confirmed} className="w-full sm:w-auto">
            <span className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              {t("action_verify_admin")}
            </span>
          </Button>
          {result ? (
            <p className="text-xs text-emerald-600">
              {t("admin_guardrails_status_label")}: {result}
            </p>
          ) : null}
          {error ? <p className="text-xs text-rose-600">{error}</p> : null}
        </CardBody>
      </Card>
    </div>
  );
}
