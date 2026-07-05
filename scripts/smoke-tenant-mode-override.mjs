// Ward per-tenant mode override smoke.
//
// Verifies that:
//   1. Global enforce + tenant override observe:
//      - constrained tenant gets 200 (would-block, not blocked)
//      - x-ward-would-block: constrained header present
//      - audit contains a would_block event for this tenant
//      - the would_block event's evidence carries override="observe"
//   2. Global observe + tenant override enforce:
//      - constrained tenant gets 429
//      - no x-ward-would-block header
//      - audit contains a mode_override_changed event for this tenant
//   3. Inherit behavior:
//      - global observe + inherit: would-block on constrained
//      - global enforce + inherit: hard 429 on constrained
//   4. Override changes are audited with action="mode_override_changed"
//      and previousOverride/nextOverride in evidence.
//   5. The mode override endpoint requires control auth.
//
// Usage: npm run smoke:tenant-mode-override

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const PORT = 4387;
const API = `http://127.0.0.1:${PORT}`;
const apiDir = join(dirname(fileURLToPath(import.meta.url)), "..", "apps", "api");

const results = [];
function record(name, pass, detail = "") {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

function killChild(child) {
  if (!child?.pid) return;
  try { process.kill(-child.pid, "SIGTERM"); } catch { /* gone */ }
  try { process.kill(child.pid, "SIGKILL"); } catch { /* gone */ }
}

// 1500ms grace — port release on a fresh Ward spawn under tsx can
// exceed the 800ms value used elsewhere.
async function settlePort() {
  await new Promise((r) => setTimeout(r, 1500));
}

async function waitForApi(maxSeconds = 60) {
  for (let i = 0; i < maxSeconds; i += 1) {
    try {
      const h = await fetch(`${API}/health`);
      if (h.ok) return true;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function bootWard(env, label) {
  const child = spawn("npm", ["run", "start"], {
    cwd: apiDir,
    env: { ...process.env, PORT: String(PORT), ...env },
    stdio: "ignore",
    detached: true,
  });
  const up = await waitForApi();
  if (!up) {
    killChild(child);
    throw new Error(`Ward ${label} did not come up on :${PORT} with env ${JSON.stringify(env)}`);
  }
  return child;
}

async function raw(method, path, { body, headers } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      ...(headers ?? {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { json = null; }
  return { status: response.status, headers: response.headers, json, text };
}

async function reset(auth) {
  return raw("POST", "/ward/reset", { headers: auth });
}

async function constrain(tenantId, headers) {
  return raw("POST", `/ward/tenants/${tenantId}/constrain`, {
    body: { actor: "smoke-tenant-mode-override", reason: "smoke setup" },
    headers,
  });
}

async function setMode(tenantId, mode, headers) {
  return raw("POST", `/ward/tenants/${tenantId}/mode`, {
    body: { mode, actor: "smoke-tenant-mode-override", reason: "smoke" },
    headers,
  });
}

async function proxyHeaders(tenantId) {
  const r = await fetch(`${API}/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-ward-tenant-id": tenantId },
    body: JSON.stringify({ model: "x", messages: [] }),
  });
  const status = r.status;
  const wb = r.headers.get("x-ward-would-block");
  await r.text();
  return { status, wb };
}

async function auditList() {
  const r = await raw("GET", "/ward/audit");
  return r.json?.audit ?? [];
}

const AUTH = { authorization: "Bearer tenant-mode-smoke-token" };

async function bootWithSettle(env, label) {
  await settlePort();
  return bootWard(env, label);
}

async function tearDown(child) {
  killChild(child);
  await settlePort();
}

async function scenario1_globalEnforce_tenantObserve() {
  const tenantA = "tenant_mode_smoke_a";
  const tenantB = "tenant_mode_smoke_b";

  let child = null;
  try {
    child = await bootWithSettle(
      {
        WARD_REQUIRE_CONTROL_TOKEN: "true",
        WARD_CONTROL_TOKEN: "tenant-mode-smoke-token",
        WARD_MODE: "enforce",
      },
      "scenario1 (global enforce)"
    );

    const resetR = await reset(AUTH);
    record("1: reset returns 200", resetR.status === 200, `got ${resetR.status}`);
    const cA = await constrain(tenantA, AUTH);
    record("1: constrain A returned 200", cA.status === 200, `got ${cA.status}`);

    {
      const r = await proxyHeaders(tenantA);
      record("1: A inherit under enforce -> 429", r.status === 429 && r.wb === null, `status=${r.status}, wb=${r.wb}`);
    }

    const mB = await setMode(tenantB, "observe", AUTH);
    record("1: set tenant B mode=observe returned 200", mB.status === 200, `got ${mB.status}`);
    const cB = await constrain(tenantB, AUTH);
    record("1: constrain B returned 200", cB.status === 200, `got ${cB.status}`);

    {
      const r = await proxyHeaders(tenantB);
      record("1: B observe override under global enforce -> 200", r.status === 200, `got ${r.status}`);
      record("1: B has x-ward-would-block: constrained", r.wb === "constrained", `got ${r.wb}`);
    }

    const audit = await auditList();
    const wouldBlocks = audit.filter((e) => e.action === "would_block" && e.tenantId === tenantB);
    record("1: audit contains would_block for B", wouldBlocks.length === 1, `found ${wouldBlocks.length}`);
    record(
      "1: would_block evidence carries override=observe",
      wouldBlocks[0]?.evidence?.override === "observe",
      `got ${wouldBlocks[0]?.evidence?.override}`
    );
  } finally {
    if (child) await tearDown(child);
  }
}

async function scenario2_globalObserve_tenantEnforce() {
  const tenantC = "tenant_mode_smoke_c";

  let child = null;
  try {
    child = await bootWithSettle(
      {
        WARD_REQUIRE_CONTROL_TOKEN: "true",
        WARD_CONTROL_TOKEN: "tenant-mode-smoke-token",
        WARD_MODE: "observe",
      },
      "scenario2 (global observe)"
    );

    const resetR = await reset(AUTH);
    record("2: reset returns 200", resetR.status === 200, `got ${resetR.status}`);
    const c = await constrain(tenantC, AUTH);
    record("2: constrain C returned 200", c.status === 200, `got ${c.status}`);
    const m = await setMode(tenantC, "enforce", AUTH);
    record("2: set tenant C mode=enforce returned 200", m.status === 200, `got ${m.status}`);

    const r = await proxyHeaders(tenantC);
    record("2: C enforce override under global observe -> 429", r.status === 429, `got ${r.status}`);
    record("2: C has no x-ward-would-block header", r.wb === null, `got ${r.wb}`);

    const audit = await auditList();
    const overrideEvents = audit.filter((e) => e.action === "mode_override_changed" && e.tenantId === tenantC);
    record("2: audit contains mode_override_changed for C", overrideEvents.length === 1, `found ${overrideEvents.length}`);
    record(
      "2: mode_override_changed evidence.previousOverride=inherit",
      overrideEvents[0]?.evidence?.previousOverride === "inherit",
      `got ${overrideEvents[0]?.evidence?.previousOverride}`
    );
    record(
      "2: mode_override_changed evidence.nextOverride=enforce",
      overrideEvents[0]?.evidence?.nextOverride === "enforce",
      `got ${overrideEvents[0]?.evidence?.nextOverride}`
    );
  } finally {
    if (child) await tearDown(child);
  }
}

async function scenario3a_inheritGlobalObserve() {
  const tenantD = "tenant_mode_smoke_d";
  let child = null;
  try {
    child = await bootWithSettle(
      {
        WARD_REQUIRE_CONTROL_TOKEN: "true",
        WARD_CONTROL_TOKEN: "tenant-mode-smoke-token",
        WARD_MODE: "observe",
      },
      "scenario3a (global observe, inherit)"
    );
    const resetR = await reset(AUTH);
    record("3a: reset returns 200", resetR.status === 200, `got ${resetR.status}`);
    const cD = await constrain(tenantD, AUTH);
    record("3a: constrain D returned 200", cD.status === 200, `got ${cD.status}`);
    const rD = await proxyHeaders(tenantD);
    record(
      "3a: D inherit under global observe -> 200 + would-block",
      rD.status === 200 && rD.wb === "constrained",
      `status=${rD.status}, wb=${rD.wb}`
    );
  } finally {
    if (child) await tearDown(child);
  }
}

async function scenario3b_inheritGlobalEnforce() {
  const tenantE = "tenant_mode_smoke_e";
  let child = null;
  try {
    child = await bootWithSettle(
      {
        WARD_REQUIRE_CONTROL_TOKEN: "true",
        WARD_CONTROL_TOKEN: "tenant-mode-smoke-token",
        WARD_MODE: "enforce",
      },
      "scenario3b (global enforce, inherit)"
    );
    const resetR = await reset(AUTH);
    record("3b: reset returns 200", resetR.status === 200, `got ${resetR.status}`);
    const cE = await constrain(tenantE, AUTH);
    record("3b: constrain E returned 200", cE.status === 200, `got ${cE.status}`);
    const rE = await proxyHeaders(tenantE);
    record(
      "3b: E inherit under global enforce -> 429",
      rE.status === 429 && rE.wb === null,
      `status=${rE.status}, wb=${rE.wb}`
    );
  } finally {
    if (child) await tearDown(child);
  }
}

async function scenario4_auditEvidence() {
  const tenantF = "tenant_mode_smoke_f";
  let child = null;
  try {
    child = await bootWithSettle(
      {
        WARD_REQUIRE_CONTROL_TOKEN: "true",
        WARD_CONTROL_TOKEN: "tenant-mode-smoke-token",
        WARD_MODE: "enforce",
      },
      "scenario4 (audit)"
    );
    const resetR = await reset(AUTH);
    record("4: reset returns 200", resetR.status === 200, `got ${resetR.status}`);
    const a = await setMode(tenantF, "observe", AUTH);
    record("4: set F observe returned 200", a.status === 200, `got ${a.status}`);
    const b = await setMode(tenantF, "enforce", AUTH);
    record("4: set F enforce returned 200", b.status === 200, `got ${b.status}`);
    const c = await setMode(tenantF, "inherit", AUTH);
    record("4: set F inherit returned 200", c.status === 200, `got ${c.status}`);

    const events = (await auditList()).filter((e) => e.action === "mode_override_changed" && e.tenantId === tenantF);
    record("4: three mode_override_changed events recorded for F", events.length === 3, `found ${events.length}`);
    record("4: first event previousOverride=inherit", events[0]?.evidence?.previousOverride === "inherit", `got ${events[0]?.evidence?.previousOverride}`);
    record("4: first event nextOverride=observe", events[0]?.evidence?.nextOverride === "observe", `got ${events[0]?.evidence?.nextOverride}`);
    record("4: second event previousOverride=observe", events[1]?.evidence?.previousOverride === "observe", `got ${events[1]?.evidence?.previousOverride}`);
    record("4: second event nextOverride=enforce", events[1]?.evidence?.nextOverride === "enforce", `got ${events[1]?.evidence?.nextOverride}`);
    record("4: third event previousOverride=enforce", events[2]?.evidence?.previousOverride === "enforce", `got ${events[2]?.evidence?.previousOverride}`);
    record("4: third event nextOverride=inherit", events[2]?.evidence?.nextOverride === "inherit", `got ${events[2]?.evidence?.nextOverride}`);
  } finally {
    if (child) await tearDown(child);
  }
}

async function scenario5_controlAuth() {
  const tenantG = "tenant_mode_smoke_g";
  let child = null;
  try {
    child = await bootWithSettle(
      {
        WARD_REQUIRE_CONTROL_TOKEN: "true",
        WARD_CONTROL_TOKEN: "tenant-mode-smoke-token",
        WARD_MODE: "enforce",
      },
      "scenario5 (control auth)"
    );
    const resetR = await reset(AUTH);
    record("5: reset returns 200", resetR.status === 200, `got ${resetR.status}`);

    const noAuth = await setMode(tenantG, "observe", {});
    record("5: set mode without control token returns 401", noAuth.status === 401, `got ${noAuth.status}`);

    const wrongAuth = await setMode(tenantG, "observe", { authorization: "Bearer wrong-token" });
    record("5: set mode with wrong token returns 401", wrongAuth.status === 401, `got ${wrongAuth.status}`);

    const badMode = await setMode(tenantG, "off", AUTH);
    record("5: set mode=off returns 400", badMode.status === 400, `got ${badMode.status}`);
  } finally {
    if (child) await tearDown(child);
  }
}

async function main() {
  await scenario1_globalEnforce_tenantObserve();
  await scenario2_globalObserve_tenantEnforce();
  await scenario3a_inheritGlobalObserve();
  await scenario3b_inheritGlobalEnforce();
  await scenario4_auditEvidence();
  await scenario5_controlAuth();

  const pass = results.filter((r) => r.pass).length;
  const fail = results.length - pass;
  console.log(`\nTenant mode override smoke: ${pass} passed, ${fail} failed.`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("smoke crashed:", err);
  process.exit(2);
});
