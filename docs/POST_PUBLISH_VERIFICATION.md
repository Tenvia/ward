# Ward Post-Publish Verification

## Summary

This document is the RC4 Slice 5 reference for repeating Ward's
post-publish verification. The goal is a single, deterministic
check that a freshly published Ward image:

1. pulls anonymously from GHCR
2. boots the API + bundled Control Room
3. serves `/health`, `/openapi.yaml`, and the Control Room
4. exercises the evaluator containment flow
5. tears down cleanly

It is the docs-only form of Slice 5. The actual scripted form —
a small `scripts/post-publish-verify.sh` and an extension of
`scripts/verify-release.sh` to call it — is deliberately deferred
to a separate implementation slice that requires explicit owner
approval (see `docs/releases/v0.1.0-rc4.md` open risks).

## When to run this

Run post-publish verification after every published Ward RC or
release tag. Today that means after each successful run of
`.github/workflows/docker-image.yml` that publishes a new tag.

## Required tools

- Docker with Compose
- curl
- jq (only for the optional JSON inspection step)

No registry login is required for a public package. The flow below
intentionally uses `docker logout ghcr.io` first to prove anonymous
pull works.

## Verification flow

Set the image once. The published tag is the unit of identity; the
digest and revision label are recorded in the release notes.

```bash
WARD_IMAGE="${WARD_IMAGE:-ghcr.io/tenvia/ward-api:v0.1.0-rc4}"
WARD_PORT="${WARD_PORT:-4317}"
```

Step 1 — anonymous pull.

```bash
docker logout ghcr.io
docker pull "${WARD_IMAGE}"
docker inspect --format '{{index .RepoDigests 0}}' "${WARD_IMAGE}"
```

Expected:

- `docker pull` succeeds without a credential prompt.
- The digest shown matches the digest recorded in
  `docs/PUBLISH_READINESS.md` for the corresponding publish.

Step 2 — compose config validation.

```bash
WARD_IMAGE="${WARD_IMAGE}" docker compose -f docker-compose.pull.yml config -q
```

Expected: exit 0, no output.

Step 3 — boot and wait for health.

```bash
WARD_IMAGE="${WARD_IMAGE}" docker compose -f docker-compose.pull.yml up -d

# Wait up to 60s for /health.
for _ in $(seq 1 60); do
  if curl -fsS "http://localhost:${WARD_PORT}/health" >/tmp/ward-post-health.json; then
    break
  fi
  sleep 1
done

cat /tmp/ward-post-health.json
```

Expected health facts:

- `status` is `ok`
- `service` is `ward-api`
- `controlRoomBundled` is `true`
- `openapi.served` is `true`
- `storage` is `sqlite` when booted through `docker-compose.pull.yml`
  (the SQLite file lives on the `ward-user-data` named volume)
- `controlAuth` is required with a shared bearer token prototype when
  booted through `docker-compose.pull.yml`

Step 4 — confirm OpenAPI and Control Room are served.

```bash
curl -fsS "http://localhost:${WARD_PORT}/openapi.yaml" | head -n 1
curl -fsS "http://localhost:${WARD_PORT}/openapi.json" | head -c 1
curl -fsS "http://localhost:${WARD_PORT}/" -o /tmp/ward-post-ui.html
grep -q '<div id="root">' /tmp/ward-post-ui.html && echo "Control Room served"
```

Expected:

- `/openapi.yaml` first line is `openapi: 3.0.3`.
- `/openapi.json` returns a JSON object starting with `{`.
- `/` contains the Control Room mount point.

Step 5 — control auth probe.

`docker-compose.pull.yml` enables control auth by default, but its
fallback token is `ward-demo-token`. For post-publish verification,
override it in a fresh boot so the check proves the auth path without
reusing the demo token:

```bash
WARD_IMAGE="${WARD_IMAGE}" \
WARD_REQUIRE_CONTROL_TOKEN=true \
WARD_CONTROL_TOKEN=post-publish-verify-token \
docker compose -f docker-compose.pull.yml up -d --force-recreate

# 401 expected without a token.
curl -sS -o /dev/null -w "%{http_code}\n" \
  -X POST "http://localhost:${WARD_PORT}/ward/tenants/tenant_globex/constrain" \
  -H "content-type: application/json" \
  -d '{"actor":"post-publish","reason":"no-token probe"}'

# 200 expected with the token.
curl -sS -o /dev/null -w "%{http_code}\n" \
  -X POST "http://localhost:${WARD_PORT}/ward/tenants/tenant_globex/constrain" \
  -H "authorization: Bearer post-publish-verify-token" \
  -H "content-type: application/json" \
  -d '{"actor":"post-publish","reason":"with-token probe"}'
```

Step 6 — evaluator containment check (recommended).

Follow `docs/EVALUATOR_QUICKSTART.md` to:

- generate a fresh local control token
- constrain one tenant and confirm 429
- confirm a different tenant still returns 200
- inspect `/ward/audit`
- resume the constrained tenant

This is the same path an evaluator runs; it is the strongest
end-to-end check the prototype supports.

Step 7 — tear down.

```bash
WARD_IMAGE="${WARD_IMAGE}" docker compose -f docker-compose.pull.yml down
```

Pass `--volumes` only when you want to delete the SQLite volume
(usually not on a post-publish check).

## What to record

After a clean run, record in `docs/BUILD_STATUS.md` and the
release notes:

- the published tag, digest, and run ID
- the platform set (`linux/amd64`, `linux/arm64`)
- the OCI revision label (matches the tag's peeled commit)
- the outcome of every step above
- any deviation from the expected outputs

If any step fails, do not announce a publish. Either:

- fix the underlying issue and re-run, or
- delete the GHCR package version and re-tag

Do not reuse a published tag. The "never reuse a published tag"
rule applied from `v0.1.0-rc1` carries forward.

## GHCR visibility check (manual)

The package is private by default when GitHub Actions creates it.
Anonymous `docker pull` will not work until the package is made
public. Decide visibility deliberately in the GitHub package
settings. The flow above already covers the public-package
verification path; for a private-package path, the pull step
must use a credentialed `docker login ghcr.io`.

To check visibility without credentials:

```bash
curl -sS "https://ghcr.io/token?scope=repository:tenvia/ward-api:pull"
```

A 401 here means the package is private. A 200 returns an
anonymous token and indicates the package is public.

## Why the script form is not in this slice

The RC4 plan explicitly defers `scripts/post-publish-verify.sh`
and any extension of `scripts/verify-release.sh` to a separate
implementation slice. The reasons are:

- one release authority, not parallel scripts
- any change to `scripts/verify-release.sh` must come with its own
  evidence, not hidden inside planning
- script changes need a separate commit message so they are
  auditable

When the script is implemented, this document becomes the source
of truth for what that script must do. The script form should
not exceed the seven steps above plus the visibility check.

## See also

- `docs/PUBLISH_READINESS.md` — publish procedure and rollback
  notes.
- `docs/EVALUATOR_QUICKSTART.md` — copy/paste evaluator path.
- `docs/OPERATOR_RUNBOOK.md` — RB-7 release verifier failure
  runbook.
- `docs/ENVIRONMENT.md` — supported env vars and safe evaluator
  baseline.
- `docs/releases/v0.1.0-rc4.md` — RC4 plan and Slice 5 caveat.
