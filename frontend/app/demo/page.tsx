"use client";

import Link from "next/link";
import { useState } from "react";
import { requestJson } from "@/lib/apiClient";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function DemoPage() {
  const [status, setStatus] = useState<string | null>(null);

  const startDemo = async () => {
    const result = await requestJson("/api/auth/demo", { method: "POST" });
    setStatus(result.error ? `Failed: ${result.error}` : "Session active");
  };

  return (
    <div className="space-y-6 px-6 py-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Demo Flow</p>
        <h1 className="text-2xl font-semibold text-slate-900">2-Minute Reviewer Tour</h1>
        <p className="text-sm text-slate-600">
          Follow the steps below to exercise recommendations, agent trace, and analytics.
        </p>
      </header>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Step 1 — Start demo session</h3>
          <p className="text-sm text-slate-500">Bootstrap auth + tenant cookies</p>
        </CardHeader>
        <CardBody className="space-y-3">
          <Button onClick={startDemo}>Start demo session</Button>
          {status ? <p className="text-xs text-slate-500">{status}</p> : null}
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Step 2 — Campaigns</h3>
            <p className="text-sm text-slate-500">Create or select a campaign</p>
          </CardHeader>
          <CardBody>
            <Link href="/qa/campaigns" className="text-sm font-semibold text-slate-700">
              Open QA Campaigns →
            </Link>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Step 3 — Recommendations</h3>
            <p className="text-sm text-slate-500">Run ranking + explainability</p>
          </CardHeader>
          <CardBody>
            <Link href="/qa/recommend" className="text-sm font-semibold text-slate-700">
              Open QA Recommend →
            </Link>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Step 4 — Agent Trace</h3>
            <p className="text-sm text-slate-500">Generate strategy + trace</p>
          </CardHeader>
          <CardBody>
            <Link href="/qa/agent" className="text-sm font-semibold text-slate-700">
              Open QA Agent →
            </Link>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Step 5 — Analytics</h3>
            <p className="text-sm text-slate-500">Summary + events</p>
          </CardHeader>
          <CardBody>
            <Link href="/qa/analytics" className="text-sm font-semibold text-slate-700">
              Open QA Analytics →
            </Link>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Diagnostics</h3>
          <p className="text-sm text-slate-500">
            Use the Diagnostics drawer to inspect every request.
          </p>
        </CardHeader>
        <CardBody>
          <Link href="/qa/ops" className="text-sm font-semibold text-slate-700">
            Open QA Ops →
          </Link>
        </CardBody>
      </Card>
    </div>
  );
}
