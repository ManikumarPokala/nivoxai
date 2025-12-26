"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/Table";
import { demoCampaigns } from "@/lib/demo-data";
import type { CampaignInput } from "@/lib/api";

const statusMap: Record<string, "success" | "warning" | "info"> = {
  Active: "success",
  Draft: "warning",
  Paused: "info",
};

export default function CampaignsPage() {
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<CampaignInput[]>(demoCampaigns);
  const [statusById, setStatusById] = useState<Record<string, string>>({
    "camp-demo-001": "Active",
    "camp-demo-002": "Active",
    "camp-demo-003": "Draft",
  });

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

  function handleCreateCampaign(formData: CampaignInput) {
    setCampaigns((prev) => [formData, ...prev]);
    setStatusById((prev) => ({ ...prev, [formData.id]: "Draft" }));
    setIsModalOpen(false);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Campaigns
            </p>
            <h2 className="text-xl font-semibold text-slate-900">
              Campaign portfolio
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
            <Button onClick={() => setIsModalOpen(true)}>Create Campaign</Button>
          </div>
        </CardHeader>
        <CardBody>
          {filteredCampaigns.length === 0 ? (
            <EmptyState
              title="No campaigns found"
              description="Create a new campaign to start generating recommendations and strategies."
              action={<Button onClick={() => setIsModalOpen(true)}>New campaign</Button>}
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

type CampaignFormProps = {
  onSubmit: (campaign: CampaignInput) => void;
};

function CampaignForm({ onSubmit }: CampaignFormProps) {
  const [formState, setFormState] = useState<CampaignInput>({
    id: `camp-${Math.random().toString(36).slice(2, 8)}`,
    brand_name: "",
    goal: "",
    target_region: "",
    target_age_range: "",
    budget: 0,
    description: "",
  });

  function updateField<K extends keyof CampaignInput>(
    key: K,
    value: CampaignInput[K]
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
        value={formState.brand_name}
        onChange={(event) => updateField("brand_name", event.target.value)}
        placeholder="Brand name"
        className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
        required
      />
      <input
        value={formState.goal}
        onChange={(event) => updateField("goal", event.target.value)}
        placeholder="Goal"
        className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
        required
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={formState.target_region}
          onChange={(event) => updateField("target_region", event.target.value)}
          placeholder="Target region"
          className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
          required
        />
        <input
          value={formState.target_age_range}
          onChange={(event) => updateField("target_age_range", event.target.value)}
          placeholder="Target age range"
          className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
          required
        />
      </div>
      <input
        type="number"
        value={formState.budget}
        onChange={(event) => updateField("budget", Number(event.target.value))}
        placeholder="Budget"
        className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
        required
      />
      <textarea
        value={formState.description}
        onChange={(event) => updateField("description", event.target.value)}
        placeholder="Campaign description"
        className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
        rows={4}
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
