import { NextRequest, NextResponse } from "next/server";
import { BACKEND_API_BASE_URL } from "@/lib/urls";
import { buildAuthHeaders, requireSession } from "../../_utils/session";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const { session, error } = await requireSession();
  if (error || !session) {
    return error;
  }
  try {
    const headers = buildAuthHeaders(session);
    const response = await fetch(`${BACKEND_API_BASE_URL}/v1/campaigns/${id}`, {
      headers,
      cache: "no-store",
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: "Campaign detail proxy failed." },
      { status: 502 }
    );
  }
}
