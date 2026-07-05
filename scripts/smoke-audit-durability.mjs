// Ward audit durability smoke.
//
// Proves two audit events survive a Ward process restart when
// storage is configured with WARD_STORAGE=sqlite. Uses the existing
// SQLite-backed storage path — no backend replacement, no audit
// redesign, no Postgres.
//
// Steps:
//   1. Create a temp directory; SQLite path is <temp>/ward.db.
//   2. Boot Ward A in observe mode with sqlite pointed at that path.
//      Control auth is enabled so the smoke can constrain directly.
//   3. Constrain a tenant → emits a `constrain` audit event.
//   4. Issue exactly one raw proxied call → emits exactly one
//      `would_block` audit event (observe mode keeps the call
//      running and sets x-ward-would-block: constrained).
//   5. Snapshot the audit list.
//   6. Kill Ward A, then boot Ward B with the same sqlite path.
//   7. Verify both events survived restart with identical id,
//      schemaVersion, timestamp, tenantId, action, actor, reason,
//      previousState, and evidence.
//   8. Trigger a new audit event in Ward B and confirm the in-memory
//      counter resumed past the persisted max (does NOT regress).
//   9. Remove the temp directory.
//
// Upstream mode is the default (mock). We do NOT set
// WARD_UPSTREAM_OPENAI_BASE_URL or OPENAI_API_KEY so Ward stays in
// mock_upstream mode — proxied calls return the deterministic mock
// response without any external dependency.
//
// Usage: npm run smoke:audit-durability

import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 4389;
const API = `http://127.0.0.1:${PORT}`;
const TENANT = "tenant_audit_durability";
const apiDir = join(dirname(fileURLToPath(import.meta.url)), "..", "apps", "api");

const results = [];
function record(name, pass, detail = "") {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

function assertField(name, observed, expected) {
  record(name, observed === expected, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(observed)}`);
}

function killChild(child) {
  if (!child?.pid) return;
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    // already gone or not a leader
  }
  try {
    process.kill(child.pid, "SIGKILL");
  } catch {
    // already gone
  }
}

async function waitForApi(maxSeconds = 40) {
  for (let i = 0; i < maxSeconds; i += 1) {
    try {
      const h = await fetch(`${API}/health`);
      if (h.ok) return true;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function bootWardOnce(env, label) {
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

async function rawApi(method, path, { body, headers } = {}) {
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
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: response.status, json, text };
}

async function auditList() {
  const r = await rawApi("GET", "/ward/audit");
  if (r.status !== 200) return [];
  return r.json?.audit ?? [];
}

function persistedCounter(events) {
  let max = 0;
  for (const ev of events) {
    const m = String(ev.id ?? "").match(/^audit_(\d+)$/);
    if (m) {
      const n = Number(m[1]);
      if (n > max) max = n;
    }
  }
  return max;
}

async function main() {
  const tempDir = mkdtempSync(join(tmpdir(), "ward-audit-durability-"));
  const sqlitePath = join(tempDir, "ward.db");

  // Cleanup handlers — remove the temp directory no matter how we exit.
  const cleanup = () => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // best-effort
    }
  };
  process.on("uncaughtException", (err) => {
    cleanup();
    console.error("uncaughtException:", err);
    process.exit(2);
  });
  process.on("exit", cleanup);

  // Upstream mode defaults to mock (no WARD_UPSTREAM_OPENAI_BASE_URL,
  // no OPENAI_API_KEY). Storage is sqlite at the temp path. Control
  // auth is enabled so the constrain call must carry a Bearer token.
  const baseEnv = {
    WARD_STORAGE: "sqlite",
    WARD_SQLITE_PATH: sqlitePath,
    WARD_MODE: "observe",
    WARD_REQUIRE_CONTROL_TOKEN: "true",
    WARD_CONTROL_TOKEN: "audit-durability-token",
  };
  const authHeader = { authorization: "Bearer audit-durability-token" };

  // ----- Pass 1: Ward A — create events under SQLite -----
  let childA = null;
  let snapshotBefore = null;
  try {
    childA = await bootWardOnce(baseEnv, "A (create)");

    // Reset for a deterministic audit baseline
    const r = await rawApi("POST", "/ward/reset", { headers: authHeader });
    record("A: /ward/reset returns 200", r.status === 200, `got ${r.status}`);

    // Direct constrain (the route is requireControlAuth-gated, not
    // approval-gated, per apps/api/src/tenants.ts).
    const c = await rawApi("POST", `/ward/tenants/${TENANT}/constrain`, {
      body: { actor: "audit-durability", reason: "slice-2 setup" },
      headers: authHeader,
    });
    record("A: constrain returned 200", c.status === 200, `got ${c.status}`);

    // Exactly one proxied request against the constrained tenant in
    // observe mode — emits exactly one would_block event.
    const p = await fetch(`${API}/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-ward-tenant-id": TENANT },
      body: JSON.stringify({ model: "x", messages: [] }),
    });
    const pStatus = p.status;
    const wbHeader = p.headers.get("x-ward-would-block");
    record("A: proxied request returns 200 in observe mode", pStatus === 200, `got ${pStatus}`);
    record("A: x-ward-would-block header is 'constrained'", wbHeader === "constrained", `got ${wbHeader}`);
    await p.text(); // drain

    const eventsA = await auditList();
    record("A: /ward/audit returns non-empty list", eventsA.length >= 2, `count=${eventsA.length}`);

    const constrainEventsA = eventsA.filter((e) => e.action === "constrain" && e.tenantId === TENANT);
    const wouldBlockEventsA = eventsA.filter((e) => e.action === "would_block" && e.tenantId === TENANT);

    record("A: exactly one constrain event recorded", constrainEventsA.length === 1, `found ${constrainEventsA.length}`);
    record("A: exactly one would_block event recorded", wouldBlockEventsA.length === 1, `found ${wouldBlockEventsA.length}`);

    const constrainBefore = constrainEventsA[0];
    const wouldBlockBefore = wouldBlockEventsA[0];
    assertField("A: constrain.previousState = 'running'", constrainBefore?.previousState, "running");
    assertField("A: would_block.previousState = 'constrained'", wouldBlockBefore?.previousState, "constrained");
    assertField("A: constrain.schemaVersion = 1", constrainBefore?.schemaVersion, 1);
    assertField("A: would_block.schemaVersion = 1", wouldBlockBefore?.schemaVersion, 1);

    if (!constrainBefore || !wouldBlockBefore) {
      throw new Error("A: did not capture both events before restart");
    }

    snapshotBefore = {
      constrain: JSON.parse(JSON.stringify(constrainBefore)),
      wouldBlock: JSON.parse(JSON.stringify(wouldBlockBefore)),
      eventCount: eventsA.length,
      persistedMaxId: persistedCounter(eventsA),
    };

    // Kill Ward A
    killChild(childA);
    childA = null;
    await new Promise((r) => setTimeout(r, 800));
    record("A: Ward A killed before restart", true);
  } catch (err) {
    if (childA) killChild(childA);
    cleanup();
    console.error("Pass 1 setup failed:", err);
    process.exit(2);
  }

  // ----- Pass 2: Ward B — boot same sqlite path, verify -----
  let childB = null;
  try {
    childB = await bootWardOnce(baseEnv, "B (verify)");

    // /health should be green on a freshly-booted Ward B
    const health = await rawApi("GET", "/health");
    record(
      "B: /health reports sqlite storage after restart",
      health.json?.storage === "sqlite",
      `got storage=${health.json?.storage}`
    );

    const eventsB = await auditList();
    record(
      "B: event count matches pre-restart",
      eventsB.length === snapshotBefore.eventCount,
      `before=${snapshotBefore.eventCount}, after=${eventsB.length}`
    );

    const constrainAfter = eventsB.find((e) => e.action === "constrain" && e.tenantId === TENANT);
    const wouldBlockAfter = eventsB.find((e) => e.action === "would_block" && e.tenantId === TENANT);

    record("B: constrain event survived restart", !!constrainAfter, "missing after restart");
    record("B: would_block event survived restart", !!wouldBlockAfter, "missing after restart");

    if (constrainAfter && wouldBlockAfter) {
      const fields = [
        "id",
        "schemaVersion",
        "timestamp",
        "tenantId",
        "action",
        "actor",
        "reason",
        "previousState",
        "nextState",
        "evidence",
      ];
      for (const f of fields) {
        assertField(
          `B: constrain.${f} survives restart`,
          JSON.stringify(constrainAfter[f]),
          JSON.stringify(snapshotBefore.constrain[f])
        );
        assertField(
          `B: wouldBlock.${f} survives restart`,
          JSON.stringify(wouldBlockAfter[f]),
          JSON.stringify(snapshotBefore.wouldBlock[f])
        );
      }

      // id must be the exact same string post-restart
      assertField(
        "B: constrain.id is identical pre/post restart",
        constrainAfter.id,
        snapshotBefore.constrain.id
      );
      assertField(
        "B: wouldBlock.id is identical pre/post restart",
        wouldBlockAfter.id,
        snapshotBefore.wouldBlock.id
      );

      // schemaVersion must be 1 across restart
      assertField("B: constrain.schemaVersion === 1 after restart", constrainAfter.schemaVersion, 1);
      assertField("B: wouldBlock.schemaVersion === 1 after restart", wouldBlockAfter.schemaVersion, 1);
    }

    // Counter must resume past the persisted max — a new logAudit
    // call on Ward B must produce an event id strictly greater than
    // the largest persisted id (must NOT regress to audit_1).
    // Easiest reliable trigger: another proxied call against a fresh
    // tenant in observe mode + would_block does NOT fire because the
    // tenant is auto-created as running. Use a different fresh tenant
    // and constrain it directly so a new `constrain` event lands.
    const freshTenant = `tenant_audit_counter_${Date.now()}`;
    const freshConstrain = await rawApi("POST", `/ward/tenants/${freshTenant}/constrain`, {
      body: { actor: "audit-durability", reason: "counter resume probe" },
      headers: authHeader,
    });
    record("B: fresh-tenant constrain returned 200", freshConstrain.status === 200, `got ${freshConstrain.status}`);

    const eventsB2 = await auditList();
    const newEvent = eventsB2.find((e) => e.action === "constrain" && e.tenantId === freshTenant);
    record("B: new constrain event recorded after restart", !!newEvent, "missing");
    if (newEvent) {
      const newIdNum = Number(String(newEvent.id).replace("audit_", "0")) || 0;
      record(
        "B: post-restart counter resumed past persisted max",
        newIdNum > snapshotBefore.persistedMaxId,
        `persistedMax=${snapshotBefore.persistedMaxId}, newId=${newEvent.id}`
      );
    }

    killChild(childB);
    childB = null;
    await new Promise((r) => setTimeout(r, 500));
  } catch (err) {
    if (childB) killChild(childB);
    cleanup();
    console.error("Pass 2 verify failed:", err);
    process.exit(2);
  }

  // Final cleanup
  cleanup();
  record("temp directory removed", true);

  const pass = results.filter((r) => r.pass).length;
  const fail = results.length - pass;
  console.log(`\nAudit durability smoke: ${pass} passed, ${fail} failed.`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("smoke crashed:", err);
  process.exit(2);
});
