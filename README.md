# Ward

Pause one customer's AI agents. Everyone else keeps running.

It is 2 a.m. and one customer's agent is stuck in a retry loop —
burning tokens, hammering rate limits, maybe writing bad data. Your
only levers are a global feature flag or a hotfix, and both punish
every other customer. Ward gives you a third lever: constrain or pause
that one tenant, with an approval step and an audit receipt, while the
rest of your customers never notice.

Demo line: "Globex was contained. Acme never blipped."

## What Ward is

Ward is tenant containment for AI SaaS: an OpenAI-compatible egress
proxy plus a tenant control plane. Route your agent/tool calls through
Ward with a tenant ID header; when one tenant goes sideways, an
operator constrains, pauses, resumes, and audits that tenant alone.

- Docker is the primary self-host path.
- HTTP/OpenAPI is the primary integration contract.
- Users never need NPM (or Node) — see the install path below.
- The TypeScript SDK is optional, not required.

## What Ward is not

- Not an APM or observability tool.
- Not an agent framework.
- Does not require Elixir.
- Does not require Saastle (10via's internal ops app; Ward runs fully
  standalone).
- Not production-ready yet: single-node, prototype/demo-supported
  operation. See `docs/CLAIMS_AND_EVIDENCE.md` before repeating any
  claim.

## Install (no NPM)

```bash
docker compose -f docker-compose.user.yml up --build
```

A prebuilt-image path is prepared at `docker-compose.pull.yml` and the
publish workflow at `.github/workflows/docker-image.yml`; no image has
been published yet, so build locally for now.

Evaluating Ward? Start with `docs/DESIGN_PARTNER_QUICKSTART.md`.

Open http://localhost:4317 — one container serving the API and the
Control Room, with SQLite persistence on a volume and a demo control
token (`ward-demo-token`; minimal shared-token control auth prototype,
not production RBAC). Full walkthrough: `docs/USER_INSTALL_NO_NPM.md`.

Verify it with Docker + curl only:

```bash
./scripts/smoke-user-install.sh
```

## Integrate your existing SaaS

You do not have to rebuild your SaaS around Ward. The first
integration can be one base-URL change plus a tenant ID header:

```diff
- OPENAI_BASE_URL=https://api.openai.com/v1
+ OPENAI_BASE_URL=http://your-ward-host:4317/v1
```

```text
x-ward-tenant-id: <your customer id>
```

Levels and honest guarantees (proxy = hard containment for routed
calls; SDK guard = cooperative; runners = Ward-launched work):
`docs/EXISTING_SAAS_INTEGRATION.md`.

HTTP/OpenAPI is Ward's primary integration contract. The formal
contract lives at `openapi/ward.v0.yaml` and every running Ward serves
it at `GET /openapi.yaml` (and `/openapi.json`).

## Reliability: "Ward should not become the outage"

1. SDK guard fail-open (implemented prototype): if Ward cannot answer,
   `guard()` defaults to running your callback and reports
   `fail_open` — never silently. `failMode: "closed"` refuses instead.
2. Proxy degraded fail-open (implemented prototype): if the API is up
   but policy lookup fails, `WARD_PROXY_FAIL_MODE=open` (default)
   allows the request with an `x-ward-fail-open: true` header and an
   audit event; `closed` blocks with 503 (overlay:
   `docker-compose.fail-closed.yml`). A successful policy read is
   always enforced.
3. Proxy hard-down (planned, customer-side): if the Ward process is
   fully down, proxied traffic does not flow. That requires
   customer-side fallback routing or an HA deployment — neither exists
   yet, and Ward does not claim otherwise.

## Operator surfaces

- Control Room UI — bundled with the API container at `/`.
- `wardctl` — tiny uv/uvx Python CLI (`tools/wardctl/`), no NPM.
- Raw HTTP with the control token.

## Repository layout

```text
apps/api/                      Ward API + bundled Control Room (port 4317)
apps/control-room/             Control Room source (React/Vite, built into the API image)
packages/ward-sdk/             Optional TypeScript SDK
examples/node-express-ai-saas/ Existing-SaaS demo app (port 4401)
examples/docker-agent/         Example agent container
tools/wardctl/                 uv-based CLI helper
scripts/                       Smoke tests (demo, sdk, reliability, user install)
docs/                          Runbooks, claims, architecture, strategy
```

## Contributor quickstart (NPM is contributor tooling only)

```bash
# Terminal 1 — API          # Terminal 2 — demo SaaS        # Terminal 3 — UI
cd apps/api && npm i && npm run dev
cd examples/node-express-ai-saas && npm i && npm run dev
cd apps/control-room && npm i && npm run dev
```

`mise.toml` provides optional task shortcuts; mise is never required.

## Verification

```bash
./scripts/verify-release.sh   # full release battery (maintainers)
npm run validate:openapi      # OpenAPI contract validation
npm run smoke:openapi         # live responses conform to the contract (API running)
npm run smoke:demo            # 18-check containment demo (API running)
npm run smoke:sdk             # SDK guard + fail modes (API running)
npm run smoke:reliability     # fail-open/closed + control auth (self-starting)
./scripts/smoke-user-install.sh   # no-NPM Docker user path (Docker + curl)
cd apps/control-room && npm run test:e2e        # browser E2E
cd apps/control-room && npm run test:e2e:auth   # browser E2E with control auth on
```

## Workflow runners

- Mock runner — implemented prototype.
- Docker runner — dev-only prototype, disabled by default
  (`WARD_ENABLE_DOCKER_RUNNER=true`, allowlisted images, hard timeout,
  no mounts/privileged). Safety notes: `docs/DOCKER_RUNBOOK.md`.
- Kubernetes runner — planned (`docs/KUBERNETES_PLAN.md`).

## Storage

Local default is in-memory. `WARD_STORAGE=sqlite` enables prototype
persistence (Node built-in `node:sqlite`, experimental in Node 22);
both compose files run SQLite on a named volume, verified across
container restarts. Postgres is planned for hosted/Kubernetes.

## Documentation

- `docs/USER_INSTALL_NO_NPM.md` — the no-NPM user install path.
- `docs/DESIGN_PARTNER_QUICKSTART.md` — evaluate Ward in 8 steps.
- `docs/DESIGN_PARTNER_EVALUATION_SCRIPT.md` — how to demo/discuss Ward.
- `docs/RELEASE_CANDIDATE_CHECKLIST.md` — v0.1.0 gates.
- `docs/PUBLISH_READINESS.md` — first-publish procedure (not executed).
- `docs/EXISTING_SAAS_INTEGRATION.md` — stack-neutral integration.
- `docs/LOCAL_DEMO_RUNBOOK.md` — contributor demo + smoke commands.
- `docs/DOCKER_RUNBOOK.md` — compose stacks and the Docker runner.
- `docs/DEPLOYMENT_MODEL.md` — modes, storage, failure behavior.
- `docs/ARCHITECTURE.md` — control plane and chokepoints.
- `docs/KUBERNETES_PLAN.md` — planned K8s shape.
- `docs/CLAIMS_AND_EVIDENCE.md` — the claims ledger (read this).
- `docs/BUILD_STATUS.md` — what is verified, with evidence.
- `docs/STRATEGY_A_C_THEN_B.md` — product strategy.
- `docs/SAASTLE_INTERNAL_APP_DIRECTION.md` — Saastle's internal role.
