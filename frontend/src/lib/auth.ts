import { requestJson } from "@/lib/apiClient";

type TokenPayload = {
  sub?: string;
  tenant_id?: string;
  role?: string;
  exp?: number;
};
type AuthListener = (token: string | null) => void;
export type Unsubscribe = () => void;

const listeners = new Set<AuthListener>();

// Tenant is resolved from JWT claims; stored tenant id is used for explicit propagation and diagnostics.
export function getStoredTenantId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem("nivoxai_tenant_id");
}

export function setStoredTenantId(tenantId: string) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem("nivoxai_tenant_id", tenantId);
  notify();
}

export function clearStoredTenantId() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem("nivoxai_tenant_id");
  notify();
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem("nivoxai_jwt");
}

export function setAuthToken(token: string) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem("nivoxai_jwt", token);
  notify();
}

export function clearAuthToken() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem("nivoxai_jwt");
  notify();
}

export function setAuthSession(token: string, tenantId: string) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem("nivoxai_jwt", token);
  window.localStorage.setItem("nivoxai_tenant_id", tenantId);
  notify();
}

export async function syncSessionFromCookies() {
  if (typeof window === "undefined") {
    return null;
  }
  const result = await requestJson<{
    token?: string;
    tenant_id?: string;
    role?: string | null;
    session?: null;
  }>("/api/session", { method: "GET" });
  if (result.error || !result.data) {
    return null;
  }
  const data = result.data;
  if (!data?.token || !data?.tenant_id) {
    return null;
  }
  setAuthSession(data.token, data.tenant_id);
  return data;
}

export async function bootstrapDemoSession() {
  if (typeof window === "undefined") {
    return null;
  }
  const loginResult = await requestJson<{
    token?: string;
    tenant_id?: string;
    role?: string;
  }>("/api/auth/demo", { method: "POST" });
  if (loginResult.error || !loginResult.data) {
    return null;
  }
  const loginData = loginResult.data;
  if (!loginData.token || !loginData.tenant_id) {
    return null;
  }
  setAuthSession(loginData.token, loginData.tenant_id);
  return loginData;
}

export function decodeToken(token: string | null): TokenPayload | null {
  if (!token) {
    return null;
  }
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload as TokenPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(payload: TokenPayload | null): boolean {
  if (!payload?.exp) {
    return false;
  }
  return payload.exp * 1000 < Date.now();
}

export function getTokenRole(): string | null {
  const payload = decodeToken(getAuthToken());
  return payload?.role ?? null;
}

export function getTokenTenant(): string | null {
  const payload = decodeToken(getAuthToken());
  return payload?.tenant_id ?? null;
}

export function subscribeAuth(listener: AuthListener): Unsubscribe {
  listeners.add(listener);
  listener(getAuthToken());
  return () => {
    listeners.delete(listener);
  };
}

function notify() {
  const token = getAuthToken();
  listeners.forEach((listener) => listener(token));
}
