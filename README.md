<div align="center">

<img src="docs/assets/banner.svg" alt="Ward — tenant containment for AI SaaS" width="100%" />

<br/>

**Pause one customer's AI agents. Everyone else keeps running.**

[![release](https://img.shields.io/badge/release-v0.1.0--rc4-1e56d6)](docs/releases/v0.1.0-rc4.md)
[![install](https://img.shields.io/badge/install-docker%2C_no_npm-2496ED?logo=docker&logoColor=white)](docs/USER_INSTALL_NO_NPM.md)
[![contract](https://img.shields.io/badge/API-OpenAPI_v0-6BA539?logo=openapiinitiative&logoColor=white)](openapi/ward.v0.yaml)
[![verification](https://img.shields.io/badge/RC4_battery-passing-3fb950)](docs/BUILD_STATUS.md)
[![status](https://img.shields.io/badge/status-prototype-d29922)](docs/CLAIMS_AND_EVIDENCE.md)
[![license](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)

[Evaluate in 30 minutes](#evaluate-in-30-minutes) ·
[Quickstart](#first-60-seconds) ·
[Install](#install-no-npm) ·
[Integrate](#integrate-your-existing-saas) ·
[What's not](#what-ward-is-not) ·
[API Contract](openapi/ward.v0.yaml) ·
[Claims Ledger](docs/CLAIMS_AND_EVIDENCE.md) ·
[Release Notes](docs/releases/v0.1.0-rc4.md)

</div>

---

It is 2 a.m. and one customer's agent is stuck in a retry loop —
burning tokens, hammering rate limits, maybe writing bad data. Your
only levers are a global feature flag or a hotfix, and both punish
every other customer. Ward gives you a third lever: **constrain or
pause that one tenant**, with an approval step and an audit receipt,
while the rest of your customers never notice.

> "Globex was contained. Acme never blipped."

## How it works

```text
your SaaS ──(x-ward-tenant-id)──> Ward proxy ──> LLM / tool APIs
                                    │
                     tenant state · pressure detection
                     approval tokens · audit trail
                                    │
                          Control Room (bundled UI)
```

- **Docker-first** self-hosting; **HTTP/OpenAPI** is the integration
  contract (`GET /openapi.yaml` is served by every running
  instance).
- **No NPM for users** — one container serves API + Control Room.
- The TypeScript SDK (cooperative `guard()`) is optional, never
  required.

## Evaluate in 30 minutes

Start with the [evaluator quickstart](docs/EVALUATOR_QUICKSTART.md) if
you want the safest copy/paste path. It creates an explicit `.env`,
generates a local control token, pulls the published image, verifies
health/OpenAPI/Control Room, proves Globex is contained while Acme still
works, and tears down cleanly.

Use this route when you are evaluating Ward cold:

| Time | Goal | Path |
| --- | --- | --- |
| 0-3 min | Understand the wedge | Read the problem statement above and [what Ward is not](#what-ward-is-not). |
| 3-10 min | Boot the prototype safely | Run [First 60 seconds](#first-60-seconds) or the full [evaluator quickstart](docs/EVALUATOR_QUICKSTART.md). |
| 10-20 min | Verify the surface | Check `/health`, `/openapi.yaml`, the bundled Control Room, and control-auth rejection. Visual reference: [RC5 visual proof](docs/RC5_VISUAL_PROOF.md). |
| 20-30 min | Prove containment and limits | Constrain Globex, confirm Acme still returns `200`, inspect audit, then read [claims](docs/CLAIMS_AND_EVIDENCE.md). |

If something fails, go first to the quickstart's
[common first-run issues](docs/EVALUATOR_QUICKSTART.md#common-first-run-issues)
section and then the [operator runbook](docs/OPERATOR_RUNBOOK.md). Do
not expose Ward publicly, and do not reuse `ward-demo-token` beyond a
local demo.

## First 60 seconds

This path uses the published image, explicit env vars, SQLite, and
control auth with a generated local token. It is a local/container
prototype check, not production deployment guidance.

```bash
# 1. Create an explicit evaluator env file.
cat > .env <<'EOF'
WARD_IMAGE=ghcr.io/tenvia/ward-api:v0.1.0-rc4
WARD_REQUIRE_CONTROL_TOKEN=true
WARD_STORAGE=sqlite
WARD_PROXY_FAIL_MODE=open
WARD_MODE=enforce
EOF
printf "WARD_CONTROL_TOKEN=%s\n" "$(openssl rand -hex 24)" >> .env
set -a; . ./.env; set +a

# 2. Pull the image and start Ward.
docker compose --env-file .env -f docker-compose.pull.yml up -d
until curl -fsS http://localhost:4317/health >/tmp/ward-health.json; do sleep 0.5; done

# 3. Verify health, OpenAPI, and Control Room.
cat /tmp/ward-health.json
curl -fsS http://localhost:4317/openapi.yaml | head -n 1
curl -fsS http://localhost:4317/ -o /tmp/ward-control-room.html
grep -q '<div id="root">' /tmp/ward-control-room.html && echo "Control Room served"

# 4. Prove tenant containment with auth.
curl -fsS -X POST http://localhost:4317/ward/tenants/tenant_globex/constrain \
  -H "authorization: Bearer ${WARD_CONTROL_TOKEN}" \
  -H "content-type: application/json" \
  -d '{"actor":"evaluator","reason":"quickstart containment check"}'

curl -sS -o /tmp/ward-globex-blocked.json -w "%{http_code}\n" \
  -X POST http://localhost:4317/v1/chat/completions \
  -H "x-ward-tenant-id: tenant_globex" \
  -H "content-type: application/json" \
  -d '{"model":"demo","messages":[{"role":"user","content":"hi"}]}'

curl -sS -o /tmp/ward-acme-ok.json -w "%{http_code}\n" \
  -X POST http://localhost:4317/v1/chat/completions \
  -H "x-ward-tenant-id: tenant_acme" \
  -H "content-type: application/json" \
  -d '{"model":"demo","messages":[{"role":"user","content":"hi"}]}'

# 5. Stop cleanly; add --volumes only to delete SQLite state.
docker compose --env-file .env -f docker-compose.pull.yml down
```

What you should see:

- `/health` reports `storage: sqlite`, control auth required,
  `controlRoomBundled: true`, and `openapi.served: true`.
- The OpenAPI command prints `openapi: 3.0.3`.
- The Globex call prints `429`; the Acme call prints `200`.
- The generated token is for local evaluation only. Do not expose Ward
  publicly yet, and never use `ward-demo-token` outside a local demo.

Full evaluator walkthrough:
[EVALUATOR_QUICKSTART](docs/EVALUATOR_QUICKSTART.md).

## Install (no NPM)

The published image runs anywhere Docker does. For evaluator-safe setup,
use the `.env` flow above or `docs/EVALUATOR_QUICKSTART.md`; running
compose without explicit env vars may use demo defaults.

```bash
docker compose --env-file .env -f docker-compose.pull.yml up
```

This serves the Control Room at `http://localhost:4317/`, the API at
`http://localhost:4317/v1/chat/completions`, and the OpenAPI contract at
`http://localhost:4317/openapi.yaml`. SQLite audit lives on the
`ward-user-data` named volume.

To build the image locally instead (contributors):

```bash
docker compose -f docker-compose.user.yml up --build
./scripts/smoke-user-install.sh   # verify with Docker + curl only
```

Evaluating Ward? Start with the
[evaluator quickstart](docs/EVALUATOR_QUICKSTART.md), then the
[design-partner quickstart](docs/DESIGN_PARTNER_QUICKSTART.md).

## Integrate your existing SaaS

You do not have to rebuild your SaaS around Ward. The first integration
is one base-URL change plus a tenant header:

```diff
- OPENAI_BASE_URL=https://api.openai.com/v1
+ OPENAI_BASE_URL=http://your-ward-host:4317/v1
```

```text
x-ward-tenant-id: <your customer id>
```

| Level | Mechanism | Guarantee |
| --- | --- | --- |
| Proxy-only | base URL + header | hard containment for routed calls |
| SDK guard | `ward.guard({ tenantId, run })` | cooperative |
| Workflow runners | Ward launches the work | mock today; Docker dev-only; K8s planned |

Details and honest guarantees:
[EXISTING_SAAS_INTEGRATION.md](docs/EXISTING_SAAS_INTEGRATION.md).

## What Ward is not

Ward is **deliberately not**:

- An APM tool, an observability platform, or a Datadog / Grafana
  replacement. We emit audit events; we do not let you browse traces
  here.
- An AI gateway, model router, or token optimizer. Ward does not
  rewrite payloads or pick a model for you.
- An agent framework or workflow runtime. Keep LangGraph / Temporal /
  whatever you already run.
- A compliance product. Tamper-evident signed receipts, SOC2-style
  reports, and Postgres-backed durable audit are all **planned**, not
  built. The Markdown incident receipt exported by `incident:export`
  is **operational evidence**, not legal certification.
- Production-ready. Single-node prototype, shared-token control auth
  prototype, SQLite prototype, no Postgres, no multi-replica
  failover. Read the [claims ledger](docs/CLAIMS_AND_EVIDENCE.md)
  before repeating any claim.

## What to read first

| Reader | Start here | Then |
| --- | --- | --- |
| Trying it tonight | [EVALUATOR_QUICKSTART](docs/EVALUATOR_QUICKSTART.md) | [USER_INSTALL_NO_NPM](docs/USER_INSTALL_NO_NPM.md) |
| Integrating your SaaS | [EXISTING_SAAS_INTEGRATION](docs/EXISTING_SAAS_INTEGRATION.md) | [ARCHITECTURE](docs/ARCHITECTURE.md) |
| Operating Ward | [DEPLOYMENT_MODEL](docs/DEPLOYMENT_MODEL.md) | [DOCKER_RUNBOOK](docs/DOCKER_RUNBOOK.md) |
| Writing code / contributing | This repo, `apps/api/src/server.ts` | [RELEASE_CANDIDATE_CHECKLIST](docs/RELEASE_CANDIDATE_CHECKLIST.md) |

Every public claim is grounded in
[CLAIMS_AND_EVIDENCE](docs/CLAIMS_AND_EVIDENCE.md). If something in
this README or any demo conversation contradicts the ledger, the
ledger wins.

## Smoke in 60 seconds (sanity)

A first-time contributor usually wants two questions answered fast:
"is it running, and does the contract match reality?"

```bash
./scripts/verify-release.sh   # full maintainer battery
npm run smoke:openapi         # live responses match the contract
npm run smoke:reliability     # fail-open / control auth behavior
```

Those three are enough on a fresh clone.

## Full battery

Maintainers, contributors doing risky edits, and the release cadence
use the full battery:

```bash
npm run validate:openapi             # contract structure
npm run smoke:demo                   # end-to-end containment demo
npm run smoke:sdk                    # SDK guard + fail modes
npm run smoke:observe-only           # observe-mode would-block evidence (RC2)
npm run smoke:pass-through:mock      # forwardToUpstream against a local mock (RC2)
npm run smoke:streaming:mock         # deterministic mock SSE, enforcement first (RC2)
npm run test:unit                    # API unit suite
npm run smoke:audit-durability       # SQLite audit survives restart (RC3)
npm run smoke:tenant-mode-override   # per-tenant observe/enforce override (RC3)
npm run smoke:incident-receipt       # Markdown incident receipt from audit (RC3)
npm run smoke:rc3-failure-behavior   # RC3 trust/evidence boundary smoke (RC3)
npm run bench:latency                # local p50/p95 across mock + observe paths
./scripts/smoke-user-install.sh      # no-NPM user path (docker + curl)
cd apps/control-room && npm run test:e2e && npm run test:e2e:auth
```

`scripts/verify-release.sh` is the maintainer release gate. It runs
OpenAPI validation, typechecks, package builds, the demo / SDK /
OpenAPI / reliability smokes, all four RC3 prototype smokes, browser
E2Es when Playwright is installed, compose config checks, a local image
build, and the no-NPM user install smoke. It reports every PASS, FAIL,
and SKIPPED section explicitly.

Each smoke prints its own pass/fail count. Prefer the script output as
ground truth instead of copying counts into new docs; use
`docs/BUILD_STATUS.md` only as recorded historical evidence.

## Develop locally

NPM / Node is contributor tooling only. The Docker path above is the
default for users.

```bash
cd apps/api && npm i && npm run dev                      # API :4317
cd examples/node-express-ai-saas && npm i && npm run dev # demo :4401
cd apps/control-room && npm i && npm run dev             # UI  :5173
```

`mise.toml` has optional task shortcuts; mise is never required.

## Repository layout

```
apps/api/                  Ward API (TypeScript, Express)
apps/control-room/         Control Room UI (React + Vite)
examples/node-express-ai-saas/  Existing-SaaS demo app (4401)
examples/docker-agent/      Example agent container
packages/ward-sdk/          Optional TypeScript SDK
tools/wardctl/               uv/uvx CLI helper (no NPM)
openapi/                    ward.v0.yaml — the formal contract
scripts/                    Smokes + release verification
docs/                       Runbooks, claims, releases, strategy
```

## Documentation

| Doc | What it covers |
| --- | --- |
| [USER_INSTALL_NO_NPM](docs/USER_INSTALL_NO_NPM.md) | The user install path |
| [EVALUATOR_QUICKSTART](docs/EVALUATOR_QUICKSTART.md) | Pull, configure, verify, operate, and stop the local/container prototype |
| [ENVIRONMENT](docs/ENVIRONMENT.md) | Supported env vars, safe evaluator baseline, prototype-only flags |
| [DESIGN_PARTNER_QUICKSTART](docs/DESIGN_PARTNER_QUICKSTART.md) | Evaluate Ward in 8 steps |
| [OPERATOR_RUNBOOK](docs/OPERATOR_RUNBOOK.md) | Short runbooks for common prototype incidents |
| [DESIGN_PARTNER_EVALUATION_SCRIPT](docs/DESIGN_PARTNER_EVALUATION_SCRIPT.md) | How to demo/discuss Ward |
| [DEMO_SCRIPT](docs/DEMO_SCRIPT.md) | The Acme/Globex walkthrough |
| [EXISTING_SAAS_INTEGRATION](docs/EXISTING_SAAS_INTEGRATION.md) | Stack-neutral integration |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | Control plane and chokepoints |
| [DEPLOYMENT_MODEL](docs/DEPLOYMENT_MODEL.md) | Modes, storage, failure behavior |
| [DOCKER_RUNBOOK](docs/DOCKER_RUNBOOK.md) | Compose stacks + Docker runner |
| [KUBERNETES_PLAN](docs/KUBERNETES_PLAN.md) | Planned K8s shape |
| [ROADMAP](ROADMAP.md) | Phased roadmap, honest statuses |
| [CLAIMS_AND_EVIDENCE](docs/CLAIMS_AND_EVIDENCE.md) | **Read this** before repeating any claim |
| [BUILD_STATUS](docs/BUILD_STATUS.md) | What is verified, with evidence |
| [RELEASE_CANDIDATE_CHECKLIST](docs/RELEASE_CANDIDATE_CHECKLIST.md) | v0.1.0 gates |
| [PUBLISH_READINESS](docs/PUBLISH_READINESS.md) | First-publish procedure |
| [STRATEGY_A_C_THEN_B](docs/STRATEGY_A_C_THEN_B.md) | Product strategy |
| [SAASTLE_INTERNAL_APP_DIRECTION](docs/SAASTLE_INTERNAL_APP_DIRECTION.md) | Saastle's internal role |

---

<div align="center">
<sub>Ward is a 10via project. Prototype software — see the
<a href="docs/CLAIMS_AND_EVIDENCE.md">claims ledger</a> before
repeating any claim.</sub>
</div>
