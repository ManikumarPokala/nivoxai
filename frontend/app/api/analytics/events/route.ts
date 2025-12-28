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
    const search = request.nextUrl.search;
    const headers = buildAuthHeaders(session, withRequestId({}, requestId));
    const response = await fetch(`${BACKEND_API_BASE_URL}/v1/analytics/events${search}`, {
      headers,
      cache: "no-store",
    });
    return relayJsonResponse(response, requestId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analytics events proxy failed.";
    return errorResponse(502, requestId, "Analytics events proxy failed.", { error: message });
  }
}
