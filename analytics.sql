DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS user_tenants CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS app_events CASCADE;
CREATE TABLE app_events (
  id BIGSERIAL PRIMARY KEY,
  event_name TEXT NOT NULL,
  user_id TEXT NULL,
  campaign_id TEXT NULL,
  tenant_id TEXT NULL,
  payload JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TABLE IF EXISTS recommendation_logs CASCADE;
CREATE TABLE recommendation_logs (
  id BIGSERIAL PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  tenant_id TEXT NULL,
  influencer_id TEXT NOT NULL,
  score DOUBLE PRECISION NOT NULL,
  rank INT NOT NULL,
  factors JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TABLE IF EXISTS analytics_events CASCADE;
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id TEXT NULL,
  tenant_id TEXT NULL,
  event_type TEXT NOT NULL,
  campaign_id TEXT NULL,
  influencer_id TEXT NULL,
  metadata JSONB NULL
);

DROP TABLE IF EXISTS campaign_results CASCADE;
CREATE TABLE campaign_results (
  id BIGSERIAL PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  tenant_id TEXT NULL,
  influencer_id TEXT NOT NULL,
  impressions INT NOT NULL,
  clicks INT NOT NULL,
  conversions INT NOT NULL,
  spend NUMERIC(12, 2) NOT NULL,
  revenue NUMERIC(12, 2) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_tenants (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, tenant_id)
);

CREATE TABLE campaigns (
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

CREATE TABLE audit_log (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  metadata JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
