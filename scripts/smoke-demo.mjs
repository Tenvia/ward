// Ward smoke test for the core Acme/Globex containment demo.
//
// Assumes the Ward API is already running (default http://localhost:4317).
// Uses the demo SaaS app (default http://localhost:4401) when reachable;
// otherwise drives the proxy endpoint directly. Resets Ward state first.
//
// Usage: npm run smoke:demo
//   WARD_API_URL / WARD_DEMO_URL override the defaults.

const API = (process.env.WARD_API_URL ?? "http://localhost:4317").replace(/\/$/, "");
const DEMO = (process.env.WARD_DEMO_URL ?? "http://localhost:4401").replace(/\/$/, "");

const results = [];

function record(name, pass, detail = "") {
  results.push({ name, pass, detail });
  const mark = pass ? "PASS" : "FAIL";
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function req(base, method, path, { body, headers } = {}) {
  const response = await fetch(`${base}${path}`, {
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
  return { status: response.status, json };
}

function proxyCall(tenantId) {
  return req(API, "POST", "/v1/chat/completions", {
    body: { model: "gpt-4o-mini", messages: [{ role: "user", content: "smoke" }] },
    headers: {
      "x-ward-tenant-id": tenantId,
      "x-ward-operation": "agent.tool_call",
      "x-ward-correlation-id": `smoke_${Date.now()}`,
    },
  });
}

async function main() {
  // 0. API reachable + reset
  let health;
  try {
    health = await req(API, "GET", "/health");
  } catch {
    console.error(`Ward API is not reachable at ${API}. Start it first:`);
    console.error("  cd apps/api && npm run dev");
    process.exit(2);
  }
  record("health endpoint", health.status === 200 && health.json?.status === "ok",
    `upstream=${health.json?.upstreamMode}`);
  record("health reports served OpenAPI contract", health.json?.openapi?.served === true);
  const openapiRes = await fetch(`${API}/openapi.yaml`);
  const openapiText = await openapiRes.text();
  record("GET /openapi.yaml returns the contract",
    openapiRes.status === 200 && openapiText.includes("openapi: 3."));
  await req(API, "POST", "/ward/reset");

  // Demo app is optional; fall back to direct proxy calls.
  let demoUp = false;
  try {
    const s = await req(DEMO, "GET", "/status");
    demoUp = s.status === 200;
  } catch {
    demoUp = false;
  }
  console.log(demoUp
    ? `demo app detected at ${DEMO}; using it for tenant runs`
    : `demo app not reachable at ${DEMO}; driving the proxy directly`);

  const runAcme = () =>
    demoUp ? req(DEMO, "POST", "/tenants/acme/run-agent-once") : proxyCall("tenant_acme");
  const runGlobex = () =>
    demoUp ? req(DEMO, "POST", "/tenants/globex/run-agent-once") : proxyCall("tenant_globex");

  // 1. Missing tenant header
  const noHeader = await req(API, "POST", "/v1/chat/completions", {
    body: { model: "x", messages: [] },
  });
  record("missing tenant header returns 400",
    noHeader.status === 400 && noHeader.json?.error === "ward_missing_tenant_header");

  // 2. Acme and Globex work before containment
  const acme1 = await runAcme();
  record("acme run succeeds before constrain", acme1.status === 200);
  const globex1 = await runGlobex();
  record("globex run succeeds before constrain", globex1.status === 200);

  // 3. Trigger pressure: burst of Globex proxy calls inside the window
  for (let i = 0; i < 12; i += 1) await proxyCall("tenant_globex");
  const tenants = await req(API, "GET", "/ward/tenants");
  const globexRec = tenants.json?.tenants?.find((t) => t.tenantId === "tenant_globex");
  record("globex pressure detected", globexRec?.detectedPressure === true,
    globexRec?.lastPressureReason ?? "no reason");
  record("globex still running (no auto-constrain)", globexRec?.state === "running");
  const acmeRec = tenants.json?.tenants?.find((t) => t.tenantId === "tenant_acme");
  record("acme unaffected by globex pressure",
    acmeRec?.detectedPressure === false && acmeRec?.state === "running");

  // 4. Approval flow
  const approval = await req(API, "POST", "/ward/tenants/tenant_globex/approval", {
    body: { action: "constrain", actor: "smoke-test", reason: "smoke: globex loop pressure" },
  });
  record("approval token issued",
    approval.status === 200 &&
      typeof approval.json?.approvalToken === "string" &&
      approval.json?.requiredPhrase === "constrain tenant_globex");
  const token = approval.json?.approvalToken;

  const wrongPhrase = await req(API, "POST", "/ward/tenants/tenant_globex/apply-approved-action", {
    body: { approvalToken: token, phrase: "constrain tenant_acme" },
  });
  record("wrong phrase rejected",
    wrongPhrase.status === 400 && wrongPhrase.json?.error === "ward_approval_phrase_mismatch");

  const applied = await req(API, "POST", "/ward/tenants/tenant_globex/apply-approved-action", {
    body: { approvalToken: token, phrase: "constrain tenant_globex" },
  });
  record("approved constrain applied",
    applied.status === 200 && applied.json?.tenant?.state === "constrained");

  const reuse = await req(API, "POST", "/ward/tenants/tenant_globex/apply-approved-action", {
    body: { approvalToken: token, phrase: "constrain tenant_globex" },
  });
  record("token reuse rejected (single-use)", reuse.status === 400);

  // 5. Enforcement is tenant-specific
  const globexBlocked = await runGlobex();
  record("globex blocked after constrain (429)", globexBlocked.status === 429);
  const acme2 = await runAcme();
  record("acme still succeeds after globex constrain", acme2.status === 200);

  // 6. Audit trail
  const audit = await req(API, "GET", "/ward/audit");
  const actions = (audit.json?.audit ?? []).map((e) => e.action);
  record("audit includes pressure_detected", actions.includes("pressure_detected"));
  record("audit includes approval_requested", actions.includes("approval_requested"));
  record("audit includes constrain transition", actions.includes("constrain"));

  // Cleanup: resume globex so the smoke run leaves a sane state.
  await req(API, "POST", "/ward/tenants/tenant_globex/resume", {
    body: { actor: "smoke-test", reason: "smoke cleanup" },
  });

  const failed = results.filter((r) => !r.pass);
  console.log("");
  console.log(`Smoke demo: ${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length > 0) {
    console.log("Failed checks:");
    for (const f of failed) console.log(`  - ${f.name}${f.detail ? ` (${f.detail})` : ""}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Smoke demo crashed:", err);
  process.exit(2);
});
