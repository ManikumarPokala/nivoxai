import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { getAnalyticsSummary } from "@/lib/analytics";

export default async function AnalyticsPage() {
  const summary = await getAnalyticsSummary();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
            Analytics
          </p>
          <h2 className="text-xl font-semibold">Performance overview</h2>
          <p className="text-sm text-slate-500">
            Aggregated KPIs from the backend API analytics service.
          </p>
        </CardHeader>
      </Card>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Total Events
            </p>
            <h3 className="text-2xl font-semibold">
              {summary.data?.total_events ?? "—"}
            </h3>
          </CardHeader>
          <CardBody className="text-sm text-slate-500">
            {summary.error ? "Endpoint not configured." : "Tracking signals ingested."}
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Recommendations
            </p>
            <h3 className="text-2xl font-semibold">
              {summary.data?.total_recommendations ?? "—"}
            </h3>
          </CardHeader>
          <CardBody className="text-sm text-slate-500">
            {summary.error ? "Connect analytics endpoint." : "Ranker output logged."}
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Top Goals
            </p>
            <h3 className="text-2xl font-semibold">
              {summary.data?.top_goals?.length ?? 0}
            </h3>
          </CardHeader>
          <CardBody className="text-sm text-slate-500">
            Goals with the most matching activity.
          </CardBody>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Top campaign goals</h3>
          <p className="text-sm text-slate-500">
            Priority outcomes used during recommendation runs.
          </p>
        </CardHeader>
        <CardBody>
          {summary.data?.top_goals?.length ? (
            <div className="space-y-3">
              {summary.data.top_goals.map((goal) => (
                <div
                  key={goal.goal}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {goal.goal}
                    </p>
                    <p className="text-xs text-slate-500">KPI focus</p>
                  </div>
                  <Badge variant="info">{goal.count}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Analytics not configured"
              description="Wire the backend analytics endpoint to populate KPIs."
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
