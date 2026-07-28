# Work Packet Template

> Copy this file to `docs/v2/work-items/<WORK_ITEM_ID>.md`.
>
> A work packet is an execution contract, not a brainstorming document.

## Identity

```text
Work item ID:
Title:
Status: DRAFT | READY | ACTIVE | BLOCKED | DECISION_REQUIRED | COMPLETE | INVALIDATED
Phase:
Owner:
Created:
Activated:
Repository base commit or fingerprint:
```

## Objective

State one externally inspectable result.

> 

## Why this work is authorized now

Name the dependency, gate, decision, or prior completed packet that makes this item current.

## Canonical sources

Read these before editing:

```text
AGENTS.md
<direction or proof contract>
<execution plan section>
<relevant code, tests, claims, or API contract>
```

## Existing verified behavior

Record what the repository currently proves. Include paths, tests, receipts, or commit references.

Do not copy assumptions from a prior conversation without checking the repository.

## Required final behavior

Describe the exact behavior after completion.

Avoid implementation prescriptions unless they are part of the contract.

## Single proof surface

Name the one behavior or artifact this packet proves.

## Acceptance criteria

Use stable IDs.

| ID | Required result | Verification | Required evidence |
| --- | --- | --- | --- |
| `<PREFIX>-001` |  |  |  |
| `<PREFIX>-002` |  |  |  |

Every required acceptance ID must receive a completion result.

## Required negative and boundary cases

```text
<case>
<case>
```

## Allowed paths

```text
<path or glob>
```

Writing outside this list requires an approved scope amendment.

## Protected paths

Protected by this packet even when nearby:

```text
<path or glob>
```

## Permission flags

```text
Dependency changes: allowed | prohibited
Public contract changes: allowed | prohibited
Migration changes: allowed | prohibited
Authentication or authorization changes: allowed | prohibited
Claims changes: required | allowed | prohibited
Workflow or CI changes: allowed | prohibited
```

## Explicit non-goals

```text
<not included>
<not included>
```

## Decisions delegated to the agent

List local, reversible decisions MiniMax may make.

## Decisions reserved for the owner

List decisions that must trigger `templates/DECISION_REQUEST.md`.

## Implementation constraints

Include repository patterns to reuse and solutions that are explicitly forbidden.

## Required execution passes

### Orientation

Required orientation output:

```text
repository fingerprint
canonical sources read
existing behavior inspected
planned files
risks and unknowns
acceptance checks
explicit non-goals
```

### Implementation

Define sequencing requirements, such as tests before production code.

### Verification

List exact targeted and regression commands.

### Reconciliation

List contract, scope, claims, receipt, and handoff checks.

## Required commands

```bash
# targeted checks

# regression checks
```

Commands that cannot run must be reported as `BLOCKED` or `NOT_RUN` with remaining risk.

## Required receipts and artifacts

```text
<receipt or artifact>
```

## Retry and failure rules

Name packet-specific failure rules in addition to `AGENTS.md`.

## Stop conditions

Stop and request direction when:

```text
<condition>
```

## Completion contract

Use `templates/COMPLETION_REPORT.md`.

The item is not complete unless:

- every acceptance ID is reported;
- required checks and evidence exist;
- scope remained valid;
- no owner-reserved decision was made silently;
- remaining unauthorized work is explicit.

## Next work

```text
Recommended same-phase packet:
Automatically authorized: yes | no
Owner gate required: yes | no
Work that remains unauthorized:
```
