#!/usr/bin/env bash
set -euo pipefail

API_BASE="http://localhost:4000"
AI_BASE="http://localhost:8000"

echo "Waiting for backend services..."
for _ in {1..30}; do
  if curl -fsS "${API_BASE}/health" >/dev/null && curl -fsS "${AI_BASE}/health" >/dev/null; then
    break
  fi
  sleep 2
done

if ! curl -fsS "${API_BASE}/health" >/dev/null; then
  echo "backend-api is not ready at ${API_BASE}/health"
  exit 1
fi

if ! curl -fsS "${AI_BASE}/health" >/dev/null; then
  echo "backend-ai is not ready at ${AI_BASE}/health"
  exit 1
fi

echo "Tip: run 'make db-seed' for richer analytics data."

echo "Obtaining demo JWT tokens..."
ADMIN_TOKEN=$(curl -s "${API_BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@nivoxai.local","password":"demo"}' | \
  python -c 'import sys, json; print(json.load(sys.stdin)["token"])')

TENANT_B_TOKEN=$(curl -s "${API_BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@tenantb.local","password":"demo"}' | \
  python -c 'import sys, json; print(json.load(sys.stdin)["token"])')

echo "Analytics summary without token (expect 401):"
curl -s -o /dev/null -w "%{http_code}\n" "${API_BASE}/v1/analytics/summary"

echo "Analytics summary with admin token:"
curl -s -H "Authorization: Bearer ${ADMIN_TOKEN}" "${API_BASE}/v1/analytics/summary" | \
  python -m json.tool | head -n 20

echo "Cross-tenant check (tenant B token -> tenant A campaign):"
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer ${TENANT_B_TOKEN}" \
  "${API_BASE}/v1/analytics/campaign/camp-demo-001"

echo "Recommendation sample:"
curl -s "${API_BASE}/recommend" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "campaign": {
      "id": "camp-demo-001",
      "brand_name": "Luma Beauty",
      "goal": "Launch skincare",
      "target_region": "Thailand",
      "target_age_range": "18-24",
      "budget": 10000,
      "description": "Skincare launch campaign"
    },
    "influencers": [
      {
        "id": "inf-1",
        "name": "Nina Glow",
        "platform": "Instagram",
        "category": "beauty",
        "followers": 120000,
        "engagement_rate": 0.05,
        "region": "Thailand",
        "languages": ["Thai"],
        "audience_age_range": "18-24",
        "bio": "Skincare creator."
      },
      {
        "id": "inf-2",
        "name": "Kai Fit",
        "platform": "TikTok",
        "category": "fitness",
        "followers": 90000,
        "engagement_rate": 0.04,
        "region": "Singapore",
        "languages": ["English"],
        "audience_age_range": "25-34",
        "bio": "Fitness coach."
      }
    ]
  }' | python -m json.tool | head -n 40

echo "Demo complete."
