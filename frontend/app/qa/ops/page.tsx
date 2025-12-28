"use client";

import type React from "react";
import { useState } from "react";
import { requestJson } from "@/lib/apiClient";

type ResultState = {
  label: string;
  status: "idle" | "loading" | "success" | "error";
  payload: unknown | null;
  error: string | null;
};

const initialState: ResultState = {
  label: "",
  status: "idle",
  payload: null,
  error: null,
};

export default function QAOpsPage() {
  const [healthz, setHealthz] = useState<ResultState>({ ...initialState, label: "Healthz" });
  const [modelStatus, setModelStatus] = useState<ResultState>({
    ...initialState,
    label: "Model Status",
  });
  const [agentStatus, setAgentStatus] = useState<ResultState>({
    ...initialState,
    label: "Agent Status",
  });

  const callEndpoint = async (
    path: string,
    setState: React.Dispatch<React.SetStateAction<ResultState>>
  ) => {
    setState((prev) => ({ ...prev, status: "loading", error: null }));
    const result = await requestJson<unknown>(path, { method: "GET" });
    if (result.error) {
      setState((prev) => ({
        ...prev,
        status: "error",
        error: result.error,
        payload: result.data,
      }));
      return;
    }
    setState((prev) => ({
      ...prev,
      status: "success",
      payload: result.data,
      error: null,
    }));
  };

  return (
    <div className="space-y-6 px-6 py-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">QA Console</p>
        <h1 className="text-2xl font-semibold text-slate-900">Ops Health Checks</h1>
        <p className="text-sm text-slate-600">
          Trigger backend health checks and confirm response + request-id in the Inspector.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <button
          onClick={() => callEndpoint("/api/healthz", setHealthz)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Healthz</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">Backend API</p>
          <p className="mt-1 text-xs text-slate-500">GET /api/healthz</p>
        </button>
        <button
          onClick={() => callEndpoint("/api/model/status", setModelStatus)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Model Status</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">Backend AI</p>
          <p className="mt-1 text-xs text-slate-500">GET /api/model/status</p>
        </button>
        <button
          onClick={() => callEndpoint("/api/agent/status", setAgentStatus)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Agent Status</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">Backend AI</p>
          <p className="mt-1 text-xs text-slate-500">GET /api/agent/status</p>
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[healthz, modelStatus, agentStatus].map((state) => (
          <div
            key={state.label}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{state.label}</p>
              <span
                className={
                  state.status === "success"
                    ? "text-emerald-600"
                    : state.status === "error"
                      ? "text-rose-600"
                      : "text-slate-400"
                }
              >
                {state.status}
              </span>
            </div>
            {state.error ? (
              <p className="mt-2 text-xs text-rose-600">{state.error}</p>
            ) : null}
            <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-slate-50 p-2 text-[11px] text-slate-700">
              {state.payload ? JSON.stringify(state.payload, null, 2) : "No response yet."}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
