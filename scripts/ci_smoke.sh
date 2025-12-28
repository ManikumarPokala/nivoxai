#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

BASE_URL="${BASE_URL:-http://localhost:3000}"
BACKEND_API_URL="${BACKEND_API_URL:-http://localhost:4000}"
BACKEND_AI_URL="${BACKEND_AI_URL:-http://localhost:8000}"
COOKIE_JAR="$(mktemp)"
HEADERS_FILE="$(mktemp)"
BODY_FILE="$(mktemp)"
MAX_WAIT=180
INTERVAL=2

cleanup() {
  rm -f "$COOKIE_JAR" "$HEADERS_FILE" "$BODY_FILE"
}
trap cleanup EXIT

if [ -f "$REPO_ROOT/.env" ]; then
  set -a
  . "$REPO_ROOT/.env"
  set +a
fi

POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-nivoxai}"

wait_for_postgres() {
  if ! command -v docker >/dev/null 2>&1; then
    return 0
  fi
  local deadline=$((SECONDS + MAX_WAIT))
  while [ "$SECONDS" -lt "$deadline" ]; do
    local state
    state=$(docker inspect -f '{{.State.Status}}' "nivoxai-postgres" 2>/dev/null || true)
    if [ "$state" != "running" ]; then
      sleep "$INTERVAL"
      continue
    fi
    if docker exec nivoxai-postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
      return 0
    fi
    sleep "$INTERVAL"
  done
  echo "Postgres did not become ready in time."
  docker logs nivoxai-postgres || true
  return 1
}

wait_for() {
  local name="$1"
  local url="$2"
  local container="${3:-}"
  local deadline=$((SECONDS + MAX_WAIT))
  while [ "$SECONDS" -lt "$deadline" ]; do
    if curl -sf --max-time 3 -o /dev/null "$url"; then
      return 0
    fi
    sleep "$INTERVAL"
  done
  echo "Service not ready: $name ($url)"
  if [ -n "$container" ] && command -v docker >/dev/null 2>&1; then
    docker logs "$container" || true
  fi
  return 1
}

request() {
  local method="$1"
  local url="$2"
  local data="${3:-}"
  local content_type="Content-Type: application/json"
  : > "$HEADERS_FILE"
  : > "$BODY_FILE"
  if [[ -n "$data" ]]; then
    curl -s -X "$method" "$url" \
      -H "$content_type" \
      -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
      -D "$HEADERS_FILE" \
      -o "$BODY_FILE" \
      -d "$data"
  else
    curl -s -X "$method" "$url" \
      -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
      -D "$HEADERS_FILE" \
      -o "$BODY_FILE"
  fi
}

assert_success() {
  if ! grep -iq "^HTTP/.* 2" "$HEADERS_FILE"; then
    echo "Request failed"
    cat "$HEADERS_FILE"
    cat "$BODY_FILE"
    exit 1
  fi
}

assert_request_id() {
  if ! grep -iq "^x-request-id:" "$HEADERS_FILE"; then
    echo "Missing x-request-id header"
    cat "$HEADERS_FILE"
    exit 1
  fi
}

assert_error_schema() {
  python3 - "$1" <<'PY'
import json, sys
data = json.load(open(sys.argv[1]))
if "error" not in data:
    raise SystemExit("Missing error schema")
err = data["error"]
for key in ("code", "message", "request_id"):
    if key not in err:
        raise SystemExit(f"Missing error.{key}")
PY
}

echo "Waiting for postgres..."
wait_for_postgres

echo "Waiting for backend-api..."
wait_for "backend-api" "$BACKEND_API_URL/api/healthz" "nivoxai-backend-api"

echo "Waiting for backend-ai..."
wait_for "backend-ai" "$BACKEND_AI_URL/health" "nivoxai-backend-ai"

echo "Waiting for frontend..."
wait_for "frontend" "$BASE_URL/demo" "nivoxai-frontend"

echo "Bootstrapping demo session..."
for i in {1..10}; do
  request "POST" "$BASE_URL/api/auth/demo" "{}"
  if grep -iq "^HTTP/.* 2" "$HEADERS_FILE"; then
    assert_request_id
    break
  fi
  if [ "$i" -eq 10 ]; then
    echo "Failed to bootstrap demo session"
    cat "$HEADERS_FILE"
    cat "$BODY_FILE"
    exit 1
  fi
  sleep 2
done

echo "Session check..."
request "GET" "$BASE_URL/api/session"
assert_request_id
assert_success
python3 - "$BODY_FILE" <<'PY'
import json, sys
data = json.load(open(sys.argv[1]))
if not data.get("token") or not data.get("tenant_id"):
    raise SystemExit("Session missing token or tenant_id")
role = data.get("role")
if role not in ("admin", "brand_user", "viewer"):
    raise SystemExit(f"Unexpected role: {role}")
PY

echo "Healthz..."
request "GET" "$BASE_URL/api/healthz"
assert_request_id
assert_success

echo "Model status..."
request "GET" "$BASE_URL/api/model/status"
assert_request_id
assert_success

echo "Campaign list..."
request "GET" "$BASE_URL/api/campaigns"
assert_request_id
assert_success
CAMPAIGN_ID="$(python3 - "$BODY_FILE" <<'PY'
import json, sys
data = json.load(open(sys.argv[1]))
items = []
if isinstance(data, list):
    items = data
elif isinstance(data, dict):
    items = data.get("campaigns") or data.get("data") or []
for item in items:
    if isinstance(item, dict):
        base = item.get("campaign") if "campaign" in item else item
        if isinstance(base, dict):
            cid = base.get("id") or base.get("campaign_id")
            if cid:
                print(cid)
                raise SystemExit(0)
print("")
PY
)"
if [ -z "$CAMPAIGN_ID" ]; then
  echo "No campaigns found; creating demo campaign..."
  request "POST" "$BASE_URL/api/campaigns" "$(cat <<'JSON'
{"brand_name":"CI Demo Brand","goal":"Launch skincare","target_region":"Thailand","target_age_range":"18-24","budget":15000,"description":"CI demo campaign"}
JSON
)"
  assert_request_id
  assert_success
  CAMPAIGN_ID="$(python3 - "$BODY_FILE" <<'PY'
import json, sys
data = json.load(open(sys.argv[1]))
base = data.get("campaign") if isinstance(data, dict) and "campaign" in data else data
cid = None
if isinstance(base, dict):
    cid = base.get("id") or base.get("campaign_id")
print(cid or "")
PY
)"
fi
if [ -z "$CAMPAIGN_ID" ]; then
  echo "Failed to resolve campaign id."
  cat "$BODY_FILE"
  exit 1
fi

echo "Analytics summary..."
request "GET" "$BASE_URL/api/analytics/summary"
assert_request_id
assert_success

echo "Recommendations..."
recommend_payload="$(cat <<'JSON'
{"campaign":{"id":"__CAMPAIGN_ID__","brand_name":"CI Brand","goal":"Launch skincare","target_region":"Thailand","target_age_range":"18-24","budget":15000,"description":"CI smoke test"},"influencers":[{"id":"inf-ci-001","name":"Nina","platform":"Instagram","category":"beauty","followers":120000,"engagement_rate":0.06,"region":"Thailand","languages":["Thai"],"audience_age_range":"18-24","bio":"Skincare creator."}]}
JSON
)"
recommend_payload="${recommend_payload//__CAMPAIGN_ID__/${CAMPAIGN_ID}}"
request "POST" "$BASE_URL/api/recommendations" "$recommend_payload"
assert_request_id
assert_success

echo "RAG..."
request "POST" "$BASE_URL/api/rag" '{"query":"skincare creators","top_k":3}'
assert_request_id
assert_success

echo "Chat strategy..."
chat_payload="$(cat <<'JSON'
{"campaign":{"id":"__CAMPAIGN_ID__","brand_name":"CI Brand","goal":"Launch skincare","target_region":"Thailand","target_age_range":"18-24","budget":15000,"description":"CI smoke test"},"recommendations":{"campaign_id":"__CAMPAIGN_ID__","recommendations":[{"influencer_id":"inf-ci-001","score":0.8,"reasons":["Strong match"]}]},"question":"Provide a short 2-week plan."}
JSON
)"
chat_payload="${chat_payload//__CAMPAIGN_ID__/${CAMPAIGN_ID}}"
request "POST" "$BASE_URL/api/chat-strategy" "$chat_payload"
assert_request_id
assert_success

echo "Invalid request (error schema)..."
request "POST" "$BASE_URL/api/recommendations" "{}"
assert_request_id
assert_error_schema "$BODY_FILE"

echo "Smoke tests passed."
