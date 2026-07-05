<div align="center">

<img src="docs/assets/banner.svg" alt="Ward — tenant containment for AI SaaS" width="100%" />

<br/>

**Pause one customer's AI agents. Everyone else keeps running.**

[![release](https://img.shields.io/badge/release-v0.1.0--rc3--pending-1e56d6)](docs/releases/v0.1.0-rc3.md)
[![install](https://img.shields.io/badge/install-docker%2C_no_npm-2496ED?logo=docker&logoColor=white)](docs/USER_INSTALL_NO_NPM.md)
[![contract](https://img.shields.io/badge/API-OpenAPI_v0-6BA539?logo=openapiinitiative&logoColor=white)](openapi/ward.v0.yaml)
[![verification](https://img.shields.io/badge/RC3_battery-passing-3fb950)](docs/BUILD_STATUS.md)
[![status](https://img.shields.io/badge/status-prototype-d29922)](docs/CLAIMS_AND_EVIDENCE.md)
[![license](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)

[Quickstart](#first-60-seconds) ·
[Install](#install-no-npm) ·
[Integrate](#integrate-your-existing-saas) ·
[What's not](#what-ward-is-not) ·
[API Contract](openapi/ward.v0.yaml) ·
[Claims Ledger](docs/CLAIMS_AND_EVIDENCE.md) ·
[Release Notes](docs/releases/v0.1.0-rc3.md)

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

## First 60 seconds

The image below is small and self-contained. Two terminals is all you
need.

```bash
# 1. Pull the published image and start Ward.
docker compose -f docker-compose.pull.yml up -d

# 2. Wait for the API to come up.
until curl -sf http://localhost:4317/health >/dev/null; do sleep 0.5; done

# 3. Three calls demonstrate the tenant separation Acme/Globex-style.
#    Happy tenant — returns a normal completion.
curl -s -H "x-ward-tenant-id: acme" \
     -H "content-type: application/json" \
     -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"hi"}]}' \
     http://localhost:4317/v1/chat/completions | head -c 200

#    Tenant you pause — the proxy returns 423 BEFORE any upstream call.
curl -s -H "x-ward-tenant-id: globex" \
     -H "content-type: application/json" \
     -d '{"model":"gpt-4o-mini","messages":[]}' \
     http://localhost:4317/v1/chat/completions | head -c 200
```

What you should see:

- `acme` returns a normal OpenAI-shaped JSON completion
  (model + choices).
- `globex` is rejected at the proxy with `423 paused` after you pause
  it via the Control Room (`http://localhost:4317/`, demo token
  `ward-demo-token`) or via
  `curl -X POST -H "authorization: Bearer ward-demo-token" \
       http://localhost:4317/ward/tenants/globex/pause`.
- `GET /ward/audit` shows every event — pause, block, would-block — in
  order.

When you're done, `docker compose -f docker-compose.pull.yml down`
stops the container. SQLite audit survives until you also pass `--volumes`.

## Install (no NPM)

The published image runs anywhere Docker does:

```bash
docker compose -f docker-compose.pull.yml up
```

This serves the Control Room at `http://localhost:4317/`, the API at
`http://localhost:4317/v1/chat/completions` and the OpenAPI contract
at `http://localhost:4317/openapi.yaml`. SQLite audit lives on the
`ward-user-data` named volume.

To build the image locally instead (contributors):

```bash
docker compose -f docker-compose.user.yml up --build
./scripts/smoke-user-install.sh   # verify with Docker + curl only
```

Evaluating Ward? Start with the
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

## What's not — and that's by design

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
| Trying it tonight | [USER_INSTALL_NO_NPM](docs/USER_INSTALL_NO_NPM.md) | [DESIGN_PARTNER_QUICKSTART](docs/DESIGN_PARTNER_QUICKSTART.md) |
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
npm run test:unit                    # 10 suites, 53 unit checks
npm run smoke:audit-durability       # SQLite audit survives restart (RC3)
npm run smoke:tenant-mode-override   # per-tenant observe/enforce override (RC3)
npm run smoke:incident-receipt       # Markdown incident receipt from audit (RC3)
npm run smoke:rc3-failure-behavior   # RC3 trust/evidence boundary smoke (RC3)
npm run bench:latency                # local p50/p95 across mock + observe paths
./scripts/smoke-user-install.sh      # no-NPM user path (docker + curl)
cd apps/control-room && npm run test:e2e && npm run test:e2e:auth
```

`scripts/verify-release.sh` runs a curated subset (entry points,
typechecks, contract validation, demo / sdk / reliability / openapi
smokes, compose configs, image build, no-NPM user install). The four
RC3 prototype smokes (`smoke:audit-durability`,
`smoke:tenant-mode-override`, `smoke:incident-receipt`,
`smoke:rc3-failure-behavior`) are not yet wired into that harness —
running them via `npm run smoke:*` directly covers the same ground
and is fine for greenfield verification.

## What you'd see when each smoke passes

Every RC3 smoke prints a single summary line plus PASS / FAIL rows
per check. After a clean run you should see:

| Smoke | Summary line |
| --- | --- |
| `smoke:audit-durability` | `Audit durability smoke: 44 passed, 0 failed.` |
| `smoke:tenant-mode-override` | `Tenant mode override smoke: 38 passed, 0 failed.` |
| `smoke:incident-receipt` | `Incident receipt smoke: 20 passed, 0 failed.` |
| `smoke:rc3-failure-behavior` | `RC3 failure-behavior smoke: 37 passed, 0 failed.` |

If your run shows different numbers, something changed. Re-run
`npm run test:unit` first to surface contract drift; if it's green,
check `docs/BUILD_STATUS.md` for the last-known-good totals.

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
| [DESIGN_PARTNER_QUICKSTART](docs/DESIGN_PARTNER_QUICKSTART.md) | Evaluate Ward in 8 steps |
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
