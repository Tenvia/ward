#!/usr/bin/env bash
# Ward no-NPM user install smoke test.
#
# Verifies the user-facing Docker path (docker-compose.user.yml) using
# only docker, curl, and standard shell tools. NPM is never invoked.
#
# Usage: ./scripts/smoke-user-install.sh
set -u

cd "$(dirname "$0")/.."

COMPOSE="docker compose -f docker-compose.user.yml"
API="http://localhost:4317"
TOKEN="${WARD_CONTROL_TOKEN:-ward-demo-token}"

PASS=0
FAIL=0
check() { # name condition-exit-code
  if [ "$2" -eq 0 ]; then
    echo "PASS  $1"
    PASS=$((PASS + 1))
  else
    echo "FAIL  $1"
    FAIL=$((FAIL + 1))
  fi
}

cleanup() {
  $COMPOSE down >/dev/null 2>&1
}
trap cleanup EXIT

echo "== Ward no-NPM user install smoke =="

$COMPOSE config >/dev/null 2>&1
check "compose config valid" $?

$COMPOSE up --build -d >/dev/null 2>&1
check "compose up" $?

UP=1
for _ in $(seq 1 40); do
  if curl -sf "$API/health" >/dev/null 2>&1; then UP=0; break; fi
  sleep 1
done
check "API healthy" $UP

curl -s "$API/health" | grep -q '"storage":"sqlite"'
check "health reports sqlite storage" $?

curl -s "$API/health" | grep -q '"controlRoomBundled":true'
check "health reports bundled Control Room" $?

curl -s "$API/" | grep -qi '<div id="root">'
check "GET / serves Control Room HTML" $?

curl -s "$API/openapi.yaml" | grep -q '^openapi: 3\.'
check "GET /openapi.yaml serves the contract" $?

# Reset state (auth required for mutations).
curl -s -o /dev/null -X POST "$API/ward/reset" -H "authorization: Bearer $TOKEN"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/v1/chat/completions" \
  -H "x-ward-tenant-id: tenant_acme" -H "content-type: application/json" \
  -d '{"model":"demo","messages":[{"role":"user","content":"hi"}]}')
[ "$STATUS" = "200" ]; check "Acme proxy call succeeds (200)" $?

STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/ward/tenants/tenant_globex/constrain" \
  -H "content-type: application/json" -d '{"actor":"user-smoke","reason":"no token"}')
[ "$STATUS" = "401" ]; check "constrain without token rejected (401)" $?

STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/ward/tenants/tenant_globex/constrain" \
  -H "authorization: Bearer $TOKEN" -H "content-type: application/json" \
  -d '{"actor":"user-smoke","reason":"user install smoke"}')
[ "$STATUS" = "200" ]; check "constrain with Bearer token succeeds" $?

STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/v1/chat/completions" \
  -H "x-ward-tenant-id: tenant_globex" -H "content-type: application/json" -d '{}')
[ "$STATUS" = "429" ]; check "Globex blocked after constrain (429)" $?

STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/v1/chat/completions" \
  -H "x-ward-tenant-id: tenant_acme" -H "content-type: application/json" -d '{}')
[ "$STATUS" = "200" ]; check "Acme still succeeds (200)" $?

curl -s "$API/ward/audit" | grep -q '"action":"constrain"'
check "audit shows the constrain" $?

$COMPOSE restart ward >/dev/null 2>&1
UP=1
for _ in $(seq 1 40); do
  if curl -sf "$API/health" >/dev/null 2>&1; then UP=0; break; fi
  sleep 1
done
check "API back up after container restart" $UP

STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/v1/chat/completions" \
  -H "x-ward-tenant-id: tenant_globex" -H "content-type: application/json" -d '{}')
[ "$STATUS" = "429" ]; check "Globex still constrained after restart (SQLite persisted)" $?

curl -s "$API/ward/audit" | grep -q '"action":"constrain"'
check "audit survived restart" $?

echo ""
echo "User install smoke: $PASS passed, $FAIL failed."
[ "$FAIL" -eq 0 ] || exit 1
