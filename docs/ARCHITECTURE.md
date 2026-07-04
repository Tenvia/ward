# Ward Architecture

## Summary

Ward is a standalone TypeScript control plane for tenant containment.
Customer applications never run inside Ward. They interact with it
through chokepoints: an OpenAI-compatible egress proxy (implemented
prototype), a cooperative SDK guard (implemented prototype), workflow
runners (mock implemented; Docker/Kubernetes planned adapters), and
queue middleware (planned). Earlier drafts described an inherited
Elixir/BEAM engine; Ward now implements its containment primitives
natively in TypeScript, with the Saastle work retained as evidence and
pattern source only (see `docs/SAASTLE_SOURCE_MAP.md`).

## Components

```text
apps/api                       Ward API — the control plane (port 4317)
apps/control-room              Operator UI (port 5173)
packages/ward-sdk              TypeScript SDK (WardClient, guard)
examples/node-express-ai-saas  Reference "existing SaaS" integration
examples/docker-agent          Reference agent container
```

### Ward API (`apps/api`)

| Module | Concern | Status |
| --- | --- | --- |
| `openaiProxy.ts` + `/v1/chat/completions` | Egress chokepoint, tenant attribution, enforcement | implemented prototype |
| `tenantState.ts` | Per-tenant state: running / constrained / paused, counters, spend estimate | implemented prototype (in-memory) |
| `detection.ts` | Sliding-window pressure detection (flags, never auto-constrains) | implemented prototype |
| `approvals.ts` | Single-use, short-TTL, tenant+action-bound approval tokens with exact confirmation phrase | implemented prototype (in-memory) |
| `audit.ts` | Audit trail for every approval, transition, block, and detection | implemented prototype (in-memory, not durable) |
| `workflowRuns.ts` | Workflow-run store + runner dispatch + containment rules | implemented prototype |
| `dockerRunner.ts` | Docker agent runner adapter | planned (stub) |
| `k8sRunner.ts` | Kubernetes agent runner adapter | planned (stub) |

The approval flow is a native reimplementation of Saastle's
confirmation-token pattern (single-use, short-lived, bound to tenant
and action, exact phrase echo). No Saastle code or runtime is
involved.

## Chokepoints and the guarantee ladder

| Mode | Integration | Enforcement strength | Status |
| --- | --- | --- | --- |
| Egress proxy | Base URL + `x-ward-tenant-id` header | Hard containment at egress for proxied calls | implemented prototype |
| SDK guard | `ward.guard({ tenantId, operation, run })` | Cooperative — code that bypasses the guard is not contained | implemented prototype |
| Docker/K8s runners | Ward launches the agent workload | Process-level (planned) | planned adapters |
| Queue middleware | Worker asks Ward before dequeuing | Background-work containment | planned |

## Data flow: the demo path

```text
Demo app --(POST /v1/chat/completions + x-ward-tenant-id)--> Ward API
Ward API: enforce first (paused -> 423, constrained -> 429, per tenant)
Ward API: record request, update sliding window, estimate spend
detection: window count >= threshold -> detectedPressure + audit event
operator: request approval -> token + required phrase (Control Room or curl)
operator: apply-approved-action with exact phrase -> state transition + audit
next Globex call -> blocked at the proxy; Acme calls unaffected
```

Enforcement is tenant-specific by construction: state is keyed by
tenant ID and checked per request. Constraining Globex cannot block
Acme.

## Workflow-run containment rules (Phase 1)

- Paused tenant: new runs are created as `blocked`, never executed.
- Constrained tenant: new runs are created as `blocked`.
- Running tenant: mock runs execute and complete; docker/kubernetes
  runs fail fast with an explicit "planned adapter" error.
- A pause/constrain applied mid-run does not kill an in-flight mock
  run; only new runs are blocked. Mid-run revocation arrives with the
  real runner adapters.

## Fail-open requirement

Ward must never become the outage: if Ward is unreachable, customer
apps should fail open (call upstream directly / proceed). This is NOT
implemented or verified yet — the demo app simply errors if Ward is
down. No fail-open claim ships until this is built and tested.

## Out of scope today

- Durable state and audit (all in-memory, lost on restart).
- Auth/RBAC on control endpoints (open on the local network).
- Real dollar metering (`estimatedSpend` is a fixed per-call rate).
- Multi-node/multi-replica deployment (blocked on durable state).
- Tool sandboxing and prompt-injection detection — not part of Ward's
  containment claim.
