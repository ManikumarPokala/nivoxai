import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { getHealthAI, getHealthAPI } from "@/lib/api";
import { AI_BASE_URL, API_BASE_URL } from "@/lib/urls";

export default async function SettingsPage() {
  const [aiHealth, apiHealth] = await Promise.all([
    getHealthAI(),
    getHealthAPI(),
  ]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
            Settings
          </p>
          <h2 className="text-xl font-semibold">Environment status</h2>
          <p className="text-sm text-slate-500">
            Validate service connectivity for demos and workshops.
          </p>
        </CardHeader>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">AI Service</h3>
            <p className="text-sm text-slate-500">{AI_BASE_URL}</p>
          </CardHeader>
          <CardBody className="flex items-center gap-2">
            <Badge variant={aiHealth.data ? "success" : "warning"}>
              {aiHealth.data ? "Healthy" : "Unavailable"}
            </Badge>
            <span className="text-sm text-slate-500">
              {aiHealth.error ?? "AI endpoints responding."}
            </span>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">API Gateway</h3>
            <p className="text-sm text-slate-500">{API_BASE_URL}</p>
          </CardHeader>
          <CardBody className="flex items-center gap-2">
            <Badge variant={apiHealth.data ? "success" : "warning"}>
              {apiHealth.data ? "Healthy" : "Unavailable"}
            </Badge>
            <span className="text-sm text-slate-500">
              {apiHealth.error ?? "API endpoints responding."}
            </span>
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
