# Ward v2 Execution Plan

> Status: planning baseline
>
> Direction source: `DIRECTION_v2.md`
>
> Planning date: July 27, 2026
>
> Current authorization: validation and planning only. Runtime implementation begins only after Gate 0 and Gate 1 are satisfied or the owner records a deliberate exception.

## Purpose

This document converts the accepted Ward v2 product direction into a bounded, evidence-first execution sequence.

The first objective is not to build the entire customer-autonomy control plane. It is to prove one narrow statement:

> One vendor can use Ward to resolve different bounded authority for two customer tenants on one real AI capability, emergency containment always wins, and every decision is explainable through a stable receipt.

Everything in this plan exists to prove or invalidate that statement.

## Relationship to other planning documents

- `MVP_OPTIONS_v2.md` records the pre-decision option comparison.
- `DIRECTION_v2.md` defines the selected product direction and product boundaries.
- This file defines validation, implementation slices, acceptance gates, evidence, and handoff rules.

If this execution plan conflicts with the product direction, `DIRECTION_v2.md` wins.

## Execution doctrine

### One proof surface at a time

Each implementation slice must produce one externally inspectable proof. Do not open a second major surface because it is convenient while the first is unfinished.

### No hidden platform build

Do not quietly build generalized plans, arbitrary rules, analytics, workflow orchestration, or enterprise identity behind the MVP. A reusable internal abstraction is acceptable only when the current proof requires it.

### Contracts before polish

A stable runtime decision contract, tenant isolation, degraded behavior, and evidence matter more than a broad UI.

### Evidence travels with every claim

Each completed slice must update or create:

- acceptance criteria;
- automated verification where practical;
- a reproducible manual or end-to-end proof;
- a receipt or captured artifact;
- claims and caveats;
- a decision note when scope or semantics changed.

### Stop at gates

Voilà or another coding harness must not automatically continue into approval, embedded administration, analytics, or generalized policy work after completing the MVP proof.

The owner must explicitly authorize the next phase based on evidence.

## Project state model

The v2 effort moves through these states:

```text
DIRECTION_ACCEPTED
        ↓
EVIDENCE_COLLECTION
        ↓
PILOT_COMMITTED
        ↓
PROOF_CONTRACT_LOCKED
        ↓
PROOF_IMPLEMENTATION
        ↓
PROOF_VERIFICATION
        ↓
PILOT_EVALUATION
        ↓
ADVANCE | NARROW | STOP
```

A state change should be recorded in the repository with:

- date;
- owner;
- evidence reviewed;
- decision;
- next authorized slice;
- explicitly unauthorized follow-on work.

## Gate 0: evidence before implementation

### Required interview coverage

Complete at least eight workflow interviews across at least two adjacent B2B SaaS categories.

The interview set should include:

- at least three plausible economic buyers;
- at least three implementation or platform owners;
- at least two operational users such as production support, implementation, technical customer success, or incident response.

A person may satisfy more than one role, but the notes must distinguish the perspectives.

### Required reconstructed workflow

At least one interview must produce a concrete reconstruction of the current authority workflow using artifacts such as:

- feature-flag configuration;
- entitlement checks;
- customer-specific database records;
- prompt instructions;
- support or implementation runbooks;
- approval screenshots;
- incident tickets;
- emergency-control procedures;
- architecture diagrams;
- sample action logs.

The reconstruction must answer:

1. Where is customer-specific authority stored today?
2. Which systems are consulted before an action?
3. Who can change the authority?
4. How does emergency containment work?
5. What happens when a system is unavailable?
6. How is a decision later explained?
7. Which action would be a credible Ward pilot?

### Required pain evidence

The evidence must show at least one repeated problem:

- configuration is duplicated across systems;
- customer-specific controls are repeatedly rebuilt;
- entitlement and operational authority disagree;
- emergency controls are global or dangerously manual;
- approval is detached from the exact action;
- the vendor cannot reconstruct why an action was allowed;
- the vendor has experienced or narrowly avoided a customer-specific incident.

### Required commercial evidence

At least one economic-buyer conversation must test a concrete pilot offer containing:

- one capability;
- one integration point;
- two tenant profiles;
- a four-week proof target;
- a measurable outcome;
- a price or paid commitment.

Record the buyer's objection separately from the price response.

### Gate 0 pass rule

Gate 0 passes when the owner can identify:

- a repeated authority problem;
- a plausible buyer;
- a real capability;
- an integration owner;
- a reason the problem is not adequately solved by ordinary flags or entitlements;
- a credible willingness-to-pay signal.

### Gate 0 failure rule

Stop or revise the direction if interviews consistently show that:

- ordinary feature flags solve the problem;
- customer-specific authority is not operationally important;
- vendors will not place a control dependency on the action path;
- buyers care only about generic analytics;
- every credible capability requires a general policy language before value appears.

## Gate 1: paid pilot commitment

Implementation begins only when two design partners agree in writing to a bounded pilot.

Each pilot agreement must identify:

- economic buyer or sponsor;
- named champion;
- implementation owner;
- one capability;
- two customer-tenant cases or equivalent profiles;
- current workflow and workaround;
- selected Ward enforcement mode;
- degraded-mode expectation;
- success measure;
- pilot term;
- payment or explicit paid-pilot commitment;
- data and security constraints;
- permission to use anonymized operational evidence if applicable.

### Pilot disqualifiers

A pilot is not ready when:

- the capability is still hypothetical;
- the vendor cannot identify the action decision point;
- no one owns the integration;
- the success measure is only “the demo looks useful”;
- the pilot requires enterprise SSO, multiple business units, billing integration, or a generalized rule engine before the first resolve call;
- the vendor requires production-grade guarantees that the current project cannot honestly provide.

## Proof contract lock

Before implementation, create a short pilot-specific contract document.

Recommended path:

```text
docs/v2/pilots/<pilot-name>/PROOF_CONTRACT.md
```

The proof contract must lock:

- capability identifier;
- action identifier;
- context fields;
- typed constraint family;
- vendor default;
- two customer profiles;
- `running`, `constrained`, and `paused` semantics;
- resolve response semantics;
- cache and freshness rules;
- degraded mode;
- authentication model;
- receipt fields;
- success and failure examples;
- out-of-scope requests.

Do not begin generalized API or UI implementation until this contract exists.

## MVP proof surface

### Required scenario

The reference scenario uses one bounded capability. A refund example is suitable for repository demonstrations, but a real pilot capability governs implementation when available.

Reference configuration:

```text
Capability: refund.issue
Action: issue_refund
Constraint: amount_usd

Vendor hard maximum:
- deny above $500

Acme profile:
- allow through $100
- require approval from $100.01 through $500

Globex profile:
- allow through $50
- deny above $50
```

Reference cases:

| Tenant | State | Amount | Expected result |
| --- | --- | ---: | --- |
| Acme | running | $50 | allow |
| Acme | running | $250 | require_approval |
| Acme | running | $750 | deny |
| Globex | running | $50 | allow |
| Globex | running | $250 | deny |
| Globex | paused | $25 | deny because emergency state wins |

The final pilot matrix may differ, but it must preserve distinct tenant outcomes and emergency precedence.

## Workstream 1: domain and persistence

### Objective

Represent the minimum authority model without creating a general policy platform.

### Required entities

- capability definition;
- vendor default;
- customer capability profile;
- profile version;
- tenant containment state;
- decision receipt.

### Minimum persistence behavior

- profiles survive process restart in the pilot deployment mode;
- profile updates create a new version rather than silently mutating history;
- the effective current version is queryable;
- receipts retain the version used for each decision;
- deleted or superseded profiles remain reconstructable according to the pilot retention rule;
- cross-tenant reads and writes are rejected.

### Prohibited scope

- generalized plan management;
- arbitrary inheritance graphs;
- business-unit hierarchy;
- policy DSL;
- generic JSON-expression engine;
- multi-vendor hosted tenancy.

### Acceptance criteria

1. One capability can be registered with one typed constraint.
2. A vendor default and two customer profiles can be persisted.
3. Updating a profile produces an incremented or otherwise unique version.
4. Previous receipt-to-version relationships remain valid.
5. A tenant cannot read or mutate another tenant's customer-facing configuration path.
6. Emergency state is evaluated separately from ordinary profile configuration.

## Workstream 2: runtime resolve API

### Objective

Provide one versioned, read-only decision endpoint.

### Candidate route

```text
POST /v2/resolve
```

The final namespace may change during contract review. Do not imply compatibility with the existing v1 OpenAI-compatible proxy merely because both use HTTP.

### Request

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

### Success response

```json
{
  "decision": "deny",
  "constraints": {
    "max_amount_usd": 50
  },
  "reason_code": "customer_limit_exceeded",
  "source_layer": "customer_profile",
  "profile_version": 7,
  "tenant_state": "running",
  "valid_until": "2026-07-27T20:01:00Z",
  "cache": {
    "allowed": true,
    "max_age_seconds": 15
  },
  "request_id": "req_01J...",
  "receipt_id": "rcpt_01J..."
}
```

### Required error classes

The contract should distinguish at least:

- invalid request;
- unauthenticated caller;
- unauthorized customer or capability;
- unknown capability;
- unknown customer profile;
- invalid stored configuration;
- policy or storage unavailable;
- internal evaluation failure.

Do not collapse operational failures into an ordinary `deny` without recording that the result came from degraded behavior.

### Required semantics

- Resolve is read-only.
- `request_id` supports correlation and safe retries.
- The response always identifies tenant state and profile version.
- `paused` takes precedence over every ordinary profile.
- `constrained` behavior is explicitly defined before implementation.
- A vendor hard maximum cannot be exceeded by a customer profile.
- Invalid or conflicting configuration fails visibly.
- The response states whether and how long it may be cached.

### Acceptance criteria

1. Every case in the pilot matrix returns the expected decision.
2. Repeated identical requests are correlatable by request identifier.
3. Unknown capabilities and malformed context fail with documented errors.
4. A paused tenant never receives `allow`.
5. The receipt can reconstruct the evaluated source and version.
6. The selected degraded mode is demonstrated deliberately.
7. Latency is measured locally and reported honestly without converting it into a production SLA.

## Workstream 3: authentication and authorization

### Objective

Create a credible pilot trust boundary rather than extending the shared prototype token as the target architecture.

### Required privilege separation

At minimum, separate:

- runtime resolve permission;
- control and profile mutation permission;
- evidence read permission.

A single local demo credential may exercise all permissions only when clearly labeled as demo-only.

### Required bindings

A runtime credential must be associated with the correct vendor deployment and allowed customer scope.

An operator credential must be authorized for profile changes and tenant-state changes.

### Required negative tests

- missing credential;
- invalid credential;
- runtime credential attempting mutation;
- customer A identity attempting customer B access;
- unauthorized capability;
- expired or revoked credential where supported;
- replay attempt for any state-changing control operation.

### Acceptance criteria

1. Runtime and control privileges are distinguishable.
2. Cross-tenant access fails before data is disclosed.
3. Authorization failures create evidence without leaking secrets.
4. The local evaluation path does not teach users to deploy a known demo token publicly.
5. Security caveats are synchronized with the claims ledger.

## Workstream 4: caching and degraded behavior

### Objective

Make freshness and failure semantics an explicit part of the control contract.

### Pilot decision

The proof contract must choose one default:

- fail closed;
- fail open with explicit degraded evidence;
- last-known-good within a maximum age.

Different adapters may eventually support different choices. The first proof needs one documented behavior.

### Cache requirements

- Ward returns cache permission and maximum age.
- The caller does not invent a longer TTL.
- A cached decision records its profile version.
- The maximum emergency-containment delay is documented and demonstrated.
- Stale use is distinguishable from a live resolve.
- An `allow` decision does not survive indefinitely during Ward unavailability.

### Acceptance criteria

1. Cacheable and non-cacheable responses are distinguishable.
2. A profile update produces a new version and eventually invalidates the old result within the documented bound.
3. Emergency pause takes effect within the documented maximum delay.
4. Ward unavailability produces the selected degraded behavior and evidence.
5. Recovery from unavailability returns the caller to normal resolution without silently retaining stale state.

## Workstream 5: decision receipts

### Objective

Make every runtime result explainable and correlatable.

### Minimum receipt schema

```text
schema_version
receipt_id
request_id
timestamp
vendor_deployment_id
customer_id
capability
action
context_hash or redacted context
tenant_state
source_layer
profile_version
decision
constraints
reason_code
degraded_mode
enforcement_class
valid_until
latency_ms
```

### Context handling

The proof contract must classify each context field as:

- stored;
- redacted;
- hashed;
- discarded after evaluation.

The default should minimize stored customer data.

### Required evidence flows

- inspect one receipt from the Control Room;
- fetch or export one receipt through a documented API or CLI path;
- correlate an example vendor execution attempt to its receipt;
- show a receipt for emergency denial;
- show a receipt for degraded behavior;
- verify receipt persistence across restart in the selected storage mode.

### Acceptance criteria

1. Receipt identifiers are stable and unique.
2. Receipt schema is versioned.
3. Receipt-to-profile-version linkage survives restart.
4. Sensitive context follows the documented handling rule.
5. Operational evidence is not described as legal or compliance certification.

## Workstream 6: Vendor Control Room

### Objective

Extend the existing operator experience enough to configure and prove the authority loop.

### Required views

#### Customer capability profile

Display:

- customer identity;
- tenant state;
- capability identifier;
- current typed constraint;
- source and current profile version;
- last updated information;
- recent decision receipts for that capability.

#### Profile edit

Allow the operator to change only the supported pilot constraint.

The UI should explain the vendor hard maximum and prevent the operator from entering an invalid value.

#### Resolve simulator

Allow an operator to submit the pilot context and inspect the exact result without executing the external business action.

#### Emergency control

Reuse or evolve the current pause and constrain flow. After a state change, the UI should make it easy to rerun the resolve simulation and see precedence take effect.

#### Receipt detail

Display the decision, reason, source layer, profile version, tenant state, validity, degraded status, and safe context representation.

### UI non-goals

- customer-facing embed;
- arbitrary form generation;
- capability marketplace;
- generalized policy builder;
- cross-customer analytics;
- adoption or expansion recommendations;
- enterprise SSO administration;
- billing and plan management.

### Acceptance criteria

1. A first-time evaluator can reproduce the complete proof through the UI and one integration example.
2. Invalid profile edits are prevented or rejected clearly.
3. The current profile version is visible after mutation.
4. Emergency state and ordinary profile configuration are visually distinct.
5. A receipt can be opened directly from a resolve result.

## Workstream 7: enforcement adapter and sample integration

### Objective

Prove that a real application can consult Ward before one customer-impacting action.

### Adapter choice

Choose exactly one primary adapter for the first proof:

- cooperative SDK or direct HTTP integration;
- action gateway;
- an extension of the existing proxy where the capability semantics genuinely fit.

Do not implement all three in the first slice.

### Required guarantee statement

The sample must state whether enforcement is:

- hard; or
- cooperative.

The demonstration must show what happens when the integration is bypassed. Cooperative enforcement cannot be presented as unavoidable containment.

### Sample application behavior

The sample application should:

1. accept a customer and action request;
2. call Ward resolve;
3. obey `allow`, `deny`, or `require_approval`;
4. record the receipt identifier with the application attempt;
5. demonstrate the selected degraded mode;
6. show that a paused customer is denied while another customer continues.

### Acceptance criteria

1. The integration diff is small enough to explain.
2. The action cannot accidentally proceed after a `deny` result in the sample.
3. `require_approval` does not pretend that approval exists before v2.1; it should halt with a clear pending-approval result.
4. The sample records the receipt identifier.
5. The bypass limitation is documented honestly.

## Workstream 8: contract, tests, and claims

### API contract

Update or add an OpenAPI contract for the proof endpoint and evidence reads.

The contract must describe prototype status and degraded behavior, not only happy-path schemas.

### Unit coverage

At minimum, unit tests should cover:

- authority precedence;
- vendor hard maximum;
- profile versioning;
- typed constraint validation;
- all three decision results;
- paused precedence;
- constrained semantics;
- unknown customer and capability;
- invalid stored configuration;
- receipt construction;
- context redaction or hashing;
- authorization helper behavior;
- cache metadata.

### Integration coverage

At minimum:

- persistence across restart;
- runtime authentication;
- control authorization;
- cross-tenant rejection;
- complete pilot matrix;
- degraded mode;
- cache expiration or invalidation bound;
- receipt retrieval;
- profile update and new version;
- emergency state transition and changed decision.

### End-to-end coverage

One deterministic evaluator flow should prove:

```text
boot
→ create or load capability and two profiles
→ Acme allowed
→ Globex denied for same context
→ update Acme profile
→ new profile version changes result
→ pause Globex
→ emergency state denies an otherwise allowed action
→ inspect receipts
→ restart
→ configuration and receipts remain available
→ tear down cleanly
```

### Claims sync

Before any public v2 announcement:

- add v2 rows to the claims and evidence ledger;
- label every new surface as planned, prototype, tested, or demo-supported accurately;
- update README language only after the proof is reproducible;
- avoid production, compliance, HA, or enterprise-security claims;
- record benchmark scope and environment.

## Four-week proof sequence

This sequence assumes Gate 0 and Gate 1 have passed and one engineer is responsible for the bounded proof. It is a planning hypothesis, not a delivery promise.

### Week 1: contract and authority kernel

Deliverables:

- pilot proof contract;
- capability and profile model;
- precedence table;
- persistence migration or storage representation;
- profile versioning;
- authority evaluator unit tests;
- draft resolve OpenAPI schema;
- recorded decision on `constrained` semantics;
- recorded degraded-mode choice.

Exit gate:

- every pilot matrix row can be evaluated in deterministic unit tests;
- no UI or generalized catalog work is required to demonstrate the kernel.

### Week 2: runtime, security, and receipts

Deliverables:

- authenticated resolve endpoint;
- runtime and control privilege separation;
- receipt creation and retrieval;
- context handling;
- cache metadata;
- persistence across restart;
- negative authorization tests;
- degraded-mode integration test.

Exit gate:

- the API proof works without the Control Room;
- cross-tenant and missing-credential cases are verified;
- every result produces a receipt.

### Week 3: Control Room and sample integration

Deliverables:

- customer capability profile view;
- one typed profile editor;
- resolve simulator;
- receipt detail;
- emergency-control connection;
- one sample integration;
- explicit hard or cooperative guarantee statement.

Exit gate:

- a first-time evaluator can reproduce the core proof using documented steps;
- the UI has not expanded into generalized administration.

### Week 4: verification and pilot package

Deliverables:

- deterministic end-to-end proof;
- restart and persistence proof;
- cache and containment-delay proof;
- security-negative proof;
- updated claims ledger;
- evaluator guide;
- design-partner pilot guide;
- known limitations;
- evidence bundle or receipt set;
- owner decision packet.

Exit gate:

- all acceptance criteria are mapped to evidence;
- no critical claim relies only on manual belief;
- the owner can choose advance, narrow, or stop.

## Verification matrix

| Area | Required proof | Minimum evidence |
| --- | --- | --- |
| Authority | Different tenants receive correct decisions | Unit matrix + live E2E |
| Precedence | Emergency state wins | E2E with before/after receipt |
| Versioning | Profile update changes version | API/UI test + receipt linkage |
| Isolation | Cross-tenant access rejected | Negative integration test |
| Authentication | Runtime and control privileges differ | Negative integration tests |
| Persistence | Profiles and receipts survive restart | Restart smoke |
| Degraded mode | Selected failure behavior occurs | Forced-failure smoke |
| Caching | Maximum stale window is bounded | Time-controlled integration test |
| Evidence | Execution correlates to receipt | Sample app + receipt export |
| Usability | Evaluator reproduces proof | Evaluator runbook and clean-room run |
| Claims | Public language matches evidence | Claims-ledger review |

## Pilot evaluation

### Technical questions

- Did the integration land on the intended action path?
- Did the vendor trust the resolve result?
- Was the profile model sufficient without a policy DSL?
- Could the operator explain why each result occurred?
- Was the maximum containment delay acceptable?
- Did degraded behavior match operational expectations?
- Were security and tenant boundaries credible for the pilot?

### Product questions

- Did consolidating authority remove real duplicated work?
- Did the vendor use the Control Room after initial setup?
- Did emergency containment and ordinary authority feel like one coherent product?
- Which role received the most value?
- Did the vendor ask for approval, customer delegation, or additional capabilities?
- Would the vendor pay to continue?

### Commercial questions

- Who ultimately approved payment?
- Which unit of value made sense: configured customer, capability, platform minimum, or another unit?
- Did the pilot reduce implementation time, incident risk, or operational uncertainty?
- What expansion request appeared first?
- What prevented an annual commitment?

## Gate 2: advance, narrow, or stop

### Advance to v2.1 approval

Advance when:

- two pilots complete the target resolve workflow;
- both can explain and trust the decision evidence;
- the integration cost is acceptable relative to the problem;
- at least one partner requests real approval workflow;
- at least one partner is willing to continue paying or expand.

Authorized next work:

- approval request state machine;
- authenticated approve or deny action;
- action-bound, short-lived, single-use token;
- approval receipt chain;
- one approval UI path.

Still unauthorized:

- embedded customer administration;
- generic analytics;
- ML recommendations;
- generalized workflow orchestration.

### Narrow and rerun

Narrow when one pilot succeeds and another fails for a specific reason.

Possible narrowing moves:

- remove caching from the first adapter;
- reduce the context shape;
- support only `allow` and `deny` temporarily while preserving the future result enum;
- use one enforcement adapter only;
- replace a weak pilot capability;
- reduce the Control Room to configuration and receipts;
- choose a more credible buyer or operational owner.

A narrow decision must name the removed surface and the new falsifiable test.

### Stop or reselect

Stop when:

- neither pilot completes;
- neither partner will pay after a working demonstration;
- the product is consistently treated as an unnecessary layer over feature flags;
- vendors refuse every credible enforcement path;
- the authority and containment functions belong to different buyers and operating systems with no useful shared workflow;
- the only valued surface is generic analytics.

Stopping is a valid evidence-based outcome, not a delivery failure.

## Later-phase entry criteria

### V2.1 approval

Requires a completed runtime proof and at least one real `require_approval` workflow request.

### V2.2 delegated customer administration

Requires:

- vendors already using Ward profiles operationally;
- at least two partners asking to delegate bounded settings;
- a documented browser trust model;
- customer-bound session design;
- clear vendor maximums that customers cannot exceed.

### V2.3 outcome recommendations

Requires:

- stable capability and decision identifiers;
- partners willing to emit relevant events;
- a question tied to control decisions rather than generic reporting;
- explicit, inspectable heuristics;
- evidence that recommendations will be acted upon.

## Risk register

| Risk | Early signal | Mitigation | Stop condition |
| --- | --- | --- | --- |
| Integration dependency is rejected | Vendors refuse action-path calls | Cooperative adapter, bounded cache, explicit degraded modes | No credible pilot accepts any enforcement path |
| Model becomes a policy DSL | Every capability demands arbitrary expressions | Keep one typed capability; record unsupported cases | No useful workflow exists without a general language |
| Security scope expands | Pilot requires enterprise identity before proof | Single-vendor deployment, separated privileges, clear prototype boundary | Basic isolation cannot be made credible |
| UI consumes the project | Requests focus on forms and theming | Keep UI to one typed editor and proof simulator | Runtime value remains unclear without broad UI |
| Analytics drift | Partners ask only for dashboards | Tie events to control questions | Authority contract has no buyer value |
| Contract ossifies around one customer | Partner-specific fields enter core schema | Stable identifiers, context map, versioning, owner review | Second pilot cannot use the contract without rewrite |
| Emergency containment conflicts with caching | Stale allow survives too long | Short TTL or no cache, measured maximum delay | Acceptable containment delay cannot be achieved |
| Open-source core is weakened | Essential loop moves to private service | Preserve local complete authority loop | Self-hosted version cannot perform the proof |

## Required repository artifacts

Before implementation:

```text
docs/v2/product/DIRECTION_v2.md
docs/v2/product/EXECUTION_PLAN_v2.md
docs/v2/pilots/<pilot-name>/PROOF_CONTRACT.md
docs/v2/pilots/<pilot-name>/EVIDENCE_SUMMARY.md
```

During implementation, add or update as appropriate:

```text
openapi/ward.v2.yaml or an explicitly versioned draft contract
architecture decision records for authority, caching, auth, and receipts
claims-and-evidence rows
security and trust-boundary note
evaluator guide
design-partner guide
verification script or deterministic E2E
receipt examples
known-limitations document
```

File names may be adapted to existing repository conventions. The artifact roles are required even when paths change.

## Voilà execution protocol

Voilà should treat this project as a sequence of bounded slices, not as permission to implement the whole roadmap.

### Required orientation before each slice

1. Read `DIRECTION_v2.md`.
2. Read this execution plan.
3. Read the active pilot proof contract.
4. Inspect current repository claims and evidence.
5. Inspect relevant v1 behavior before proposing replacement.
6. State the single proof surface for the session.
7. List explicitly excluded follow-on work.

### Slice completion record

Each completed slice should record:

- objective;
- files changed;
- contract affected;
- tests run;
- receipts or evidence produced;
- known failures or skipped checks;
- claims updated;
- decisions introduced;
- next bounded slice;
- work that remains unauthorized.

### Stop conditions for the harness

Stop and request owner direction when:

- a required product semantic is undefined;
- implementing the slice requires broadening into a non-goal;
- a proof contract conflicts with the product direction;
- security or tenant isolation cannot be demonstrated;
- a test or receipt contradicts a public claim;
- the next work crosses a phase gate;
- a design-partner request would generalize the data model significantly;
- implementation requires changing v1 guarantees without an explicit decision.

## First authorized planning slice

Until Gate 0 and Gate 1 pass, the next bounded repository work is:

1. prepare the v2 interview guide;
2. define the workflow-reconstruction template;
3. define the paid-pilot offer template;
4. create the pilot proof-contract template;
5. create a decision-record template;
6. identify candidate capabilities and selection criteria;
7. do not implement runtime v2 code.

After pilots are committed, the first implementation slice is:

> Implement and verify the pure authority evaluator for one capability, one vendor default, two customer profiles, and emergency tenant precedence, with no HTTP API or UI until the decision matrix is pinned by tests.

That slice should be small enough to reject or revise the product semantics before they become a public contract.