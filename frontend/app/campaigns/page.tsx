"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/Table";
import {
  createCampaign,
  getCampaigns,
  type CampaignInput,
} from "@/lib/api";
import { logAnalyticsEvent } from "@/lib/analytics";
import { useI18n } from "@/lib/i18n";

const statusMap: Record<string, "success" | "warning" | "info"> = {
  Active: "success",
  Draft: "warning",
  Paused: "info",
};

export default function CampaignsPage() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<CampaignInput[]>([]);
  const [statusById, setStatusById] = useState<Record<string, string>>({
    "camp-demo-001": "Active",
    "camp-demo-002": "Active",
    "camp-demo-003": "Draft",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    getCampaigns().then((result) => {
      if (!active) {
        return;
      }
      if (result.data) {
        const list = normalizeCampaignList(result.data);
        setCampaigns(list);
      }
      setError(result.error);
      setIsLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const filteredCampaigns = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return campaigns;
    }
    return campaigns.filter((campaign) =>
      [campaign.brand_name, campaign.goal, campaign.target_region]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [campaigns, search]);

  async function handleCreateCampaign(formData: {
    title: string;
    country: string;
    budget: number;
  }) {
    const result = await createCampaign(formData);
    if (result.data) {
      const created = normalizeCampaignItem(result.data);
      if (created.id) {
        setCampaigns((prev) => [created, ...prev]);
        setStatusById((prev) => ({ ...prev, [created.id]: "Draft" }));
        void logAnalyticsEvent({
          event_type: "campaign_created",
          campaign_id: created.id,
          metadata: {
            goal: created.goal,
            region: created.target_region,
          },
        });
      }
      setIsModalOpen(false);
      return;
    }
    setError(result.error ?? "Failed to create campaign.");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              {t("nav_campaigns")}
            </p>
            <h2 className="text-xl font-semibold text-slate-900">
              {t("page_campaigns_title")}
            </h2>
            <p className="text-sm text-slate-500">
              Track launches, content briefs, and performance status in one view.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search campaigns, goals, regions"
              className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm outline-none focus:border-slate-400 sm:w-64"
            />
            <Button onClick={() => setIsModalOpen(true)}>
              {t("action_create_campaign")}
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <div className="grid gap-3">
              <div className="h-16 rounded-2xl bg-slate-100" />
              <div className="h-16 rounded-2xl bg-slate-100" />
              <div className="h-16 rounded-2xl bg-slate-100" />
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <EmptyState
              title={t("empty_campaigns_title")}
              description={t("empty_campaigns_desc")}
              action={
                <Button onClick={() => setIsModalOpen(true)}>
                  {t("action_create_campaign")}
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <th className="px-4 py-3">Campaign Name</th>
                  <th className="px-4 py-3">Goal</th>
                  <th className="px-4 py-3">Region</th>
                  <th className="px-4 py-3">Age Range</th>
                  <th className="px-4 py-3">Budget</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </TableHead>
              <TableBody>
                {filteredCampaigns.map((campaign) => (
                  <TableRow key={campaign.id} className="even:bg-slate-50/60">
                    <TableCell className="font-semibold text-slate-900">
                      {campaign.brand_name}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {campaign.goal}
                    </TableCell>
                    <TableCell>{campaign.target_region}</TableCell>
                    <TableCell>{campaign.target_age_range}</TableCell>
                    <TableCell>${campaign.budget.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={statusMap[statusById[campaign.id] ?? "Active"]}>
                        {statusById[campaign.id] ?? "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/campaigns/${campaign.id}`}
                        className="text-sm font-semibold text-slate-700 hover:text-slate-900"
                      >
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {error ? (
            <p className="mt-3 text-xs text-rose-600">{error}</p>
          ) : null}
        </CardBody>
      </Card>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Create Campaign</h3>
              <button
                type="button"
                className="text-sm text-slate-500"
                onClick={() => setIsModalOpen(false)}
              >
                Close
              </button>
            </div>
            <CampaignForm onSubmit={handleCreateCampaign} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

type CampaignItemPayload = CampaignInput | { campaign?: CampaignInput };
type CampaignListPayload = CampaignInput[] | { campaigns?: CampaignInput[] };

function normalizeCampaignItem(payload: CampaignItemPayload): CampaignInput {
  if ("campaign" in payload && payload.campaign) {
    return payload.campaign;
  }
  if (isCampaignInput(payload)) {
    return payload;
  }
  return {
    id: "camp-unknown",
    brand_name: "Unknown Campaign",
    goal: "Unknown goal",
    target_region: "Unknown region",
    target_age_range: "Unknown",
    budget: 0,
    description: "Campaign details unavailable.",
  };
}

function normalizeCampaignList(payload: CampaignListPayload): CampaignInput[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  return payload.campaigns ?? [];
}

function isCampaignInput(payload: CampaignItemPayload): payload is CampaignInput {
  return (
    "id" in payload &&
    typeof payload.id === "string" &&
    "brand_name" in payload &&
    typeof payload.brand_name === "string" &&
    "goal" in payload &&
    typeof payload.goal === "string" &&
    "target_region" in payload &&
    typeof payload.target_region === "string" &&
    "target_age_range" in payload &&
    typeof payload.target_age_range === "string" &&
    "description" in payload &&
    typeof payload.description === "string" &&
    "budget" in payload &&
    typeof payload.budget === "number"
  );
}

type CampaignFormProps = {
  onSubmit: (campaign: { title: string; country: string; budget: number }) => void;
};

function CampaignForm({ onSubmit }: CampaignFormProps) {
  const [formState, setFormState] = useState({
    title: "",
    country: "",
    budget: 0,
  });

  function updateField<K extends keyof typeof formState>(
    key: K,
    value: (typeof formState)[K]
  ) {
    setFormState((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form
      className="mt-5 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(formState);
      }}
    >
      <input
        value={formState.title}
        onChange={(event) => updateField("title", event.target.value)}
        placeholder="Campaign title"
        className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
        required
      />
      <input
        value={formState.country}
        onChange={(event) => updateField("country", event.target.value)}
        placeholder="Target country"
        className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
        required
      />
      <input
        type="number"
        value={formState.budget}
        onChange={(event) => updateField("budget", Number(event.target.value))}
        placeholder="Budget"
        className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
        required
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => onSubmit(formState)}>
          Save Draft
        </Button>
        <Button type="submit">Create Campaign</Button>
      </div>
    </form>
  );
}
