# Ward Architecture

## Summary

Ward is a standalone TypeScript control plane for tenant containment.
Customer applications never run inside Ward. They interact with it
through chokepoints: an OpenAI-compatible egress proxy (implemented
prototype), a cooperative SDK guard (implemented prototype), workflow
runners (mock implemented; Docker dev-only prototype, disabled by
default; Kubernetes planned), and queue middleware (planned).
Historical note: earlier drafts described an inherited Elixir/BEAM
engine; Ward implements its containment primitives natively in
TypeScript, and the Saastle work is retained as historical evidence
and pattern source only (see `docs/SAASTLE_SOURCE_MAP.md`).

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
| `audit.ts` | Audit trail for every approval, transition, block, and detection | implemented prototype (in-memory by default; SQLite persistence prototype via `storage/`) |
| `workflowRuns.ts` | Workflow-run store + runner dispatch + containment rules | implemented prototype |
| `dockerRunner.ts` | Docker agent runner adapter | dev-only prototype (disabled by default; allowlisted images) |
| `k8sRunner.ts` | Kubernetes agent runner adapter | planned (stub) |
| `storage/` | SQLite persistence (`WARD_STORAGE=sqlite`) for tenant state + audit | prototype (memory remains the default) |
| `controlAuth.ts` | Shared-token control auth on mutating `/ward/*` routes | prototype (not production RBAC) |

The approval flow is a native reimplementation of Saastle's
confirmation-token pattern (single-use, short-lived, bound to tenant
and action, exact phrase echo). No Saastle code or runtime is
involved.

## Chokepoints and the guarantee ladder

| Mode | Integration | Enforcement strength | Status |
| --- | --- | --- | --- |
| Egress proxy | Base URL + `x-ward-tenant-id` header | Hard containment at egress for proxied calls | implemented prototype |
| SDK guard | `ward.guard({ tenantId, operation, run })` | Cooperative — code that bypasses the guard is not contained | implemented prototype |
| Docker/K8s runners | Ward launches the agent workload | Process-level | Docker: dev-only prototype (disabled by default); K8s: planned |
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

## Fail-open behavior (implemented prototype, with one honest gap)

Ward must never become the outage. What exists today, verified per
`docs/CLAIMS_AND_EVIDENCE.md`:

- **SDK guard fail-open/fail-closed** — if Ward cannot answer,
  `guard()` failMode `open` (default) runs the callback and reports
  `fail_open` (never silently); `closed` refuses. Verified by
  `npm run smoke:sdk`.
- **Proxy degraded fail-open** — policy-lookup fault with the API up:
  `WARD_PROXY_FAIL_MODE=open` (default) allows the request with an
  `x-ward-fail-open: true` header plus an audit event; `closed`
  blocks 503. A successful policy read always enforces. Verified by
  `npm run smoke:reliability`.
- **Proxy hard-down — NOT solved.** If the Ward process/network is
  fully down, proxied traffic does not flow. Customer-side fallback
  routing or an HA Ward deployment is required; neither exists yet,
  and no claim ships until it does.

## Out of scope today

- Production-grade durable state and audit (SQLite persistence is a
  prototype; approval tokens and workflow runs stay in-memory; no
  retention policy or export).
- Production auth/RBAC (only the shared-token prototype exists).
- Real dollar metering (`estimatedSpend` is a fixed per-call rate).
- Multi-node/multi-replica deployment (blocked on durable shared state).
- Tool sandboxing and prompt-injection detection — not part of Ward's
  containment claim.
