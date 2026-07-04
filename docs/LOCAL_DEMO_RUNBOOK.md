# Ward Local Demo Runbook

## Summary

Proves the wedge locally: Globex's runaway agent loop is detected and
contained by an operator while Acme keeps working. All state is
in-memory; restart the API to reset, or use `POST /ward/reset`.

## Start the services

```bash
# Terminal 1
cd ~/Projects/10via/ward/apps/api
npm install
npm run dev
```

```bash
# Terminal 2
cd ~/Projects/10via/ward/examples/node-express-ai-saas
npm install
npm run dev
```

```bash
# Terminal 3
cd ~/Projects/10via/ward/apps/control-room
npm install
npm run dev
```

Control Room: http://localhost:5173 (polls the Ward API every 2s).

## Automated verification

With the API running (Terminal 1; demo app optional):

```bash
cd ~/Projects/10via/ward
npm run smoke:demo
```

Runs the whole containment sequence below (16 checks) and prints a
pass/fail report. It resets Ward state first and resumes Globex when
done.

Also available:

```bash
# SDK guard + fail modes (API must be running): 6 checks
npm run smoke:sdk

# Fail-open/fail-closed + control auth (self-starting, port 4390): 13 checks
npm run smoke:reliability

# No-NPM user Docker path (docker + curl only): 15 checks
./scripts/smoke-user-install.sh
```

Browser E2E variants:

```bash
cd apps/control-room
npm run test:e2e        # no-auth demo flow
npm run test:e2e:auth   # same flow with WARD_REQUIRE_CONTROL_TOKEN=true
```

Browser E2E (starts its own API + Control Room; nothing else needed):

```bash
cd ~/Projects/10via/ward/apps/control-room
npm run test:e2e
```

Drives the real UI in Chromium: tenant list, pressure display,
approval token + phrase echo, constrained chip, Acme still running,
audit timeline, plus API-level 429/200 enforcement checks.

## Browser walkthrough (manual)

1. Open http://localhost:5173.
2. Run the loop steps below; the Globex row shows a pressure dot and
   the tenant appears in Incidents within a poll cycle.
3. Select Globex, fill Reason, click "Request approval".
4. Type the shown phrase (`constrain tenant_globex`) exactly and click
   "Apply approved action".
5. Globex's chip turns constrained; Acme stays running; the Audit
   Timeline shows `constrain (running -> constrained)`.

## Demo sequence

```bash
# Acme works
curl -X POST http://localhost:4401/tenants/acme/run-agent-once

# Globex works once
curl -X POST http://localhost:4401/tenants/globex/run-agent-once

# Start Globex loop
curl -X POST http://localhost:4401/tenants/globex/start-loop

# Inspect Ward — after ~5s Globex shows detectedPressure: true
curl http://localhost:4317/ward/tenants

# Request approval
curl -X POST http://localhost:4317/ward/tenants/tenant_globex/approval \
  -H "content-type: application/json" \
  -d '{"action":"constrain","actor":"demo-operator","reason":"Globex loop exceeded demo threshold"}'

# Apply approved action using returned approvalToken and phrase
curl -X POST http://localhost:4317/ward/tenants/tenant_globex/apply-approved-action \
  -H "content-type: application/json" \
  -d '{"approvalToken":"PASTE_TOKEN","phrase":"constrain tenant_globex"}'

# Acme still works
curl -X POST http://localhost:4401/tenants/acme/run-agent-once

# Globex is blocked (HTTP 429, ward_tenant_constrained)
curl -X POST http://localhost:4401/tenants/globex/run-agent-once

# Audit shows the action
curl http://localhost:4317/ward/audit
```

## Expected results

- Acme calls return HTTP 200 mock completions throughout.
- The Globex loop (2 req/s) crosses the default threshold
  (8 requests / 10s) within ~4-5 seconds; Ward flags
  `detectedPressure` with a `pressure_detected` audit event but does
  not auto-constrain.
- The approval response contains `approvalToken`, `requiredPhrase`
  (`constrain tenant_globex`), and `expiresAt` (120s TTL). Tokens are
  single-use; a wrong phrase or reused token returns HTTP 400.
- After the constrain is applied, Globex proxy calls return HTTP 429
  with `ward_tenant_constrained`; the demo app's loop stops itself
  when it sees the block.
- `GET /ward/audit` shows `approval_requested`, the `constrain`
  transition with previous/next state, and `pressure_detected`.

## Optional extras

```bash
# Workflow runs: mock succeeds for a running tenant
curl -X POST http://localhost:4317/ward/workflow-runs \
  -H "content-type: application/json" \
  -d '{"tenantId":"tenant_acme","runner":"mock"}'

# Blocked for a constrained/paused tenant
curl -X POST http://localhost:4317/ward/workflow-runs \
  -H "content-type: application/json" \
  -d '{"tenantId":"tenant_globex","runner":"mock"}'

# Resume Globex
curl -X POST http://localhost:4317/ward/tenants/tenant_globex/resume \
  -H "content-type: application/json" \
  -d '{"actor":"demo-operator","reason":"demo complete"}'

# Full reset
curl -X POST http://localhost:4317/ward/reset
```
