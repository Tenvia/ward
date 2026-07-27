# Ward v2 Product Direction

> Status: accepted product direction for planning
>
> Decision date: July 27, 2026
>
> Canonical role: this document defines the product direction Ward v2 will pursue. `MVP_OPTIONS_v2.md` remains useful as pre-decision comparison material, but it is not the source of truth for the selected direction.
>
> Implementation status: planning only. This document does not claim that the v2 contracts, security model, or product surfaces described here are implemented.

## Decision

Ward v2 will evolve into a **customer-autonomy control plane for multi-tenant AI applications**.

Ward v1 proved a narrow operational promise:

> Pause or constrain one customer's AI activity without disrupting every other customer.

Ward v2 generalizes that promise:

> Define what each customer's AI capabilities may do, resolve that authority at runtime, require accountable approval for exceptional actions, and revoke authority immediately when conditions change.

The direction is a deliberately narrow **runtime-first sequence**:

1. **Capability profiles and runtime resolution**
2. **Action-bound human approval**
3. **Delegated customer administration**
4. **Outcome evidence and autonomy recommendations**

This is a narrowed **B → A → C** evolution from the option comparison:

- Start with the core runtime idea from Option B.
- Add the embedded customer-administration surface from Option A after the runtime contract is trusted.
- Add only the control-relevant evidence from Option C after Ward has a real decision surface to improve.

Ward will not begin v2 as an embedded-admin library, a generic analytics dashboard, an AI gateway, a general policy language, or an agent runtime.

## Product thesis

As AI capabilities move into customer-facing software, a vendor needs more than a global feature flag and more than a static entitlement check.

The vendor must answer, for a specific customer and a specific capability:

- Is this action allowed now?
- Is it allowed only within a bounded limit?
- Does it require a human approval?
- Has this customer been temporarily restricted?
- Has the entire customer tenant been paused?
- Which configuration version produced the decision?
- What evidence proves why the action was allowed or denied?

Today, those answers are usually scattered across feature flags, billing entitlements, customer-specific tables, prompt instructions, support runbooks, and emergency controls. The fragmentation creates configuration drift, unclear ownership, weak audit evidence, and unsafe degraded behavior.

Ward v2 provides one explicit authority contract without taking over execution.

The vendor's existing application or agent remains responsible for performing the action. Ward resolves whether that action is authorized and returns the bounded conditions under which it may proceed.

## Natural evolution from Ward v1

Ward v2 must preserve the product identity and trust already earned by Ward v1.

Ward v1 already centers:

- tenant identity;
- per-tenant state;
- `running`, `constrained`, and `paused` semantics;
- approval-token concepts;
- evidence and audit receipts;
- explicit fail-open and fail-closed behavior;
- a Control Room for operators;
- hard proxy enforcement and cooperative SDK enforcement;
- honest distinctions between prototype behavior and production guarantees.

V2 does not discard those ideas. It makes them more precise.

A tenant-wide pause becomes the highest-precedence authority override. A capability profile becomes the normal operating authority below it. Approval becomes an explicit state transition for exceptional actions. Evidence becomes attached to every resolved decision rather than only to incidents and state changes.

The conceptual progression is:

```text
Ward v1
Customer tenant is running, constrained, or paused

        ↓

Ward v2
Customer tenant has bounded authority for each capability,
with emergency containment above every normal rule
```

## Product category

Ward is a **customer-autonomy control plane for multi-tenant AI applications**.

This language is intentionally specific.

Ward is not positioned as:

- a generic policy engine;
- an observability platform;
- a feature-flag service;
- an entitlement or billing system;
- an AI gateway or model router;
- an agent framework;
- an orchestration runtime;
- a customer-success analytics product;
- a compliance certification product.

Ward may integrate with products in those categories, but it should not collapse into them.

## Primary customer and buyer

### Initial customer

The initial customer is a B2B SaaS vendor operating a multi-tenant product with at least one customer-impacting AI capability in production or a serious production pilot.

Strong first-capability examples include:

- issuing or proposing refunds;
- sending customer communications;
- modifying CRM or billing records;
- escalating or resolving support cases;
- executing bounded workflow steps;
- creating or applying customer-visible content;
- initiating an operational change with financial or reputational consequence.

The first customer should already feel configuration pain. Ward should not depend on persuading a company that customer-specific controls matter.

### Economic buyer

The most likely initial economic buyer is an engineering or product leader accountable for safely operating customer-facing AI functionality:

- VP Engineering;
- Head of Platform;
- Head of Application Engineering;
- CTO at a smaller vendor;
- Product leader who owns the AI capability and its customer controls.

The buyer hypothesis remains subject to validation. Ward should record who owns budget, who owns implementation, who owns operational incidents, and who owns customer configuration rather than assuming those are the same person.

### Daily users

The initial operational users are:

- platform or application engineers;
- production support engineers;
- product operations;
- technical customer-success or implementation teams;
- incident responders.

Customer administrators become direct users only after delegated customer administration is introduced.

## Core product promise

A concise v2 promise:

> Ward decides what each customer's AI capabilities may do, routes exceptional actions for accountable approval, and lets the vendor revoke authority instantly.

A more complete guarantee statement:

> For every integrated capability decision, Ward returns an explicit result tied to a customer, capability, action, context, configuration version, and evidence receipt. Emergency tenant state always takes precedence over ordinary customer configuration.

Ward does not guarantee containment for execution paths that bypass every Ward enforcement point. The product must continue to distinguish hard and cooperative enforcement honestly.

## Product principles

### 1. Customer-specific authority is the unit of value

The primary unit is not a model call, prompt, trace, or generic flag. It is the authority granted to a customer for a named product capability.

### 2. Emergency containment outranks normal configuration

A tenant-wide pause or constraint must override plan defaults, customer profiles, temporary exceptions, and cached ordinary decisions.

### 3. Ward decides; the vendor executes

Ward does not become the customer's business workflow runtime. It resolves authority and provides evidence. The vendor's application performs the action.

### 4. The contract must be understandable without a policy language

The first product should use typed, bounded capability configuration. It should not begin with a general-purpose DSL.

### 5. Every decision must be explainable

A vendor should be able to determine:

- what decision Ward returned;
- which layer produced it;
- which profile version was used;
- whether an emergency override applied;
- whether approval was required;
- how long the result was valid;
- which receipt records the evaluation.

### 6. Degraded behavior is part of the product contract

Every integration must state what happens when Ward is slow, unavailable, stale, or unable to resolve configuration.

### 7. Build the authority model before the distribution surface

The embedded customer-admin experience is valuable only when it controls a trusted runtime model. The runtime contract must come first.

### 8. Outcome data must improve control

Ward may later ingest outcomes, but only to help operators understand or improve autonomy decisions. Ward should not drift into a generic analytics dashboard.

### 9. Open-source Ward remains independently useful

Ward must remain a standalone open-source and self-hostable product. A future hosted or commercial offering may add managed operations, enterprise integrations, and organizational scale, but the core authority contract cannot require a separate internal 10via application to function.

### 10. Claims follow evidence

No v2 capability is described publicly as implemented, tested, production-ready, secure, or design-partner-ready until the repository's claims and evidence process supports that statement.

## Domain model

The initial v2 model contains a deliberately small set of concepts.

### Vendor

The software company integrating Ward into its multi-tenant application.

A Ward deployment may initially be single-vendor. Multi-vendor hosted management is not required for the first proof.

### Customer tenant

The vendor's customer account, workspace, organization, or tenant.

A customer tenant is the same operational boundary Ward v1 already uses for containment.

### Capability

A stable product-level identifier for an action or class of action performed by the vendor's AI-enabled product.

Examples:

```text
refund.issue
ticket.reply
campaign.send
crm.contact_update
invoice.adjust
```

A capability identifier must describe product behavior, not a model provider or implementation detail.

### Action

The concrete operation being evaluated within a capability.

For the initial proof, a capability may have only one action. Keeping the concepts separate prevents the contract from assuming that every future capability is atomic.

### Capability profile

The bounded authority assigned to one customer for one capability.

A profile may state:

- enabled or disabled;
- maximum amount or count;
- allowed operating window;
- whether approval is required;
- escalation target;
- temporary expiration;
- profile version.

The MVP should support only the configuration type required by its pilot capability.

### Tenant containment state

The emergency state inherited from Ward v1:

- `running`;
- `constrained`;
- `paused`.

The exact interaction between `constrained` and capability profiles must be defined by the proof contract rather than left implicit.

### Resolve request

A runtime request asking Ward to evaluate authority for:

```text
vendor
customer tenant
capability
action
relevant context
```

### Resolve decision

Ward returns one of three initial decisions:

- `allow`;
- `deny`;
- `require_approval`.

The decision includes bounded constraints, source information, version information, validity, and a receipt identifier.

### Approval request

A later v2.1 object representing a specific exceptional action that requires an authenticated human decision.

### Decision receipt

A stable evidence object recording the inputs, effective configuration source, result, configuration version, timing, and relevant enforcement metadata.

## Authority precedence

The initial precedence model is:

```text
1. Emergency tenant containment state
2. Temporary customer exception
3. Customer capability profile
4. Purchased-plan allowance
5. Vendor capability default
6. Safe product default
```

The MVP does not need to implement every layer.

The first proof should implement only:

```text
1. Emergency tenant containment state
2. Customer capability profile
3. Vendor capability default
```

The remaining layers are reserved so the architecture does not have to be rewritten when plans, temporary exceptions, and organizational inheritance are added.

### Precedence requirements

- A paused tenant must never receive `allow` from a lower layer.
- A constrained tenant must follow an explicitly defined constrained-mode rule.
- A customer profile may narrow a vendor default.
- The MVP should not allow a customer profile to exceed a hard vendor maximum.
- The response must identify the effective source layer.
- Conflicting or invalid configuration must fail visibly rather than silently select an arbitrary value.

## V2 MVP: capability authority proof

The MVP is not the full Option B scope from `MVP_OPTIONS_v2.md`.

It is a bounded proof that Ward can become a trusted customer-capability authority service.

### Proof statement

> One vendor integrates one customer-impacting capability. Two customer tenants receive different bounded authority. The vendor calls one versioned resolve endpoint before execution. Ward returns the correct decision, respects emergency containment, prevents cross-tenant configuration access, and produces a stable evidence receipt.

### Required MVP surface

The proof includes:

1. one vendor deployment;
2. one capability;
3. one typed constraint family;
4. one vendor default;
5. two customer profiles;
6. one emergency tenant override;
7. one versioned resolve endpoint;
8. one vendor-facing Control Room configuration flow;
9. one hard or cooperative enforcement adapter;
10. one decision-receipt view or export.

### Example pilot capability

A strong demonstration capability is bounded refund authority:

```text
Capability: refund.issue

Vendor default:
- deny above $500

Customer Acme:
- allow up to $100
- require approval from $100.01 through $500

Customer Globex:
- allow up to $50
- deny above $50

Emergency state:
- paused tenant denies every refund action
```

The pilot may choose a different capability when a real design partner provides stronger evidence. The contract should remain capability-neutral even when the first proof is specific.

### MVP non-goals

The MVP explicitly excludes:

- multiple vendors in one hosted control plane;
- a generalized policy DSL;
- a broad capability catalog;
- plan CRUD beyond the minimum internal representation;
- business-unit inheritance;
- customer-facing embedded administration;
- SSO or SAML;
- billing-system integration;
- outcome-event ingestion;
- autonomy recommendations;
- generic product analytics;
- ML-based risk scoring;
- real-time collaborative editing;
- production compliance claims;
- automatic profile changes based on heuristics;
- a full approval workflow;
- multi-region or multi-replica production guarantees.

## Runtime resolve contract

The first public contract should be small, explicit, and versioned.

### Request example

```json
{
  "customer_id": "globex",
  "capability": "refund.issue",
  "action": "issue_refund",
  "context": {
    "amount_usd": 250
  },
  "request_id": "req_01J..."
}
```

### Response example

```json
{
  "decision": "require_approval",
  "constraints": {
    "max_amount_usd": 500
  },
  "reason_code": "customer_profile_requires_approval",
  "source_layer": "customer_profile",
  "profile_version": 12,
  "tenant_state": "running",
  "valid_until": "2026-07-27T20:01:00Z",
  "cache": {
    "allowed": true,
    "max_age_seconds": 15
  },
  "receipt_id": "rcpt_01J..."
}
```

### Required response properties

Every response must include:

- an explicit decision;
- a machine-readable reason code;
- the source layer;
- the tenant state evaluated;
- the configuration or profile version;
- validity and cache instructions;
- a stable receipt identifier;
- an echoed or linked request identifier.

### Idempotency

A caller-provided `request_id` should make repeated identical resolution requests observable and safely correlatable.

The initial resolve operation is read-only and should be naturally repeatable. Later approval and token-consumption endpoints will require stronger idempotency rules.

## Caching, freshness, and revocation

Caching cannot be treated as a generic performance detail because Ward is a control product.

### Initial rules

- Ward, not the vendor, determines whether a decision is cacheable.
- The response supplies the maximum permitted cache age.
- `deny` and `require_approval` may use different cache rules from `allow`.
- An ordinary cached decision must never outlive its profile version's validity.
- Emergency tenant containment must have a defined revocation path that is not hidden for an arbitrary client-selected TTL.
- The caller must be able to report which profile version authorized execution.

### Emergency behavior

The proof must choose and demonstrate one of these approaches:

1. no caching for emergency-sensitive decisions;
2. a short bounded TTL with a documented maximum containment delay;
3. active invalidation or a locally replicated emergency-state channel.

The first proof should prefer simplicity and honesty over an unproven real-time invalidation system.

### Stale and unavailable behavior

Each integration must choose an explicit mode:

- fail closed;
- fail open with evidence;
- use last-known-good within a bounded age.

Ward must return or record enough information to distinguish a normal authorization from degraded behavior.

## Enforcement model

Ward v2 retains the v1 distinction between hard and cooperative enforcement.

### Hard enforcement

Ward sits on an unavoidable action path or gateway. An action cannot proceed without passing the Ward-controlled enforcement point.

The guarantee is limited to actions routed through that point.

### Cooperative enforcement

The vendor's application or agent calls Ward before execution and voluntarily obeys the result.

The guarantee is weaker because bypassing the integration bypasses enforcement.

### Product requirement

Every adapter, SDK, example, and public claim must identify which enforcement class it provides.

Ward should never imply hard containment from a cooperative integration.

## Vendor Control Room

The MVP should evolve the existing Ward Control Room rather than begin with a new embedded customer component.

### Required operator flow

The vendor operator can:

1. open a customer tenant;
2. inspect the tenant's emergency state;
3. inspect the configured capability profile;
4. change the one supported constraint;
5. see the new profile version;
6. perform or replay a resolve evaluation;
7. inspect the resulting receipt;
8. pause or constrain the tenant;
9. confirm that emergency state changes the resolve result.

### Control Room non-goals

The MVP Control Room is not:

- a generic no-code policy builder;
- a customer-success analytics dashboard;
- a billing console;
- a customer-facing embedded component;
- an enterprise identity-management surface.

## Security and trust boundary

The v2 MVP cannot defer basic authentication, authorization, or tenant isolation merely because enterprise SSO is deferred.

### Minimum security model

The proof must define:

- how the integrating vendor authenticates runtime calls;
- how operator mutations are authenticated;
- how a request is bound to the correct customer tenant;
- how configuration reads and writes prevent cross-tenant access;
- how secrets and tokens are rotated;
- how replay is detected where relevant;
- how authorization failures are audited;
- how development or demo credentials are visibly distinguished from production guidance.

### Initial deployment assumption

A single-vendor self-hosted deployment may use a simpler credential model than a hosted multi-vendor service, but the model still needs separate runtime and control privileges.

A shared all-powerful token is acceptable only as a clearly labeled local prototype mechanism, not as the target v2 security design.

### Future embedded administration

When delegated customer administration is added, the embed session must be bound to at least:

```text
vendor_id
customer_id
administrator_id
role
allowed_capabilities
issued_at
expires_at
nonce
```

The browser must not be trusted to select an arbitrary customer identity.

## Evidence and receipts

Every resolved decision should be reconstructable.

### Minimum receipt contents

A receipt should contain or reference:

- schema version;
- receipt identifier;
- request identifier;
- timestamp;
- vendor deployment identity;
- customer tenant identity;
- capability and action;
- normalized relevant context or a safe context hash;
- tenant state;
- source layer;
- profile version;
- decision;
- constraints returned;
- degraded-mode status;
- enforcement adapter type;
- latency and expiration metadata.

Sensitive context should not be copied into receipts by default. The schema should distinguish stored context, redacted context, and hashes.

### Evidence boundary

Receipts are operational evidence. They are not automatically legal, regulatory, or compliance certification.

## V2.1: action-bound approval

After runtime resolution is proven, `require_approval` becomes a complete workflow.

### Required state machine

```text
requested
→ approved or denied
→ action-bound token issued
→ token consumed once
→ expired or revoked
```

### Approval binding

An approval must be bound to:

- customer tenant;
- capability;
- exact action;
- relevant context or context hash;
- profile version;
- authenticated approver;
- expiration;
- single-use state.

A confirmation phrase may improve operator intent, but it is not a substitute for authenticated approval.

### V2.1 non-goals

- general workflow orchestration;
- arbitrary multi-step business processes;
- enterprise access-review reporting;
- automatic approval by an LLM.

## V2.2: delegated customer administration

Only after vendors trust Ward's authority resolution should Ward expose selected controls to the vendor's customers.

### Product promise

> Let a vendor safely delegate bounded AI-capability controls to its customer administrators without exposing the vendor's full internal control plane.

### Initial delegated flow

A vendor chooses which settings a customer administrator may change. The embedded surface exposes only those settings and uses a short-lived, customer-bound session.

Examples:

- enable or disable one capability;
- select from vendor-approved autonomy levels;
- lower a maximum amount;
- select an approval queue;
- narrow an operating window.

The customer may narrow authority within vendor boundaries. Expanding beyond the vendor maximum requires a separate vendor-controlled decision.

### Why the embed comes later

The embedded component is a distribution and delegation surface. It is not the source of product defensibility by itself.

The defensible core is the combination of:

- customer-specific capability authority;
- runtime resolution;
- emergency containment;
- action-bound approval;
- evidence receipts.

## V2.3: outcome evidence and recommendations

Ward may later ingest selected usage and outcome events.

The purpose is not to become a generic analytics product. The purpose is to improve autonomy decisions.

### Useful questions

- Is this customer repeatedly succeeding within its current limits?
- Are approval requests almost always accepted?
- Is a capability generating repeated rollbacks or escalations?
- Is the current profile too permissive or too restrictive?
- Should an operator consider changing the profile?

### Recommendation boundary

The initial system recommends changes. It does not silently expand customer authority.

Every recommendation should cite the evidence and heuristic that produced it.

## V2.4 and later expansion

Potential later surfaces include:

- purchased-plan inheritance;
- business-unit or workspace overrides;
- temporary exceptions;
- staged customer rollouts;
- entitlement and billing integrations;
- enterprise identity integration;
- managed hosted control plane;
- multi-vendor operations;
- additional enforcement adapters;
- signed or tamper-evident evidence bundles;
- recommendation review and simulation;
- Kubernetes deployment patterns and higher-availability operation.

These are expansion candidates, not commitments.

## Open-source and commercial boundary

The open-source product should include a useful, complete local authority loop:

- capability definition;
- customer profile;
- resolve contract;
- emergency containment;
- operator Control Room;
- evidence receipts;
- at least one integration example.

A future commercial or hosted product may reasonably add:

- managed hosting and upgrades;
- enterprise identity and RBAC;
- multi-vendor or multi-environment management;
- advanced retention and evidence controls;
- high-availability operation;
- organizational inheritance;
- managed adapters and integrations;
- support and operational guarantees.

The exact boundary remains a commercial hypothesis. It must not make the open-source core dependent on a separate private application.

## Why not lead with the other options

### Why not embedded administration first

Embedded administration is valuable, but leading with it risks making Ward look like another admin UI toolkit. It also forces Ward to solve browser identity, delegated authorization, theming, embed integration, and generalized configuration before proving the authority model.

The embedded surface should sit on top of a trusted runtime contract.

### Why not the full runtime option immediately

The full Option B included profile resolution, approval issuance, approval verification, event ingestion, broad configuration inheritance, audit APIs, and operating metrics. That scope is too large for the first proof and would ossify several contracts at once.

The selected direction keeps only the smallest runtime authority loop.

### Why not intelligence first

An intelligence-first product weakens continuity with Ward's containment identity and risks becoming another dashboard. Outcome evidence becomes more differentiated after Ward owns a real decision surface that the evidence can improve.

## Validation gates

### Gate 0: problem evidence

Do not begin the runtime build only because the architecture is appealing.

Before implementation, obtain:

- at least eight completed workflow interviews across at least two adjacent B2B SaaS categories;
- at least three conversations with a plausible economic buyer;
- at least one reconstructed current configuration and emergency-control workflow using real artifacts;
- evidence that configuration is fragmented across multiple systems or repeatedly rebuilt per customer;
- one falsifiable willingness-to-pay conversation tied to a concrete pilot outcome.

### Gate 1: design-partner commitment

A build begins only when two design partners agree in writing to a bounded pilot containing:

- a named champion;
- one real capability;
- two customer profiles or equivalent tenant cases;
- an integration owner;
- a measurable success condition;
- a defined degraded-mode expectation;
- a time-boxed pilot term;
- a price or explicit paid-pilot commitment.

### Gate 2: advance, narrow, or stop

At the end of the pilot:

| Outcome | Evidence | Action |
| --- | --- | --- |
| Advance | Both pilots complete the target resolve workflow; both can explain and trust the decision evidence; at least one requests expansion | Fund v2.1 approval work |
| Narrow | One pilot completes and the other is blocked by a specific contract, integration, or buyer mismatch | Remove the failing surface and rerun one bounded pilot |
| Stop or reselect | Neither pilot completes, neither will pay after a demonstrated workflow, or the authority problem is consistently solved adequately by existing systems | Stop implementation and revisit the product thesis |

## MVP success measures

The proof succeeds only when it demonstrates product value and trust, not merely API availability.

### Required measures

- A new pilot capability can be represented without adding a general policy language.
- Two customer tenants receive intentionally different results for the same capability and context.
- Cross-tenant configuration access is rejected and evidenced.
- Emergency pause changes the decision according to the documented maximum containment delay.
- Every result identifies its source layer and profile version.
- The integrating vendor can correlate an execution attempt to a decision receipt.
- The vendor can explain degraded behavior and choose the intended mode.
- The first integration is completed within the agreed pilot budget.
- At least one design partner asks to expand into approval or delegated customer administration.

### Invalidating evidence

The direction should be reconsidered if:

- the problem consistently reduces to ordinary feature flags or entitlements;
- vendors will not put Ward on a decision path even cooperatively;
- vendors cannot identify a customer-impacting capability with different per-customer authority;
- the integration cost exceeds the value of consolidating configuration;
- customers require a generalized policy language before the first useful workflow exists;
- emergency containment and ordinary capability authority do not belong in the same operational ownership boundary;
- design partners value only analytics and do not value the authority contract.

## Risks

### Contract ossification

Early partners may pull the API toward their internal data model.

Mitigation: keep the first capability specific, version the contract, use stable product identifiers, and require owner approval for generalized fields.

### Integration resistance

Vendors may avoid placing a new dependency on an execution path.

Mitigation: provide explicit cooperative and hard-enforcement options, document degraded modes, support bounded caching, and prove value with one decision point before expanding.

### Category confusion

Ward may be mistaken for a feature-flag service, policy engine, or AI gateway.

Mitigation: keep public examples centered on customer autonomy, approval, emergency revocation, and evidence.

### Security burden

A control plane becomes dangerous if identity and tenant isolation are weak.

Mitigation: include the trust model in the MVP, separate runtime and control privileges, test cross-tenant denial, and avoid presenting prototype shared-token auth as the target design.

### Excessive scope

The runtime direction can easily absorb approvals, analytics, plans, identity, and workflow orchestration.

Mitigation: preserve the proof-surface boundary and require a passed gate before starting each later phase.

### Open-source and hosted divergence

Commercial pressures could make the open-source project incomplete.

Mitigation: define the useful local authority loop as an open-source product invariant.

## Decisions locked by this document

The following decisions are accepted unless new evidence requires a recorded change:

1. Ward v2 is a customer-autonomy control plane for multi-tenant AI applications.
2. The sequence is narrow runtime authority → approval → delegated administration → outcome recommendations.
3. Emergency tenant state remains the highest-precedence control.
4. The vendor's system executes; Ward resolves authority.
5. The MVP uses one capability and one typed constraint family.
6. The first runtime result set is `allow`, `deny`, and `require_approval`.
7. The MVP includes decision versioning and receipts.
8. The MVP includes a defined security and degraded-mode model.
9. Embedded customer administration is not part of the initial MVP.
10. Generic analytics and ML recommendations are not part of the initial MVP.
11. A general-purpose policy DSL is not part of the initial MVP.
12. Open-source Ward remains independently useful and self-hostable.

## Open implementation questions

These questions must be resolved during planning without reopening the product direction unnecessarily:

1. Which real design-partner capability should anchor the first proof?
2. What is the exact semantic meaning of `constrained` in the capability-authority model?
3. Which typed constraint family is sufficient for the first capability?
4. What maximum containment delay is acceptable when ordinary decisions are cached?
5. Which degraded mode is the default for the first adapter?
6. Which authentication mechanism replaces the shared prototype control token for the target design?
7. Should the first integration use the existing proxy path, a dedicated action gateway, or the cooperative SDK?
8. What receipt context is stored, redacted, or hashed?
9. What is the minimum persistent storage contract for the pilot?
10. Which v1 API and UI concepts can be retained without creating misleading compatibility expectations?

## Repository relationship

Use these documents together:

- `MVP_OPTIONS_v2.md` — pre-decision comparison and hypothesis inventory;
- `DIRECTION_v2.md` — canonical selected product direction;
- `EXECUTION_PLAN_v2.md` — bounded validation and implementation sequence.

When these documents conflict, `DIRECTION_v2.md` governs the product direction. The execution plan may refine sequencing and acceptance criteria but must not broaden the product without a recorded decision.