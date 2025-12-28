export type ApiResult<T> = {
  data: T | null;
  error: string | null;
  status?: number;
  requestId?: string | null;
};

export type RequestLog = {
  id: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  requestId: string | null;
  tenantId: string | null;
  error?: string | null;
  time: string;
};

type LogListener = (logs: RequestLog[]) => void;

const requestLogs: RequestLog[] = [];
const listeners = new Set<LogListener>();

export function subscribeRequestLogs(listener: LogListener) {
  listeners.add(listener);
  listener([...requestLogs]);
  return () => {
    listeners.delete(listener);
  };
}

export function getRequestLogs() {
  return [...requestLogs];
}

export function getLastRequestLog() {
  return requestLogs[0] ?? null;
}

export function getLastRequestError() {
  for (let i = requestLogs.length - 1; i >= 0; i -= 1) {
    if (requestLogs[i]?.error) {
      return requestLogs[i];
    }
  }
  return null;
}

function recordLog(entry: RequestLog) {
  requestLogs.unshift(entry);
  if (requestLogs.length > 20) {
    requestLogs.length = 20;
  }
  listeners.forEach((listener) => listener([...requestLogs]));
}

function getStoredTenantId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem("nivoxai_tenant_id");
}

function createRequestId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export async function requestJson<T>(
  path: string,
  options: RequestInit = {},
  timeoutMs = 8000
): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const requestId = createRequestId();
  const method = options.method ?? "GET";
  const headers = new Headers(options.headers ?? {});
  const tenantId = getStoredTenantId();

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("X-Request-Id", requestId);

  const start = typeof performance !== "undefined" ? performance.now() : Date.now();
  try {
    const response = await fetch(path, {
      ...options,
      headers,
      signal: controller.signal,
      credentials: "include",
      cache: "no-store",
    });

    const durationMs = Math.max(
      1,
      Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - start)
    );
    const responseRequestId = response.headers.get("x-request-id");

    if (!response.ok) {
      const message = await safeReadError(response);
      recordLog({
        id: requestId,
        method,
        path,
        status: response.status,
        durationMs,
        requestId: responseRequestId,
        tenantId,
        error: message,
        time: new Date().toISOString(),
      });
      return {
        data: null,
        error: message,
        status: response.status,
        requestId: responseRequestId,
      };
    }

    const data = (await response.json()) as T;
    recordLog({
      id: requestId,
      method,
      path,
      status: response.status,
      durationMs,
      requestId: responseRequestId,
      tenantId,
      error: null,
      time: new Date().toISOString(),
    });
    return {
      data,
      error: null,
      status: response.status,
      requestId: responseRequestId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    const durationMs = Math.max(
      1,
      Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - start)
    );
    recordLog({
      id: requestId,
      method,
      path,
      status: 0,
      durationMs,
      requestId: null,
      tenantId,
      error: message,
      time: new Date().toISOString(),
    });
    return { data: null, error: message, status: 0, requestId: null };
  } finally {
    clearTimeout(timeout);
  }
}

async function safeReadError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (data?.error) {
      return data.error;
    }
  } catch {
    // ignore parse errors
  }
  return `Request failed (${response.status} ${response.statusText})`;
}
