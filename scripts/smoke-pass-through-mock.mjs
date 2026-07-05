// Ward pass-through smoke: real-upstream branch exercised with a local mock.
//
// Starts a minimal OpenAI-compatible mock server on port 4392,
// then spawns Ward pointing at it with WARD_UPSTREAM_OPENAI_BASE_URL
// and a fake OPENAI_API_KEY. Verifies the forwardToUpstream path
// is exercised (response carries the mock's model field, not ward-mock).
//
// No streaming. No paid provider calls. No complex simulator.
//
// Usage: npm run smoke:pass-through:mock
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const MOCK_PORT = 4392;
const WARD_PORT = 4391;
const MOCK_URL = `http://127.0.0.1:${MOCK_PORT}`;
const WARD_URL = `http://127.0.0.1:${WARD_PORT}`;
const apiDir = join(dirname(fileURLToPath(import.meta.url)), "..", "apps", "api");

const results = [];
function record(name, pass, detail = "") {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function req(method, path, { body, headers } = {}) {
  const response = await fetch(`${WARD_URL}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
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

// Minimal OpenAI-compatible mock server on MOCK_PORT
function startMockServer() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      if (req.method === "POST" && req.url === "/chat/completions") {
        let body = "";
        req.on("data", (chunk) => { body += chunk; });
        req.on("end", () => {
          const parsed = JSON.parse(body);
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify({
            id: "chatcmpl-mockupstream-test",
            object: "chat.completion",
            created: 1234567890,
            model: parsed.model ?? "mock-model",
            choices: [{
              index: 0,
              message: {
                role: "assistant",
                content: "Response from mock upstream server.",
              },
              finish_reason: "stop",
            }],
            usage: { prompt_tokens: 5, completion_tokens: 7, total_tokens: 12 },
          }));
        });
      } else {
        res.writeHead(404);
        res.end("not found");
      }
    });
    server.listen(MOCK_PORT, () => resolve(server));
  });
}

async function withWard(env, fn) {
  const child = spawn("npm", ["run", "start"], {
    cwd: apiDir,
    env: { ...process.env, PORT: String(WARD_PORT), ...env },
    stdio: "ignore",
    detached: true,
  });
  try {
    let up = false;
    for (let i = 0; i < 40; i += 1) {
      try {
        const h = await fetch(`${WARD_URL}/health`);
        if (h.ok) { up = true; break; }
      } catch { /* not up yet */ }
      await new Promise((r) => setTimeout(r, 500));
    }
    if (!up) throw new Error(`Ward did not start on :${WARD_PORT}`);
    await fn();
  } finally {
    try { process.kill(-child.pid, "SIGTERM"); } catch { /* gone */ }
    await new Promise((r) => setTimeout(r, 800));
  }
}

async function main() {
  // Start the mock server once
  const mockServer = await startMockServer();

  try {
    // Scenario 1: pass-through with WARD_MODE=observe (constrained tenant)
    await withWard(
      {
        WARD_UPSTREAM_OPENAI_BASE_URL: MOCK_URL,
        OPENAI_API_KEY: "fake-test-key",
        WARD_MODE: "observe",
      },
      async () => {
        await req("POST", "/ward/reset");
        await req("POST", "/ward/tenants/tenant_pt/constrain", {
          body: { actor: "smoke-pt", reason: "smoke test" },
        });

        // Constrained tenant in observe mode: should pass through to mock upstream
        const r = await req("POST", "/v1/chat/completions", {
          body: { model: "gpt-4o-mini", messages: [{ role: "user", content: "ping" }] },
          headers: { "x-ward-tenant-id": "tenant_pt" },
        });

        // Response should be from the mock upstream, not the ward mock
        record(
          "1: constrained tenant in observe mode gets 200 from mock upstream",
          r.status === 200,
          `got ${r.status}`
        );
        record(
          "1: response model is from mock upstream, not ward-mock",
          r.json?.model === "gpt-4o-mini",
          `got ${r.json?.model}`
        );
        record(
          "1: response carries mock upstream's choice content",
          r.json?.choices?.[0]?.message?.content === "Response from mock upstream server.",
          `got ${r.json?.choices?.[0]?.message?.content ?? "missing"}`
        );
        record(
          "1: x-ward-would-block header is set for constrained in observe mode",
          r.headers.get("x-ward-would-block") === "constrained",
          `got ${r.headers.get("x-ward-would-block")}`
        );

        // /health should confirm upstream pass-through mode
        const health = await req("GET", "/health");
        record(
          "1: /health reports upstreamMode=pass_through",
          health.json?.upstreamMode === "pass_through",
          `got ${health.json?.upstreamMode}`
        );
      }
    );

    // Scenario 2: pass-through with WARD_MODE=enforce (unconstrained tenant)
    await withWard(
      {
        WARD_UPSTREAM_OPENAI_BASE_URL: MOCK_URL,
        OPENAI_API_KEY: "fake-test-key",
      },
      async () => {
        await req("POST", "/ward/reset");
        // tenant_pt is already constrained from scenario 1 but in a fresh instance
        // Use a different tenant that is unconstrained
        const r = await req("POST", "/v1/chat/completions", {
          body: { model: "claude-3", messages: [{ role: "user", content: "ping" }] },
          headers: { "x-ward-tenant-id": "tenant_pt_ok" },
        });
        record(
          "2: unconstrained tenant gets 200 from mock upstream",
          r.status === 200,
          `got ${r.status}`
        );
        record(
          "2: response model matches request model (pass-through)",
          r.json?.model === "claude-3",
          `got ${r.json?.model}`
        );
        record(
          "2: no would-block header for unconstrained tenant",
          r.headers.get("x-ward-would-block") === null,
          `got ${r.headers.get("x-ward-would-block")}`
        );
      }
    );

    // Scenario 3: missing API key → mock still used (OPENAI_API_KEY must be set)
    await withWard(
      {
        WARD_UPSTREAM_OPENAI_BASE_URL: MOCK_URL,
        OPENAI_API_KEY: "",
      },
      async () => {
        const health = await req("GET", "/health");
        record(
          "3: empty API key means upstreamMode=mock_upstream (not pass_through)",
          health.json?.upstreamMode === "mock_upstream",
          `got ${health.json?.upstreamMode}`
        );
      }
    );

    const failed = results.filter((r) => !r.pass);
    console.log("");
    console.log(
      `Pass-through mock smoke: ${results.length - failed.length}/${results.length} checks passed.`
    );
    if (failed.length > 0) {
      console.log("Failed checks:");
      for (const f of failed) console.log(`  - ${f.name}${f.detail ? ` (${f.detail})` : ""}`);
      process.exit(1);
    }
  } finally {
    mockServer.close();
  }
}

main().catch((err) => {
  console.error("Pass-through mock smoke crashed:", err);
  process.exit(2);
});
