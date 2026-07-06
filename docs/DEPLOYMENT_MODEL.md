# Ward Deployment Model

## Summary

Ward is Docker-first, Kubernetes-next, hosted-later. Every mode below
except "Local dev" and "Docker Compose" is planned, not built. Ward
never requires Saastle in any mode.

Environment variables and safe evaluator defaults are documented in
`docs/ENVIRONMENT.md`; deployment mode names below are prototype labels
unless a section explicitly says the mode is implemented. Common
prototype-incident runbooks (accidental pause, observe-mode would-blocks,
control auth misconfig, upstream failure, SQLite missing, incident
receipt export, verifier failure) live in `docs/OPERATOR_RUNBOOK.md`.

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
`./scripts/smoke-user-install.sh`. See
`docs/USER_INSTALL_NO_NPM.md`.

### 1c. Prebuilt image (implemented prototype — published 2026-07-05)

`docker-compose.pull.yml` mirrors the user bundle against
`ghcr.io/tenvia/ward-api:v0.1.0-rc1` (public; Tenvia org owns
`github.com/Tenvia/ward`), published by
`.github/workflows/docker-image.yml` on the version tag
(linux/amd64 + linux/arm64). Verified end to end: anonymous pull,
boot, containment flow, control auth, and SQLite persistence across a
container restart. `docker-compose.user.yml` remains the local-build
path.

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
| sqlite | `WARD_STORAGE=sqlite` + `WARD_SQLITE_PATH` | prototype; tenants + audit events persist across restart (verified locally by `npm run smoke:audit-durability`; the script prints its own count). Uses Node's built-in `node:sqlite` (experimental in Node 22). Workflow runs and approval tokens remain in-memory. See `docs/SQLITE_DEPLOYMENT.md` for backup, restore, and recovery scope. |

## Failure behavior

| Case | Behavior | Status |
| --- | --- | --- |
| SDK cannot reach Ward | `guard()` failMode: open (default) runs the callback and reports `fail_open`; closed refuses | implemented prototype (`npm run smoke:sdk`) |
| Ward API up, policy lookup fails | `WARD_PROXY_FAIL_MODE`: open (default) allows with `x-ward-fail-open` header + audit; closed blocks 503. Successful policy reads always enforce. | implemented prototype (`npm run smoke:reliability`) |
| Paused/constrained tenant + observe mode | `WARD_MODE=observe` lets otherwise-valid proxied traffic through with `x-ward-would-block` + `would_block` audit. Malformed requests, missing-tenant 400, control-auth 401, fail-closed 503, and upstream errors are still enforced. | implemented prototype (`npm run smoke:observe-only`) |
| `stream: true` on a paused/constrained tenant in enforce mode | Returns 423/429 JSON WardError BEFORE any SSE header is flushed; mock or real upstream receives no request. | implemented prototype (`npm run smoke:streaming:mock`) |
| Ward proxy process/network hard-down | Ward cannot pass traffic; requires customer-side fallback routing or HA Ward deployment | planned — not claimed |
| Control endpoint safety | Shared bearer token on mutating `/ward/*` routes (`WARD_REQUIRE_CONTROL_TOKEN`) | implemented prototype; not production RBAC |

## SQLite deployment reference

`docs/SQLITE_DEPLOYMENT.md` is the authoritative reference for the
evaluator persistence path. It documents what SQLite mode persists,
what survives an API or container restart, the supported offline
backup and restore procedure today, the `node:sqlite` experimental
caveats, and the explicit non-goals (HA, multi-replica shared state,
compliance retention, tamper-evidence).

