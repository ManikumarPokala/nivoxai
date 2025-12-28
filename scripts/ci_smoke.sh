#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
COOKIE_JAR="$(mktemp)"
HEADERS_FILE="$(mktemp)"
BODY_FILE="$(mktemp)"

cleanup() {
  rm -f "$COOKIE_JAR" "$HEADERS_FILE" "$BODY_FILE"
}
trap cleanup EXIT

wait_for() {
  local url="$1"
  local retries=40
  local delay=2
  for ((i=1; i<=retries; i++)); do
    if curl -s -o /dev/null "$url"; then
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

echo "Waiting for frontend..."
wait_for "$BASE_URL"

echo "Bootstrapping demo session..."
request "POST" "$BASE_URL/api/auth/demo" "{}"
assert_request_id

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
