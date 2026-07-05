# Ward Build Plan (HISTORICAL — superseded)

> **Historical document.** This was the original two-week build plan,
> written when Ward intended to inherit Saastle's Elixir/BEAM engine.
> Ward was instead built as a standalone TypeScript service with no
> Saastle dependency (see `docs/ARCHITECTURE.md`), and the plan below
> was superseded by the shipped rc1 scope. Current direction lives in
> `ROADMAP.md`; current status lives in `docs/BUILD_STATUS.md` and
> `docs/CLAIMS_AND_EVIDENCE.md`. Nothing below is a current claim.

## Summary

Two-week build plan. Do not touch queue middleware, multi-node placement,
or a broader policy UI in these two weeks.

## Week 1

- Build the egress proxy: pass-through to OpenAI/Anthropic, tenant
  attribution via header (`X-Ward-Tenant`), per-tenant call/token counters
  backed by the inherited Elixir supervision core (shadow runtime per
  tenant; see `docs/SAASTLE_SOURCE_MAP.md` for the specific modules —
  `ConstrainedAIBudget`-equivalent for counters, `ToolLoopDetector`-
  equivalent for loop signals).
- Wire proxy counters into the inherited enforcement/pressure tables —
  replace any simulated signal on this one path with real metered data.
- Docker one-liner (`docker run ward`) so a design partner can stand it up
  in one command.
- Benchmark and publish proxy-added latency per call (see
  `docs/OBJECTIONS.md` #5 — do not assert this away without a number).

## Week 2

- TS SDK: add `ward.guard(tenantId, fn)` lease primitive, backed by the
  existing tenant-scoped channel push pattern (not polling) — new code, not
  a port of `packages/sdk-js` (see `docs/SAASTLE_SOURCE_MAP.md`).
- Durable audit record for the full incident lifecycle (detection ->
  evidence -> approval -> transition -> resume) — this was prototype-level
  (in-memory ETS) in the inherited engine; make this one path real and
  persistent.
- Build the scripted demo: plain Express + OpenAI app, unmodified except
  the base-URL/header integration, matching `docs/DEMO_SCRIPT.md`. All six
  required-real elements must be genuinely real, not scripted.
- Verify the fail-open behavior end to end (control plane unreachable ->
  calls pass through unmodified) before claiming it anywhere.
- Cut everything else from the surface area: hide policy/entitlement/OOM
  tables, multi-node, plugin hooks from anything a design partner sees.

## Explicitly out of scope for these two weeks

- Queue middleware (Tier 3).
- Multi-node placement.
- The cockpit's broader policy UI.
- Any vendor-specific LLM adapter beyond a generic OpenAI/Anthropic-shaped
  proxy.

## Open items to resolve before or during the build

- **Licensing.** Confirm Ward's own licensing posture independent of
  Saastle's BUSL-1.1 terms; do not assume production-use rights to the
  inherited engine without explicit confirmation.
- **Action vocabulary.** The inherited confirmation-token module's
  `@allowed_actions` is `start/stop/restart`; Ward needs `constrain/
  pause/resume` and must decide whether to extend or wrap that module.
- **Dollar-cost metering.** The inherited budget counter is call-count
  based; if the demo needs a "$ burned" figure, that is new counting logic
  layered on top, not already provided.

## Next highest-leverage step

Start the Week 1 egress proxy build: it is the wedge, it is the piece that
turns the "pressure is simulated" gap into real metered data, and every
other Ward claim (metering, containment, the demo) depends on it existing
first.
