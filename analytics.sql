DROP TABLE IF EXISTS app_events CASCADE;
CREATE TABLE app_events (
  id BIGSERIAL PRIMARY KEY,
  event_name TEXT NOT NULL,
  user_id TEXT NULL,
  campaign_id TEXT NULL,
  payload JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TABLE IF EXISTS recommendation_logs CASCADE;
CREATE TABLE recommendation_logs (
  id BIGSERIAL PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  influencer_id TEXT NOT NULL,
  score DOUBLE PRECISION NOT NULL,
  rank INT NOT NULL,
  factors JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TABLE IF EXISTS campaign_results CASCADE;
CREATE TABLE campaign_results (
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
