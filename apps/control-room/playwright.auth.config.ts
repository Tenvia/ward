import { defineConfig } from "@playwright/test";

// Auth-mode E2E: the API requires the shared control token and the
// Control Room build carries it via VITE_WARD_CONTROL_TOKEN.
// reuseExistingServer is false so this never reuses a no-auth API.
const CONTROL_TOKEN = "e2e-auth-token";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/demo-auth.spec.ts",
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:5173",
  },
  webServer: [
    {
      command: "npm run start",
      cwd: "../api",
      url: "http://localhost:4317/health",
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        WARD_REQUIRE_CONTROL_TOKEN: "true",
        WARD_CONTROL_TOKEN: CONTROL_TOKEN,
      },
    },
    {
      command: "npm run dev",
      url: "http://localhost:5173",
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        VITE_WARD_CONTROL_TOKEN: CONTROL_TOKEN,
      },
    },
  ],
});
