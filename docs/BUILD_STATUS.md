# Ward Build Status

Last build session: 2026-07-04 (sixth session — v0.1.0
release-candidate hardening).

## Summary

The RC hardening slice is complete: a live OpenAPI
response-conformance smoke (26 checks) now proves the running API
matches the hand-written contract and is part of the release battery;
the release-candidate, design-partner evaluation, and
publish-readiness documents exist; and the full release verification
passes 16/16 sections with zero skips. No image was published, no tag
was cut. mise remains uninstalled on this machine, so its tasks stay
honestly labeled unexercised. Saastle remains untouched.

## What was built this session

- `scripts/smoke-openapi-conformance.mjs` (`npm run smoke:openapi`):
  parses `openapi/ward.v0.yaml`, walks the referenced schemas
  (required fields, primitive types, enums, nested objects/arrays with
  `$ref` resolution), and validates live responses across the full
  product flow — health, served contract, Acme 200, approval + phrase
  + constrain, Globex 429 with conforming `WardError`, Acme still 200,
  audit conformance, workflow-run create/list conformance. 26 checks.
- `scripts/verify-release.sh` now includes the conformance smoke
  (16 sections total).
- `docs/RELEASE_CANDIDATE_CHECKLIST.md` — v0.1.0 gates,
  allowed-prototype list, must-not-claim list, image/contract/partner
  readiness, exact commands, do-not-publish-unless gates.
- `docs/DESIGN_PARTNER_EVALUATION_SCRIPT.md` — demo script, discovery
  questions, objection handling (aligned: Ward is the containment
  layer over existing tools, not a replacement), what not to claim.
- `docs/PUBLISH_READINESS.md` — first-publish procedure with clearly
  labeled future commands (`v0.1.0-rc1` recommended first), GHCR
  permission gates, post-publish verification, rollback notes. Not
  executed.
- Docs cross-linked: README, quickstart, USER_INSTALL_NO_NPM,
  DOCKER_RUNBOOK; claims ledger updated.

## Commands run and results (2026-07-04, sixth session)

| Command | Result |
| --- | --- |
| Baseline `./scripts/verify-release.sh` (before changes) | 15/15 sections PASS, 0 skipped |
| `npm run smoke:openapi` vs live local API | 26/26 checks passed |
| Final `./scripts/verify-release.sh` (with conformance section) | 16/16 sections PASS, 0 failed, 0 skipped |
| mise | not installed; tasks remain unexercised (unchanged, honest label kept) |
| Registry publish / tag / push of images | NOT performed (by design) |
| Saastle check | untouched; same pre-existing untracked files; read-only commands only |

## User-facing NPM requirement

None. Users: Docker + curl (+ optional uv/uvx `wardctl`). The
conformance smoke and validator are contributor tooling.

## Failures and unverified pieces

- Publish workflow still never executed; no registry image;
  multi-arch build still not run. `docker-compose.pull.yml` untestable
  until first publish.
- Conformance checking is smoke-level (representative endpoints,
  required fields/types/enums) — not exhaustive contract testing of
  every status code and edge case.
- Pass-through upstream mode remains untested.
- mise tasks remain unexercised (tool not installed).
- Standing gaps: no unit suite, hard-down fallback unsolved, prototype
  auth, single-node only.

## Next build step

Execute the first publish per `docs/PUBLISH_READINESS.md`: confirm
owner/permissions, run the multi-arch build once locally, push a
`v0.1.0-rc1` tag, let the prepared workflow publish, then verify the
pull path (`docker-compose.pull.yml`) and anonymous pull. That is the
last step between "credible evaluation" and "installable product".
