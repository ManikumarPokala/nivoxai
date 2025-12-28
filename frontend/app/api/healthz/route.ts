import { NextResponse } from "next/server";
import { BACKEND_API_BASE_URL } from "@/lib/urls";
import { buildAuthHeaders, requireSession } from "../_utils/session";

export async function GET() {
  const { session, error } = await requireSession();
  if (error || !session) {
    return error;
  }
  try {
    const response = await fetch(`${BACKEND_API_BASE_URL}/api/healthz`, {
      cache: "no-store",
      headers: buildAuthHeaders(session),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: "Healthz proxy failed." },
      { status: 502 }
    );
  }
}
