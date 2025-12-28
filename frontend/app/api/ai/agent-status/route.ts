import { NextResponse } from "next/server";
import { BACKEND_AI_BASE_URL } from "@/lib/urls";
import { buildAuthHeaders, requireSession } from "../../_utils/session";

export async function GET() {
  const { session, error } = await requireSession();
  if (error || !session) {
    return error;
  }
  try {
    const response = await fetch(`${BACKEND_AI_BASE_URL}/agent/status`, {
      cache: "no-store",
      headers: buildAuthHeaders(session),
    });
    const data = await response.json();
    const nextResponse = NextResponse.json(data, { status: response.status });
    const requestId = response.headers.get("x-request-id");
    if (requestId) {
      nextResponse.headers.set("X-Request-Id", requestId);
    }
    return nextResponse;
  } catch (error) {
    return NextResponse.json(
      { error: "Agent status proxy failed." },
      { status: 502 }
    );
  }
}
