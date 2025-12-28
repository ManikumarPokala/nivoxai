import { NextRequest, NextResponse } from "next/server";
import { BACKEND_API_BASE_URL } from "@/lib/urls";
import { buildAuthHeaders, requireSession } from "../../../_utils/session";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ campaignId: string }> }
) {
  const { campaignId } = await context.params;
  const { session, error } = await requireSession();
  if (error || !session) {
    return error;
  }
  try {
    const headers = buildAuthHeaders(session);
    const response = await fetch(
      `${BACKEND_API_BASE_URL}/v1/analytics/campaign/${campaignId}`,
      { cache: "no-store", headers }
    );
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: "Campaign analytics proxy failed." },
      { status: 502 }
    );
  }
}
