import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export type SessionContext = {
  token: string;
  tenantId: string;
  role?: string | null;
};

export async function getSessionFromCookies(): Promise<SessionContext | null> {
  const jar = await cookies();
  const token = jar.get("nivoxai_jwt")?.value ?? "";
  const tenantId = jar.get("nivoxai_tenant_id")?.value ?? "";
  const role = jar.get("nivoxai_role")?.value ?? null;
  if (!token || !tenantId) {
    return null;
  }
  return { token, tenantId, role };
}

export async function requireSession() {
  const session = await getSessionFromCookies();
  if (!session) {
    return {
      session: null,
      error: NextResponse.json(
        {
          code: "SESSION_MISSING",
          message: "Session missing. Start a demo session to continue.",
          action: "start_demo_session",
        },
        { status: 401 }
      ),
    };
  }
  return { session, error: null };
}

export function buildAuthHeaders(
  session: SessionContext,
  baseHeaders: HeadersInit = {}
): HeadersInit {
  const headers = new Headers(baseHeaders);
  headers.set("Authorization", `Bearer ${session.token}`);
  headers.set("X-Tenant-Id", session.tenantId);
  return headers;
}
