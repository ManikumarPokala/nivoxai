import axios from "axios";
import cors from "cors";
import express, { Request, Response } from "express";
import { Pool } from "pg";

/* ============================================================
   Types
============================================================ */

interface RecommendationRequest {
  campaign: Record<string, unknown>;
  influencers: unknown[];
}

interface RecommendationResponsePayload {
  campaign_id: string;
  recommendations: {
    influencer_id: string;
    score: number;
    reasons: string[];
  }[];
}

interface EventRequest {
  event_name: string;
  user_id?: string;
  campaign_id?: string;
  payload?: unknown;
}

interface AnalyticsSummaryResponse {
  total_events: number;
  total_recommendations: number;
  top_goals: { goal: string; count: number }[];
}

/* ============================================================
   Config
============================================================ */

const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? "http://localhost:8000";
const PORT = Number(process.env.PORT) || 4000;

/* ============================================================
   Database
============================================================ */

const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

const ensureAnalyticsTables = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_events (
      id BIGSERIAL PRIMARY KEY,
      event_name TEXT NOT NULL,
      user_id TEXT NULL,
      campaign_id TEXT NULL,
      payload JSONB NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS recommendation_logs (
      id BIGSERIAL PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      influencer_id TEXT NOT NULL,
      score DOUBLE PRECISION NOT NULL,
      rank INT NOT NULL,
      factors JSONB NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS campaign_results (
      id BIGSERIAL PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      influencer_id TEXT NOT NULL,
      impressions INT NOT NULL,
      clicks INT NOT NULL,
      conversions INT NOT NULL,
      spend NUMERIC(12, 2) NOT NULL,
      revenue NUMERIC(12, 2) NOT NULL,
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
};

pool
  .connect()
  .then(async (client) => {
    console.log("PostgreSQL connected for analytics.");
    client.release();
    await ensureAnalyticsTables();
    console.log("Analytics tables are ready.");
  })
  .catch((error) => {
    console.error("PostgreSQL connection failed:", error);
  });

/* ============================================================
   App Init
============================================================ */

const app = express();
app.use(cors());
app.use(express.json());

/* ============================================================
   Health Check (Enterprise-grade)
============================================================ */

app.get("/health", async (_req: Request, res: Response) => {
  let dbOk = true;
  let aiOk = true;
  let aiService: unknown = null;

  try {
    await pool.query("SELECT 1");
  } catch {
    dbOk = false;
  }

  try {
    const aiRes = await axios.get(`${AI_SERVICE_URL}/health`);
    aiService = aiRes.data;
  } catch {
    aiOk = false;
  }

  res.json({
    status: "ok",
    api: "up",
    db: dbOk ? "up" : "down",
    aiService,
    aiOk,
  });
});

/* ============================================================
   Recommendation Pipeline
============================================================ */

app.post("/recommend", async (req: Request, res: Response) => {
  const { campaign, influencers } = req.body as RecommendationRequest;

  if (!campaign || !Array.isArray(influencers)) {
    res.status(400).json({
      error: "Invalid payload: campaign and influencers are required.",
    });
    return;
  }

  try {
    const response = await axios.post<RecommendationResponsePayload>(
      `${AI_SERVICE_URL}/recommend`,
      req.body
    );

    const payload = response.data;

    // Async analytics logging (non-blocking for UX)
    payload.recommendations.forEach((item, index) => {
      pool
        .query(
          `INSERT INTO recommendation_logs
           (campaign_id, influencer_id, score, rank, factors)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            payload.campaign_id,
            item.influencer_id,
            item.score,
            index + 1,
            { source: "heuristic_v1" },
          ]
        )
        .catch((e) =>
          console.warn("Recommendation analytics insert failed:", e)
        );
    });

    res.json(payload);
  } catch (error) {
    console.error("AI service request failed:", error);
    res.status(502).json({
      error: "AI service unavailable. Please try again later.",
    });
  }
});

/* ============================================================
   RAG Proxy
============================================================ */

app.post("/rag/influencers", async (req: Request, res: Response) => {
  const { query, top_k } = req.body as { query?: string; top_k?: number };

  if (!query) {
    res.status(400).json({ error: "query is required" });
    return;
  }

  try {
    const response = await axios.post(`${AI_SERVICE_URL}/rag/influencers`, {
      query,
      top_k,
    });
    res.json(response.data);
  } catch (error) {
    console.error("RAG request failed:", error);
    res.status(502).json({ error: "AI service unavailable" });
  }
});

/* ============================================================
   Agentic Strategy Proxy
============================================================ */

app.post("/chat", async (req: Request, res: Response) => {
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/chat-strategy`,
      req.body
    );
    res.json(response.data);
  } catch (error) {
    console.error("Chat strategy failed:", error);
    res.status(502).json({ error: "AI service unavailable" });
  }
});

/* ============================================================
   Event Tracking
============================================================ */

app.post("/events", async (req: Request, res: Response) => {
  const { event_name, user_id, campaign_id, payload } =
    req.body as EventRequest;

  if (!event_name) {
    res.status(400).json({ error: "event_name is required" });
    return;
  }

  try {
    await pool.query(
      `INSERT INTO app_events (event_name, user_id, campaign_id, payload)
       VALUES ($1, $2, $3, $4)`,
      [event_name, user_id ?? null, campaign_id ?? null, payload ?? null]
    );
    res.json({ status: "ok" });
  } catch (error) {
    console.error("Event insert failed:", error);
    res.status(500).json({ error: "Failed to record event" });
  }
});

/* ============================================================
   Analytics — Summary
============================================================ */

app.get("/analytics/summary", async (_req: Request, res: Response) => {
  try {
    const [{ rows: events }, { rows: recs }, { rows: goals }] =
      await Promise.all([
        pool.query<{ count: string }>(
          "SELECT COUNT(*) AS count FROM app_events"
        ),
        pool.query<{ count: string }>(
          "SELECT COUNT(*) AS count FROM recommendation_logs"
        ),
        pool.query<{ goal: string; count: string }>(`
          SELECT payload->>'goal' AS goal, COUNT(*) AS count
          FROM app_events
          WHERE event_name = 'run_matching_clicked'
            AND payload ? 'goal'
          GROUP BY payload->>'goal'
          ORDER BY count DESC
          LIMIT 3
        `),
      ]);

    res.json({
      total_events: Number(events[0]?.count ?? 0),
      total_recommendations: Number(recs[0]?.count ?? 0),
      top_goals: goals.map((g) => ({
        goal: g.goal,
        count: Number(g.count),
      })),
    } satisfies AnalyticsSummaryResponse);
  } catch (error) {
    console.error("Analytics summary failed:", error);
    res.status(500).json({ error: "Failed to load analytics summary" });
  }
});

/* ============================================================
   Analytics — Campaign Level (KEY FOR JD)
============================================================ */

app.get(
  "/analytics/campaign/:campaignId",
  async (req: Request, res: Response) => {
    const { campaignId } = req.params;

    try {
      const recs = await pool.query<{ count: string }>(
        `SELECT COUNT(*) AS count
         FROM recommendation_logs
         WHERE campaign_id = $1`,
        [campaignId]
      );

      const events = await pool.query<{ count: string }>(
        `SELECT COUNT(*) AS count
         FROM app_events
         WHERE campaign_id = $1`,
        [campaignId]
      );

      const perf = await pool.query<{
        impressions: string;
        clicks: string;
        spend: string;
        revenue: string;
      }>(
        `
        SELECT
          COALESCE(SUM(impressions),0)::text AS impressions,
          COALESCE(SUM(clicks),0)::text AS clicks,
          COALESCE(SUM(spend),0)::text AS spend,
          COALESCE(SUM(revenue),0)::text AS revenue
        FROM campaign_results
        WHERE campaign_id = $1
        `,
        [campaignId]
      );

      const impressions = Number(perf.rows[0]?.impressions ?? 0);
      const clicks = Number(perf.rows[0]?.clicks ?? 0);
      const spend = Number(perf.rows[0]?.spend ?? 0);
      const revenue = Number(perf.rows[0]?.revenue ?? 0);

      res.json({
        campaign_id: campaignId,
        total_events: Number(events.rows[0]?.count ?? 0),
        total_recommendations: Number(recs.rows[0]?.count ?? 0),
        impressions,
        clicks,
        ctr: impressions > 0 ? +(clicks / impressions * 100).toFixed(2) : 0,
        spend,
        revenue,
        roi: spend > 0 ? +(((revenue - spend) / spend) * 100).toFixed(2) : 0,
      });
    } catch (error) {
      console.error("Campaign analytics failed:", error);
      res.status(500).json({ error: "Failed to load campaign analytics" });
    }
  }
);

/* ============================================================
   Server Start
============================================================ */

app.listen(PORT, () => {
  console.log(`NivoxAI API server listening on port ${PORT}`);
});
