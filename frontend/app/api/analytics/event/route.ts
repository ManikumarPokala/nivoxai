import { NextRequest, NextResponse } from "next/server";
import { BACKEND_API_BASE_URL } from "@/lib/urls";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (process.env.DEMO_AUTH_TOKEN) {
      headers.Authorization = `Bearer ${process.env.DEMO_AUTH_TOKEN}`;
    }
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
