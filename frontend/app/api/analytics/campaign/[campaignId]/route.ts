import { NextRequest } from "next/server";
import { BACKEND_API_BASE_URL } from "@/lib/urls";
import { buildAuthHeaders, requireSession } from "../../../_utils/session";
import { errorResponse, getRequestId, relayJsonResponse, withRequestId } from "../../../_utils/proxy";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ campaignId: string }> }
) {
  const { campaignId } = await context.params;
  const requestId = getRequestId(request);
  const { session, error } = await requireSession(requestId);
  if (error || !session) {
    return error;
  }
  try {
    const headers = buildAuthHeaders(session, withRequestId({}, requestId));
    const response = await fetch(
      `${BACKEND_API_BASE_URL}/v1/analytics/campaign/${campaignId}`,
      { cache: "no-store", headers }
    );
    return relayJsonResponse(response, requestId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Campaign analytics proxy failed.";
    return errorResponse(502, requestId, "Campaign analytics proxy failed.", { error: message });
  }
}
