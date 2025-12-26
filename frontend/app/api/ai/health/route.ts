import { NextResponse } from "next/server";
import { BACKEND_AI_BASE_URL } from "@/lib/urls";

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
