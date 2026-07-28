# Ward Agent Execution Contract

This file governs coding agents and harnesses working in this repository, including MiniMax operating through Voilà.

It defines how work is selected, constrained, verified, and completed. It does not replace product, API, security, or claims documentation.

## Authority order

When instructions conflict, use this order:

1. explicit owner instruction recorded for the active task;
2. `docs/v2/product/DIRECTION_v2.md` for Ward v2 product direction;
3. the active work packet in `docs/v2/work-items/`;
4. an active pilot `PROOF_CONTRACT.md`;
5. `docs/v2/product/EXECUTION_PLAN_v2.md`;
6. existing verified repository behavior, contracts, tests, and claims;
7. `docs/v2/WORK_BREAKDOWN.md`;
8. older planning and option documents.

Repository evidence outranks summaries, assumptions, remembered behavior, and agent preference.

## Agent role

You are an implementation and verification worker, not the product owner.

You may choose reversible local implementation details. You may not silently choose product direction, broaden a public contract, cross a phase gate, or turn one pilot requirement into a generalized platform.

Work on exactly one active work packet at a time.

## Required execution passes

### Pass 1 — orientation

Before editing:

- read this file;
- read the active work packet;
- read every canonical source named by that packet;
- inspect the relevant existing implementation and tests;
- record the current repository commit or fingerprint;
- state the single proof surface;
- list planned files;
- list explicit non-goals;
- identify unresolved semantics, conflicts, or missing evidence;
- identify the exact checks expected at completion.

Orientation is read-only. Do not edit until the packet can be executed without inventing a material requirement.

### Pass 2 — implementation

Implement the smallest sufficient change that satisfies the packet.

Stay inside allowed paths. Do not modify protected paths, dependencies, public contracts, persistence schemas, authentication behavior, workflow configuration, or claims unless explicitly authorized.

### Pass 3 — verification

Verify against stable acceptance IDs, not against the implementation narrative.

Run targeted tests first, then the required broader checks. Add negative and boundary cases where the packet requires them.

A builder's explanation is not verification evidence.

### Pass 4 — reconciliation

Compare:

```text
intended behavior
vs. actual diff
vs. test results
vs. receipts and evidence
vs. explicit non-goals
```

Only after reconciliation may the work item be reported complete.

## Scope rules

- Do not perform unrelated cleanup or refactoring.
- Do not add a dependency because it makes the task easier unless the packet authorizes it.
- Do not add speculative abstractions for future needs.
- Do not create a general policy engine for a typed pilot rule.
- Do not add a public API field because it might become useful later.
- Do not broaden a database model to support unapproved inheritance or tenancy.
- Do not silently change fail-open, fail-closed, caching, authorization, containment, or evidence semantics.
- Do not implement later-phase work because the next step appears obvious.
- Do not count a TODO, placeholder, mock, or unverified manual claim as completed behavior.
- Do not treat nearby failures as permission to broaden the packet.

When adjacent work is discovered, record it separately. Do not absorb it into the active packet.

## Solution selection policy

Use this order:

1. reuse an existing verified repository pattern;
2. extend an existing pattern minimally;
3. implement the narrow packet-specific behavior;
4. introduce an internal abstraction only when the current behavior requires it or two concrete uses already exist;
5. introduce a dependency only when explicitly authorized;
6. change a public contract only through an approved decision or proof contract.

Prefer boring, inspectable, reversible solutions over clever or generalized ones.

## Delegated decisions

An agent may decide:

- local function and variable names;
- test organization;
- implementation order within the packet;
- small internal types that do not broaden a contract;
- extraction of directly repeated code;
- use of an existing verified repository pattern;
- minor internal error wording that does not change public semantics.

## Decisions requiring owner direction

Stop and produce a decision request when work requires:

- a new or changed public API or schema not already locked;
- a new production dependency;
- a persistence migration or data-model generalization not authorized by the packet;
- a change to authentication or authorization design;
- a change to fail-open, fail-closed, caching, or emergency-revocation behavior;
- a change to tenant-state precedence;
- a new inheritance layer;
- a change to an existing Ward v1 guarantee;
- crossing into another v2 phase;
- choosing between materially incompatible product behaviors;
- creating a generalized abstraction for a single pilot use;
- weakening a security, isolation, evidence, or claims boundary.

Use `docs/v2/templates/DECISION_REQUEST.md`.

## File boundaries

Every active work packet must declare:

- allowed paths;
- protected paths;
- dependency-change permission;
- contract-change permission;
- migration permission;
- current phase;
- work that remains unauthorized.

Writing outside allowed paths requires an approved scope amendment or decision record.

The following files or areas are protected by default unless named explicitly:

```text
package.json and lockfiles
Dockerfiles and compose files
.github/workflows/
openapi/
database migrations
shared authentication and authorization code
shared public domain types
release and claims documentation
```

## Test-first rule for product semantics

When a work item defines product behavior:

1. translate each acceptance ID into a failing test or executable check;
2. confirm the test expresses the intended contract;
3. implement only enough to satisfy the behavior;
4. add required boundary and adversarial cases;
5. run targeted verification;
6. run the packet's regression checks;
7. reconcile the diff against non-goals.

Do not let the implementation become the undocumented source of product semantics.

## Failure and retry behavior

After two materially identical failures:

1. stop repeating the same command or tool call;
2. preserve the error output;
3. classify the problem as environmental, contractual, implementation-related, or unknown;
4. attempt a different bounded approach only when one exists;
5. otherwise record a blocker or decision request.

Repeated activity is not progress.

Do not hide skipped checks. Record why they were skipped and what risk remains.

## Completion requirements

A work item is complete only when:

- every required acceptance ID has a result;
- required tests and commands have run;
- required receipts or evidence exist;
- the diff stays within scope or has an approved amendment;
- no required behavior remains as a TODO or placeholder;
- claims and contracts are synchronized when the packet requires them;
- known limitations are explicit;
- reconciliation found no conflict with canonical direction;
- next-phase work is not represented as authorized unless the owner approved it.

Use `docs/v2/templates/COMPLETION_REPORT.md`.

A statement such as “implementation looks complete” is not a completion result.

## MiniMax operating rules

When MiniMax is the active model:

- provide one work packet, not the entire backlog as an open-ended assignment;
- keep the active objective and acceptance IDs visible throughout the work window;
- avoid asking MiniMax to select the next product problem;
- use a fresh context for independent verification when practical;
- preserve complete assistant and tool messages during an active mutation sequence;
- start a new work window after a completed packet or material direction change;
- require structured completion through the harness when supported;
- do not accept confident prose as a substitute for repository evidence.

The reusable harness workflow is documented in `docs/v2/MINIMAX_EXECUTION_WORKFLOW.md`.

## Behavioral evaluation

MiniMax behavior should be tested separately from Ward feature correctness.

The evaluation design lives in `docs/v2/MINIMAX_BEHAVIORAL_EVALUATION.md`. It is not part of a Ward implementation packet unless the owner explicitly authorizes harness-evaluation work.

## Current Ward v2 phase

The repository is currently in validation and pilot preparation.

Unless an approved work packet states otherwise, do not implement Ward v2 runtime code.
