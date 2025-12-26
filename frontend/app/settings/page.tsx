"use client";

import { useEffect, useState } from \"react\";
import { Card, CardBody, CardHeader } from \"@/components/ui/Card\";
import Badge from \"@/components/ui/Badge\";
import { getHealthAI, getHealthAPI } from \"@/lib/api\";
import { AI_BASE_URL, API_BASE_URL } from \"@/lib/urls\";
import { useI18n } from \"@/lib/i18n\";

export default function SettingsPage() {
  const { t } = useI18n();
  const [aiHealth, setAiHealth] = useState<{ status: string } | null>(null);
  const [apiHealth, setApiHealth] = useState<{ status: string } | null>(null);

  useEffect(() => {
    let active = true;
    getHealthAI().then((result) => {
      if (active) {
        setAiHealth(result.data);
      }
    });
    getHealthAPI().then((result) => {
      if (active) {
        setApiHealth(result.data);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
            {t("nav_settings")}
          </p>
          <h2 className="text-xl font-semibold">{t("page_settings_title")}</h2>
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
            <Badge variant={aiHealth ? "success" : "warning"}>
              {aiHealth ? t("status_available") : t("status_unavailable")}
            </Badge>
            <span className="text-sm text-slate-500">
              {aiHealth ? "AI endpoints responding." : "Check AI service."}
            </span>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">API Gateway</h3>
            <p className="text-sm text-slate-500">{API_BASE_URL}</p>
          </CardHeader>
          <CardBody className="flex items-center gap-2">
            <Badge variant={apiHealth ? "success" : "warning"}>
              {apiHealth ? t("status_available") : t("status_unavailable")}
            </Badge>
            <span className="text-sm text-slate-500">
              {apiHealth ? "API endpoints responding." : "Check API gateway."}
            </span>
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
