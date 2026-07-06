// Visual proof spec for RC5. Captures the local Control Room against
// the bundled Ward API in real Playwright Chromium. It is intentionally
// run through playwright.screenshot.config.ts, not the default release
// verifier config.
//
// No real tokens, headers, or secrets are introduced into the UI by this
// spec. The control-token input stays empty; the API is run with
// WARD_REQUIRE_CONTROL_TOKEN unset, matching the local demo path.
import { expect, test, type APIRequestContext, type Browser } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const API = "http://localhost:4317";
const THEME_STORAGE_KEY = "ward_control_room_theme";
const OUT_DIR = resolve(__dirname, "..", "..", "..", "docs", "assets", "rc5", "control-room");

test.beforeAll(() => {
  mkdirSync(OUT_DIR, { recursive: true });
});

const shot = (name: string) => resolve(OUT_DIR, name);

const proxyCall = (request: APIRequestContext, tenantId: string, body: object) =>
  request.post(`${API}/v1/chat/completions`, {
    headers: { "x-ward-tenant-id": tenantId, "content-type": "application/json" },
    data: body,
  });


async function captureStoryboard(browser: Browser, request: APIRequestContext, theme: "dark" | "light") {
  const context = await browser.newContext({
    baseURL: "http://localhost:5173",
    viewport: { width: 1280, height: 720 },
  });
  await context.addInitScript(
    ([key, value]) => {
      window.localStorage.clear();
      window.localStorage.setItem(key, value);
    },
    [THEME_STORAGE_KEY, theme]
  );
  const page = await context.newPage();

  try {
    await request.post(`${API}/ward/reset`);

    // 1. Empty tenants panel. Each theme starts from a fresh browser
    // context with localStorage seeded before the first app navigation.
    // Reset happens before that navigation; counting rows after render
    // is the determinism gate. If state leaked from a prior run, this
    // fails loudly instead of producing a mislabeled screenshot.
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(page.locator("h1")).toHaveText("WARD CONTROL ROOM");
    const tenantsPanel = page.locator(".panel", {
      has: page.locator("h2", { hasText: /^Tenants$/ }),
    });
    await expect(tenantsPanel.locator(".tenant-row")).toHaveCount(0, { timeout: 5_000 });
    await expect(tenantsPanel.locator(".empty")).toBeVisible();
    await page.screenshot({ path: shot(`control-room-empty-${theme}.png`), fullPage: true });

    // Seed real state: one Acme call, twelve Globex calls (above the
    // default pressure threshold of 8 / 10s).
    const call = (tenantId: string) =>
      proxyCall(request, tenantId, {
        model: "demo",
        messages: [{ role: "user", content: `screenshot seed ${theme}` }],
      });
    await call("tenant_acme");
    for (let i = 0; i < 12; i += 1) await call("tenant_globex");

    // 2. Seeded state: both tenants visible, Globex pressure dot, no
    // constraint yet.
    await expect(page.locator(".tenant-row", { hasText: "tenant_acme" })).toBeVisible();
    await expect(page.locator(".tenant-row", { hasText: "tenant_globex" })).toBeVisible();
    await expect(
      page.locator(".tenant-row", { hasText: "tenant_globex" }).locator(".pressure-dot")
    ).toBeVisible();
    await page.screenshot({ path: shot(`control-room-pressure-${theme}.png`), fullPage: true });

    // 3. Operator opens Globex: detail + operator-actions panel appear.
    await page.locator(".tenant-row", { hasText: "tenant_globex" }).click();
    await expect(
      page.locator(".panel h2", { hasText: "Operator Actions - tenant_globex" })
    ).toBeVisible();
    await expect(page.locator(".kv dd", { hasText: "Request loop pressure" })).toBeVisible();
    await page.screenshot({ path: shot(`control-room-operator-actions-${theme}.png`), fullPage: true });

    // 4. Approval flow: token box visible with the exact phrase.
    await page
      .getByPlaceholder("e.g. Globex loop exceeded demo threshold")
      .fill(`screenshot: globex loop pressure ${theme}`);
    await page.getByRole("button", { name: "Request approval" }).click();
    await expect(page.locator(".approval-box code")).toHaveText("constrain tenant_globex");
    await page.screenshot({ path: shot(`control-room-approval-${theme}.png`), fullPage: true });

    // 5. Apply: Globex becomes constrained, Acme stays running, audit
    // timeline records the transition.
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
    await page.screenshot({ path: shot(`control-room-contained-${theme}.png`), fullPage: true });
  } finally {
    await context.close();
  }
}

test("captures the local evaluator Control Room storyboard in dark and light themes", async ({
  browser,
  request,
}) => {
  await captureStoryboard(browser, request, "dark");
  await captureStoryboard(browser, request, "light");
});
