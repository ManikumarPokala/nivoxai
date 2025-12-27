import { NextRequest, NextResponse } from "next/server";
import { BACKEND_API_BASE_URL } from "@/lib/urls";

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.search;
    const headers: HeadersInit = {};
    if (process.env.DEMO_AUTH_TOKEN) {
      headers.Authorization = `Bearer ${process.env.DEMO_AUTH_TOKEN}`;
    }
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
