"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, PlusCircle, RefreshCcw, Save, Target } from "lucide-react";
import { requestJson } from "@/lib/apiClient";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import JsonPanel from "@/components/ui/JsonPanel";
import { useI18n } from "@/i18n";

type Campaign = {
  id: string;
  brand_name: string;
  goal: string;
  target_region: string;
  target_age_range: string;
  budget: number;
  description: string;
};

export default function QACampaignsPage() {
  const { t } = useI18n();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [rawPayload, setRawPayload] = useState<string>("{}");
  const [error, setError] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    brand_name: "Demo Brand",
    goal: "Launch awareness",
    target_region: "Thailand",
    target_age_range: "18-35",
    budget: 25000,
    description: "QA campaign seed",
  });

  const selectedCampaign = useMemo(
    () => campaigns.find((c) => c.id === selectedId) ?? null,
    [campaigns, selectedId]
  );

  const loadCampaigns = async () => {
    const result = await requestJson<Campaign[] | { campaigns?: Campaign[] }>("/api/campaigns");
    if (result.error) {
      setError(result.error);
      return;
    }
    const list = Array.isArray(result.data)
      ? result.data
      : result.data?.campaigns ?? [];
    setCampaigns(list as Campaign[]);
    if (!selectedId && list.length) {
      setSelectedId(list[0].id);
    }
    setError(null);
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const createCampaign = async () => {
    const result = await requestJson<Campaign>("/api/campaigns", {
      method: "POST",
      body: JSON.stringify(formState),
    });
    if (result.error) {
      setError(result.error);
      return;
    }
    await loadCampaigns();
  };

  const updateCampaign = async () => {
    if (!selectedId) {
      setUpdateStatus(t("empty_select_campaign"));
      return;
    }
    const result = await requestJson<Campaign>(`/api/campaigns/${selectedId}`, {
      method: "PATCH",
      body: JSON.stringify({
        goal: formState.goal,
        budget: formState.budget,
        description: formState.description,
      }),
    });
    setUpdateStatus(result.error ? `${t("status_fail")}: ${result.error}` : t("status_pass"));
    if (!result.error) {
      await loadCampaigns();
    }
  };

  const sendInvalidPayload = async () => {
    setError(null);
    await requestJson("/api/campaigns", {
      method: "POST",
      body: JSON.stringify({ invalid: true }),
    });
  };

  return (
    <div className="space-y-6 px-6 py-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
          {t("qa_console_label")}
        </p>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
          <Target className="h-6 w-6 text-slate-700" />
          {t("nav_qa_campaigns")}
        </h1>
        <p className="text-sm text-slate-600">{t("qa_campaigns_desc")}</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">{t("qa_campaigns_list")}</h3>
            <p className="text-sm text-slate-500">{t("qa_campaigns_get")}</p>
          </CardHeader>
          <CardBody>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={loadCampaigns} className="w-full sm:w-auto">
                <span className="flex items-center gap-2">
                  <RefreshCcw className="h-4 w-4" />
                  {t("action_refresh")}
                </span>
              </Button>
              <Button variant="ghost" onClick={sendInvalidPayload} className="w-full sm:w-auto">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {t("action_invalid_payload")}
                </span>
              </Button>
            </div>
            {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
            <div className="mt-4 max-h-56 space-y-2 overflow-auto text-sm">
              {campaigns.map((campaign) => (
                <button
                  key={campaign.id}
                  onClick={() => {
                    setSelectedId(campaign.id);
                    setRawPayload(JSON.stringify(campaign, null, 2));
                  }}
                  className={`w-full rounded-xl border px-3 py-2 text-left ${
                    selectedId === campaign.id
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  <p className="text-sm font-semibold">{campaign.brand_name}</p>
                  <p className="text-xs opacity-70">{campaign.id}</p>
                </button>
              ))}
              {!campaigns.length ? (
                <p className="text-xs text-slate-500">{t("empty_no_results")}</p>
              ) : null}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">{t("qa_campaigns_create_update")}</h3>
            <p className="text-sm text-slate-500">{t("qa_campaigns_post_patch")}</p>
          </CardHeader>
          <CardBody className="space-y-3 text-sm text-slate-600">
            <div className="grid gap-3 md:grid-cols-2">
              {(
                [
                  ["brand_name", t("field_brand_name")],
                  ["goal", t("field_goal")],
                  ["target_region", t("field_region")],
                  ["target_age_range", t("field_age_range")],
                  ["budget", t("field_budget")],
                ] as const
              ).map(([field, label]) => (
                <label key={field} className="text-xs">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    {label}
                  </span>
                  <input
                    value={(formState as any)[field]}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        [field]:
                          field === "budget"
                            ? Number(event.target.value)
                            : event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                  />
                </label>
              ))}
            </div>
            <label className="text-xs">
              <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                {t("field_description")}
              </span>
              <textarea
                value={formState.description}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, description: event.target.value }))
                }
                rows={3}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
              />
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button onClick={createCampaign} className="w-full sm:w-auto">
                <span className="flex items-center gap-2">
                  <PlusCircle className="h-4 w-4" />
                  {t("action_create_campaign")}
                </span>
              </Button>
              <Button variant="ghost" onClick={updateCampaign} className="w-full sm:w-auto">
                <span className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  {t("action_update_campaign")}
                </span>
              </Button>
              {updateStatus ? (
                <span className="text-xs text-slate-500">{updateStatus}</span>
              ) : null}
            </div>
            {selectedCampaign ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <p className="font-semibold">{t("qa_campaigns_selected")}</p>
                <p className="mt-1">{selectedCampaign.brand_name}</p>
                <p className="text-[11px] text-slate-500">{selectedCampaign.id}</p>
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">{t("qa_campaigns_raw")}</h3>
          <p className="text-sm text-slate-500">{t("qa_campaigns_payload_preview")}</p>
        </CardHeader>
        <CardBody>
          <JsonPanel title={t("qa_campaigns_payload_preview")} data={rawPayload} defaultOpen />
        </CardBody>
      </Card>
    </div>
  );
}
