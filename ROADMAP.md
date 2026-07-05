# Ward Roadmap

**Pause one customer's AI agents. Everyone else keeps running.**

Ward owns tenant incident containment for agentic SaaS: an
OpenAI-compatible egress proxy plus a tenant control plane. When one
customer's agent goes sideways, an operator constrains or pauses that
one tenant — with an approval step and an audit receipt — while every
other tenant keeps running.

The wedge is the triad no adjacent tool provides together: **tenant
state + operator approval + containment receipt** at an enforcement
chokepoint.

This roadmap is honest by policy. Every item is labeled **shipped**
(verified — see [docs/CLAIMS_AND_EVIDENCE.md](docs/CLAIMS_AND_EVIDENCE.md)),
**in progress**, or **planned** (not built; do not assume it exists).
Ward is a prototype. It is not production-ready, and this document does
not claim otherwise.

## What Ward is (and refuses to become)

Ward is the containment layer that sits over your existing stack. It is
not:

- an AI gateway (keep LiteLLM/Portkey/Cloudflare — Ward adds the
  per-tenant containment decision and the operator loop)
- an observability platform (keep Langfuse/LangSmith — Ward acts on
  evidence; it does not try to be the place you browse traces)
- an agent framework or workflow runtime (keep LangGraph/Temporal —
  Ward guards the tenant boundary around them)
- a token optimizer or model-cost tuning proxy (Ward's long-term
  request-shaping direction is tenant-first containment with evidence,
  never generic payload optimization — see Long-term capabilities)

The scope test for every feature: **does it help an operator contain one
tenant faster, with better evidence, and prove it afterward?** If not, it
does not ship.

## Phase 0 — rc1 publish (now)

Goal: turn "credible evaluation" into "installable product."

- [x] Choose and commit a license (Apache-2.0, SPDX `Apache-2.0` —
      LICENSE + manifest fields added 2026-07-05)
- [x] Re-cut `v0.1.0-rc1` at the intended commit and execute the first
      GHCR publish per [docs/PUBLISH_READINESS.md](docs/PUBLISH_READINESS.md)
      (published 2026-07-05: `ghcr.io/tenvia/ward-api:v0.1.0-rc1`,
      public, amd64+arm64)
- [x] Verify the pull path (`docker-compose.pull.yml`) end to end,
      including anonymous pull (verified 2026-07-05: pull, boot,
      containment flow, control auth, persistence across restart)
- [x] Reconcile stale docs (removed leftover inherited-runtime framing;
      aligned ARCHITECTURE.md, OBJECTIONS.md, PRODUCT_SPINE.md, and
      INTEGRATION_MODEL.md with the claims ledger — 2026-07-05)

## Phase 1 — design-partner proof (v0.2)

Goal: 3–5 design partners running Ward against real traffic in staging.
Honest status (2026-07-05, ninth session): the data-plane blockers
below are addressed by `prototype, demo-supported` claims with
repeatable local verification; the remaining partner-ready gate is
*not* cleared (see `docs/CLAIMS_AND_EVIDENCE.md` for the exact
ledger row text).

- [x] **Streaming (SSE) for `/v1/chat/completions`** — deterministic
      mock SSE only; enforcement completes before SSE headers flush.
      Pass-through streaming is not yet supported.
- [x] **Mock pass-through verification** — `forwardToUpstream` exercised
      against a local mock upstream; live provider compatibility is not
      claimed.
- [x] **Observe-only mode** — `WARD_MODE=observe|enforce`.
      Otherwise-valid proxied traffic is not blocked while emitting
      `x-ward-would-block` and a `would_block` audit event. Malformed
      requests, missing tenant headers, configured fail-closed paths,
      and upstream errors are still enforced.
- [x] **Local latency benchmark** — `npm run bench:latency` reports
      p50/p95 with environment context on this dev machine. Production
      SLA, provider-wide overhead, and generalization are not claimed.
- [ ] Design-partner feedback loop (issue template + weekly triage) —
      not started
- [ ] **Partner-ready gate** — not cleared. Outstanding: pass-through
      streaming against a real provider, live-provider latency, the
      design-partner feedback loop, and Phase 2 receipts.

## Phase 2 — the incident wedge (v0.3)

Goal: make Ward the artifact of record for tenant-level AI incidents.

- [ ] **Incidents** — group detections, approvals, transitions, and
      blocks into a first-class incident with a timeline in the Control
      Room
- [~] **Containment receipts** — an exportable, self-contained record of
      one incident (what was detected, who approved, what was contained,
      when it resumed, what never blipped) that support can hand to the
      affected customer. RC3 shipped a Markdown exporter from Ward's
      SQLite audit (see `docs/CLAIMS_AND_EVIDENCE.md` RC3 prototype rows,
      `npm run incident:export`); the receipts are operational evidence,
      not legal/compliance certification, and are not tamper-proof.
      Phase 2 expands to versioned schema, signing, and a designed
      narrative pack; design-partner feedback still needed.
- [ ] **Notification webhooks** — pressure detected / containment applied
      / tenant resumed, so the on-call loop starts where operators
      already live (Slack, PagerDuty via webhook first)

## Phase 3 — production-shaped control plane (v0.4–v0.6)

Goal: remove the "prototype" caveats that block a real deployment.

- [ ] Postgres storage backend (tenant state, audit, approvals, runs)
- [ ] Real cost/token metering from pass-through usage (replaces the
      fixed per-call estimate)
- [ ] Budget-based constrained mode (requests/tokens per window, not a
      blanket 429)
- [ ] Per-operator API keys and roles (replaces the shared token)
- [ ] Multi-replica API against shared state; documented HA and
      hard-down posture
- [ ] Audit retention and export

## Phase 4 — integrations (v0.7)

Ward sits beside the tools teams already run. Planned, none built:

- [ ] LiteLLM callback/middleware (Ward decision + report without
      re-proxying)
- [ ] Trace links (Langfuse/LangSmith IDs in audit evidence, deep links
      in receipts)
- [ ] Anthropic-compatible egress endpoint
- [ ] Temporal interceptor example; queue middleware (BullMQ first)

## Phase 5 — runtime containment (v0.8+)

- [ ] Kubernetes reference deployment (manifests, NetworkPolicy that
      forces agent egress through Ward — see
      [docs/KUBERNETES_PLAN.md](docs/KUBERNETES_PLAN.md))
- [ ] Production Docker runner; Kubernetes Job runner with mid-run
      revocation

## Phase 6 — hosted (not before the above)

Hosted Ward is deliberately last. It requires durable state, real auth,
real metering, and HA — all of Phase 3 — plus commercial proof from
self-hosted design partners.

## Long-term capabilities (all planned — direction, not commitment)

Everything in this section is **planned**: none of it exists, none of
it starts before the phases above deliver their proof, and none of it
may be claimed as a current Ward capability. Each item passed the
wedge test — it helps an operator contain one tenant faster, safer,
or with better evidence; it starts observe-only or integration-first;
and Ward can prove it with tests, smokes, or receipts.

### Request Shaping / Cost Containment (planned)

Request Shaping / Cost Containment is a long-term Ward capability
inspired by the broader proxy pattern: observe AI traffic, measure
tenant-level pressure, and create evidence before taking action.
Ward's version must be tenant-first and incident-first. It begins in
observe-only mode — showing what Ward *would have* shaped, throttled,
or contained — and graduates to conservative per-tenant enforcement
only after design-partner validation. Ward will not become a generic
token optimizer or a model-specific compression proxy.

- **Why it belongs:** cost pressure is a tenant incident in slow
  motion. The operator who can pause a looping tenant should also be
  able to see — and eventually bound — one tenant's runaway spend,
  with the same approval discipline and the same receipt.
- **Operator problem:** "one customer's agents are burning 40× their
  normal spend; today my choices are watch or pause."
- **Phase placement:** long-term, after the near-term essentials:
  Phase 1 observe-only + verified pass-through, Phase 2 receipts,
  Phase 3 real metering/budgets/RBAC, and Phase 4 integration proof.
  It must not jump ahead of streaming, pass-through, observe-only,
  incidents/receipts, durable storage/RBAC, or integrations.
- **First safe version:** observe-only counterfactual reporting per
  tenant — no request rewriting, no throttling, no default production
  enforcement. The first useful artifact is "Ward would have shaped /
  throttled / contained this tenant here" attached to audit evidence
  and receipts.
- **Prerequisites (build first):** observe-only mode (Phase 1), real
  token/cost metering from pass-through usage (Phase 3 — the current
  `estimatedSpend` fake rate cannot support any of this), budget-based
  constrained mode (Phase 3), receipts (Phase 2).
- **Stage 1 — observe (no enforcement):** per-tenant cost/pressure
  measurement over real usage, including a composite tenant pressure
  signal (request rate, spend rate, loop indicators) used as a
  decision input — not an analytics product; would-have-shaped /
  would-have-throttled evidence in audit events and receipts;
  counterfactual summaries per tenant ("under budget X, this incident
  would have been bounded at $Y").
- **Stage 2 — conservative enforcement (post design-partner
  validation):** per-tenant budgets and throttles behind the existing
  approval flow; per-tenant model/provider allowlists **as a
  containment action during an incident** (constrain a tenant to a
  cheaper model), never as a general routing feature; the kill switch
  remains the existing pause primitive.
- **Do not build:** request rewriting or payload transformation of any
  kind in Stage 1; silent transformation in any stage (every shaping
  action is headered, audited, and receipted); token/prompt
  optimization; image/media compression; model-first routing rules;
  enforcement on by default.
- **Evidence that proves it:** smokes asserting observe-mode
  neutrality (responses byte-identical to no-Ward behavior) plus
  would-have-shaped audit events; metering validated against provider
  usage fields; a design partner citing a would-have-contained report
  in a real cost incident.
- **Claims:** "cost containment", "budget enforcement", and "request
  shaping" remain **planned** in every doc until the ledger has
  evidence rows; Stage 2 claims additionally require named
  design-partner validation.

### Containment drills & policy replay (planned)

"What would Ward have done?" — run recorded or synthetic tenant
traffic against current policies and produce a would-have-contained
report; run scheduled containment drills (a deliberate Acme/Globex
exercise against staging) that produce receipts.

- **Why it belongs:** drills and replay strengthen Ward's proof loop:
  tenant state + operator approval + containment receipt, exercised
  before a real incident.
- **Operator problem:** operators don't trust a containment lever
  they've never pulled; buyers don't trust a claim without their own
  data. Replay converts a week of shadow traffic into "Ward would have
  contained tenant X at 14:02 Tuesday."
- **Phase placement:** after Phase 1 observe-only and Phase 2 receipts.
  It is proof infrastructure for the incident wedge, not a replacement
  for the Phase 1 data-plane blockers.
- **First safe version:** offline policy replay over Ward's own audit
  evidence and demo/staging traffic, producing a would-have-contained
  report only. No production traffic capture outside Ward's existing
  evidence, and no automatic enforcement.
- **Build first:** observe-only mode (Phase 1) and receipts (Phase 2) —
  replay is those two composed over history; drills need nothing new
  beyond a scripted scenario harness (the smoke battery is the seed).
- **Do not build:** a load-testing product, traffic capture/storage
  beyond Ward's own audit evidence, or replay against production
  tenants without explicit operator action.
- **Evidence:** a replay report generated from recorded demo traffic in
  the battery; a drill producing a valid receipt end to end.
- **Claims:** planned; no "simulation" or "replay" claim ships before a
  battery-verified report exists.

### Receipt standard & tamper-evidence (planned)

A versioned, documented receipt schema (the incident receipt from
Phase 2, hardened into a stable format others can consume) with
optional signing for tamper-evidence, and a post-incident customer
evidence pack (receipt + narrative) as its packaging.

- **Why it belongs:** the receipt is Ward's category artifact; a stable,
  verifiable format is what lets support hand it to a customer, a
  postmortem cite it, and integrations consume it without reverse
  engineering. Signing answers "how do I know this wasn't edited?"
- **Operator/user problem:** support and incident commanders need a
  portable, customer-safe record of what was detected, who approved
  containment, what was blocked, when service resumed, and what other
  tenants did not feel.
- **Phase placement:** after Phase 2 receipts exist and have design-
  partner usage. Signing and tamper-evidence come after the basic
  receipt proves useful.
- **First safe version:** versioned JSON receipt schema + conformance
  check over exported receipts, unsigned. Signing is a later hardening
  step with verification tooling.
- **Build first:** Phase 2 receipts shipped and used by a design
  partner; schema stabilized from real usage, THEN versioned and
  signed — not speculatively.
- **Do not build:** blockchain anything; compliance-framework claims
  (SOC2/audit-grade language stays forbidden until retention/export
  and a real compliance posture exist); a receipt format standards
  body of one.
- **Evidence:** schema doc + conformance checks in the battery;
  signature verification in a smoke; a partner sharing a receipt with
  a real end customer.
- **Claims:** planned; "tamper-evident" may not be used until signing
  ships with verification tooling.

### Enforcement-point abstraction / gateway-carried enforcement (planned)

The Phase 4 integrations, matured into a principle: any enforcement
point — Ward's proxy, a gateway plugin (LiteLLM first), the SDK guard,
queue middleware, K8s NetworkPolicy — can carry Ward's tenant
decision, with one state model, one approval flow, one receipt.

- **Why it belongs:** teams already running a gateway shouldn't need a
  second hop to get containment; Ward's moat is the decision + receipt,
  not the hop.
- **Operator problem:** "we already use LiteLLM/Portkey/Cloudflare or a
  queue/workflow system; can Ward give us the tenant decision and
  receipt without replacing that tool?"
- **Phase placement:** Phase 4+ only. It follows the first deep
  integration and must not become a broad plugin marketplace or a
  gateway replacement.
- **First safe version:** one gateway-carried enforcement example
  (LiteLLM first) that asks Ward for the tenant decision, honors the
  response, reports correlation evidence back, and produces the same
  receipt shape as proxy enforcement.
- **Build first:** the Phase 4 LiteLLM callback shipped deeply
  (example + smoke + ledger row) before any abstraction is designed —
  abstract from two working enforcement points, never from zero.
- **Do not build:** Ward-branded forks of gateways; enforcement points
  Ward must operate itself inside someone else's infrastructure; a
  plugin marketplace.
- **Evidence:** the same containment scenario passing through two
  different enforcement points with equivalent receipts (guarantee
  ladder strength honestly labeled per point).
- **Claims:** planned; per-integration claims stay planned until each
  has an example + smoke.

### Hard-down survival patterns (planned)

Documented, tested reference patterns for the one failure Ward cannot
absorb today: the Ward process/network fully down. Customer-side
fallback routing recipes (bypass-to-provider with loss-of-containment
alarms), HA deployment shapes (post-Phase 3 durable state), and a
documented failover runbook (runbook-verified once Phase 3 durable
state ships).

- **Why it belongs:** "another vendor in our critical path" is the top
  objection (docs/OBJECTIONS.md #3) and today's answer is honest but
  thin. Turning it into tested patterns converts Ward's biggest
  adoption blocker into an engineering artifact.
- **Operator problem:** on-call needs a documented choice when Ward is
  unreachable: preserve customer traffic with explicit loss-of-
  containment evidence, or fail closed by policy.
- **Phase placement:** after Phase 3 durable shared state for HA
  patterns; customer-side bypass recipes can be designed earlier but
  stay documented patterns until smokes prove them.
- **First safe version:** an operator-controlled, runbook-verified
  customer-side fallback pattern that bypasses Ward only when Ward is
  hard-down, raises a loss-of-containment alarm, and records the
  evidence. No autonomous retry/reroute loop, and no claim of HA or
  transparent survival until the smoke proves it.
- **Build first:** Phase 3 durable shared state (HA is blocked on it);
  the degraded fail-open story stays the verified base layer.
- **Do not build:** claims that Ward "cannot go down"; load balancers
  or service meshes of our own; anything that blurs degraded fail-open
  into hard-down survival (the three-layer honesty in
  docs/ARCHITECTURE.md stands).
- **Evidence:** a failover smoke (kill the API mid-traffic, assert the
  documented fallback path carries traffic and raises the alarm); an
  HA deployment passing the containment sequence during a
  single-replica kill.
- **Claims:** hard-down survival remains **not claimed** until that
  smoke exists and passes; "planned" until then, exactly as the ledger
  says today.

### Do not build (any phase, without explicit strategy change)

Token/prompt optimization; payload or image compression; silent
request transformation; model-first routing or general model
allowlists outside an incident action; trace browsing/analytics
dashboards; agent orchestration; a plugin marketplace; generic AI
governance/compliance suites; security scanning. These fail the wedge
test by construction — they compete head-on with adjacent tools and
none of them helps an operator contain one tenant with better
evidence.

## Long-term candidates / parking lot

Interesting, but failing at least one wedge-test question today.
Revisit when the trigger fires; do not schedule before.

- **Provider/model risk policies (governance version)** — per-tenant
  model allowlists as standing governance drifts into gateway/policy
  territory (test 3). The incident-action version lives inside Request
  Shaping Stage 2. Trigger: two design partners ask for standing
  policies with containment semantics.
- **SIEM/webhook export of receipts and audit** — evidence advantage is
  real, but demand is enterprise-shaped, not 10–100-person-SaaS-shaped
  (test 6). Phase 2 webhooks + Phase 3 retention/export are the
  foundations. Trigger: a design partner's security team asks.
- **Control Room on-call mode** — a focused 2 a.m. view is polish on
  the Phase 2 incident timeline, not a distinct capability (test 2).
  Fold good ideas into timeline work as they prove out.
- **Integration certification matrix** — a process artifact with no
  containment advantage until several integrations exist (tests 1 and
  6). Trigger: three shipped integrations.
- **Tenant containment readiness check / score** — grading customers'
  readiness is consulting dressed as product; no receipt, decision, or
  enforcement advantage (test 2). Prior strategy review reached the
  same verdict.
- **Post-incident customer evidence pack** — folded into the receipt
  standard above as its packaging; not a separate item.

## Verification discipline

Nothing on this roadmap gets marked shipped without evidence: a smoke
test, an E2E, or a runbook-verified procedure, recorded in
[docs/CLAIMS_AND_EVIDENCE.md](docs/CLAIMS_AND_EVIDENCE.md) and
[docs/BUILD_STATUS.md](docs/BUILD_STATUS.md). If you catch this repo
claiming something it cannot prove, that is a bug — file it.
