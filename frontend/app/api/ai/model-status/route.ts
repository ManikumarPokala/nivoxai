import { NextRequest } from "next/server";
import { BACKEND_AI_BASE_URL } from "@/lib/urls";
import { buildAuthHeaders, requireSession } from "../../_utils/session";
import { errorResponse, getRequestId, relayJsonResponse, withRequestId } from "../../_utils/proxy";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  const { session, error } = await requireSession(requestId);
  if (error || !session) {
    return error;
  }
  try {
    const response = await fetch(`${BACKEND_AI_BASE_URL}/v1/model/status`, {
      cache: "no-store",
      headers: buildAuthHeaders(session, withRequestId({}, requestId)),
    });
    return relayJsonResponse(response, requestId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Model status proxy failed.";
    return errorResponse(502, requestId, "Model status proxy failed.", { error: message });
  }
}
