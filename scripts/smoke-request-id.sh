#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
COOKIE_JAR="$(mktemp)"

cleanup() {
  rm -f "$COOKIE_JAR"
}
trap cleanup EXIT

echo "Bootstrapping demo session..."
curl -sS -X POST "$BASE_URL/api/auth/demo" -c "$COOKIE_JAR" >/dev/null

echo "1) Healthz (expect x-request-id header)"
curl -sS -D - -o /dev/null -b "$COOKIE_JAR" "$BASE_URL/api/healthz" | rg -i "x-request-id" || true

echo "2) Invalid recommend (expect error schema)"
curl -sS -b "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -d '{}' \
  "$BASE_URL/api/recommendations"
echo

echo "3) RAG request (expect x-request-id header)"
curl -sS -D - -o /dev/null -b "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -d '{"query":"demo","top_k":3}' \
  "$BASE_URL/api/rag" | rg -i "x-request-id" || true
