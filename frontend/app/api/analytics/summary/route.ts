import { NextResponse } from "next/server";
import { BACKEND_API_BASE_URL } from "@/lib/urls";

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_API_BASE_URL}/analytics/summary`, {
      cache: "no-store",
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: "Analytics summary proxy failed." },
      { status: 502 }
    );
  }
}
