import axios from "axios";
import cors from "cors";
import crypto, { randomUUID } from "crypto";
import express, { Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
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
  lastUpdatedAt: string;
}

interface AnalyticsEventRequest {
  user_id?: string;
  tenant_id?: string;
  event_type: string;
  campaign_id?: string;
  influencer_id?: string;
  metadata?: Record<string, unknown>;
}

type AuthContext = {
  user_id: string;
  tenant_id: string;
  role: "admin" | "brand_user" | "viewer";
};

type ErrorSchema = {
  error: {
    code: string;
    message: string;
    details?: unknown;
    request_id: string;
  };
};

type RequestContext = Request & {
  auth?: AuthContext;
  request_id?: string;
};

const AI_SERVICE_URL =
  process.env.AI_SERVICE_BASE_URL ??
  process.env.AI_SERVICE_URL ??
  "http://localhost:8000";
const corsOriginsEnv = process.env.CORS_ORIGINS ?? "http://localhost:3000";
const corsOrigins = corsOriginsEnv
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const corsOptions = {
  origin: corsOrigins,
  credentials: true,
};
const PORT = Number(process.env.PORT) || 4000;
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-jwt-secret";
const DEFAULT_TENANT_ID =
  process.env.DEMO_TENANT_ID ?? "00000000-0000-0000-0000-000000000001";
const DEFAULT_TENANT_B_ID =
  process.env.DEMO_TENANT_B_ID ?? "00000000-0000-0000-0000-000000000003";
const DEFAULT_USER_ID =
  process.env.DEMO_USER_ID ?? "00000000-0000-0000-0000-000000000002";
const DEFAULT_USER_B_ID =
  process.env.DEMO_USER_B_ID ?? "00000000-0000-0000-0000-000000000004";
const DEFAULT_USER_EMAIL = process.env.DEMO_USER_EMAIL ?? "admin@nivoxai.local";
const DEFAULT_USER_NAME = process.env.DEMO_USER_NAME ?? "Demo Admin";
const DEFAULT_USER_ROLE = process.env.DEMO_USER_ROLE ?? "admin";
const DEFAULT_USER_PASSWORD = process.env.DEMO_USER_PASSWORD ?? "demo";
const DEFAULT_USER_B_EMAIL = process.env.DEMO_USER_B_EMAIL ?? "user@tenantb.local";
const DEFAULT_USER_B_NAME = process.env.DEMO_USER_B_NAME ?? "Tenant B User";
const DEFAULT_USER_B_ROLE = process.env.DEMO_USER_B_ROLE ?? "brand_user";
const DEMO_MODE = process.env.DEMO_MODE === "true";
const DEMO_ADMIN_KEY = process.env.DEMO_ADMIN_KEY ?? "";
const DEMO_RATE_LIMIT_MAX = Number(process.env.DEMO_RATE_LIMIT_MAX ?? "30");
const DEMO_RATE_LIMIT_WINDOW_MS = Number(
  process.env.DEMO_RATE_LIMIT_WINDOW_MS ?? "60000"
);
const DEMO_PAYLOAD_MAX_BYTES = Number(process.env.DEMO_PAYLOAD_MAX_BYTES ?? "20000");

const ERROR_CODE_BY_STATUS: Record<number, string> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  413: "PAYLOAD_TOO_LARGE",
  422: "VALIDATION_ERROR",
  429: "RATE_LIMITED",
  502: "UPSTREAM_ERROR",
  503: "UPSTREAM_UNAVAILABLE",
  504: "UPSTREAM_TIMEOUT",
};

export const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

const hashPassword = (password: string): string => {
  return crypto
    .createHash("sha256")
    .update(`${password}:${JWT_SECRET}`)
    .digest("hex");
};

const getRequestId = (req: RequestContext): string => {
  if (req.request_id) {
    return req.request_id;
  }
  const headerId = req.header("x-request-id");
  const requestId = headerId?.trim();
  if (requestId) {
    return requestId;
  }
  return randomUUID();
};

const isErrorSchema = (payload: unknown): payload is ErrorSchema => {
  if (!payload || typeof payload !== "object") {
    return false;
  }
  const error = (payload as ErrorSchema).error;
  return Boolean(
    error &&
      typeof error === "object" &&
      typeof error.code === "string" &&
      typeof error.message === "string" &&
      typeof error.request_id === "string"
  );
};

const normalizeErrorPayload = (
  status: number,
  payload: unknown,
  requestId: string
): ErrorSchema => {
  if (isErrorSchema(payload)) {
    return payload;
  }
  const code = ERROR_CODE_BY_STATUS[status] ?? "INTERNAL_ERROR";
  const message =
    (typeof payload === "object" &&
      payload !== null &&
      "message" in payload &&
      typeof (payload as { message?: unknown }).message === "string" &&
      (payload as { message?: string }).message) ||
    (typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof (payload as { error?: unknown }).error === "string" &&
      (payload as { error?: string }).error) ||
    (typeof payload === "string" ? payload : "Request failed.");
  const details =
    typeof payload === "object" && payload !== null
      ? payload
      : payload
        ? { error: payload }
        : undefined;
  return {
    error: {
      code,
      message,
      details,
      request_id: requestId,
    },
  };
};

const buildAiHeaders = (req: RequestContext): Record<string, string> => {
  const headers: Record<string, string> = {
    "x-request-id": getRequestId(req),
  };
  if (req.headers.authorization) {
    headers.Authorization = req.headers.authorization;
  }
  if (req.headers["x-tenant-id"]) {
    headers["X-Tenant-Id"] = String(req.headers["x-tenant-id"]);
  }
  return headers;
};

const demoLimiter = new Map<string, { count: number; resetAt: number }>();

const enforceDemoRateLimit = (req: Request, res: Response, next: () => void) => {
  if (!DEMO_MODE) {
    next();
    return;
  }
  const key = `${req.ip}:${req.path}`;
  const now = Date.now();
  const entry = demoLimiter.get(key);
  if (!entry || entry.resetAt <= now) {
    demoLimiter.set(key, { count: 1, resetAt: now + DEMO_RATE_LIMIT_WINDOW_MS });
    next();
    return;
  }
  if (entry.count >= DEMO_RATE_LIMIT_MAX) {
    res.status(429).json({ error: "Rate limit exceeded in demo mode." });
    return;
  }
  entry.count += 1;
  next();
};

const enforceDemoPayloadCap = (req: Request, res: Response, next: () => void) => {
  if (!DEMO_MODE) {
    next();
    return;
  }
  const lengthHeader = req.header("content-length");
  if (lengthHeader) {
    const length = Number(lengthHeader);
    if (!Number.isNaN(length) && length > DEMO_PAYLOAD_MAX_BYTES) {
      res.status(413).json({ error: "Payload too large for demo mode." });
      return;
    }
  }
  next();
};

const enforceDemoAdminKey = (req: Request, res: Response, next: () => void) => {
  if (!DEMO_MODE) {
    next();
    return;
  }
  const key = req.header("x-demo-admin-key");
  if (!DEMO_ADMIN_KEY || key !== DEMO_ADMIN_KEY) {
    res.status(403).json({ error: "Demo admin key required." });
    return;
  }
  next();
};

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
  await pool.query(`ALTER TABLE app_events ADD COLUMN IF NOT EXISTS tenant_id TEXT NULL;`);

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
  await pool.query(
    `ALTER TABLE recommendation_logs ADD COLUMN IF NOT EXISTS tenant_id TEXT NULL;`
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id UUID PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      user_id TEXT NULL,
      tenant_id TEXT NULL,
      event_type TEXT NOT NULL,
      campaign_id TEXT NULL,
      influencer_id TEXT NULL,
      metadata JSONB NULL
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
  await pool.query(
    `ALTER TABLE campaign_results ADD COLUMN IF NOT EXISTS tenant_id TEXT NULL;`
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tenants (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NULL,
      tenant_id UUID NULL REFERENCES tenants(id),
      role TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT NULL;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id UUID NULL;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NULL;`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS influencers (
      id TEXT PRIMARY KEY,
      tenant_id UUID NOT NULL REFERENCES tenants(id),
      name TEXT NOT NULL,
      platform TEXT NOT NULL,
      category TEXT NOT NULL,
      followers INT NOT NULL,
      engagement_rate DOUBLE PRECISION NOT NULL,
      region TEXT NOT NULL,
      languages TEXT[] NOT NULL,
      audience_age_range TEXT NOT NULL,
      bio TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS influencer_documents (
      id TEXT PRIMARY KEY,
      tenant_id UUID NOT NULL REFERENCES tenants(id),
      influencer_id TEXT NOT NULL REFERENCES influencers(id),
      content TEXT NOT NULL,
      platform TEXT NOT NULL,
      last_active_at TIMESTAMPTZ NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_tenants (
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, tenant_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      tenant_id UUID NOT NULL REFERENCES tenants(id),
      brand_name TEXT NOT NULL,
      goal TEXT NOT NULL,
      target_region TEXT NOT NULL,
      target_age_range TEXT NOT NULL,
      budget NUMERIC(12, 2) NOT NULL,
      description TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(
    `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();`
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id UUID PRIMARY KEY,
      tenant_id UUID NOT NULL REFERENCES tenants(id),
      user_id UUID NOT NULL REFERENCES users(id),
      action TEXT NOT NULL,
      metadata JSONB NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(
    `INSERT INTO tenants (id, name)
     VALUES ($1, $2)
     ON CONFLICT (id) DO NOTHING`,
    [DEFAULT_TENANT_ID, "NivoxAI Demo"]
  );
  await pool.query(
    `INSERT INTO tenants (id, name)
     VALUES ($1, $2)
     ON CONFLICT (id) DO NOTHING`,
    [DEFAULT_TENANT_B_ID, "Tenant B"]
  );
  await pool.query(
    `INSERT INTO users (id, email, name)
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO NOTHING`,
    [DEFAULT_USER_ID, DEFAULT_USER_EMAIL, DEFAULT_USER_NAME]
  );
  await pool.query(
    `INSERT INTO users (id, email, name)
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO NOTHING`,
    [DEFAULT_USER_B_ID, DEFAULT_USER_B_EMAIL, DEFAULT_USER_B_NAME]
  );
  await pool.query(
    `INSERT INTO user_tenants (user_id, tenant_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, tenant_id) DO NOTHING`,
    [DEFAULT_USER_ID, DEFAULT_TENANT_ID, DEFAULT_USER_ROLE]
  );
  await pool.query(
    `INSERT INTO user_tenants (user_id, tenant_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, tenant_id) DO NOTHING`,
    [DEFAULT_USER_B_ID, DEFAULT_TENANT_B_ID, DEFAULT_USER_B_ROLE]
  );
  await pool.query(
    `UPDATE users
     SET password_hash = $1, tenant_id = $2, role = $3
     WHERE id = $4`,
    [hashPassword(DEFAULT_USER_PASSWORD), DEFAULT_TENANT_ID, DEFAULT_USER_ROLE, DEFAULT_USER_ID]
  );
  await pool.query(
    `UPDATE users
     SET password_hash = $1, tenant_id = $2, role = $3
     WHERE id = $4`,
    [hashPassword(DEFAULT_USER_PASSWORD), DEFAULT_TENANT_B_ID, DEFAULT_USER_B_ROLE, DEFAULT_USER_B_ID]
  );
};

if (process.env.SKIP_DB_INIT !== "1") {
  pool
    .connect()
    .then(async (client) => {
      console.log("PostgreSQL connected for analytics.");
      client.release();
      await ensureAnalyticsTables();
      console.log("Analytics tables are ready.");
    })
    .catch((error) => {
      console.log("PostgreSQL connection failed:", error);
    });
}

const authenticate = async (req: Request, res: Response, next: () => void) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.replace("Bearer ", "");
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    const userId = payload.sub;
    const tenantId = payload.tenant_id as string | undefined;
    const role = (payload.role as AuthContext["role"]) ?? "viewer";
    if (!userId || !tenantId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const membership = await pool.query(
      `SELECT role FROM user_tenants WHERE user_id = $1 AND tenant_id = $2 LIMIT 1`,
      [userId, tenantId]
    );
    if (!membership.rows[0]) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    (req as Request & { auth?: AuthContext }).auth = {
      user_id: userId,
      tenant_id: tenantId,
      role: membership.rows[0]?.role ?? role,
    };
    next();
  } catch (error) {
    res.status(401).json({ error: "Unauthorized" });
  }
};

const requireRole =
  (roles: AuthContext["role"][]) =>
  (req: Request, res: Response, next: () => void) => {
    const auth = (req as Request & { auth?: AuthContext }).auth;
    if (!auth || !roles.includes(auth.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };

const getAuth = (req: Request): AuthContext => {
  const auth = (req as Request & { auth?: AuthContext }).auth;
  if (!auth) {
    throw new Error("Missing auth context");
  }
  return auth;
};

// Tenant is resolved from JWT claims (tenant_id); query override allowed for admin only.
const getTenantScope = (req: Request): string => {
  const auth = getAuth(req);
  const override = typeof req.query.tenant_id === "string" ? req.query.tenant_id : null;
  if (auth.role === "admin" && override) {
    return override;
  }
  return auth.tenant_id;
};

export const app = express();
app.use(cors(corsOptions));
app.use((req: RequestContext, res: Response, next) => {
  const requestId = getRequestId(req);
  req.request_id = requestId;
  res.setHeader("x-request-id", requestId);

  const start = Date.now();
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 400) {
      return originalJson(normalizeErrorPayload(res.statusCode, body, requestId));
    }
    return originalJson(body);
  };

  res.on("finish", () => {
    const latencyMs = Math.max(1, Date.now() - start);
    const auth = (req as RequestContext).auth;
    console.log(
      JSON.stringify({
        request_id: requestId,
        tenant_id: auth?.tenant_id ?? null,
        role: auth?.role ?? null,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        latency_ms: latencyMs,
      })
    );
  });

  next();
});
app.options(/.*/, cors(corsOptions));
app.use(express.json());
app.use(/^\/admin/, enforceDemoAdminKey);
app.use("/admin", authenticate);

app.post("/auth/login", enforceDemoRateLimit, enforceDemoPayloadCap, async (req: Request, res: Response) => {
  const { email, password, tenant_id } = req.body as {
    email?: string;
    password?: string;
    tenant_id?: string;
  };

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required." });
    return;
  }

  try {
    const userResult = await pool.query(
      `SELECT id, password_hash FROM users WHERE email = $1 LIMIT 1`,
      [email]
    );
    const user = userResult.rows[0];
    if (!user || user.password_hash !== hashPassword(password)) {
      res.status(401).json({ error: "Invalid credentials." });
      return;
    }

    const membership = await pool.query(
      `SELECT tenant_id, role FROM user_tenants WHERE user_id = $1 LIMIT 1`,
      [user.id]
    );
    const tenantRow = membership.rows[0];
    if (!tenantRow) {
      res.status(403).json({ error: "No tenant access." });
      return;
    }
    if (tenant_id && tenant_id !== tenantRow.tenant_id) {
      res.status(403).json({ error: "Tenant access denied." });
      return;
    }

    const token = jwt.sign(
      { tenant_id: tenantRow.tenant_id, role: tenantRow.role },
      JWT_SECRET,
      { subject: user.id, expiresIn: "8h" }
    );
    res.json({ token, tenant_id: tenantRow.tenant_id, role: tenantRow.role });
  } catch (error) {
    console.error("Login failed:", error);
    res.status(500).json({ error: "Login failed." });
  }
});

app.use(["/v1/analytics", "/analytics"], authenticate);
app.use(["/v1/campaigns", "/campaigns"], authenticate);
app.use(["/recommend", "/chat", "/events"], authenticate);
app.use(["/rag"], authenticate);

app.get("/health", async (req: Request, res: Response) => {
  try {
    const response = await axios.get<{ status: string }>(`${AI_SERVICE_URL}/health`, {
      headers: buildAiHeaders(req as RequestContext),
    });
    res.json({
      status: "ok",
      api: "up",
      aiService: response.data,
    });
  } catch (error) {
    console.log("AI service health check failed:", error);
    res.json({
      status: "ok",
      api: "up",
      aiService: "down",
    });
  }
});

app.get("/api/healthz", async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${AI_SERVICE_URL}/healthz`, {
      headers: buildAiHeaders(req as RequestContext),
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    console.log("AI service /healthz failed:", error);
    res.status(502).json({ error: "AI service unavailable." });
  }
});

app.get("/api/model/status", async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${AI_SERVICE_URL}/v1/model/status`, {
      headers: buildAiHeaders(req as RequestContext),
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    console.log("AI service model status failed:", error);
    res.status(502).json({ error: "AI model status unavailable." });
  }
});

app.post("/recommend", enforceDemoRateLimit, enforceDemoPayloadCap, async (req: Request, res: Response) => {
  console.log("Incoming /recommend request");
  const auth = getAuth(req);
  const { campaign, influencers } = req.body as RecommendationRequest;

  if (!campaign || !Array.isArray(influencers)) {
    res.status(400).json({ error: "Invalid payload: campaign and influencers are required." });
    return;
  }

  try {
    const campaignId = (campaign as { id?: string }).id;
    if (campaignId) {
      const campaignCheck = await pool.query(
        `SELECT id FROM campaigns WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
        [campaignId, auth.tenant_id]
      );
      if (!campaignCheck.rows[0]) {
        res.status(403).json({ error: "Campaign access denied." });
        return;
      }
    }
    const headers = buildAiHeaders(req as RequestContext);
    const response = await axios.post<RecommendationResponsePayload>(
      `${AI_SERVICE_URL}/recommend`,
      req.body,
      { headers }
    );
    const recommendationPayload = response.data;

    try {
      const inserts = recommendationPayload.recommendations.map((item, index) =>
        pool.query(
          `INSERT INTO recommendation_logs (campaign_id, tenant_id, influencer_id, score, rank, factors)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            recommendationPayload.campaign_id,
            auth.tenant_id,
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

    try {
      await pool.query(
        `INSERT INTO analytics_events (id, user_id, tenant_id, event_type, campaign_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          randomUUID(),
          auth.user_id,
          auth.tenant_id,
          "influencer_recommended",
          recommendationPayload.campaign_id,
          {
            recommendation_count: recommendationPayload.recommendations.length,
            top_influencers: recommendationPayload.recommendations
              .slice(0, 5)
              .map((item) => item.influencer_id),
          },
        ]
      );
    } catch (dbError) {
      console.log("Failed to log analytics event:", dbError);
    }

    res.json(response.data);
  } catch (error) {
    console.log("AI service request failed:", error);
    res.status(502).json({ error: "AI service unavailable. Please try again later." });
  }
});

app.post(
  "/rag/influencers",
  enforceDemoRateLimit,
  enforceDemoPayloadCap,
  async (req: Request, res: Response) => {
  const auth = getAuth(req);
  const { query, top_k } = req.body as { query?: string; top_k?: number };
  if (!query) {
    res.status(400).json({ error: "Invalid payload: query is required." });
    return;
  }

  try {
    const headers = buildAiHeaders(req as RequestContext);
    const response = await axios.post(
      `${AI_SERVICE_URL}/rag/influencers`,
      { query, top_k },
      { headers }
    );
    res.json(response.data);
  } catch (error) {
    console.log("AI service RAG request failed:", error);
    res.status(502).json({ error: "AI service unavailable. Please try again later." });
  }
});

app.post("/chat", enforceDemoRateLimit, enforceDemoPayloadCap, async (req: Request, res: Response) => {
  const auth = getAuth(req);
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
    const headers = buildAiHeaders(req as RequestContext);
    const response = await axios.post(
      `${AI_SERVICE_URL}/chat-strategy`,
      {
        campaign,
        recommendations,
        question,
      },
      { headers }
    );

    try {
      await pool.query(
        `INSERT INTO analytics_events (id, user_id, tenant_id, event_type, campaign_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          randomUUID(),
          auth.user_id,
          auth.tenant_id,
          "strategy_generated",
          (campaign as { id?: string }).id ?? null,
          { question: question ?? null },
        ]
      );
    } catch (dbError) {
      console.log("Failed to log strategy event:", dbError);
    }

    await writeAuditLog(auth, "strategy_generated", {
      campaign_id: (campaign as { id?: string }).id ?? null,
    });

    res.json(response.data);
  } catch (error) {
    console.log("AI service chat request failed:", error);
    res.status(502).json({ error: "AI service unavailable. Please try again later." });
  }
});

app.post("/events", async (req: Request, res: Response) => {
  const auth = getAuth(req);
  const { event_name, user_id, campaign_id, payload } = req.body as EventRequest;

  if (!event_name) {
    res.status(400).json({ error: "Invalid payload: event_name is required." });
    return;
  }

  try {
    await pool.query(
      `INSERT INTO app_events (event_name, user_id, campaign_id, tenant_id, payload)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        event_name,
        user_id ?? auth.user_id,
        campaign_id ?? null,
        auth.tenant_id,
        payload ?? null,
      ]
    );
    res.json({ status: "ok" });
  } catch (dbError) {
    console.log("Failed to write app event:", dbError);
    res.status(500).json({ error: "Failed to record event." });
  }
});

app.post(
  "/v1/analytics/event",
  requireRole(["admin", "brand_user"]),
  async (req: Request, res: Response) => {
    const auth = getAuth(req);
    const { event_type, campaign_id, influencer_id, metadata } =
      req.body as AnalyticsEventRequest;

    if (!event_type) {
      res.status(400).json({ error: "Invalid payload: event_type is required." });
      return;
    }

    try {
      await pool.query(
        `INSERT INTO analytics_events (
         id, user_id, tenant_id, event_type, campaign_id, influencer_id, metadata
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          randomUUID(),
          auth.user_id,
          auth.tenant_id,
          event_type,
          campaign_id ?? null,
          influencer_id ?? null,
          metadata ?? null,
        ]
      );

      if (["campaign_created", "strategy_generated", "campaign_exported"].includes(event_type)) {
        await writeAuditLog(auth, event_type, {
          campaign_id: campaign_id ?? null,
          influencer_id: influencer_id ?? null,
        });
      }

      res.json({ status: "ok" });
    } catch (error) {
      console.log("Failed to write analytics event:", error);
      res.status(500).json({ error: "Failed to record analytics event." });
    }
  }
);

app.get("/campaigns", async (req: Request, res: Response) => {
  return handleCampaignList(req, res);
});

app.get("/v1/campaigns", async (req: Request, res: Response) => {
  return handleCampaignList(req, res);
});

app.get("/campaigns/:id", async (req: Request, res: Response) => {
  return handleCampaignDetail(req, res);
});

app.get("/v1/campaigns/:id", async (req: Request, res: Response) => {
  return handleCampaignDetail(req, res);
});

app.post(
  "/campaigns",
  requireRole(["admin", "brand_user"]),
  async (req: Request, res: Response) => {
  return handleCampaignCreate(req, res);
});

app.post(
  "/v1/campaigns",
  requireRole(["admin", "brand_user"]),
  async (req: Request, res: Response) => {
    return handleCampaignCreate(req, res);
  }
);

app.patch(
  "/campaigns/:id",
  requireRole(["admin", "brand_user"]),
  async (req: Request, res: Response) => {
    return handleCampaignUpdate(req, res);
  }
);

app.patch(
  "/v1/campaigns/:id",
  requireRole(["admin", "brand_user"]),
  async (req: Request, res: Response) => {
    return handleCampaignUpdate(req, res);
  }
);

app.get("/analytics/summary", async (req: Request, res: Response) => {
  return handleAnalyticsSummary(req, res);
});

app.get("/v1/analytics/summary", async (req: Request, res: Response) => {
  return handleAnalyticsSummary(req, res);
});

app.get("/analytics/events", async (req: Request, res: Response) => {
  return handleAnalyticsEvents(req, res);
});

app.get("/v1/analytics/events", async (req: Request, res: Response) => {
  return handleAnalyticsEvents(req, res);
});

/* ============================================================
   Analytics — Campaign Level (JD Critical)
============================================================ */

app.get("/analytics/campaign/:campaignId", async (req: Request, res: Response) => {
  return handleCampaignAnalytics(req, res);
});

app.get("/v1/analytics/campaign/:campaignId", async (req: Request, res: Response) => {
  return handleCampaignAnalytics(req, res);
});

app.get("/admin/ping", requireRole(["admin"]), async (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

async function handleAnalyticsSummary(req: Request, res: Response) {
  const tenantScope = getTenantScope(req);
  const windowParam = typeof req.query.window === "string" ? req.query.window : "24h";
  const windowInterval = normalizeWindow(windowParam);

  try {
    const totalEventsResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM analytics_events
       WHERE tenant_id = $1
         AND created_at >= NOW() - $2::interval`,
      [tenantScope, windowInterval]
    );
    const totalRecommendationsResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM recommendation_logs
       WHERE tenant_id = $1
         AND created_at >= NOW() - $2::interval`,
      [tenantScope, windowInterval]
    );
    const topGoalsResult = await pool.query<{ goal: string; count: string }>(
      `SELECT metadata->>'goal' AS goal, COUNT(*) AS count
       FROM analytics_events
       WHERE tenant_id = $1
         AND created_at >= NOW() - $2::interval
         AND metadata ? 'goal'
       GROUP BY metadata->>'goal'
       ORDER BY count DESC
       LIMIT 3`,
      [tenantScope, windowInterval]
    );

    const responseBody: AnalyticsSummaryResponse = {
      total_events: Number(totalEventsResult.rows[0]?.count ?? 0),
      total_recommendations: Number(totalRecommendationsResult.rows[0]?.count ?? 0),
      top_goals: topGoalsResult.rows.map((row) => ({
        goal: row.goal,
        count: Number(row.count),
      })),
      lastUpdatedAt: new Date().toISOString(),
    };

    res.json(responseBody);
  } catch (dbError) {
    console.log("Failed to load analytics summary:", dbError);
    res.status(500).json({ error: "Failed to load analytics summary." });
  }
}

async function handleAnalyticsEvents(req: Request, res: Response) {
  const tenantScope = getTenantScope(req);
  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  const eventType = typeof req.query.event_type === "string" ? req.query.event_type : null;
  const campaignId =
    typeof req.query.campaign_id === "string" ? req.query.campaign_id : null;

  try {
    const result = await pool.query(
      `SELECT id, created_at, user_id, tenant_id, event_type, campaign_id, influencer_id, metadata
       FROM analytics_events
       WHERE tenant_id = $1
         AND ($2::text IS NULL OR event_type = $2)
         AND ($3::text IS NULL OR campaign_id = $3)
       ORDER BY created_at DESC
       LIMIT $4`,
      [tenantScope, eventType, campaignId, limit]
    );

    res.json({
      events: result.rows,
      lastUpdatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to load analytics events:", error);
    res.status(500).json({ error: "Failed to load analytics events." });
  }
}

async function handleCampaignAnalytics(req: Request, res: Response) {
  const { campaignId } = req.params;
  const tenantScope = getTenantScope(req);

  try {
    const campaignCheck = await pool.query(
      `SELECT id FROM campaigns WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
      [campaignId, tenantScope]
    );
    if (!campaignCheck.rows[0]) {
      res.status(404).json({ error: "Campaign not found." });
      return;
    }

    const recs = await pool.query<{ count: string }>(
      `
        SELECT COUNT(*) AS count
        FROM recommendation_logs
        WHERE campaign_id = $1
          AND tenant_id = $2
      `,
      [campaignId, tenantScope]
    );

    const events = await pool.query<{ count: string }>(
      `
        SELECT COUNT(*) AS count
        FROM analytics_events
        WHERE campaign_id = $1
          AND tenant_id = $2
      `,
      [campaignId, tenantScope]
    );

    const kols = await pool.query<{ count: string }>(
      `
        SELECT COUNT(DISTINCT influencer_id) AS count
        FROM recommendation_logs
        WHERE campaign_id = $1
          AND tenant_id = $2
      `,
      [campaignId, tenantScope]
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
          AND tenant_id = $2
      `,
      [campaignId, tenantScope]
    );

    const impressions = Number(perf.rows[0]?.impressions ?? 0);
    const clicks = Number(perf.rows[0]?.clicks ?? 0);
    const spend = Number(perf.rows[0]?.spend ?? 0);
    const revenue = Number(perf.rows[0]?.revenue ?? 0);
    const avgRoi = spend > 0 ? +(((revenue - spend) / spend) * 100).toFixed(2) : 0;

    res.json({
      campaign_id: campaignId,
      total_events: Number(events.rows[0]?.count ?? 0),
      total_recommendations: Number(recs.rows[0]?.count ?? 0),
      total_kols: Number(kols.rows[0]?.count ?? 0),
      avg_engagement: 0,
      avg_roi: avgRoi,
      impressions,
      clicks,
      ctr: impressions > 0 ? +((clicks / impressions) * 100).toFixed(2) : 0,
      spend,
      revenue,
      roi: avgRoi,
      algo_version: "heuristic_v1",
      model_version: "nivox-recommender@0.1.0",
      lastUpdatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Campaign analytics failed:", error);
    res.status(500).json({ error: "Failed to load campaign analytics" });
  }
}

function normalizeWindow(windowParam: string): string {
  switch (windowParam) {
    case "7d":
      return "7 days";
    case "30d":
      return "30 days";
    case "24h":
    default:
      return "24 hours";
  }
}

async function handleCampaignList(req: Request, res: Response) {
  const tenantScope = getTenantScope(req);
  try {
    const result = await pool.query(
      `SELECT id, brand_name, goal, target_region, target_age_range, budget, description
       FROM campaigns
       WHERE tenant_id = $1
       ORDER BY created_at DESC`,
      [tenantScope]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Failed to load campaigns:", error);
    res.status(500).json({ error: "Failed to load campaigns." });
  }
}

async function handleCampaignCreate(req: Request, res: Response) {
  const auth = getAuth(req);
  const payload = req.body as {
    title?: string;
    brand_name?: string;
    goal?: string;
    target_region?: string;
    target_age_range?: string;
    budget?: number;
    description?: string;
    country?: string;
  };

  const brandName = payload.brand_name ?? payload.title;
  if (!brandName) {
    res.status(400).json({ error: "Invalid payload: title or brand_name is required." });
    return;
  }

  const campaignId = `camp-${randomUUID().slice(0, 8)}`;
  const goal = payload.goal ?? "New campaign launch";
  const targetRegion = payload.target_region ?? payload.country ?? "Global";
  const targetAgeRange = payload.target_age_range ?? "18-34";
  const budget = typeof payload.budget === "number" ? payload.budget : 0;
  const description = payload.description ?? "Campaign brief pending.";

  try {
    await pool.query(
      `INSERT INTO campaigns (
         id, tenant_id, brand_name, goal, target_region, target_age_range, budget, description
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        campaignId,
        auth.tenant_id,
        brandName,
        goal,
        targetRegion,
        targetAgeRange,
        budget,
        description,
      ]
    );

    await pool.query(
      `INSERT INTO analytics_events (id, user_id, tenant_id, event_type, campaign_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        randomUUID(),
        auth.user_id,
        auth.tenant_id,
        "campaign_created",
        campaignId,
        { goal, region: targetRegion },
      ]
    );

    await writeAuditLog(auth, "campaign_created", { campaign_id: campaignId });

    res.status(201).json({
      id: campaignId,
      brand_name: brandName,
      goal,
      target_region: targetRegion,
      target_age_range: targetAgeRange,
      budget,
      description,
    });
  } catch (error) {
    console.error("Failed to create campaign:", error);
    res.status(500).json({ error: "Failed to create campaign." });
  }
}

async function handleCampaignDetail(req: Request, res: Response) {
  const tenantScope = getTenantScope(req);
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT id, brand_name, goal, target_region, target_age_range, budget, description
       FROM campaigns
       WHERE tenant_id = $1 AND id = $2
       LIMIT 1`,
      [tenantScope, id]
    );
    const campaign = result.rows[0];
    if (!campaign) {
      res.status(404).json({ error: "Campaign not found." });
      return;
    }
    res.json(campaign);
  } catch (error) {
    console.error("Failed to load campaign:", error);
    res.status(500).json({ error: "Failed to load campaign." });
  }
}

async function handleCampaignUpdate(req: Request, res: Response) {
  const tenantScope = getTenantScope(req);
  const { id } = req.params;
  const {
    brand_name,
    goal,
    target_region,
    target_age_range,
    budget,
    description,
  } = req.body as {
    brand_name?: string;
    goal?: string;
    target_region?: string;
    target_age_range?: string;
    budget?: number;
    description?: string;
  };

  try {
    const exists = await pool.query(
      `SELECT id FROM campaigns WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
      [id, tenantScope]
    );
    if (!exists.rows[0]) {
      res.status(404).json({ error: "Campaign not found." });
      return;
    }

    const result = await pool.query(
      `UPDATE campaigns
       SET brand_name = COALESCE($1, brand_name),
           goal = COALESCE($2, goal),
           target_region = COALESCE($3, target_region),
           target_age_range = COALESCE($4, target_age_range),
           budget = COALESCE($5, budget),
           description = COALESCE($6, description),
           updated_at = NOW()
       WHERE id = $7 AND tenant_id = $8
       RETURNING id, brand_name, goal, target_region, target_age_range, budget, description`,
      [brand_name, goal, target_region, target_age_range, budget, description, id, tenantScope]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Failed to update campaign:", error);
    res.status(500).json({ error: "Failed to update campaign." });
  }
}

async function writeAuditLog(
  auth: AuthContext,
  action: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO audit_log (id, tenant_id, user_id, action, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [randomUUID(), auth.tenant_id, auth.user_id, action, metadata ?? null]
    );
  } catch (error) {
    console.log("Failed to write audit log:", error);
  }
}

app.use((req: Request, res: Response) => {
  const requestId = getRequestId(req as RequestContext);
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "Route not found.",
      details: { path: req.originalUrl },
      request_id: requestId,
    },
  });
});

app.use((err: Error, req: Request, res: Response, _next: () => void) => {
  const requestId = getRequestId(req as RequestContext);
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Unexpected server error.",
      details: { error: err.message },
      request_id: requestId,
    },
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`NivoxAI API server listening on port ${PORT}`);
  });
}
