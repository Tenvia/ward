# Orientation Report Template

> Orientation is read-only. Do not edit repository files while producing this report.

## Identity

```text
Work item ID:
Current phase:
Repository fingerprint:
Agent or harness run:
Date:
```

## Canonical sources read

```text
<path> — <why authoritative>
```

## Existing behavior inspected

```text
<path, test, receipt, contract, or command>
```

Separate verified behavior from assumptions.

## Single proof surface

> 

## Acceptance IDs

```text
<ID> — <required result>
```

Do not rewrite or silently reinterpret acceptance criteria.

## Planned files

```text
<path> — <planned reason>
```

Every planned file must be allowed by the packet.

## Protected and excluded areas

```text
<path or behavior>
```

## Explicit non-goals

```text
<non-goal>
```

## Proposed execution sequence

1. Pin required tests or checks.
2. Implement the smallest sufficient change.
3. Run targeted verification.
4. Run required regression checks.
5. Produce receipts.
6. Reconcile scope and contracts.

Adjust only when the active packet requires another order.

## Expected verification

```bash
# targeted

# regression
```

## Risks and unknowns

For each item:

```text
Risk or unknown:
Evidence:
Can proceed safely: yes | no
Required action:
```

## Decision or amendment required before editing

```text
None
```

Or identify the required decision/amendment template.

## Orientation verdict

```text
READY_TO_IMPLEMENT
DECISION_REQUIRED
BLOCKED
INVALID_PACKET
```

Explain the verdict briefly.