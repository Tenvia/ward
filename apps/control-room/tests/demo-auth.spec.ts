// Control Room E2E with shared-token control auth enabled on the API.
// Proves the operator can complete the approval/constrain flow through
// the browser while unauthenticated mutations are rejected.
import { expect, test } from "@playwright/test";

const API = "http://localhost:4317";
const TOKEN = "e2e-auth-token";

test("operator completes the approval flow in the browser with control auth on", async ({
  page,
  request,
}) => {
  // Auth really is on: mutation without a token is rejected.
  const unauthorized = await request.post(`${API}/ward/tenants/tenant_globex/constrain`, {
    headers: { "content-type": "application/json" },
    data: { actor: "e2e", reason: "no token" },
  });
  expect(unauthorized.status()).toBe(401);

  // Seed state (reset needs the token; proxy calls never do).
  await request.post(`${API}/ward/reset`, {
    headers: { authorization: `Bearer ${TOKEN}` },
  });
  const proxyCall = (tenantId: string) =>
    request.post(`${API}/v1/chat/completions`, {
      headers: { "x-ward-tenant-id": tenantId, "content-type": "application/json" },
      data: { model: "demo", messages: [{ role: "user", content: "e2e-auth" }] },
    });
  await proxyCall("tenant_acme");
  for (let i = 0; i < 12; i += 1) await proxyCall("tenant_globex");

  // UI loads with the configured token and reports auth required.
  await page.goto("/");
  await expect(page.locator("h1")).toHaveText("WARD CONTROL ROOM");
  const globexRow = page.locator(".tenant-row", { hasText: "tenant_globex" });
  await expect(globexRow).toBeVisible();
  await globexRow.click();

  // Approval flow through the browser: these are protected mutations,
  // authorized by the token the UI sends.
  await page.getByPlaceholder("e.g. Globex loop exceeded demo threshold").fill(
    "e2e-auth: contain globex"
  );
  await page.getByRole("button", { name: "Request approval" }).click();
  await expect(page.locator(".approval-box code")).toHaveText("constrain tenant_globex");
  await page.getByPlaceholder("type the confirmation phrase").fill("constrain tenant_globex");
  await page.getByRole("button", { name: "Apply approved action" }).click();

  // Protected mutation succeeded: Globex is constrained, Acme running.
  await expect(globexRow.locator(".chip.constrained")).toBeVisible({ timeout: 10_000 });
  await expect(
    page.locator(".tenant-row", { hasText: "tenant_acme" }).locator(".chip.running")
  ).toBeVisible();

  // Audit timeline updated through the UI.
  await expect(
    page
      .locator(".panel", { hasText: "Audit Timeline" })
      .locator(".audit-item", { hasText: "constrain (running -> constrained)" })
  ).toBeVisible({ timeout: 10_000 });

  // Enforcement holds at the API.
  const blocked = await proxyCall("tenant_globex");
  expect(blocked.status()).toBe(429);
});
