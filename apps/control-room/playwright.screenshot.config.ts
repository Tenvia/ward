import { defineConfig } from "@playwright/test";

// RC5 visual-proof capture config. Kept separate from the release
// verifier config so screenshot generation is explicit and does not
// become a default regression gate.
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/screenshot.spec.ts",
  timeout: 90_000,
  use: {
    baseURL: "http://localhost:5173",
    viewport: { width: 1280, height: 720 },
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
