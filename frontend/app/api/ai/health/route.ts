import { NextResponse } from "next/server";

const BACKEND_AI_BASE_URL =
  process.env.BACKEND_AI_BASE_URL ?? "http://backend-ai:8000";

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_AI_BASE_URL}/health`, {
      cache: "no-store",
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: "Backend AI health check failed." },
      { status: 502 }
    );
  }
}
