# Scope Amendment Template

> Use when implementation reveals a legitimate need outside the active packet.
>
> Do not mutate the additional scope before approval.

## Identity

```text
Amendment ID:
Work item ID:
Current phase:
Repository fingerprint:
Requested by:
Date:
Status: OPEN | APPROVED | REJECTED | SUPERSEDED
```

## Requested change

```text
Additional allowed paths:
Protected-path exception:
Dependency permission:
Public-contract permission:
Migration permission:
Authentication or authorization permission:
Workflow or CI permission:
```

## Reason

Explain why the current packet cannot be completed correctly or safely without this amendment.

## Behavioral impact

```text
Changes required behavior: yes | no
Changes public behavior: yes | no
Changes product semantics: yes | no
Changes security boundary: yes | no
Changes phase: yes | no
```

Any `yes` may require a full decision request rather than a scope-only amendment.

## Evidence

List files, tests, errors, receipts, or repository behavior proving the need.

## Acceptance IDs affected

```text
<ID> — <impact>
```

## Alternative within current scope

Describe the best credible alternative that avoids expansion and why it is insufficient or less safe.

## Risk

State the review, regression, security, or schedule risk introduced by the amendment.

## Approval

```text
Approved scope:
Conditions:
New required checks:
New protected paths:
Still unauthorized:
Approved by:
Approval date:
```

After approval, link the amendment from the work packet and completion report.