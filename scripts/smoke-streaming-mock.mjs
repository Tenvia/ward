// Ward streaming smoke: deterministic mock SSE for /v1/chat/completions.
//
// Proves enforcement happens before SSE headers are sent: paused/constrained
// enforcement (and the missing tenant header check) all return JSON
// WardError, never SSE. Running tenants receive the deterministic mock
// stream. A request with `stream: true` plus upstream pass-through mode
// still receives the deterministic mock stream — upstream pass-through
// streaming is out of scope for this slice.
//
// Usage: npm run smoke:streaming:mock
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const PORT = 4393;
const API = `http://127.0.0.1:${PORT}`;
const apiDir = join(dirname(fileURLToPath(import.meta.url)), "..", "apps", "api");

const results = [];
function record(name, pass, detail = "") {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

function readSseChunks(raw) {
  return raw
    .split("\n\n")
    .filter((block) => block.startsWith("data:"))
    .map((block) => block.replace(/^data:\s*/, ""));
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
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { json = null; }
  return { status: response.status, json, text, headers: response.headers };
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
        if (h.ok) { up = true; break; }
      } catch { /* not up yet */ }
      await new Promise((r) => setTimeout(r, 500));
    }
    if (!up) throw new Error(`Ward did not start on :${PORT}`);
    await fn();
  } finally {
    try { process.kill(-child.pid, "SIGTERM"); } catch { /* gone */ }
    await new Promise((r) => setTimeout(r, 800));
  }
}

async function main() {
  // ── Scenario 1: running tenant gets deterministic mock SSE stream ────────
  await withApi({}, async () => {
    await req("POST", "/ward/reset");

    const r = await req("POST", "/v1/chat/completions", {
      body: { model: "x", messages: [{ role: "user", content: "hi" }], stream: true },
      headers: { "x-ward-tenant-id": "tenant_stream_ok" },
    });

    record("1: running tenant stream returns 200",
      r.status === 200, `got ${r.status}`);
    record("1: content-type is text/event-stream",
      (r.headers.get("content-type") ?? "").startsWith("text/event-stream"),
      `got ${r.headers.get("content-type")}`);

    const chunks = readSseChunks(r.text).map((s) => { try { return JSON.parse(s); } catch { return s; } });
    record("1: stream contains at least one chunk + [DONE]",
      chunks.length >= 2, `got ${chunks.length} block(s)`);

    const last = chunks[chunks.length - 1];
    record("1: stream terminates with [DONE]",
      last === "[DONE]" || last?.finish_reason === "stop",
      `last=${typeof last === "string" ? last : JSON.stringify(last)}`);

    const contentChunks = chunks
      .filter((c) => typeof c === "object" && c.choices?.[0]?.delta?.content)
      .map((c) => c.choices[0].delta.content);
    const rebuilt = contentChunks.join("");
    record("1: deterministic content concatenates to 'Ward deterministic mock stream.'",
      rebuilt === "Ward deterministic mock stream.",
      `rebuilt='${rebuilt}'`);
  });

  // ── Scenario 2: paused tenant in enforce mode returns 423 JSON, not SSE ──
  await withApi({}, async () => {
    await req("POST", "/ward/reset");
    await req("POST", "/ward/tenants/tenant_stream_paused/pause", {
      body: { actor: "smoke", reason: "smoke test" },
    });

    const r = await req("POST", "/v1/chat/completions", {
      body: { model: "x", messages: [], stream: true },
      headers: { "x-ward-tenant-id": "tenant_stream_paused" },
    });
    record("2: paused + stream + enforce → 423 JSON WardError",
      r.status === 423, `got ${r.status}`);
    record("2: error body is JSON (not SSE)",
      r.json?.error === "ward_tenant_paused",
      `error=${r.json?.error}`);
    record("2: response is NOT text/event-stream",
      !(r.headers.get("content-type") ?? "").startsWith("text/event-stream"),
      `content-type=${r.headers.get("content-type")}`);
  });

  // ── Scenario 3: constrained + stream in observe mode → 200 SSE + would-block ──
  await withApi({ WARD_MODE: "observe" }, async () => {
    await req("POST", "/ward/reset");
    await req("POST", "/ward/tenants/tenant_stream_obs/constrain", {
      body: { actor: "smoke", reason: "smoke test" },
    });

    const r = await req("POST", "/v1/chat/completions", {
      body: { model: "x", messages: [], stream: true },
      headers: { "x-ward-tenant-id": "tenant_stream_obs" },
    });
    record("3: constrained + stream + observe → 200",
      r.status === 200, `got ${r.status}`);
    record("3: response is text/event-stream",
      (r.headers.get("content-type") ?? "").startsWith("text/event-stream"),
      `content-type=${r.headers.get("content-type")}`);
    record("3: x-ward-would-block: constrained header set",
      r.headers.get("x-ward-would-block") === "constrained",
      `got ${r.headers.get("x-ward-would-block")}`);

    const chunks = readSseChunks(r.text);
    record("3: stream still delivers deterministic chunks",
      chunks.length >= 2, `got ${chunks.length} block(s)`);

    const audit = await req("GET", "/ward/audit");
    const ev = (audit.json?.audit ?? []).find(
      (e) => e.action === "would_block" && e.tenantId === "tenant_stream_obs"
    );
    record("3: audit has would_block event for constrained stream",
      Boolean(ev), `found=${Boolean(ev)}`);
  });

  // ── Scenario 4: missing tenant header returns 400 JSON, not SSE ──────────
  await withApi({}, async () => {
    const r = await req("POST", "/v1/chat/completions", {
      body: { model: "x", messages: [], stream: true },
    });
    record("4: missing tenant header + stream → 400 JSON WardError",
      r.status === 400, `got ${r.status}`);
    record("4: missing tenant header is JSON (not SSE)",
      r.json?.error === "ward_missing_tenant_header",
      `error=${r.json?.error}`);
    record("4: not text/event-stream",
      !(r.headers.get("content-type") ?? "").startsWith("text/event-stream"));
  });

  // ── Scenario 5: stream + upstream configured falls back to mock, doesn't hang ──
  await withApi(
    {
      WARD_UPSTREAM_OPENAI_BASE_URL: "http://127.0.0.1:1",
      OPENAI_API_KEY: "fake-key",
    },
    async () => {
      const health = await req("GET", "/health");
      record("5: upstreamMode=pass_through configured",
        health.json?.upstreamMode === "pass_through",
        `got ${health.json?.upstreamMode}`);

      // Raced with 6s timeout — if upstream pass-through were attempted,
      // the fetch to :1 would either deadlock or fail slowly. Mock stream
      // returns within ~50ms.
      const start = Date.now();
      const r = await Promise.race([
        req("POST", "/v1/chat/completions", {
          body: { model: "x", messages: [], stream: true },
          headers: { "x-ward-tenant-id": "tenant_stream_up" },
        }),
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 6000)),
      ]).catch((e) => ({
        status: -1,
        text: e.message,
        json: null,
        headers: { get: () => null },
      }));
      const elapsed = Date.now() - start;

      record("5: stream + upstream responds (no hang)",
        r.status === 200 && elapsed < 5000,
        `status=${r.status}, ${elapsed}ms`);
      record("5: stream + upstream returns text/event-stream",
        (r.headers.get("content-type") ?? "").startsWith("text/event-stream"),
        `content-type=${r.headers.get("content-type")}`);

      const chunks = readSseChunks(r.text ?? "");
      record("5: stream + upstream delivers deterministic content",
        chunks.filter((c) => c.includes("Ward ")).length > 0,
        `chunks=${chunks.length}`);
    }
  );

  const failed = results.filter((r) => !r.pass);
  console.log("");
  console.log(
    `Streaming mock smoke: ${results.length - failed.length}/${results.length} checks passed.`
  );
  if (failed.length > 0) {
    console.log("Failed checks:");
    for (const f of failed) console.log(`  - ${f.name}${f.detail ? ` (${f.detail})` : ""}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Streaming smoke crashed:", err);
  process.exit(2);
});
