import { NextRequest, NextResponse } from "next/server";
import { BACKEND_API_BASE_URL } from "@/lib/urls";
import { buildAuthHeaders, requireSession } from "../../_utils/session";

export async function POST(request: NextRequest) {
  const { session, error } = await requireSession();
  if (error || !session) {
    return error;
  }
  try {
    const body = await request.json();
    const headers = buildAuthHeaders(session, { "Content-Type": "application/json" });
    const response = await fetch(`${BACKEND_API_BASE_URL}/v1/analytics/event`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: "Analytics event proxy failed." },
      { status: 502 }
    );
  }
}
