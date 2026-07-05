// Ward observe-only mode smoke test.
//
// Tests that in WARD_MODE=observe, a constrained or paused tenant
// receives a 200 with x-ward-would-block and a would_block audit
// event — instead of 423/429. Requests from unconstrained tenants
// are forwarded normally. Switching back to WARD_MODE=enforce restores
// normal blocking.
//
// Usage: npm run smoke:observe-only
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const PORT = 4391;
const API = `http://127.0.0.1:${PORT}`;
const apiDir = join(dirname(fileURLToPath(import.meta.url)), "..", "apps", "api");

const results = [];
function record(name, pass, detail = "") {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function req(method, path, { body, headers } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      ...(headers ?? {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  let json = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }
  return { status: response.status, json, headers: response.headers };
}

function proxyCall(tenantId) {
  return req("POST", "/v1/chat/completions", {
    body: { model: "x", messages: [] },
    headers: { "x-ward-tenant-id": tenantId },
  });
}

async function withApi(env, fn) {
  const child = spawn("npm", ["run", "start"], {
    cwd: apiDir,
    env: { ...process.env, PORT: String(PORT), ...env },
    stdio: "ignore",
    detached: true,
  });
  try {
    let up = false;
    for (let i = 0; i < 40; i += 1) {
      try {
        const h = await fetch(`${API}/health`);
        if (h.ok) {
          up = true;
          break;
        }
      } catch {
        // not up yet
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    if (!up) throw new Error(`API did not come up on :${PORT} with env ${JSON.stringify(env)}`);
    await fn();
  } finally {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      // already gone
    }
    await new Promise((r) => setTimeout(r, 800));
  }
}

async function main() {
  // Scenario 1: observe mode — constrained tenant returns 200 with would-block header
  await withApi({ WARD_MODE: "observe" }, async () => {
    // Reset and put a tenant into constrained state
    await req("POST", "/ward/reset");
    await req("POST", "/ward/tenants/tenant_smoke_constrained/constrain", {
      body: { actor: "smoke-observe-only", reason: "smoke: constrained in observe mode" },
    });

    const r = await proxyCall("tenant_smoke_constrained");
    record(
      "1: observe mode + constrained tenant → 200 (not 429)",
      r.status === 200,
      `got ${r.status}`
    );
    record(
      "1: x-ward-would-block: constrained header present",
      r.headers.get("x-ward-would-block") === "constrained",
      `got ${r.headers.get("x-ward-would-block")}`
    );

    // Audit has a would_block event for this tenant
    const audit = await req("GET", "/ward/audit");
    const wouldBlockEvents = (audit.json?.audit ?? []).filter(
      (e) => e.action === "would_block" && e.tenantId === "tenant_smoke_constrained"
    );
    record(
      "1: audit contains would_block event for constrained tenant",
      wouldBlockEvents.length > 0,
      `found ${wouldBlockEvents.length} event(s)`
    );
    record(
      "1: would_block event carries previousState=constrained",
      wouldBlockEvents.some((e) => e.previousState === "constrained"),
      wouldBlockEvents[0]?.previousState ?? "missing"
    );

    // Unconstrained tenant still works normally in observe mode
    const unconstrained = await proxyCall("tenant_smoke_ok");
    record(
      "1: unconstrained tenant still gets 200 in observe mode",
      unconstrained.status === 200,
      `got ${unconstrained.status}`
    );
    record(
      "1: unconstrained tenant has no would-block header",
      unconstrained.headers.get("x-ward-would-block") === null,
      `got ${unconstrained.headers.get("x-ward-would-block")}`
    );

    // /health reports observe mode
    const health = await req("GET", "/health");
    record(
      "1: /health reports wardMode=observe",
      health.json?.wardMode === "observe",
      `got ${health.json?.wardMode}`
    );
  });

  // Scenario 2: observe mode — paused tenant returns 200 with would-block header
  await withApi({ WARD_MODE: "observe" }, async () => {
    await req("POST", "/ward/reset");
    await req("POST", "/ward/tenants/tenant_smoke_paused/pause", {
      body: { actor: "smoke-observe-only", reason: "smoke: paused in observe mode" },
    });

    const r = await proxyCall("tenant_smoke_paused");
    record(
      "2: observe mode + paused tenant → 200 (not 423)",
      r.status === 200,
      `got ${r.status}`
    );
    record(
      "2: x-ward-would-block: paused header present",
      r.headers.get("x-ward-would-block") === "paused",
      `got ${r.headers.get("x-ward-would-block")}`
    );

    const audit = await req("GET", "/ward/audit");
    const wouldBlockEvents = (audit.json?.audit ?? []).filter(
      (e) => e.action === "would_block" && e.tenantId === "tenant_smoke_paused"
    );
    record(
      "2: audit contains would_block event for paused tenant",
      wouldBlockEvents.length > 0,
      `found ${wouldBlockEvents.length} event(s)`
    );
  });

  // Scenario 3: enforce mode (default) — constrained tenant is still blocked
  await withApi({}, async () => {
    await req("POST", "/ward/reset");
    await req("POST", "/ward/tenants/tenant_smoke_enforce/constrain", {
      body: { actor: "smoke-observe-only", reason: "smoke: constrained in enforce mode" },
    });

    const blocked = await proxyCall("tenant_smoke_enforce");
    record(
      "3: enforce mode + constrained tenant → 429",
      blocked.status === 429,
      `got ${blocked.status}`
    );
    record(
      "3: no would-block header in enforce mode",
      blocked.headers.get("x-ward-would-block") === null,
      `got ${blocked.headers.get("x-ward-would-block")}`
    );
    record(
      "3: /health reports wardMode=enforce",
      (await req("GET", "/health")).json?.wardMode === "enforce"
    );
  });

  const failed = results.filter((r) => !r.pass);
  console.log("");
  console.log(
    `Observe-only smoke: ${results.length - failed.length}/${results.length} checks passed.`
  );
  if (failed.length > 0) {
    console.log("Failed checks:");
    for (const f of failed) console.log(`  - ${f.name}${f.detail ? ` (${f.detail})` : ""}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Observe-only smoke crashed:", err);
  process.exit(2);
});
