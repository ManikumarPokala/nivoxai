import { NextRequest, NextResponse } from "next/server";
import { BACKEND_API_BASE_URL } from "@/lib/urls";
import { errorResponse, getRequestId, relayJsonResponse, withRequestId } from "../../_utils/proxy";

function resolveSecure(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_FORCE_HTTPS === "true") {
    return true;
  }
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) {
    return forwarded === "https";
  }
  return request.nextUrl.protocol === "https:";
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const response = await fetch(`${BACKEND_API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: withRequestId({ "Content-Type": "application/json" }, requestId),
    body: JSON.stringify({ email: "admin@nivoxai.local", password: "demo" }),
  });

  if (!response.ok) {
    return relayJsonResponse(response, requestId);
  }

  const data = (await response.json()) as {
    token?: string;
    tenant_id?: string;
    role?: string;
  };

  if (!data.token || !data.tenant_id) {
    return errorResponse(
      500,
      requestId,
      "Demo login missing token or tenant_id.",
      {
        token_present: Boolean(data.token),
        tenant_present: Boolean(data.tenant_id),
      }
    );
  }

  const secure = resolveSecure(request);
  const cookieBase = {
    sameSite: "lax" as const,
    path: "/",
    secure,
  };
  const nextResponse = NextResponse.json(data);
  nextResponse.cookies.set("nivoxai_jwt", data.token, {
    ...cookieBase,
    httpOnly: true,
  });
  nextResponse.cookies.set("nivoxai_tenant_id", data.tenant_id, {
    ...cookieBase,
    httpOnly: false,
  });
  if (data.role) {
    nextResponse.cookies.set("nivoxai_role", data.role, {
      ...cookieBase,
      httpOnly: false,
    });
  }
  nextResponse.headers.set("x-request-id", requestId);
  return nextResponse;
}
