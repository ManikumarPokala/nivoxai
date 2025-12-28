import { NextRequest } from "next/server";
import { BACKEND_API_BASE_URL } from "@/lib/urls";
import { buildAuthHeaders, requireSession } from "../../_utils/session";
import { errorResponse, getRequestId, relayJsonResponse, withRequestId } from "../../_utils/proxy";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  const { session, error } = await requireSession(requestId);
  if (error || !session) {
    return error;
  }
  try {
    const demoKey = request.headers.get("x-demo-admin-key");
    const headers = buildAuthHeaders(
      session,
      withRequestId(
        demoKey ? { "x-demo-admin-key": demoKey } : {},
        requestId
      )
    );
    const response = await fetch(`${BACKEND_API_BASE_URL}/admin/ping`, {
      headers,
      cache: "no-store",
    });
    return relayJsonResponse(response, requestId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Admin ping proxy failed.";
    return errorResponse(502, requestId, "Admin ping proxy failed.", { error: message });
  }
}
