// Control Room browser E2E: drives the real UI against the real Ward
// API through the full Acme/Globex containment story.
import { expect, test } from "@playwright/test";

const API = "http://localhost:4317";

test("operator contains Globex from the Control Room while Acme keeps running", async ({
  page,
  request,
}) => {
  // Seed real API state: reset, one Acme call, a Globex burst that
  // crosses the pressure threshold (default 8 requests / 10s).
  await request.post(`${API}/ward/reset`);
  const proxyCall = (tenantId: string) =>
    request.post(`${API}/v1/chat/completions`, {
      headers: { "x-ward-tenant-id": tenantId, "content-type": "application/json" },
      data: { model: "gpt-4o-mini", messages: [{ role: "user", content: "e2e" }] },
    });
  await proxyCall("tenant_acme");
  for (let i = 0; i < 12; i += 1) await proxyCall("tenant_globex");

  // 1-2. Control Room loads; both tenants appear.
  await page.goto("/");
  await expect(page.locator("h1")).toHaveText("WARD CONTROL ROOM");
  const acmeRow = page.locator(".tenant-row", { hasText: "tenant_acme" });
  const globexRow = page.locator(".tenant-row", { hasText: "tenant_globex" });
  await expect(acmeRow).toBeVisible();
  await expect(globexRow).toBeVisible();

  // 3-4. Inspect Globex; pressure is visible in detail + incidents.
  await globexRow.click();
  await expect(page.locator(".panel h2", { hasText: "Operator Actions - tenant_globex" }))
    .toBeVisible();
  await expect(page.locator(".kv dd", { hasText: "Request loop pressure" })).toBeVisible();
  await expect(
    page.locator(".panel", { hasText: "Incidents" }).locator(".audit-item", {
      hasText: "tenant_globex",
    })
  ).toBeVisible();

  // 5. Approval flow: request token, echo the exact phrase, apply.
  await page.getByPlaceholder("e.g. Globex loop exceeded demo threshold").fill(
    "e2e: globex loop pressure"
  );
  await page.getByRole("button", { name: "Request approval" }).click();
  const phraseBox = page.locator(".approval-box code");
  await expect(phraseBox).toHaveText("constrain tenant_globex");
  await page.getByPlaceholder("type the confirmation phrase").fill("constrain tenant_globex");
  await page.getByRole("button", { name: "Apply approved action" }).click();

  // 6. Globex becomes constrained (UI polls every 2s).
  await expect(globexRow.locator(".chip.constrained")).toBeVisible({ timeout: 10_000 });

  // 7. Acme remains running.
  await expect(acmeRow.locator(".chip.running")).toBeVisible();

  // 8. Audit timeline shows the constrain with the state transition.
  await expect(
    page
      .locator(".panel", { hasText: "Audit Timeline" })
      .locator(".audit-item", { hasText: "constrain (running -> constrained)" })
  ).toBeVisible({ timeout: 10_000 });

  // Enforcement really holds at the API: Globex 429, Acme 200.
  const blocked = await proxyCall("tenant_globex");
  expect(blocked.status()).toBe(429);
  const acmeOk = await proxyCall("tenant_acme");
  expect(acmeOk.status()).toBe(200);
});
