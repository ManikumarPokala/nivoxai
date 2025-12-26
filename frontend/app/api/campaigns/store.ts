export type CampaignRecord = {
  id: string;
  brand_name: string;
  goal: string;
  target_region: string;
  target_age_range: string;
  budget: number;
  description: string;
};

let campaigns: CampaignRecord[] = [
  {
    id: "camp-demo-001",
    brand_name: "Luma Beauty",
    goal: "Launch a summer skincare line",
    target_region: "Thailand",
    target_age_range: "18-24",
    budget: 25000,
    description:
      "Skincare and beauty focus for humid climates with glow routines.",
  },
  {
    id: "camp-demo-002",
    brand_name: "Pulse Activewear",
    goal: "Drive Q3 performance leggings sales",
    target_region: "Singapore",
    target_age_range: "25-34",
    budget: 38000,
    description: "Performance apparel drop for urban runners and gym creators.",
  },
  {
    id: "camp-demo-003",
    brand_name: "Nomad Coffee",
    goal: "Expand cold brew subscriptions",
    target_region: "Indonesia",
    target_age_range: "21-30",
    budget: 18000,
    description: "Lifestyle and café culture with focus on at-home rituals.",
  },
];

export function listCampaigns(): CampaignRecord[] {
  return campaigns;
}

export function getCampaignById(id: string): CampaignRecord | null {
  return campaigns.find((campaign) => campaign.id === id) ?? null;
}

export function createCampaign(input: {
  title: string;
  country: string;
  budget: number;
}): CampaignRecord {
  const record: CampaignRecord = {
    id: `camp-${Date.now().toString(36)}`,
    brand_name: input.title,
    goal: "New campaign launch",
    target_region: input.country,
    target_age_range: "18-34",
    budget: input.budget,
    description: "Campaign brief pending.",
  };
  campaigns = [record, ...campaigns];
  return record;
}
