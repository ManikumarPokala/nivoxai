import { NextRequest } from "next/server";
import { BACKEND_API_BASE_URL } from "@/lib/urls";
import { buildAuthHeaders, requireSession } from "../_utils/session";
import { errorResponse, getRequestId, relayJsonResponse, withRequestId } from "../_utils/proxy";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const { session, error } = await requireSession(requestId);
  if (error || !session) {
    return error;
  }
  try {
    const body = await request.json();
    const headers = buildAuthHeaders(
      session,
      withRequestId({ "Content-Type": "application/json" }, requestId)
    );
    const response = await fetch(`${BACKEND_API_BASE_URL}/recommend`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    return relayJsonResponse(response, requestId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Recommendation proxy failed.";
    return errorResponse(502, requestId, "Recommendation proxy failed.", { error: message });
  }
}
