// Ward SDK guard smoke test: cooperative containment + fail modes.
//
// Assumes the Ward API is running (default http://localhost:4317).
// Builds nothing; uses the SDK's compiled dist. Resets Ward state
// first and restores it at the end.
//
// Usage: npm run smoke:sdk
import { createWardClient } from "../packages/ward-sdk/dist/index.js";

const API = (process.env.WARD_API_URL ?? "http://localhost:4317").replace(/\/$/, "");
// A port nothing listens on, for the unreachable-Ward cases.
const DEAD = "http://127.0.0.1:49999";

const results = [];
function record(name, pass, detail = "") {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function api(method, path, body) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: body ? { "content-type": "application/json" } : {},
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return response;
}

async function main() {
  try {
    await api("GET", "/health");
  } catch {
    console.error(`Ward API is not reachable at ${API}. Start it first: cd apps/api && npm run dev`);
    process.exit(2);
  }
  await api("POST", "/ward/reset");

  const ward = createWardClient({ baseUrl: API });
  const deadWard = createWardClient({ baseUrl: DEAD });
  const run = () => "ran";

  // Seed: acme running (first proxy call), globex constrained, pausy paused.
  await fetch(`${API}/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-ward-tenant-id": "tenant_acme" },
    body: JSON.stringify({ model: "x", messages: [] }),
  });
  await api("POST", "/ward/tenants/tenant_globex/constrain", {
    actor: "smoke-sdk",
    reason: "sdk guard smoke",
  });
  await api("POST", "/ward/tenants/tenant_pausy/pause", {
    actor: "smoke-sdk",
    reason: "sdk guard smoke",
  });

  // 1. Running tenant runs the callback.
  const allowed = await ward.guard({ tenantId: "tenant_acme", operation: "op", run });
  record("running tenant runs callback",
    allowed.decision === "allowed" && allowed.ran === true && allowed.result === "ran");

  // 2. Constrained tenant does not run the callback.
  const constrained = await ward.guard({ tenantId: "tenant_globex", operation: "op", run });
  record("constrained tenant does not run callback",
    constrained.decision === "constrained" && constrained.ran === false &&
      constrained.result === undefined);

  // 3. Paused tenant does not run the callback.
  const paused = await ward.guard({ tenantId: "tenant_pausy", operation: "op", run });
  record("paused tenant does not run callback",
    paused.decision === "paused" && paused.ran === false);

  // 4. Ward unreachable + fail-open (default) runs the callback and says so.
  let failOpenHookFired = false;
  const failOpen = await deadWard.guard({
    tenantId: "tenant_acme",
    operation: "op",
    run,
    onFailOpen: () => {
      failOpenHookFired = true;
    },
  });
  record("unreachable + failMode=open runs callback (default)",
    failOpen.decision === "fail_open" && failOpen.ran === true && failOpen.result === "ran" &&
      typeof failOpen.error === "string");
  record("fail_open invokes onFailOpen hook", failOpenHookFired);

  // 5. Ward unreachable + fail-closed does not run the callback.
  const failClosed = await deadWard.guard({
    tenantId: "tenant_acme",
    operation: "op",
    run,
    failMode: "closed",
  });
  record("unreachable + failMode=closed does not run callback",
    failClosed.decision === "fail_closed" && failClosed.ran === false &&
      failClosed.result === undefined);

  // Cleanup.
  await api("POST", "/ward/reset");

  const failed = results.filter((r) => !r.pass);
  console.log("");
  console.log(`SDK guard smoke: ${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error("SDK guard smoke crashed:", err);
  process.exit(2);
});
