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

## Relationship to Saastle

Ward's internal control-plane engine is built on the same Elixir/BEAM
runtime as Saastle (see `docs/SAASTLE_SOURCE_MAP.md`). Ward is a distinct
product surface: it never asks a customer to adopt BEAM, never leads with
Saastle's category language ("tenant runtime control plane"), and exposes
containment exclusively through an egress proxy and an SDK guard/lease
primitive. This document intentionally diverges from
`saastle/docs/TERMINOLOGY.md` and `saastle/docs/CATEGORY_POSITIONING.md` —
do not import Saastle's approved-phrase list into Ward material.

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

- BEAM
- Elixir
- generic control plane language
- generic observability
- plugin marketplace
- multi-node placement
- platform language

## What to say instead

| Weak or risky framing | Better Ward framing |
| --- | --- |
| "Runs on our BEAM control plane" | "Integrates in minutes with a base-URL change" |
| "Tenant runtime control plane" | "Per-customer kill switch for AI agents" |
| "AI agent platform" | "Containment layer around your existing agents" |
| "Observability for AI spend" | "Real per-tenant call and spend metering, with an operator lever attached" |
| "Production-ready" | State what is implemented, tested, demo-supported, prototype, or planned — see `docs/CLAIMS_AND_EVIDENCE.md` |

## First buyer

CTO / VP Eng at a 10-100 person B2B SaaS with tenant-scoped AI agents, on a
Node/Python/Ruby stack — not Elixir, that is the point. See
`docs/PRODUCT_SPINE.md` for the full buyer profile.

## Claim discipline

Every public claim maps to one of: implemented, tested, demo-supported,
prototype, preview, or planned — per `docs/CLAIMS_AND_EVIDENCE.md`. If the
evidence is missing, the claim is labeled planned or prototype, not stated
as fact.
