# Publish Readiness (First Image Publish — EXECUTED 2026-07-05)

## Summary

How to execute Ward's first Docker image publish. **Status: executed.**
The `v0.1.0-rc1` tag triggered the docker-image workflow
(run 28736769316), publishing `ghcr.io/tenvia/ward-api:v0.1.0-rc1`
(+ `0.1.0-rc1`), made public, digest `sha256:2c34f247…`, built from
commit `bca2396`. Post-publish verification passed: anonymous pull,
`docker-compose.pull.yml` end to end, containment flow, control auth,
SQLite persistence across restart. One deviation from this procedure,
recorded honestly: the tag was pushed twice with different content
during prep (first from `bf63411`, superseded pre-announcement by the
`bca2396` build) — the "never reuse a published tag" rule applies
strictly from this point on; the next fix ships as `v0.1.0-rc2`.
This document remains the procedure for future publishes.

## Target

Owner decision (explicit):

```text
Repo owner:  Tenvia (company org) — transferred from jenksed 2026-07-04
GHCR target: ghcr.io/tenvia/ward-api
```

- The Actions workflow derives the owner from
  `github.repository_owner`, so it publishes to
  `ghcr.io/tenvia/ward-api` as long as the repo lives at
  `github.com/Tenvia/ward` (metadata-action lowercases the org name).
  `docker-compose.pull.yml` currently defaults to the latest published
  baseline, `ghcr.io/tenvia/ward-api:v0.1.0-rc3` (override with
  `WARD_IMAGE=`).
- Org-transfer note: publishing from an org repo may additionally
  require the Tenvia org to allow GitHub Actions to create packages
  (org settings -> packages / actions permissions). Check this before
  the first workflow run.
- First-publish visibility: GHCR packages created by a workflow are
  PRIVATE by default. Anonymous `docker pull` (and therefore the
  public pull-path docs) will not work until the package is made
  public in GitHub package settings. Decide visibility deliberately.
- `docker-compose.pull.yml` cannot be fully verified until the image
  actually exists in GHCR.
- License note: the repo is licensed Apache-2.0 (`LICENSE`, SPDX
  `Apache-2.0`, added 2026-07-05). The already-published `v0.1.0-rc1`
  image predates the license file, so its
  `org.opencontainers.image.licenses` label is empty; images published
  from tags after the LICENSE commit pick up the label automatically
  via metadata-action.
- Contents: API + bundled Control Room + OpenAPI contract (the same
  image `./scripts/build-image.sh local` produces).

## Pre-publish checklist

- [ ] All gates in `docs/RELEASE_CANDIDATE_CHECKLIST.md` pass,
      including the do-not-publish-unless list.
- [ ] Repo pushed to GitHub; `.github/workflows/docker-image.yml`
      present on the default branch.
- [ ] GHCR permissions: workflow has `packages: write` (it does);
      confirm the org/user allows GITHUB_TOKEN package publishing.
- [ ] Multi-arch build exercised once locally:
      `./scripts/build-image.sh multiarch`.
- [ ] Tag naming decided. Recommendation: publish
      `v0.1.0-rc1` first, verify the pull path end-to-end, then
      `v0.1.0`. Do not decide the final version automatically.

## Publish paths (procedure for each publish — do not run casually)

Tag-driven (executed for `v0.1.0-rc1` on 2026-07-05):

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

Or manual: GitHub -> Actions -> docker-image -> Run workflow.

The workflow builds linux/amd64 + linux/arm64 and pushes to GHCR with
semver + `latest` (default branch only) tags.

## Post-publish verification (performed for v0.1.0-rc1; repeat per publish)

The repeatable, copy/paste post-publish check lives in
`docs/POST_PUBLISH_VERIFICATION.md`. Use it after every published
tag. The steps there are the source of truth for what the future
`scripts/post-publish-verify.sh` and any extension of
`scripts/verify-release.sh` must do.

```bash
docker logout ghcr.io   # verify anonymous pull works for a public package
docker compose -f docker-compose.pull.yml pull
docker compose -f docker-compose.pull.yml up
./scripts/smoke-user-install.sh   # after pointing it at the pull compose, or curl manually
curl http://localhost:4317/health
curl http://localhost:4317/openapi.yaml
```

Also verify the package visibility on GitHub (private by default —
decide public/private deliberately) and that the README install docs
switch `docker-compose.user.yml` guidance to the pull path.

## Rollback / mistake handling

- GHCR packages can be deleted (package settings -> delete version) —
  do this immediately if a broken or mis-tagged image ships.
- Never reuse a published tag with different content; publish a new
  patch tag instead.
- `docker-compose.pull.yml` honors `WARD_IMAGE=` so users can pin a
  known-good tag while a bad `latest` is being cleaned up.


## v0.1.0-rc3 publish record — EXECUTED 2026-07-05

Status: tagged locally, pushed to origin, image built and published to
GHCR, anonymous pull verified, container booted, `/health` verified.

### Tag and image

- **Tag:** `v0.1.0-rc3` (annotated, local message: "v0.1.0-rc3: durable
  operator trust — versioned audit, SQLite restart recovery,
  per-tenant mode overrides, explicit transition contract, local
  incident receipts, and failure-behavior smoke").
- **Underlying commit:** `ada1658` (the most recent commit on
  `origin/main` at publish time). HEAD matched `origin/main`; worktree
  clean.
- **Image:** `ghcr.io/tenvia/ward-api:v0.1.0-rc3` (linux/amd64 +
  linux/arm64).
- **Publish workflow:** `.github/workflows/docker-image.yml` (key:
  `docker-image`), run `28756686801`. Status: passed.

### Post-publish verification

Performed against the published image:

- **Anonymous pull:** `docker compose -f docker-compose.pull.yml pull`
  against `ghcr.io/tenvia/ward-api:v0.1.0-rc3` succeeded without
  registry login.
- **Container boot:** `docker compose -f docker-compose.pull.yml up`
  served Ward at `http://localhost:4317/`.
- **`/health` returned:**

  ```json
  {
    "status": "ok",
    "service": "ward-api",
    "controlRoomBundled": true,
    "openapi": { "served": true, "path": "/openapi.yaml" },
    "storage": "memory",
    "controlAuth": "DISABLED — ..."
  }
  ```

- **OpenAPI contract served** at `GET /openapi.yaml`.
- **Storage mode:** `memory` (the default; SQLite is opt-in via
  `WARD_STORAGE=sqlite`).
- **Control auth:** disabled by default; enabling requires
  `WARD_REQUIRE_CONTROL_TOKEN=true` and `WARD_CONTROL_TOKEN=<token>` in
  the environment.

### Workflow annotation (non-blocking)

The `docker-image` workflow passed but emitted a non-blocking Node.js
20 deprecation annotation from upstream GitHub Actions (the
upstream-provided `actions/setup-node` is currently pinned to Node
20). The build itself completed successfully on Node 20 and the
published image runs the API correctly under the runtime Node
embedded in the multi-stage Dockerfile (Node 22-alpine). This
annotation does not affect the publish and is not actionable here;
it will resolve when the upstream action moves to a Node 22
default. Captured here so the next release verifier run records
whether it has cleared.

### Scope reminders

Published `v0.1.0-rc3` is verified prototype support. It is **not**
production-ready, **not** design-partner-ready, **not**
compliance-ready, does **not** include hosted Ward, and does **not**
include pass-through streaming against a real upstream. See
`docs/CLAIMS_AND_EVIDENCE.md` for the full claim ledger and the
claim rewrite rules.

### Cadence

Procedure and rollback handling for this publish are the same as
`v0.1.0-rc1` above. The "never reuse a published tag" rule applied
from `v0.1.0-rc1` carries forward.
