# Ward Product Spine

## What Ward is

Ward is tenant containment for AI SaaS. It lets existing SaaS teams pause,
throttle, or recover one customer's AI agents and automations in
production — with approval and an audit trail — while every other customer
keeps running.

## One-line thesis

Ward turns "disable AI for everyone" into "pause Acme," without moving a
single line of the customer's application code into a new runtime.

## Demo line

> Globex was contained. Acme never blipped.

## What Ward is not

- Not an agent framework.
- Not APM or generic observability.
- Not a generic AI gateway.
- Not a plugin marketplace.
- Not a Kubernetes replacement.
- Not something you run your app inside.
- Not a claim of full agent safety, full multi-node isolation, or
  guaranteed runaway-cost prevention.

## The control plane

Ward is a standalone TypeScript service (`apps/api`) — no external
runtime, no Saastle dependency. It holds per-tenant state:

- running
- constrained
- paused

The customer's application stays in Node, Python, Ruby, Rails, Django,
Laravel, Phoenix, or whatever it already runs on. Integration is HTTP:
a base-URL change plus a tenant header, per `openapi/ward.v0.yaml`
(served by every running Ward at `GET /openapi.yaml`).

The wedge is the triad no adjacent tool provides together: **tenant
state + operator approval + containment receipt (audit evidence)** at
an enforcement chokepoint.

## The chokepoints

Existing SaaS apps integrate through one or more of (statuses per
`docs/CLAIMS_AND_EVIDENCE.md`):

1. LLM/tool egress proxy — implemented prototype; ships first.
2. TypeScript SDK guard (`ward.guard()`) — implemented prototype,
   cooperative containment only.
3. Workflow runners — mock runner implemented; Docker runner is a
   dev-only prototype (disabled by default); Kubernetes runner planned.
4. Queue middleware — planned, not started.

See `docs/INTEGRATION_MODEL.md` for the full breakdown and
`docs/ARCHITECTURE.md` for how each chokepoint talks to the control
plane.

## First buyer

- **Buyer:** CTO / VP Eng at a 10-100 person B2B SaaS with tenant-scoped AI
  agents, on a Node/Python/Ruby stack.
- **Daily user:** on-call engineer, later support/CS.
- **Urgent pain:** one customer's agent loop or tool storm burns spend,
  hits a third-party rate limit, or writes bad data — and the only lever
  today is a global feature flag or a hotfix.
- **Qualifying question:** "Tell me about the last time one customer's AI
  feature caused an incident. What did you actually do?"

## The first demo

A normal Node/Express SaaS app with two tenants:

- Acme = healthy tenant.
- Globex = tenant with a runaway AI/tool loop.

See `docs/DEMO_SCRIPT.md` for the full script and
`examples/node-express-ai-saas/` for the implementation.

## Guarantee ladder (summary)

| Mode | Integration | Enforcement strength | Status |
| --- | --- | --- | --- |
| Proxy mode | LLM/tool/API calls route through Ward | Hard containment at egress for proxied calls | implemented prototype |
| SDK guard mode | Existing app asks Ward before work iterations | Cooperative containment | implemented prototype |
| Workflow runners | Ward launches the work | Process-level containment | mock prototype; Docker dev-only; K8s planned |
| Queue middleware mode | Worker asks Ward before dequeuing tenant jobs | Background-work containment | planned |

Full detail, including what is NOT enforced per mode, lives in
`docs/INTEGRATION_MODEL.md`.

## Language discipline

Lead with: pause one customer's AI agents, everyone else keeps running,
existing SaaS integration, base URL change, tenant ID header, operator
approval, audit trail, guarantee ladder.

Do not lead with: generic control plane language, generic observability,
plugin marketplace, multi-node placement, platform language, or any
claim not backed by `docs/CLAIMS_AND_EVIDENCE.md`.

See `docs/NAMING_AND_POSITIONING.md` for the full approved/avoid list.
