import { NextRequest } from "next/server";
import { BACKEND_API_BASE_URL } from "@/lib/urls";
import { errorResponse, getRequestId, relayJsonResponse, withRequestId } from "../../_utils/proxy";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    const body = await request.json();
    const response = await fetch(`${BACKEND_API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: withRequestId({ "Content-Type": "application/json" }, requestId),
      body: JSON.stringify(body),
    });
    return relayJsonResponse(response, requestId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Auth proxy failed.";
    return errorResponse(502, requestId, "Auth proxy failed.", { error: message });
  }
}
