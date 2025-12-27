#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:8000}"

echo "Checking ${BASE_URL}/healthz"
curl -fsS "${BASE_URL}/healthz" >/dev/null

echo "Checking ${BASE_URL}/v1/model/status"
curl -fsS "${BASE_URL}/v1/model/status" >/dev/null

echo "OK"
