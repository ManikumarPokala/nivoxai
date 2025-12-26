import { NextResponse } from "next/server";

const BACKEND_AI_URL =
  process.env.BACKEND_AI_URL ?? "http://localhost:8000";

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_AI_URL}/agent/status`, {
      cache: "no-store",
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: "Agent status proxy failed." },
      { status: 502 }
    );
  }
}
