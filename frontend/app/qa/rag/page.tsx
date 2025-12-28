"use client";

import { useState } from "react";
import { requestJson } from "@/lib/apiClient";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";

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
  mode?: string | null;
  rerank?: boolean | null;
  candidate_k?: number | null;
  timings_ms?: number | null;
};

export default function QARagPage() {
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
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">QA Console</p>
        <h1 className="text-2xl font-semibold text-slate-900">RAG Retrieval</h1>
        <p className="text-sm text-slate-600">
          Test vector/keyword/hybrid modes with rerank toggles and metadata.
        </p>
      </header>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Query</h3>
          <p className="text-sm text-slate-500">POST /api/rag</p>
        </CardHeader>
        <CardBody className="space-y-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <div className="grid gap-3 md:grid-cols-4">
            <label className="text-xs text-slate-500">
              Mode
              <select
                value={mode}
                onChange={(event) => setMode(event.target.value as typeof mode)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
              >
                <option value="vector">Vector</option>
                <option value="keyword">Keyword</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </label>
            <label className="text-xs text-slate-500">
              top_k
              <input
                type="number"
                value={topK}
                onChange={(event) => setTopK(Number(event.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
              />
            </label>
            <label className="text-xs text-slate-500">
              candidate_k
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
              Rerank
            </label>
          </div>
          <Button onClick={runSearch}>Run retrieval</Button>
          {error ? <p className="text-xs text-rose-600">{error}</p> : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Results</h3>
          <p className="text-sm text-slate-500">Top matches with metadata</p>
        </CardHeader>
        <CardBody className="space-y-3">
          {results.length ? (
            results.map((hit) => (
              <div key={hit.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-900">{hit.name}</p>
                  <span className="text-emerald-600">score {hit.score.toFixed(3)}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{hit.bio}</p>
                <div className="mt-2 grid gap-1 text-[11px] text-slate-500 md:grid-cols-2">
                  <span>category: {hit.category}</span>
                  <span>region: {hit.region}</span>
                  <span>tenant: {hit.tenant_id ?? "public"}</span>
                  <span>source: {hit.source ?? "n/a"}</span>
                  <span>last_updated: {hit.last_updated_at ?? "n/a"}</span>
                  <span>mode: {hit.mode ?? mode}</span>
                  <span>rerank: {String(hit.rerank ?? rerank)}</span>
                  <span>latency_ms: {hit.timings_ms ?? "n/a"}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500">No results yet.</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
