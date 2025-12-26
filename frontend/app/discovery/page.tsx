"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import { ragInfluencers, type RagResult } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export default function DiscoveryPage() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [topK, setTopK] = useState(5);
  const [filters, setFilters] = useState({
    instagram: true,
    tiktok: true,
    youtube: false,
    thailand: true,
    singapore: false,
  });
  const [results, setResults] = useState<RagResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    if (!query.trim()) {
      setError("Enter a search query to discover influencers.");
      return;
    }

    setIsLoading(true);
    setError(null);
    const response = await ragInfluencers(query, topK);
    if (response.error || !response.data) {
      setError(response.error ?? "Search failed.");
      setIsLoading(false);
      return;
    }
    setResults(response.data.results ?? []);
    setIsLoading(false);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
            {t("nav_discovery")}
          </p>
          <h2 className="text-xl font-semibold">{t("page_discovery_title")}</h2>
          <p className="text-sm text-slate-500">
            Use RAG to explore creators, niches, and campaign fit signals.
          </p>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search for creators, niches, or regions"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm"
            />
            <div className="flex items-center gap-3">
              <select
                value={topK}
                onChange={(event) => setTopK(Number(event.target.value))}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                {[3, 5, 8, 10].map((value) => (
                  <option key={value} value={value}>
                    Top {value}
                  </option>
                ))}
              </select>
              <Button onClick={handleSearch} disabled={isLoading}>
                {isLoading ? "Searching" : "Search"}
              </Button>
            </div>
          </div>
          <div className="mt-4 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Platforms
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                {([
                  ["instagram", "Instagram"],
                  ["tiktok", "TikTok"],
                  ["youtube", "YouTube"],
                ] as const).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters[key]}
                      onChange={(event) =>
                        setFilters((prev) => ({
                          ...prev,
                          [key]: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Regions
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                {([
                  ["thailand", "Thailand"],
                  ["singapore", "Singapore"],
                ] as const).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters[key]}
                      onChange={(event) =>
                        setFilters((prev) => ({
                          ...prev,
                          [key]: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>
          {error ? (
            <p className="mt-3 text-xs text-rose-600">{error}</p>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Results</h3>
          <p className="text-sm text-slate-500">
            Explore RAG outputs and shortlist creators.
          </p>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : results.length ? (
            <div className="space-y-3">
              {results.map((result, index) => (
                <div
                  key={result.id ?? index}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">
                      {result.name ?? result.id ?? "Influencer"}
                    </p>
                    <span className="text-xs text-slate-500">
                      Score {result.score ?? "—"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {result.summary ?? "No summary provided."}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title={t("empty_discovery_title")}
              description={t("empty_discovery_desc")}
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
