# Completion Report Template

> Completion is an evidence claim, not a narrative impression.

## Identity

```text
Work item ID:
Title:
Final status: COMPLETE | REWORK | BLOCKED | DECISION_REQUIRED | INVALIDATED
Phase:
Repository base fingerprint:
Verified repository fingerprint:
Builder context or run:
Verifier context or run:
Completion date:
```

## Objective result

State whether the packet's single proof surface was demonstrated.

## Acceptance results

| Acceptance ID | Result | Evidence or receipt | Notes |
| --- | --- | --- | --- |
|  | PASS |  |  |

Allowed results:

```text
PASS
FAIL
BLOCKED
NOT_RUN
NOT_APPLICABLE
```

Every required acceptance ID must appear.

## Files changed

```text
<path> — <reason linked to acceptance ID or support reason>
```

## Commands and checks

| Command or check | Result | Evidence | Notes |
| --- | --- | --- | --- |
|  |  |  |  |

Preserve initial failures and rerun results separately.

## Receipts and artifacts

```text
<receipt ID or artifact path> — <what it proves>
```

## Negative and boundary verification

Summarize required failure-path and adversarial results.

## Scope reconciliation

```text
Allowed paths respected: yes | no
Protected paths changed: yes | no
Dependency changes: none | approved | unapproved
Public contract changes: none | approved | unapproved
Migration changes: none | approved | unapproved
Authentication or authorization changes: none | approved | unapproved
Phase crossed: no | approved | unapproved
Scope delta: none | approved amendment | unresolved
```

Explain every answer other than the expected no-change state.

## Contract and direction reconciliation

Confirm whether the final behavior agrees with:

- `AGENTS.md`;
- canonical product direction;
- active proof contract;
- active work packet;
- existing Ward guarantees;
- public contracts and claims.

List contradictions when present.

## Skipped or blocked checks

For each:

```text
Check:
Reason:
Failure class:
Remaining risk:
Required follow-up:
```

## Known limitations

List honest limitations that remain inside the accepted packet result.

## Decisions introduced

```text
None
```

Or link every approved decision. An unrecorded material decision prevents completion.

## Adjacent work discovered

Record useful follow-up without absorbing it into the completed packet.

## Reconciliation verdict

Explain why the status is `COMPLETE`, `REWORK`, `BLOCKED`, `DECISION_REQUIRED`, or `INVALIDATED`.

## Next work

```text
Recommended work item:
Same phase: yes | no
Automatically authorized: yes | no
Owner gate required: yes | no
Still unauthorized:
```

A roadmap successor is not automatically authorized.

## Structured harness payload

When Voilà supports schema-backed completion, submit an equivalent payload:

```json
{
  "work_item_id": "",
  "repository_fingerprint": "",
  "status": "complete",
  "acceptance_results": [],
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
