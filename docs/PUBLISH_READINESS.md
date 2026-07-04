# Publish Readiness (First Image Publish — NOT Executed)

## Summary

How to execute Ward's first Docker image publish when the decision is
made. Nothing in this document has been run. No image exists on any
registry yet.

## Target

- Image: `ghcr.io/<owner>/ward-api` — placeholder owner is `10via` in
  `docker-compose.pull.yml`; the Actions workflow uses
  `github.repository_owner`. CONFIRM THE OWNER before publishing and
  align the compose default if it differs.
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

## Publish paths (future steps — do not run casually)

Tag-driven:

```bash
# FUTURE PUBLISH STEP — not executed in any build session so far
git tag v0.1.0-rc1
git push origin v0.1.0-rc1
```

Or manual: GitHub -> Actions -> docker-image -> Run workflow.

The workflow builds linux/amd64 + linux/arm64 and pushes to GHCR with
semver + `latest` (default branch only) tags.

## Post-publish verification

```bash
# FUTURE PUBLISH STEPS
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
