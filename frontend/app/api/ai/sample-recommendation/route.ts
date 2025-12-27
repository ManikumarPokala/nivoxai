import { NextResponse } from "next/server";
import { BACKEND_AI_BASE_URL } from "@/lib/urls";

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_AI_BASE_URL}/sample-recommendation`, {
      cache: "no-store",
    });
    const data = await response.json();
    const nextResponse = NextResponse.json(data, { status: response.status });
    const requestId = response.headers.get("x-request-id");
    if (requestId) {
      nextResponse.headers.set("X-Request-Id", requestId);
    }
    return nextResponse;
  } catch (error) {
    return NextResponse.json(
      { error: "Sample recommendation proxy failed." },
      { status: 502 }
    );
  }
}
