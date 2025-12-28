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
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  requestBody: unknown | null;
  responseBody: unknown | null;
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
  const requestBody = normalizeRequestBody(options.body);

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
    const responseHeaders = headersToObject(response.headers);
    const responseRequestId = responseHeaders["x-request-id"] ?? null;
    const responseBody = await safeReadBody(response);

    if (!response.ok) {
      const message = extractErrorMessage(responseBody, response.status, response.statusText);
      recordLog({
        id: requestId,
        method,
        path,
        status: response.status,
        durationMs,
        requestId: responseRequestId,
        tenantId,
        requestHeaders: headersToObject(headers),
        responseHeaders,
        requestBody,
        responseBody,
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

    const data = responseBody as T;
    recordLog({
      id: requestId,
      method,
      path,
      status: response.status,
      durationMs,
      requestId: responseRequestId,
      tenantId,
      requestHeaders: headersToObject(headers),
      responseHeaders,
      requestBody,
      responseBody,
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
      requestHeaders: headersToObject(headers),
      responseHeaders: {},
      requestBody,
      responseBody: null,
      error: message,
      time: new Date().toISOString(),
    });
    return { data: null, error: message, status: 0, requestId: null };
  } finally {
    clearTimeout(timeout);
  }
}

async function safeReadBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractErrorMessage(
  body: unknown,
  status: number,
  statusText: string
): string {
  if (body && typeof body === "object") {
    const error = (body as { error?: { message?: string } }).error;
    if (error?.message) {
      return error.message;
    }
    const message = (body as { message?: string }).message;
    if (message) {
      return message;
    }
  }
  if (typeof body === "string") {
    return body;
  }
  return `Request failed (${status} ${statusText})`;
}

function normalizeRequestBody(body: RequestInit["body"]): unknown | null {
  if (!body) {
    return null;
  }
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }
  if (body instanceof FormData) {
    return "[form-data]";
  }
  if (body instanceof URLSearchParams) {
    return body.toString();
  }
  return "[binary]";
}

function headersToObject(headers: Headers): Record<string, string> {
  return Object.fromEntries(headers.entries());
}
