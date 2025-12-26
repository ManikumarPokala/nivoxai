import { NextRequest, NextResponse } from "next/server";
import { BACKEND_API_BASE_URL } from "@/lib/urls";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ campaignId: string }> }
) {
  const { campaignId } = await context.params;
  try {
    const response = await fetch(
      `${BACKEND_API_BASE_URL}/analytics/campaign/${campaignId}`,
      { cache: "no-store" }
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
