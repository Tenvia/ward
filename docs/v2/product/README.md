# Ward v2 Product Planning

> Current direction: accepted for planning on July 27, 2026.
>
> Implementation status: no Ward v2 runtime implementation is authorized by these documents alone.

## Start here

1. [`DIRECTION_v2.md`](DIRECTION_v2.md) — canonical product direction, boundaries, domain model, MVP proof surface, and phased evolution.
2. [`EXECUTION_PLAN_v2.md`](EXECUTION_PLAN_v2.md) — validation gates, paid-pilot requirements, workstreams, verification, and the bounded Voilà execution protocol.
3. [`MVP_OPTIONS_v2.md`](MVP_OPTIONS_v2.md) — pre-decision comparison retained for rationale and hypothesis history.

## Selected direction

Ward v2 will become a **customer-autonomy control plane for multi-tenant AI applications**.

The product sequence is:

```text
Capability profiles and runtime resolution
        ↓
Action-bound human approval
        ↓
Delegated customer administration
        ↓
Outcome evidence and autonomy recommendations
```

This is a narrowed **B → A → C** evolution from the option comparison:

- take the runtime authority core from Option B;
- add the customer-facing administration surface from Option A only after the runtime contract is trusted;
- add the control-relevant evidence from Option C only after Ward owns a real decision surface.

The initial proof is intentionally smaller than any full option in `MVP_OPTIONS_v2.md`:

> One vendor, one capability, one typed constraint family, two customer profiles, one versioned resolve endpoint, emergency tenant precedence, one enforcement adapter, and stable decision receipts.

## Document authority

When product documents conflict, use this order:

1. `DIRECTION_v2.md`
2. the active pilot `PROOF_CONTRACT.md`
3. `EXECUTION_PLAN_v2.md`
4. `MVP_OPTIONS_v2.md`

A pilot proof contract may narrow implementation details, but it may not broaden or reverse the product direction without a recorded owner decision.

## Current next step

The next authorized work is validation and pilot preparation:

- buyer and workflow interviews;
- current-workflow reconstruction;
- paid-pilot offer;
- pilot proof-contract template;
- candidate capability selection.

Do not begin the Ward v2 runtime build until the evidence and paid-pilot gates in `EXECUTION_PLAN_v2.md` are satisfied or the owner records a deliberate exception.