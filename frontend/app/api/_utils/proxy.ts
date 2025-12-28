import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

type ErrorSchema = {
  error: {
    code: string;
    message: string;
    details?: unknown;
    request_id: string;
  };
};

const STATUS_CODE_MAP: Record<number, string> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  422: "VALIDATION_ERROR",
  429: "RATE_LIMITED",
  502: "UPSTREAM_ERROR",
  503: "UPSTREAM_UNAVAILABLE",
  504: "UPSTREAM_TIMEOUT",
};

export function getRequestId(request: NextRequest): string {
  return request.headers.get("x-request-id") ?? crypto.randomUUID();
}

export function toErrorSchema(
  status: number,
  body: unknown,
  requestId: string,
  fallbackMessage?: string
): ErrorSchema {
  if (isErrorSchema(body)) {
    return body;
  }
  const code = STATUS_CODE_MAP[status] ?? "INTERNAL_ERROR";
  const message = resolveErrorMessage(body) ?? fallbackMessage ?? "Request failed.";
  const details =
    typeof body === "object" && body !== null
      ? body
      : body
        ? { error: body }
        : undefined;
  return {
    error: {
      code,
      message,
      details,
      request_id: requestId,
    },
  };
}

export async function relayJsonResponse(
  response: Response,
  requestId: string
): Promise<NextResponse> {
  const text = await response.text();
  const body = safeJsonParse(text);
  const headers = new Headers({ "x-request-id": requestId });

  if (response.ok) {
    return NextResponse.json(body ?? null, { status: response.status, headers });
  }
  const normalized = toErrorSchema(
    response.status,
    body ?? text,
    requestId,
    "Upstream request failed."
  );
  return NextResponse.json(normalized, { status: response.status, headers });
}

export function errorResponse(
  status: number,
  requestId: string,
  message: string,
  details?: unknown,
  code?: string
): NextResponse {
  const payload: ErrorSchema = {
    error: {
      code: code ?? STATUS_CODE_MAP[status] ?? "INTERNAL_ERROR",
      message,
      details,
      request_id: requestId,
    },
  };
  return NextResponse.json(payload, {
    status,
    headers: { "x-request-id": requestId },
  });
}

export function withRequestId(headers: HeadersInit, requestId: string): Headers {
  const merged = new Headers(headers);
  merged.set("x-request-id", requestId);
  return merged;
}

function isErrorSchema(body: unknown): body is ErrorSchema {
  if (!body || typeof body !== "object") {
    return false;
  }
  const error = (body as ErrorSchema).error;
  return Boolean(
    error &&
      typeof error === "object" &&
      typeof error.code === "string" &&
      typeof error.message === "string" &&
      typeof error.request_id === "string"
  );
}

function resolveErrorMessage(body: unknown): string | null {
  if (!body) {
    return null;
  }
  if (typeof body === "string") {
    return body;
  }
  if (typeof body === "object") {
    const maybeError = body as { error?: unknown; message?: unknown };
    if (typeof maybeError.message === "string") {
      return maybeError.message;
    }
    if (typeof maybeError.error === "string") {
      return maybeError.error;
    }
    if (typeof maybeError.error === "object") {
      const nested = maybeError.error as { message?: unknown };
      if (typeof nested.message === "string") {
        return nested.message;
      }
    }
  }
  return null;
}

function safeJsonParse(text: string): unknown {
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
