# Ward RC5 Visual Proof

This document is the visual-evidence record for the RC5
evaluator-experience slice. It captures the local Control Room against
the bundled Ward API and documents bounded UI/UX improvements that
were made or deferred.

These are captures of the local evaluator UI on this commit. They do
not prove production readiness, hosting, HA, real upstream
pass-through, or any non-claim in the ledger.

## What was captured

Five PNGs of the running Control Room on `localhost:5173` (Vite dev
server) talking to the bundled Ward API on `localhost:4317`. No real
provider, no real tokens, no real network calls.

| File | What it shows |
| --- | --- |
| `docs/assets/rc5/evaluator/control-room-empty.png` | Cold load, no tenants tracked yet. |
| `docs/assets/rc5/evaluator/control-room-pressure.png` | After one Acme call and twelve Globex calls: both tenants appear, Globex shows a pressure dot and a `pressure_detected` audit event. |
| `docs/assets/rc5/evaluator/control-room-operator-actions.png` | Operator opens Globex; tenant detail and operator-actions panel both render Globex data. |
| `docs/assets/rc5/evaluator/control-room-approval.png` | Approval flow: single-use token issued, exact phrase shown for the operator to type back. |
| `docs/assets/rc5/evaluator/control-room-contained.png` | After approval: Globex chip is `constrained`, Acme stays `running`, audit timeline shows `constrain (running -> constrained)`. |

All five PNGs are real captures. None are mockups, mock renders, or
fabricated visuals. They were taken by `apps/control-room/tests/screenshot.spec.ts`
against the bundled mock-upstream API on this commit.

## How screenshots were captured

The repo already has Playwright wired up for the Control Room:

- `apps/control-room/playwright.config.ts` brings up the API on `:4317`
  via `apps/api` and the Vite dev server on `:5173` itself.
- `apps/control-room/tests/demo.spec.ts` and
  `tests/demo-auth.spec.ts` are the existing browser E2Es.

A new `apps/control-room/tests/screenshot.spec.ts` was added. It
reuses the existing `webServer` block, so the spec does not start or
manage its own API. It seeds state via real proxy calls (one Acme,
twelve Globex) and captures full-page screenshots at five stable
moments.

Exact commands run:

```bash
cd apps/control-room
npx tsc --noEmit
npx playwright test -g "captures the local evaluator Control Room storyboard" --reporter=line
```

Result observed on the final run:

```text
Running 1 test using 1 worker
[1/1] tests/screenshot.spec.ts:31:1 › captures the local evaluator Control Room storyboard
  1 passed (11.1s)
```

Outputs land in `docs/assets/rc5/evaluator/`.

## What each screenshot does not prove

- Production readiness, hosted Ward, HA, multi-replica.
- Real upstream pass-through streaming.
- Full OpenAI compatibility.
- SOC2 / compliance / tamper-proof receipts.
- Enterprise auth, RBAC, OIDC, per-operator identity, token rotation.
- Kubernetes production deployment.
- Design-partner readiness beyond "the local demo runs on this commit".

The captures show what a fresh evaluator sees on this commit. They
do not show what an evaluator will see in three months, on a different
machine, against a real LLM provider.

## UI/UX findings

Read as a first-time cold evaluator who has just opened the Control
Room and has not read any other doc.

- `control-room-empty.png`
  - Cold load is correct. The empty-state copy ("No tenants tracked
    yet. Tenants appear on their first Ward-proxied call.") is clear.
  - The header `prototype - not production auth` is visible. A
    first-time visitor still cannot tell whether auth is currently
    required or disabled. The control-token input is empty and the
    placeholder is muted.

- `control-room-pressure.png`
  - The pressure dot is small and easy to miss on a first pass. A
    legend or tooltip would help, but a legend is out of scope for
    a bounded UI/UX polish slice.
  - The "Estimated spend" row exists but its label could imply Ward
    charges money. Kept as-is; the parenthetical is clear enough for
    a 30-minute evaluator.

- `control-room-operator-actions.png`
  - The three "Direct" buttons (Constrain / Pause / Resume) sit
    directly under the approval flow. Their label used to read
    "Direct (no approval token):" which under-emphasized the risk
    that they bypass the approval flow. Relabeled to
    "Direct (skips approval — demo only):".

- `control-room-approval.png`
  - The approval box shows the exact phrase and the expiry. The
    "single-use" message is in the small text but not visually
    emphasized. Defer.

- `control-room-contained.png`
  - The "Applied: …" confirmation is a thin line under the action
    panel. Easy to miss. Defer.

## UI/UX improvements made

Exactly one bounded change in this slice:

- `apps/control-room/src/components/OperatorActionPanel.tsx`
  - Relabeled the direct-action row from
    "Direct (no approval token):" to
    "Direct (skips approval — demo only):".
  - String-only change. No new component, no new state, no new
    dependency, no API/contract change.

## Deferred improvements (follow-up)

Each deferred item below was observed in the screenshots but crosses
a boundary that is too wide for a "bounded evaluator-experience" slice.
They are recorded here so the next iteration does not rediscover them.

- **Auth-required header hint.** When the API reports
  `controlAuthRequired` and the UI has no token, the header should
  surface that explicitly. Requires adding `controlAuth` to
  `HealthResponse` (`apps/control-room/src/types.ts`,
  `apps/api/src/...`), surfacing it through the existing health
  request, and adding a banner in `App.tsx`. Crosses the data-model
  boundary; not bounded.
- **Approval-box "single-use" pill and warning background.** A real
  single-use indicator belongs in the approval-box CSS, with a
  countdown to the `expiresAt`. Easy to get wrong (timer vs request).
- **"Applied: …" confirmation banner relocation.** Move to a
  confirmation banner above the panel title. Should pair with a
  dismiss control to avoid confusion on subsequent actions.
- **Pressure-dot legend / tooltip.** The yellow dot in the Tenants
  list is the only visual cue that pressure is detected. A legend or
  a tooltip on hover would help, but adds a new component.
- **"Start mock run" disabled helper line.** The button is already
  disabled when no tenant is selected. A small helper line ("Select a
  tenant to start a mock run") would clarify. One-line copy change;
  deferred only to keep this slice to one bounded edit.

## Verification run after changes

After the relabel:

```bash
cd apps/control-room && npx tsc --noEmit      # EXIT=0
cd apps/control-room && npx playwright test -g "captures the local evaluator Control Room storyboard"  # 1 passed
```

The full release verifier and OpenAPI validation are re-run at the
end of the slice; see `docs/BUILD_STATUS.md` for the latest receipt.
