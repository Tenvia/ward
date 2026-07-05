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
| In-memory tenant state | prototype | `apps/api/src/tenantState.ts` — running / constrained / paused plus pressure, spend estimate, active runs, deployment mode. Lost on restart by default; survives restart when `WARD_STORAGE=sqlite`. |
| Tenant-specific constrain/pause/resume | prototype, demo-supported | Constrained tenant gets 429, paused gets 423, while other tenants' calls succeed. Verified in the curl sequence in `docs/BUILD_STATUS.md`. |
| Pressure/loop detection | prototype, demo-supported | `apps/api/src/detection.ts` — env-configurable sliding window (default 8 req / 10s), fed by real proxy traffic. Flags and audits; never auto-constrains in Phase 1. |
| In-memory approval-token flow | prototype, demo-supported | `apps/api/src/approvals.ts` — single-use, 120s TTL, tenant+action-bound token with exact confirmation phrase. Native TypeScript reimplementation of Saastle's confirmation-token pattern; not production RBAC. |
| API unit test baseline | prototype, demo-supported | `apps/api/src/*.test.ts` covers tenant state transitions, detection thresholds, approval issuance/phrase/TTL/single-use, audit append/list, the RC3 mode-override helper, and the RC3 state-transition contract. Verified by `npm run test:unit` (10 suites, 53 checks, all pass). |
| Observe-only mode | prototype, demo-supported | `WARD_MODE=observe\|enforce` (default `enforce`). In observe mode, otherwise-valid `/v1/chat/completions` traffic for paused or constrained tenants is not blocked; an `x-ward-would-block: paused\|constrained` response header is set and a `would_block` audit event is appended. Observe mode does NOT bypass missing-tenant-header 400, control-auth 401, policy-unavailable 503, or upstream errors. Verified by `npm run smoke:observe-only` (13/13). |
| Mock upstream pass-through verification | prototype, demo-supported | `forwardToUpstream` exercised against a local OpenAI-compatible mock at `http://127.0.0.1:4392` with a fake API key. Live provider compatibility is NOT claimed. Verified by `npm run smoke:pass-through:mock` (9/9). |
| Deterministic mock SSE streaming | prototype, demo-supported | When the request body sets `stream: true`, running tenants receive a deterministic mock SSE stream (`mockStreamChatCompletion`). Enforcement decisions (paused/constrained/missing-tenant) complete before SSE headers are flushed and before the first chunk is written; enforce-mode 423/429/400 responses remain JSON. Pass-through streaming is NOT supported — a request with `stream: true` and `WARD_UPSTREAM_OPENAI_BASE_URL` set receives the deterministic mock stream, not upstream SSE. Verified by `npm run smoke:streaming:mock` (20/20). |
| Local latency benchmark | prototype | `npm run bench:latency` reports p50/p95/min/max for `mock_chat_completion`, `mock_pass_through`, and `observe_constrained_would_block` against a freshly-spawned local Ward on port 4394. Default 50 requests per scenario, override via `WARD_BENCH_REQUESTS=N`. Local/dev only — production SLA, provider-wide overhead, and generalization beyond the local machine are NOT claimed. |
| In-memory audit trail | prototype | `apps/api/src/audit.ts` — approvals, transitions, pressure detections, workflow-run events. Lost on restart by default; survives restart when `WARD_STORAGE=sqlite`. `GET /ward/audit`. |
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
| Published registry image | prototype, demo-supported | `ghcr.io/tenvia/ward-api:v0.1.0-rc1` (+ `0.1.0-rc1`), public, linux/amd64+arm64, digest `sha256:2c34f247…`, revision label `bca2396`. Anonymous pull verified 2026-07-05. Note: the tag was pushed twice during release prep (an earlier `bf63411` build was superseded pre-announcement); published tags are not reused after this point. |
| Pull-based Compose file | prototype, demo-supported | `docker-compose.pull.yml` against `ghcr.io/tenvia/ward-api:v0.1.0-rc1` (WARD_IMAGE-overridable). Verified 2026-07-05 against the published image: anonymous pull, boot, health/contract/Control Room, full containment sequence, control-auth 401, SQLite persistence across container restart. |
| Release verification script | prototype | `./scripts/verify-release.sh` — OpenAPI validation, typechecks, builds, all four smokes, both E2Es, compose configs, local image build; explicit SKIPPED reporting, no silent skips. Full run passed (see BUILD_STATUS). RC3 prototype smokes (`smoke:audit-durability`, `smoke:tenant-mode-override`, `smoke:incident-receipt`, `smoke:rc3-failure-behavior`) are NOT yet included — see "Open risks" below. |
| GitHub Actions publish workflow | prototype (executed) | `.github/workflows/docker-image.yml` — GHCR, linux/amd64+arm64, tags `v*` or manual dispatch only, standard `GITHUB_TOKEN`. First executed on the `v0.1.0-rc1` tag (run 28736769316, 2026-07-05); published digest `sha256:2c34f247…` from commit `bca2396`. |
| Design-partner quickstart | prototype | `docs/DESIGN_PARTNER_QUICKSTART.md` — 8-step curl/UI walkthrough matching the verified demo behavior. |
| Live OpenAPI response conformance | prototype, demo-supported | `npm run smoke:openapi` (`scripts/smoke-openapi-conformance.mjs`) — 26 checks validating live responses (required fields, types, enums, nested shapes) against the contract's schemas across the full containment flow. Not yet included in `verify-release.sh` after the RC3 contract changes. |
| Release-candidate checklist | prototype | `docs/RELEASE_CANDIDATE_CHECKLIST.md` — v0.1.0 gates, allowed-prototype list, must-not-claim list, do-not-publish-unless gates. |
| Design-partner evaluation script | prototype | `docs/DESIGN_PARTNER_EVALUATION_SCRIPT.md` — demo flow, discovery questions, objection handling aligned to Strategy A ("containment layer over existing tools"). |
| Publish-readiness checklist | prototype (publish executed 2026-07-05) | `docs/PUBLISH_READINESS.md` — owner/permissions/tag gates, publish commands, post-publish verification (performed against the live package), rollback notes. |
| Cooperative SDK guard | prototype | `packages/ward-sdk` — `WardClient.guard()` checks tenant state before running the callback. Cooperative containment only: code that bypasses the guard is not contained. |
| Mock workflow runner | prototype | `apps/api/src/workflowRuns.ts` — in-process simulation; paused/constrained tenants get `blocked` runs, running tenants complete. |
| Docker Compose local demo | prototype, demo-supported | Root `docker-compose.yml` + per-app Dockerfiles (API, Control Room, demo app). `docker compose up --build` was run end-to-end: containment held across containers (Acme 200, Globex 429). See `docs/BUILD_STATUS.md`. |
| Integration is a base-URL and header change | demo-supported (local prototype) | `examples/node-express-ai-saas/src/wardClient.ts` is the entire integration surface. |

### RC3 prototype rows (added 2026-07-05; verified per Slice 7 battery)

| Claim | Status | Evidence / caveat |
| --- | --- | --- |
| Versioned local audit events | prototype, demo-supported | Every emitted `AuditEvent` carries `schemaVersion: 1` (literal type in `apps/api/src/types.ts`; OpenAPI property documented as `integer enum: [1]` in `openapi/ward.v0.yaml`). Two new unit tests pin this: "emits schemaVersion=1 on every event" and "preserves a stable, unique id across calls". Verified by `npm run test:unit` (10 suites, 53/53 pass). |
| SQLite audit persists across restart | prototype, demo-supported | Ward's existing SQLite storage rehydrates audit events on boot. A new smoke (`scripts/smoke-audit-durability.mjs`, root `smoke:audit-durability`) triggers a would-block event under `WARD_MODE=observe`, kills the process, restarts with the same `WARD_SQLITE_PATH`, and confirms the same event id is still present (44/44 checks, exit 0). The smoke covers schemaVersion round-trip on disk. |
| Per-tenant observe/enforce mode override | prototype, demo-supported | `POST /ward/tenants/:tenantId/mode` accepts `{ mode: "inherit" \| "observe" \| "enforce", actor?, reason? }` (control-auth-gated). Helper `effectiveWardMode(global, override)` resolves per request; override changes are audited with action `mode_override_changed` and `evidence.{previousOverride, nextOverride}`. New unit suite `effectiveWardMode.test.ts` covers the four table cases; `tenantState.test.ts` covers default `inherit` + setter behavior. Verified by `npm run test:unit` + `npm run smoke:tenant-mode-override` (38/38). Default for new tenants is `inherit`. There is no "off" or silent-bypass value. |
| Explicit tenant state transition contract | prototype, demo-supported | `apps/api/src/stateTransitions.ts` defines the allow-table: `running→constrained`, `running→paused`, `constrained→running`, `constrained→paused`, `paused→running` are allowed; `paused→constrained` and same-state are rejected with HTTP 409 `ward_invalid_transition` carrying `rejection`, `from`, `to`. Documented in OpenAPI on all four transition paths. Verified by `npm run smoke:rc3-failure-behavior` case 8 (`paused → constrained` returns 409 with the documented envelope) + unit tests in `stateTransitions.test.ts` and `tenants.transitions.test.ts`. |
| Transition rejection envelope | prototype | 409 responses on `POST /ward/tenants/{tenantId}/{constrain,pause,resume}` and `POST /ward/tenants/{tenantId}/apply-approved-action` carry the OpenAPI-documented `TransitionRejection` body: `{ error: "ward_invalid_transition", message, rejection: "unsupported_transition"|"same_state"|"invalid_state", from: TenantState|null, to: TenantState }`. Verified by `smoke:rc3-failure-behavior` case 8 and `smoke:openapi` (live conformance walk still 26/26). |
| Local incident receipt export | prototype | `npm run incident:export` (`scripts/export-incident-receipt.mjs`) reads `WARD_STORAGE=sqlite` or a live `/ward/audit` and emits a Markdown document with the required sections (generated timestamp, tenant ID, audit event count + IDs in a code block, state transition summary, would-block summary, mode-override summary, approval summary, limitations block disclaiming compliance/forensic/tamper-proof/production posture). A `scripts/smoke-incident-receipt.mjs` smoke generates a small scenario, exports, and asserts required content + disclaimer semantics (20/20). |
| RC3 failure-behavior smoke coverage | prototype | `npm run smoke:rc3-failure-behavior` (`scripts/smoke-rc3-failure-behavior.mjs`) covers 9 cases (37 checks): audit survives restart, missing tenant header is JSON, upstream failure surfaces a clear 502 in enforce + observe mode (must NOT be hidden as would-block), enforce mode blocks before upstream (zero upstream hits while constrained), approval token reuse rejected (single-use), streaming + constrained returns 429 JSON (not SSE), `paused→constrained` returns 409 with the documented envelope, `smoke:incident-receipt` still passes. All 37/37 green (exit 0). |

## Planned claims (do not state as existing)

| Claim | Status | Note |
| --- | --- | --- |
| Production-grade durable audit | planned | SQLite prototype exists; no retention policy, export to a compliance sink, or signed receipts. Postgres for hosted/K8s is planned. The new incident receipt is operational evidence, not legal/compliance certification. |
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
| Pass-through streaming against a real upstream | planned, out of RC3 | A `stream: true` request still receives the deterministic mock; no upstream SSE pipeline exists. |
| Tamper-proof or signed receipts | planned | The `incident:export` output is unsigned plaintext (or JSON). |
| Design-partner-ready | not cleared by RC3 | Verification battery passes; intentional gate (writing partner-friendly demo + feedback loop + cleanup) is Phase 1 next step per `ROADMAP.md`, not cleared by RC3 on its own. |

## Claim rewrite rules

- "Ward prevents all runaway AI costs" -> "Ward bounds one tenant's
  blast radius; it does not guarantee cost ceilings against every
  failure mode (e.g., a loop that never calls the proxied API)."
- "Ward gives edge-level enforcement" (when only the SDK guard is
  integrated) -> state the guarantee ladder explicitly; SDK-only
  integration gives cooperative containment, not edge enforcement.
- "Production-ready" -> do not use. No uptime or SLA claim.
- "Durable audit trail" -> "Ward persists audit events in local SQLite
  mode; durable retention, compliance posture, and tamper-evident
  receipts are not implemented. Use `npm run incident:export` for an
  operational-evidence Markdown receipt from local audit data."
- "Ward runs your agents on Docker/Kubernetes" -> "Mock runner today;
  Docker and Kubernetes runners are planned adapters with stubs and a
  written plan."
- "Ward gives me a tamper-proof receipt" -> "Receipts are operational
  evidence, not legal/compliance certification and not tamper-proof."
- "Ward is compliant / SOC2 / audit-ready" -> "No. Production-grade
  audit, RBAC, retention, and compliance posture are all planned."

## Review discipline

This document is reviewed before any public claim ships and updated
when a claim's status changes. A claim at "planned" must never appear
in `README.md` without "planned" or "future" language. Automated
coverage today is two Playwright E2Es, the unit suite at
`apps/api/src/*.test.ts`, and the smoke battery in `scripts/`
(each script prints its own check count) — enough for
"demo-supported", not enough to label anything "tested" in the
unit/integration sense.

RC3 prototype rows above are each grounded in a passing command; if
the command's exit code changes to non-zero in a future session, the
row's status must drop or the row must be removed. New RC3 smokes are
wired to `verify-release.sh` only when explicitly updated there; the
Release verification script row above notes the current gap.

## Open risks inherited at end of RC3

- `scripts/verify-release.sh` does not yet include any of the RC3
  prototype smokes (`smoke:audit-durability`, `smoke:tenant-mode-override`,
  `smoke:incident-receipt`, `smoke:rc3-failure-behavior`). Slice 7's
  permission-to-update was "small + safe" — given that the four smokes
  spawn their own Ward processes and bind test-only ports, wiring
  them is mechanical; defer to Slice 8 (final RC3 verification)
  which has the explicit scope to refresh `verify-release.sh`.
- Each `schemaVersion` round-trip ships only local SQLite. A future
  RC3-bump (schema v2) needs a row-migration story; flagged now,
  no work done.
- `modeOverride` is honored in enforcement decisions but the
  per-tenant mode badge in the Control Room UI is not yet wired.
  Scope: Control Room; out of RC3.
- Production auth/RBAC, Postgres, hosted Ward, pass-through streaming
  against a real upstream, and tamper-evident receipts all remain
  `planned` until built and verified.
