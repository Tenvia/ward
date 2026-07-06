# Ward RC5 Visual Proof

This document is the visual-evidence record for the RC5 evaluator-experience work and the follow-up Control Room light-theme polish. It captures the local Control Room against the bundled Ward API and documents bounded UI/UX improvements that were made or deferred.

These captures show local prototype UI behavior only. They do not prove production readiness, hosting, HA, real upstream pass-through, full OpenAI compatibility, SOC2/compliance, tamper-proof receipts, enterprise auth, RBAC, OIDC, per-operator identity, or token rotation.

## Capture sets

### Historical evaluator captures

The current visual proof for this commit is the themed capture set in
`docs/assets/rc5/control-room/`.

The older `docs/assets/rc5/evaluator/` PNGs are historical captures
from the previous RC5 visual-proof commit. They remain in the repo for
traceability, but they show the pre-light-theme header and are
superseded for current UI review by the themed captures below.

Historical files:

| File | What it showed |
| --- | --- |
| `docs/assets/rc5/evaluator/control-room-empty.png` | Cold load, no tenants tracked yet. |
| `docs/assets/rc5/evaluator/control-room-pressure.png` | After one Acme call and twelve Globex calls: both tenants appeared, Globex showed a pressure dot and a `pressure_detected` audit event. |
| `docs/assets/rc5/evaluator/control-room-operator-actions.png` | Operator opened Globex; tenant detail and operator-actions panel both rendered Globex data. |
| `docs/assets/rc5/evaluator/control-room-approval.png` | Approval flow: single-use token issued, exact phrase shown for the operator to type back. |
| `docs/assets/rc5/evaluator/control-room-contained.png` | After approval: Globex chip was `constrained`, Acme stayed `running`, audit timeline showed `constrain (running -> constrained)`. |

### Current themed captures

| File | What it shows |
| --- | --- |
| `docs/assets/rc5/control-room/control-room-empty-dark.png` | Dark theme cold load; no tenants tracked yet. |
| `docs/assets/rc5/control-room/control-room-empty-light.png` | Light theme cold load; no tenants tracked yet. |
| `docs/assets/rc5/control-room/control-room-pressure-dark.png` | Dark theme seeded pressure state with Acme running and Globex above the demo threshold. |
| `docs/assets/rc5/control-room/control-room-pressure-light.png` | Light theme seeded pressure state with Acme running and Globex above the demo threshold. |
| `docs/assets/rc5/control-room/control-room-operator-actions-dark.png` | Dark theme operator opens Globex; tenant detail and operator-actions panel render. |
| `docs/assets/rc5/control-room/control-room-operator-actions-light.png` | Light theme operator opens Globex; tenant detail and operator-actions panel render. |
| `docs/assets/rc5/control-room/control-room-approval-dark.png` | Dark theme approval flow with exact confirmation phrase. |
| `docs/assets/rc5/control-room/control-room-approval-light.png` | Light theme approval flow with exact confirmation phrase. |
| `docs/assets/rc5/control-room/control-room-contained-dark.png` | Dark theme applied containment: Globex constrained, Acme running, audit updated. |
| `docs/assets/rc5/control-room/control-room-contained-light.png` | Light theme applied containment: Globex constrained, Acme running, audit updated. |

All current PNGs are real captures. None are mockups, generated placeholders, or fabricated visuals. They were taken by `apps/control-room/tests/screenshot.spec.ts` against the bundled mock-upstream API on this commit.

## How screenshots were captured

The repo has Playwright wired up for the Control Room:

- `apps/control-room/playwright.config.ts` remains the release-verifier E2E config. It runs the default demo E2E and ignores screenshot capture specs.
- `apps/control-room/playwright.auth.config.ts` remains the shared-token auth E2E config.
- `apps/control-room/playwright.screenshot.config.ts` is the explicit visual-proof config. It runs only `apps/control-room/tests/screenshot.spec.ts`.

The screenshot spec uses the existing web-server shape: Ward API on `localhost:4317` and Vite on `localhost:5173`. Each theme runs in its own fresh Playwright `BrowserContext`; `addInitScript` clears local storage and seeds `localStorage["ward_control_room_theme"]` before the first `goto("/")`, so the empty-state captures are themed from the first app navigation. The spec then seeds state via real proxy calls: one Acme call and twelve Globex calls. It captures five stable moments in both dark and light themes.

Exact capture command run:

```bash
cd apps/control-room && npx playwright test -c playwright.screenshot.config.ts --reporter=line
```

Result observed:

```text
Running 1 test using 1 worker
[1/1] tests/screenshot.spec.ts:121:1 › captures the local evaluator Control Room storyboard in dark and light themes
  1 passed
```

## Light theme implementation

Light theme is a bounded UI polish iteration after the original RC5 evaluator-experience slice closed. It does not reopen the RC5 release plan or add runtime, API, auth, policy-engine, persistence, compose, or deployment behavior.

Changed files:

- `apps/control-room/src/App.tsx`
  - Adds `dark` / `light` theme state.
  - Persists the selected theme in `localStorage["ward_control_room_theme"]`.
  - Writes `document.documentElement.dataset.theme` so CSS can switch tokens.
  - Keeps the header's prototype framing visible with `Local prototype control plane` and `not production auth`.
- `apps/control-room/src/styles.css`
  - Keeps existing class names used by E2E and screenshots: `.tenant-row`, `.chip.running`, `.chip.constrained`, `.pressure-dot`, `.kv`, `.approval-box`, `.empty`, `.audit-item`, `.panel`, `.header h1`.
  - Adds tokenized colors and `:root[data-theme="light"]` overrides.
  - Adds styling for the new header grouping and theme toggle.
- `apps/control-room/tests/screenshot.spec.ts`
  - Captures the current dark and light theme paths under `docs/assets/rc5/control-room/`.
- `apps/control-room/playwright.screenshot.config.ts`
  - Keeps screenshot capture out of the default release-verifier Playwright run.

## What each screenshot does not prove

- Production readiness, hosted Ward, HA, or multi-replica behavior.
- Real upstream pass-through streaming.
- Full OpenAI compatibility.
- SOC2, compliance, tamper-proof receipts, or signed evidence.
- Enterprise auth, RBAC, OIDC, per-operator identity, or token rotation.
- Kubernetes production deployment.
- That every error, disabled, overflow, and edge state has been visually reviewed in both themes.
- That a future evaluator on a different machine will see identical browser font rendering.

The captures show what the local prototype UI looked like on this commit against the bundled mock-upstream API.

## UI/UX findings

Read as a first-time local evaluator who has just opened the Control Room and has not read any other doc.

- Empty state:
  - The empty-state copy renders correctly in both themed cold-load contexts and clearly says tenants appear on their first Ward-proxied call.
  - The header now includes `Local prototype control plane`, `API ok`, `upstream mock_upstream`, and `not production auth` in both themes.
  - The token field remains empty. It still does not explain whether the current API requires a token; that needs API health/auth-state plumbing, so it remains deferred.
- Pressure state:
  - The pressure dot is visible in both themes but still lacks an inline legend or tooltip.
  - The `Estimated spend` row uses the explicit parenthetical `fixed per-call estimate, not a real cost model`.
- Operator actions:
  - The direct-action row remains labeled `Direct (skips approval — demo only):`, preserving the prior risk clarification.
- Approval flow:
  - The approval box shows the exact phrase and expiry. The single-use concept is still small copy, not a strong visual badge.
- Contained state:
  - The applied confirmation and audit timeline both render in dark and light themes.

## UI/UX improvements made

This follow-up includes bounded UI polish only:

- Adds a first-class light theme.
- Adds a persistent theme toggle.
- Keeps the dark theme strong and operator-grade.
- Restructures the header so the prototype framing, API state, upstream mode, auth caveat, control-token input, and theme toggle fit cleanly.
- Preserves the prior direct-action relabel: `Direct (skips approval — demo only):`.

No runtime behavior, API contract, OpenAPI contract, compose behavior, auth model, policy behavior, deployment model, or persistence model changed.

## Deferred improvements and risks

- **Auth-required header hint.** When the API reports `controlAuthRequired` and the UI has no token, the header should surface that explicitly. Requires adding auth-state data to the health shape and UI; deferred.
- **Light-theme edge states.** Light theme was exercised across the core five-state storyboard. It has not been exhaustively reviewed against every error-box, disabled-control, overflow, and stale-API state.
- **Approval-box single-use badge.** The single-use / expiry message should become a stronger visual badge or warning background. Deferred to avoid timer/state complexity.
- **Applied confirmation banner.** `Applied: …` remains a small line below the action buttons. Moving it to a dismissible banner is deferred.
- **Pressure-dot legend / tooltip.** The yellow pressure cue still needs a legend or tooltip.
- **Start mock run helper.** The button is disabled with no tenant selected, but the helper text is still generic.

## Verification run after changes

Commands run:

```bash
cd apps/control-room && npx tsc --noEmit
cd apps/control-room && npx playwright test -c playwright.screenshot.config.ts --reporter=line
./scripts/verify-release.sh 2>&1 | grep -E '^(--- FAIL|Passed:|Failed:|Skipped:|RELEASE VERIFICATION)'
```

Results observed:

```text
EXIT=0
1 passed
Passed: 20  Failed: 0  Skipped: 0
RELEASE VERIFICATION PASSED
```

The full release verifier still runs its default E2E path and does not run the screenshot spec by default.
