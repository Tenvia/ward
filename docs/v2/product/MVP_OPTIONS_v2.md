# Ward v2 — MVP Options (Strengthened Revision)

> Status: candidate MVP comparison for owner review. No MVP is
> finalized. The three options below are **structurally different**,
> not minor variations. Owner review is required to select one.
>
> Revision history:
>
> * v1 — initial comparison; smallest-credible-scope was abstract;
>   no monetization hypothesis, ICP, first-customer profile, or
>   fallback per option; ranking rubric was qualitative.
> * v2 (base plan) — every option now has concrete
>   smallest-credible-deliverable (with example payloads or
>   wireframes), monetization hypothesis, ICP, first-five-customers
>   profile, GTM motion, explicit "what is NOT included", fallback
>   path, and Phase 1 validation experiments. Ranking rubric is
>   weighted and transparent. Expansion sequencing between options
>   is explicit. The recommendation remains Option A pending owner
>   acceptance.
> * v2 strengthened companion — adds explicit evidence-before-build,
>   paid-pilot, advance/narrow/kill, commercial-discipline, and
>   proof-surface gates.

> **Decision-ready revision:** This companion file tightens the prior
> comparison for owner review. It does not select an MVP, authorize
> implementation, or convert commercial hypotheses into commitments.
>
> The key change is a staged decision rule: first prove a buyer has a
> painful, repeated configuration problem; then prove a narrow paid
> workflow; only then fund platform breadth.


## Decision guardrails

The prior comparison is useful for choosing a direction, but its scores
can create false precision. Use the following gates alongside the
weighted rubric.

### Gate 0 — evidence before build

Do not start runtime implementation from this document alone. Option A,
B, or C advances only after Phase 1 has produced:

* at least 8 completed buyer/workflow interviews across at least two
  adjacent verticals;
* at least 3 conversations with a named economic buyer or a documented
  referral to that buyer;
* one reconstructed current workflow with artifacts (screens, tickets,
  configuration tables, or runbooks), not only stated interest; and
* a falsifiable willingness-to-pay conversation tied to a concrete pilot
  outcome.

### Gate 1 — paid pilot, not feature enthusiasm

A selected option earns a Phase 2 build only if two design partners agree
in writing to a time-boxed pilot with a named champion, a real workflow,
and a success measure. "Would use" or demo enthusiasm is not a pass.
The smallest pilot must be deliverable by one engineer in four weeks and
must avoid identity, billing, and multi-vendor platform work.

### Gate 2 — advance, narrow, or kill

At the end of the pilot, make one of three explicit decisions:

| Outcome | Minimum evidence | Action |
| --- | --- | --- |
| Advance | 2 paid pilots; both complete the target workflow; ≥1 asks for expansion or renewal | Fund the next wedge slice |
| Narrow | 1 pilot completes; the other is blocked by integration, buyer, or UX mismatch | Remove the failing surface and rerun one bounded pilot |
| Kill / reselect | 0 pilots complete, or neither partner will pay after a demonstrated workflow | Stop implementation and return to the ranked options |

These are proposed gates, not acceptance criteria for the project. The
owner must confirm or amend them before Phase 1 begins.

### Commercial discipline

All prices in this document are test bands, not forecasts. For each
option, Phase 1 must test one concrete pilot offer with a price, buyer,
term, and unit of value. Record objections separately from stated price
preferences. Do not use the ARR ranges as evidence of market size.

### Scope discipline

Each option has a headline surface and a proof surface. The proof surface
is the only Phase 2 commitment implied by the recommendation:

* **A:** one capability, one plan, two customer profiles, one embedded
  configuration flow, and one resolve response;
* **B:** one resolve contract, one approval path, and one audit receipt;
* **C:** one event schema, one weekly customer view, and two inspectable
  expansion heuristics.

Catalog breadth, polished analytics, SSO, billing integration, and
multi-vendor tenancy are explicitly post-pilot work for all options.

## Method

Each option is evaluated against the same weighted rubric and the
same checklist:


* primary buyer
* painful problem solved
* ideal customer profile (industry, size, stack, why-now)
* product experience
* smallest credible deliverable (concrete; named surfaces; example
  payloads or wireframes)
* integration burden (specific steps and effort estimate)
* time to value (specific milestone in days/weeks)
* monetization hypothesis (who pays; price model; expansion mechanic)
* go-to-market motion (inbound/outbound/PLG/community/sales-led;
  pilot structure)
* first-five-customers / first-design-partner profile
* differentiation (the specific thing Ward v2 uniquely combines)
* commercial potential (with $/ARR estimate range)
* expansion path (specific triggers and timing)
* what is NOT included (explicit deferrals)
* risks
* fallback if main risk materializes
* invalidating evidence (tied to specific Phase 1 experiments)
* Phase 1 validation experiments (which of E-01..E-10 apply)

The options are deliberately not feature lists. They are bets about
where Ward v2 enters the customer's world.

## Selection framework (weighted rubric)

Each option is scored on the following criteria. Weights are named
explicitly so the owner can challenge them.

| Criterion             | Weight | Question                                                          |
| --------------------- | ------ | ----------------------------------------------------------------- |
| Buyer pain evidence   | 0.20   | Is the pain concrete and unserved?                                |
| Differentiation       | 0.20   | Does this option differ from adjacent tools in a defensible way?  |
| Time to value         | 0.15   | Can a customer see value in days, not months?                     |
| Validation feasibility | 0.15 | Can this option be validated in Phase 1 without runtime?         |
| Expansion strength    | 0.10   | Does success in this wedge lead naturally to the next wedge?      |
| Integration burden    | 0.10   | Can a customer integrate without rewriting their stack?           |
| Owner decision cost   | 0.10   | Can the owner choose without major architecture commitment?       |

Each criterion is scored 1–5 (1 = weak, 5 = strong). The weighted
score is `sum(score_i * weight_i)`. The maximum is 5.00.

These weights are **hypotheses, not commitments**. The owner may
adjust them before accepting the recommendation. Each weight is
defensible:

* Buyer pain evidence is weighted highest because the wedge must
  solve a real problem.
* Differentiation is weighted highest because Ward v2 must earn its
  category against adjacent tools.
* Time to value is weighted high because long time-to-value kills
  design-partner adoption.
* Validation feasibility is weighted high because doctrine §2.12
  forbids building before learning.
* Expansion strength, integration burden, and owner decision cost
  are weighted lower but matter for sequencing and risk.

---

## Option A — Embedded Customer Autonomy Administration

### Thesis

The smallest credible customer-visible surface is an **embedded
administration surface** that vendors can drop into their own
product. The vendor defines capabilities and plans in a Ward v2
catalog; customers adjust what their plan permits through the
embedded surface. The vendor's existing agent continues to call Ward
v2 for configuration resolution, but the wedge begins with the
visible surface.

The runtime integration is real but minimal: a single read-only
resolution endpoint, called in advance of capability execution or on
configuration change, with the response cached client-side.

### Primary buyer

SaaS Product Leader (vendor). Ward v2 is sold as an embedded
component of the vendor's product, not as a separate product.

### Painful problem solved

Each vendor customer currently has a customer-specific admin screen
(or none). Vendors spend 2–6 weeks per new customer building or
modifying configuration surfaces. Embedded administration replaces
that with a coherent surface the vendor can rebrand and reuse.

### Ideal customer profile

* **Industry:** B2B SaaS in customer-facing operations (support,
  customer success, marketing ops, sales ops, recruiting ops).
  Specifically companies whose customers interact with autonomous
  capabilities daily.
* **Company size:** 30–500 person vendor; 50–5,000 customers per
  vendor; ARR $5M–$100M.
* **Current stack:** Node or Python back end; React or Vue front
  end; has shipped at least one autonomous capability to production
  in the last 12 months.
* **Why-now trigger:** the vendor is preparing to sell or expand the
  autonomous capability to a materially different customer segment
  in the next 6 months, or has lost a deal in the last 90 days
  because customer-specific configuration was too costly.

### Product experience

1. Vendor defines capabilities and plans in Ward v2 (admin UI).
2. Vendor embeds the Ward v2 admin surface as a rebrandable web
   component in their own product.
3. Customer administrator opens the embedded surface and adjusts
   permitted settings (capability toggles, limits, operating
   windows, escalation paths).
4. Vendor's agent calls Ward v2 for configuration resolution
   (read-only API) at capability decision points.
5. Customer sees adoption and outcome metrics in the same surface.

### Smallest credible deliverable

The smallest deliverable a vendor can pay Ward v2 for and a
customer administrator can use:

**Vendor-facing admin (Ward v2 vendor console):**

* Capability catalog CRUD (`POST /v2/capabilities`,
  `GET /v2/capabilities`, etc.).
* Plan CRUD with capability attach (`POST /v2/plans`).
* Customer CRUD with plan attach (`POST /v2/customers`).
* Capability-level configuration per customer (level, limits,
  approval rules) via a simple form, not a DSL.

**Embedded customer-facing surface:**

* A rebrandable React web component (`<WardAdminPanel />`) that:
  * Lists the customer's purchased capabilities with current level
  * Renders the appropriate controls per capability:
    * Capability toggles (on/off)
    * Limit editors (numbers, currency)
    * Operating-hours editor (timezone-aware)
    * Approval-rule editor (threshold, condition, approver queue)
  * Posts changes to Ward v2 via the same API
  * Shows the resolved profile for the customer
* Themeable via CSS variables; logo and copy overridable per vendor.

**Runtime integration (read-only):**

* `POST /v2/resolve` request payload:

  ```json
  {
    "customer_id": "acme",
    "capability": "refund.issue",
    "context": {
      "business_unit": null,
      "amount_usd": 150,
      "actor_role": "support_agent"
    }
  }
  ```
* Response payload:

  ```json
  {
    "decision": "require_approval",
    "level": "approve",
    "limits": { "max_amount_usd": 500 },
    "approval_route": "globex_refund_queue",
    "expires_at": "2026-08-01T12:00:00Z",
    "source_layer": "customer_profile",
    "conflicting_layers": []
  }
  ```

* Vendor's existing agent enforces; Ward v2 does not execute.
* Caching: vendor may cache the response for up to 60 seconds
  (configurable). On `expires_at`, vendor calls again.

**Vendor operating view (read-only):**

* Per-customer view: purchased capabilities, current level,
  recent configuration changes, recent usage, recent outcomes.
* Cross-customer view: adoption distribution, escalation frequency,
  usage vs allocation, top customers by outcome volume.

**Out of scope for Option A MVP:**

* Approval-token issuance and verification (deferred to Option B
  if pursued)
* Outcome-event ingestion API (deferred)
* Billing or entitlement-system integration (deferred)
* Multi-tenant management across vendors (deferred)
* Rollout staging UI (deferred; rollouts are a vendor-internal
  concern during MVP)
* Embedded SSO / SAML (deferred)
* Customer-facing analytics beyond the embedded panel (deferred)

### Integration burden

**For the vendor:** low to moderate. Embeds a web component
(~50KB). Adds 1–3 HTTP calls per capability execution (resolve +
optional cache invalidation). Total integration: ~3–5 days of
engineering, of which 1–2 days is the embed and 1–3 days is wiring
the resolve call into the agent.

**For the customer administrator:** near-zero. The surface renders
inside the vendor's existing product; the customer does not need to
learn a new tool.

### Time to value

* Days for the **first vendor** to embed the panel.
* Days for the **first customer administrator** to adjust settings
  and see them take effect.
* Weeks for the vendor to see adoption and outcome signals across
  customers.

### Monetization hypothesis

* **Who pays:** the vendor (B2B SaaS).
* **Price model (hypothesis):** per customer configuration managed
  by Ward v2, with volume tiers. Estimated range: $500–$2,000 per
  configured customer per year, with platform minimum.
* **Expansion mechanic:** as the vendor adds customers, adds
  capabilities, or graduates customers to higher autonomy levels,
  the billable surface grows.
* **Alternative hypothesis:** per autonomy profile resolved
  (metered), with a free tier below ~10k resolutions per month.
  Estimated range: $0.001–$0.01 per resolution.
* **Why this is uncommitted:** Phase 1 E-06 (fake-door pricing) and
  E-09 (open-core boundary conversations) test the model. Both
  price models above are candidates; the owner selects after
  evidence.

### Go-to-market motion

* **Inbound first, outbound second.** Phase 1 produces
  validation artifacts (killer demo, OrbitDesk scenario, prototype
  walkthroughs). These are published as content; the wedge is sold
  through the content, not through cold outreach.
* **Pilot structure:** 4-week paid pilot at reduced rate, with
  the embedded panel live in the vendor's product and ≥1 customer
  configured end-to-end.
* **Sales cycle:** 4–8 weeks from first conversation to signed
  pilot. Conversion from pilot to annual: target ≥60%.

### First-five-customers / first-design-partner profile

Phase 0 does not name specific companies. The profile for the first
five:

1. **One B2B support platform** — primary hypothesis-fit (OrbitDesk
   archetype).
2. **One B2B marketing-ops platform** — adjacent hypothesis-fit
   (different product surface, same configuration pain).
3. **One B2B recruiting platform** — adjacent hypothesis-fit
   (different buyer, similar wedge).
4. **One mid-market customer-success platform** — secondary buyer
   test (CS-leader as economic buyer).
5. **One enterprise SaaS with multi-BU customers** — Initech
   archetype; tests the multi-BU override story.

**Recruitment plan:** Phase 1 E-01 (buyer-pain interviews) sources
the first 8–10 conversations. E-05 (embedded-admin walkthrough)
converts 3–5 to design-partner candidates. E-08 (sample integration
spike) confirms the spike works. The owner approves the design
partner list before any contract.

### Differentiation

The wedge is the **specific combination** of:

1. product-level capability identifiers
2. customer-facing administration that exposes the same
   configuration the vendor sees
3. read-only configuration resolution at runtime
4. configuration inheritance from vendor defaults to per-customer
   overrides
5. cross-customer vendor operating view

Adjacent tools provide subsets:

* LaunchDarkly / Statsig — flags, no admin surface, no runtime
  resolution, no configuration inheritance, no business outcomes
* Stripe / billing platforms — metering, no admin surface for
  autonomy configuration, no business outcomes tied to capabilities
* Internal admin panels — every vendor's existing one, but
  customer-specific per build, no runtime resolution, no vendor
  operating view

The combination is the product.

### Commercial potential

* **$/ARR range:** $50k–$500k ARR per design partner in year 1;
  expansion to $500k–$2M ARR per design partner in year 2 as
  customer base grows.
* **Why this range:** conservative estimate based on per-customer
  pricing at $500–$2,000 per year × 100–1,000 customers per
  design partner × ~50% gross margin.
* **Unvalidated.**

### Expansion path

If Option A succeeds, the wedge expands to:

1. **Approval-token issuance and verification** (the runtime gains
   the second half of the runtime contract; aligns with Option B
   Phase 3 spike). Trigger: ≥3 design partners ask for approval
   flows in the embedded panel.
2. **Outcome-event ingestion** (vendor's existing systems emit
   business outcomes; Ward v2 normalizes and surfaces). Trigger:
   ≥3 design partners report they want outcome-based reporting.
3. **Embedded SSO / SAML** (customer-administrator authentication).
   Trigger: ≥2 enterprise prospects require it.
4. **Rollout staging UI** (vendor manages capability rollouts per
   customer cohort). Trigger: ≥3 design partners manage >10
   staged capabilities.
5. **Vendor-facing rollout management** (cohort-level
   administration across customers). Trigger: ≥5 design partners
   ask for it.

### What's NOT included

* Execution of the autonomous capability (the vendor's agent does
  this; Ward v2 does not)
* Approval-token issuance (deferred; described in Option B)
* Billing-system integration (deferred; vendor's existing billing
  remains in place)
* Identity-provider integration beyond basic session auth (deferred)
* Policy language or rule engine (deferred; configuration is
  capability-level form, not DSL)
* Multi-vendor management (deferred; Ward v2 is single-tenant-per-
  vendor in MVP)
* Real-time editing collaboration (deferred; single-editor at a
  time)
* Audit log UI for compliance (deferred; basic audit emission is
  included via the resolve API)

### Risks

1. **The wedge may feel like "another admin UI library"** if
   differentiation is not visible in the demo.
2. **Customers may not use the embedded panel** if the vendor's
   existing UX is sticky.
3. **The runtime integration is minimal** (resolve-only); the wedge
   may not feel like a "runtime product."
4. **Vendor lock-in fear** if vendors perceive the embed as a
   commitment to a third-party surface.

### Fallback if main risk materializes

*If "another admin UI library":* narrow the wedge to the runtime
resolve API (collapse to Option B as Phase 2 bet) and keep the
admin as a thin convenience layer, not the headline.

*If "customers don't use the embedded panel":* pivot the wedge to
the vendor operating view (Option C as Phase 2 bet) and de-prioritize
the customer-facing surface.

*If "vendor lock-in fear":* ship a fully self-hostable option in
the MVP and emphasize local-data sovereignty.

### Invalidating evidence (tied to Phase 1 experiments)

| Evidence                                                  | Phase 1 experiment |
| --------------------------------------------------------- | ------------------ |
| <5/10 design partners report concrete customer-admin pain | E-01, E-02         |
| <3/5 design partners see embedded admin as replacement    | E-05               |
| <2/3 design partners prefer existing internal admin       | E-05, E-10         |
| Embedded admin walkthrough confuses or overwhelms         | E-05, E-10         |
| Sample integration takes >2 weeks for first design partner| E-08               |
| Pricing page engagement <5% of visitors                    | E-06               |
| Ladder comprehension <4/8 in walkthrough                  | E-04               |
| Outcome events not actionable in concierge pilot          | E-07               |

### Phase 1 validation experiments

* **E-01** Buyer-pain interviews (validates the embedded-admin pain)
* **E-02** Workflow reconstruction (validates the current workaround)
* **E-03** Prototype walkthrough (validates the killer demo
  including the embedded-admin view)
* **E-04** Autonomy-vocabulary comprehension (validates the
  vocabulary the embedded panel will expose)
* **E-05** Embedded-admin walkthrough (validates the wedge directly)
* **E-06** Fake-door pricing (validates monetization hypothesis)
* **E-07** Concierge configuration (validates the workflow without
  runtime)
* **E-08** Sample integration spike (validates integration burden)
* **E-09** Open-core boundary conversations (validates pricing and
  commercial model)
* **E-10** Customer-administration demand test (validates
  willingness to expose)

### Recommendation

**Plausible wedge #1.** Smallest scope, fastest time to value,
clearest expansion path, lowest owner-decision cost. Risk: may feel
like a UI library without runtime.

---

## Option B — Autonomy-Profile Runtime (the runtime wedge)

### Thesis

The smallest credible runtime contract is an **API that vendors
call at every capability decision point** to resolve the effective
autonomy profile for a (customer, capability, business unit, context)
tuple. Ward v2 returns the autonomy level, limits, approval
requirements, and escalation targets. The vendor's existing agent
enforces; Ward v2 does not execute.

The admin, plan, and customer-administration surfaces are minimized
in favor of a clean, narrow API. Configuration is managed via API
or a minimal headless console; no embedded customer-facing surface
in MVP.

### Primary buyer

Platform / Application Engineering Leader at the vendor. Secondary:
CTO / VP Eng.

### Painful problem solved

Vendors currently scatter configuration lookup across feature flags,
entitlement checks, custom tables, and prompt-side logic. Each
capability decision touches 2–5 systems. A single runtime contract
replaces that surface at the agent's decision point.

### Ideal customer profile

* **Industry:** B2B SaaS in any vertical; emphasis on companies
  whose agents already touch customer-impacting capabilities
  (refunds, sends, escalations, CRM updates, billing changes).
* **Company size:** 50–2,000 person vendor; 100+ customers per
  vendor; ARR $10M–$500M.
* **Current stack:** any language/framework. The runtime is
  language-neutral. Vendors with multiple languages benefit most.
* **Why-now trigger:** the vendor has scaled past the point where
  the configuration sprawl is manageable, or has had a recent
  incident attributed to configuration drift across systems.

### Product experience

1. Vendor defines capabilities and plans in Ward v2 (API or
   minimal console).
2. Vendor's agent calls Ward v2 at each capability decision
   point.
3. Ward v2 returns the autonomy level, limits, approval
   requirements, and escalation target.
4. The vendor's existing agent enforces.
5. The vendor observes outcomes through a separate metrics surface.

### Smallest credible deliverable

The smallest deliverable a vendor can integrate and a runtime API
can answer:

**Runtime API (the headline):**

* `POST /v2/resolve` (already specified in Option A; identical)
* `POST /v2/approvals` (issue approval token):

  ```json
  {
    "customer_id": "globex",
    "capability": "refund.issue",
    "context": { "amount_usd": 250 },
    "requested_action": "issue_refund",
    "approver_queue": "globex_refund_queue",
    "ttl_seconds": 900
  }
  ```
  →

  ```json
  {
    "approval_token": "apr_8a3f...",
    "expires_at": "2026-08-01T12:15:00Z",
    "confirmation_phrase": "issue globex refund of 250"
  }
  ```

* `POST /v2/approvals/verify` (verify a presented approval token):

  ```json
  {
    "approval_token": "apr_8a3f...",
    "confirmation_phrase": "issue globex refund of 250"
  }
  ```
  → `{ "valid": true, "approved_by": "alex@globex", "approved_at": "..." }`

* `POST /v2/events` (emit usage and outcome events):

  ```json
  {
    "customer_id": "globex",
    "capability": "refund.issue",
    "event_type": "outcome",
    "outcome": "refund_issued",
    "context": { "amount_usd": 250, "ticket_id": "T-9921" },
    "timestamp": "2026-08-01T12:14:32Z"
  }
  ```
  → `{ "accepted": true, "event_id": "evt_..." }`

**Configuration management:**

* Vendor admin API (headless or minimal console) for capabilities,
  plans, customers, business-unit overrides, temporary exceptions.
* Configuration inheritance resolved at runtime, not precomputed.

**Audit emission:**

* Every resolve call, approval issue/verify, and event emit is
  appended to a structured audit log (`GET /v2/audit`).

**Vendor operating view:**

* Minimal: read-only API for cross-customer signals.
* No embedded customer-facing surface in MVP.

**Out of scope for Option B MVP:**

* Embedded customer-facing admin surface (deferred; the runtime is
  the headline)
* Rebrandable UI (deferred; vendor admin is minimal)
* Capability catalog UI (deferred; vendor uses API)
* Customer-administrator permissions (deferred; vendor manages
  configuration directly in MVP)
* Outcome-event aggregation UI (deferred; basic audit log only)

### Integration burden

**For the vendor:** moderate to high. The agent must call the
resolve endpoint at every capability decision point (typically
5–15 points per vendor). Total integration: ~2–6 weeks of
engineering, depending on how scattered the existing configuration
is.

**For the customer:** no change. Customer-facing UX is unchanged.

### Time to value

* Days for the vendor to make the first resolve call.
* Weeks to integrate every capability decision point.
* Weeks to see cross-customer signals from the audit log.

### Monetization hypothesis

* **Who pays:** the vendor.
* **Price model (hypothesis):** per resolve call, metered, with
  volume tiers. Estimated range: $0.001–$0.01 per resolve, with
  monthly minimums around $500.
* **Alternative hypothesis:** flat platform fee plus overage;
  estimated range: $2k–$10k/month platform fee + overage.
* **Why this is uncommitted:** Phase 1 E-06 and E-09 test the
  model.

### Go-to-market motion

* **Outbound first, content second.** Runtime is a technical sell;
  it requires a developer-evaluation motion. Phase 1 produces a
  sample-integration spike (E-08) and a public-facing integration
  guide.
* **Pilot structure:** 4-week technical evaluation, with the
  vendor's first 2–3 capability decisions integrated and a
  side-by-side before/after comparison.
* **Sales cycle:** 6–12 weeks from first conversation to signed
  pilot. Conversion from pilot to annual: target ≥50% (lower
  than Option A because the integration is heavier).

### First-five-customers / first-design-partner profile

1. **One B2B support platform with multiple existing agents**
   (OrbitDesk archetype).
2. **One B2B marketing-ops platform with prompt-config sprawl.**
3. **One B2B finance-ops platform with entitlement sprawl.**
4. **One company that has had a recent configuration-drift
   incident** (the buyer pain is acute).
5. **One company with multiple language stacks** (the language-
   neutral contract is a clear win).

### Differentiation

The wedge is **runtime coherence** — the specific combination of:

1. product-level capability identifiers in API requests
2. configuration inheritance resolved at runtime (vendor defaults →
   plan → customer → BU → temporary exception)
3. approval-token issuance and verification with single-use,
   short-TTL, action-bound tokens (the v1 confirmation-phrase
   pattern)
4. audit emission tied to the same identifiers
5. usage and outcome event ingestion on the same API surface

Adjacent tools provide subsets:

* LiteLLM / Portkey / Cloudflare AI Gateway — model routing; no
  customer-autonomy profile
* Langfuse / LangSmith — observability; no autonomy resolution
* Open Policy Agent / Cedar — policy language; no product-level
  identifiers, no embedded admin, no outcome events
* Custom entitlement services — per-vendor; no shared product
  surface

### Commercial potential

* **$/ARR range:** $100k–$1M ARR per design partner in year 1;
  expansion to $1M–$5M ARR in year 2 as resolution volume grows.
* **Why this range:** metered resolve calls × high-volume
  production agents × 12 months.
* **Unvalidated.** Highest theoretical ceiling, highest
  uncertainty.

### Expansion path

If Option B succeeds, the wedge expands to:

1. **Embedded customer-facing admin** (the runtime gains the
   embedded admin; aligns with Option A as Phase 2 bet). Trigger:
   ≥3 design partners ask for customer self-service.
2. **Rollout staging API** (vendor manages staged rollouts per
   customer cohort). Trigger: ≥3 design partners manage >10
   staged capabilities.
3. **Outcome-event aggregation UI** (the vendor operating view
   becomes a product surface, not just an audit log). Trigger:
   ≥3 design partners report they want expansion signals.
4. **Billing-integration** (resolve emits billable usage events
   to vendor billing systems). Trigger: ≥3 design partners ask
   for it.
5. **Vendor-facing rollout management UI** (cohort
   administration). Trigger: ≥5 design partners ask.

### What's NOT included

* Embedded customer-facing admin surface (deferred; vendor manages
  configuration directly)
* Customer-administrator permissions or SSO (deferred; not in
  scope)
* Capability-catalog UI (deferred; vendor uses API)
* Multi-vendor management (deferred)
* Real-time audit UI (deferred; audit log only)
* Re-brandable UI components (deferred)
* Vendor-facing rollout UI (deferred)

### Risks

1. **The wedge is harder to validate before runtime exists.**
   Sample-integration spike (E-08) is the closest validation;
   if it fails, the wedge is unproven.
2. **Buyers may defer because integration is heavy.** 6–12 week
   sales cycle is long for a wedge.
3. **The runtime contract may ossify prematurely** if early
   design partners anchor the design.
4. **Differentiation may erode** if LiteLLM, Portkey, or a major
   gateway ships a similar contract within 6 months.
5. **Buyer hypothesis may be wrong** (engineering vs product vs
   customer-success vs solutions).

### Fallback if main risk materializes

*If "hard to validate before runtime":* run an extended Phase 3
spike (4 weeks of build + 4 weeks of integration with one design
partner) before committing. If spike fails, deprioritize Option B
and advance Option A or C.

*If "integration too heavy":* reduce the integration surface to a
single endpoint (resolve only) and defer approval and events to
later phases. Reduces time-to-value but weakens the wedge.

*If "ossification":* ship versioned contracts with explicit
deprecation policy; require owner approval before any breaking
change.

*If "differentiation erodes":* pivot the wedge to a different
combination (e.g. configuration inheritance + customer admin +
outcome events), accepting reduced defensibility.

### Invalidating evidence (tied to Phase 1 experiments)

| Evidence                                                  | Phase 1 experiment |
| --------------------------------------------------------- | ------------------ |
| <3/5 design partners integrate resolve API in ≤2 weeks    | E-08               |
| <3/5 design partners report time-saved >integration cost   | E-08               |
| Adjacent tool ships competing contract within 6 months    | CR-01 / direct observation |
| Buyer is consistently engineering leadership, not product  | E-01, E-02         |
| Resolution API latency budget violated in production      | E-08 / Phase 3 spike |

### Phase 1 validation experiments

* **E-01** Buyer-pain interviews (validates buyer and pain)
* **E-02** Workflow reconstruction (validates existing
  configuration sprawl)
* **E-08** Sample integration spike (validates integration
  burden directly)
* **E-04** Autonomy-vocabulary comprehension (validates
  identifiers used in the API)
* **E-06** Fake-door pricing (validates per-resolve monetization)

### Recommendation

**Plausible wedge #2.** Highest commercial defensibility, longest
time to value, hardest to validate before runtime. Best as Phase 2
or 3 bet, after Option A has produced design-partner evidence.

---

## Option C — Vendor Adoption and Expansion Intelligence

### Thesis

Vendors already have customer-administration, configuration, and
runtime surfaces. They lack a coherent view of **which customers
are ready for more autonomy** and **which are at risk of disabling
a capability**. The wedge is a **vendor operating surface** that
consumes usage and outcome events from the vendor's existing stack
and produces adoption, expansion, and risk signals.

This wedge **does not require a runtime integration with Ward v2's
resolution API**. The vendor's existing systems emit events to Ward
v2; Ward v2 produces intelligence the vendor uses to plan rollouts,
expansions, and risk interventions.

### Primary buyer

Head of Customer Success or Head of Support Operations at the
vendor. Possibly also Head of Product.

### Painful problem solved

Vendors cannot tell which customers are ready to expand because the
data lives in five systems (CRM, billing, telemetry, support
tickets, custom spreadsheets). Ward v2 aggregates and produces
actionable signals.

### Ideal customer profile

* **Industry:** B2B SaaS with a CS motion (most B2B SaaS); emphasis
  on companies whose CS team is the primary commercial lever for
  expansion.
* **Company size:** 50–1,000 person vendor; CS team ≥10 people;
  ARR $10M–$200M.
* **Current stack:** CRM (Salesforce, HubSpot), billing (Stripe,
  Chargebee), support (Zendesk, Intercom), custom telemetry.
* **Why-now trigger:** the CS team is responsible for an expansion
  number this quarter and lacks a unified view of customer
  readiness.

### Product experience

1. Vendor instruments its existing systems to emit events to Ward
   v2 (capability used, outcome occurred, configuration changed).
2. Ward v2 normalizes events per customer and per capability.
3. Ward v2 produces adoption, expansion, and risk signals.
4. Customer Success uses the signals to prioritize outreach.
5. Product uses the signals to plan rollouts.

### Smallest credible deliverable

The smallest deliverable that produces actionable intelligence:

**Event ingestion:**

* `POST /v2/events` (already specified in Option B).
* Vendor emits capability-used, outcome, and configuration-change
  events.
* Ward v2 normalizes per customer and per capability.

**Vendor operating surface:**

* Cross-customer view: per-customer card with:
  * Adoption: % of purchased capabilities used in last 30 days
  * Outcome completion: % of attempted capabilities completed
    end-to-end
  * Usage vs allocation: included quota consumed
  * Risk: rollback events, escalations, negative outcomes
* Expansion-signal list: customers ranked by readiness to upgrade
  autonomy level, with the specific evidence cited (e.g. "Acme has
  used `ticket.draft` 47 times with 92% human-accept rate; ready
  for bounded send").
* Risk-signal list: customers ranked by churn or disablement risk,
  with specific evidence cited (e.g. "Globex refunded 12% of
  transactions last 30 days; consider revisiting auto-refund cap").

**Heuristics (not ML; explicit and inspectable):**

* Adoption: capability usage count per 30 days, with thresholds
  configurable per vendor.
* Expansion readiness: usage pattern + acceptance rate + escalation
  frequency, with rules configurable per vendor.
* Risk: rollback count + escalation count + negative-outcome rate,
  with thresholds configurable per vendor.

**Out of scope for Option C MVP:**

* Real-time dashboards (deferred; weekly cadence is enough)
* ML-based predictions (deferred; explicit heuristics only)
* Embedded admin (deferred)
* Runtime resolve API (deferred)
* Customer-facing surface (deferred)
* Billing integration (deferred)
* Identity-provider integration beyond API key auth (deferred)

### Integration burden

**For the vendor:** low to moderate. Vendor adds 1–3 instrumentation
calls per capability event in their existing systems. Total
integration: ~1–2 weeks of engineering.

**For the customer:** no change.

### Time to value

* Days for instrumentation.
* Weeks for the first actionable signals (insufficient event
  history before then).

### Monetization hypothesis

* **Who pays:** the vendor.
* **Price model (hypothesis):** per vendor, with usage tiers by
  event volume. Estimated range: $1k–$10k/month per vendor.
* **Why this is uncommitted:** Phase 1 E-06 and E-09 test the
  model.

### Go-to-market motion

* **CS-led motion, content second.** The buyer is the CS leader;
  the wedge is sold on the value of expansion revenue.
* **Pilot structure:** 4-week paid pilot at reduced rate, with
  ≥3 vendors' event streams integrated and expansion + risk
  signals live.
* **Sales cycle:** 4–8 weeks. Conversion from pilot to annual:
  target ≥70% (highest of the three options; intelligence is
  easier to evaluate).

### First-five-customers / first-design-partner profile

1. **One B2B SaaS with a CS-quota-driven expansion motion.**
2. **One B2B SaaS where CS uses spreadsheets for expansion
   tracking.**
3. **One B2B SaaS where the CS leader is the strongest economic
   buyer candidate.**
4. **One B2B SaaS with a recently lost expansion deal attributed
   to "didn't know customer was ready."**
5. **One B2B SaaS that has tried Langfuse / Mixpanel / similar
   and found it insufficient for autonomy-specific signals.**

### Differentiation

The wedge is **business-level vendor intelligence** — the specific
combination of:

1. event ingestion keyed to product-level capability identifiers
2. per-customer aggregation with cross-customer ranking
3. expansion-readiness heuristics tied to autonomy-specific
   evidence (acceptance rate, escalation frequency, usage pattern)
4. risk heuristics tied to autonomy-specific failure modes
5. inspectable, configurable heuristics (not black-box ML)

Adjacent tools provide subsets:

* Langfuse / LangSmith — observability traces; not autonomy-
  specific, not customer-ranked
* Mixpanel / Amplitude — product analytics; not autonomy-specific,
  not expansion-readiness-oriented
* Salesforce / HubSpot — CRM; no autonomy event ingestion, no
  autonomy-specific heuristics
* Internal CS dashboards — every vendor's existing one, but
  built from CRM data, not from capability events

### Commercial potential

* **$/ARR range:** $20k–$200k ARR per design partner in year 1;
  expansion to $200k–$1M ARR in year 2 as event volume grows.
* **Why this range:** per-vendor flat fee × 12 months, with
  expansion as customers are onboarded.
* **Unvalidated.** Lowest ceiling but also lowest validation
  cost.

### Expansion path

If Option C succeeds, the wedge expands to:

1. **Runtime resolve API** (intelligence becomes the justification
   for runtime integration). Trigger: ≥3 design partners ask for
   it.
2. **Embedded admin** (intelligence exposes customer-facing
   signals). Trigger: ≥3 design partners ask for it.
3. **Outcome-event aggregation UI improvements** (real-time
   dashboards, ML heuristics). Trigger: ≥3 design partners report
   current heuristics insufficient.
4. **Vendor-facing rollout UI** (cohort administration). Trigger:
   ≥5 design partners ask.

### What's NOT included

* Embedded admin surface (deferred)
* Runtime resolve API (deferred)
* Customer-facing surface (deferred)
* ML-based predictions (deferred)
* Real-time dashboards (deferred)
* Multi-vendor management (deferred)
* Re-brandable UI (deferred)
* Billing integration (deferred)
* Identity-provider integration beyond API key (deferred)

### Risks

1. **The wedge may feel like "another dashboard"** without unique
   intelligence.
2. **Value depends on event quality** which the vendor controls.
3. **The wedge may not require a runtime contract**, weakening
   the broader Ward v2 thesis (the runtime becomes optional).
4. **CS-leader buyer may not have budget authority** that
   engineering has.
5. **Heuristics may not be actionable** until vendors have
   significant event history (cold-start problem).

### Fallback if main risk materializes

*If "another dashboard":* narrow the wedge to expansion-readiness
heuristics only (drop risk heuristics); partner with one CRM
vendor for distribution rather than building the dashboard.

*If "value depends on event quality":* ship a managed-event-
collection tier in MVP, where Ward v2 owns the instrumentation
rather than the vendor.

*If "no runtime contract required":* reposition the wedge as
"vendor intelligence" rather than "autonomy product platform";
consider pivoting back to a containment-adjacent category if
Ward v2 is structurally incompatible.

*If "CS-leader has no budget":* target engineering leadership
instead; pivot the wedge to observability-adjacent positioning.

*If "cold-start problem":* seed the heuristics with
industry-baseline data from anonymized design partners.

### Invalidating evidence (tied to Phase 1 experiments)

| Evidence                                                  | Phase 1 experiment |
| --------------------------------------------------------- | ------------------ |
| <3/5 design partners report existing dashboards cover it  | E-01, E-02         |
| <2/5 design partners willing to instrument existing systems | E-01, E-08      |
| Signals not actionable in concierge pilot (too noisy)     | E-07               |
| CS-leader lacks budget authority consistently              | E-01               |
| Heuristics require >6 months event history to be useful   | E-07               |

### Phase 1 validation experiments

* **E-01** Buyer-pain interviews (validates CS-leader as buyer
  candidate)
* **E-02** Workflow reconstruction (validates the data-fragmentation
  pain)
* **E-07** Concierge configuration (validates heuristic
  actionability)
* **E-06** Fake-door pricing (validates monetization)
* **E-09** Open-core boundary conversations

### Recommendation

**Plausible wedge #3.** Lowest integration burden, fastest time to
value, weakest differentiation from generic observability, weakest
tie to the autonomy-product thesis. Best as a complement to Option
A or B, not as the standalone wedge.

---

## Cross-option comparison

### Qualitative summary

| Criterion              | Option A (Embedded Admin) | Option B (Runtime)     | Option C (Intelligence) |
| ---------------------- | ------------------------- | ---------------------- | ----------------------- |
| Buyer pain             | High (per Phase 0 hypothesis) | High               | Medium                  |
| Buyer urgency          | Medium (mid-market expansion) | Medium            | Low                     |
| Differentiation        | Medium (the combination) | High (runtime coherence) | Low (observability-adjacent) |
| Time to value          | Days                      | Weeks                  | Weeks                   |
| Expansion path         | Strong → B                | Strongest → A          | Medium → A or B         |
| Integration burden     | Low (3–5 days)            | High (2–6 weeks)       | Low (1–2 weeks)         |
| Owner decision cost    | Low (no architecture)     | High (architecture + integration) | Low (no runtime) |
| Reversibility          | High (vendor can back out)| Medium (integration cost) | High (instrument only) |
| Runtime required       | Minimal (resolve only)    | Yes (full runtime)     | No                      |
| Validation feasibility | High (E-05, E-08)         | Medium (E-08)          | High (E-07)             |
| $/ARR ceiling (hypothetical) | $50k–$2M            | $100k–$5M              | $20k–$1M                |

### Quantitative scoring (using the selection framework)

Each option scored 1–5 on each weighted criterion:

| Criterion (weight)      | Option A | Option B | Option C |
| ----------------------- | -------- | -------- | -------- |
| Buyer pain (0.20)       | 4        | 4        | 3        |
| Differentiation (0.20)  | 3        | 5        | 2        |
| Time to value (0.15)    | 5        | 2        | 4        |
| Validation feasibility (0.15) | 5   | 3        | 4        |
| Expansion strength (0.10)| 4        | 4        | 3        |
| Integration burden (0.10)| 4       | 2        | 4        |
| Owner decision cost (0.10)| 4      | 2        | 5        |
| **Weighted score (max 5.00)** | **4.00** | **3.40** | **3.20** |

Calculation:

* Option A: 0.20·4 + 0.20·3 + 0.15·5 + 0.15·5 + 0.10·4 + 0.10·4 +
  0.10·4 = 0.80 + 0.60 + 0.75 + 0.75 + 0.40 + 0.40 + 0.40 = **4.10**

  *(recheck: 4.10, rounded to 4.1; revising the table above to
  4.10)*

* Option B: 0.20·4 + 0.20·5 + 0.15·2 + 0.15·3 + 0.10·4 + 0.10·2 +
  0.10·2 = 0.80 + 1.00 + 0.30 + 0.45 + 0.40 + 0.20 + 0.20 = **3.35**

* Option C: 0.20·3 + 0.20·2 + 0.15·4 + 0.15·4 + 0.10·3 + 0.10·4 +
  0.10·5 = 0.60 + 0.40 + 0.60 + 0.60 + 0.30 + 0.40 + 0.50 = **3.40**

| Weighted score          | Option A | Option B | Option C |
| ----------------------- | -------- | -------- | -------- |
| (corrected)             | 4.10     | 3.35     | 3.40     |

Option A scores highest under the proposed weights. The lead over
Option B is 0.75 points, driven primarily by time-to-value and
validation feasibility (where Option B is weakest).

If the owner reweights to favor differentiation more heavily
(e.g. differentiation weight 0.30), Option B may pull ahead. The
weights are hypotheses, not commitments, and the owner may revise
them before accepting the recommendation.

## Sequencing

The recommended sequence across options:

```
Phase 1 (now)        → Validation only; no wedge commitment.
                         Owner selects MVP after evidence.

Phase 2 (post-MVP)   → Implement selected MVP with first
                         design partners.

Phase 3 (post-PMF)   → Confirm or pivot:
                         If Option A succeeded, run Phase 3 spike
                         on Option B (resolve + approval + events).
                         If Option B succeeded, run Phase 3 spike
                         on Option A (embedded admin for design
                         partners).
                         If Option C succeeded, evaluate whether
                         to add runtime (Option B subcomponents).

Phase 4+ (later)     → Combined product.
```

The sequencing assumes the initial MVP option succeeds. If the
initial MVP option fails in Phase 2, the fallback path within that
option is exercised first; only if both the primary and fallback
fail do we re-select.

## Ranking

Ranked by weighted score under the proposed rubric:

1. **Option A — Embedded Customer Autonomy Administration** (4.10)
   * smallest scope, fastest value, clearest expansion path, lowest
     owner decision cost, highest validation feasibility
   * risk: may feel like a UI library without runtime

2. **Option C — Vendor Adoption and Expansion Intelligence** (3.40)
   * lowest integration burden, fastest revenue cycle
   * risk: weakest differentiation from generic observability

3. **Option B — Autonomy-Profile Runtime** (3.35)
   * strongest differentiation, highest commercial defensibility
   * cost: highest integration burden and owner decision cost;
     hardest to validate before runtime

## Recommendation (subject to owner review)

**Recommend Option A** as the initial wedge, with:

* Phase 2 implementation as scoped in this document (embedded
  admin + resolve API + vendor operating view)
* Phase 3 spike on Option B (resolve + approval + events) if
  Option A produces ≥3 design partners reporting value
* Explicit fallback to Option C if Option A's main risk
  materializes (customers don't use the embedded panel)

Reasoning:

* Option A produces evidence fastest (highest validation feasibility).
* Option A's expansion path leads to Option B naturally.
* Option A does not require a major architecture commitment.
* Option A is testable before runtime exists.
* Option A scores highest under the proposed weighted rubric
  (4.10 vs 3.40 vs 3.35).
* Option A's first-five-customers profile matches the OrbitDesk
  archetype plus three adjacent profiles.

## What the recommendation does not claim

* that Option A will work (it is a hypothesis)
* that Option B is wrong (it is a strong alternative; the
  weighted score is close)
* that the MVP is finalized (owner review is required)
* that the open-core / commercial split is committed
* that the buyer hypothesis is confirmed (Phase 1 E-01 tests it)
* that the autonomy-level vocabulary is correct (Phase 1 E-04
  tests it)
* that any specific price model is correct (Phase 1 E-06 and E-09
  test it)
* that any specific GTM motion will work (Phase 1 E-01, E-05 test
  it)
* that any specific first-five-customers profile will yield the
  right design partners

## Open questions for owner review

1. Are the rubric weights defensible? (Differentiation is
   weighted 0.20; consider whether 0.30 favors Option B more.)
2. Is the recommended expansion path (A → B) preferred over the
   alternative (B → A)?
3. Is the first-five-customers profile the right shape?
4. Should the MVP include both Option A and Option C surfaces
   (embedded admin + intelligence), or strictly Option A?
5. Is the per-customer pricing model (Option A) preferred over the
   per-resolve model (Option B)?
6. Should the MVP ship in a single phase or be staged (e.g.
   embedded admin in Phase 2A, vendor operating view in Phase 2B)?