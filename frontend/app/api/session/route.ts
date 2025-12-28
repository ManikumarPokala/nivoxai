import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { errorResponse, getRequestId } from "../_utils/proxy";

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

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  const jar = await cookies();
  const token = jar.get("nivoxai_jwt")?.value ?? "";
  const tenantId = jar.get("nivoxai_tenant_id")?.value ?? "";
  const role = jar.get("nivoxai_role")?.value ?? null;
  if (!token || !tenantId) {
    return NextResponse.json(
      { session: null },
      { headers: { "x-request-id": requestId } }
    );
  }
  return NextResponse.json(
    {
      token,
      tenant_id: tenantId,
      role,
    },
    { headers: { "x-request-id": requestId } }
  );
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const body = await request.json();
  const token = typeof body.token === "string" ? body.token : "";
  const tenantId = typeof body.tenant_id === "string" ? body.tenant_id : "";
  const role = typeof body.role === "string" ? body.role : null;

  if (!token || !tenantId) {
    return errorResponse(400, requestId, "token and tenant_id are required.");
  }

  const secure = resolveSecure(request);
  const cookieBase = {
    sameSite: "lax" as const,
    path: "/",
    secure,
  };
  const response = NextResponse.json(
    { token, tenant_id: tenantId, role },
    { headers: { "x-request-id": requestId } }
  );
  response.cookies.set("nivoxai_jwt", token, {
    ...cookieBase,
    httpOnly: true,
  });
  response.cookies.set("nivoxai_tenant_id", tenantId, {
    ...cookieBase,
    httpOnly: false,
  });
  if (role) {
    response.cookies.set("nivoxai_role", role, {
      ...cookieBase,
      httpOnly: false,
    });
  }
  return response;
}

export async function DELETE(request: NextRequest) {
  const requestId = getRequestId(request);
  const secure = resolveSecure(request);
  const cookieBase = {
    sameSite: "lax" as const,
    path: "/",
    secure,
  };
  const response = NextResponse.json(
    { status: "cleared" },
    { headers: { "x-request-id": requestId } }
  );
  response.cookies.set("nivoxai_jwt", "", {
    ...cookieBase,
    httpOnly: true,
    maxAge: 0,
  });
  response.cookies.set("nivoxai_tenant_id", "", {
    ...cookieBase,
    httpOnly: false,
    maxAge: 0,
  });
  response.cookies.set("nivoxai_role", "", {
    ...cookieBase,
    httpOnly: false,
    maxAge: 0,
  });
  return response;
}
