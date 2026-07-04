# Ward Objections

These are the objections we expect from an existing SaaS team evaluating
Ward. Here is the current answer to each, and what would change our
answer.

## 1. "We already have feature flags."

Flags are global or manually tenant-keyed booleans with no runtime state,
no lease/lockstep with in-flight work, and no audit trail tied to evidence.
You can build "off." You cannot cheaply build "constrained-but-alive,"
approval-gated, and audited — that is the part that gets skipped until the
incident.

- **What would change our answer:** a published case where a homegrown
  per-tenant flag system already supports lease-based cooperative
  containment, operator approval, and an audit trail tied to evidence.

## 2. "We're not on Elixir, this won't fit our stack."

You never touch Elixir. You change a base URL and add a header. The
BEAM/Elixir engine is Ward's internal implementation, the same way you
don't need to know Postgres internals to use a hosted database.

- **Verify:** `docs/ARCHITECTURE.md`, `docs/INTEGRATION_MODEL.md`.
- **What would change our answer:** nothing — this is a structural fact of
  the integration model, not a claim that could be falsified by future
  evidence.

## 3. "Another vendor in our critical path to OpenAI."

Ward fails open: if unreachable, calls pass through unmodified. Worst case
is loss of containment temporarily, not loss of availability.

- **Verify:** `docs/ARCHITECTURE.md` ("Fail-open requirement").
- **Caveat:** this must be built and verified before the claim ships — see
  `docs/CLAIMS_AND_EVIDENCE.md`. Today it is a design requirement, not a
  proven property.
- **What would change our answer:** a passing test suite that exercises
  control-plane unavailability and confirms calls pass through unmodified.

## 4. "What about loops that don't call an external API?"

Proxy-only containment doesn't reach those. That is Tier 2 (SDK guard) —
see the guarantee ladder in `docs/INTEGRATION_MODEL.md`. We state this
ladder honestly rather than overclaiming Tier 1 covers everything.

- **What would change our answer:** nothing changes the structural gap;
  Tier 2 adoption by the customer is the only way to close it.

## 5. "Latency added to every LLM call."

The proxy adds one attribution/metering hop. We will benchmark and publish
the number rather than assert it away. If it is not negligible, that is a
Week 1 finding to fix, not hide.

- **Verify:** `docs/BUILD_PLAN.md` (Week 1 deliverables).
- **Status:** not yet measured. No number exists to publish today.
- **What would change our answer:** a published benchmark from the Week 1
  proxy build.

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

No. Ward is a distinct product surface built for teams who are not on the
BEAM/Elixir runtime and will never adopt it. Ward inherits Saastle's
internal control-plane engine (see `docs/SAASTLE_SOURCE_MAP.md`) but
exposes it exclusively through an egress proxy and an SDK guard/lease
primitive — chokepoints that do not exist in Saastle today. Saastle's own
positioning ("tenant runtime control plane," BEAM-native adoption) is not
Ward's positioning.

- **Verify:** `docs/NAMING_AND_POSITIONING.md`, `docs/SAASTLE_SOURCE_MAP.md`.
- **What would change our answer:** nothing — this is a structural
  distinction in how the product is exposed to customers, not a claim
  about internal code reuse (which Ward does not hide).

## 8. "Is the demo real or scripted?"

The Ward demo commitment is a real Express app, a real broken tool causing
a real retry loop, and real OpenAI calls flowing through the proxy. This is
a stronger bar than Saastle's own M5/M6 demos, which use synthetic,
explicitly-labeled deterministic pressure signals. See
`docs/DEMO_SCRIPT.md` ("the six things that must be real").

- **What would change our answer:** if any of the six required-real
  elements in the demo script were faked, this answer would need to be
  retracted immediately, and the demo would need to be rebuilt honestly
  before further use.
