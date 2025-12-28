#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

BASE_URL="${BASE_URL:-http://localhost:3000}"
COOKIE_JAR="$(mktemp)"
HEADERS_FILE="$(mktemp)"
BODY_FILE="$(mktemp)"

cleanup() {
  rm -f "$COOKIE_JAR" "$HEADERS_FILE" "$BODY_FILE"
}
trap cleanup EXIT

wait_for_container() {
  local name="$1"
  local retries=90
  local delay=2
  if ! command -v docker >/dev/null 2>&1; then
    return 0
  fi
  for ((i=1; i<=retries; i++)); do
    local status
    local state
    status=$(docker inspect -f '{{.State.Health.Status}}' "$name" 2>/dev/null || true)
    state=$(docker inspect -f '{{.State.Status}}' "$name" 2>/dev/null || true)
    if [ "$state" != "running" ]; then
      if [ "$i" -eq "$retries" ]; then
        echo "Container not running: $name (state=$state)"
        docker logs "$name" || true
        return 1
      fi
      sleep "$delay"
      continue
    fi
    if [ -z "$status" ] || [ "$status" = "<no value>" ]; then
      echo "No healthcheck for $name; continuing"
      return 0
    fi
    if [ "$status" = "healthy" ]; then
      return 0
    fi
    if [ "$i" -eq "$retries" ]; then
      echo "Container not healthy: $name"
      docker logs "$name" || true
      return 1
    fi
    sleep "$delay"
  done
}

wait_for() {
  local url="$1"
  local retries=90
  local delay=2
  for ((i=1; i<=retries; i++)); do
    if curl -sf --max-time 3 -o /dev/null "$url"; then
      return 0
    fi
    sleep "$delay"
  done
  echo "Service not ready: $url"
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

echo "Waiting for containers..."
wait_for_container "nivoxai-postgres"
wait_for_container "nivoxai-backend-ai"
wait_for_container "nivoxai-backend-api"

echo "Waiting for frontend..."
wait_for "$BASE_URL/demo"

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

echo "Healthz..."
request "GET" "$BASE_URL/api/healthz"
assert_request_id

echo "Model status..."
request "GET" "$BASE_URL/api/model/status"
assert_request_id

echo "Campaign list..."
request "GET" "$BASE_URL/api/campaigns"
assert_request_id

echo "Analytics summary..."
request "GET" "$BASE_URL/api/analytics/summary"
assert_request_id

echo "Recommendations..."
request "POST" "$BASE_URL/api/recommendations" "$(cat <<'JSON'
{"campaign":{"id":"camp-ci-001","brand_name":"CI Brand","goal":"Launch skincare","target_region":"Thailand","target_age_range":"18-24","budget":15000,"description":"CI smoke test"},"influencers":[{"id":"inf-ci-001","name":"Nina","platform":"Instagram","category":"beauty","followers":120000,"engagement_rate":0.06,"region":"Thailand","languages":["Thai"],"audience_age_range":"18-24","bio":"Skincare creator."}]}
JSON
)"
assert_request_id

echo "RAG..."
request "POST" "$BASE_URL/api/rag" '{"query":"skincare creators","top_k":3}'
assert_request_id

echo "Chat strategy..."
request "POST" "$BASE_URL/api/chat-strategy" "$(cat <<'JSON'
{"campaign":{"id":"camp-ci-001","brand_name":"CI Brand","goal":"Launch skincare","target_region":"Thailand","target_age_range":"18-24","budget":15000,"description":"CI smoke test"},"recommendations":{"campaign_id":"camp-ci-001","recommendations":[{"influencer_id":"inf-ci-001","score":0.8,"reasons":["Strong match"]}]},"question":"Provide a short 2-week plan."}
JSON
)"
assert_request_id

echo "Invalid request (error schema)..."
request "POST" "$BASE_URL/api/recommendations" "{}"
assert_request_id
assert_error_schema "$BODY_FILE"

echo "Smoke tests passed."
