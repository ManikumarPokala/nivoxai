import { randomUUID } from "crypto";
import { Pool } from "pg";

const pool = new Pool({
  host: process.env.PGHOST ?? "localhost",
  port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
  database: process.env.PGDATABASE ?? "nivoxai",
  user: process.env.PGUSER ?? "postgres",
  password: process.env.PGPASSWORD ?? "postgres",
});

const tenantId =
  process.env.DEMO_TENANT_ID ?? "00000000-0000-0000-0000-000000000001";
const userId =
  process.env.DEMO_USER_ID ?? "00000000-0000-0000-0000-000000000002";

const seedCampaigns = [
  {
    id: "camp-demo-001",
    goal: "Launch a summer skincare line",
    region: "Thailand",
  },
  {
    id: "camp-demo-002",
    goal: "Drive Q3 performance leggings sales",
    region: "Singapore",
  },
  {
    id: "camp-demo-003",
    goal: "Expand cold brew subscriptions",
    region: "Indonesia",
  },
];

async function seed() {
  const client = await pool.connect();
  try {
    for (const campaign of seedCampaigns) {
      await client.query(
        `INSERT INTO analytics_events (id, user_id, tenant_id, event_type, campaign_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          randomUUID(),
          userId,
          tenantId,
          "campaign_created",
          campaign.id,
          { goal: campaign.goal, region: campaign.region },
        ]
      );

      await client.query(
        `INSERT INTO analytics_events (id, user_id, tenant_id, event_type, campaign_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          randomUUID(),
          userId,
          tenantId,
          "strategy_generated",
          campaign.id,
          { goal: campaign.goal },
        ]
      );

      await client.query(
        `INSERT INTO campaign_results
          (campaign_id, tenant_id, influencer_id, impressions, clicks, conversions, spend, revenue)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          campaign.id,
          tenantId,
          `inf-${campaign.id}`,
          12000,
          640,
          42,
          3500,
          8400,
        ]
      );
    }

    console.log("Seeded analytics events and campaign results.");
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
