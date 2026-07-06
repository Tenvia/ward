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

## If a check fails

| Symptom | First check | Likely cause | Safe action |
| --- | --- | --- | --- |
| `/health` never returns | `docker compose --env-file .env -f docker-compose.pull.yml ps` | image pull failed, port 4317 already in use, or container crashed | inspect `docker compose --env-file .env -f docker-compose.pull.yml logs ward`; stop other process on 4317 |
| Missing-token check returns `200` | `cat .env` and `/health` | `WARD_REQUIRE_CONTROL_TOKEN` was not set to `true` or compose did not read `.env` | stop, rerun with `--env-file .env`, confirm health controlAuth status |
| Authenticated mutation returns `401` | compare shell `$WARD_CONTROL_TOKEN` to `.env` | token not loaded in shell or wrong token pasted into Control Room | reload `.env` with `set -a; . ./.env; set +a` |
| Globex returns `200` after constrain | inspect constrain response and `/ward/tenants/tenant_globex` | constrain failed, wrong tenant ID, or resume already ran | rerun authenticated constrain and inspect audit |
| Acme returns non-`200` | inspect `/health` and request body | Ward not healthy, malformed request, or proxy fail mode/upstream issue | retry with the exact command above; keep mock upstream unless testing pass-through |

## What this proves

This quickstart proves the local/container prototype can be pulled,
configured with explicit env vars, booted, health-checked, contract-
checked, operated with shared-token control auth, and used to contain one
tenant while another tenant still succeeds.

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
