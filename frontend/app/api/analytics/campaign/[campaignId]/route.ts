import { NextResponse } from "next/server";

const BACKEND_API_BASE_URL =
  process.env.BACKEND_API_BASE_URL ?? "http://backend-api:4000";

type RouteParams = {
  params: { campaignId: string };
};

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const response = await fetch(
      `${BACKEND_API_BASE_URL}/analytics/campaign/${params.campaignId}`,
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
