# Ward Integration Model

## Summary

Ward integrates through chokepoints, shipped in this order, each
standalone-usable. Ward is a standalone TypeScript service; the
customer's application never runs inside Ward and never adopts a new
runtime. HTTP/OpenAPI (`openapi/ward.v0.yaml`) is the integration
contract. Statuses below follow `docs/CLAIMS_AND_EVIDENCE.md`.

## Tier 1 — Egress proxy (the wedge, ships first) — implemented prototype

Point `OPENAI_BASE_URL` at Ward and pass a tenant header
(`x-ward-tenant-id`). Ward's proxy attributes every outbound call by
tenant, updates that tenant's counters and pressure window, and
enforces state at the edge: a constrained tenant gets 429, a paused
tenant 423, before the request reaches the real API.

- Integration time: minutes (base URL + header).
- Enforcement: hard at egress — no cooperation from app code required,
  for calls routed through Ward.
- Mock upstream is the default; pass-through mode
  (`WARD_UPSTREAM_OPENAI_BASE_URL` + `OPENAI_API_KEY`) exists but is
  UNTESTED, and streaming is not supported yet.

## Tier 2 — TypeScript SDK guard (deeper containment) — implemented prototype

```ts
const decision = await ward.guard({ tenantId, operation, run: () => doWork() });
```

wraps an agent loop or job handler. Each call checks the tenant's
state over HTTP (`GET /ward/tenants/:id`) before running the work:

- Running: the callback runs (`decision: "allowed"`).
- Constrained / paused: the callback does not run; the decision says why.
- Ward unreachable: `failMode: "open"` (default) runs the callback and
  reports `fail_open` — never silently; `failMode: "closed"` refuses.

Guard containment is cooperative: code that skips the check is not
contained. The check is one HTTP GET, so any language can do it
without the SDK. (Earlier drafts described a lease/channel-push
design; that is not how the shipped SDK works.)

## Tier 3 — Workflow runners — mock implemented; Docker dev-only; K8s planned

Ward can launch or gate tenant-scoped workflow runs
(`POST /ward/workflow-runs`). Paused or constrained tenants get runs
created as `blocked`, never executed. The mock runner is an
implemented prototype; the Docker runner is a dev-only prototype
disabled by default (allowlisted images only); the Kubernetes runner
is planned.

## Tier 4 — Queue middleware (later) — planned

BullMQ/Celery/Sidekiq adapters that check tenant state before
dequeuing a tenant's job. Not started.

## The guarantee ladder

| Mode | Integration | Enforcement strength | Status |
| --- | --- | --- | --- |
| Proxy mode | LLM/tool/API calls route through Ward | Hard containment at egress for proxied calls | implemented prototype |
| SDK guard mode | Existing app asks Ward before work iterations | Cooperative containment | implemented prototype |
| Workflow runners | Ward launches the work | Process-level containment | mock prototype; Docker dev-only; K8s planned |
| Queue middleware mode | Worker asks Ward before dequeuing tenant jobs | Background-work containment | planned |

### What's enforced vs. not, per mode

| Mode | What's enforced | What's not | Say this to buyers |
| --- | --- | --- | --- |
| Proxy only | Outbound LLM/tool calls blocked (429/423) for a constrained or paused tenant | A local loop can still spin CPU/memory until its next outbound call; traffic that bypasses Ward is invisible to it | "Hard containment at the point of external cost and risk." |
| Proxy + SDK guard | Above, plus the loop itself yields at each guard check — spin is bounded to one iteration | Requires the app to call `ward.guard` around its loop | "Hard containment at the edge, cooperative containment on the loop itself." |
| SDK guard only (no proxy) | Loop yields at guard checks | Nothing stops calls that bypass the guard | Positioned as a fallback for non-LLM automations, not the lead story |

State this ladder explicitly in every doc and every pitch. Never imply
proxy-level guarantees for SDK-only integrations.

## Failure behavior (honest)

- SDK guard fail-open/fail-closed: implemented prototype, verified by
  `npm run smoke:sdk`.
- Proxy degraded fail-open (Ward up, policy lookup fails): implemented
  prototype — mode `open` allows with an `x-ward-fail-open: true`
  header plus an audit event; `closed` blocks 503. Verified by
  `npm run smoke:reliability`.
- Proxy hard-down (Ward process/network fully down): proxied traffic
  does not flow. Customer-side fallback routing or an HA Ward
  deployment is required; neither exists yet. Do not claim Ward
  survives hard-down.
