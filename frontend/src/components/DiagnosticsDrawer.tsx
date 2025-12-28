"use client";

import { useEffect, useState } from "react";
import {
  getLastRequestError,
  getLastRequestLog,
  getRequestLogs,
  requestJson,
  subscribeRequestLogs,
  type RequestLog,
} from "@/lib/apiClient";
import { getAuthToken, getStoredTenantId } from "@/lib/auth";
import { API_BASE_URL, AI_BASE_URL } from "@/lib/urls";

type DiagnosticsDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export default function DiagnosticsDrawer({ open, onClose }: DiagnosticsDrawerProps) {
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [lastError, setLastError] = useState<RequestLog | null>(null);
  const [lastRequest, setLastRequest] = useState<RequestLog | null>(null);
  const [tokenPresent, setTokenPresent] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [cookieSession, setCookieSession] = useState<{
    tenant_id?: string;
    role?: string | null;
    token?: string;
  } | null>(null);

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // ignore clipboard failures
    }
  };

  const formatCurl = (log: RequestLog) => {
    const headerFlags = Object.entries(log.requestHeaders ?? {})
      .map(([key, value]) => `-H '${key}: ${value}'`)
      .join(" ");
    const body =
      log.requestBody && log.requestBody !== "[binary]" && log.requestBody !== "[form-data]"
        ? `-d '${JSON.stringify(log.requestBody)}'`
        : "";
    return `curl -i -X ${log.method} ${headerFlags} ${body} '${log.path}'`.trim();
  };

  useEffect(() => {
    if (!open) {
      return;
    }
    setLogs(getRequestLogs());
    setLastError(getLastRequestError());
    setLastRequest(getLastRequestLog());
    setTokenPresent(Boolean(getAuthToken()));
    setTenantId(getStoredTenantId());
    requestJson<{ tenant_id?: string; role?: string | null; token?: string } | { session: null }>(
      "/api/session"
    )
      .then((result) => {
        if (!result.data || "session" in result.data) {
          setCookieSession(null);
          return;
        }
        setCookieSession(result.data);
      })
      .catch(() => setCookieSession(null));
    const unsub = subscribeRequestLogs((items) => {
      setLogs(items);
      setLastError(getLastRequestError());
      setLastRequest(getLastRequestLog());
    });
    return () => {
      if (unsub) {
        unsub();
      }
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div className="h-full w-full max-w-md bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Diagnostics</p>
            <h3 className="text-lg font-semibold text-slate-900">Request Trace</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600"
          >
            Close
          </button>
        </div>

        <div className="space-y-4 px-5 py-4 text-sm">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Base URLs</p>
            <p className="mt-2 text-xs text-slate-600">API: {API_BASE_URL}</p>
            <p className="text-xs text-slate-600">AI: {AI_BASE_URL}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Session</p>
            <p className="mt-2">Token: {tokenPresent ? "present" : "missing"}</p>
            <p>Tenant: {tenantId ?? "not set"}</p>
            <p>
              Cookie session:{" "}
              {cookieSession?.tenant_id
                ? `${cookieSession.tenant_id} • ${cookieSession.role ?? "role"}`
                : "missing"}
            </p>
          </div>

          {lastError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
              <p className="font-semibold">Last error</p>
              <p className="mt-1">{lastError.error}</p>
              <p className="mt-1 text-[11px] text-rose-600">
                {lastError.method} {lastError.path} • {lastError.requestId ?? "no request id"}
              </p>
            </div>
          ) : null}

          {lastRequest ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Last request</p>
              <p className="mt-2 font-semibold text-slate-700">
                {lastRequest.method} {lastRequest.path}
              </p>
              <p>Status: {lastRequest.status || "ERR"}</p>
              <p>Latency: {lastRequest.durationMs}ms</p>
              <p>Tenant: {lastRequest.tenantId ?? "none"}</p>
              <p>Request ID: {lastRequest.requestId ?? "none"}</p>
              <div className="mt-2 space-y-2">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    Request headers
                  </p>
                  <pre className="mt-1 max-h-20 overflow-auto rounded-lg bg-slate-50 p-2 text-[11px] text-slate-700">
                    {JSON.stringify(lastRequest.requestHeaders ?? {}, null, 2)}
                  </pre>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    Response headers
                  </p>
                  <pre className="mt-1 max-h-20 overflow-auto rounded-lg bg-slate-50 p-2 text-[11px] text-slate-700">
                    {JSON.stringify(lastRequest.responseHeaders ?? {}, null, 2)}
                  </pre>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => copyText(formatCurl(lastRequest))}
                  className="rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600"
                >
                  Copy curl
                </button>
                <button
                  onClick={() => copyText(JSON.stringify(lastRequest.requestBody ?? {}, null, 2))}
                  className="rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600"
                >
                  Copy request JSON
                </button>
                <button
                  onClick={() => copyText(JSON.stringify(lastRequest.responseBody ?? {}, null, 2))}
                  className="rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600"
                >
                  Copy response JSON
                </button>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            {logs.length === 0 ? (
              <p className="text-xs text-slate-500">No requests captured yet.</p>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">
                      {log.method} {log.path}
                    </span>
                    <span className={log.status >= 400 ? "text-rose-600" : "text-emerald-600"}>
                      {log.status || "ERR"}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{log.durationMs}ms</span>
                    <span>{log.requestId ?? "no request id"}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    tenant: {log.tenantId ?? "none"}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      onClick={() => copyText(formatCurl(log))}
                      className="rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600"
                    >
                      Copy curl
                    </button>
                    <button
                      onClick={() => copyText(JSON.stringify(log.requestBody ?? {}, null, 2))}
                      className="rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600"
                    >
                      Req JSON
                    </button>
                    <button
                      onClick={() => copyText(JSON.stringify(log.responseBody ?? {}, null, 2))}
                      className="rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600"
                    >
                      Res JSON
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
