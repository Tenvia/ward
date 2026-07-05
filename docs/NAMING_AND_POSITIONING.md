# Ward Naming and Positioning

## Canonical description

> Ward lets existing SaaS teams pause, throttle, or recover one customer's
> AI agents and automations in production — with approval and an audit
> trail — while every other customer keeps running.

## One-line thesis

> Ward turns "disable AI for everyone" into "pause Acme," without moving a
> single line of the customer's application code into a new runtime.

## Demo line

> Globex was contained. Acme never blipped.

## Relationship to Saastle (historical/internal context)

Ward is a standalone TypeScript product with no Saastle code or runtime
dependency. The Saastle work is a historical design/pattern source only
(recorded in `docs/SAASTLE_SOURCE_MAP.md`); Saastle itself is 10via's
internal operations app (`docs/SAASTLE_INTERNAL_APP_DIRECTION.md`).
Ward never leads with Saastle's category language ("tenant runtime
control plane") and does not import Saastle's approved-phrase list
into Ward material.

## Language rules

### Lead with

- pause one customer's AI agents
- everyone else keeps running
- existing SaaS integration
- base URL change
- tenant ID header
- operator approval
- audit trail
- guarantee ladder

### Do not lead with

- generic control plane language
- generic observability
- plugin marketplace
- multi-node placement
- platform language

## What to say instead

| Weak or risky framing | Better Ward framing |
| --- | --- |
| "Runs on our control-plane platform" | "Integrates in minutes with a base-URL change" |
| "Tenant runtime control plane" | "Per-customer kill switch for AI agents" |
| "AI agent platform" | "Containment layer around your existing agents" |
| "Observability for AI spend" | "Real per-tenant call and spend metering, with an operator lever attached" |
| "Production-ready" | State what is implemented, tested, demo-supported, prototype, or planned — see `docs/CLAIMS_AND_EVIDENCE.md` |

## First buyer

CTO / VP Eng at a 10-100 person B2B SaaS with tenant-scoped AI agents, on a
Node/Python/Ruby stack. Ward integrates over HTTP, so the buyer's stack
does not matter. See `docs/PRODUCT_SPINE.md` for the full buyer profile.

## Claim discipline

Every public claim maps to one of: implemented, tested, demo-supported,
prototype, preview, or planned — per `docs/CLAIMS_AND_EVIDENCE.md`. If the
evidence is missing, the claim is labeled planned or prototype, not stated
as fact.
