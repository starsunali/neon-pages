#!/usr/bin/env bash
# ============================================================================
# Health check for the deployed stack.
#   ./scripts/healthcheck.sh
# Exits 0 if API + DB are healthy, 1 otherwise.
# ============================================================================
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
[ -f .env ] && { set -a; source .env; set +a; }
BASE="${PUBLIC_BASE_URL:-http://localhost}"

info() { echo -e "\033[34m[health]\033[0m $*"; }
pass() { echo -e "\033[32m  ✓\033[0m $*"; }
bad()  { echo -e "\033[31m  ✗\033[0m $*"; }

info "Checking $BASE"
code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$BASE/api/v1/health" || echo 000)"
if [ "$code" = "200" ]; then
  pass "API health endpoint (HTTP 200)"
else
  bad  "API health endpoint returned HTTP $code"
  exit 1
fi

body="$(curl -s --max-time 10 "$BASE/api/v1/health")"
echo "    $body"
if echo "$body" | grep -q '"db":"up"'; then pass "Database reachable"; else bad "Database is DOWN"; exit 1; fi

front="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$BASE/" || echo 000)"
if [ "$front" = "200" ]; then pass "Frontend (HTTP 200)"; else bad "Frontend returned HTTP $front"; exit 1; fi

echo "✓ All healthy."