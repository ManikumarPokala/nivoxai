const baseUrl = process.env.FRONTEND_BASE_URL ?? "http://localhost:3000";

const campaign = {
  id: "camp-smoke-001",
  title: "Smoke Test Campaign",
  brand_name: "Demo Brand",
  goal: "Brand awareness and engagement",
  target_region: "Thailand",
  target_age_range: "18-35",
  description: "Influencer campaign for smoke testing.",
  budget: 20000,
};

const influencers = [
  {
    id: "inf-101",
    name: "GlowWithMaya",
    platform: "Instagram",
    category: "beauty",
    followers: 120000,
    engagement_rate: 0.072,
    region: "Thailand",
    languages: ["Thai", "English"],
    audience_age_range: "18-24",
    bio: "Thai beauty creator sharing skincare routines for humid climates.",
  },
];

async function postJson(path, payload) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, body };
}

async function run() {
  console.log("Running AI smoke check against", baseUrl);

  const rec = await postJson("/api/ai/recommend", {
    campaign,
    influencers,
  });
  console.log("/api/ai/recommend", rec.ok ? "OK" : "FAIL", rec.status);

  const recommendations = rec.body?.recommendations
    ? rec.body
    : {
        campaign_id: campaign.id,
        recommendations: [],
      };

  const chat = await postJson("/api/ai/chat-strategy", {
    campaign,
    recommendations,
    question: "Provide a short launch strategy.",
  });
  console.log("/api/ai/chat-strategy", chat.ok ? "OK" : "FAIL", chat.status);
}

run().catch((error) => {
  console.error("Smoke check failed:", error);
  process.exit(1);
});
