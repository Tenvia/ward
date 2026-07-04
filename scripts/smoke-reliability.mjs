// Ward reliability/control-safety smoke test.
//
// Unlike smoke-demo.mjs, this script starts its own Ward API instances
// (on port 4390) with different env configurations, so nothing needs
// to be running first. Requires npm install to have been run in
// apps/api.
//
// Scenarios:
//   A. forced policy error + WARD_PROXY_FAIL_MODE=open  -> request allowed,
//      x-ward-fail-open header present
//   B. forced policy error + WARD_PROXY_FAIL_MODE=closed -> 503 blocked
//   C. normal mode -> constrained tenant still blocked (fail mode never
//      overrides a successful policy read), audit has proxy_fail_open
//      only in scenario A
//   D. control auth required -> mutations 401 without token / 200 with,
//      reads stay open
//
// Usage: npm run smoke:reliability
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const PORT = 4390;
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
  // Scenario A: forced policy error, fail mode open (default).
  await withApi({ WARD_TEST_FORCE_POLICY_ERROR: "true" }, async () => {
    const r = await proxyCall("tenant_acme");
    record("A: policy error + fail-open allows request", r.status === 200);
    record(
      "A: x-ward-fail-open header present",
      r.headers.get("x-ward-fail-open") === "true"
    );
    const audit = await req("GET", "/ward/audit");
    record(
      "A: audit has proxy_fail_open event",
      (audit.json?.audit ?? []).some((e) => e.action === "proxy_fail_open")
    );
  });

  // Scenario B: forced policy error, fail mode closed.
  await withApi(
    { WARD_TEST_FORCE_POLICY_ERROR: "true", WARD_PROXY_FAIL_MODE: "closed" },
    async () => {
      const r = await proxyCall("tenant_acme");
      record(
        "B: policy error + fail-closed blocks request (503)",
        r.status === 503 && r.json?.error === "ward_policy_unavailable"
      );
      record("B: no fail-open header when closed", r.headers.get("x-ward-fail-open") === null);
    }
  );

  // Scenario C: normal mode — successful policy read is always enforced.
  await withApi({}, async () => {
    const health = await req("GET", "/health");
    record(
      "C: health warns control auth disabled",
      String(health.json?.controlAuth ?? "").startsWith("DISABLED")
    );
    await req("POST", "/ward/tenants/tenant_globex/constrain", {
      body: { actor: "smoke-reliability", reason: "scenario C" },
    });
    const blocked = await proxyCall("tenant_globex");
    record(
      "C: constrained tenant still blocked when policy lookup succeeds",
      blocked.status === 429 && blocked.headers.get("x-ward-fail-open") === null
    );
    const ok = await proxyCall("tenant_acme");
    record("C: other tenant unaffected", ok.status === 200);
  });

  // Scenario D: control auth required.
  await withApi(
    { WARD_REQUIRE_CONTROL_TOKEN: "true", WARD_CONTROL_TOKEN: "smoke-token-123" },
    async () => {
      const noToken = await req("POST", "/ward/tenants/tenant_globex/constrain", {
        body: { actor: "x", reason: "no token" },
      });
      record(
        "D: mutation without token rejected (401)",
        noToken.status === 401 && noToken.json?.error === "ward_control_unauthorized"
      );
      const badToken = await req("POST", "/ward/tenants/tenant_globex/constrain", {
        body: { actor: "x", reason: "bad token" },
        headers: { authorization: "Bearer wrong" },
      });
      record("D: mutation with wrong token rejected (401)", badToken.status === 401);
      const withToken = await req("POST", "/ward/tenants/tenant_globex/constrain", {
        body: { actor: "smoke-reliability", reason: "with token" },
        headers: { authorization: "Bearer smoke-token-123" },
      });
      record(
        "D: mutation with correct token succeeds",
        withToken.status === 200 && withToken.json?.tenant?.state === "constrained"
      );
      const read = await req("GET", "/ward/tenants");
      record("D: read endpoint stays open", read.status === 200);
      const health = await req("GET", "/health");
      record(
        "D: health reports auth required",
        String(health.json?.controlAuth ?? "").startsWith("required")
      );
    }
  );

  const failed = results.filter((r) => !r.pass);
  console.log("");
  console.log(
    `Reliability smoke: ${results.length - failed.length}/${results.length} checks passed.`
  );
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Reliability smoke crashed:", err);
  process.exit(2);
});
