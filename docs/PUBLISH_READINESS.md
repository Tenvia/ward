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
  `docker-compose.pull.yml` defaults to
  `ghcr.io/tenvia/ward-api:v0.1.0-rc1` (override with `WARD_IMAGE=`).
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
