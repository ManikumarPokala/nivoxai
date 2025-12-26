"use client";

import { FormEvent, useState } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

type Campaign = {
  id: string;
  brand_name: string;
  goal: string;
  target_region: string;
  target_age_range: string;
  budget: number;
  description: string;
};

type Influencer = {
  id: string;
  name: string;
  platform: string;
  category: string;
  followers: number;
  engagement_rate: number;
  region: string;
  languages: string[];
  audience_age_range: string;
  bio: string;
};

type RecommendationItem = {
  influencer_id: string;
  score: number;
  reasons: string[];
};

const SAMPLE_INFLUENCERS: Influencer[] = [
  {
    id: "inf-101",
    name: "GlowWithMaya",
    platform: "Instagram",
    category: "beauty",
    followers: 120_000,
    engagement_rate: 0.072,
    region: "Thailand",
    languages: ["Thai", "English"],
    audience_age_range: "18-24",
    bio: "Thai beauty creator sharing skincare routines for humid climates.",
  },
  {
    id: "inf-102",
    name: "SkinScienceNate",
    platform: "YouTube",
    category: "skincare",
    followers: 85_000,
    engagement_rate: 0.048,
    region: "Singapore",
    languages: ["English"],
    audience_age_range: "25-34",
    bio: "Science-first skincare breakdowns and deep-dive product reviews.",
  },
  {
    id: "inf-103",
    name: "BangkokGlow",
    platform: "TikTok",
    category: "beauty",
    followers: 210_000,
    engagement_rate: 0.065,
    region: "Thailand",
    languages: ["Thai"],
    audience_age_range: "18-24",
    bio: "Short-form skincare and makeup content for Gen-Z in Bangkok.",
  },
  {
    id: "inf-104",
    name: "DermCarePro",
    platform: "Instagram",
    category: "skincare",
    followers: 60_000,
    engagement_rate: 0.055,
    region: "Thailand",
    languages: ["Thai", "English"],
    audience_age_range: "25-34",
    bio: "Dermatology-backed tips and product recommendations.",
  },
  {
    id: "inf-105",
    name: "FitAndGlow",
    platform: "YouTube",
    category: "fitness",
    followers: 150_000,
    engagement_rate: 0.035,
    region: "Thailand",
    languages: ["Thai"],
    audience_age_range: "18-34",
    bio: "Fitness, nutrition and wellness content with a focus on glow-up.",
  },
  {
    id: "inf-106",
    name: "SeaBreezeBeauty",
    platform: "Instagram",
    category: "beauty",
    followers: 95_000,
    engagement_rate: 0.061,
    region: "Vietnam",
    languages: ["Vietnamese", "English"],
    audience_age_range: "18-24",
    bio: "Beach-friendly skincare and makeup for Southeast Asia climate.",
  },
];

const INFLUENCER_AVATARS: Record<string, string> = {
  "inf-101": "/Female/Female-1.png",
  "inf-102": "/Male/Male-2.png",
  "inf-103": "/Female/Female-3.png",
  "inf-104": "/Female/Female-5.png",
  "inf-105": "/Male/Male-4.png",
  "inf-106": "/Male/Male-6.png",
};

const BRAND_LOGOS = [
  "/brands/Group.png",
  "/brands/Format=Glyph.png",
  "/brands/Format=Wordmark.png",
];

async function trackEvent(eventName: string, campaign: Campaign) {
  try {
    await fetch(`${API_BASE_URL}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_name: eventName,
        campaign_id: campaign.id,
        payload: {
          goal: campaign.goal,
          target_region: campaign.target_region,
          target_age_range: campaign.target_age_range,
          budget: campaign.budget,
        },
      }),
    });
  } catch (err) {
    console.warn("Failed to track event", err);
  }
}

export default function DashboardPage() {
  const [brandName, setBrandName] = useState("Luma Beauty");
  const [goal, setGoal] = useState("Launch a summer skincare line");
  const [targetRegion, setTargetRegion] = useState("Thailand");
  const [targetAgeRange, setTargetAgeRange] = useState("18-24");
  const [budget, setBudget] = useState(25000);
  const [description, setDescription] = useState(
    "Skincare and beauty focus for humid climates with glow routines."
  );

  const [recommendations, setRecommendations] = useState<RecommendationItem[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const campaign: Campaign = {
    id: "camp-ui-1",
    brand_name: brandName,
    goal,
    target_region: targetRegion,
    target_age_range: targetAgeRange,
    budget,
    description,
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    await trackEvent("run_matching_clicked", campaign);

    try {
      const res = await fetch(`${API_BASE_URL}/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign,
          influencers: SAMPLE_INFLUENCERS,
        }),
      });

      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }

      const data = (await res.json()) as {
        recommendations?: RecommendationItem[];
      };

      setRecommendations(data.recommendations ?? []);
      await trackEvent("recommendation_success", campaign);
    } catch (err) {
      console.error("Recommend API failed", err);
      setError("Could not run matching. Check that backend services are up.");
      setRecommendations([]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Hero / header card */}
      <section className="rounded-[1.25rem] border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex rounded-pill bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.17em] text-brand-600">
              Dashboard · Matching Engine
            </div>
            <h1 className="mt-3 text-xl font-semibold tracking-tight text-slate-900 lg:text-2xl">
              Campaign Intelligence Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Configure a campaign and let NivoxAI rank influencers based on
              category, region, engagement and audience fit.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Brand Partners
              </span>
              <div className="flex items-center gap-2">
                {BRAND_LOGOS.map((logo) => (
                  <img
                    key={logo}
                    src={logo}
                    alt="Brand logo"
                    className="h-7 w-7 rounded-full border border-slate-200 bg-white object-contain p-1"
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs lg:text-sm">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-slate-500">Sample Influencers</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">6</p>
              <p className="mt-1 text-[11px] text-emerald-600">
                Demo dataset for scoring
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-slate-500">Scoring Factors</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                4 signals
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                content · region · engagement · age
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-slate-500">Mode</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                Demo / Heuristic
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Ready to swap with ML / RAG
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main grid */}
      <section className="grid gap-6 lg:grid-cols-2 lg:items-start">
        {/* Campaign card */}
        <div className="rounded-[1.25rem] border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md lg:p-6">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-900">
              Campaign Setup
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Describe your campaign and target audience. The AI model uses
              these inputs to compute scores.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600">
                Brand Name
              </label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none ring-0 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600">
                Goal
              </label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-600">
                  Target Region
                </label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                  value={targetRegion}
                  onChange={(e) => setTargetRegion(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">
                  Target Age Range
                </label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                  value={targetAgeRange}
                  onChange={(e) => setTargetAgeRange(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600">
                Budget (USD)
              </label>
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value) || 0)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600">
                Description
              </label>
              <textarea
                rows={4}
                className="mt-1 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] text-slate-500">
                This demo uses heuristic scoring. In production, these signals
                would flow into an ML / embedding-based recommender.
              </p>

              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Running Matching…" : "Run Matching"}
              </button>
            </div>

            {error && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}
          </form>
        </div>

        {/* Recommendations card */}
        <div className="rounded-[1.25rem] border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md lg:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Recommended Influencers
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Ranked suggestions based on fit with your campaign.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-pill bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-700">
              <img
                src={BRAND_LOGOS[0]}
                alt="Brand logo"
                className="h-5 w-5 rounded-full border border-slate-200 bg-white object-contain p-0.5"
              />
              Top Picks for {brandName || "your brand"}
            </span>
          </div>

          {recommendations.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-center">
              <div className="mb-3 h-10 w-10 rounded-full bg-slate-100" />
              <p className="text-sm font-medium text-slate-800">
                No recommendations yet
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Fill the campaign details on the left and run matching to see
                AI-suggested KOLs.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-100">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="w-40 px-4 py-2">Influencer</th>
                    <th className="w-24 px-4 py-2">Score</th>
                    <th className="px-4 py-2">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recommendations.map((rec, idx) => {
                    const avatarSrc =
                      INFLUENCER_AVATARS[rec.influencer_id] ?? "/Male/Male-1.png";
                    return (
                      <tr
                        key={rec.influencer_id}
                        className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}
                      >
                        <td className="px-4 py-3 font-medium text-slate-900">
                          <div className="flex items-center gap-3">
                            <img
                              src={avatarSrc}
                              alt={`Avatar for ${rec.influencer_id}`}
                              className="h-9 w-9 rounded-full border border-slate-200 object-cover"
                            />
                            <span>{rec.influencer_id}</span>
                          </div>
                        </td>
                      <td className="px-4 py-3 text-slate-800">
                        {rec.score.toFixed(3)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {rec.reasons[0] ?? "Relevant based on profile fit"}
                      </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
