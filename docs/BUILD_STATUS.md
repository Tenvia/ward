# Ward Build Status

Last build session: 2026-07-05 (seventh session — roadmap + doc
alignment; no code changes).

## Seventh session (2026-07-05): roadmap and doc alignment

Docs-only session. No code, contract, script, or compose changes; no
tag, publish, push, or registry action.

- Added `ROADMAP.md` (phased roadmap; wedge = tenant state + operator
  approval + containment receipt; explicit not-a-gateway /
  not-observability / not-a-framework boundaries).
- Removed stale Elixir/BEAM/inherited-runtime/shadow-runtime framing
  from current-facing docs: rewrote `docs/PRODUCT_SPINE.md`,
  `docs/INTEGRATION_MODEL.md` (dropped "Native Saastle runtime mode"
  from the guarantee ladder), `docs/OBJECTIONS.md`, and the
  "Relationship to Saastle" section of
  `docs/NAMING_AND_POSITIONING.md` to match the standalone TypeScript
  reality.
- Marked historical documents as historical with banners:
  `docs/BUILD_PLAN.md` (superseded by ROADMAP),
  `docs/SAASTLE_SOURCE_MAP.md` (engine-inheritance statements no
  longer true), `docs/investigations/WARD_PRODUCT_PACKET.md`.
- Synced `docs/ARCHITECTURE.md` with the claims ledger: fail-open
  section now reflects the verified SDK/proxy-degraded behavior (and
  the unsolved hard-down gap), Docker runner marked dev-only
  prototype, storage/control-auth rows added, out-of-scope list
  updated.
- Rewrote `docs/DEMO_SCRIPT.md` for upstream honesty: the verified
  demo uses the mock upstream; pass-through remains untested;
  narration lines updated (SQLite audit prototype, degraded fail-open
  vs hard-down).
- Normalized smoke-check counts. Static ground truth:
  `scripts/smoke-demo.mjs` has 18 checks, `scripts/smoke-user-install.sh`
  has 16 (both match the recorded sixth-session battery results);
  stale 15/16-check references in CLAIMS_AND_EVIDENCE,
  USER_INSTALL_NO_NPM, and DEPLOYMENT_MODEL were corrected or replaced
  with "the script prints its own count".
- Observation for the publish step: a local git tag `v0.1.0-rc1`
  exists but points behind HEAD (`bf63411` vs `9b862ff`, the Tenvia
  org-alignment commits). Re-cut the tag at the intended commit before
  the first publish; `docs/PUBLISH_READINESS.md` applies.
- Verification run this session: `npm run validate:openapi` (pass) and
  stale-term greps (see below). The full release battery, smokes, and
  E2Es were NOT re-run — no code changed.

## Sixth session (2026-07-04): v0.1.0 release-candidate hardening

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
