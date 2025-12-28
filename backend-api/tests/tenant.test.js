const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const request = require("supertest");

process.env.SKIP_DB_INIT = "1";
process.env.JWT_SECRET = "test-secret";

const { app, pool } = require("../dist/index.js");

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";

const USERS = {
  adminA: { id: "user-admin-a", tenant: TENANT_A, role: "admin" },
  viewerA: { id: "user-viewer-a", tenant: TENANT_A, role: "viewer" },
  adminB: { id: "user-admin-b", tenant: TENANT_B, role: "admin" },
};

const userTenantRoles = new Map(
  Object.values(USERS).map((user) => [
    `${user.id}:${user.tenant}`,
    user.role,
  ])
);

const tenantCounts = {
  [TENANT_A]: {
    events: "5",
    recs: "3",
    goals: [{ goal: "launch", count: "2" }],
  },
  [TENANT_B]: {
    events: "9",
    recs: "7",
    goals: [{ goal: "growth", count: "4" }],
  },
};

const campaignMetrics = {
  [TENANT_A]: {
    "camp-a": {
      events: "4",
      recs: "6",
      kols: "2",
      impressions: "1000",
      clicks: "120",
      spend: "500",
      revenue: "900",
    },
  },
};

const campaignAccess = {
  [TENANT_A]: new Set(["camp-a"]),
  [TENANT_B]: new Set(),
};

const signToken = (user) =>
  jwt.sign(
    { tenant_id: user.tenant, role: user.role },
    process.env.JWT_SECRET,
    { subject: user.id, expiresIn: "1h" }
  );

pool.query = async (text, values) => {
  const sql = typeof text === "string" ? text : text.text;
  const params = Array.isArray(values)
    ? values
    : typeof text === "object" && Array.isArray(text.values)
      ? text.values
      : [];

  if (sql.includes("FROM user_tenants")) {
    const [userId, tenantId] = params;
    const role = userTenantRoles.get(`${userId}:${tenantId}`);
    return { rows: role ? [{ role }] : [] };
  }

  if (sql.includes("FROM campaigns") && sql.includes("tenant_id") && sql.includes("LIMIT 1")) {
    const [campaignId, tenantId] = params;
    const allowed = campaignAccess[tenantId]?.has(campaignId);
    return { rows: allowed ? [{ id: campaignId }] : [] };
  }

  if (sql.includes("FROM analytics_events") && sql.includes("campaign_id")) {
    const [campaignId, tenantId] = params;
    const metrics = campaignMetrics[tenantId]?.[campaignId];
    return { rows: [{ count: metrics?.events ?? "0" }] };
  }

  if (sql.includes("FROM analytics_events") && sql.includes("COUNT(*)")) {
    const [tenantId] = params;
    return { rows: [{ count: tenantCounts[tenantId]?.events ?? "0" }] };
  }

  if (sql.includes("FROM recommendation_logs") && sql.includes("COUNT(DISTINCT")) {
    const [campaignId, tenantId] = params;
    const metrics = campaignMetrics[tenantId]?.[campaignId];
    return { rows: [{ count: metrics?.kols ?? "0" }] };
  }

  if (sql.includes("FROM recommendation_logs") && sql.includes("campaign_id")) {
    const [campaignId, tenantId] = params;
    const metrics = campaignMetrics[tenantId]?.[campaignId];
    return { rows: [{ count: metrics?.recs ?? "0" }] };
  }

  if (sql.includes("FROM recommendation_logs") && sql.includes("COUNT(*)")) {
    const [tenantId] = params;
    return { rows: [{ count: tenantCounts[tenantId]?.recs ?? "0" }] };
  }

  if (sql.includes("metadata->>'goal'")) {
    const [tenantId] = params;
    return { rows: tenantCounts[tenantId]?.goals ?? [] };
  }

  if (sql.includes("FROM campaign_results")) {
    const [campaignId, tenantId] = params;
    const metrics = campaignMetrics[tenantId]?.[campaignId];
    return {
      rows: [
        {
          impressions: metrics?.impressions ?? "0",
          clicks: metrics?.clicks ?? "0",
          spend: metrics?.spend ?? "0",
          revenue: metrics?.revenue ?? "0",
        },
      ],
    };
  }

  return { rows: [] };
};

test("unauthorized analytics request returns 401", async () => {
  const response = await request(app).get("/v1/analytics/summary");
  assert.equal(response.status, 401);
});

test("invalid token returns 401", async () => {
  const response = await request(app)
    .get("/v1/analytics/summary")
    .set("Authorization", "Bearer not-a-token");

  assert.equal(response.status, 401);
});

test("tenant scope ignores override for non-admin", async () => {
  const token = signToken(USERS.viewerA);
  const response = await request(app)
    .get(`/v1/analytics/summary?tenant_id=${TENANT_B}`)
    .set("Authorization", `Bearer ${token}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.total_events, Number(tenantCounts[TENANT_A].events));
});

test("tenant A cannot read tenant B campaign analytics", async () => {
  const token = signToken(USERS.viewerA);
  const response = await request(app)
    .get("/v1/analytics/campaign/camp-b")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(response.status, 404);
});

test("viewer role cannot post analytics events", async () => {
  const token = signToken(USERS.viewerA);
  const response = await request(app)
    .post("/v1/analytics/event")
    .set("Authorization", `Bearer ${token}`)
    .send({ event_type: "campaign_created" });

  assert.equal(response.status, 403);
});
