"use client";

import { useEffect, useState } from "react";
import { KeyRound, PlayCircle, RefreshCcw } from "lucide-react";
import { requestJson } from "@/lib/apiClient";
import Button from "@/components/ui/Button";
import { useI18n } from "@/i18n";

type SessionData = {
  token?: string;
  tenant_id?: string;
  role?: string | null;
};

type DecodedToken = {
  sub?: string;
  tenant_id?: string;
  role?: string;
  exp?: number;
};

function decodeJwt(token: string): DecodedToken | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) {
      return null;
    }
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(normalized.padEnd(normalized.length + (4 - (normalized.length % 4)) % 4, "="));
    return JSON.parse(json) as DecodedToken;
  } catch {
    return null;
  }
}

export default function QAAuthPage() {
  const { t } = useI18n();
  const [session, setSession] = useState<SessionData | null>(null);
  const [decoded, setDecoded] = useState<DecodedToken | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const refreshSession = async () => {
    setStatus("loading");
    const result = await requestJson<SessionData | { session: null }>("/api/session");
    if (result.error) {
      setError(result.error);
      setStatus("error");
      return;
    }
    const data = result.data && "session" in result.data ? null : result.data;
    setSession(data);
    setDecoded(data?.token ? decodeJwt(data.token) : null);
    setError(null);
    setStatus("ready");
  };

  const startDemo = async () => {
    setStatus("loading");
    const result = await requestJson<SessionData>("/api/auth/demo", { method: "POST" });
    if (result.error) {
      setError(result.error);
      setStatus("error");
      return;
    }
    await refreshSession();
  };

  useEffect(() => {
    refreshSession();
  }, []);

  const statusLabel =
    status === "loading"
      ? t("status_loading")
      : status === "error"
        ? t("status_error")
        : status === "ready"
          ? t("status_available")
          : t("status_idle");

  return (
    <div className="space-y-6 px-6 py-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
          {t("qa_console_label")}
        </p>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
          <KeyRound className="h-6 w-6 text-slate-700" />
          {t("nav_qa_auth")}
        </h1>
        <p className="text-sm text-slate-600">{t("auth_desc")}</p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button onClick={refreshSession} variant="secondary" className="w-full sm:w-auto">
          <span className="flex items-center gap-2">
            <RefreshCcw className="h-4 w-4" />
            {t("auth_refresh")}
          </span>
        </Button>
        <Button onClick={startDemo} className="w-full sm:w-auto">
          <span className="flex items-center gap-2">
            <PlayCircle className="h-4 w-4" />
            {t("auth_start_demo")}
          </span>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              {t("diagnostics_session")}
            </p>
            <span className="text-xs text-slate-500">{statusLabel}</span>
          </div>
          {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
          {session ? (
            <div className="mt-3 space-y-1 text-xs">
              <p>
                {t("label_tenant")}: {session.tenant_id ?? t("status_unavailable")}
              </p>
              <p>
                {t("label_role")}: {session.role ?? t("status_unavailable")}
              </p>
              <p>
                {t("label_token_present")}:{" "}
                {session.token ? t("status_available") : t("status_unavailable")}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-500">{t("auth_no_session")}</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            {t("auth_decoded_jwt")}
          </p>
          <pre className="mt-3 max-h-56 overflow-auto rounded-lg bg-slate-50 p-2 text-[11px] text-slate-700">
            {decoded ? JSON.stringify(decoded, null, 2) : t("auth_no_token")}
          </pre>
        </div>
      </div>
    </div>
  );
}
