import { NextRequest, NextResponse } from "next/server";
import { BACKEND_API_BASE_URL } from "@/lib/urls";
import { buildAuthHeaders, requireSession } from "../../_utils/session";

export async function GET(request: NextRequest) {
  const { session, error } = await requireSession();
  if (error || !session) {
    return error;
  }
  try {
    const search = request.nextUrl.search;
    const headers = buildAuthHeaders(session);
    const response = await fetch(
      `${BACKEND_API_BASE_URL}/v1/analytics/summary${search}`,
      {
        headers,
        cache: "no-store",
      }
    );
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: "Analytics summary proxy failed." },
      { status: 502 }
    );
  }
}
