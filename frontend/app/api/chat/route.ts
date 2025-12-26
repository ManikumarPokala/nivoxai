import { NextResponse } from "next/server";

const BACKEND_AI_URL =
  process.env.BACKEND_AI_URL ?? "http://localhost:8000";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await fetch(`${BACKEND_AI_URL}/chat-strategy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: "Strategy proxy failed." },
      { status: 502 }
    );
  }
}
