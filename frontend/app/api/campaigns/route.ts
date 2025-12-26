import { NextRequest, NextResponse } from "next/server";
import { BACKEND_API_BASE_URL } from "@/lib/urls";
import { createCampaign, listCampaigns } from "./store";

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_API_BASE_URL}/campaigns`, {
      cache: "no-store",
    });
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }
  } catch (error) {
    // fall through to demo data
  }

  return NextResponse.json(listCampaigns());
}

export async function POST(request: NextRequest) {
  let body: unknown = null;
  try {
    body = await request.json();
    const response = await fetch(`${BACKEND_API_BASE_URL}/campaigns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }
  } catch (error) {
    // fall through to local demo store
  }

  if (!bodyIsCampaignCreate(body)) {
    return NextResponse.json(
      { error: "Invalid campaign payload." },
      { status: 400 }
    );
  }

  const created = createCampaign(body);
  return NextResponse.json(created, { status: 201 });
}

function bodyIsCampaignCreate(body: unknown): body is {
  title: string;
  country: string;
  budget: number;
} {
  if (!body || typeof body !== "object") {
    return false;
  }

  const candidate = body as { title?: unknown; country?: unknown; budget?: unknown };
  return (
    typeof candidate.title === "string" &&
    typeof candidate.country === "string" &&
    typeof candidate.budget === "number"
  );
}
