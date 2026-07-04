# Integrating Ward into an Existing SaaS

## Summary

You do not have to rebuild your SaaS around Ward. The first
integration can be one base-URL change plus a tenant ID header. Ward
is stack-neutral: HTTP/OpenAPI is Ward's primary integration contract
— the formal spec is `openapi/ward.v0.yaml`, served by every running
Ward at `GET /openapi.yaml` — so Rails, Django, Laravel, Node, Go, or
anything else integrates the same way. No Elixir, no NPM, no SDK
required.

## Level 1 — Proxy-only (lowest friction, start here)

Point your AI/tool calls at Ward instead of the provider and add
headers:

```diff
- OPENAI_BASE_URL=https://api.openai.com/v1
+ OPENAI_BASE_URL=http://your-ward-host:4317/v1
```

Send on each call:

```text
x-ward-tenant-id: <your customer/tenant id>   (required)
x-ward-operation: agent.tool_call             (optional)
x-ward-correlation-id: <request id>           (optional)
```

What you get: per-tenant attribution, request counting, pressure
detection, and hard containment at the egress for proxied calls — a
constrained tenant gets 429, a paused tenant 423, while every other
tenant's calls pass untouched.

Mock upstream is the default (no API key needed for evaluation); set
`WARD_UPSTREAM_OPENAI_BASE_URL` + `OPENAI_API_KEY` on Ward for
pass-through to the real provider.

## Level 2 — SDK/guard (optional, cooperative)

If you want to check tenant state before running work that does not
go through the proxy (background jobs, loops):

```ts
const decision = await ward.guard({
  tenantId,
  operation: "agent.iteration",
  run: () => doTenantWork(),
});
// decision.decision: allowed | constrained | paused | fail_open | fail_closed
```

The TypeScript SDK exists (`packages/ward-sdk`) but is optional — the
same check is one HTTP GET (`/ward/tenants/:id`) from any language.
Generated multi-language clients are future work. Guard containment is
cooperative: code that skips the check is not contained.

## Level 3 — Workflow runners

Let Ward launch or control tenant-scoped workflow runs
(`POST /ward/workflow-runs`). Current status, honestly:

- mock runner: implemented prototype
- Docker runner: dev-only prototype, disabled by default, allowlisted
  images only
- Kubernetes runner: planned

## What Ward can and cannot guarantee

- Proxy-only integration can block/degrade calls **routed through
  Ward**. Traffic that bypasses Ward is invisible to it.
- SDK guard is **cooperative** — it contains code that asks first.
- Docker runner containment applies to **Ward-launched** container
  work.
- Ward cannot control work that never routes through Ward or checks
  Ward state.
- If the Ward proxy is hard-down, proxied traffic does not flow;
  fail-open covers Ward-internal policy faults, not process death.
  Hard-down survival requires customer-side fallback routing or an HA
  Ward deployment (planned).

## Operator surfaces

Control Room UI (bundled with the API container), `wardctl` (uv-based
CLI), or raw HTTP with the control token. Every containment action
goes through the approval-token flow or an authorized direct call, and
lands in the audit trail.
