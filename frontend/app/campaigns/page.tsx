"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { useI18n } from "@/i18n";
import { getAuthToken, getStoredTenantId, getTokenRole, subscribeAuth } from "@/lib/auth";
import { recordActivity } from "@/lib/activity";
import { pushToast } from "@/lib/toast";

const statusMap: Record<string, "success" | "warning" | "info"> = {
  Active: "success",
  Draft: "warning",
  Paused: "info",
};

export default function CampaignsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<CampaignInput[]>([]);
  const [role, setRole] = useState<string | null>(getTokenRole());
  const [sessionActive, setSessionActive] = useState<boolean>(
    Boolean(getAuthToken() && getStoredTenantId())
  );
  const [isBootstrapping, setIsBootstrapping] = useState(false);
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

  useEffect(() => {
    const unsub = subscribeAuth(() => {
      setRole(getTokenRole());
      setSessionActive(Boolean(getAuthToken() && getStoredTenantId()));
    });
    return () => {
      unsub();
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
    if (role === "viewer") {
      pushToast({
        title: "Permission denied",
        description: "Viewer role cannot create campaigns.",
        variant: "error",
      });
      return;
    }
    const result = await createCampaign(formData);
    if (result.data) {
      const created = normalizeCampaignItem(result.data);
      if (!created) {
        setError("Campaign response invalid.");
        return;
      }
      setCampaigns((prev) => [created, ...prev]);
      recordActivity({
        title: "Campaign created",
        detail: `${created.brand_name} • ${created.goal}`,
        campaignId: created.id,
      });
      void logAnalyticsEvent({
        event_type: "campaign_created",
        campaign_id: created.id,
        metadata: {
          goal: created.goal,
          region: created.target_region,
        },
      });
      pushToast({
        title: "Campaign created",
        description: created.brand_name,
        variant: "success",
      });
      setIsModalOpen(false);
      return;
    }
    setError(result.error ?? "Failed to create campaign.");
  }

  async function handleCreateDemoCampaign() {
    setIsBootstrapping(true);
    setError(null);
    const result = await createCampaign({
      title: "Demo Campaign",
      country: "Thailand",
      budget: 12000,
    });
    if (result.error) {
      setError(result.error);
      setIsBootstrapping(false);
      return;
    }
    const created = result.data ? normalizeCampaignItem(result.data) : null;
    if (created) {
      setCampaigns((prev) => [created, ...prev]);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("nivoxai_last_campaign", created.id);
      }
      router.push(`/campaigns/${created.id}`);
    } else {
      const refreshed = await getCampaigns();
      if (refreshed.data) {
        setCampaigns(normalizeCampaignList(refreshed.data));
      }
    }
    setIsBootstrapping(false);
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
            <Button onClick={() => setIsModalOpen(true)} disabled={role === "viewer"}>
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
          title="No campaigns for this workspace"
          description="Create a demo campaign to start recommendations and strategy runs."
          action={
            <Button
              onClick={handleCreateDemoCampaign}
              disabled={!sessionActive || role === "viewer" || isBootstrapping}
            >
              {isBootstrapping ? "Creating..." : "Create demo campaign"}
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
                      <Badge variant={statusMap["Active"]}>
                        Active
                      </Badge>
                    </TableCell>
                  <TableCell>
                    {sessionActive && campaign.id && !campaign.id.startsWith("camp-demo-") ? (
                      <Link
                        href={`/campaigns/${campaign.id}`}
                        onClick={() => {
                          if (typeof window !== "undefined") {
                            window.localStorage.setItem("nivoxai_last_campaign", campaign.id);
                          }
                        }}
                        className="text-sm font-semibold text-slate-700 hover:text-slate-900"
                      >
                        View
                      </Link>
                    ) : (
                      <span className="text-sm font-semibold text-slate-400">
                        View
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>
          )}
          {error ? (
            <p className="mt-3 text-xs text-rose-600">{error}</p>
          ) : null}
          {!sessionActive ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
              Session missing. Paste JWT + tenant id in Settings to load campaigns.
            </div>
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

type CampaignApiPayload = Partial<CampaignInput> & {
  id?: string;
  campaign_id?: string;
  title?: string;
  country?: string;
};
type CampaignItemPayload = CampaignApiPayload | { campaign?: CampaignApiPayload | null };
type CampaignListPayload =
  | CampaignItemPayload[]
  | { campaigns?: CampaignItemPayload[] };

function isCampaignWrapper(
  value: unknown
): value is { campaign?: CampaignApiPayload | null } {
  return typeof value === "object" && value !== null && "campaign" in value;
}

function unwrapCampaign(payload: CampaignItemPayload): CampaignApiPayload | null {
  if (isCampaignWrapper(payload)) {
    return payload.campaign ?? null;
  }
  return payload;
}

function normalizeCampaignItem(payload: CampaignItemPayload): CampaignInput | null {
  const base = unwrapCampaign(payload);
  if (!base) {
    return null;
  }
  if (isCampaignInput(base)) {
    return base;
  }
  const id = base.id ?? base.campaign_id;
  if (!id || id === "undefined") {
    return null;
  }
  return {
    id,
    brand_name: base.brand_name ?? base.title ?? "Campaign",
    goal: base.goal ?? "New campaign launch",
    target_region: base.target_region ?? base.country ?? "Global",
    target_age_range: base.target_age_range ?? "18-34",
    budget: typeof base.budget === "number" ? base.budget : 0,
    description: base.description ?? "Campaign brief pending.",
  };
}

function normalizeCampaignList(payload: CampaignListPayload): CampaignInput[] {
  if (Array.isArray(payload)) {
    return payload
      .map((item) => normalizeCampaignItem(item))
      .filter((item): item is CampaignInput => Boolean(item));
  }
  return (payload.campaigns ?? [])
    .map((item) => normalizeCampaignItem(item))
    .filter((item): item is CampaignInput => Boolean(item));
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
