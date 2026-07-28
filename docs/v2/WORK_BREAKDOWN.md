# Ward v2 Controlled Work Breakdown

> Status: planning and authorization index
>
> Canonical direction: `product/DIRECTION_v2.md`
>
> Execution rules: `../../AGENTS.md` and `MINIMAX_EXECUTION_WORKFLOW.md`

## Purpose

This file defines the available Ward v2 work packets and their authorization relationships.

It is not an open backlog for an agent to execute autonomously.

A work item may be:

```text
DRAFT
READY
ACTIVE
BLOCKED
DECISION_REQUIRED
COMPLETE
INVALIDATED
DEFERRED
```

Only one work item should normally be `ACTIVE` for a MiniMax work window.

## Current phase

```text
VALIDATION
```

Ward v2 runtime implementation is not currently authorized.

## Current active item

### WV2-VAL-001 — Prepare the evidence and pilot artifact set

**Status:** ACTIVE

**Packet:** `work-items/WV2-VAL-001.md`

**Purpose:** create the interview, workflow-reconstruction, paid-pilot, proof-contract, and decision-record artifacts needed to execute Gate 0 and Gate 1 consistently.

This item is documentation and planning only. It does not authorize runtime code.

## Validation phase

### WV2-VAL-001 — Prepare evidence and pilot artifacts

**Status:** ACTIVE

**Dependency:** accepted v2 direction.

**Outcome:** reusable templates and operator guidance for interviews, workflow reconstruction, pilot offers, proof contracts, and recorded decisions.

**Next authorization:** owner review.

### WV2-VAL-002 — Identify and rank candidate pilot capabilities

**Status:** DRAFT

**Dependency:** WV2-VAL-001 complete.

**Outcome:** candidate list scored by customer impact, bounded context, integration clarity, emergency-control relevance, evidence availability, and four-week proof feasibility.

**Owner decision:** select which candidates may be used in outreach.

### WV2-VAL-003 — Run buyer and workflow interviews

**Status:** DRAFT

**Dependency:** approved interview artifacts and outreach targets.

**Outcome:** at least eight completed interviews with evidence classification and reconstructed workflows.

**Execution note:** interview evidence may live outside the public repository when confidential. Repository artifacts should contain redacted summaries and references, not customer secrets.

### WV2-VAL-004 — Evaluate Gate 0

**Status:** DRAFT

**Dependency:** required interview and workflow evidence.

**Outcome:** explicit pass, revise, or stop decision with evidence.

**Phase gate:** owner approval required.

## Pilot commitment phase

### WV2-PILOT-001 — Define paid pilot offer

**Status:** DRAFT

**Dependency:** Gate 0 passed.

**Outcome:** concrete offer with one capability, success measure, integration owner, degraded-mode expectation, pilot term, and price.

### WV2-PILOT-002 — Secure two written pilot commitments

**Status:** DRAFT

**Dependency:** approved offer and target partners.

**Outcome:** two bounded written commitments satisfying Gate 1.

### WV2-PILOT-003 — Lock active pilot proof contract

**Status:** DRAFT

**Dependency:** at least one qualifying pilot commitment and owner-approved capability.

**Outcome:** `docs/v2/pilots/<pilot>/PROOF_CONTRACT.md` with locked semantics.

**Phase gate:** owner approves transition to implementation.

## Authority kernel phase

### WV2-AUTH-001 — Implement pure authority evaluator

**Status:** DEFERRED

**Dependency:** Gate 0 and Gate 1 passed; proof contract locked.

**Outcome:** pure evaluator supporting one capability, one vendor default, two customer profiles, profile version, and emergency precedence.

**Explicit exclusions:** HTTP, UI, approval workflow, generalized policy language, plan system, analytics.

### WV2-AUTH-002 — Persist capability profiles and versions

**Status:** DEFERRED

**Dependency:** WV2-AUTH-001 semantics verified.

**Outcome:** minimum persistent model and restart proof.

### WV2-AUTH-003 — Verify invalid and conflicting configuration behavior

**Status:** DEFERRED

**Dependency:** evaluator and persistence.

**Outcome:** explicit failure behavior pinned by tests and receipts.

## Runtime API phase

### WV2-RUN-001 — Lock resolve OpenAPI contract

**Status:** DEFERRED

**Dependency:** authority kernel verified.

**Outcome:** versioned request, response, errors, cache metadata, profile version, and receipt linkage.

**Protected change:** public contract; owner review required.

### WV2-RUN-002 — Implement authenticated resolve endpoint

**Status:** DEFERRED

**Dependency:** approved API contract and security decision.

### WV2-RUN-003 — Implement caching and degraded-mode proof

**Status:** DEFERRED

**Dependency:** approved freshness and failure semantics.

**Protected decision:** fail-open, fail-closed, last-known-good, and containment-delay behavior.

## Security and receipts phase

### WV2-SEC-001 — Separate runtime and control privileges

**Status:** DEFERRED

**Dependency:** approved pilot trust model.

### WV2-SEC-002 — Verify cross-tenant denial

**Status:** DEFERRED

**Dependency:** authenticated runtime and control paths.

### WV2-RCP-001 — Implement versioned decision receipts

**Status:** DEFERRED

**Dependency:** authority and runtime contracts.

### WV2-RCP-002 — Verify context redaction and persistence

**Status:** DEFERRED

**Dependency:** receipt schema and storage.

## Control Room phase

### WV2-UI-001 — Customer capability profile view

**Status:** DEFERRED

### WV2-UI-002 — One typed profile editor

**Status:** DEFERRED

### WV2-UI-003 — Resolve simulator and receipt detail

**Status:** DEFERRED

### WV2-UI-004 — Emergency precedence demonstration

**Status:** DEFERRED

The Control Room phase does not authorize embedded customer administration.

## Pilot verification phase

### WV2-VER-001 — Deterministic evaluator flow

**Status:** DEFERRED

### WV2-VER-002 — Restart, caching, degraded-mode, and security proof

**Status:** DEFERRED

### WV2-VER-003 — Claims and evaluator package

**Status:** DEFERRED

### WV2-GATE-002 — Advance, narrow, or stop

**Status:** DEFERRED

**Phase gate:** owner decision required.

## Later phases

The following are roadmap phases, not active implementation work:

```text
APPROVAL
DELEGATED_ADMIN
OUTCOME_EVIDENCE
```

No packet in these phases becomes active because a prior technical packet completed. Each requires evidence and owner authorization under `product/DIRECTION_v2.md` and `product/EXECUTION_PLAN_v2.md`.

## Work-item activation rule

To activate a packet:

1. confirm dependencies;
2. copy or complete `templates/WORK_PACKET.md`;
3. assign stable acceptance IDs;
4. declare allowed and protected paths;
5. declare current phase;
6. record owner authorization when required;
7. set exactly one item to `ACTIVE`;
8. provide the packet—not the full backlog—as the MiniMax assignment.

## Completion rule

Completing one packet does not automatically activate the next.

The completion report may recommend a same-phase next packet. Voilà or the owner must still activate it according to the workflow.