import { defineConfig } from "@playwright/test";

// Browser E2E for the Control Room against a real Ward API.
// Playwright starts both servers itself; no other setup needed.
export default defineConfig({
  testDir: "./tests",
  // The screenshot spec is an RC5 visual-proof capture, not a gated
  // regression. It depends on a clean Ward API state and is meant to
  // be re-run on demand via
  //   npx playwright test -g "captures the local evaluator"
  // not on every verifier pass. See docs/RC5_VISUAL_PROOF.md.
  testIgnore: ["**/demo-auth.spec.ts", "**/screenshot.spec.ts"],
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:5173",
  },
  webServer: [
    {
      command: "npm run start",
      cwd: "../api",
      url: "http://localhost:4317/health",
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: "npm run dev",
      url: "http://localhost:5173",
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});
