# Proxy Demo Runbook

This runbook drives the Week 1 egress proxy prototype end to end. Everything
here is local, in-memory, and mock-upstream by default. See
`docs/CLAIMS_AND_EVIDENCE.md` for what this does and does not prove.

Default ports: proxy `4317`, demo SaaS app `4401`.

## 1. Start the proxy

```bash
cd ~/Projects/10via/ward/apps/proxy
npm install
npm run dev
```

## 2. Start the Node SaaS demo

```bash
cd ~/Projects/10via/ward/examples/node-express-ai-saas
npm install
npm run dev
```

## 3. Run Acme once

```bash
curl -X POST http://localhost:4401/tenants/acme/run-agent-once
```

Expect a mock OpenAI-compatible response with `ward.tenantId: "tenant_acme"`.

## 4. Start the Globex loop

```bash
curl -X POST http://localhost:4401/tenants/globex/start-loop
```

This starts a real repeated call from the demo app to the proxy (every
500ms), simulating a broken tool retrying. Let it run for ~10 seconds.

## 5. Inspect Ward tenants

```bash
curl http://localhost:4317/ward/tenants
```

Expect Globex's `requestCount` and `recentTimestamps` climbing while Acme's
stay flat at whatever you ran manually.

## 6. Constrain Globex

```bash
curl -X POST http://localhost:4317/ward/tenants/tenant_globex/constrain \
  -H "content-type: application/json" \
  -d '{"actor":"demo-operator","reason":"Globex loop exceeded demo threshold"}'
```

## 7. Run Acme again and prove it still works

```bash
curl -X POST http://localhost:4401/tenants/acme/run-agent-once
```

Expect the same mock success response as step 3 — Acme is unaffected by
Globex's constraint.

Then confirm Globex is blocked:

```bash
curl -X POST http://localhost:4401/tenants/globex/run-agent-once
```

Expect HTTP 429 with `error: "ward_tenant_constrained"`.

## 8. Inspect the audit trail

```bash
curl http://localhost:4317/ward/audit
```

Expect `loop_detected` entries once Globex crosses the window threshold,
followed by a `set_constrained` entry with the actor and reason from step 6.

## Cleanup

```bash
curl -X POST http://localhost:4401/tenants/globex/stop-loop
curl -X POST http://localhost:4317/ward/tenants/tenant_globex/resume \
  -H "content-type: application/json" -d '{"actor":"demo-operator","reason":"demo reset"}'
curl -X POST http://localhost:4317/ward/reset
```

## What this proves

- The integration surface really is a base URL and a tenant header — see
  `examples/node-express-ai-saas/src/wardClient.ts`.
- The proxy attributes real traffic per tenant and tracks it in memory.
- Constraining one tenant blocks only that tenant; the other tenant is
  provably unaffected.
- Every containment action is recorded to an in-memory audit trail with
  actor, reason, previous state, and next state.

## What this does not prove

- No durable audit — restarting the proxy process clears all state.
- No real dollar-cost metering — `estimatedSpendUsd` is a fixed fake
  per-call rate, not a real cost model.
- No production auth/RBAC on the admin endpoints — they are open,
  local-only, prototype endpoints.
- No verified fail-open behavior — this prototype has no upstream-outage
  path tested.
- No queue middleware, no hosted service, no production readiness claim.

> Superseded: the proxy app moved to `apps/api` and this runbook is
> replaced by `docs/LOCAL_DEMO_RUNBOOK.md`. Kept for history.
