# Ward Claims and Evidence

This document maps every public Ward claim to specific evidence, using
the status vocabulary below (methodology historically inherited from
internal 10via practice; see `docs/SAASTLE_SOURCE_MAP.md`).

## Status vocabulary

- **implemented** — code exists and is in active use
- **tested** — covered by automated tests
- **demo-supported** — demonstrated in the Acme/Globex Ward demo
- **prototype** — works in dev, not ready for evaluation
- **preview** — surface may change
- **planned** — on the roadmap, not built
- **simulated** — a scripted stand-in, explicitly labeled as such
- **not claimed** — no current implementation claim

## Prototype claims (code exists; verified per docs/BUILD_STATUS.md)

| Claim | Status | Evidence / caveat |
| --- | --- | --- |
| Standalone Ward app (no Saastle dependency) | prototype | `apps/api` is a self-contained TypeScript service. No import, symlink, or runtime reference to the Saastle repo anywhere in `ward/`. |
| Egress proxy prototype | prototype, demo-supported | `POST /v1/chat/completions`, mock upstream by default, pass-through only if `WARD_UPSTREAM_OPENAI_BASE_URL` + `OPENAI_API_KEY` are both set. |
| Tenant ID attribution | prototype, demo-supported | `x-ward-tenant-id` required (400 without it); per-tenant counters keyed by the header. |
| In-memory tenant state | prototype | `apps/api/src/tenantState.ts` — running / constrained / paused plus pressure, spend estimate, active runs, deployment mode. Lost on restart. |
| Tenant-specific constrain/pause/resume | prototype, demo-supported | Constrained tenant gets 429, paused gets 423, while other tenants' calls succeed. Verified in the curl sequence in `docs/BUILD_STATUS.md`. |
| Pressure/loop detection | prototype, demo-supported | `apps/api/src/detection.ts` — env-configurable sliding window (default 8 req / 10s), fed by real proxy traffic. Flags and audits; never auto-constrains in Phase 1. |
| In-memory approval-token flow | prototype, demo-supported | `apps/api/src/approvals.ts` — single-use, 120s TTL, tenant+action-bound token with exact confirmation phrase. Native TypeScript reimplementation of Saastle's confirmation-token pattern; not production RBAC. |
| In-memory audit trail | prototype | `apps/api/src/audit.ts` — approvals, transitions, pressure detections, workflow-run events. Lost on restart. `GET /ward/audit`. |
| Node/Express existing-SaaS demo | prototype, demo-supported | `examples/node-express-ai-saas/` — only Ward-specific code is a base URL + tenant header (`src/wardClient.ts`). Globex's loop is a real repeated call pattern. |
| React control room | prototype, demo-supported (browser-tested) | `apps/control-room/` — tenant list/detail, incidents, workflow runs, approval flow, direct actions, audit timeline, deployment-mode badge. Playwright E2E (`apps/control-room/tests/demo.spec.ts`) drives the full containment flow in Chromium and passes. |
| Automated smoke demo | prototype | `scripts/smoke-demo.mjs` (`npm run smoke:demo`) — covers the whole containment sequence, including negative cases (18 checks at last count; the script prints its own total). Passing against both local and Docker Compose stacks. |
| Durable tenant state (SQLite) | prototype | `apps/api/src/storage/` — `WARD_STORAGE=sqlite` persists tenant records via Node's built-in `node:sqlite` (experimental in Node 22). Restart persistence verified: state, counters, and enforcement survive a process kill. Memory remains the default. |
| Durable audit (SQLite) | prototype | Same backend; audit events rehydrate on boot and the id sequence continues. Not compliance-grade retention — a prototype persistence path only. |
| docker-agent image builds and runs | prototype | `examples/docker-agent/` — image builds; agent routes calls through Ward and stops on 423/429. |
| Dev-only Docker runner | prototype (disabled by default) | `apps/api/src/dockerRunner.ts` behind `WARD_ENABLE_DOCKER_RUNNER=true`: allowlisted images only, hard timeout, no mounts/privileged mode. Verified: launches `ward-example-agent`, run completes with exit code 0; mid-run constrain stopped the containerized agent (200, 200, 429); disallowed image and disabled-default both fail with clear errors. |
| SDK guard fail-open/fail-closed | prototype | `packages/ward-sdk` — `guard()` failMode "open" (default) runs the callback when Ward cannot answer and reports `decision: "fail_open"` with the error; "closed" refuses. Never silent. Verified by `npm run smoke:sdk` (6/6). |
| Proxy degraded fail-open | prototype | `WARD_PROXY_FAIL_MODE` in `apps/api/src/server.ts`: policy-lookup failure with mode open allows the request with `x-ward-fail-open: true` + `proxy_fail_open` audit event; closed blocks 503. Successful policy reads always enforce (constrained tenant stays 429). Verified by `npm run smoke:reliability` (13/13) using the test-only `WARD_TEST_FORCE_POLICY_ERROR` flag. |
| Shared-token control auth | prototype | `apps/api/src/controlAuth.ts` — single static bearer token guards all mutating `/ward/*` routes when `WARD_REQUIRE_CONTROL_TOKEN=true`; reads stay open; `/health` warns loudly when disabled. Not production RBAC. Verified by `npm run smoke:reliability`. |
| SQLite persistence in Docker Compose | prototype, demo-supported | Compose defaults to `WARD_STORAGE=sqlite` on the `ward-data` named volume. Verified: constrain survived an API-only container restart (429 before and after, audit intact); volume survives `docker compose down` (without `-v`). |
| No-NPM user Docker path | prototype, demo-supported | `docker-compose.user.yml` — one container, port 4317, SQLite volume, demo control token. Verified by `./scripts/smoke-user-install.sh` (all checks passing; docker + curl only, no NPM invoked). |
| API-served Control Room bundle | prototype, demo-supported | Multi-stage `apps/api/Dockerfile` builds the UI and the API serves it at `/` (`apps/api/src/staticAssets.ts`); `/` returns a clear JSON explanation when assets are missing. `/health` reports `controlRoomBundled`. |
| Shell-based no-NPM smoke test | prototype | `scripts/smoke-user-install.sh` — checks incl. bundled UI, auth 401/200, containment, and SQLite persistence across container restart (16 checks at last count; the script prints its own total). |
| uv/uvx wardctl helper | prototype | `tools/wardctl` — stdlib-only Python CLI (`health`, `tenants`, `tenant`, `constrain`, `pause`, `resume`, `audit`, `runs`) honoring `WARD_API_URL`/`WARD_CONTROL_TOKEN`. Verified via `uv run` and `uvx --from ./tools/wardctl` against a live auth-enabled API. |
| Control Room auth flow in browser | prototype, demo-supported | `apps/control-room/tests/demo-auth.spec.ts` — Playwright drives the approval/constrain flow with `WARD_REQUIRE_CONTROL_TOKEN=true`; unauthenticated mutation 401s, UI mutations succeed with the token; passing. |
| Fail-closed Compose example | prototype | `docker-compose.fail-closed.yml` overlay for the user bundle (`WARD_PROXY_FAIL_MODE=closed`); merged config validated. Runtime fail-closed behavior itself is verified by `npm run smoke:reliability`. |
| Optional mise contributor workflow | prototype (unexercised) | `mise.toml` task shortcuts; every task is a plain command and no verification path requires mise. mise was not installed on the build machine, so tasks were not executed — labeled honestly. |
| Formal OpenAPI contract | prototype | `openapi/ward.v0.yaml` (+ generated `.json`) covering all 14 implemented paths and 13 core schemas, with prototype-status honesty notes inline. Validated by `npm run validate:openapi`. |
| API-served OpenAPI contract | prototype, demo-supported | `GET /openapi.yaml` and `GET /openapi.json` served by the API (bundled into the Docker image); `/health` reports `openapi.served`. Verified via smoke-demo, the user install smoke, and a `docker run` of the local image. |
| Local release image build | prototype | `./scripts/build-image.sh local` -> `ward-api:local` (API + Control Room + OpenAPI). Verified: built and `docker run` served `/health`, `/openapi.yaml`, and the Control Room at `/`. Multi-arch command prepared (push=false), not exercised. |
| Pull-based Compose file (prepared) | prototype (inactive until publish) | `docker-compose.pull.yml` mirrors the user bundle against `ghcr.io/tenvia/ward-api:v0.1.0-rc1` (WARD_IMAGE-overridable); config validates. Will work only after the first image publish. |
| Release verification script | prototype | `./scripts/verify-release.sh` — OpenAPI validation, typechecks, builds, all four smokes, both E2Es, compose configs, local image build; explicit SKIPPED reporting, no silent skips. Full run passed (see BUILD_STATUS). |
| GitHub Actions publish workflow (prepared) | prototype (never executed) | `.github/workflows/docker-image.yml` — GHCR, linux/amd64+arm64, tags `v*` or manual dispatch only, standard `GITHUB_TOKEN`. Not run; first publish needs repo/package permission checks and owner confirmation. |
| Design-partner quickstart | prototype | `docs/DESIGN_PARTNER_QUICKSTART.md` — 8-step curl/UI walkthrough matching the verified demo behavior. |
| Live OpenAPI response conformance | prototype, demo-supported | `npm run smoke:openapi` (`scripts/smoke-openapi-conformance.mjs`) — 26 checks validating live responses (required fields, types, enums, nested shapes) against the contract's schemas across the full containment flow. Included in `verify-release.sh`. |
| Release-candidate checklist | prototype | `docs/RELEASE_CANDIDATE_CHECKLIST.md` — v0.1.0 gates, allowed-prototype list, must-not-claim list, do-not-publish-unless gates. |
| Design-partner evaluation script | prototype | `docs/DESIGN_PARTNER_EVALUATION_SCRIPT.md` — demo flow, discovery questions, objection handling aligned to Strategy A ("containment layer over existing tools"). |
| Publish-readiness checklist | prototype (publish NOT executed) | `docs/PUBLISH_READINESS.md` — owner/permissions/tag gates, future publish commands clearly labeled, post-publish verification, rollback notes. |
| Cooperative SDK guard | prototype | `packages/ward-sdk` — `WardClient.guard()` checks tenant state before running the callback. Cooperative containment only: code that bypasses the guard is not contained. |
| Mock workflow runner | prototype | `apps/api/src/workflowRuns.ts` — in-process simulation; paused/constrained tenants get `blocked` runs, running tenants complete. |
| Docker Compose local demo | prototype, demo-supported | Root `docker-compose.yml` + per-app Dockerfiles (API, Control Room, demo app). `docker compose up --build` was run end-to-end: containment held across containers (Acme 200, Globex 429). See `docs/BUILD_STATUS.md`. |
| Integration is a base-URL and header change | demo-supported (local prototype) | `examples/node-express-ai-saas/src/wardClient.ts` is the entire integration surface. |

## Planned claims (do not state as existing)

| Claim | Status | Note |
| --- | --- | --- |
| Production-grade durable audit | planned | SQLite prototype exists; no retention policy, export, or compliance posture. Postgres for hosted/K8s is planned. |
| Published registry image | planned | No image has been pushed to any registry. `docker-compose.pull.yml` and the Actions workflow are prepared and waiting. |
| Production auth / RBAC | planned | Only the shared-token prototype exists: one static token, no roles, rotation, or per-operator identity. |
| Real dollar-cost metering | planned | `estimatedSpend` is a fixed fake per-call rate. |
| Hosted Ward service | planned | Local/Docker only. |
| Proxy hard-down fallback | planned | If the Ward proxy process/network is fully down, Ward cannot pass traffic. Requires customer-side fallback routing or HA Ward deployment; neither exists. Do not claim Ward solves hard-down failure. |
| HA / multi-replica failover | planned | Blocked on durable shared state (Postgres). |
| Production Docker runner | planned | The dev-only prototype shells out to the local docker CLI; no isolation/scheduling story for shared hosts. |
| Real Kubernetes runner | planned | `k8sRunner.ts` is a stub adapter; `docs/KUBERNETES_PLAN.md` is a plan, not manifests. |
| Queue middleware | planned | Not started. |
| Multi-language SDKs | planned | TypeScript only today. |
| Multi-node placement | planned, high risk | In-memory state cannot replicate. |
| Saastle-managed hosted Ward operations | planned | Direction in `docs/SAASTLE_INTERNAL_APP_DIRECTION.md`; no integration built. |
| Full Python/FastAPI API migration | planned (direction only) | HTTP/OpenAPI is the stable contract; no migration work started, none promised. See `docs/USER_INSTALL_NO_NPM.md`. |
| Production readiness / SLA | not claimed | Do not use. |

## Claim rewrite rules

- "Ward prevents all runaway AI costs" -> "Ward bounds one tenant's
  blast radius; it does not guarantee cost ceilings against every
  failure mode (e.g., a loop that never calls the proxied API)."
- "Ward gives edge-level enforcement" (when only the SDK guard is
  integrated) -> state the guarantee ladder explicitly; SDK-only
  integration gives cooperative containment, not edge enforcement.
- "Production-ready" -> do not use. No uptime or SLA claim.
- "Durable audit trail" -> "In-memory audit trail; durable retention
  is planned."
- "Ward runs your agents on Docker/Kubernetes" -> "Mock runner today;
  Docker and Kubernetes runners are planned adapters with stubs and a
  written plan."

## Review discipline

This document is reviewed before any public claim ships and updated
when a claim's status changes. A claim at "planned" must never appear
in `README.md` without "planned" or "future" language. Automated
coverage today is two Playwright E2Es and the smoke battery in
`scripts/` (each script prints its own check count) — enough for
"demo-supported", not enough to label anything "tested" in the
unit/integration sense.
