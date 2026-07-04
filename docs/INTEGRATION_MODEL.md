# Ward Integration Model

## Summary

Ward integrates through three chokepoints, ship in this order, each
standalone-sellable. No tier requires the customer's application to run on
BEAM — the Elixir/BEAM engine only runs inside Ward's own container/service.

## Tier 1 — Egress proxy (the wedge, ships first)

Point `OPENAI_BASE_URL` (or the equivalent Anthropic/tool-API base URL) at
Ward, pass a tenant header (`X-Ward-Tenant`). Ward's proxy attributes every
outbound call by tenant, meters it against the shadow runtime for that
tenant, and enforces state at the edge: constrained tenants get calls
throttled or rejected before they reach the real API.

- Integration time: minutes.
- Enforcement: physical — no cooperation from app code required.
- The proxy sees real traffic, which is what makes the demo honest instead
  of simulated.

## Tier 2 — TypeScript SDK guard/lease (deeper containment)

```ts
await ward.guard(tenantId, () => doWork())
```

wraps an agent loop or job handler. Each iteration leases a short-lived
permission from the tenant's shadow runtime, pushed to the SDK over
tenant-scoped channels so checks are local and fast, not a network
round-trip per call.

- Constrained: lease returns throttle instructions.
- Paused: lease denied, loop parks.
- "Restart" is a revoke-and-drain: all leases revoked, in-flight work
  checkpoints or aborts, fresh leases granted on resume.

## Tier 3 — Queue middleware (later, not in the first two weeks)

BullMQ/Celery/Sidekiq adapters that check the shadow runtime before
dequeuing a tenant's job. Sequenced after Tiers 1-2 prove the wedge.

## Native Saastle runtime mode

For a customer already running on the Saastle-native Elixir/Phoenix
runtime, tenant work can run directly inside Saastle supervision. This is
the strongest containment mode but is not the lead integration path — most
Ward customers are not on Elixir.

## The guarantee ladder

| Mode | Integration | Enforcement strength |
| --- | --- | --- |
| Native Saastle runtime mode | Tenant work runs inside Saastle supervision | Strongest containment |
| Proxy mode | LLM/tool/API calls route through Ward | Hard containment at egress |
| SDK guard mode | Existing app asks Ward before work iterations | Cooperative containment |
| Queue middleware mode | Worker asks Ward before dequeuing tenant jobs | Future background-work containment |

### What's enforced vs. not, per mode

| Mode | What's enforced | What's not | Say this to buyers |
| --- | --- | --- | --- |
| Proxy only | Outbound LLM/tool calls physically held/blocked for a constrained or paused tenant | A local loop can still spin CPU/memory until its next outbound call | "Hard containment at the point of external cost and risk." |
| Proxy + SDK guard | Above, plus the loop itself yields at each lease check — spin is bounded to one iteration | Requires the app to call `ward.guard` around its loop | "Hard containment at the edge, cooperative containment on the loop itself." |
| SDK guard only (no proxy) | Loop yields at lease checks | Nothing stops calls that bypass the guard | Positioned as a fallback for non-LLM automations, not the lead story |

State this ladder explicitly in every doc and every pitch. Never imply
proxy-level guarantees for SDK-only integrations.

## Fails open

Ward's decision path fails open (allow) if the control plane is
unreachable. Ward must never become the outage. Worst case on an outage is
loss of containment temporarily, not loss of availability.
