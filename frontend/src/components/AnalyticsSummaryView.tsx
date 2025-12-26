import type { ReactNode } from "react";

import type { AnalyticsSummary } from "@/lib/analytics";

type AnalyticsSummaryViewProps = {
  summary: AnalyticsSummary | null;
  error: string | null;
};

export default function AnalyticsSummaryView({
  summary,
  error,
}: AnalyticsSummaryViewProps) {
  const totalEvents = summary?.total_events ?? 0;
  const totalRecs = summary?.total_recommendations ?? 0;
  const topGoals = summary?.top_goals ?? [];

  const maxGoalCount =
    topGoals.length > 0
      ? topGoals.reduce((max, g) => (g.count > max ? g.count : max), 0)
      : 1;

  const cardClass =
    "rounded-card border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md lg:p-6";

  return (
    <div className="space-y-7">
      <header className={cardClass}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center rounded-pill bg-accent-400 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-900">
              Reports · Overview
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 lg:text-3xl">
              Analytics Overview
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Monitor how campaigns and recommendations perform over time.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="rounded-pill bg-slate-100 px-3 py-1">
              Last 12 months
            </span>
            <span className="rounded-pill bg-slate-100 px-3 py-1">
              All campaigns
            </span>
            <span className="rounded-pill bg-brand-50 px-3 py-1 font-semibold text-brand-600">
              This Year
            </span>
          </div>
        </div>
      </header>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Top metrics row */}
      <section className="grid gap-6 md:grid-cols-3">
        {/* Total events */}
        <MetricCard
          title="Tracked events"
          value={totalEvents.toLocaleString()}
          pill="+18% vs last week"
          pillTone="positive"
          isLoading={!summary}
        />
        {/* Total recommendations */}
        <MetricCard
          title="Recommendations generated"
          value={totalRecs.toLocaleString()}
          pill="AI matches logged"
          pillTone="neutral"
          isLoading={!summary}
        />
        {/* Active goals */}
        <MetricCard
          title="Active campaign goals"
          value={topGoals.length.toString()}
          pill="Top 3 goal themes"
          pillTone="neutral"
          isLoading={!summary}
          extra={
            summary && topGoals.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1">
                {topGoals.map((g) => (
                  <span
                    key={g.goal}
                    className="inline-flex rounded-pill bg-slate-100 px-2.5 py-1 text-[11px] text-slate-700"
                  >
                    {g.goal}
                  </span>
                ))}
              </div>
            ) : null
          }
        />
      </section>

      {/* Charts row */}
      <section className="grid gap-6 lg:grid-cols-2">
        {/* CTR card */}
        <div className={cardClass}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Click-through rate (CTR)
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                2.4%
              </p>
              <p className="mt-1 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                ▲ 28% vs last month
              </p>
            </div>
          </div>
          {/* Simple bar chart demo */}
          <div className="mt-4 flex h-40 items-end justify-between gap-1 rounded-xl bg-slate-50 px-4 py-4">
            {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"].map(
              (label, idx) => {
                const heights = [30, 46, 60, 52, 55, 65, 70, 80];
                const h = heights[idx];
                return (
                  <div
                    key={label}
                    className="flex flex-1 flex-col items-center gap-2"
                  >
                    <div className="flex h-24 w-full items-end justify-center">
                      <div className="relative h-full w-full rounded-full bg-slate-200">
                        <div
                          className="absolute bottom-0 left-0 right-0 rounded-full bg-orange-400"
                          style={{ height: `${h}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500">{label}</span>
                  </div>
                );
              }
            )}
          </div>
        </div>

        {/* Audience growth card */}
        <div className={cardClass}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Audience growth
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Combined reach across recommended influencers (demo values).
              </p>
            </div>
            <div className="flex gap-1 text-[11px]">
              <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">
                Today
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">
                This Week
              </span>
              <span className="rounded-full bg-brand-600 px-2 py-1 font-medium text-white">
                This Year
              </span>
            </div>
          </div>

          {/* Simple line chart using SVG */}
          <div className="mt-2 rounded-xl bg-slate-50 p-4">
            <svg viewBox="0 0 100 40" className="h-32 w-full">
              <defs>
                <linearGradient id="lineGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0 30 L10 24 L20 20 L30 18 L40 22 L50 19 L60 16 L70 14 L80 10 L90 8 L100 5"
                fill="none"
                stroke="#4f46e5"
                strokeWidth={1.5}
              />
              <path
                d="M0 40 L0 30 L10 24 L20 20 L30 18 L40 22 L50 19 L60 16 L70 14 L80 10 L90 8 L100 5 L100 40 Z"
                fill="url(#lineGradient)"
              />
              {/* Highlight point */}
              <circle cx="40" cy="22" r="1.7" fill="#4f46e5" />
            </svg>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>Jan</span>
              <span>Mar</span>
              <span>Jun</span>
              <span>Aug</span>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom row: goals + sentiment */}
      <section className="grid gap-6 lg:grid-cols-[1.4fr,0.9fr]">
        {/* Top goals */}
        <div className={cardClass}>
          <h2 className="text-sm font-semibold text-slate-900">
            Top campaign goals
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Based on the most common objectives sent when running the matching
            engine.
          </p>

          {!summary ? (
            <div className="mt-4 space-y-3">
              {[1, 2, 3].map((k) => (
                <div
                  key={k}
                  className="h-8 animate-pulse rounded-lg bg-slate-100"
                />
              ))}
            </div>
          ) : topGoals.length === 0 ? (
            <p className="mt-4 text-xs text-slate-500">
              No goal analytics yet. Run a few campaigns from the dashboard to
              populate this view.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {topGoals.map((g) => {
                const width = `${(g.count / maxGoalCount) * 100}%`;
                return (
                  <div key={g.goal} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800">
                        {g.goal}
                      </span>
                      <span className="text-slate-500">
                        {g.count.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-indigo-500"
                        style={{ width }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sentiment + customers (demo) */}
        <div className="space-y-4">
          {/* Sentiment gauge (demo) */}
          <div className={cardClass}>
            <h2 className="text-sm font-semibold text-slate-900">
              Sentiment (demo)
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Example sentiment score across influencer content for campaigns
              run with NivoxAI.
            </p>
            <div className="mt-4 flex flex-col items-center">
              <div className="h-20 w-40 rounded-t-full bg-gradient-to-r from-red-400 via-yellow-300 to-emerald-400" />
              <div className="-mt-10 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow">
                <span className="text-lg font-semibold text-slate-900">
                  4.8
                </span>
              </div>
              <p className="mt-2 text-xs font-medium text-emerald-600">
                Positive
              </p>
            </div>
          </div>

          {/* Customers demo */}
          <div className={cardClass}>
            <h2 className="text-sm font-semibold text-slate-900">
              Demo customers
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Simulated number of campaigns / accounts that have run matches.
            </p>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <p className="text-2xl font-semibold text-slate-900">2,420</p>
                <p className="mt-1 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                  ▲ 25% vs last month
                </p>
              </div>
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((k) => (
                  <div
                    key={k}
                    className="h-8 w-8 rounded-full bg-slate-200"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

type MetricCardProps = {
  title: string;
  value: string;
  pill: string;
  pillTone: "positive" | "neutral";
  isLoading: boolean;
  extra?: ReactNode;
};

function MetricCard({
  title,
  value,
  pill,
  pillTone,
  isLoading,
  extra,
}: MetricCardProps) {
  const pillClasses =
    pillTone === "positive"
      ? "bg-emerald-50 text-emerald-700"
      : "bg-slate-100 text-slate-600";

  return (
    <div className="rounded-card border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md lg:p-6">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {title}
      </p>
      {isLoading ? (
        <div className="mt-3 space-y-2">
          <div className="h-6 w-20 animate-pulse rounded bg-slate-100" />
          <div className="h-5 w-24 animate-pulse rounded-full bg-slate-100" />
        </div>
      ) : (
        <>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {value}
          </p>
          <p
            className={`mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${pillClasses}`}
          >
            {pill}
          </p>
        </>
      )}
      {extra}
    </div>
  );
}
