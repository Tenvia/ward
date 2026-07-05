// Environment-driven configuration with demo-safe defaults.
import type { DeploymentMode } from "./types.js";

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function envStorage(): "memory" | "sqlite" {
  return process.env.WARD_STORAGE === "sqlite" ? "sqlite" : "memory";
}

function envDeploymentMode(): DeploymentMode {
  const raw = process.env.WARD_DEPLOYMENT_MODE;
  if (raw === "docker" || raw === "kubernetes" || raw === "hosted") return raw;
  return "local";
}
function envWardMode(): import("./types.js").WardMode {
  const raw = process.env.WARD_MODE;
  if (raw === "observe") return "observe";
  return "enforce";
}

export const config = {
  port: envNumber("PORT", 4317),
  loopWindowMs: envNumber("WARD_LOOP_WINDOW_MS", 10_000),
  loopRequestThreshold: envNumber("WARD_LOOP_REQUEST_THRESHOLD", 8),
  estimatedCostPerRequest: envNumber("WARD_ESTIMATED_COST_PER_REQUEST", 0.002),
  approvalTtlMs: envNumber("WARD_APPROVAL_TTL_MS", 120_000),
  deploymentMode: envDeploymentMode(),
  storage: envStorage(),
  sqlitePath: process.env.WARD_SQLITE_PATH ?? ".ward/ward.db",
  // Proxy behavior when tenant policy lookup fails while Ward itself is
  // reachable: "open" (default) allows the request with a visible
  // warning; "closed" blocks it. Constrained/paused tenants are always
  // enforced when the lookup succeeds — fail mode never overrides a
  // successful policy read.
  proxyFailMode: (process.env.WARD_PROXY_FAIL_MODE === "closed" ? "closed" : "open") as
    | "open"
    | "closed",
  // Test-only: force the policy lookup to throw so fail modes can be
  // exercised locally. Never set this outside local/test runs.
  testForcePolicyError: process.env.WARD_TEST_FORCE_POLICY_ERROR === "true",
  // Minimal shared-token control auth (prototype, not production RBAC).
  controlToken: process.env.WARD_CONTROL_TOKEN ?? "",
  requireControlToken: process.env.WARD_REQUIRE_CONTROL_TOKEN === "true",
  enableDockerRunner: process.env.WARD_ENABLE_DOCKER_RUNNER === "true",
  dockerAllowedImages: (process.env.WARD_DOCKER_ALLOWED_IMAGES ?? "ward-example-agent")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  dockerRunTimeoutMs: envNumber("WARD_DOCKER_RUN_TIMEOUT_MS", 30_000),
  upstreamBaseUrl: process.env.WARD_UPSTREAM_OPENAI_BASE_URL,
  upstreamApiKey: process.env.OPENAI_API_KEY,
  wardMode: envWardMode(),
};
