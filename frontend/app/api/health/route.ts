import { NextResponse } from "next/server";

const BACKEND_API_BASE_URL =
  process.env.BACKEND_API_BASE_URL ?? "http://backend-api:4000";

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_API_BASE_URL}/health`, {
      cache: "no-store",
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: "Backend API health check failed." },
      { status: 502 }
    );
  }
}
