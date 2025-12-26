import axios from "axios";
import cors from "cors";
import express, { Request, Response } from "express";
import { Pool } from "pg";

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

const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? "http://localhost:8000";
const PORT = Number(process.env.PORT) || 4000;

const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

async function ensureAnalyticsTables(): Promise<void> {
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
}

async function checkDb(): Promise<boolean> {
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

const app = express();

// CORS: allow all for local/dev; tighten for production domains later
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

/**
 * Health endpoint:
 * - Returns 200 only if DB is reachable.
 * - Includes AI service health info (but does not fail overall health if AI is down,
 *   unless you want to enforce that).
 */
app.get("/health", async (_req: Request, res: Response) => {
  const dbOk = await checkDb();

  let aiService: unknown = "unknown";
  let aiOk = false;

  try {
    const response = await axios.get<{ status: string }>(`${AI_SERVICE_URL}/health`, {
      timeout: 1500,
    });
    aiService = response.data;
    aiOk = true;
  } catch (error) {
    aiService = "down";
    aiOk = false;
  }

  // DB is the hard dependency for this API service.
  if (!dbOk) {
    res.status(503).json({
      status: "degraded",
      api: "up",
      db: "down",
      aiService,
      aiOk,
    });
    return;
  }

  res.status(200).json({
    status: "ok",
    api: "up",
    db: "up",
    aiService,
    aiOk,
  });
});

app.post("/recommend", async (req: Request, res: Response) => {
  const { campaign, influencers } = req.body as RecommendationRequest;

  if (!campaign || !Array.isArray(influencers)) {
    res.status(400).json({ error: "Invalid payload: campaign and influencers are required." });
    return;
  }

  try {
    const response = await axios.post<RecommendationResponsePayload>(
      `${AI_SERVICE_URL}/recommend`,
      req.body,
      { timeout: 20_000 }
    );

    const recommendationPayload = response.data;

    // Best-effort analytics write (do not fail main response)
    try {
      const inserts = recommendationPayload.recommendations.map((item, index) =>
        pool.query(
          `INSERT INTO recommendation_logs (campaign_id, influencer_id, score, rank, factors)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            recommendationPayload.campaign_id,
            item.influencer_id,
            item.score,
            index + 1,
            { source: "heuristic_v1" },
          ]
        )
      );
      await Promise.all(inserts);
    } catch (dbError) {
      console.log("Failed to write recommendation analytics:", dbError);
    }

    res.json(response.data);
  } catch (error) {
    console.log("AI service request failed:", error);
    res.status(502).json({ error: "AI service unavailable. Please try again later." });
  }
});

app.post("/rag/influencers", async (req: Request, res: Response) => {
  const { query, top_k } = req.body as { query?: string; top_k?: number };

  if (!query) {
    res.status(400).json({ error: "Invalid payload: query is required." });
    return;
  }

  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/rag/influencers`,
      { query, top_k },
      { timeout: 20_000 }
    );
    res.json(response.data);
  } catch (error) {
    console.log("AI service RAG request failed:", error);
    res.status(502).json({ error: "AI service unavailable. Please try again later." });
  }
});

app.post("/chat", async (req: Request, res: Response) => {
  const { campaign, recommendations, question } = req.body as {
    campaign?: Record<string, unknown>;
    recommendations?: Record<string, unknown>;
    question?: string | null;
  };

  if (!campaign || !recommendations) {
    res.status(400).json({ error: "Invalid payload: campaign and recommendations are required." });
    return;
  }

  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/chat-strategy`,
      { campaign, recommendations, question },
      { timeout: 30_000 }
    );
    res.json(response.data);
  } catch (error) {
    console.log("AI service chat request failed:", error);
    res.status(502).json({ error: "AI service unavailable. Please try again later." });
  }
});

app.post("/events", async (req: Request, res: Response) => {
  const { event_name, user_id, campaign_id, payload } = req.body as EventRequest;

  if (!event_name) {
    res.status(400).json({ error: "Invalid payload: event_name is required." });
    return;
  }

  try {
    await pool.query(
      `INSERT INTO app_events (event_name, user_id, campaign_id, payload)
       VALUES ($1, $2, $3, $4)`,
      [event_name, user_id ?? null, campaign_id ?? null, payload ?? null]
    );
    res.json({ status: "ok" });
  } catch (dbError) {
    console.log("Failed to write app event:", dbError);
    res.status(500).json({ error: "Failed to record event." });
  }
});

app.get("/analytics/summary", async (_req: Request, res: Response) => {
  try {
    const totalEventsResult = await pool.query<{ count: string }>(
      "SELECT COUNT(*) AS count FROM app_events"
    );
    const totalRecommendationsResult = await pool.query<{ count: string }>(
      "SELECT COUNT(*) AS count FROM recommendation_logs"
    );
    const topGoalsResult = await pool.query<{ goal: string; count: string }>(
      `SELECT payload->>'goal' AS goal, COUNT(*) AS count
       FROM app_events
       WHERE event_name = 'run_matching_clicked'
         AND payload ? 'goal'
       GROUP BY payload->>'goal'
       ORDER BY count DESC
       LIMIT 3`
    );

    const responseBody: AnalyticsSummaryResponse = {
      total_events: Number(totalEventsResult.rows[0]?.count ?? 0),
      total_recommendations: Number(totalRecommendationsResult.rows[0]?.count ?? 0),
      top_goals: topGoalsResult.rows.map((row) => ({
        goal: row.goal,
        count: Number(row.count),
      })),
    };

    res.json(responseBody);
  } catch (dbError) {
    console.log("Failed to load analytics summary:", dbError);
    res.status(500).json({ error: "Failed to load analytics summary." });
  }
});

async function start(): Promise<void> {
  // Ensure DB is reachable and tables exist before accepting traffic.
  try {
    await pool.query("SELECT 1");
    console.log("PostgreSQL connected for analytics.");
    await ensureAnalyticsTables();
    console.log("Analytics tables are ready.");
  } catch (error) {
    console.log("PostgreSQL connection failed:", error);
    // Keep process running so orchestrator can retry; health endpoint will report degraded (503).
  }

  app.listen(PORT, () => {
    console.log(`NivoxAI API server listening on port ${PORT}`);
  });
}

start();

// Graceful shutdown (Docker best practice)
async function shutdown(signal: string) {
  console.log(`Received ${signal}. Shutting down...`);
  try {
    await pool.end();
  } catch (e) {
    // ignore
  }
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
