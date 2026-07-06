# Ward Evaluator Quickstart

## Summary

This is the RC4 secure local/container evaluator path. It answers one
question: can a technical evaluator pull Ward, configure it safely,
boot it, verify health/OpenAPI/Control Room, prove tenant containment,
and stop it cleanly without reading the whole repo?

This is a local/container prototype workflow. It is not production
deployment guidance, not hosted Ward, not HA, not enterprise auth, and
not compliance readiness.

## Requirements

- Docker with Compose
- curl
- `openssl` for generating a local bearer token, or a manually chosen
  long random token

## From zero to verified

Run from the repository root after cloning Ward.

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

# 2. Load the token for the curl checks in this shell.
set -a
. ./.env
set +a

# 3. Pull and boot the prebuilt Ward image.
docker compose --env-file .env -f docker-compose.pull.yml up -d

# 4. Wait for health.
until curl -fsS http://localhost:4317/health >/tmp/ward-health.json; do sleep 0.5; done
cat /tmp/ward-health.json

# 5. Confirm the served OpenAPI contract.
curl -fsS http://localhost:4317/openapi.yaml | head -n 1

# 6. Confirm the bundled Control Room is served.
curl -fsS http://localhost:4317/ -o /tmp/ward-control-room.html
grep -q '<div id="root">' /tmp/ward-control-room.html && echo "Control Room served"

# 7. Confirm control auth rejects missing tokens.
curl -sS -o /tmp/ward-unauthorized.json -w "%{http_code}\n" \
  -X POST http://localhost:4317/ward/tenants/tenant_globex/constrain \
  -H "content-type: application/json" \
  -d '{"actor":"evaluator","reason":"missing-token check"}'

# 8. Confirm an authenticated operator can constrain one tenant.
curl -fsS -X POST http://localhost:4317/ward/tenants/tenant_globex/constrain \
  -H "authorization: Bearer ${WARD_CONTROL_TOKEN}" \
  -H "content-type: application/json" \
  -d '{"actor":"evaluator","reason":"RC4 evaluator containment check"}'

# 9. Confirm the constrained tenant is blocked.
curl -sS -o /tmp/ward-globex-blocked.json -w "%{http_code}\n" \
  -X POST http://localhost:4317/v1/chat/completions \
  -H "x-ward-tenant-id: tenant_globex" \
  -H "content-type: application/json" \
  -d '{"model":"demo","messages":[{"role":"user","content":"hi"}]}'

# 10. Confirm another tenant still succeeds.
curl -sS -o /tmp/ward-acme-ok.json -w "%{http_code}\n" \
  -X POST http://localhost:4317/v1/chat/completions \
  -H "x-ward-tenant-id: tenant_acme" \
  -H "content-type: application/json" \
  -d '{"model":"demo","messages":[{"role":"user","content":"hi"}]}'

# 11. Resume the constrained tenant.
curl -fsS -X POST http://localhost:4317/ward/tenants/tenant_globex/resume \
  -H "authorization: Bearer ${WARD_CONTROL_TOKEN}" \
  -H "content-type: application/json" \
  -d '{"actor":"evaluator","reason":"RC4 evaluator cleanup"}'

# 12. Inspect audit evidence.
curl -fsS http://localhost:4317/ward/audit | head -c 1000

# 13. Stop cleanly. Add --volumes only when you want to delete SQLite state.
docker compose --env-file .env -f docker-compose.pull.yml down
```

Expected status codes:

| Step | Expected result |
| --- | --- |
| Missing-token constrain | `401` |
| Authenticated constrain | `200` |
| Globex constrained proxy call | `429` |
| Acme proxy call | `200` |
| Authenticated resume | `200` |

Expected health facts:

- `status` is `ok`
- `storage` is `sqlite`
- `controlAuth` says `required (shared bearer token; prototype, not production RBAC)`
- `controlRoomBundled` is `true`
- `openapi.served` is `true`

## After this quickstart: demo the story

This page is the safe bootstrap and verification path. After it passes,
use `docs/DESIGN_PARTNER_QUICKSTART.md` for the Acme/Globex walkthrough
and `docs/DEMO_SCRIPT.md` for narration. Keep using the generated
`WARD_CONTROL_TOKEN` from `.env`; do not switch back to the demo token
unless you intentionally restart with the local demo defaults.

## Demo-token warning

`docker-compose.pull.yml` and `docker-compose.user.yml` contain a demo
fallback token for local convenience. The evaluator workflow above
explicitly overrides it by writing `WARD_CONTROL_TOKEN` to `.env` before
boot.

Do not expose Ward with the demo token. Do not expose Ward publicly at
all yet. The shared bearer token is a prototype control boundary, not
production RBAC, OIDC, operator identity, or token rotation.

## Storage and cleanup

The evaluator path uses SQLite at `/data/ward.db` on the
`ward-user-data` named Docker volume. Tenant state and audit survive an
API container restart and `docker compose down` without `--volumes`.

Cleanup options:

```bash
# Stop, keep SQLite volume.
docker compose --env-file .env -f docker-compose.pull.yml down

# Stop and delete SQLite volume.
docker compose --env-file .env -f docker-compose.pull.yml down --volumes
```

SQLite remains local prototype state. It is not HA, not shared across
replicas, not Postgres, and not compliance-grade retention. For the
authoritative evaluator-side persistence reference (what persists,
what survives, offline backup and restore, `node:sqlite` caveats), see
`docs/SQLITE_DEPLOYMENT.md`.

## Common first-run issues

Use this table before changing compose files or falling back to the demo
token. The evaluator-safe path is still
`docker compose --env-file .env -f docker-compose.pull.yml ...` with a
generated `WARD_CONTROL_TOKEN`.

| Symptom | Likely cause | Check | Fix / safety boundary |
| --- | --- | --- | --- |
| Port `4317` is already in use | Another Ward/API/dev process is listening | `lsof -nP -iTCP:4317 -sTCP:LISTEN` | Stop the other process, then rerun `docker compose --env-file .env -f docker-compose.pull.yml up -d`. Do not switch compose files just to avoid the conflict. |
| `/health` never returns | Docker is not running, pull failed, container crashed, or port conflict | `docker compose --env-file .env -f docker-compose.pull.yml ps` and `docker compose --env-file .env -f docker-compose.pull.yml logs ward` | Fix the concrete error. If Docker is down, start Docker. If the image pull failed, check `WARD_IMAGE` and network/GHCR access. |
| Docker says it cannot connect to the daemon | Docker Desktop/daemon is not running | `docker info` | Start Docker, wait until `docker info` succeeds, then rerun the same compose command. Do not switch to NPM/dev mode just to bypass Docker. |
| `docker compose ... pull` cannot fetch the image | Wrong/private/unavailable image tag or no registry/network access | `grep '^WARD_IMAGE=' .env` and `docker compose --env-file .env -f docker-compose.pull.yml pull` | Use the published RC4 image from this doc unless intentionally testing another tag. No GitHub login should be required for the public RC4 image. |
| Compose command uses the wrong stack | Pull/user/root compose files look similar but carry different assumptions | `docker compose --env-file .env -f docker-compose.pull.yml config | grep -E 'image:|WARD_STORAGE|WARD_REQUIRE_CONTROL_TOKEN'` | Evaluator-safe pull path: `docker-compose.pull.yml` + `.env`. Local build demo: `docker-compose.user.yml`. Contributor three-service stack: root `docker-compose.yml`. |
| Missing-token constrain returns `200` | `.env` was missing, compose ignored it, or auth was disabled | `grep -q '^WARD_REQUIRE_CONTROL_TOKEN=true$' .env && echo auth-required` and `curl -fsS http://localhost:4317/health | grep controlAuth` | Ensure `.env` contains `WARD_REQUIRE_CONTROL_TOKEN=true` and a generated `WARD_CONTROL_TOKEN`, then restart with `--env-file .env`. Do not paste token values into logs. |
| Authenticated mutation returns `401` | Shell token not loaded, Control Room token field is wrong, or `.env` differs from the running container | `grep -q '^WARD_CONTROL_TOKEN=' .env && echo env-token-present`; `test -n "${WARD_CONTROL_TOKEN:-}" && echo shell-token-loaded` | Reload with `set -a; . ./.env; set +a`; paste the same generated token into the Control Room. Do not fix this by using `ward-demo-token` unless you intentionally restart in local demo mode. |
| Control Room actions fail but curl works | Browser still has an old token in the Control Room field/local storage | Confirm curl succeeds with an `authorization: Bearer ...` header from the generated token | Paste the generated token from `.env` into the Control Room token field. If needed, clear the browser's stored token for `localhost:4317`. |
| State looks stale or a tenant is already constrained/paused | SQLite volume from a prior run is still attached | `docker volume ls | grep ward-user-data` and `curl -fsS http://localhost:4317/ward/tenants/tenant_globex` | Resume/reset the tenant if you want to keep audit history. To wipe evaluator state, run `docker compose --env-file .env -f docker-compose.pull.yml down --volumes`. This deletes local SQLite state. |
| OpenAPI command output is confusing | `npm run validate:openapi` validates the repo contract; `curl /openapi.yaml` verifies the running API serves it | `npm run validate:openapi` and `curl -fsS http://localhost:4317/openapi.yaml | head -n 1` | Use both when debugging docs vs running container. Expected first line from the running API is `openapi: 3.0.3`. |
| `./scripts/verify-release.sh` fails or reports SKIPPED | Maintainer battery found a real failure or missing optional dependency | Re-read the verifier summary; it prints every PASS/FAIL/SKIP | Do not call SKIPPED green for release work. Run the failing section directly. For published-image checks, use `docs/POST_PUBLISH_VERIFICATION.md`. |
| Smoke cleanup or verifier leaves a dev API behind | A local `tsx src/server.ts` process survived a failed smoke | `lsof -nP -iTCP:4317 -sTCP:LISTEN` | Stop the stray process. Last resort for local dev only: `pkill -f "tsx src/server.ts"`. Then rerun the failed command. |
| Globex returns `200` after constrain | Constrain failed, wrong tenant ID, observe mode is active, or stale state was resumed | `curl -fsS http://localhost:4317/ward/tenants/tenant_globex` and `curl -fsS http://localhost:4317/health | grep -E 'wardMode|storage'` | Rerun authenticated constrain and inspect audit. If `WARD_MODE=observe`, a would-block `200` is intentional evidence, not enforcement. |
| Acme returns non-`200` | Ward unhealthy, malformed request, fail-closed/policy error, upstream issue, or wrong stack | `curl -fsS http://localhost:4317/health` and retry the exact Acme command above | Keep the mock upstream for first evaluation. Real provider pass-through can spend money and is not full OpenAI compatibility. |
| Ward is fully down | This is not degraded fail-open; the proxy process is unavailable | `curl -fsS http://localhost:4317/health` | Proxied traffic cannot pass through a down Ward process. Survival requires customer-side fallback routing; Ward does not currently provide HA for hard-down scenarios. |
| You are tempted to use `ward-demo-token` | The evaluator-safe token path feels confusing | `grep -q '^WARD_CONTROL_TOKEN=' .env && echo env-token-present` | Stay on the generated-token path. `ward-demo-token` is local-demo convenience only for `docker-compose.user.yml` or pull compose without overrides; do not use it for evaluator-safe setup. |

## Visual reference

Captured screenshots of this quickstart path are in
[`docs/RC5_VISUAL_PROOF.md`](RC5_VISUAL_PROOF.md). The active current UI
assets are under `docs/assets/rc5/control-room/`; the older
`docs/assets/rc5/evaluator/` captures are retained as historical
pre-light-theme evidence. The captures are real Playwright shots of the
local Control Room; they are not production-readiness evidence.

## What this proves

This quickstart proves the local/container prototype can be pulled,
configured with explicit env vars, booted, health-checked, contract-
checked, operated with shared-token control auth, and used to contain
one tenant while another tenant still succeeds.

## What this does not prove

This quickstart does not prove:

- production readiness
- hosted Ward
- HA or multi-replica durability
- Postgres
- enterprise RBAC, OIDC, per-operator identity, or token rotation
- SOC2 or compliance readiness
- tamper-proof receipts
- full OpenAI compatibility
- pass-through streaming against a real upstream
- Kubernetes production deployment
