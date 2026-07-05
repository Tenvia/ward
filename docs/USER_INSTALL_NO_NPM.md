# Ward User Install (No NPM)

## Summary

Users install and run Ward with Docker only. No npm, npx, pnpm, yarn,
or any Node package manager on your machine. Node/Vite remain internal
contributor build tooling inside the Docker build. The product
contract is HTTP + Docker; the TypeScript SDK is optional.

## Install and run

Requirements: Docker (with Compose), curl for the smoke test.

```bash
git clone <ward-repo>
cd ward
docker compose -f docker-compose.user.yml up --build
```

Open http://localhost:4317 — the Control Room is served by the API
itself (one container, one port).

Prebuilt image: `docker-compose.pull.yml` is prepared for the future
published image (`ghcr.io/jenksed/ward-api`). No image is published
yet — use the build path above until then. Note: the first published
package may start private on GHCR and needs to be made public before
anonymous pulls work.

What you get:

- Ward API + OpenAI-compatible egress proxy on `4317`
- The formal API contract at `GET /openapi.yaml` (HTTP/OpenAPI is
  Ward's primary integration contract)
- Control Room UI at `/` (built into the image; `/` explains what to
  do if assets are ever missing)
- SQLite storage on the `ward-user-data` volume — containment state
  and audit survive container restarts
- Minimal shared-token control auth prototype, ON by default with the
  demo token `ward-demo-token`

Control auth warning: this is a single shared bearer token — a
prototype boundary, NOT production RBAC. Override it in `.env`
(`WARD_CONTROL_TOKEN=...`) for anything beyond a local demo, and do
not expose Ward publicly at all yet.

## Try containment (curl only)

```bash
# A tenant's agent call goes through Ward
curl -X POST http://localhost:4317/v1/chat/completions \
  -H "x-ward-tenant-id: tenant_acme" -H "content-type: application/json" \
  -d '{"model":"demo","messages":[{"role":"user","content":"hi"}]}'

# Constrain another tenant (Bearer token required)
curl -X POST http://localhost:4317/ward/tenants/tenant_globex/constrain \
  -H "authorization: Bearer ward-demo-token" \
  -H "content-type: application/json" \
  -d '{"actor":"operator","reason":"runaway agent"}'

# Globex is now blocked (429); Acme still works (200)
curl -i -X POST http://localhost:4317/v1/chat/completions \
  -H "x-ward-tenant-id: tenant_globex" -H "content-type: application/json" -d '{}'
```

In the Control Room, paste the control token into the header field
(top right) to use the operator actions.

## Automated verification (no NPM)

```bash
./scripts/smoke-user-install.sh
```

15 checks: compose validity, health, bundled UI at `/`, tenant
containment with the Bearer token, 401 without it, audit, and SQLite
persistence across a container restart. Uses docker + curl only.

## Fail-closed variant

```bash
docker compose -f docker-compose.user.yml -f docker-compose.fail-closed.yml up --build
```

See the trade-off notes in `docker-compose.fail-closed.yml` and
`docs/DEPLOYMENT_MODEL.md`.

## Optional: wardctl (uv, still no NPM)

A tiny Python CLI for terminal workflows against a running Ward:

```bash
uvx --from ./tools/wardctl wardctl health
WARD_CONTROL_TOKEN=ward-demo-token uvx --from ./tools/wardctl wardctl constrain tenant_globex --reason demo
```

See `tools/wardctl/README.md`. Docker remains the primary install path.

## Evaluating Ward?

Start with `docs/DESIGN_PARTNER_QUICKSTART.md`. Maintainer release
gates live in `docs/RELEASE_CANDIDATE_CHECKLIST.md`.

## What this is not

- Not production-ready: single node, prototype auth, prototype
  persistence, no HA. If the Ward container is down, proxied traffic
  does not flow — hard-down survival needs customer-side fallback
  routing or an HA deployment (planned).

## Future runtime direction

The HTTP/OpenAPI surface is the stable contract. A possible future
API/runtime migration (e.g. Python/FastAPI to align with the uv
toolchain) would keep that contract identical; no migration work has
started and none is promised. Integrate against HTTP, not against the
implementation language.
