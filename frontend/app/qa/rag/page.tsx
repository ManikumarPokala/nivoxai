"use client";

import { useState } from "react";
import { Database, Search } from "lucide-react";
import { requestJson } from "@/lib/apiClient";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useI18n } from "@/i18n";

type RagHit = {
  id: string;
  name: string;
  bio: string;
  category: string;
  region: string;
  score: number;
  tenant_id?: string | null;
  source?: string | null;
  last_updated_at?: string | null;
  freshness_days?: number | null;
  freshness_score?: number | null;
  mode?: string | null;
  rerank?: boolean | null;
  candidate_k?: number | null;
  timings_ms?: number | null;
};

export default function QARagPage() {
  const { t } = useI18n();
  const [query, setQuery] = useState("skincare creators in Thailand");
  const [mode, setMode] = useState<"vector" | "keyword" | "hybrid">("hybrid");
  const [topK, setTopK] = useState(5);
  const [candidateK, setCandidateK] = useState(15);
  const [rerank, setRerank] = useState(false);
  const [results, setResults] = useState<RagHit[]>([]);
  const [error, setError] = useState<string | null>(null);

  const runSearch = async () => {
    const result = await requestJson<RagHit[]>("/api/rag", {
      method: "POST",
      body: JSON.stringify({
        query,
        top_k: topK,
        mode,
        rerank,
        candidate_k: candidateK,
      }),
    });
    if (result.error) {
      setError(result.error);
      return;
    }
    setResults(result.data ?? []);
    setError(null);
  };

  return (
    <div className="space-y-6 px-6 py-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
          {t("qa_console_label")}
        </p>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
          <Database className="h-6 w-6 text-slate-700" />
          {t("nav_qa_rag")}
        </h1>
        <p className="text-sm text-slate-600">{t("qa_rag_desc")}</p>
      </header>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">{t("qa_rag_query")}</h3>
          <p className="text-sm text-slate-500">POST /api/rag</p>
        </CardHeader>
        <CardBody className="space-y-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("qa_rag_query_placeholder")}
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <div className="grid gap-3 md:grid-cols-4">
            <label className="text-xs text-slate-500">
              {t("qa_rag_mode")}
              <select
                value={mode}
                onChange={(event) => setMode(event.target.value as typeof mode)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
              >
                <option value="vector">{t("qa_rag_mode_vector")}</option>
                <option value="keyword">{t("qa_rag_mode_keyword")}</option>
                <option value="hybrid">{t("qa_rag_mode_hybrid")}</option>
              </select>
            </label>
            <label className="text-xs text-slate-500">
              {t("qa_rag_topk")}
              <input
                type="number"
                value={topK}
                onChange={(event) => setTopK(Number(event.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
              />
            </label>
            <label className="text-xs text-slate-500">
              {t("qa_rag_candidate_k")}
              <input
                type="number"
                value={candidateK}
                onChange={(event) => setCandidateK(Number(event.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-500">
              <input
                type="checkbox"
                checked={rerank}
                onChange={(event) => setRerank(event.target.checked)}
              />
              {t("qa_rag_rerank")}
            </label>
          </div>
          <Button onClick={runSearch} className="w-full sm:w-auto">
            <span className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              {t("action_run_rag")}
            </span>
          </Button>
          {error ? <p className="text-xs text-rose-600">{error}</p> : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">{t("qa_rag_results")}</h3>
          <p className="text-sm text-slate-500">{t("qa_rag_results_desc")}</p>
        </CardHeader>
        <CardBody className="space-y-3">
          {results.length ? (
            results.map((hit) => (
              <div key={hit.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-900">{hit.name}</p>
                  <span className="text-emerald-600">
                    {t("qa_recommend_score_label")} {hit.score.toFixed(3)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{hit.bio}</p>
                <div className="mt-2 grid gap-1 text-[11px] text-slate-500 md:grid-cols-2">
                  <span>
                    {t("qa_rag_label_category")}: {hit.category}
                  </span>
                  <span>
                    {t("qa_rag_label_region")}: {hit.region}
                  </span>
                  <span>
                    {t("qa_rag_label_tenant")}: {hit.tenant_id ?? t("qa_label_public")}
                  </span>
                  <span>
                    {t("qa_rag_label_source")}: {hit.source ?? t("qa_label_na")}
                  </span>
                  <span>
                    {t("qa_rag_label_last_updated")}: {hit.last_updated_at ?? t("qa_label_na")}
                  </span>
                  <span>
                    {t("qa_rag_label_freshness_days")}: {hit.freshness_days ?? t("qa_label_na")}
                  </span>
                  <span>
                    {t("qa_rag_label_freshness_score")}: {hit.freshness_score ?? t("qa_label_na")}
                  </span>
                  <span>
                    {t("qa_rag_label_mode")}: {hit.mode ?? mode}
                  </span>
                  <span>
                    {t("qa_rag_label_rerank")}: {String(hit.rerank ?? rerank)}
                  </span>
                  <span>
                    {t("qa_rag_label_latency")}: {hit.timings_ms ?? t("qa_label_na")}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500">{t("qa_rag_no_hits")}</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
