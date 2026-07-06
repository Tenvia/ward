# Ward Operator Runbook (Prototype)

## Summary

This runbook is the RC4 Slice 4 reference for common prototype
incidents an operator or evaluator can hit while running Ward
locally or in a single container. It is intentionally short and
operational.

Each runbook answers:

- symptom
- first check
- likely cause
- safe action
- when to stop trusting the prototype

These runbooks are scoped to what Ward currently implements. They do
not cover production-grade failover, multi-replica recovery, HA,
Postgres restore, compliance retention, or enterprise auth.

## Conventions

- `WARD_CONTROL_TOKEN` and `OPENAI_API_KEY` are secrets. They belong
  in `.env`, never in shell history, never in commit messages, and
  never in pasted logs.
- The evaluator compose path uses
  `docker compose --env-file .env -f docker-compose.pull.yml`.
- SQLite lives on a named volume (`ward-user-data` for user/pull
  compose, `ward-data` for the root compose). See
  `docs/SQLITE_DEPLOYMENT.md` for the persistence contract.
- The control plane is a shared bearer token prototype. It is not
  RBAC, OIDC, per-operator identity, or token rotation. See
  `docs/ENVIRONMENT.md`.
- For the bigger picture, see `docs/DEPLOYMENT_MODEL.md`.

## Runbook index

- RB-1: Tenant paused accidentally
- RB-2: Constrained tenant would-blocks in observe mode
- RB-3: Control auth missing or misconfigured
- RB-4: Upstream failure
- RB-5: SQLite file or volume missing
- RB-6: Incident receipt export
- RB-7: Release verifier failure

---

## RB-1 — Tenant paused accidentally

**Symptom:** A proxy call returns `423 paused` and the tenant was not
intentionally paused.

**First check:**

```bash
curl -fsS http://localhost:4317/ward/tenants/<tenantId>
```

Confirm the state is `paused` and inspect `actor`/`reason` from the
last transition.

**Likely cause:** A prior operator ran an approved `pause`, an
approval-phrase echo, or a demo script left state behind.

**Safe action:**

```bash
# Resume the tenant using the evaluator's .env-loaded token.
set -a; . ./.env; set +a
curl -fsS -X POST http://localhost:4317/ward/tenants/<tenantId>/resume \
  -H "authorization: Bearer ${WARD_CONTROL_TOKEN}" \
  -H "content-type: application/json" \
  -d '{"actor":"operator","reason":"RC4 RB-1 accidental pause"}'
```

Confirm with the same `GET` as above; the state should be `running`.

**When to stop trusting the prototype:**

- If the tenant re-enters `paused` on its own, audit
  `GET /ward/audit` for repeated `pause` transitions and check the
  `actor` field. The prototype does not auto-pause. If state keeps
  flipping, stop using the prototype for that workload and report
  the audit log.

---

## RB-2 — Constrained tenant would-blocks in observe mode

**Symptom:** A constrained tenant receives `200` instead of `429`,
with response header `x-ward-would-block: constrained`. The audit log
shows `would_block` events for that tenant.

**First check:**

```bash
curl -fsS http://localhost:4317/ward/tenants/<tenantId> | grep -E '"state"|"modeOverride"'
```

Also:

```bash
curl -fsS http://localhost:4317/health | grep -E '"wardMode"|"storage"'
```

**Likely cause:** Either the global `WARD_MODE` is `observe`, or the
tenant has a per-tenant `modeOverride` of `observe`. Both are
intentional prototype behavior, not a bug.

**Safe action:**

If observe mode is the wrong default, change the global mode and
restart the API. Set in `.env`:

```bash
WARD_MODE=enforce
```

If only this tenant should enforce, set the per-tenant override:

```bash
set -a; . ./.env; set +a
curl -fsS -X POST http://localhost:4317/ward/tenants/<tenantId>/mode \
  -H "authorization: Bearer ${WARD_CONTROL_TOKEN}" \
  -H "content-type: application/json" \
  -d '{"mode":"enforce","actor":"operator","reason":"RC4 RB-2"}'
```

If observe is the desired posture, treat the would-block events as
deliberate evidence; do not change the mode.

**When to stop trusting the prototype:**

- Observe mode does not bypass missing-tenant-header 400, control-
  auth 401, fail-closed 503, or upstream errors. If those are
  appearing as 200, the prototype is not behaving as documented —
  stop and inspect `WARD_PROXY_FAIL_MODE` and `WARD_TEST_FORCE_POLICY_ERROR`.

---

## RB-3 — Control auth missing or misconfigured

**Symptom:** `/health` shows `controlAuth: "DISABLED ..."`, or
mutating calls return `401` or `503 ward_control_auth_misconfigured`.

**First check:**

```bash
curl -fsS http://localhost:4317/health | grep controlAuth
```

**Likely cause (DISABLED):** `WARD_REQUIRE_CONTROL_TOKEN` is not
`true`, or compose did not read `.env`.

**Likely cause (MISCONFIGURED):** `WARD_REQUIRE_CONTROL_TOKEN=true` is
set but `WARD_CONTROL_TOKEN` is empty. The control plane then refuses
all mutations.

**Likely cause (401):** Token is set in the environment but missing or
wrong in the caller. Common cause is `set -a; . ./.env; set +a` not
being run before the curl.

**Safe action:**

For the evaluator path, fix `.env` and restart the container:

```bash
# .env must contain both lines.
WARD_REQUIRE_CONTROL_TOKEN=true
WARD_CONTROL_TOKEN=<long random local token>

docker compose --env-file .env -f docker-compose.pull.yml up -d
```

For mutation calls in the same shell, reload the env:

```bash
set -a; . ./.env; set +a
```

In the Control Room, paste the same token into the header field
(top right).

**When to stop trusting the prototype:**

- The control auth prototype is one static bearer token. If you need
  per-operator identity, RBAC, OIDC, or rotation, the prototype
  cannot provide it. Do not expose Ward publicly; the safe evaluator
  baseline is local-only.

---

## RB-4 — Upstream failure

**Symptom:** A proxy call that should reach the upstream returns
`502`, or the proxy returns 200 from the mock when the operator
expected pass-through.

**First check:**

```bash
curl -fsS http://localhost:4317/health | grep upstreamMode
```

Also confirm:

```bash
# In the API process environment:
echo "${WARD_UPSTREAM_OPENAI_BASE_URL:-unset}"
echo "${OPENAI_API_KEY:+set (redacted)}"
```

**Likely cause (502 in pass-through mode):** Upstream returned a
non-2xx, the connection timed out, or the API key is invalid.
Ward surfaces the upstream error as `502` JSON.

**Likely cause (mock when pass-through expected):** Both
`WARD_UPSTREAM_OPENAI_BASE_URL` and `OPENAI_API_KEY` must be set.
Ward uses the mock upstream if either is missing.

**Safe action:**

- For pass-through, set both env vars and restart the API.
- For mock-only evaluation, unset both.
- A constrained or paused tenant always returns 423/429 JSON
  before any upstream call, so `502` confirms the proxy reached
  upstream — useful to confirm pass-through actually fired.

**When to stop trusting the prototype:**

- Ward does not retry upstream on transient errors and does not
  schedule backoff. If your workload needs retries, idempotency
  keys, or circuit breakers, run them at the SaaS layer, not in
  Ward.

---

## RB-5 — SQLite file or volume missing

**Symptom:** Restarting the API loses tenant state and audit events
that previously persisted. The API boots cleanly but `/health` shows
the wrong storage or the audit endpoint returns empty.

**First check:**

```bash
curl -fsS http://localhost:4317/health | grep -E '"storage"|"controlAuth"'
echo "WARD_SQLITE_PATH=${WARD_SQLITE_PATH:-unset}"
ls -l "${WARD_SQLITE_PATH:-.ward/ward.db}" 2>&1
docker volume ls | grep -E 'ward-(user-)?data' 2>&1
```

**Likely cause:** `WARD_SQLITE_PATH` points at a directory that
the API process cannot write to, the Docker volume was deleted with
`--volumes`, or the env var was changed between restarts.

**Safe action:**

- Keep `WARD_SQLITE_PATH` stable across restarts.
- Inside containers, the user/pull compose path mounts
  `ward-user-data:/data` and sets `WARD_SQLITE_PATH=/data/ward.db`.
  Use `docker compose down` (no `--volumes`) to preserve state.
- For the offline backup and restore procedure, see
  `docs/SQLITE_DEPLOYMENT.md`.
- A missing file at boot is not a hard error: Ward re-creates the
  schema and starts empty. Treat that as data loss, not a recovery
  opportunity.

**When to stop trusting the prototype:**

- SQLite is local prototype state. It is not HA, not shared across
  replicas, not Postgres, and not compliance retention. For any of
  those, the prototype cannot help — restore the data manually and
  stop relying on the SQLite backend.

---

## RB-6 — Incident receipt export

**Symptom:** An operator needs a Markdown record of what Ward did for
one tenant (containment, would-blocks, mode overrides, approvals).

**First check:** Confirm the storage path:

```bash
echo "${WARD_SQLITE_PATH:-.ward/ward.db}"
```

**Safe action:**

```bash
# From local dev with SQLite enabled.
npm run incident:export -- \
  --tenant <tenantId> \
  --db "${WARD_SQLITE_PATH:-.ward/ward.db}" \
  --out /tmp/ward-receipt.md

# From a running Ward without direct DB access.
npm run incident:export -- \
  --tenant <tenantId> \
  --api http://localhost:4317 \
  --token "${WARD_CONTROL_TOKEN}" \
  --out /tmp/ward-receipt.md

# Machine-readable variant.
npm run incident:export -- --tenant <tenantId> --json \
  --out /tmp/ward-receipt.json
```

The Markdown receipt always includes a `## Limitations` block that
disclaims compliance, forensic, tamper-proof, and production posture.
Read that block before sharing the receipt.

**When to stop trusting the prototype:**

- The receipt is operational evidence, not legal or compliance
  certification. The database is unsigned, single-file, and
  operator-editable. Do not use it as the audit artifact for a
  compliance review.

---

## RB-7 — Release verifier failure

**Symptom:** `./scripts/verify-release.sh` exits non-zero or reports
SKIPPED sections.

**First check:** Re-read the `==================== RELEASE VERIFICATION SUMMARY ====================`
table. The verifier prints every section's command, result, and the
reason for any skip. No skip is silent.

**Likely cause:**

- a Node or TypeScript type error surfaced by `npm run typecheck`
- a smoke port is already in use (smokes self-allocate ports; a stale
  process can block one)
- Docker daemon not running (compose and image-build sections skip)
- Playwright browsers not installed (E2E sections skip)
- an RC3 prototype smoke regressed

**Safe action:**

```bash
# Run the section that failed in isolation.
npm run test:unit
npm run typecheck --prefix apps/api
npm run validate:openapi
npm run smoke:audit-durability
npm run smoke:tenant-mode-override
npm run smoke:incident-receipt
npm run smoke:rc3-failure-behavior
```

If a smoke port is held:

```bash
lsof -nP -iTCP:4317 -sTCP:LISTEN
pkill -f "tsx src/server.ts"  # last resort for stray dev API
```

If Docker is not running, start Docker, then re-run the verifier.

**When to stop trusting the prototype:**

- The verifier must be clean (PASS, zero SKIPPED) before any RC
  publish. SKIPPED is not a green signal; resolve the cause first.
  For RC4, the verifier is also the single release authority; do
  not introduce parallel verifier scripts without explicit slice
  approval (see `docs/releases/v0.1.0-rc4.md` open risks).

---

## See also

- `docs/SQLITE_DEPLOYMENT.md` — SQLite persistence, restart
  recovery, backup/restore.
- `docs/ENVIRONMENT.md` — supported env vars, safe evaluator
  baseline, prototype-only flags.
- `docs/EVALUATOR_QUICKSTART.md` — copy/paste evaluator path.
- `docs/DEPLOYMENT_MODEL.md` — storage backends and failure
  behavior.
- `docs/releases/v0.1.0-rc4.md` — RC4 plan, slices, and
  acceptance criteria.
- `docs/CLAIMS_AND_EVIDENCE.md` — claim ledger and the rewrite
  rules that must be applied before any outward statement about
  Ward's capability.
