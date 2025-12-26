import { NextResponse } from "next/server";
import { BACKEND_AI_BASE_URL } from "@/lib/urls";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let response = await fetch(`${BACKEND_AI_BASE_URL}/recommendations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (response.status === 404) {
      response = await fetch(`${BACKEND_AI_BASE_URL}/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: "Recommendation proxy failed." },
      { status: 502 }
    );
  }
}
