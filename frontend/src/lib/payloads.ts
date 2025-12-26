import type { CampaignInput, CampaignPayload } from "./api";

type PartialCampaign = Partial<CampaignInput> & {
  title?: string;
  country?: string;
};

export function buildCampaignPayload(campaign: PartialCampaign): CampaignPayload {
  const title = campaign.title ?? campaign.brand_name ?? "Demo Campaign";
  const payload: CampaignPayload = {
    id: campaign.id ?? "camp-demo",
    title,
    brand_name: campaign.brand_name ?? "Demo Brand",
    goal: campaign.goal ?? "Brand awareness and engagement",
    target_region: campaign.target_region ?? campaign.country ?? "Thailand",
    target_age_range: campaign.target_age_range ?? "18-35",
    description:
      campaign.description ??
      `Influencer campaign for ${title} targeting creators in ${
        campaign.country ?? "Asia"
      }`,
    budget: campaign.budget ?? 0,
  };

  if (
    !campaign.brand_name ||
    !campaign.goal ||
    !campaign.target_region ||
    !campaign.target_age_range ||
    !campaign.description
  ) {
    console.warn(
      "Strategy payload filled with demo defaults for missing campaign fields.",
      payload
    );
  }

  return payload;
}
