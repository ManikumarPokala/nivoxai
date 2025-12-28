"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import {
  getAgentStatus,
  getHealthAI,
  getHealthAPI,
  getModelStatus,
  loginDemo,
  type AgentStatus,
  type ModelStatus,
} from "@/lib/api";
import { requestJson } from "@/lib/apiClient";
import { AI_BASE_URL, API_BASE_URL } from "@/lib/urls";
import { useI18n } from "@/lib/i18n";
import {
  clearAuthToken,
  clearStoredTenantId,
  decodeToken,
  getAuthToken,
  getStoredTenantId,
  getTokenRole,
  getTokenTenant,
  isTokenExpired,
  setAuthSession,
  subscribeAuth,
} from "@/lib/auth";
import { pushToast } from "@/lib/toast";

export default function SettingsPage() {
  const { t } = useI18n();
  const [aiHealth, setAiHealth] = useState<{ status: string } | null>(null);
  const [apiHealth, setApiHealth] = useState<{ status: string } | null>(null);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [tokenInput, setTokenInput] = useState<string>(getAuthToken() ?? "");
  const [tenantInput, setTenantInput] = useState<string>(getStoredTenantId() ?? "");
  const [loginEmail, setLoginEmail] = useState("admin@nivoxai.local");
  const [loginPassword, setLoginPassword] = useState("demo");

  useEffect(() => {
    let active = true;
    getHealthAI().then((result) => {
      if (active) {
        setAiHealth(result.data);
      }
    });
    getHealthAPI().then((result) => {
      if (active) {
        setApiHealth(result.data);
      }
    });
    getModelStatus().then((result) => {
      if (active) {
        setModelStatus(result.data);
        setLastChecked(new Date().toLocaleTimeString());
      }
    });
    getAgentStatus().then((result) => {
      if (active) {
        setAgentStatus(result.data);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const unsub = subscribeAuth((value) => setToken(value));
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    if (token !== null) {
      setTokenInput(token);
      if (!tenantInput) {
        const derivedTenant = getTokenTenant();
        if (derivedTenant) {
          setTenantInput(derivedTenant);
        }
      }
    }
  }, [token, tenantInput]);

  const tokenPayload = decodeToken(token);
  const tokenExpired = isTokenExpired(tokenPayload);
  const role = getTokenRole();
  const tenantId = getTokenTenant();
  const storedTenantId = getStoredTenantId();
  const sessionActive = Boolean(token && storedTenantId);

  async function handleLogin() {
    const result = await loginDemo(loginEmail, loginPassword);
    if (!result.data?.token || !result.data?.tenant_id) {
      pushToast({ title: "Login failed", description: result.error ?? "Auth failed.", variant: "error" });
      return;
    }
    const sessionResponse = await requestJson("/api/session", {
      method: "POST",
      body: JSON.stringify(result.data),
    });
    if (sessionResponse.error) {
      pushToast({ title: "Session failed", description: "Could not persist session.", variant: "error" });
      return;
    }
    setAuthSession(result.data.token, result.data.tenant_id);
    setTokenInput(result.data.token);
    setTenantInput(result.data.tenant_id);
    pushToast({ title: "Session active", description: "Demo session updated.", variant: "success" });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
            {t("nav_settings")}
          </p>
          <h2 className="text-xl font-semibold">{t("page_settings_title")}</h2>
          <p className="text-sm text-slate-500">
            Validate service connectivity for demos and workshops.
          </p>
        </CardHeader>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">AI Service</h3>
            <p className="text-sm text-slate-500">{AI_BASE_URL}</p>
          </CardHeader>
          <CardBody className="flex items-center gap-2">
            <Badge variant={aiHealth ? "success" : "warning"}>
              {aiHealth ? t("status_available") : t("status_unavailable")}
            </Badge>
            <span className="text-sm text-slate-500">
              {aiHealth ? "AI endpoints responding." : "Check AI service."}
            </span>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">API Gateway</h3>
            <p className="text-sm text-slate-500">{API_BASE_URL}</p>
          </CardHeader>
          <CardBody className="flex items-center gap-2">
            <Badge variant={apiHealth ? "success" : "warning"}>
              {apiHealth ? t("status_available") : t("status_unavailable")}
            </Badge>
            <span className="text-sm text-slate-500">
              {apiHealth ? "API endpoints responding." : "Check API gateway."}
            </span>
          </CardBody>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Session & Auth (Demo / Dev)</h3>
            <p className="text-sm text-slate-500">
              Paste a demo JWT and tenant id for tenant-scoped calls.
            </p>
          </CardHeader>
          <CardBody className="space-y-4">
            {sessionActive ? (
              <div className="inline-flex w-fit items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Session Active
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Missing session. Paste a JWT and tenant id to unlock tenant-scoped actions.
              </div>
            )}
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                JWT Token
              </label>
              <p className="mt-1 text-[11px] text-slate-500">
                Paste the full token string (no “Bearer ” prefix).
              </p>
              <textarea
                value={tokenInput}
                onChange={(event) => setTokenInput(event.target.value)}
                rows={4}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
              />
              <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Tenant ID (optional)
              </label>
              <input
                value={tenantInput}
                onChange={(event) => setTenantInput(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                placeholder="tenant_a"
              />
              <div className="mt-2 flex gap-2">
                <Button
                  onClick={async () => {
                    const nextToken = tokenInput.trim();
                    const derivedTenant = decodeToken(nextToken)?.tenant_id ?? null;
                    const nextTenant = tenantInput.trim() || derivedTenant || "";
                    if (!nextToken || !nextTenant) {
                      pushToast({
                        title: "Missing session data",
                        description: "Both JWT and tenant id are required.",
                        variant: "error",
                      });
                      return;
                    }
                    const response = await requestJson("/api/session", {
                      method: "POST",
                      body: JSON.stringify({ token: nextToken, tenant_id: nextTenant, role }),
                    });
                    if (response.error) {
                      pushToast({
                        title: "Session failed",
                        description: "Could not persist session.",
                        variant: "error",
                      });
                      return;
                    }
                    setAuthSession(nextToken, nextTenant);
                    setTenantInput(nextTenant);
                  }}
                >
                  Save session
                </Button>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    await requestJson("/api/session", { method: "DELETE" });
                    clearAuthToken();
                    clearStoredTenantId();
                    setTokenInput("");
                    setTenantInput("");
                  }}
                >
                  Clear token
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
              <p className="font-semibold text-slate-700">Token status</p>
              <p>Present: {token ? "Yes" : "No"}</p>
              <p>Expired: {tokenExpired ? "Yes" : "No"}</p>
              <p>Role: {role ?? "—"}</p>
              <p>Tenant: {tenantId ?? "—"}</p>
              <p>Stored tenant: {storedTenantId ?? "—"}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Demo login
              </p>
              <div className="mt-3 grid gap-2">
                <input
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  placeholder="Email"
                />
                <input
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  placeholder="Password"
                  type="password"
                />
                <Button onClick={handleLogin}>Login & Save</Button>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">System Status</h3>
            <p className="text-sm text-slate-500">
              Health, latency, and model metadata.
            </p>
          </CardHeader>
          <CardBody className="space-y-3 text-sm text-slate-600">
            <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs">
              <p className="font-semibold text-slate-700">Model</p>
              <p>{modelStatus ? `${modelStatus.model_name} • ${modelStatus.version}` : "—"}</p>
              <p>Status: {modelStatus?.status ?? "unknown"}</p>
              <p>Last checked: {lastChecked ?? "—"}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs">
              <p className="font-semibold text-slate-700">Agent</p>
              <p>Last run: {agentStatus?.last_run_at ?? "—"}</p>
              <p>Last error: {agentStatus?.last_error ?? "None"}</p>
            </div>
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
