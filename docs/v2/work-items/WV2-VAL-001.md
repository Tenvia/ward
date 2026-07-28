# WV2-VAL-001 — Prepare Evidence and Pilot Artifacts

## Identity

```text
Work item ID: WV2-VAL-001
Title: Prepare the Ward v2 evidence and paid-pilot artifact set
Status: ACTIVE
Phase: VALIDATION
Owner: Joshua Jenks
Created: July 27, 2026
Activated: July 27, 2026
Repository base: use the current branch fingerprint at orientation
```

## Objective

Create the reusable documentation artifacts required to run Ward v2 Gate 0 and prepare Gate 1 without inventing customer evidence or beginning runtime implementation.

## Why this work is authorized now

`docs/v2/product/DIRECTION_v2.md` accepts the product direction.

`docs/v2/product/EXECUTION_PLAN_v2.md` explicitly authorizes validation and pilot preparation before runtime implementation.

This is the first bounded planning slice in `docs/v2/WORK_BREAKDOWN.md`.

## Canonical sources

Read before editing:

```text
AGENTS.md
docs/v2/product/DIRECTION_v2.md
docs/v2/product/EXECUTION_PLAN_v2.md
docs/v2/product/README.md
docs/v2/WORK_BREAKDOWN.md
docs/v2/MINIMAX_EXECUTION_WORKFLOW.md
docs/v2/templates/WORK_PACKET.md
```

Inspect existing design-partner and evaluation documentation in `docs/` for reusable Ward-specific patterns, but do not copy v1 product assumptions into v2 without checking the direction.

## Existing verified behavior

The repository contains a Ward v1 prototype, evidence ledger, evaluator flow, design-partner materials, and an accepted Ward v2 product direction.

No Ward v2 buyer interviews, selected design partner, pilot capability, willingness-to-pay evidence, or paid-pilot commitment is claimed by this packet.

## Required final behavior

A future operator or MiniMax work window can consistently:

- conduct buyer and workflow interviews;
- reconstruct the existing customer-authority workflow from evidence;
- distinguish facts, signals, hypotheses, and unsupported claims;
- present a bounded paid-pilot offer;
- lock a pilot proof contract after owner approval;
- record product or contract decisions durably;
- rank candidate capabilities without selecting one automatically.

## Single proof surface

> The repository contains a complete, internally consistent, evidence-first artifact set for Ward v2 validation and paid-pilot preparation, with no invented evidence and no runtime implementation.

## Acceptance criteria

| ID | Required result | Verification | Required evidence |
| --- | --- | --- | --- |
| VAL-001 | A role-aware interview guide covers economic buyer, implementation owner, and operational user perspectives | Document review against Gate 0 | Path and completion report |
| VAL-002 | The interview guide distinguishes observed fact, supplied artifact, reported pain, inference, hypothesis, and commercial signal | Required fields and examples present | Path and completion report |
| VAL-003 | A workflow-reconstruction template captures systems, authority sources, ownership, emergency controls, degraded behavior, evidence, and candidate action points | Template review against execution plan questions | Path and completion report |
| VAL-004 | A paid-pilot offer template defines one capability, two tenant cases, integration owner, enforcement mode, degraded behavior, measurable success, term, and price | Template review against Gate 1 | Path and completion report |
| VAL-005 | A pilot proof-contract template locks capability, action, context, typed constraints, profiles, tenant-state semantics, resolve behavior, caching, security, receipts, and non-goals | Template review against direction and execution plan | Path and completion report |
| VAL-006 | A durable decision-record template captures authority, evidence, alternatives, selected behavior, consequences, and supersession | Template review | Path and completion report |
| VAL-007 | A candidate-capability rubric ranks possible pilots by customer impact, boundedness, integration clarity, emergency relevance, evidence availability, security burden, and four-week feasibility | Rubric review; no candidate selected automatically | Path and completion report |
| VAL-008 | All artifacts explicitly prohibit invented customer evidence and preserve the no-runtime-build gate | Cross-document review | Reconciliation statement |

## Required negative and boundary cases

The artifacts must handle or warn against:

- a friendly interviewee expressing enthusiasm without pain evidence;
- a user who is not the economic buyer;
- an asserted workflow with no supporting artifact;
- a candidate capability that requires a generalized policy language;
- a pilot requiring enterprise SSO or multiple business units before value;
- a free design partnership being represented as willingness to pay;
- a proposed capability that cannot identify an execution decision point;
- confidential customer information that should not enter the public repository;
- an operator trying to treat roadmap order as phase authorization.

## Required output paths

Create:

```text
docs/v2/validation/INTERVIEW_GUIDE.md
docs/v2/validation/WORKFLOW_RECONSTRUCTION.md
docs/v2/validation/PAID_PILOT_OFFER.md
docs/v2/validation/CANDIDATE_CAPABILITY_SELECTION.md
docs/v2/templates/PROOF_CONTRACT.md
docs/v2/templates/DECISION_RECORD.md
```

## Allowed paths

```text
docs/v2/validation/**
docs/v2/templates/PROOF_CONTRACT.md
docs/v2/templates/DECISION_RECORD.md
docs/v2/work-items/WV2-VAL-001-COMPLETION.md
```

## Protected paths

```text
apps/**
packages/**
tools/**
examples/**
openapi/**
scripts/**
.github/**
package.json
package-lock.json
Dockerfiles and compose files
database or persistence code
docs/CLAIMS_AND_EVIDENCE.md
README.md
```

## Permission flags

```text
Dependency changes: prohibited
Public contract changes: prohibited
Migration changes: prohibited
Authentication or authorization changes: prohibited
Claims changes: prohibited
Workflow or CI changes: prohibited
```

## Explicit non-goals

- Do not conduct or fabricate interviews.
- Do not name companies as design partners without evidence and permission.
- Do not select the first pilot capability.
- Do not define final pricing.
- Do not implement Ward v2 code.
- Do not modify v1 behavior.
- Do not create the MiniMax behavioral evaluation runner.
- Do not add a generalized research or CRM system.
- Do not create outreach messages or a sales campaign unless separately authorized.

## Decisions delegated to MiniMax

MiniMax may decide:

- document organization and headings;
- neutral example wording;
- table versus form presentation;
- cross-links between the six artifacts;
- small additions that directly improve evidence quality without broadening scope.

## Decisions reserved for the owner

MiniMax must not decide:

- which candidate capability Ward will pursue;
- which companies to approach;
- whether Gate 0 passes;
- pilot pricing or commercial terms;
- whether a free design partner counts as sufficient evidence;
- whether confidential evidence may be published;
- whether runtime implementation begins.

## Implementation constraints

- Reuse terminology from the canonical v2 direction.
- Keep facts, evidence, inference, hypothesis, and recommendation visibly distinct.
- Make templates usable by a human during live work, not only descriptive essays.
- Use prompts that invite concrete examples and artifacts rather than leading agreement.
- Include explicit unknown and contradiction fields.
- Avoid generic product-discovery filler that does not affect Ward's decision.
- Do not embed unsupported market, pricing, buyer, or workflow claims.

## Required execution passes

### Orientation

Produce a read-only orientation using `docs/v2/templates/ORIENTATION_REPORT.md` or an equivalent Voilà artifact.

Inspect existing Ward design-partner materials for useful structure and identify which v1 assumptions must not carry forward.

### Implementation

Create the six required artifacts. Work from Gate 0 and Gate 1 backward so every field supports a decision or evidence requirement.

### Verification

Verify every acceptance ID through cross-document inspection.

Check that terminology and gates agree with the canonical direction and execution plan.

### Reconciliation

Confirm:

- no code changed;
- no protected path changed;
- no customer evidence was invented;
- no pilot capability was selected;
- no pricing was committed;
- no runtime work was implied as authorized;
- every required artifact exists and links coherently.

## Required commands

```bash
git diff --check
git diff --name-only
git status --short
```

If the repository provides a Markdown link or documentation check applicable to these files, run it. Do not add new tooling solely for this packet.

## Required receipts and artifacts

- orientation report or Voilà orientation receipt;
- six required output files;
- acceptance result for VAL-001 through VAL-008;
- `docs/v2/work-items/WV2-VAL-001-COMPLETION.md` using the completion template, unless Voilà stores an equivalent durable completion artifact and the owner approves that location.

## Retry and failure rules

- Do not repeatedly search for nonexistent customer evidence.
- Do not infer that missing repository material means a workflow or buyer fact is true.
- After two materially identical documentation or tool failures, follow `AGENTS.md` failure handling.

## Stop conditions

Stop and request direction when:

- canonical documents conflict materially;
- a required template would commit an unresolved product or commercial decision;
- existing confidential material appears necessary but publication rights are unclear;
- completing an artifact would require changing product direction;
- the task begins to require Voilà implementation rather than Ward documentation.

## Completion contract

Use `docs/v2/templates/COMPLETION_REPORT.md`.

This item cannot be complete while any required artifact or acceptance ID is missing.

## Next work

```text
Recommended same-phase packet: WV2-VAL-002
Automatically authorized: no
Owner gate required: yes
Still unauthorized: interviews, partner outreach, pilot selection, runtime implementation, behavioral-evaluation runner implementation
```
