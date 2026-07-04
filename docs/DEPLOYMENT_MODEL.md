# Ward Deployment Model

## Summary

Ward is Docker-first, Kubernetes-next, hosted-later. Every mode below
except "Local dev" and "Docker Compose" is planned, not built. Ward
never requires Saastle in any mode.

## Modes

### 1. Local dev (implemented prototype)

Three processes on one machine:

- Ward API on `4317` (`apps/api`, `npm run dev`)
- Demo SaaS app on `4401` (`examples/node-express-ai-saas`)
- Control Room on `5173` (`apps/control-room`)

All state is in-memory and lost on restart. See
`docs/LOCAL_DEMO_RUNBOOK.md`.

### 1b. User Docker bundle (implemented prototype — the primary user path)

`docker-compose.user.yml` runs Ward as one container on `4317`: API,
bundled Control Room served at `/`, SQLite on the `ward-user-data`
volume, and the shared-token control auth prototype enabled with a
demo token. No NPM on the user's machine — Node/Vite run only inside
the Docker build. Verified end-to-end by
`./scripts/smoke-user-install.sh` (15 checks). See
`docs/USER_INSTALL_NO_NPM.md`.

### 1c. Prebuilt image (prepared, inactive until first publish)

`docker-compose.pull.yml` mirrors the user bundle against
`ghcr.io/10via/ward-api:latest`, and
`.github/workflows/docker-image.yml` is ready to publish multi-arch
images on version tags. No image has been published; users build
locally via `docker-compose.user.yml` until then.

### 2. Docker Compose (implemented prototype)

`docker-compose.yml` at the repo root builds and runs the same three
services. The API defaults to `WARD_STORAGE=sqlite` with the database
on a named volume (`ward-data`), so tenant state and audit survive API
container restarts (verified; `docker compose down -v` wipes it).
Approval tokens and workflow runs remain in-memory. The
`WARD_DEPLOYMENT_MODE=docker` label is cosmetic; enforcement is
identical. See `docs/DOCKER_RUNBOOK.md`.

### 3. Kubernetes (planned)

Intended shape is documented in `docs/KUBERNETES_PLAN.md`: API and
Control Room deployments, a runner namespace for agent Jobs,
per-tenant labels, and NetworkPolicy that forces agent egress through
the Ward API. No manifests are shipped or tested yet.

### 4. Hosted Ward SaaS (planned)

10via-operated multi-tenant Ward. Requires durable state, production
auth/RBAC, and real metering first — all currently planned, none
built.

### 5. Saastle-managed hosted Ward (planned)

In the hosted mode, 10via operators manage the platform through
Saastle, which consumes Ward's APIs. This is an internal-operations
concern only; see `docs/SAASTLE_INTERNAL_APP_DIRECTION.md`.

### 6. Self-hosted Ward without Saastle (the default)

Every self-hosted mode (local, Docker, future Kubernetes) works with
zero Saastle involvement. This is a hard architectural rule, not an
option.

## Execution modes for agentic workflows

| Mode | Mechanism | Status |
| --- | --- | --- |
| LLM/tool egress proxy | `POST /v1/chat/completions` + `x-ward-tenant-id` | implemented prototype |
| TypeScript SDK guard | `WardClient.guard()` cooperative check | implemented prototype (cooperative only) |
| Docker agent runner | Ward launches allowlisted agent containers | dev-only prototype behind `WARD_ENABLE_DOCKER_RUNNER=true`; disabled by default |
| Kubernetes agent runner | Ward launches agent Jobs | planned adapter (stub) |
| Queue/worker adapters | Worker asks Ward before dequeuing | planned |

## Storage backends

| Backend | Setting | Status |
| --- | --- | --- |
| memory | `WARD_STORAGE=memory` (default) | implemented prototype; all state lost on restart |
| sqlite | `WARD_STORAGE=sqlite` + `WARD_SQLITE_PATH` | prototype; tenants + audit events persist across restart (verified locally). Uses Node's built-in `node:sqlite` (experimental in Node 22). Workflow runs and approval tokens remain in-memory. |
| postgres | — | planned, for hosted SaaS / Kubernetes |

## Failure behavior

| Case | Behavior | Status |
| --- | --- | --- |
| SDK cannot reach Ward | `guard()` failMode: open (default) runs the callback and reports `fail_open`; closed refuses | implemented prototype (`npm run smoke:sdk`) |
| Ward API up, policy lookup fails | `WARD_PROXY_FAIL_MODE`: open (default) allows with `x-ward-fail-open` header + audit; closed blocks 503. Successful policy reads always enforce. | implemented prototype (`npm run smoke:reliability`) |
| Ward proxy process/network hard-down | Ward cannot pass traffic; requires customer-side fallback routing or HA Ward deployment | planned — not claimed |
| Control endpoint safety | Shared bearer token on mutating `/ward/*` routes (`WARD_REQUIRE_CONTROL_TOKEN`) | implemented prototype; not production RBAC |
