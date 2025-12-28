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
make db-seed >/dev/null 2>&1 || true

echo "Obtaining demo JWT tokens..."
ADMIN_LOGIN=$(curl -s "${API_BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@nivoxai.local","password":"demo"}')

ADMIN_TOKEN=$(python -c 'import sys, json; data=json.loads(sys.stdin.read() or "{}"); print(data.get("token", ""))' <<< "${ADMIN_LOGIN}")
ADMIN_TENANT=$(python -c 'import sys, json; data=json.loads(sys.stdin.read() or "{}"); print(data.get("tenant_id", ""))' <<< "${ADMIN_LOGIN}")

if [ -z "${ADMIN_TOKEN}" ]; then
  echo "Failed to obtain admin token. Check backend-api /auth/login."
  exit 1
fi

if [ -z "${ADMIN_TENANT}" ]; then
  echo "Warning: tenant_id missing in login response. Falling back to demo tenant."
  ADMIN_TENANT="00000000-0000-0000-0000-000000000001"
fi

REDACT_TOKENS=false
if [ "${CI:-}" = "true" ] || [ "${GITHUB_ACTIONS:-}" = "true" ]; then
  REDACT_TOKENS=true
fi

if [ "${REDACT_TOKENS}" = "true" ]; then
  PREFIX="${ADMIN_TOKEN:0:16}"
  SUFFIX="${ADMIN_TOKEN: -8}"
  echo "DEMO_ADMIN_JWT=${PREFIX}...${SUFFIX}"
else
  echo "DEMO_ADMIN_JWT=${ADMIN_TOKEN}"
fi
echo "DEMO_TENANT_ID=${ADMIN_TENANT}"
echo "Paste DEMO_ADMIN_JWT into /settings JWT field and DEMO_TENANT_ID into tenant_id field."

TENANT_B_LOGIN=$(curl -s "${API_BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@tenantb.local","password":"demo"}')

TENANT_B_TOKEN=$(python -c 'import sys, json; data=json.loads(sys.stdin.read() or "{}"); print(data.get("token", ""))' <<< "${TENANT_B_LOGIN}")
TENANT_B_ID=$(python -c 'import sys, json; data=json.loads(sys.stdin.read() or "{}"); print(data.get("tenant_id", ""))' <<< "${TENANT_B_LOGIN}")

if [ -n "${TENANT_B_TOKEN}" ]; then
  if [ "${REDACT_TOKENS}" = "true" ]; then
    PREFIX="${TENANT_B_TOKEN:0:16}"
    SUFFIX="${TENANT_B_TOKEN: -8}"
    echo "DEMO_VIEWER_JWT=${PREFIX}...${SUFFIX}"
  else
    echo "DEMO_VIEWER_JWT=${TENANT_B_TOKEN}"
  fi
  if [ -n "${TENANT_B_ID}" ]; then
    echo "DEMO_TENANT_B=${TENANT_B_ID}"
  fi
fi

echo "Analytics summary without token (expect 401):"
curl -s -o /dev/null -w "%{http_code}\n" "${API_BASE}/v1/analytics/summary"

echo "Analytics summary with admin token:"
curl -s -H "Authorization: Bearer ${ADMIN_TOKEN}" "${API_BASE}/v1/analytics/summary" | \
  python -m json.tool | head -n 20

echo "Fetching tenant A campaign..."
CAMPAIGN_ID=$(curl -s -H "Authorization: Bearer ${ADMIN_TOKEN}" "${API_BASE}/v1/campaigns" | \
  python -c 'import sys, json; data=json.load(sys.stdin); print(data[0]["id"] if data else "")')

if [ -z "${CAMPAIGN_ID}" ]; then
  CAMPAIGN_ID=$(curl -s -H "Authorization: Bearer ${ADMIN_TOKEN}" -H "Content-Type: application/json" \
    -d '{"title":"Demo Campaign","country":"Thailand","budget":10000}' \
    "${API_BASE}/v1/campaigns" | python -c 'import sys, json; print(json.load(sys.stdin)["id"])')
fi

echo "Cross-tenant check (tenant B token -> tenant A campaign):"
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer ${TENANT_B_TOKEN}" \
  "${API_BASE}/v1/analytics/campaign/${CAMPAIGN_ID}"

echo "Recommendation sample:"
RECOMMEND_STATUS=$(curl -s -o /tmp/recommend.json -w "%{http_code}\n" \
  "${API_BASE}/recommend" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "campaign": {
      "id": "'"${CAMPAIGN_ID}"'",
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
  }')

echo "${RECOMMEND_STATUS}"
python -m json.tool /tmp/recommend.json | head -n 40

echo "Demo complete."
