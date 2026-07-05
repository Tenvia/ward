// Ward local latency benchmark.
//
// Measures proxy overhead for three scenarios on the local/dev path:
//
//   1. mock_chat_completion    Ward mock (no upstream)
//   2. mock_pass_through       Local mock OpenAI-compatible upstream
//   3. observe_constrained_would_block
//                              WARD_MODE=observe + constrained tenant
//
// Each scenario runs N requests (default 50, override via
// WARD_BENCH_REQUESTS) against a freshly-spawned Ward process and
// reports p50/p95/min/max. Local/dev only — does NOT claim a
// production SLA.
//
// Usage: npm run bench:latency
//        WARD_BENCH_REQUESTS=200 npm run bench:latency
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const N = Number(process.env.WARD_BENCH_REQUESTS ?? 50);
const WARD_PORT = 4394;
const MOCK_PORT = 4395;
const WARD_URL = `http://127.0.0.1:${WARD_PORT}`;
const MOCK_URL = `http://127.0.0.1:${MOCK_PORT}`;
const apiDir = join(dirname(fileURLToPath(import.meta.url)), "..", "apps", "api");

function startMockUpstream(hitCount) {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      if (req.method === "POST" && req.url === "/chat/completions") {
        let body = "";
        req.on("data", (c) => { body += c; });
        req.on("end", () => {
          hitCount.value += 1;
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify({
            id: "chatcmpl-bench",
            object: "chat.completion",
            created: 1234567890,
            model: "bench-mock",
            choices: [{
              index: 0,
              message: { role: "assistant", content: "bench ok" },
              finish_reason: "stop",
            }],
          }));
        });
        return;
      }
      res.writeHead(404);
      res.end();
    });
    server.listen(MOCK_PORT, () => resolve(server));
  });
}

async function withApi(env, fn) {
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
      await new Promise((r) => setTimeout(r, 250));
    }
    if (!up) throw new Error(`Ward did not come up on :${WARD_PORT}`);
    // small warmup before timed runs so module evaluation + JIT don't
    // skew p50.
    for (let i = 0; i < 5; i += 1) {
      await fetch(`${WARD_URL}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ward-tenant-id": "bench-warmup",
        },
        body: JSON.stringify({ model: "x", messages: [] }),
      });
    }
    await fn();
  } finally {
    try { process.kill(-child.pid, "SIGTERM"); } catch { /* gone */ }
    await new Promise((r) => setTimeout(r, 500));
  }
}

function pct(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

async function runScenario({ name, env, tenantId, expectHeader }) {
  const latencies = [];
  let successes = 0;
  let failures = 0;
  let firstFail = null;

  await withApi(env, async () => {
    if (tenantId === "bench_constrained") {
      // Constrain first via control plane
      await fetch(`${WARD_URL}/ward/reset`, { method: "POST" });
      await fetch(`${WARD_URL}/ward/tenants/bench_constrained/constrain`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ actor: "bench", reason: "bench setup" }),
      });
    } else {
      await fetch(`${WARD_URL}/ward/reset`, { method: "POST" });
    }

    for (let i = 0; i < N; i += 1) {
      const t0 = performance.now();
      try {
        const r = await fetch(`${WARD_URL}/v1/chat/completions`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-ward-tenant-id": tenantId,
          },
          body: JSON.stringify({ model: "x", messages: [] }),
        });
        const ms = performance.now() - t0;
        if (r.status === 200) {
          successes += 1;
          latencies.push(ms);
          if (expectHeader) {
            const h = r.headers.get("x-ward-would-block");
            if (h !== expectHeader) {
              failures += 1;
              firstFail ??= `expected x-ward-would-block=${expectHeader}, got ${h}`;
            }
          }
        } else {
          failures += 1;
          firstFail ??= `non-200 status: ${r.status}`;
        }
      } catch (err) {
        failures += 1;
        firstFail ??= `fetch error: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
  });

  latencies.sort((a, b) => a - b);
  const stats = {
    name,
    requestCount: N,
    successes,
    failures,
    p50: Number(pct(latencies, 50).toFixed(2)),
    p95: Number(pct(latencies, 95).toFixed(2)),
    min: Number((latencies[0] ?? 0).toFixed(2)),
    max: Number((latencies[latencies.length - 1] ?? 0).toFixed(2)),
    error: firstFail,
  };
  return stats;
}

function printStats(stats, wardMode, upstreamMode) {
  console.log("");
  console.log(`# ${stats.name}`);
  console.log(`  requests:  ${stats.requestCount} (success: ${stats.successes}, fail: ${stats.failures})`);
  console.log(`  p50:       ${stats.p50} ms`);
  console.log(`  p95:       ${stats.p95} ms`);
  console.log(`  min/max:   ${stats.min} / ${stats.max} ms`);
  console.log(`  wardMode:  ${wardMode}`);
  console.log(`  upstream:  ${upstreamMode}`);
  if (stats.error) console.log(`  ERROR:     ${stats.error}`);
}

async function main() {
  console.log("Ward local latency benchmark");
  console.log(`  node:      ${process.version}`);
  console.log(`  platform:  ${process.platform}/${process.arch}`);
  console.log(`  requests:  ${N} per scenario`);
  console.log(`  ward port: ${WARD_PORT}`);

  const allStats = [];
  const scenarios = [
    { name: "mock_chat_completion", env: {}, tenantId: "bench_running", expectHeader: null },
    { name: "mock_pass_through", env: { WARD_UPSTREAM_OPENAI_BASE_URL: MOCK_URL, OPENAI_API_KEY: "bench-fake-key" }, tenantId: "bench_running", expectHeader: null },
    { name: "observe_constrained_would_block", env: { WARD_MODE: "observe" }, tenantId: "bench_constrained", expectHeader: "constrained" },
  ];

  for (const sc of scenarios) {
    let upstreamMode = "mock_upstream";
    let wardMode = "enforce";
    if (sc.env.WARD_UPSTREAM_OPENAI_BASE_URL) upstreamMode = "pass_through";
    if (sc.env.WARD_MODE === "observe") wardMode = "observe";

    const hitCount = { value: 0 };
    let mockServer = null;
    if (sc.name === "mock_pass_through") {
      mockServer = await startMockUpstream(hitCount);
    }
    try {
      const stats = await runScenario(sc);
      allStats.push({ stats, wardMode, upstreamMode });
      if (sc.name === "mock_pass_through") {
        console.log(`  (mock upstream received ${hitCount.value} POSTs)`);
      }
    } finally {
      if (mockServer) mockServer.close();
    }
  }

  console.log("");
  for (const { stats, wardMode, upstreamMode } of allStats) {
    printStats(stats, wardMode, upstreamMode);
  }

  const failed = allStats.filter((s) => s.stats.failures > 0).length;
  console.log("");
  console.log(`Bench: ${allStats.length - failed}/${allStats.length} scenarios passed.`);
  if (failed > 0) {
    console.log("Bench failed — non-zero exit for CI.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Benchmark crashed:", err);
  process.exit(2);
});
