# Ward Environment Contract

## Summary

This document is the Ward RC4 Slice 1 environment contract. It lists the
environment variables Ward currently supports so a technical evaluator
can configure the local/container prototype without reading source code.

Ward remains a prototype. Environment variables can make the local or
container evaluator path safer and more explicit; they do not enable
production readiness, hosted Ward, HA, Postgres, enterprise RBAC, OIDC,
compliance retention, tamper-proof receipts, or real upstream
pass-through streaming.

For the copy/paste evaluator flow that uses this contract, see
`docs/EVALUATOR_QUICKSTART.md`. For prototype-incident runbooks
(control auth misconfig, accidental pause, observe-mode would-blocks,
upstream failure, SQLite missing, incident receipt export, verifier
failure), see `docs/OPERATOR_RUNBOOK.md`.

## Secure evaluator baseline

For an evaluator running the prebuilt image or user bundle locally, start
with an explicit `.env` instead of relying on demo-token defaults:

```bash
WARD_REQUIRE_CONTROL_TOKEN=true
WARD_CONTROL_TOKEN=replace-with-a-long-random-local-token
WARD_STORAGE=sqlite
WARD_PROXY_FAIL_MODE=open
WARD_MODE=enforce
```

Optional when using `docker-compose.pull.yml` and pinning a specific
published image:

```bash
WARD_IMAGE=ghcr.io/tenvia/ward-api:v0.1.0-rc4
```

Rules:

- Never expose Ward publicly with `WARD_REQUIRE_CONTROL_TOKEN=false`.
- Never reuse `ward-demo-token` beyond a local demo.
- Treat `WARD_CONTROL_TOKEN` and `OPENAI_API_KEY` as secrets.
- Prefer SQLite for evaluator persistence, but do not treat SQLite as HA,
  shared state, or compliance retention.
- Check `GET /health` after boot; it reports storage, mode, fail mode,
  control-auth status, Control Room bundling, served OpenAPI, and runner
  status.

## Supported variable matrix

This matrix is the evaluator contract. It uses the requested RC4
categories directly:

1. Required
2. Optional
3. Prototype-only
4. Dangerous/dev-only
5. Deployment/process variables
6. Storage/persistence variables
7. Control/auth variables
8. Upstream/provider variables
9. Detection/cost/containment variables
10. Runner/test/smoke variables

| Name | Category / surface | Purpose | Required? | Safe local default and example | Evaluator/demo safe? | Change before shared use? | Missing or invalid behavior |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `PORT` | Optional; deployment/process; API, compose, demo app | Selects service listen port. | No | API `4317`; demo SaaS `4401`. Example: `PORT=4317`. | Yes, if port is local. | Only if `4317` conflicts or the service is bound differently. | Missing uses each service default. Invalid non-number in API falls back to `4317`; invalid in demo app can produce an unusable port because the example app casts with `Number(...)`. |
| `WARD_DEPLOYMENT_MODE` | Optional; deployment/process; API, compose, health/tenant responses | Labels the tenant deployment mode. It does not enable hosted or Kubernetes behavior. | No | `local`; compose sets `docker`. Example: `WARD_DEPLOYMENT_MODE=docker`. | Yes as a label. | No. | Missing or invalid falls back to `local`. |
| `WARD_REQUIRE_CONTROL_TOKEN` | Required for safe evaluator use; control/auth; API, compose, health, Control Room mutations | Requires `Authorization: Bearer <WARD_CONTROL_TOKEN>` on mutating `/ward/*` routes. Reads remain open. | Operationally yes for evaluator/shared use; not required to boot. | API/root compose default `false`; user/pull compose default `true`. Example: `WARD_REQUIRE_CONTROL_TOKEN=true`. | Yes when paired with a non-demo token. | Yes; shared or exposed local networks must use `true`. | Missing in API/root compose leaves control mutations unauthenticated and `/health` warns. Any value other than literal `true` is false. |
| `WARD_CONTROL_TOKEN` | Required when auth is enabled; control/auth; API, Control Room, smoke scripts, `wardctl` | Shared bearer token for control mutations. Prototype only; not RBAC, OIDC, identity, or rotation. | Yes when `WARD_REQUIRE_CONTROL_TOKEN=true`. | Empty in API/root compose; `ward-demo-token` in user/pull compose. Example: generated `openssl rand -hex 24`. | Safe only when generated locally and kept secret. | Yes; replace `ward-demo-token` before any shared use. | Missing with auth disabled leaves no protection. Missing with auth enabled makes mutating routes fail closed with `503 ward_control_auth_misconfigured`; wrong token returns `401`. |
| `WARD_STORAGE` | Optional; storage/persistence; API, compose, SQLite | Selects persistence backend. | No | API default `memory`; evaluator compose sets `sqlite`. Example: `WARD_STORAGE=sqlite`. | `sqlite` is safe for local prototype persistence. | No for local demos; choose deliberately before relying on restart persistence. | Missing uses `memory` in raw API and `sqlite` in compose. Any value other than `sqlite` selects `memory`, losing tenant/audit state on restart. |
| `WARD_SQLITE_PATH` | Optional; storage/persistence; API, compose, SQLite, incident export | SQLite file path when `WARD_STORAGE=sqlite`. | Required only for stable persisted location. | `.ward/ward.db`; containers use `/data/ward.db`. Example: `WARD_SQLITE_PATH=/data/ward.db`. | Yes when backed by a local file or named volume. | Keep stable before shared evaluation; changing it starts from a different DB. | Missing uses `.ward/ward.db`. Wrong path can create a fresh empty DB or fail if parent permissions block writes. Deleting file/volume loses persisted state. |
| `WARD_PROXY_FAIL_MODE` | Optional; prototype-only containment/failure; API, compose, reliability smoke | Chooses behavior when policy lookup fails while Ward is still running. | No | `open`. Example: `WARD_PROXY_FAIL_MODE=open` or `closed`. | Yes, but choose based on evaluation question. | Decide explicitly for any shared demo. | Missing or invalid falls back to `open`; successful policy reads still enforce paused/constrained tenants. |
| `WARD_MODE` | Optional; detection/cost/containment; API, health, proxy, smokes | Global enforcement mode: `enforce` blocks, `observe` records would-block evidence. | No | `enforce`. Example: `WARD_MODE=enforce`. | Yes. | Use `enforce` when demonstrating actual containment. | Missing or invalid falls back to `enforce`; observe does not bypass missing tenant header, auth, fail-closed, or upstream errors. |
| `WARD_LOOP_WINDOW_MS` | Optional; detection/cost/containment; API, compose | Pressure-detection time window. | No | `10000`. Example: `WARD_LOOP_WINDOW_MS=10000`. | Yes. | No. | Missing or non-finite falls back to `10000`. |
| `WARD_LOOP_REQUEST_THRESHOLD` | Optional; detection/cost/containment; API, compose | Requests per window before pressure is detected. | No | `8`. Example: `WARD_LOOP_REQUEST_THRESHOLD=8`. | Yes. | No. | Missing or non-finite falls back to `8`. |
| `WARD_ESTIMATED_COST_PER_REQUEST` | Optional; detection/cost; API, compose | Fixed prototype cost estimate per proxy call. Not real billing. | No | `0.002`. Example: `WARD_ESTIMATED_COST_PER_REQUEST=0.002`. | Yes if described as fake cost. | No. | Missing or non-finite falls back to `0.002`. |
| `WARD_APPROVAL_TTL_MS` | Optional; prototype-only control/auth; API approvals | Approval-token TTL. Tokens remain memory-only and single-use. | No | `120000`. Example: `WARD_APPROVAL_TTL_MS=120000`. | Yes for local demos. | No. | Missing or non-finite falls back to `120000`; existing tokens do not persist across process restart. |
| `WARD_UPSTREAM_OPENAI_BASE_URL` | Optional; upstream/provider; API provider path | Enables non-streaming pass-through only when paired with `OPENAI_API_KEY`. | No | Unset for mock upstream. Example: `WARD_UPSTREAM_OPENAI_BASE_URL=https://api.openai.com/v1`. | Mock mode is safest. Real provider mode can spend money. | Yes; set only intentionally and do not confuse with full OpenAI compatibility. | Missing or missing key uses deterministic mock upstream. Invalid or unreachable provider returns upstream failure (`502`) once a request reaches provider mode. |
| `OPENAI_API_KEY` | Optional secret; upstream/provider; API provider path | Provider API key for pass-through mode. | No | Unset. Example: provider key in local secret store, not committed. | Safe only if kept secret and spending is acceptable. | Yes; never commit, paste, or bake into images. | Missing or missing base URL uses mock upstream. Invalid key typically returns upstream failure (`502`) after provider call. |
| `WARD_ENABLE_DOCKER_RUNNER` | Dangerous/dev-only; runner; API Docker runner, health | Enables the prototype Docker runner. | No | `false`. Example only for local dev: `WARD_ENABLE_DOCKER_RUNNER=true`. | Safe only on a trusted local developer machine. | Do not enable on shared/public hosts. | Missing or anything other than literal `true` disables the runner; runner routes fail rather than launching containers. |
| `WARD_DOCKER_ALLOWED_IMAGES` | Dangerous/dev-only; runner; API Docker runner | Comma-separated Docker image allowlist. | No | `ward-example-agent`. Example: `WARD_DOCKER_ALLOWED_IMAGES=ward-example-agent`. | Only with runner disabled or on trusted local host. | Yes if runner is enabled; keep the allowlist narrow. | Missing uses `ward-example-agent`; whitespace is trimmed; empty entries ignored; disallowed images are rejected. |
| `WARD_DOCKER_RUN_TIMEOUT_MS` | Dangerous/dev-only; runner; API Docker runner | Hard timeout for runner-launched containers. | No | `30000`. Example: `WARD_DOCKER_RUN_TIMEOUT_MS=30000`. | Only for local runner demos. | No, unless the demo needs shorter timeouts. | Missing or non-finite falls back to `30000`. |
| `WARD_TEST_FORCE_POLICY_ERROR` | Dangerous/dev-only; runner/test/smoke; API, reliability smoke | Forces policy lookup errors for fail-open/fail-closed verification. | No | `false`. Example only in smokes: `WARD_TEST_FORCE_POLICY_ERROR=true`. | No outside tests. | Never set in shared evaluation. | Missing or anything other than literal `true` is false. If true, normal policy lookup fails by design. |
| `WARD_OPENAPI_DIR` | Optional packaging/internal; API, verifier/image packaging | Overrides where the API looks for `ward.v0.yaml` / `.json`. | No | Unset. Example in packaging only: `WARD_OPENAPI_DIR=openapi`. | Not needed for evaluators. | No. | Missing searches packaged/default locations. Wrong path makes `/openapi.yaml` unavailable and `/health.openapi.served` false. |
| `WARD_UI_DIR` | Optional packaging/internal; API, Control Room bundle | Overrides bundled Control Room asset directory. | No | `ui` in the image. Example in packaging only: `WARD_UI_DIR=ui`. | Not needed for evaluators. | No. | Missing uses `ui`. Wrong path makes `/` return the missing-assets JSON instead of the Control Room; `/health.controlRoomBundled` is false. |
| `VITE_WARD_API_URL` | Optional developer build-time; Control Room | API base URL for separately served Vite UI. | No | Same origin when bundled; Vite dev uses `http://localhost:4317`. Example: `VITE_WARD_API_URL=http://localhost:4317`. | Yes in local dev. | No. | Missing works for bundled UI and normal Vite dev. Wrong value points the UI at the wrong API. |
| `VITE_WARD_CONTROL_TOKEN` | Prototype/dev-only build-time; Control Room | Seeds the Control Room token field at build time; localStorage wins at runtime. | No | Empty. Example only for local demo builds. | Safe only with demo/local tokens. | Do not embed real tokens in built assets. | Missing leaves token field empty. Wrong value causes 401 until operator pastes the correct token. |
| `WARD_IMAGE` | Optional; deployment/process; pull compose, post-publish verifier docs | Pins the prebuilt image used by `docker-compose.pull.yml`. | No | Compose default is `ghcr.io/tenvia/ward-api:v0.1.0-rc4`. Example: same. | Yes. | Pin deliberately for repeatable evaluation. | Missing uses compose default. Wrong/private/unpublished image makes `docker compose pull/up` fail. |
| `WARD_IMAGE_NAME` | Optional maintainer build-only; image build script | Image repository for local multi-arch build validation. | No | `ghcr.io/tenvia/ward-api`. Example: `WARD_IMAGE_NAME=ghcr.io/tenvia/ward-api`. | Maintainer-only. | No; script does not push. | Missing uses script default. Wrong name only affects local build tag. |
| `WARD_IMAGE_TAG` | Optional maintainer build-only; image build script | Image tag for local build validation. | No | `dev`. Example: `WARD_IMAGE_TAG=dev`. | Maintainer-only. | No; publishing is not controlled by this variable. | Missing uses script default. Wrong tag only affects local build tag. |
| `WARD_API_URL` | Optional; runner/test/smoke; `wardctl`, smokes, incident export API mode | Points local tools at a running Ward API. | No | `http://localhost:4317`. Example: `WARD_API_URL=http://localhost:4317`. | Yes. | No. | Missing uses tool defaults. Wrong URL makes tools fail connection or hit the wrong Ward instance. |
| `WARD_DEMO_URL` | Optional; runner/test/smoke; demo smoke | Points `smoke:demo` at the example SaaS app. | No | `http://localhost:4401`. Example: `WARD_DEMO_URL=http://localhost:4401`. | Yes. | No. | Missing uses default; if unreachable, smoke drives the Ward proxy directly. Wrong URL can fail the demo-app path. |
| `WARD_BENCH_REQUESTS` | Optional; runner/test/smoke; latency benchmark | Request count per benchmark scenario. | No | `50`. Example: `WARD_BENCH_REQUESTS=50`. | Yes for local benchmarking; not an SLA. | No. | Missing uses `50`; invalid values can make the benchmark nonsensical because it casts with `Number(...)`. |
| `WARD_PROXY_BASE_URL` | Optional; runner/test/smoke; demo SaaS | Base URL the example SaaS uses for Ward proxy calls. | No | `http://localhost:4317`; root compose uses `http://ward-api:4317`. | Yes. | Set correctly for compose/network topology. | Missing uses localhost. Wrong URL makes demo SaaS calls fail or bypass the intended Ward instance. |
| `WARD_BASE_URL` | Optional; runner/test/smoke; example agent | Ward API base URL for the example agent container when run manually. | No | `http://localhost:4317`; Docker runner injects its own callback URL. | Local example only. | No. | Missing uses localhost. Wrong URL makes the example agent fail to reach Ward. |
| `WARD_TENANT_ID` | Optional; runner/test/smoke; example agent | Tenant used by example agent. | No | `tenant_globex`. Example: `WARD_TENANT_ID=tenant_globex`. | Yes. | No. | Missing uses `tenant_globex`; wrong value attributes calls to another tenant. |
| `AGENT_STEPS` | Optional; runner/test/smoke; example agent | Number of example-agent steps. | No | `5`. Example: `AGENT_STEPS=5`. | Yes. | No. | Missing uses `5`; invalid values can make the example agent skip or mis-run steps because it casts with `Number(...)`. |
| `AGENT_STEP_DELAY_MS` | Optional; runner/test/smoke; example agent | Delay between example-agent steps. | No | `1000`. Example: `AGENT_STEP_DELAY_MS=1000`. | Yes. | No. | Missing uses `1000`; invalid values can make delays nonsensical because it casts with `Number(...)`. |


## Ward API runtime variables

These variables are read by `apps/api`.

| Variable | Category | Default | Supported values | Effect and safety notes |
| --- | --- | --- | --- | --- |
| `PORT` | optional | `4317` | integer port | API listen port. Also affects Docker runner callback URL because launched containers receive `WARD_BASE_URL=http://host.docker.internal:<PORT>`. |
| `WARD_DEPLOYMENT_MODE` | optional label | `local` | `local`, `docker`, `kubernetes`, `hosted` | Labels tenant/deployment mode in API responses. Setting `kubernetes` or `hosted` does not enable Kubernetes or hosted Ward. Invalid values fall back to `local`. |
| `WARD_MODE` | optional behavior | `enforce` | `enforce`, `observe` | Global enforcement mode. `observe` lets otherwise-valid paused/constrained proxy traffic through with `x-ward-would-block` and audit evidence. It does not bypass missing tenant headers, control-auth failures, fail-closed policy errors, or upstream errors. Invalid values fall back to `enforce`. |
| `WARD_LOOP_WINDOW_MS` | optional detection knob | `10000` | finite number | Sliding pressure-detection window. Invalid numbers silently fall back to the default. |
| `WARD_LOOP_REQUEST_THRESHOLD` | optional detection knob | `8` | finite number | Requests per window before pressure is detected. Invalid numbers silently fall back to the default. |
| `WARD_ESTIMATED_COST_PER_REQUEST` | optional prototype cost knob | `0.002` | finite number | Fixed fake per-call estimate used for prototype evidence. Not real dollar metering. Invalid numbers silently fall back to the default. |
| `WARD_APPROVAL_TTL_MS` | optional control-plane knob | `120000` | finite number | Approval token TTL. Tokens are in-memory, single-use, tenant/action-bound. Invalid numbers silently fall back to the default. |
| `WARD_STORAGE` | optional storage | `memory` in API; compose paths usually set `sqlite` | `memory`, `sqlite` | `memory` loses tenant/audit state on restart. `sqlite` persists tenant state and audit events locally. Any value other than `sqlite` selects `memory`. See `docs/SQLITE_DEPLOYMENT.md` for backup, restore, and recovery scope. |
| `WARD_SQLITE_PATH` | optional storage path | `.ward/ward.db` | filesystem path | SQLite file path when `WARD_STORAGE=sqlite`. In containers this is usually `/data/ward.db` on a named volume. See `docs/SQLITE_DEPLOYMENT.md`. |
| `WARD_PROXY_FAIL_MODE` | optional failure behavior | `open` | `open`, `closed` | Applies only when tenant policy lookup fails while the API is up. `open` allows with `x-ward-fail-open` plus best-effort audit; `closed` blocks with 503. Successful policy reads always enforce paused/constrained tenants. Invalid values fall back to `open`. |
| `WARD_REQUIRE_CONTROL_TOKEN` | required for safe evaluator use | `false` in API/root compose; `true` in user/pull compose | `true`, anything else false | Gates mutating `/ward/*` routes behind the shared token. Reads stay open. Prototype only; not RBAC. |
| `WARD_CONTROL_TOKEN` | required when control auth enabled | empty in API/root compose; `ward-demo-token` in user/pull compose | string | Shared bearer token. Must be changed for anything beyond a local demo. Used by scripts and `wardctl` too. |
| `WARD_UPSTREAM_OPENAI_BASE_URL` | optional upstream | unset | OpenAI-compatible base URL | Pass-through mode is used only when this and `OPENAI_API_KEY` are both set. Leave unset for deterministic mock upstream. |
| `OPENAI_API_KEY` | optional upstream secret | unset | provider API key | Secret used for pass-through requests when paired with `WARD_UPSTREAM_OPENAI_BASE_URL`. Do not commit or log it. |
| `WARD_ENABLE_DOCKER_RUNNER` | dangerous/dev-only | `false` | `true`, anything else false | Enables the dev-only Docker runner. The API host can control the local Docker daemon; never expose this on a shared or public host. |
| `WARD_DOCKER_ALLOWED_IMAGES` | dangerous/dev-only | `ward-example-agent` | comma-separated image names | Allowlist for the dev-only Docker runner. Whitespace is trimmed; empty entries are ignored. |
| `WARD_DOCKER_RUN_TIMEOUT_MS` | dangerous/dev-only | `30000` | finite number | Hard timeout for dev-only Docker runner containers. Invalid numbers silently fall back to default. |
| `WARD_TEST_FORCE_POLICY_ERROR` | test-only dangerous | `false` | `true`, anything else false | Forces policy lookup to throw so fail modes can be exercised. Never set outside local/test runs. |
| `WARD_OPENAPI_DIR` | packaging/internal | unset | directory path | Overrides where the API searches for `ward.v0.yaml` / `.json`. Intended for packaging and tests, not normal evaluator configuration. |
| `WARD_UI_DIR` | packaging/internal | `ui` | directory path | Overrides bundled Control Room asset directory. Set in the API Dockerfile. Not normal evaluator configuration. |

## Control Room variables

These variables are read by the React/Vite Control Room build.

| Variable | Category | Default | Effect and safety notes |
| --- | --- | --- | --- |
| `VITE_WARD_API_URL` | optional developer build-time | same origin when bundled; `http://localhost:4317` from Vite dev/preview on `5173` | Overrides API base URL for a separately served Control Room. Not needed when the Control Room is bundled and served by the Ward API. |
| `VITE_WARD_CONTROL_TOKEN` | prototype/dev build-time | empty | Seeds the Control Room control token field at build time. Runtime localStorage value wins. Avoid embedding real secrets in built assets; use only local/demo tokens. |

## Compose and image variables

These variables are consumed by compose files or image-build tooling.

| Variable | Category | Default | Used by | Effect and safety notes |
| --- | --- | --- | --- | --- |
| `WARD_IMAGE` | optional image pin | compose-file default | `docker-compose.pull.yml` | Overrides the prebuilt image. Use this to pin a specific RC, e.g. `ghcr.io/tenvia/ward-api:v0.1.0-rc4`. |
| `WARD_IMAGE_NAME` | maintainer build-only | `ghcr.io/tenvia/ward-api` | `scripts/build-image.sh multiarch` | Names the image for a local multi-arch build validation. The script never pushes. |
| `WARD_IMAGE_TAG` | maintainer build-only | `dev` | `scripts/build-image.sh multiarch` | Tags the image for a local multi-arch build validation. Publishing happens only via GitHub Actions on version tags or manual dispatch. |

Compose files pass or hardcode selected API runtime variables into
containers. Root compose passes `PORT`, `WARD_DEPLOYMENT_MODE`,
`WARD_PROXY_FAIL_MODE`, `WARD_REQUIRE_CONTROL_TOKEN`,
`WARD_CONTROL_TOKEN`, `WARD_LOOP_WINDOW_MS`,
`WARD_LOOP_REQUEST_THRESHOLD`, `WARD_ESTIMATED_COST_PER_REQUEST`,
`WARD_STORAGE`, and `WARD_SQLITE_PATH`. User/pull compose hardcode
`PORT=4317`, `WARD_DEPLOYMENT_MODE=docker`,
`WARD_STORAGE=sqlite`, and `WARD_SQLITE_PATH=/data/ward.db`; user
compose also passes loop thresholds, while pull compose keeps only the
image, control-auth token, and fail-mode knobs overridable.

## CLI, smoke, and benchmark variables

These variables configure local tools, not Ward's core runtime.

| Variable | Category | Default | Used by | Effect and safety notes |
| --- | --- | --- | --- | --- |
| `WARD_API_URL` | optional tool target | `http://localhost:4317` | `wardctl`, `smoke:demo`, `smoke:openapi`, `smoke:sdk` | Points tools at a running Ward API. |
| `WARD_CONTROL_TOKEN` | tool secret | empty or caller-provided | `wardctl`, `smoke:openapi`, `smoke-user-install.sh` | Adds `Authorization: Bearer <token>` for mutating or auth-aware checks. Same secret-safety rules as the API token. |
| `WARD_DEMO_URL` | optional smoke target | `http://localhost:4401` | `smoke:demo` | Points the demo smoke at the example SaaS app. If unreachable, the smoke drives the proxy directly. |
| `WARD_BENCH_REQUESTS` | optional benchmark knob | `50` | `bench:latency` | Requests per benchmark scenario. Local benchmark only; not a production SLA. |

## Example and demo variables

These are for local examples and dev-only runners.

| Variable | Category | Default | Used by | Effect and safety notes |
| --- | --- | --- | --- | --- |
| `WARD_PROXY_BASE_URL` | demo app | `http://localhost:4317` | `examples/node-express-ai-saas` | Base URL the demo SaaS uses for Ward proxy calls. Compose sets it to `http://ward-api:4317`. |
| `WARD_BASE_URL` | example agent | `http://localhost:4317` | `examples/docker-agent` | Ward API base URL for the example agent container when run manually. The Docker runner injects its own host callback URL. |
| `WARD_TENANT_ID` | example agent | `tenant_globex` | `examples/docker-agent` | Tenant used by the example agent. |
| `AGENT_STEPS` | example agent | `5` | `examples/docker-agent` | Number of example agent steps. |
| `AGENT_STEP_DELAY_MS` | example agent | `1000` | `examples/docker-agent` | Delay between example agent steps. |
| `PORT` | demo app/API port | API `4317`; demo SaaS `4401` | API and example SaaS | The same variable name is used by multiple Node services. Set it per process/container, not globally across the whole repo. |

## Unsupported production assumptions

No environment variable currently enables:

- production readiness or SLA
- production RBAC, OIDC, per-operator identity, or token rotation
- hosted Ward
- Postgres storage
- HA or multi-replica shared state
- Kubernetes production deployment
- compliance retention or SOC2 readiness
- tamper-proof or signed receipts
- full OpenAI compatibility
- pass-through streaming against a real upstream

## Verification expectations

For any slice that changes this contract, record:

1. the variables changed or added
2. the code/docs source that reads each variable
3. the command proving the behavior or the reason no behavior changed
4. the claim that the evidence supports

For docs-only edits, at minimum run a targeted documentation audit and
`git status --short`. For behavior changes, add or update a smoke before
claiming evaluator-safe configuration.
