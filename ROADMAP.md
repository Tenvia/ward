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

The scope test for every feature: **does it help an operator contain one
tenant faster, with better evidence, and prove it afterward?** If not, it
does not ship.

## Phase 0 — rc1 publish (now)

Goal: turn "credible evaluation" into "installable product."

- [ ] Choose and commit a license (blocks all adoption; the repo has no
      license file today)
- [ ] Re-cut `v0.1.0-rc1` at the intended commit (the local tag
      currently points behind HEAD) and execute the first GHCR publish
      per [docs/PUBLISH_READINESS.md](docs/PUBLISH_READINESS.md)
- [ ] Verify the pull path (`docker-compose.pull.yml`) end to end,
      including anonymous pull
- [x] Reconcile stale docs (removed leftover inherited-runtime framing;
      aligned ARCHITECTURE.md, OBJECTIONS.md, PRODUCT_SPINE.md, and
      INTEGRATION_MODEL.md with the claims ledger — 2026-07-05)

## Phase 1 — design-partner proof (v0.2)

Goal: 3–5 design partners running Ward against real traffic in staging.
The honest blockers to that today, in order:

- [ ] **Streaming (SSE) pass-through** — most production AI SaaS streams;
      without it Ward cannot sit in a real egress path
- [ ] **Verified pass-through mode** — the real-upstream path is
      currently untested; it must be exercised and benchmarked
- [ ] **Observe-only mode** — attribution, pressure detection, and audit
      with enforcement disabled, so partners can adopt Ward with zero
      blocking risk on day one and turn on enforcement per tenant when
      they trust it
- [ ] **Published latency numbers** — measured proxy overhead, not
      asserted
- [ ] Design-partner feedback loop (issue template + weekly triage)

## Phase 2 — the incident wedge (v0.3)

Goal: make Ward the artifact of record for tenant-level AI incidents.

- [ ] **Incidents** — group detections, approvals, transitions, and
      blocks into a first-class incident with a timeline in the Control
      Room
- [ ] **Containment receipts** — an exportable, self-contained record of
      one incident (what was detected, who approved, what was contained,
      when it resumed, what never blipped) that support can hand to the
      affected customer
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

## Verification discipline

Nothing on this roadmap gets marked shipped without evidence: a smoke
test, an E2E, or a runbook-verified procedure, recorded in
[docs/CLAIMS_AND_EVIDENCE.md](docs/CLAIMS_AND_EVIDENCE.md) and
[docs/BUILD_STATUS.md](docs/BUILD_STATUS.md). If you catch this repo
claiming something it cannot prove, that is a bug — file it.
