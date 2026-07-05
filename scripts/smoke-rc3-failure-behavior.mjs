// Ward RC3 failure-behavior smoke.
//
// Covers the high-value trust/evidence boundaries defined by the
// Slice 6 directive:
//
//   1. Audit durability survives process restart.
//   2. Missing tenant header remains a JSON error.
//   3. Upstream failure surfaces upstream status + JSON body.
//   4. Observe mode does not hide upstream failure.
//   5. Enforce mode still blocks paused/constrained tenants
//      before any upstream call.
//   6. Approval token reuse fails (single-use enforcement).
//   7. Streaming blocked responses are JSON, not SSE.
//   8. Transition rejection envelope is exercised
//      (paused -> constrained returns 409 with documented body).
//   9. Incident receipt smoke still passes (delegated to
//      smoke-incident-receipt; we re-run it here in the same shell).
//
// Style mirrors the existing smoke batteries (bootWard + killChild +
// mkdtempSync cleanup). No production code is touched by this smoke.

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 4400;
const UPSTREAM_PORT = 4401;
const API = `http://127.0.0.1:${PORT}`;
const UPSTREAM_URL = `http://127.0.0.1:${UPSTREAM_PORT}`;
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

async function settlePort() {
  await new Promise((r) => setTimeout(r, 1500));
}

async function bootWard(env, label) {
  await settlePort();
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

// Reads the body exactly once.
async function readJsonOrText(response) {
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { json = null; }
  return { status: response.status, headers: response.headers, json, text };
}

async function proxyCall(tenantId, body = { model: "x", messages: [] }) {
  return readJsonOrText(
    await fetch(`${API}/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-ward-tenant-id": tenantId },
      body: JSON.stringify(body),
    })
  );
}

// Fake upstream that always 502s. Tracks every request hit so the smoke
// can assert no upstream hit on certain paths. Returns a hits array and
// a stop() function.
function startBrokenUpstream() {
  const hits = [];
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      hits.push({ method: req.method, url: req.url, body });
      res.writeHead(502, { "content-type": "application/json" });
      res.end(JSON.stringify({
        error: "fake_upstream_failure",
        message: "upstream intentionally broken for failure-behavior smoke",
      }));
    });
  });
  return new Promise((resolve) => {
    server.listen(UPSTREAM_PORT, "127.0.0.1", () => {
      resolve({
        hits,
        stop: () => new Promise((r) => server.close(() => r(undefined))),
      });
    });
  });
}

async function caseWithWard(env, label, body) {
  let child = null;
  try {
    child = await bootWard(env, label);
    await body();
  } finally {
    if (child) killChild(child);
  }
}

async function case1_auditDurability() {
  const tempDir = mkdtempSync(join(tmpdir(), "ward-rc3-durability-"));
  const sqlitePath = join(tempDir, "ward.db");
  process.on("exit", () => rmSync(tempDir, { recursive: true, force: true }));

  const auth = { authorization: "Bearer rc3-failure-token" };
  const baseEnv = {
    WARD_STORAGE: "sqlite",
    WARD_SQLITE_PATH: sqlitePath,
    WARD_REQUIRE_CONTROL_TOKEN: "true",
    WARD_CONTROL_TOKEN: "rc3-failure-token",
    WARD_MODE: "observe",
  };
  let childA = null;
  let childB = null;
  try {
    childA = await bootWard(baseEnv, "case1.A");
    const resetR = await raw("POST", "/ward/reset", { headers: auth });
    record("1.A: reset returns 200", resetR.status === 200, `got ${resetR.status}`);

    const c = await raw("POST", "/ward/tenants/tenant_rc3_durability/constrain", {
      body: { actor: "rc3-failure", reason: "case1 setup" },
      headers: auth,
    });
    record("1.A: constrain returned 200", c.status === 200, `got ${c.status}`);

    const proxy = await proxyCall("tenant_rc3_durability");
    record(
      "1.A: proxied call returns 200 in observe mode",
      proxy.status === 200,
      `got ${proxy.status}`
    );
    record(
      "1.A: would-block header set",
      proxy.headers.get("x-ward-would-block") === "constrained",
      `got ${proxy.headers.get("x-ward-would-block")}`
    );

    const auditA = await raw("GET", "/ward/audit");
    const eventsA = auditA.json?.audit ?? [];
    record(
      "1.A: audit has at least 2 events pre-restart",
      eventsA.length >= 2,
      `count=${eventsA.length}`
    );

    killChild(childA);
    childA = null;
    await settlePort();

    childB = await bootWard(baseEnv, "case1.B (restart)");
    const auditB = await raw("GET", "/ward/audit");
    const eventsB = auditB.json?.audit ?? [];
    record(
      "1.B: audit count matches pre-restart after process kill+restart",
      eventsB.length === eventsA.length,
      `before=${eventsA.length}, after=${eventsB.length}`
    );
    const persistedIds = eventsA.map((e) => e.id).sort();
    const afterIds = eventsB.map((e) => e.id).sort();
    record(
      "1.B: audit event IDs identical pre/post restart",
      JSON.stringify(persistedIds) === JSON.stringify(afterIds),
      "ids"
    );

    killChild(childB);
    childB = null;
  } finally {
    if (childA) killChild(childA);
    if (childB) killChild(childB);
    try { rmSync(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

async function case2_missingTenantHeader() {
  await caseWithWard(
    { WARD_MODE: "enforce" },
    "case2 (missing tenant)",
    async () => {
      const r = await readJsonOrText(
        await fetch(`${API}/v1/chat/completions`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ model: "x", messages: [] }),
        })
      );
      record(
        "2: missing tenant header returns 400",
        r.status === 400,
        `got ${r.status}`
      );
      const ct = r.headers.get("content-type") ?? "";
      record(
        "2: response is JSON, not SSE",
        ct.includes("application/json") && !ct.includes("event-stream"),
        ct
      );
      record(
        "2: body has ward_missing_tenant_header error code",
        r.json?.error === "ward_missing_tenant_header",
        r.json?.error ?? "(no JSON)"
      );
    }
  );
}

async function case3_upstreamFailure() {
  const upstream = await startBrokenUpstream();
  try {
    await caseWithWard(
      {
        WARD_MODE: "enforce",
        WARD_UPSTREAM_OPENAI_BASE_URL: UPSTREAM_URL,
        OPENAI_API_KEY: "fake",
      },
      "case3 (upstream 502 in enforce)",
      async () => {
        const r = await proxyCall("tenant_case3");
        record(
          "3: enforce-mode pass-through surfaces 502 from upstream",
          r.status === 502,
          `got ${r.status}`
        );
        const ct = r.headers.get("content-type") ?? "";
        record(
          "3: 502 response content-type is application/json",
          ct.includes("application/json"),
          ct
        );
        record(
          "3: 502 body is JSON (parsed without exception)",
          r.json !== null && typeof r.json === "object",
          r.json === null ? "(non-JSON)" : ""
        );
        record(
          "3: upstream received the proxy request exactly once",
          upstream.hits.length === 1,
          `hits=${upstream.hits.length}`
        );
      }
    );
  } finally {
    await upstream.stop();
  }
}

async function case4_observeHidesFailure() {
  const upstream = await startBrokenUpstream();
  try {
    await caseWithWard(
      {
        WARD_MODE: "observe",
        WARD_UPSTREAM_OPENAI_BASE_URL: UPSTREAM_URL,
        OPENAI_API_KEY: "fake",
      },
      "case4 (upstream 502 in observe)",
      async () => {
        const r = await proxyCall("tenant_case4");
        // CRITICAL: observe mode MUST NOT swap the 502 for a would-block.
        record(
          "4: observe-mode pass-through surfaces 502 (does not hide)",
          r.status === 502,
          `got ${r.status}`
        );
        record(
          "4: observe-mode 502 body remains JSON",
          r.json !== null && typeof r.json === "object",
          r.json === null ? "(non-JSON)" : ""
        );
        record(
          "4: no x-ward-would-block header in observe-mode 502",
          r.headers.get("x-ward-would-block") === null,
          r.headers.get("x-ward-would-block") ?? "(none)"
        );
        record(
          "4: upstream received the proxy request once",
          upstream.hits.length === 1,
          `hits=${upstream.hits.length}`
        );
      }
    );
  } finally {
    await upstream.stop();
  }
}

async function case5_enforceBlocksBeforeUpstream() {
  const upstream = await startBrokenUpstream();
  try {
    await caseWithWard(
      {
        WARD_MODE: "enforce",
        WARD_UPSTREAM_OPENAI_BASE_URL: UPSTREAM_URL,
        OPENAI_API_KEY: "fake",
        WARD_REQUIRE_CONTROL_TOKEN: "true",
        WARD_CONTROL_TOKEN: "rc3-failure-token",
      },
      "case5 (constrained in enforce + upstream wired)",
      async () => {
        const auth = { authorization: "Bearer rc3-failure-token" };
        await raw("POST", "/ward/reset", { headers: auth });
        const c = await raw("POST", "/ward/tenants/tenant_case5/constrain", {
          body: { actor: "rc3-failure", reason: "case5 setup" },
          headers: auth,
        });
        record("5.A: constrain returned 200", c.status === 200, `got ${c.status}`);

        const r = await proxyCall("tenant_case5");
        record(
          "5.B: enforce mode blocks paused/constrained BEFORE upstream",
          r.status === 429,
          `got ${r.status}`
        );
        record(
          "5.C: upstream received ZERO requests (enforce blocks pre-upstream)",
          upstream.hits.length === 0,
          `hits=${upstream.hits.length}`
        );
      }
    );
  } finally {
    await upstream.stop();
  }
}

async function case6_approvalReuse() {
  await caseWithWard(
    {
      WARD_MODE: "enforce",
      WARD_REQUIRE_CONTROL_TOKEN: "true",
      WARD_CONTROL_TOKEN: "rc3-failure-token",
    },
    "case6 (approval token reuse)",
    async () => {
      const auth = { authorization: "Bearer rc3-failure-token" };
      await raw("POST", "/ward/reset", { headers: auth });
      const tenantId = "tenant_case6";
      const approve = await raw("POST", `/ward/tenants/${tenantId}/approval`, {
        body: { action: "constrain", actor: "rc3-failure", reason: "case6 token request" },
        headers: auth,
      });
      record(
        "6.A: approval token issued",
        approve.status === 200 && typeof approve.json?.approvalToken === "string" &&
          typeof approve.json?.requiredPhrase === "string",
        `status=${approve.status}`
      );
      const token = approve.json?.approvalToken;
      const phrase = approve.json?.requiredPhrase;

      const applied = await raw("POST", `/ward/tenants/${tenantId}/apply-approved-action`, {
        body: { approvalToken: token, phrase },
        headers: auth,
      });
      record(
        "6.B: first apply succeeds",
        applied.status === 200 && applied.json?.tenant?.state === "constrained",
        `status=${applied.status}`
      );

      const reuse = await raw("POST", `/ward/tenants/${tenantId}/apply-approved-action`, {
        body: { approvalToken: token, phrase },
        headers: auth,
      });
      record(
        "6.C: second apply rejected (single-use)",
        reuse.status === 400,
        `got ${reuse.status}`
      );

      const wrongTenant = "tenant_case6_other";
      const wrongTenantApply = await raw("POST", `/ward/tenants/${wrongTenant}/apply-approved-action`, {
        body: { approvalToken: token, phrase },
        headers: auth,
      });
      record(
        "6.D: token rejected on a different tenant",
        wrongTenantApply.status === 400,
        `got ${wrongTenantApply.status}`
      );
    }
  );
}

async function case7_streamingBlockedIsJSON() {
  await caseWithWard(
    {
      WARD_MODE: "enforce",
      WARD_REQUIRE_CONTROL_TOKEN: "true",
      WARD_CONTROL_TOKEN: "rc3-failure-token",
    },
    "case7 (stream + constrained -> JSON)",
    async () => {
      const auth = { authorization: "Bearer rc3-failure-token" };
      await raw("POST", "/ward/reset", { headers: auth });
      const c = await raw("POST", "/ward/tenants/tenant_case7/constrain", {
        body: { actor: "rc3-failure", reason: "case7 setup" },
        headers: auth,
      });
      record("7.A: constrain returned 200", c.status === 200, `got ${c.status}`);

      const r = await readJsonOrText(
        await fetch(`${API}/v1/chat/completions`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-ward-tenant-id": "tenant_case7",
          },
          body: JSON.stringify({ model: "x", messages: [], stream: true }),
        })
      );
      const ct = r.headers.get("content-type") ?? "";
      record(
        "7.B: stream + constrained + enforce returns 429",
        r.status === 429,
        `got ${r.status}`
      );
      record(
        "7.C: content-type is application/json, not event-stream",
        ct.includes("application/json") && !ct.includes("event-stream"),
        ct
      );
      record(
        "7.D: 429 body is ward_tenant_constrained",
        r.json?.error === "ward_tenant_constrained",
        r.json?.error ?? "(no JSON)"
      );
    }
  );
}

async function case8_transitionRejectionEnvelope() {
  await caseWithWard(
    {
      WARD_MODE: "enforce",
      WARD_REQUIRE_CONTROL_TOKEN: "true",
      WARD_CONTROL_TOKEN: "rc3-failure-token",
    },
    "case8 (paused -> constrained = 409)",
    async () => {
      const auth = { authorization: "Bearer rc3-failure-token" };
      await raw("POST", "/ward/reset", { headers: auth });
      const tenantId = "tenant_case8";

      const pause = await raw("POST", `/ward/tenants/${tenantId}/pause`, {
        body: { actor: "rc3-failure", reason: "case8 setup" },
        headers: auth,
      });
      record("8.A: pause returns 200", pause.status === 200, `got ${pause.status}`);

      const reject = await raw("POST", `/ward/tenants/${tenantId}/constrain`, {
        body: { actor: "rc3-failure", reason: "should reject" },
        headers: auth,
      });
      record(
        "8.B: paused -> constrain returns 409",
        reject.status === 409,
        `got ${reject.status}`
      );
      record(
        "8.C: rejection envelope has error = ward_invalid_transition",
        reject.json?.error === "ward_invalid_transition",
        reject.json?.error ?? "(none)"
      );
      record(
        "8.D: envelope has rejection discriminator",
        typeof reject.json?.rejection === "string",
        JSON.stringify(reject.json?.rejection)
      );
      record(
        "8.E: envelope has from = paused",
        reject.json?.from === "paused",
        JSON.stringify(reject.json?.from)
      );
      record(
        "8.F: envelope has to = constrained",
        reject.json?.to === "constrained",
        JSON.stringify(reject.json?.to)
      );
      record(
        "8.G: envelope has a human-readable message",
        typeof reject.json?.message === "string" && reject.json.message.length > 0,
        reject.json?.message ?? ""
      );
    }
  );
}

async function case9_incidentReceiptStillPasses() {
  // Delegated: re-run the existing smoke from this shell so a
  // regression surfaces here. Capture its exit + stdout.
  const result = await new Promise((resolveP) => {
    const child = spawn("npm", ["run", "smoke:incident-receipt"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => { stdout += c.toString(); });
    child.stderr.on("data", (c) => { stderr += c.toString(); });
    child.on("close", (code) => resolveP({ code, stdout, stderr }));
  });
  record(
    "9: smoke:incident-receipt still passes",
    result.code === 0 && /20 passed/.test(result.stdout),
    `exit=${result.code}`
  );
}

async function main() {
  await case1_auditDurability();
  await case2_missingTenantHeader();
  await case3_upstreamFailure();
  await case4_observeHidesFailure();
  await case5_enforceBlocksBeforeUpstream();
  await case6_approvalReuse();
  await case7_streamingBlockedIsJSON();
  await case8_transitionRejectionEnvelope();
  await case9_incidentReceiptStillPasses();

  const pass = results.filter((r) => r.pass).length;
  const fail = results.length - pass;
  console.log(`\nRC3 failure-behavior smoke: ${pass} passed, ${fail} failed.`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("smoke crashed:", err);
  process.exit(2);
});
