# Decision Request Template

> Use when the active work cannot proceed safely within delegated authority.
>
> Keep the request narrow. Do not redesign the entire product.

## Identity

```text
Decision request ID:
Work item ID:
Current phase:
Repository fingerprint:
Requested by:
Date:
Status: OPEN | APPROVED | REJECTED | DEFERRED | SUPERSEDED
```

## Decision required

State one concrete question.

> 

## Why this blocks or materially changes the active work

Explain why continuing would invent product, contract, security, persistence, degraded-mode, or phase semantics.

## Evidence inspected

```text
<file, test, receipt, command, or observed behavior>
```

Separate verified facts from inference.

## Constraints already locked

List canonical decisions that the options must preserve.

## Option A

### Behavior

### Benefits

### Costs and risks

### Files, contracts, or acceptance IDs affected

## Option B

### Behavior

### Benefits

### Costs and risks

### Files, contracts, or acceptance IDs affected

## Additional option

Include only when materially distinct and credible.

## Recommendation

State the recommended option and why it best preserves the product direction and current proof surface.

## Safe work completed before stopping

List completed work that does not prejudge the decision.

## Impact if deferred

State what remains blocked and whether the repository is safe and resumable.

## Owner decision

```text
Selected option:
Reason:
Scope amendment:
New or revised acceptance IDs:
Authorized next action:
Still unauthorized:
Decision date:
```

After approval, link this decision from the active work packet or create a durable decision record when it changes product or contract direction.