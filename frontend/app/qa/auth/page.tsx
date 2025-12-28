"use client";

import { useEffect, useState } from "react";
import { requestJson } from "@/lib/apiClient";

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

  return (
    <div className="space-y-6 px-6 py-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">QA Console</p>
        <h1 className="text-2xl font-semibold text-slate-900">Auth & Session</h1>
        <p className="text-sm text-slate-600">
          Inspect cookie-backed session state and decoded JWT claims.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={refreshSession}
          className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600"
        >
          Refresh session
        </button>
        <button
          onClick={startDemo}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm text-white"
        >
          Start demo session
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Session</p>
            <span className="text-xs text-slate-500">{status}</span>
          </div>
          {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
          {session ? (
            <div className="mt-3 space-y-1 text-xs">
              <p>tenant_id: {session.tenant_id ?? "missing"}</p>
              <p>role: {session.role ?? "missing"}</p>
              <p>token: {session.token ? "present" : "missing"}</p>
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-500">No session stored.</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Decoded JWT</p>
          <pre className="mt-3 max-h-56 overflow-auto rounded-lg bg-slate-50 p-2 text-[11px] text-slate-700">
            {decoded ? JSON.stringify(decoded, null, 2) : "No token decoded."}
          </pre>
        </div>
      </div>
    </div>
  );
}
