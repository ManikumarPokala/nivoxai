import { NextRequest } from "next/server";
import { BACKEND_API_BASE_URL } from "@/lib/urls";
import { buildAuthHeaders, requireSession } from "../../_utils/session";
import { errorResponse, getRequestId, relayJsonResponse, withRequestId } from "../../_utils/proxy";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const requestId = getRequestId(request);
  const { session, error } = await requireSession(requestId);
  if (error || !session) {
    return error;
  }
  try {
    const headers = buildAuthHeaders(session, withRequestId({}, requestId));
    const response = await fetch(`${BACKEND_API_BASE_URL}/v1/campaigns/${id}`, {
      headers,
      cache: "no-store",
    });
    return relayJsonResponse(response, requestId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Campaign detail proxy failed.";
    return errorResponse(502, requestId, "Campaign detail proxy failed.", { error: message });
  }
}
