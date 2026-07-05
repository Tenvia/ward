# Ward Objections

These are the objections we expect from an existing SaaS team evaluating
Ward. Here is the current answer to each, and what would change our
answer.

## 1. "We already have feature flags."

Flags are global or manually tenant-keyed booleans with no tenant state
model, no enforcement chokepoint, and no audit trail tied to evidence.
You can build "off." You cannot cheaply build "constrained-but-alive,"
approval-gated, and audited — that is the part that gets skipped until the
incident.

- **What would change our answer:** a published case where a homegrown
  per-tenant flag system already supports per-tenant enforcement with
  operator approval and an audit trail tied to evidence.

## 2. "Will this fit our stack?"

Ward is stack-neutral by construction. It is a standalone TypeScript
service you run as one Docker container; your application integrates
over HTTP — a base-URL change plus a tenant header — regardless of
whether you run Node, Python, Ruby, Rails, Django, Laravel, or
anything else. No SDK is required (the TypeScript SDK is optional),
and no new runtime is adopted.

- **Verify:** `docs/ARCHITECTURE.md`, `docs/EXISTING_SAAS_INTEGRATION.md`,
  `openapi/ward.v0.yaml`.
- **What would change our answer:** nothing — this is a structural fact of
  the integration model.

## 3. "Another vendor in our critical path to OpenAI."

Two honest layers to this answer:

- **Degraded fail-open is implemented and verified.** If Ward is up but
  the policy lookup fails, the default mode allows the request, marks
  it with an `x-ward-fail-open: true` header, and writes an audit
  event (fail-closed is available as an explicit overlay). The SDK
  guard likewise fails open by default and never silently. Verified by
  `npm run smoke:reliability` and `npm run smoke:sdk`.
- **Hard-down is not solved.** If the Ward proxy process or network is
  fully down, proxied traffic does not flow. That requires
  customer-side fallback routing or an HA Ward deployment; neither
  exists yet, and Ward does not claim otherwise. If this is
  disqualifying today, the cooperative SDK guard is the non-proxy
  entry point.

- **Verify:** `docs/DEPLOYMENT_MODEL.md` ("Failure behavior"),
  `docs/CLAIMS_AND_EVIDENCE.md`.
- **What would change our answer:** an HA deployment story (planned,
  blocked on durable shared state) would upgrade the hard-down answer.

## 4. "What about loops that don't call an external API?"

Proxy-only containment doesn't reach those. That is Tier 2 (SDK guard) —
see the guarantee ladder in `docs/INTEGRATION_MODEL.md`. We state this
ladder honestly rather than overclaiming Tier 1 covers everything.

- **What would change our answer:** nothing changes the structural gap;
  Tier 2 adoption by the customer is the only way to close it.

## 5. "Latency added to every LLM call."

The proxy adds one attribution/metering hop. We will benchmark and publish
the number rather than assert it away.

- **Status:** not yet measured. No number exists to publish today. The
  benchmark is a Phase 1 roadmap item (see `ROADMAP.md`).
- **What would change our answer:** a published benchmark, for both mock
  and pass-through modes.

## 6. "How is this different from an LLM gateway/rate limiter we could
build ourselves?"

A gateway limits; it doesn't model tenant state
(running/constrained/paused), doesn't give an approval workflow, and
doesn't produce an incident-shaped audit trail. Ward is the operational
layer on top of the metering, not the metering itself.

- **What would change our answer:** a published gateway that already
  models tenant state with an approval workflow and an evidence-linked
  audit trail — at that point the differentiation would need to be
  re-examined.

## 7. "Is this just Saastle relabeled?"

No. Ward is a standalone TypeScript product with no Saastle code,
import, or runtime dependency — `apps/api` is self-contained, and
every deployment mode works with zero Saastle involvement. What Ward
took from the Saastle work is design patterns and evidence discipline
(for example, the confirmation-token approval pattern, reimplemented
natively in TypeScript), recorded historically in
`docs/SAASTLE_SOURCE_MAP.md`. Saastle itself is 10via's internal
operations app and is only relevant to a future hosted Ward, behind
Ward's public APIs (`docs/SAASTLE_INTERNAL_APP_DIRECTION.md`).

- **Verify:** `docs/CLAIMS_AND_EVIDENCE.md` ("Standalone Ward app" row),
  `docs/ARCHITECTURE.md`.
- **What would change our answer:** nothing — this is a structural fact
  about the codebase, checkable by grep.

## 8. "Is the demo real or scripted?"

What is real, precisely: a real Express app
(`examples/node-express-ai-saas/`) whose only Ward-specific code is a
base URL and a tenant header; a real repeated-call loop for Globex (not
faked counters); real enforcement at the proxy (Globex 429, Acme 200);
a real approval token and audit trail. One honest caveat: the verified
demo runs against Ward's **mock upstream** by default — no external
LLM is called, and every mock response says so in its body.
Pass-through to a real provider exists behind config but is UNTESTED,
and streaming is not supported yet; we say that plainly rather than
demo it.

- **Verify:** `docs/CLAIMS_AND_EVIDENCE.md`, `docs/BUILD_STATUS.md`
  ("Failures and unverified pieces"), `scripts/smoke-demo.mjs`.
- **What would change our answer:** verified pass-through mode (a
  Phase 1 roadmap item) would remove the caveat.
