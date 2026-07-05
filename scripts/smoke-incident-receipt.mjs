// Ward incident receipt smoke.
//
// End-to-end scenario:
//   1. Start Ward with local SQLite storage.
//   2. Create an incident scenario with:
//        - one direct state transition (running -> constrained)
//        - one would-block event (constrained + observe mode)
//        - two mode override events (inherit->enforce and back)
//   3. Export a markdown receipt via scripts/export-incident-receipt.mjs
//      pointed at the SQLite file.
//   4. Verify the receipt contains the required headings and fields.
//   5. Clean up the temp directory and the spawned process.

import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 4396;
const API = `http://127.0.0.1:${PORT}`;
const TENANT = "tenant_incident_receipt_smoke";
const apiDir = join(dirname(fileURLToPath(import.meta.url)), "..", "apps", "api");
const scriptDir = dirname(fileURLToPath(import.meta.url));

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

async function bootWard(env, label) {
  await new Promise((r) => setTimeout(r, 1500));
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
  return { status: response.status, json, text };
}

async function main() {
  const tempDir = mkdtempSync(join(tmpdir(), "ward-incident-receipt-"));
  const sqlitePath = join(tempDir, "ward.db");
  const outPath = join(tempDir, "receipt.md");

  process.on("exit", () => {
    try { rmSync(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  const auth = { authorization: "Bearer incident-receipt-smoke-token" };
  let child = null;
  try {
    child = await bootWard(
      {
        WARD_STORAGE: "sqlite",
        WARD_SQLITE_PATH: sqlitePath,
        WARD_MODE: "observe",
        WARD_REQUIRE_CONTROL_TOKEN: "true",
        WARD_CONTROL_TOKEN: "incident-receipt-smoke-token",
      },
      "sqlite+observe"
    );

    const resetR = await raw("POST", "/ward/reset", { headers: auth });
    record("reset returns 200", resetR.status === 200, `got ${resetR.status}`);

    const c = await raw("POST", `/ward/tenants/${TENANT}/constrain`, {
      body: { actor: "incident-receipt-smoke", reason: "scenario setup" },
      headers: auth,
    });
    record("constrain returned 200", c.status === 200, `got ${c.status}`);

    const m1 = await raw("POST", `/ward/tenants/${TENANT}/mode`, {
      body: { mode: "enforce", actor: "incident-receipt-smoke", reason: "force enforce" },
      headers: auth,
    });
    record("mode override (inherit -> enforce) returned 200", m1.status === 200, `got ${m1.status}`);

    const m2 = await raw("POST", `/ward/tenants/${TENANT}/mode`, {
      body: { mode: "inherit", actor: "incident-receipt-smoke", reason: "restore inherit" },
      headers: auth,
    });
    record("mode override (enforce -> inherit) returned 200", m2.status === 200, `got ${m2.status}`);

    const proxy = await fetch(`${API}/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-ward-tenant-id": TENANT },
      body: JSON.stringify({ model: "x", messages: [] }),
    });
    record("proxied call returns 200 in observe mode", proxy.status === 200, `got ${proxy.status}`);
    record(
      "x-ward-would-block header is 'constrained'",
      proxy.headers.get("x-ward-would-block") === "constrained",
      `got ${proxy.headers.get("x-ward-would-block")}`
    );
    await proxy.text();

    // SQLite WAL writes are async; let the audit row flush.
    await new Promise((r) => setTimeout(r, 750));

    const exportResult = await runExport({
      tenantId: TENANT,
      dbPath: sqlitePath,
      outPath,
    });
    record("export script exited 0", exportResult.code === 0, `exit=${exportResult.code}`);
    record("export stderr contains no error", !/failed/i.test(exportResult.stderr), exportResult.stderr);

    const fs = await import("node:fs/promises");
    const receipt = await fs.readFile(outPath, "utf8");
    record("receipt file non-empty", receipt.length > 0, `len=${receipt.length}`);

    // Required-content assertions. The Markdown bolds the "Audit event
    // count:" label so the regex tolerates the surrounding ** **.
    record("receipt contains tenant ID", receipt.includes(TENANT), TENANT);
    record(
      "receipt contains audit event count",
      /\*\*Audit event count:\*\*\s*\d+/.test(receipt),
      "regex"
    );
    record("receipt contains event IDs block", /## Relevant event IDs/.test(receipt), "## Relevant event IDs");
    record("receipt contains state transitions section", /## State transitions/.test(receipt), "## State transitions");
    record("receipt contains blocks/would-block section", /## Blocks and would-blocks/.test(receipt), "## Blocks and would-blocks");
    record("receipt contains limitations section", /## Limitations/.test(receipt), "## Limitations");
    record(
      "receipt limitations call out 'operational evidence'",
      /operational evidence/i.test(receipt),
      "phrase"
    );
    record(
      "receipt contains tenant state change detail",
      receipt.includes("running → constrained"),
      "transition row"
    );
    record(
      "receipt would-block row references effectiveMode",
      /effectiveMode/.test(receipt),
      "phrase"
    );

    // Honesty: the receipt explicitly disclaims compliance / forensic
    // reads. The receipt names them *to* disclaim them; the smoke
    // checks that "NOT compliance" and "NOT tamper-proof forensic"
    // appear, which is the load-bearing claim.
    record(
      "receipt disclaims compliance certification",
      /\bNOT\b[^.\n]*\bcompliance\b/i.test(receipt),
      "regex"
    );
    record(
      "receipt disclaims tamper-proof / forensic framing",
      /\bNOT\b[^.\n]*\b(forensic|tamper-proof)\b/i.test(receipt),
      "regex"
    );

    if (results.some((r) => !r.pass)) {
      const fs2 = await import("node:fs/promises");
      await fs2.writeFile("/tmp/receipt-failure.md", receipt, "utf8");
    }

    killChild(child);
    child = null;
    await new Promise((r) => setTimeout(r, 1500));
  } finally {
    if (child) killChild(child);
    try { rmSync(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }

  const pass = results.filter((r) => r.pass).length;
  const fail = results.length - pass;
  console.log(`\nIncident receipt smoke: ${pass} passed, ${fail} failed.`);
  process.exit(fail === 0 ? 0 : 1);
}

function runExport({ tenantId, dbPath, outPath }) {
  return new Promise((resolveP) => {
    const child = spawn(
      "node",
      [
        join(scriptDir, "export-incident-receipt.mjs"),
        "--tenant", tenantId,
        "--db", dbPath,
        "--out", outPath,
      ],
      { stdio: ["ignore", "pipe", "pipe"] }
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("close", (code) => resolveP({ code, stdout, stderr }));
  });
}

main().catch((err) => {
  console.error("smoke crashed:", err);
  process.exit(2);
});
