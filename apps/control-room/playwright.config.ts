import { defineConfig } from "@playwright/test";

// Browser E2E for the Control Room against a real Ward API.
// Playwright starts both servers itself; no other setup needed.
export default defineConfig({
  testDir: "./tests",
  testIgnore: "**/demo-auth.spec.ts",
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
