# MiniMax Execution Workflow for Ward and Voilà

> Status: required workflow for MiniMax-led Ward v2 work
>
> Scope: repository execution discipline and harness integration
>
> Separate concern: behavioral evaluation design is documented in `MINIMAX_BEHAVIORAL_EVALUATION.md`; the implementation prompt for adding that evaluation system to Voilà is intentionally deferred to a separate task.

## Purpose

MiniMax is most useful when it receives a bounded engineering problem, clear evidence sources, limited decision authority, and an explicit completion contract.

This workflow prevents four common failure modes:

1. drifting into adjacent work;
2. inventing missing product semantics;
3. selecting a larger or more generalized solution than the proof requires;
4. declaring completion from persuasive prose instead of evidence.

The workflow is designed to operate at two levels:

- **Repository level:** files, work packets, acceptance IDs, decisions, receipts, and claims remain durable in Git.
- **Harness level:** Voilà controls active phase, allowed paths, mutation provenance, retries, verification, and structured completion.

The repository remains the source of product truth. Voilà may maintain live execution state, but it must not become a competing product-specification system.

## Core execution loop

```text
Repository truth
        ↓
Owner-authorized work packet
        ↓
Read-only orientation
        ↓
Bounded implementation
        ↓
Fresh-context verification
        ↓
Reconciliation and receipts
        ↓
Owner-controlled next authorization
```

MiniMax does not choose the next product problem while implementing the current one.

## Required inputs for every work window

A MiniMax work window must receive:

1. repository commit or fingerprint;
2. current phase;
3. active work-item ID;
4. active work packet;
5. canonical source paths;
6. allowed and protected paths;
7. stable acceptance IDs;
8. required test and verification commands;
9. required receipts or evidence;
10. explicit non-goals;
11. decisions delegated to the model;
12. decisions reserved for the owner;
13. stop conditions;
14. completion-report schema.

Do not start a work window with only “continue Ward v2,” “implement the plan,” or a large roadmap document.

## Workflow states

Voilà should track one of these execution states for an active work item:

```text
CREATED
ORIENTING
READY_TO_IMPLEMENT
IMPLEMENTING
READY_TO_VERIFY
VERIFYING
RECONCILING
COMPLETE
BLOCKED
DECISION_REQUIRED
INVALIDATED
```

### State rules

- `CREATED` means the packet exists but has not been oriented.
- `ORIENTING` is read-only.
- `READY_TO_IMPLEMENT` means required sources and semantics are resolved.
- `IMPLEMENTING` permits mutations only within packet boundaries.
- `READY_TO_VERIFY` means the builder asserts implementation is ready, not that it is complete.
- `VERIFYING` should use a fresh context when practical.
- `RECONCILING` compares the contract, diff, checks, receipts, and non-goals.
- `COMPLETE` requires valid structured completion.
- `BLOCKED` means work cannot proceed because of environment or dependency conditions.
- `DECISION_REQUIRED` means model authority is insufficient.
- `INVALIDATED` means the packet's assumptions or product semantics were disproved.

A harness must not skip directly from `IMPLEMENTING` to `COMPLETE`.

## Pass 1: read-only orientation

### Goal

Build a repository-grounded execution model before changing files.

### Required MiniMax output

```text
Work item:
Current phase:
Repository fingerprint:
Canonical sources read:
Existing behavior inspected:
Single proof surface:
Acceptance IDs:
Allowed paths:
Protected paths:
Planned files:
Explicit non-goals:
Risks and unknowns:
Decisions required before editing:
Expected verification commands:
```

### Orientation rejection conditions

Voilà should reject orientation when:

- a required canonical source was not inspected;
- the agent cannot state one proof surface;
- planned files include protected or unauthorized paths;
- the agent proposes later-phase work;
- acceptance IDs are missing or rewritten;
- material product semantics remain undefined;
- the plan depends on an unapproved dependency, migration, or contract change.

### Orientation approval

Orientation can be approved automatically only when the packet contains no reserved decision and the proposed path stays within explicit boundaries.

Otherwise the owner or a designated planning pass approves it.

## Pass 2: bounded implementation

### Mutation provenance

Every harness-mediated mutation should carry:

```text
work_item_id
acceptance_id or support_reason
target_path
change_intent
```

This does not need to appear in source files. It should exist in Voilà's execution log or receipts.

### File controls

Voilà should enforce:

- allowed path list;
- protected path list;
- dependency-change flag;
- public-contract-change flag;
- migration flag;
- phase flag.

A write outside the allowlist should fail with a clear scope-boundary result rather than silently proceeding.

### Scope-amendment flow

When a legitimate implementation need falls outside the packet:

1. stop the mutation;
2. describe why the current packet is insufficient;
3. identify the exact additional path or permission;
4. state whether behavior or only implementation mechanics change;
5. create a decision request or scope amendment;
6. continue only after approval.

### Builder operating rule

The builder may revisit repository evidence when implementation reveals a contradiction, but it may not reopen the entire product strategy to search for a preferred solution.

## Pass 3: independent verification

### Fresh context

Use a new MiniMax context for verification when practical.

The verifier receives:

- active work packet;
- repository diff;
- relevant source files;
- acceptance IDs;
- required commands;
- prior receipts only when needed to locate evidence.

The verifier should not receive the builder's persuasive explanation as its primary source.

### Verifier objective

Attempt to disprove completion.

The verifier checks:

- whether each acceptance ID is actually satisfied;
- whether negative and boundary cases are present;
- whether behavior exists outside the allowed scope;
- whether public contracts or dependencies changed unexpectedly;
- whether tests test the intended behavior rather than the implementation detail;
- whether skips, flaky reruns, and environment failures are visible;
- whether existing Ward behavior regressed;
- whether receipts support the claimed result.

### Verification result

Each acceptance ID receives one result:

```text
PASS
FAIL
BLOCKED
NOT_RUN
NOT_APPLICABLE
```

`NOT_RUN` and `BLOCKED` require an explanation and remaining-risk statement.

## Pass 4: reconciliation

Reconciliation answers:

1. Did the implementation satisfy the exact packet?
2. Did the diff remain within boundaries?
3. Did tests and receipts independently support the behavior?
4. Did the work introduce an unapproved product decision?
5. Did claims or contracts become stale?
6. Did adjacent work remain unauthorized?
7. Is the repository in a cleanly resumable state?

### Reconciliation outcomes

- `COMPLETE`: all required evidence exists.
- `REWORK`: implementation can be corrected within the same packet.
- `BLOCKED`: external or environmental condition prevents completion.
- `DECISION_REQUIRED`: completion requires owner authority.
- `INVALIDATED`: the packet or product assumption must be revised.

## Structured completion

Voilà should expose a schema-backed completion operation instead of depending on free-form final prose.

Candidate operation:

```text
voila_complete_work_item
```

### Suggested input

```json
{
  "work_item_id": "WV2-AUTH-001",
  "repository_fingerprint": "<commit-or-hash>",
  "status": "complete",
  "acceptance_results": [
    {
      "id": "AUTH-001",
      "status": "passed",
      "evidence": ["RCP-101"]
    }
  ],
  "files_changed": [],
  "commands_run": [],
  "tests": [],
  "receipts": [],
  "known_limitations": [],
  "skipped_checks": [],
  "scope_delta": "none",
  "decisions_introduced": [],
  "unresolved_items": [],
  "next_authorized_work": null
}
```

### Completion rejection conditions

Reject completion when:

- a required acceptance ID is absent;
- a required acceptance ID is not passed;
- a required receipt is missing;
- a check was skipped without a risk statement;
- changed files exceed the allowlist without approval;
- protected files changed without permission;
- `scope_delta` is not `none` and no approved amendment exists;
- a new product or contract decision is unrecorded;
- unresolved required behavior remains;
- the report authorizes the next phase without owner approval;
- the repository fingerprint does not match the verified state.

## Decision request operation

Voilà should expose a structured decision request.

Candidate operation:

```text
voila_request_decision
```

### Suggested fields

```text
work_item_id
question
why_blocking
evidence_inspected
option_a
option_b
recommendation
impact_if_deferred
safe_work_completed
files_or_contracts_affected
```

A decision request should be narrow. It must not become an invitation for the model to redesign the whole product.

## Scope amendment operation

Candidate operation:

```text
voila_request_scope_amendment
```

Suggested fields:

```text
work_item_id
requested_paths
requested_permission
reason
behavior_change: yes | no
acceptance_ids_affected
risk
alternative_within_current_scope
```

Approval modifies the packet or creates a versioned amendment. Silent scope drift is not allowed.

## Retry and failure control

### Identical failure rule

After two materially identical failures:

- stop repeating the operation;
- preserve the latest and first relevant error;
- classify the failure;
- choose a materially different bounded approach or stop;
- do not report activity as progress.

### Failure classes

```text
ENVIRONMENT
TOOLING
CONTRACT
IMPLEMENTATION
AUTHORIZATION
EXTERNAL_DEPENDENCY
UNKNOWN
```

### Flake handling

A passing rerun does not erase the original failure.

Record:

- original failing command;
- observed failure;
- rerun result;
- evidence for classifying it as flaky or deterministic;
- remaining risk.

Do not repeatedly rerun until green without preserving evidence.

## Context management

### Within an active mutation sequence

Preserve complete relevant assistant, tool-call, and tool-result messages. Do not compress away the active cause-and-effect chain.

### Between work items

Start a new context with:

- work packet;
- current repository fingerprint;
- completed-item receipts;
- relevant decisions;
- current phase;
- explicit next authorization.

Do not carry the entire conversational history when verified repository artifacts can replace it.

### After a material direction change

Start a new context. Do not rely on a summary layered on top of now-invalid assumptions.

## Live execution state

Voilà may maintain a compact active state record:

```text
active_work_item
current_phase
repository_fingerprint
orientation_status
acceptance_passed
acceptance_remaining
current_blocker
approved_decisions
approved_scope_amendments
last_receipt
verification_status
```

This state is operational, not canonical product documentation.

When it conflicts with Git-tracked direction, decisions, or evidence, repository truth wins.

## Work-packet selection

Voilà may recommend a next packet from `WORK_BREAKDOWN.md`, but it must not activate it automatically after a phase gate.

### Automatic selection is allowed only when

- the current packet explicitly names the next same-phase packet;
- no owner decision is required;
- the next packet does not broaden scope;
- all current acceptance IDs passed;
- repository state is clean and verified.

### Owner authorization is required when

- entering a new phase;
- altering a public contract;
- changing security or degraded behavior;
- selecting a design-partner-specific capability;
- starting approval, delegated administration, or outcome intelligence;
- accepting a failed or narrowed gate result.

## Model authority matrix

| Decision type | MiniMax | Voilà | Owner |
| --- | --- | --- | --- |
| Local implementation naming | Decide | Record if useful | No action |
| Test organization | Decide | Enforce commands | No action |
| Existing pattern reuse | Decide | Verify boundary | No action |
| Allowed-path write | Execute | Enforce | No action |
| New dependency | Recommend only | Block by default | Approve |
| Public API change | Recommend only | Block by default | Approve |
| Migration | Recommend only | Block by default | Approve |
| Auth/security semantics | Analyze and recommend | Stop gate | Approve |
| Phase transition | No authority | Stop gate | Approve |
| Product direction | No authority | No authority | Decide |
| Work completion | Submit evidence | Validate schema and gates | Review when required |

## Ward-specific phase controls

The Ward v2 phase identifiers are:

```text
VALIDATION
PROOF_CONTRACT
AUTHORITY_KERNEL
RUNTIME_API
SECURITY_AND_RECEIPTS
CONTROL_ROOM
PILOT_VERIFICATION
APPROVAL
DELEGATED_ADMIN
OUTCOME_EVIDENCE
```

Each work packet declares one phase.

A packet may not mutate artifacts belonging primarily to a later phase without a recorded decision.

Examples:

- `AUTHORITY_KERNEL` cannot add embedded customer UI.
- `RUNTIME_API` cannot invent approval-token issuance.
- `CONTROL_ROOM` cannot add generic analytics.
- `PILOT_VERIFICATION` cannot silently proceed into `APPROVAL`.

## Work-item size

A good MiniMax packet usually has:

- one proof surface;
- 3–10 acceptance IDs;
- a small allowed path set;
- one primary behavior change;
- one clear verification sequence;
- no unresolved product choice.

Split a packet when it contains:

- both a public contract and a broad UI;
- more than one phase;
- multiple independent migrations;
- two different buyer workflows;
- unrelated refactoring;
- more than one material security decision;
- acceptance criteria that cannot be verified in one coherent receipt set.

## Harness implementation priority

The highest-value controls for Voilà are:

1. active work-item state;
2. allowed and protected path enforcement;
3. current phase enforcement;
4. mutation provenance;
5. structured decision request;
6. structured scope amendment;
7. acceptance-ID-backed completion;
8. fresh-context verifier workflow;
9. retry-loop detection;
10. behavioral evaluation runner.

The behavioral runner is intentionally specified separately so it can become a reusable Voilà capability rather than Ward-specific code.

## Definition of success

This workflow succeeds when MiniMax:

- moves quickly through authorized work;
- does not need repeated reminders about scope;
- stops at real decisions instead of inventing them;
- produces smaller, easier-to-review diffs;
- preserves Ward's existing guarantees;
- proves completion through tests and receipts;
- leaves a clean, resumable repository state;
- does not automatically turn the current proof into the entire roadmap.
