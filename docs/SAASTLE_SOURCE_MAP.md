# Saastle Source Map

> Saastle is read-only source material for Ward. This document records, for
> each Saastle source inspected, what Ward can inherit, what claim it
> supports, and what caveat applies. Nothing in this file authorizes writing
> to the Saastle repo.

## Status vocabulary

Matches Saastle's own vocabulary (`saastle/docs/CLAIMS_AND_EVIDENCE.md`):
implemented, tested, demo-supported, prototype, preview, planned, simulated,
not claimed.

## Source-by-source

### `saastle/README.md`

- **What Ward can inherit:** the framing device (tenant as a supervised
  runtime unit) and the category discipline (never claim beyond evidence).
- **Safe claim supported:** none directly reusable — this is Saastle's own
  positioning, not Ward's.
- **Caveat:** Saastle leads with BEAM/Elixir and "tenant runtime control
  plane." Ward must not lead with either. Ward inherits the underlying
  runtime engine, not the language.
- **Status:** not claimed (for Ward).
- **Proposed Ward reuse:** use only as internal engineering reference for how
  the Saastle runtime models tenant state; do not port any of this language
  into Ward's public docs.

### `saastle/docs/TERMINOLOGY.md`

- **What Ward can inherit:** the discipline of maintaining a canonical
  naming hierarchy and a preferred-terms table.
- **Safe claim supported:** none directly.
- **Caveat:** Saastle's naming hierarchy (Tenvia -> Saastle -> Control
  Room/PDK) does not apply to Ward. Ward needs its own hierarchy — see
  `docs/NAMING_AND_POSITIONING.md`.
- **Status:** not claimed.
- **Proposed Ward reuse:** methodology only (a terminology document with a
  preferred/avoid table), not content.

### `saastle/docs/CATEGORY_POSITIONING.md`

- **What Ward can inherit:** the "wedge now / expansion later" structure,
  and the demo narrative shape (two tenants, one degrades, one stays
  healthy, operator approves, audit trail).
- **Safe claim supported:** the general shape of "isolate, constrain,
  recover, audit" as an operator promise — reworded for Ward's existing-SaaS
  angle (pause/throttle/recover one tenant's AI agents).
- **Caveat:** Saastle's category is "tenant runtime control plane" and leads
  with BEAM adoption. Ward's category is narrower and must not require BEAM
  adoption by the customer. Do not reuse "tenant runtime control plane" as
  Ward's category name.
- **Status:** not claimed for Ward's category; doctrine-only reuse.
- **Proposed Ward reuse:** demo structure in `docs/DEMO_SCRIPT.md`; explicit
  divergence documented in `docs/NAMING_AND_POSITIONING.md`.

### `saastle/docs/MESSAGING_GUIDE.md`

- **What Ward can inherit:** the "approved phrases / phrases to avoid"
  table pattern, and the demo line convention ("X degraded, Y stayed
  healthy").
- **Safe claim supported:** the pattern for Ward's own demo line ("Globex
  was contained. Acme never blipped.").
- **Caveat:** every approved Saastle phrase ("tenant runtime control plane,"
  "runtime pressure," "backpressure policy," "blast radius") is Saastle
  category language, not Ward language. Ward's approved/avoid list is
  independent — see `docs/NAMING_AND_POSITIONING.md`.
- **Status:** not claimed.
- **Proposed Ward reuse:** structural template only.

### `saastle/docs/PRODUCT_OVERVIEW.md`

- **What Ward can inherit:** the concrete list of what exists today
  (pressure telemetry, constrained-mode state machine, operator
  recommendation, confirmation-token approval, prototype audit, recovery
  seam) — this is the actual internal engine Ward's control plane sits on.
- **Safe claim supported:** "the underlying containment primitives
  (pressure detection, constrained-mode transition, operator approval,
  audit, recovery) exist as lab/preview-grade Elixir modules" — internal
  engineering fact, not a Ward product claim until wired to Ward's own
  proxy/SDK.
- **Caveat:** every item is labeled Simulated, Preview, or Prototype in
  Saastle. None of it is production-grade. Ward inherits the mechanism, not
  the maturity.
- **Status:** prototype / preview / simulated (inherited as-is).
- **Proposed Ward reuse:** `TenantState.transition/2`,
  `OperatorRecommendation.recommend/2`, `RuntimeControl.issue_confirmation/4`
  + `consume/5`, `Audit.log_operation/1` are the concrete modules Ward's
  control plane should call into for tenant state, recommendation, approval,
  and audit. Document this mapping in `docs/ARCHITECTURE.md`.

### `saastle/docs/PUBLIC_PREVIEW_OVERVIEW.md`

- **What Ward can inherit:** the "what is NOT here" honesty pattern and the
  claims-ledger cross-reference discipline.
- **Safe claim supported:** none new; reinforces that M5/M6 proofs are lab
  demonstrations, not production guarantees — directly relevant to Ward's
  own claim discipline since Ward's control plane depends on this engine.
  M5 pressure signal is `simulated: true`. M6 AI-loop containment uses a
  deterministic synthetic loop with no external LLM.
- **Caveat:** BUSL-1.1 license, no production use grant. Ward as a
  standalone product must clarify its own licensing independent of
  Saastle's; do not assume Ward inherits production rights to Saastle code
  without explicit confirmation.
- **Status:** demo-supported (M5, M6); not claimed (production readiness).
- **Proposed Ward reuse:** `docs/CLAIMS_AND_EVIDENCE.md` (Ward's own)
  mirrors this ledger discipline; `docs/BUILD_PLAN.md` notes the licensing
  question as an open item.

### `saastle/docs/CLAIMS_AND_EVIDENCE.md`

- **What Ward can inherit:** the entire claims-ledger methodology (status
  vocabulary, claim-to-evidence mapping, claim rewrite rules) — directly,
  as a practice to run for Ward itself.
- **Safe claim supported:** specific rows are directly relevant —
  "Server-mediated operator controls" (implemented), "Confirmation token
  flow" (implemented), "TenantState constrained mode" (tested),
  "AI tool-loop containment" (demo-supported, medium risk), "Audit log
  durability" (prototype, in-memory ETS, lost on restart — high relevance
  for Ward's audit-trail claim).
- **Caveat:** "Audit log durability" is explicitly in-memory only. Ward
  cannot claim a durable audit trail until this is replaced with persistent
  storage. "Multi-node placement" is planned/high-risk — Ward must not
  imply multi-node support.
- **Status:** mixed — see rows above.
- **Proposed Ward reuse:** build `docs/CLAIMS_AND_EVIDENCE.md` (Ward's own)
  using this exact status vocabulary; explicitly inherit the "Audit log
  durability: prototype, in-memory" caveat until Ward's own persistence
  ships (Week 2 of the build plan).

### `saastle/docs/TECHNICAL_OBJECTIONS.md`

- **What Ward can inherit:** the objection-and-answer format, and objection
  #4 ("is the M5 proof real production isolation? No — simulated lab
  demonstration") which Ward must carry forward honestly since Ward's
  control plane sits on the same lab-grade primitives.
- **Safe claim supported:** the pattern for Ward's own `docs/OBJECTIONS.md`.
- **Caveat:** objection #2 ("why BEAM and not X") is Saastle-specific and
  inverted for Ward — Ward's objection is "why should I trust a system with
  BEAM inside it if I don't run BEAM," answered by "you never touch it."
- **Status:** not claimed (methodology only).
- **Proposed Ward reuse:** `docs/OBJECTIONS.md` structure and the "what
  would change our answer" discipline.

### `saastle/docs/DEMO_SCRIPT.md`

- **What Ward can inherit:** the two-tenant (Acme/Globex) demo narrative
  shape, the operator-approval-with-confirmation-token flow, the recovery
  step, and the requirement to narrate simulation labels out loud.
- **Safe claim supported:** Ward's own demo script (`docs/DEMO_SCRIPT.md`)
  follows the same eight-step shape: healthy baseline -> trigger -> identify
  source -> show isolation -> recommend -> approve -> audit -> recover.
- **Caveat:** Saastle's demo uses `WorkflowPressureLab` (synthetic
  queue-depth escalation) and `AILoopPressureLab` (synthetic 12-call tool
  loop, no external LLM). Ward's demo must use a real Express app with real
  OpenAI calls hitting Ward's proxy — this is a materially stronger
  evidence bar than what Saastle's own demo currently claims. Do not import
  Saastle's "simulated: true" framing into Ward's demo if Ward's demo uses
  real traffic; state plainly which parts of Ward's demo are real (the
  Express app, the retry loop, the proxy metering) and which parts, if any,
  remain lab-only (the underlying Elixir control-plane internals).
- **Status:** demo-supported (Saastle's own M5/M6); Ward's version is
  planned until built.
- **Proposed Ward reuse:** narrative shape and required-narration-caveats
  discipline in `docs/DEMO_SCRIPT.md`.

### `saastle/docs/DEMO_CONTRACT.md`

- **What Ward can inherit:** the envelope/event contract discipline
  (typed events, correlation IDs, explicit "simulated vs real" table per
  behavior) and the server-only vs. browser-safe action split — this maps
  directly onto Ward's proxy (server-mediated) vs. SDK guard (app-mediated)
  split.
- **Safe claim supported:** "privileged actions require server-mediated
  confirmation; the browser/app never holds a privileged control token" —
  reusable almost verbatim for Ward's proxy/SDK guarantee ladder.
- **Caveat:** this contract is written for Saastle's own Phoenix Channel
  and cockpit; none of the channel topics or envelope shapes are Ward's
  API. Ward's public contract (egress proxy headers, SDK lease shape) is
  new and must be documented independently in
  `docs/INTEGRATION_MODEL.md`.
- **Status:** implemented (Saastle's own channel contract); not claimed
  (as a Ward API).
- **Proposed Ward reuse:** the operator-approval confirmation-token pattern
  (`RuntimeControl.issue_confirmation/4` + `consume/5`) is the direct
  backing primitive for Ward's "approve Constrain" demo step.

### `saastle/docs/ai_runtime_safety_proof.md` (M6 design spec)

- **What Ward can inherit:** the exact set of AI-loop pressure signals
  (`tool_call_count`, `loop_depth`, `budget_remaining`,
  `confirmation_lag_ms`, `tool_revisit_detected`) and the detector/budget
  module design — these are the closest existing analog to what Ward's
  proxy needs to compute for a tenant's outbound LLM/tool traffic.
- **Safe claim supported:** "the tenant-scoped loop-detection signal model
  exists as a tested pure-function detector" (`ToolLoopDetector.detect/2`)
  and "a per-tenant budget counter exists" (`ConstrainedAIBudget`) — both
  reusable as Ward's internal metering logic once wired to real proxy
  traffic instead of a synthetic plugin.
- **Caveat:** explicitly non-goals in M6: no external LLM integration, no
  vendor-specific tool-call format, no production-grade budget enforcement
  (per-node, in-memory only), no multi-node semantics. Ward's Tier 1 proxy
  is exactly the work M6 calls "future proof extension: external LLM
  adapter" — mapping a real vendor's tool-call trace to this envelope
  shape. This is greenfield work for Ward, not something to claim as done.
- **Status:** prototype (detector, budget) / demo-supported (lab proof) /
  explicitly not implemented (real LLM integration, production budget).
- **Proposed Ward reuse:** `docs/ARCHITECTURE.md` names
  `ToolLoopDetector`-equivalent logic and `ConstrainedAIBudget`-equivalent
  logic as the internal signal/budget model the Ward proxy feeds; the real
  LLM-adapter work becomes Ward's own Week 1 proxy build, not a Saastle
  inheritance.

### `saastle/packages/sdk-js/README.md`, `src/admin.ts`, `src/ai.ts`, `src/types.ts`

- **What Ward can inherit:** the client/admin-client split pattern
  (`SaastleRuntime` observation-only client vs. `RuntimeAdminClient`
  privileged operator client with HTTP Basic Auth + confirmation token +
  echoed phrase), and the stability-label convention (`@stable` /
  `@preview`).
- **Safe claim supported:** "operator lifecycle actions require a
  server-issued, single-use, short-lived confirmation token that the
  browser never holds" (implemented, tested per Saastle's own claims
  ledger) — this is the direct model for Ward's "operator approves
  Constrain" step and for Ward's own guarantee that the SDK never holds a
  privileged control credential.
- **Caveat:** this is a Phoenix Channel / WebSocket client for Saastle's
  own runtime, not a proxy client and not an LLM-call-wrapping client.
  Ward's TypeScript SDK (Tier 2, `ward.guard(tenantId, fn)`) is new code
  with a different shape (a lease primitive around a function call, not a
  channel subscription). Do not imply the existing `sdk-js` package is
  reusable as Ward's SDK without a rewrite.
- **Status:** implemented/tested (Saastle's own SDK); not claimed (as
  Ward's SDK).
- **Proposed Ward reuse:** confirmation-token pattern documented in
  `docs/ARCHITECTURE.md` as the backing mechanism for operator approval;
  Ward's own SDK is scoped fresh in `docs/INTEGRATION_MODEL.md` and
  `docs/BUILD_PLAN.md`.

### `saastle/apps/saastle/lib/saastle_runtime/admin/runtime_control.ex`

- **What Ward can inherit:** the confirmation-token issue/consume design
  (ETS-backed, single-use, 60-second TTL, phrase-echo, tenant/runtime/action
  binding) as the concrete implementation Ward's operator-approval step can
  call into directly, since Ward's control plane is built on this same
  Elixir engine.
- **Safe claim supported:** "every containment action is approved through a
  single-use, time-limited, server-issued confirmation token" — implemented
  and directly reusable by Ward without modification, once Ward's cockpit
  issues confirmations scoped to Ward's own tenant/action vocabulary
  (constrain/pause/resume rather than start/stop/restart).
- **Caveat:** `@allowed_actions` is currently `~w(start stop restart)a` —
  Ward needs its own action vocabulary (`constrain`, `pause`, `resume`) and
  either extends this module or wraps it; this is not automatic.
- **Status:** implemented, tested (Saastle's own claims ledger, "low" risk).
- **Proposed Ward reuse:** `docs/ARCHITECTURE.md` names this module as the
  backing engine for Ward's approval step; `docs/BUILD_PLAN.md` notes the
  action-vocabulary extension as required work.

### `saastle/apps/saastle/lib/saastle_runtime/telemetry/ai_loop_pressure_lab.ex`

- **What Ward can inherit:** the lab-module shape (`run/0`,
  `run_for_tenant/1`, `stop/0`, `state/0`) as a pattern for how Ward's own
  demo fixture (Globex's broken-tool retry loop) could be scripted
  deterministically for repeatable demo runs, if Ward chooses a scripted
  fallback path.
- **Safe claim supported:** none for the primary demo — Ward's demo
  commitment (per direction from the user) is a **real** Express app hitting
  a **real** broken tool, not a synthetic lab loop. This module is a
  fallback/rehearsal reference only.
- **Caveat:** this lab is explicitly synthetic and deterministic
  (`simulated: true`, `data_origin: :simulated`), and its acceptance
  criteria depend on `Recover.recover_demo_state/0` being called between
  runs or the demo silently produces a false "no action" result. If Ward
  ever uses a similar scripted fallback for rehearsal, the same sequencing
  trap applies and must be documented.
- **Status:** demo-supported (Saastle's own M6 lab).
- **Proposed Ward reuse:** rehearsal/fallback reference in
  `docs/DEMO_SCRIPT.md`; not the primary demo path.

### `saastle/apps/saastle/lib/saastle_runtime/plugins/synthetic_globex_ai_loop.ex`

- **What Ward can inherit:** confirmation that a "real plugin behavior,
  synthetic content" pattern exists in Saastle (a real `Plugin` behaviour
  implementation emitting synthetic tool-call envelopes) — useful only as
  an engineering reference for how to build a deterministic rehearsal
  fixture if Ward ever needs one.
- **Safe claim supported:** none for Ward's public claims.
- **Caveat:** explicitly a demo fixture with fixed `loop_threshold` (5) and
  `loop_strategy` (`:constrained`), not runtime-configurable. Never imply
  this is a production AI-loop detector.
- **Status:** demo-supported (lab-only).
- **Proposed Ward reuse:** none directly; informs Ward's own synthetic
  broken-tool fixture design if a scripted fallback is later needed.

### `saastle/apps/saastle/lib/saastle_runtime/ai/tool_loop_detector.ex`

- **What Ward can inherit:** the exact algorithm for computing
  `tool_call_count`, `loop_depth`, `tool_revisit_detected`, and
  `confirmation_lag_ms` from a stream of tool-call envelopes — a pure,
  tested, deterministic function Ward's proxy can call directly once real
  proxy traffic is mapped into the same envelope shape
  (`type, event_id, tenant_id, runtime, correlation_id, timestamp, data`).
- **Safe claim supported:** "the containment engine can compute
  loop-shaped pressure signals from a tool-call stream" (prototype-grade,
  pure function, testable in isolation) — this is the strongest, most
  directly reusable piece of Saastle code for Ward's proxy metering logic.
- **Caveat:** it is a pure function with no wiring to real LLM/tool traffic
  yet. Building the adapter that maps OpenAI/Anthropic API calls into this
  envelope shape is new Ward work (Tier 1 proxy, Week 1).
- **Status:** prototype, unit-tested (per Saastle's own module doc); not
  wired to any real LLM traffic.
- **Proposed Ward reuse:** `docs/ARCHITECTURE.md` names this detector as
  the internal signal engine behind Ward's per-tenant call/loop counters;
  `docs/BUILD_PLAN.md` Week 1 scopes the adapter that feeds it real proxy
  events.

### `saastle/apps/saastle/lib/saastle_runtime/ai/constrained_ai_budget.ex`

- **What Ward can inherit:** the per-tenant ETS-backed budget-counter
  design (`configure/2`, `check/2`, `remaining/1`, `reset/1`) as the direct
  backing store for Ward's per-tenant spend/call metering.
- **Safe claim supported:** "per-tenant call-count budgets can be
  configured, checked, and reset" (implemented, in-memory) — reusable
  as-is for Ward's Tier 1 proxy counters, with the explicit caveat below.
- **Caveat:** budget unit is tool calls, not dollars or tokens (an explicit
  design decision in Saastle's M6 spec). If Ward wants dollar-denominated
  spend metering for the demo ("$ burned"), that is new counting logic on
  top of this module, not something this module already provides. Also:
  per-node only, no multi-node semantics — do not claim multi-node budget
  consistency.
- **Status:** implemented (in-memory, per-node).
- **Proposed Ward reuse:** direct reuse as the call-count budget backing
  store; dollar-cost metering is new Ward-side work layered on top.

### `saastle/examples/tenant_runtime_cockpit/`

- **What Ward can inherit:** the cockpit-as-operator-surface pattern
  (pressure panel, recommended action, confirmation-token approval flow,
  audit entry display) as UI/UX reference for Ward's own operator cockpit.
- **Safe claim supported:** none directly — this is Saastle's own React
  app for Saastle's own tenant model, not a Ward UI.
- **Caveat:** wired to Saastle's Phoenix Channel and admin routes; not
  reusable as Ward's frontend without substantial rework to point at Ward's
  own proxy/control-plane API.
- **Status:** tested (Saastle's own claims ledger, 98 tests).
- **Proposed Ward reuse:** UX reference only, cited in
  `docs/ARCHITECTURE.md` and `docs/BUILD_PLAN.md` as prior art for the
  Ward cockpit, not as code to lift directly.

## Summary of what Ward inherits vs. builds fresh

| Layer | Inherited from Saastle | Built fresh for Ward |
| --- | --- | --- |
| Tenant state machine (running/constrained/paused/recovering) | `TenantState.transition/2` pattern | Ward's own state vocabulary and transitions |
| Operator approval | `RuntimeControl.issue_confirmation/4` + `consume/5` | Ward action vocabulary (constrain/pause/resume) |
| Audit trail | `Audit.log_operation/1` pattern (in-memory, prototype) | Durable persistence (Ward Week 2 commitment) |
| Loop/pressure signal detection | `ToolLoopDetector.detect/2` algorithm | Adapter mapping real OpenAI/Anthropic traffic into the envelope shape |
| Per-tenant budget counter | `ConstrainedAIBudget` (call-count based) | Dollar-cost metering layered on top |
| Egress proxy | none — does not exist in Saastle | Ward Tier 1, built from scratch, Week 1 |
| SDK guard/lease primitive | `sdk-js` client/admin-client split pattern (conceptual only) | Ward Tier 2 `ward.guard(tenantId, fn)`, new code, Week 2 |
| Demo | Acme/Globex two-tenant narrative shape | Real Express app + real OpenAI calls, not a synthetic lab loop |
