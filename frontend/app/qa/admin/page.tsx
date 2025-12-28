"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
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
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">QA Console</p>
        <h1 className="text-2xl font-semibold text-slate-900">Admin Guardrails</h1>
        <p className="text-sm text-slate-600">
          Demo mode enforces rate limits and requires an admin key for protected actions.
        </p>
      </header>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Demo admin key check</h3>
          <p className="text-sm text-slate-500">GET /api/admin/ping</p>
        </CardHeader>
        <CardBody className="space-y-3 text-sm text-slate-600">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
            Demo mode blocks seed/reset/retrain unless an admin key is supplied via
            <span className="font-semibold"> x-demo-admin-key</span>.
          </div>
          <input
            value={demoKey}
            onChange={(event) => setDemoKey(event.target.value)}
            placeholder="DEMO_ADMIN_KEY"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
          />
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            I understand this is a protected admin action.
          </label>
          <Button onClick={runAdminPing} disabled={!confirmed}>
            <span className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              {t("action_verify_admin")}
            </span>
          </Button>
          {result ? <p className="text-xs text-emerald-600">status: {result}</p> : null}
          {error ? <p className="text-xs text-rose-600">{error}</p> : null}
        </CardBody>
      </Card>
    </div>
  );
}
