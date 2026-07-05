# Ward v0.1.0 Release-Candidate Checklist

## Summary

Gate list for calling a build a v0.1.0 release candidate. Everything
here is verifiable with the commands below. If a gate fails, fix it or
do not cut the RC.

## 1. What must pass before v0.1.0

- `./scripts/verify-release.sh` — all sections PASS, zero SKIPPED.
  (Includes: OpenAPI validation, typechecks, SDK + Control Room
  builds, containment smoke, SDK smoke, OpenAPI live conformance,
  reliability smoke, both browser E2Es, all compose configs, local
  image build, 16-check user install smoke.)
- `npm run smoke:openapi` against a running instance — live responses
  conform to `openapi/ward.v0.yaml`.
- `docker compose -f docker-compose.user.yml up --build` starts one
  container serving API + Control Room + contract on 4317.
- Docs claims review: `docs/CLAIMS_AND_EVIDENCE.md` matches reality.

## 2. Allowed to remain prototype in v0.1.0

Shared-token control auth; SQLite persistence (JSON-blob schema,
experimental `node:sqlite`); dev-only Docker runner (disabled by
default); mock workflow runner; cooperative SDK guard; in-memory
approval tokens and workflow runs; hand-written OpenAPI contract with
smoke-level conformance checking.

## 3. What must NOT be claimed

Production readiness or SLA; production RBAC; hard-down proxy
failover; HA/multi-replica; real dollar metering; full OpenAI spec
compatibility; Kubernetes runner; hosted Ward; Saastle-managed
operations.

## 4. Docker image readiness

- [ ] `./scripts/build-image.sh local` builds and the image serves
      `/health`, `/openapi.yaml`, and the Control Room at `/`.
- [ ] `.dockerignore` keeps the context small.
- [ ] Multi-arch build executed at least once before publish
      (`./scripts/build-image.sh multiarch`) — still unexercised as of
      this checklist's creation.

## 5. OpenAPI contract readiness

- [ ] `npm run validate:openapi` passes (14 paths, 13 schemas, JSON
      twin regenerated).
- [ ] `npm run smoke:openapi` passes against a live instance.
- [ ] Honesty notes in the contract still match runner/auth status.

## 6. Design-partner readiness

- [ ] `docs/DESIGN_PARTNER_QUICKSTART.md` runs clean on a machine with
      only Docker + curl.
- [ ] `docs/DESIGN_PARTNER_EVALUATION_SCRIPT.md` reviewed by whoever
      gives the demo.
- [ ] Demo line verified end-to-end: Globex contained, Acme never
      blipped.

## 7. Known caveats (carry into release notes)

Single-node only; state resets on `docker compose down -v`; pass-through
upstream mode untested; mise tasks unexercised; no unit test suite
(coverage = five smoke suites + two browser E2Es); `proxy_fail_open`
audit is best-effort when storage itself is failing.

## 8. Exact command checklist

```bash
./scripts/verify-release.sh
npm run smoke:openapi
docker compose -f docker-compose.user.yml up --build
./scripts/smoke-user-install.sh
```

## Do-not-publish-unless gates

- [x] Repo owner confirmed — `Tenvia` org
      (`github.com/Tenvia/ward`; image: `ghcr.io/tenvia/ward-api`)
- [ ] GHCR package permissions confirmed for `GITHUB_TOKEN`
- [ ] Image name confirmed
- [ ] Version/tag confirmed (consider `v0.1.0-rc1` first)
- [ ] Release notes reviewed
- [ ] `docs/CLAIMS_AND_EVIDENCE.md` reviewed
- [ ] No Saastle dependency confirmed (grep runtime paths)

See `docs/PUBLISH_READINESS.md` for the publish procedure itself.
