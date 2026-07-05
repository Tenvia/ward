# Ward Docker Runbook

## Summary

`docker-compose.yml` runs the full local demo in containers: Ward API
(4317), Control Room (5173), and the demo SaaS app (4401). The API
defaults to SQLite on the `ward-data` named volume, so tenant state and
audit survive API container restarts. This is a demo path, not
production deployment guidance.

## User bundle (primary path, no NPM)

```bash
cd ~/Projects/10via/ward
docker compose -f docker-compose.user.yml up --build
# open http://localhost:4317  (Control Room served by the API)
./scripts/smoke-user-install.sh   # docker + curl verification; script prints its count
```

Release image build (maintainers; never pushes):

```bash
./scripts/build-image.sh local       # -> ward-api:local
./scripts/build-image.sh multiarch   # prepared multi-arch, push=false
```

Publishing happens only via `.github/workflows/docker-image.yml`
(version tags or manual dispatch). `docker-compose.pull.yml` runs the
prebuilt GHCR image and can be pinned with `WARD_IMAGE=...`. Procedure
and gates: `docs/PUBLISH_READINESS.md` and
`docs/RELEASE_CANDIDATE_CHECKLIST.md`.

Fail-closed variant:

```bash
docker compose -f docker-compose.user.yml -f docker-compose.fail-closed.yml up --build
```

See `docs/USER_INSTALL_NO_NPM.md` for the full walkthrough and the
control-token warning.

## Contributor stack (three services)

```bash
cd ~/Projects/10via/ward
docker compose up --build
```

Services:

| Service | Port | Notes |
| --- | --- | --- |
| ward-api | 4317 | `WARD_DEPLOYMENT_MODE=docker`, mock upstream, SQLite on the `ward-data` named volume (containment state + audit survive API restarts; verified). `docker compose down -v` wipes it. Control auth off by default; enable via `WARD_REQUIRE_CONTROL_TOKEN=true` + `WARD_CONTROL_TOKEN` in `.env`. |
| control-room | 5173 | Production Vite build served via `vite preview` |
| demo-saas | 4401 | Talks to the API at `http://ward-api:4317` over the compose network |

The Control Room runs in your browser and calls the API at
`http://localhost:4317`, so port 4317 must stay published.

## Demo

Identical curl sequence to `docs/LOCAL_DEMO_RUNBOOK.md` — the ports
are the same.

## Docker runner (dev-only prototype)

Ward can launch allowlisted agent containers itself. Disabled by
default; enable explicitly:

```bash
cd ~/Projects/10via/ward
docker build -f examples/docker-agent/Dockerfile -t ward-example-agent .
cd apps/api
WARD_ENABLE_DOCKER_RUNNER=true npm run dev
```

```bash
curl -X POST http://localhost:4317/ward/workflow-runs \
  -H "content-type: application/json" \
  -d '{"tenantId":"tenant_acme","runner":"docker","image":"ward-example-agent"}'
```

Safety rules enforced by the prototype:

- Only images on `WARD_DOCKER_ALLOWED_IMAGES` run (default:
  `ward-example-agent`); anything else fails with an allowlist error.
- Hard timeout (`WARD_DOCKER_RUN_TIMEOUT_MS`, default 30s) — the
  container is killed when exceeded.
- No host mounts, no privileged mode, `--rm` cleanup, one named
  container per run.
- Operator cancel issues a best-effort `docker kill`.

Warning: the Ward API shells out to the local `docker` CLI, so the API
host effectively controls the local Docker daemon. That is acceptable
only for local development. Do not expose an enabled Docker runner on
a shared or public host. A production runner needs a real isolation
and scheduling story — see `docs/KUBERNETES_PLAN.md`.

Containment holds for containerized agents because the chokepoint is
outside the container: the example agent routes every call through
Ward's proxy and stops when it receives 423/429 (verified: constrain
mid-run produced 200, 200, 429, agent stopped).

## Example agent container

`examples/docker-agent/` is a runnable agent image for the future
Docker runner path. Run it manually against a live API:

```bash
cd ~/Projects/10via/ward
docker build -f examples/docker-agent/Dockerfile -t ward-example-agent .
docker run --rm -e WARD_TENANT_ID=tenant_globex ward-example-agent
```

On macOS/Windows it reaches the host API via
`host.docker.internal:4317` (the image default). The agent stops
itself when Ward returns 423/429 for its tenant. Ward can also launch
this container itself via the dev-only Docker runner above.

## Environment

Use `docs/ENVIRONMENT.md` as the source of truth for supported
environment variables, safe evaluator defaults, prototype-only flags,
and dangerous/dev-only settings. Copy `.env.example` to `.env` for a
local starting point.

## Verify config without starting

```bash
docker compose config
```
