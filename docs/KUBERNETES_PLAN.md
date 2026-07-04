# Ward Kubernetes Plan

## Summary

Kubernetes is a major direction for Strategy B (see
`docs/STRATEGY_A_C_THEN_B.md`) and the second deployment target after
Docker. Everything in this document is PLANNED: no manifests are
shipped, applied, or tested yet. Docker Compose is the only verified
multi-service path today. The K8s runner stays planned until the
Docker runner (currently a dev-only prototype) and durable state
(currently a SQLite prototype) are stable. Future hosted Ward should
use Postgres or another durable store, and 10via may manage hosted
Ward deployments internally through Saastle — via Ward's public APIs
only.

## Intended shape

### Core deployments

- `ward-api` Deployment + Service (ClusterIP), port 4317. Single
  replica until state is durable — the Phase 1 in-memory store cannot
  be replicated. Durable state (Postgres/Redis) is a prerequisite for
  replicas and is itself planned.
- `ward-control-room` Deployment + Service, static assets behind an
  Ingress. Calls the API through the same Ingress.

### Workflow runner namespace (optional, later)

- A dedicated namespace (e.g. `ward-runners`) where the Kubernetes
  runner creates one Job per workflow run.
- Labels on every runner Job/Pod:
  - `ward.dev/tenant-id: <tenantId>`
  - `ward.dev/run-id: <runId>`
  - `ward.dev/runner: kubernetes`
- Per-tenant annotations reserved for scheduling hints and future
  quota (e.g. `ward.dev/max-concurrent-runs`).

### Runner Jobs (future)

- The k8sRunner adapter creates a Job per run, watches status via the
  Kubernetes API, and mirrors it into the WorkflowRun record.
- Pause semantics: paused tenant -> no new Jobs; pause during a run ->
  Job suspension/deletion (exact semantics to be decided when built).

### Network policy direction

- Default-deny egress in the runner namespace.
- Allow runner Pods -> `ward-api` Service only, so all LLM/tool
  traffic must traverse Ward's egress proxy. This is what makes
  containment hold for containerized agents.
- Allow `ward-api` -> upstream LLM endpoints (when pass-through mode
  is configured).

### Secrets / config

- ConfigMap: `WARD_LOOP_WINDOW_MS`, `WARD_LOOP_REQUEST_THRESHOLD`,
  `WARD_ESTIMATED_COST_PER_REQUEST`, `WARD_DEPLOYMENT_MODE=kubernetes`.
- Secret: `OPENAI_API_KEY` (+ `WARD_UPSTREAM_OPENAI_BASE_URL`) for
  pass-through mode.

### Future persistence

- Postgres (or similar) for tenant state, workflow runs, and approval
  records before any multi-replica API deployment.
- Durable audit storage is its own workstream: append-friendly store,
  retention policy, and export. The in-memory audit trail is a demo
  artifact, not a durability plan.

## Honest status

| Item | Status |
| --- | --- |
| Docker Compose demo | implemented prototype |
| K8s manifests (API, Control Room) | planned |
| Runner namespace + Jobs | planned |
| NetworkPolicy enforcement | planned |
| Durable state / audit storage | planned |
| Multi-replica API | planned, blocked on durable state |
