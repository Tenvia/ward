#!/usr/bin/env bash
# Ward release verification: runs every release-critical check in
# order and prints a summary. Nothing is skipped silently — missing
# optional tools are reported as SKIPPED with the reason and the fix.
#
# Usage: ./scripts/verify-release.sh
set -u

cd "$(dirname "$0")/.."

PASS=0
FAIL=0
SKIP=0
SUMMARY=""

note() { SUMMARY="${SUMMARY}$1\n"; }

run_check() { # label command...
  local label="$1"
  shift
  echo ""
  echo "=== $label ==="
  if "$@"; then
    echo "--- PASS: $label"
    PASS=$((PASS + 1))
    note "PASS  $label"
  else
    echo "--- FAIL: $label"
    FAIL=$((FAIL + 1))
    note "FAIL  $label"
  fi
}

skip_check() { # label reason
  echo ""
  echo "=== $1 ==="
  echo "--- SKIPPED: $2"
  SKIP=$((SKIP + 1))
  note "SKIP  $1 ($2)"
}

# --- Contributor-tooling checks (Node required; this is a maintainer script) ---
run_check "OpenAPI validation" npm run validate:openapi --silent
run_check "Typecheck all packages" npm run typecheck --silent
run_check "SDK build" npm run build --prefix packages/ward-sdk --silent
run_check "Control Room build" npm run build --prefix apps/control-room --silent

# --- Smokes that need a live API: start one on 4317 for this block ---
echo ""
echo "Starting a local Ward API for smoke tests..."
(cd apps/api && npm run start >/tmp/ward-verify-api.log 2>&1) &
API_PG=$!
API_UP=1
for _ in $(seq 1 30); do
  if curl -sf http://localhost:4317/health >/dev/null 2>&1; then API_UP=0; break; fi
  sleep 1
done
if [ $API_UP -ne 0 ]; then
  echo "Local API failed to start; see /tmp/ward-verify-api.log"
  FAIL=$((FAIL + 1))
  note "FAIL  local API startup"
else
  run_check "Smoke: containment demo" npm run smoke:demo --silent
  run_check "Smoke: SDK guard + fail modes" npm run smoke:sdk --silent
  run_check "Smoke: OpenAPI live response conformance" npm run smoke:openapi --silent
fi
kill "$API_PG" 2>/dev/null
pkill -f "tsx src/server.ts" 2>/dev/null
sleep 1

run_check "Smoke: reliability (fail modes + control auth)" npm run smoke:reliability --silent

# --- Browser E2E ---
if (cd apps/control-room && npx playwright --version >/dev/null 2>&1); then
  if [ -d "${HOME}/Library/Caches/ms-playwright" ] || [ -d "${HOME}/.cache/ms-playwright" ]; then
    run_check "E2E: Control Room demo flow" bash -c "cd apps/control-room && npx playwright test"
    run_check "E2E: Control Room with control auth" bash -c "cd apps/control-room && npx playwright test -c playwright.auth.config.ts"
  else
    skip_check "E2E suites" "Playwright browsers not installed. Fix: cd apps/control-room && npx playwright install chromium"
  fi
else
  skip_check "E2E suites" "@playwright/test not installed. Fix: cd apps/control-room && npm install"
fi

# --- Docker checks ---
if docker info >/dev/null 2>&1; then
  run_check "Compose config: user bundle" docker compose -f docker-compose.user.yml config -q
  run_check "Compose config: pull (prebuilt image)" docker compose -f docker-compose.pull.yml config -q
  run_check "Compose config: user + fail-closed overlay" docker compose -f docker-compose.user.yml -f docker-compose.fail-closed.yml config -q
  run_check "Compose config: contributor stack" docker compose config -q
  run_check "Local image build (ward-api:local)" ./scripts/build-image.sh local
  run_check "No-NPM user install smoke (16 checks)" ./scripts/smoke-user-install.sh
else
  skip_check "Docker checks (compose configs, image build, user install smoke)" "Docker daemon not running. Fix: start Docker, then re-run"
fi

echo ""
echo "==================== RELEASE VERIFICATION SUMMARY ===================="
printf "%b" "$SUMMARY"
echo "======================================================================"
echo "Passed: $PASS  Failed: $FAIL  Skipped: $SKIP"
if [ $FAIL -ne 0 ]; then
  echo "RELEASE VERIFICATION FAILED"
  exit 1
fi
if [ $SKIP -ne 0 ]; then
  echo "Release verification passed WITH SKIPS — resolve skips before an actual release."
  exit 0
fi
echo "RELEASE VERIFICATION PASSED"
