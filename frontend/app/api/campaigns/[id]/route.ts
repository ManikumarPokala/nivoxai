import { NextRequest, NextResponse } from "next/server";
import { BACKEND_API_BASE_URL } from "@/lib/urls";
import { getCampaignById } from "../store";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  try {
    const response = await fetch(`${BACKEND_API_BASE_URL}/campaigns/${id}`, {
      cache: "no-store",
    });
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }
  } catch (error) {
    // fall through to demo data
  }

  const campaign = getCampaignById(id);
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  return NextResponse.json(campaign);
}
