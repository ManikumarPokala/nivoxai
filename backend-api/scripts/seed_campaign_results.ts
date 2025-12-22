import { Pool } from "pg";

type CampaignSeed = {
  campaign_id: string;
  influencer_ids: string[];
};

const campaigns: CampaignSeed[] = [
  {
    campaign_id: "camp-001",
    influencer_ids: ["inf-101", "inf-102", "inf-103", "inf-104", "inf-105"],
  },
  {
    campaign_id: "camp-002",
    influencer_ids: ["inf-106", "inf-107", "inf-108", "inf-109", "inf-110"],
  },
  {
    campaign_id: "camp-003",
    influencer_ids: ["inf-201", "inf-202", "inf-203", "inf-204", "inf-205"],
  },
];

const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

const randomInRange = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const randomFloat = (min: number, max: number) =>
  Math.random() * (max - min) + min;

const seedCampaignResults = async () => {
  let inserted = 0;

  for (const campaign of campaigns) {
    for (const influencer_id of campaign.influencer_ids) {
      const impressions = randomInRange(5000, 50000);
      const ctr = randomFloat(0.01, 0.08);
      const clicks = Math.max(1, Math.floor(impressions * ctr));
      const conversionRate = randomFloat(0.01, 0.05);
      const conversions = Math.max(1, Math.floor(clicks * conversionRate));

      const roas = randomFloat(1, 4);
      const spend = randomFloat(500, 6000);
      const revenue = spend * roas;

      await pool.query(
        `INSERT INTO campaign_results (
          campaign_id,
          influencer_id,
          impressions,
          clicks,
          conversions,
          spend,
          revenue
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          campaign.campaign_id,
          influencer_id,
          impressions,
          clicks,
          conversions,
          Number(spend.toFixed(2)),
          Number(revenue.toFixed(2)),
        ]
      );
      inserted += 1;
    }
  }

  console.log(`Inserted ${inserted} campaign_results rows.`);
};

seedCampaignResults()
  .catch((error) => {
    console.log("Failed to seed campaign_results:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
