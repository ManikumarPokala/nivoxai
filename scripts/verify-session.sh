#!/usr/bin/env bash
set -euo pipefail

WEB_BASE="${WEB_BASE:-http://localhost:3000}"
API_BASE="${API_BASE:-http://localhost:4000}"
COOKIE_JAR="${COOKIE_JAR:-/tmp/nivoxai_session_cookies.txt}"

echo "Obtaining demo login from backend-api..."
LOGIN_JSON=$(curl -s "${API_BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@nivoxai.local","password":"demo"}')

TOKEN=$(python -c 'import sys, json; data=json.loads(sys.stdin.read() or "{}"); print(data.get("token",""))' <<< "${LOGIN_JSON}")
TENANT_ID=$(python -c 'import sys, json; data=json.loads(sys.stdin.read() or "{}"); print(data.get("tenant_id",""))' <<< "${LOGIN_JSON}")
ROLE=$(python -c 'import sys, json; data=json.loads(sys.stdin.read() or "{}"); print(data.get("role",""))' <<< "${LOGIN_JSON}")

if [ -z "${TOKEN}" ] || [ -z "${TENANT_ID}" ]; then
  echo "Missing token or tenant_id from backend-api login."
  exit 1
fi

echo "Setting frontend session cookies..."
curl -s -c "${COOKIE_JAR}" "${WEB_BASE}/api/session" \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"${TOKEN}\",\"tenant_id\":\"${TENANT_ID}\",\"role\":\"${ROLE}\"}" >/dev/null

echo "Fetching campaigns from frontend API..."
CAMPAIGNS=$(curl -s -b "${COOKIE_JAR}" "${WEB_BASE}/api/campaigns")
CAMPAIGN_ID=$(python -c 'import sys, json; data=json.loads(sys.stdin.read() or "[]"); print(data[0]["id"] if data else "")' <<< "${CAMPAIGNS}")

if [ -z "${CAMPAIGN_ID}" ]; then
  echo "No campaigns returned for tenant ${TENANT_ID}."
  exit 1
fi

echo "Fetching campaign detail ${CAMPAIGN_ID}..."
curl -s -b "${COOKIE_JAR}" "${WEB_BASE}/api/campaigns/${CAMPAIGN_ID}" | python -m json.tool | head -n 20

echo "Session verification complete."
