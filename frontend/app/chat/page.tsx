"use client";

import { FormEvent, useState } from "react";
import { chatStrategy, type RecommendationResponse } from "@/lib/api";
import { buildCampaignPayload } from "@/lib/payloads";

export default function StrategyChatPage() {
  const [campaignSummary, setCampaignSummary] = useState(
    "Luma Beauty is launching a vitamin C summer serum for Gen-Z women in Thailand. Target audience is 18-24, urban, interested in glow-up routines and skincare that works in humid climates."
  );
  const [question, setQuestion] = useState(
    "How should we use the top influencers to launch this in the first 4 weeks?"
  );
  const [reply, setReply] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Minimal demo campaign + recommendations object for backend
    const campaign = {
      id: "camp-ui-1",
      brand_name: "Luma Beauty",
      goal: "Launch vitamin C summer serum",
      target_region: "Thailand",
      target_age_range: "18-24",
      budget: 25000,
      description: campaignSummary,
    };

    const recommendations: RecommendationResponse = {
      campaign_id: "camp-ui-1",
      recommendations: [
        {
          influencer_id: "inf-101",
          score: 0.94,
          reasons: ["Strong category match with 'beauty'"],
        },
        {
          influencer_id: "inf-103",
          score: 0.88,
          reasons: ["Region and age fit for Thai Gen-Z audience"],
        },
      ],
    };

    try {
      const payloadCampaign = buildCampaignPayload({
        ...campaign,
        title: campaign.brand_name,
        country: campaign.target_region,
      });
      const result = await chatStrategy(payloadCampaign, recommendations, question);
      if (result.error || !result.data) {
        throw new Error(result.error ?? "Strategy request failed");
      }
      setReply(result.data.reply);
    } catch (err) {
      console.error("Chat API failed", err);
      setError("Could not get a strategy reply. Please check backend services.");
      setReply(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-[1.25rem] border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.17em] text-indigo-700">
              Assistant · Strategy Chat
            </div>
            <h1 className="mt-3 text-xl font-semibold tracking-tight text-slate-900 lg:text-2xl">
              AI Strategy Copilot
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Pass in your campaign context and ask NivoxAI how to activate the
              right creators, formats and pacing.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
            <p className="font-medium text-slate-800">LLM Ready</p>
            <p className="mt-1">
              This demo returns a server-generated strategy. In production an
              LLM agent would reason over recommendations and performance data.
            </p>
          </div>
        </div>
      </section>

      {/* Main grid */}
      <section className="grid gap-6 lg:grid-cols-[1.1fr,1fr]">
        {/* Left: input */}
        <div className="rounded-[1.25rem] border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md lg:p-6">
          <h2 className="text-base font-semibold text-slate-900">
            Campaign context & question
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Refine the campaign description and ask anything about launch
            strategy, content mix, or creator roles.
          </p>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600">
                Campaign summary
              </label>
              <textarea
                rows={6}
                className="mt-1 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                value={campaignSummary}
                onChange={(e) => setCampaignSummary(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600">
                Your question to NivoxAI
              </label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] text-slate-500">
                Tip: Ask concrete questions like “What posting plan should we
                run for the first 30 days?” or “How do we split roles between
                macro and micro creators?”.
              </p>

              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Thinking…" : "Ask NivoxAI"}
              </button>
            </div>

            {error && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}
          </form>
        </div>

        {/* Right: answer */}
        <div className="rounded-[1.25rem] border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md lg:p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              Strategy answer
            </h2>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-700">
              LLM-ready · Demo reply
            </span>
          </div>

          {reply ? (
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-800">
              {reply}
            </p>
          ) : (
            <div className="flex h-40 flex-col justify-center gap-2 text-sm text-slate-600">
              <p>
                Describe your campaign and ask a question to see how NivoxAI
                would orchestrate influencers, content formats, and launch
                phases.
              </p>
              <ul className="list-disc pl-4 text-xs text-slate-500">
                <li>“What’s a 4-week launch plan for this?”</li>
                <li>“How should we split budget between influencers?”</li>
                <li>“What kind of briefs should we send to each creator?”</li>
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
