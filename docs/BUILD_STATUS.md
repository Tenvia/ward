# Ward Build Status

## Ninth session (2026-07-05): RC2 verification + docs/claims sync

What shipped this session:

- `apps/api/src/types.ts`, `config.ts`, `server.ts`, `openaiProxy.ts`,
  `apps/api/src/*.test.ts` — observe-only mode, mock pass-through
  verification, deterministic mock SSE streaming, unit test baseline.
- `openapi/ward.v0.yaml` (+ generated `.json`) — added `stream` to
  `ChatCompletionRequest`, `text/event-stream` response content for
  200, `x-ward-would-block` header on 200, updated honesty notes.
- New scripts: `smoke-observe-only.mjs`, `smoke-pass-through-mock.mjs`,
  `smoke-streaming-mock.mjs`, `bench-latency.mjs`. All wired into root
  `package.json`.
- `docs/CLAIMS_AND_EVIDENCE.md` — four new ledger rows.
- `docs/releases/v0.1.0-rc2.md` — implementation summary.
- `ROADMAP.md` Phase 1 first four boxes updated.

Verification battery (all passed):

| Command | Result |
| --- | --- |
| `npm run test:unit` | 27/27 pass (4 suites, 0 failures) |
| `npm run typecheck --prefix apps/api` | exit 0, zero diagnostics |
| `npm run validate:openapi` | 14 paths, 13 schemas |
| `npm run smoke:observe-only` | 13/13 PASS |
| `npm run smoke:pass-through:mock` | 9/9 PASS |
| `npm run smoke:streaming:mock` | 20/20 PASS |
| `npm run smoke:openapi` | 26/26 checks PASS |
| `npm run bench:latency` | 3/3 scenarios, all 50/50 successes |

Benchmark sample output (50 requests per scenario, Node v22.22.3, darwin/arm64):

```
# mock_chat_completion   p50 0.57 ms  p95 1.61 ms  min/max 0.36 / 5.59 ms
# mock_pass_through      p50 1.40 ms  p95 2.40 ms  min/max 0.79 / 3.52 ms
# observe_constrained_would_block
                         p50 0.51 ms  p95 1.19 ms  min/max 0.37 / 1.65 ms
Bench: 3/3 scenarios passed.
```

Local/dev only — production SLA, provider-wide overhead, and
generalization beyond this machine are NOT claimed.

Open RC2 items not addressed by design (must not appear in claims):
streaming pass-through against a real provider, mid-stream cancel audit,
live-provider latency, and the phase-2 receipts + Postgres + K8s work.
## Eighth session (2026-07-05): first publish verified

The `v0.1.0-rc1` tag was pushed (re-cut at `bca2396` after the
seventh-session warning) and the docker-image workflow executed. The
package was then made public and the pull path verified end to end
from this machine, anonymously.

Publish facts:

- Image: `ghcr.io/tenvia/ward-api:v0.1.0-rc1` (+ `0.1.0-rc1`), public.
- Digest `sha256:2c34f24799ec8260dbecb140d07d6c94b4bcecc96bc0e43aae2da84adc761cfd`;
  OCI revision label `bca2396c…` (matches the annotated tag's target
  and origin/main HEAD). linux/amd64 + linux/arm64 with provenance.
- Workflow runs: 28724067337 (from the stale `bf63411` tag position,
  superseded) and 28736769316 (authoritative). Tag-reuse deviation
  recorded in `docs/PUBLISH_READINESS.md`; published tags are not
  reused from this point on.

Post-publish verification (all passed):

| Check | Result |
| --- | --- |
| Anonymous GHCR token + tags/list + manifest | public; tags `0.1.0-rc1`, `v0.1.0-rc1`; OCI index with amd64+arm64 |
| `docker compose -f docker-compose.pull.yml pull` + `up` (no registry login) | pulled and started |
| `/health`, `/openapi.yaml`, Control Room at `/` | 200 / 200 / 200; sqlite storage, control auth required |
| Containment sequence vs pulled image | Acme 200; missing header 400; unauthorized constrain 401; approval token + exact phrase applied; Globex 429; Acme still 200; audit populated |
| Persistence across `docker compose restart` | Globex still 429, Acme 200; resume 200 |

Docs updated this session: README (pull-path quickstart, release
badge), `docker-compose.pull.yml` header, release notes (image
section with digest + publish note), `docs/USER_INSTALL_NO_NPM.md`,
`docs/DEPLOYMENT_MODEL.md` (mode 1c), `docs/PUBLISH_READINESS.md`
(marked executed), claims ledger (published image + pull compose +
workflow rows), `ROADMAP.md` Phase 0 checkboxes.

Same-day addendum: Apache-2.0 chosen and committed — `LICENSE` at the
repo root plus SPDX `"license": "Apache-2.0"` in all six package.json
manifests and `tools/wardctl/pyproject.toml`; README badge and prose,
release notes, and PUBLISH_READINESS updated. The already-published
rc1 image predates the license file (empty licenses label); the next
published tag picks it up automatically.

Still open after this session: pass-through upstream untested, no
streaming, single-node only, prototype auth.

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

The first publish is done and verified, and the license (Apache-2.0)
is committed — Phase 0 of `ROADMAP.md` is complete. Next: start
Phase 1 with SSE streaming support and verified pass-through mode —
the two blockers between "installable product" and "usable in a real
egress path".
