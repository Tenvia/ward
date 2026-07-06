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
WARD_IMAGE=ghcr.io/tenvia/ward-api:v0.1.0-rc3
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

## Required variables

Ward does not require any environment variable to boot in the local mock
mode. For a safe evaluator path, the following are operationally
required even though the process has permissive defaults:

| Variable | Required for | Default | Contract |
| --- | --- | --- | --- |
| `WARD_REQUIRE_CONTROL_TOKEN` | Safe evaluator control-plane use | API default `false`; user/pull compose default `true` | Set `true` so mutating `/ward/*` endpoints require `Authorization: Bearer <WARD_CONTROL_TOKEN>`. Read endpoints remain open. |
| `WARD_CONTROL_TOKEN` | Auth-enabled control mutations | Empty in API/root compose; `ward-demo-token` in user/pull compose | Shared bearer token prototype. Use a long random local token for evaluation. Empty token with `WARD_REQUIRE_CONTROL_TOKEN=true` makes mutations fail closed. |

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
| `WARD_IMAGE` | optional image pin | compose-file default | `docker-compose.pull.yml` | Overrides the prebuilt image. Use this to pin a specific RC, e.g. `ghcr.io/tenvia/ward-api:v0.1.0-rc3`. |
| `WARD_IMAGE_NAME` | maintainer build-only | `ghcr.io/tenvia/ward-api` | `scripts/build-image.sh multiarch` | Names the image for a local multi-arch build validation. The script never pushes. |
| `WARD_IMAGE_TAG` | maintainer build-only | `dev` | `scripts/build-image.sh multiarch` | Tags the image for a local multi-arch build validation. Publishing happens only via GitHub Actions on version tags or manual dispatch. |

Compose also passes selected API runtime variables into containers:
`WARD_PROXY_FAIL_MODE`, `WARD_REQUIRE_CONTROL_TOKEN`,
`WARD_CONTROL_TOKEN`, `WARD_LOOP_WINDOW_MS`,
`WARD_LOOP_REQUEST_THRESHOLD`, `WARD_ESTIMATED_COST_PER_REQUEST`,
`WARD_STORAGE`, and `WARD_SQLITE_PATH`.

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
