// Visual proof spec for RC5. Captures the local Control Room against
// the bundled Ward API in real Playwright Chromium. Reuses the
// webServer block from playwright.config.ts so the API on :4317 and
// the Vite dev server on :5173 are already up.
//
// No tokens, headers, or secrets are introduced into the UI by this
// spec. The control-token input stays empty; the API is run with
// WARD_REQUIRE_CONTROL_TOKEN unset, matching the local demo path.
import { expect, test, type APIRequestContext } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const API = "http://localhost:4317";
const OUT_DIR = resolve(__dirname, "..", "..", "..", "docs", "assets", "rc5", "evaluator");

test.beforeAll(() => {
  mkdirSync(OUT_DIR, { recursive: true });
});

const shot = (name: string) => resolve(OUT_DIR, name);

const proxyCall = (request: APIRequestContext, tenantId: string, body: object) =>
  request.post(`${API}/v1/chat/completions`, {
    headers: { "x-ward-tenant-id": tenantId, "content-type": "application/json" },
    data: body,
  });

test("captures the local evaluator Control Room storyboard", async ({ page, request }) => {
  // Reset any prior state so the storyboard is deterministic.
  await request.post(`${API}/ward/reset`);

  // 1. Cold load: empty state. After `/ward/reset` the App polls the
  //    API on a 2s interval, so wait for the Tenants panel to settle
  //    to zero rows before asserting the empty-state copy. Counting
  //    rows is the determinism gate: if state leaked from a prior
  //    run, this fails loudly instead of producing a wrong screenshot.
  await page.goto("/");
  await expect(page.locator("h1")).toHaveText("WARD CONTROL ROOM");
  const tenantsPanel = page.locator(".panel", {
    has: page.locator("h2", { hasText: /^Tenants$/ }),
  });
  await expect(tenantsPanel.locator(".tenant-row")).toHaveCount(0, { timeout: 5_000 });
  await expect(tenantsPanel.locator(".empty")).toBeVisible();
  await page.screenshot({ path: shot("control-room-empty.png"), fullPage: true });
  // Seed real state: one Acme call, twelve Globex calls (above the
  // default pressure threshold of 8 / 10s).
  const call = (tenantId: string) =>
    proxyCall(request, tenantId, {
      model: "demo",
      messages: [{ role: "user", content: "screenshot seed" }],
    });
  await call("tenant_acme");
  for (let i = 0; i < 12; i += 1) await call("tenant_globex");

  // 2. Seeded state: both tenants visible, Globex pressure dot, no
  //    constraint yet.
  await expect(page.locator(".tenant-row", { hasText: "tenant_acme" })).toBeVisible();
  await expect(page.locator(".tenant-row", { hasText: "tenant_globex" })).toBeVisible();
  await expect(
    page.locator(".tenant-row", { hasText: "tenant_globex" }).locator(".pressure-dot")
  ).toBeVisible();
  await page.screenshot({ path: shot("control-room-pressure.png"), fullPage: true });

  // 3. Operator opens Globex: detail + operator-actions panel appear.
  await page.locator(".tenant-row", { hasText: "tenant_globex" }).click();
  await expect(
    page.locator(".panel h2", { hasText: "Operator Actions - tenant_globex" })
  ).toBeVisible();
  await expect(page.locator(".kv dd", { hasText: "Request loop pressure" })).toBeVisible();
  await page.screenshot({ path: shot("control-room-operator-actions.png"), fullPage: true });

  // 4. Approval flow: token box visible with the exact phrase.
  await page
    .getByPlaceholder("e.g. Globex loop exceeded demo threshold")
    .fill("screenshot: globex loop pressure");
  await page.getByRole("button", { name: "Request approval" }).click();
  await expect(page.locator(".approval-box code")).toHaveText("constrain tenant_globex");
  await page.screenshot({ path: shot("control-room-approval.png"), fullPage: true });

  // 5. Apply: Globex becomes constrained, Acme stays running, audit
  //    timeline records the transition.
  await page.getByPlaceholder("type the confirmation phrase").fill("constrain tenant_globex");
  await page.getByRole("button", { name: "Apply approved action" }).click();
  await expect(
    page.locator(".tenant-row", { hasText: "tenant_globex" }).locator(".chip.constrained")
  ).toBeVisible({ timeout: 10_000 });
  await expect(
    page.locator(".tenant-row", { hasText: "tenant_acme" }).locator(".chip.running")
  ).toBeVisible();
  await expect(
    page
      .locator(".panel", { hasText: "Audit Timeline" })
      .locator(".audit-item", { hasText: "constrain (running -> constrained)" })
  ).toBeVisible({ timeout: 10_000 });
  await page.screenshot({ path: shot("control-room-contained.png"), fullPage: true });
});
