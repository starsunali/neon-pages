#!/usr/bin/env bash
# Minimal smoke runner for tests/e2e/smoke.http (curl-based).
#   BASE=http://localhost ./tests/e2e/run-smoke.sh
set -uo pipefail
BASE="${BASE:-http://localhost}"
API="$BASE/api/v1"
pass=0; fail=0

check() { # check <name> <expected_code> <actual_code>
  if [ "$2" = "$3" ]; then pass=$((pass+1)); echo "  ✓ $1 (HTTP $3)";
  else fail=$((fail+1)); echo "  ✗ $1 — expected $2, got $3"; fi
}

echo "▶ Smoke tests against $API"

code=$(curl -s -o /dev/null -w '%{http_code}' "$API/health"); check health 200 "$code"

login=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d '{"username":"demo","password":"User@12345","captcha":"ABCD"}')
code=$(echo "$login" | head -c 200 >/dev/null; curl -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d '{"username":"demo","password":"User@12345","captcha":"ABCD"}')
check "login demo" 200 "$code"
token=$(echo "$login" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("accessToken",""))' 2>/dev/null)

if [ -n "$token" ]; then
  code=$(curl -s -o /dev/null -w '%{http_code}' "$API/auth/me" -H "Authorization: Bearer $token")
  check "me (auth)" 200 "$code"
  code=$(curl -s -o /dev/null -w '%{http_code}' "$API/p/welcome")
  check "public page /p/welcome" 200 "$code"
  code=$(curl -s -o /dev/null -w '%{http_code}' "$API/p/%27%20OR%20%271%27%3D%271")
  check "sqli probe blocked" 404 "$code"   # 404 (not 500) = not leaked
else
  echo "  ✗ could not extract access token — seeding may not have run"
  fail=$((fail+1))
fi

echo
echo "Passed: $pass | Failed: $fail"
[ "$fail" = "0" ]