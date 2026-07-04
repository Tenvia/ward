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
- Not a plugin marketplace.
- Not a Kubernetes replacement.
- Not something you run your app inside.
- Not a claim of full agent safety, full multi-node isolation, or
  guaranteed runaway-cost prevention.

## The internal engine

The Elixir/BEAM runtime (inherited from Saastle, see
`docs/SAASTLE_SOURCE_MAP.md`) is Ward's internal control-plane engine. It
runs a shadow runtime per tenant and holds tenant state:

- running
- constrained
- paused
- recovering

The customer's application stays in Node, Python, Ruby, Rails, Django,
Laravel, Phoenix, or whatever it already runs on. The customer never adopts
BEAM, never touches Elixir, and never sees the runtime engine directly.

## The three chokepoints

Existing SaaS apps integrate through one or more of:

1. LLM/tool egress proxy (Tier 1 — ships first).
2. TypeScript SDK guard/lease primitive (Tier 2).
3. Queue middleware (Tier 3 — later).

See `docs/INTEGRATION_MODEL.md` for the full breakdown and
`docs/architecture.md` for how each chokepoint talks to the internal
engine.

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

See `docs/DEMO_SCRIPT.md` for the full script.

## Guarantee ladder (summary)

| Mode | Integration | Enforcement strength |
| --- | --- | --- |
| Native Saastle runtime mode | Tenant work runs inside Saastle supervision | Strongest containment |
| Proxy mode | LLM/tool/API calls route through Ward | Hard containment at egress |
| SDK guard mode | Existing app asks Ward before work iterations | Cooperative containment |
| Queue middleware mode | Worker asks Ward before dequeuing tenant jobs | Future background-work containment |

Full detail, including what is NOT enforced per mode, lives in
`docs/INTEGRATION_MODEL.md`.

## Language discipline

Lead with: pause one customer's AI agents, everyone else keeps running,
existing SaaS integration, base URL change, tenant ID header, operator
approval, audit trail, guarantee ladder.

Do not lead with: BEAM, Elixir, generic control plane language, generic
observability, plugin marketplace, multi-node placement, platform language.

See `docs/NAMING_AND_POSITIONING.md` for the full approved/avoid list.
