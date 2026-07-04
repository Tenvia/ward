// Live OpenAPI response-conformance smoke.
//
// Loads openapi/ward.v0.yaml, exercises the implemented endpoints on a
// running Ward API, and validates that live responses carry the
// required fields and basic types the contract promises. This is a
// practical drift detector, not a full contract-testing framework:
// it checks required fields, primitive types, enums, and nested
// object/array shapes for the schemas each endpoint references.
//
// Assumes the Ward API is running (WARD_API_URL, default
// http://localhost:4317). If the API requires control auth, set
// WARD_CONTROL_TOKEN (the user Docker bundle's demo token is
// "ward-demo-token").
//
// Usage: npm run smoke:openapi
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parse } from "yaml";

const API = (process.env.WARD_API_URL ?? "http://localhost:4317").replace(/\/$/, "");
const TOKEN = process.env.WARD_CONTROL_TOKEN ?? "";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const contract = parse(readFileSync(join(root, "openapi", "ward.v0.yaml"), "utf8"));
const schemas = contract.components?.schemas ?? {};

const results = [];
function record(name, pass, detail = "") {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

// --- Minimal schema walker -------------------------------------------------

function resolveRef(schema) {
  if (schema && typeof schema === "object" && schema.$ref) {
    const name = schema.$ref.replace("#/components/schemas/", "");
    const target = schemas[name];
    if (!target) return { errors: [`unresolvable $ref ${schema.$ref}`] };
    return target;
  }
  return schema;
}

function typeOf(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value; // object, string, number, boolean
}

function validate(value, schema, path, errors) {
  schema = resolveRef(schema);
  if (!schema || typeof schema !== "object") return;
  if (schema.errors) {
    errors.push(...schema.errors);
    return;
  }
  if (schema.nullable && value === null) return;

  const t = schema.type;
  if (t === "object" || (t === undefined && schema.properties)) {
    if (typeOf(value) !== "object") {
      errors.push(`${path}: expected object, got ${typeOf(value)}`);
      return;
    }
    for (const req of schema.required ?? []) {
      if (!(req in value)) errors.push(`${path}.${req}: required field missing`);
    }
    for (const [key, propSchema] of Object.entries(schema.properties ?? {})) {
      if (key in value && value[key] !== undefined) {
        validate(value[key], propSchema, `${path}.${key}`, errors);
      }
    }
    return;
  }
  if (t === "array") {
    if (!Array.isArray(value)) {
      errors.push(`${path}: expected array, got ${typeOf(value)}`);
      return;
    }
    if (schema.items) {
      value.forEach((item, i) => validate(item, schema.items, `${path}[${i}]`, errors));
    }
    return;
  }
  if (t === "string") {
    if (typeof value !== "string") {
      errors.push(`${path}: expected string, got ${typeOf(value)}`);
    } else if (schema.enum && !schema.enum.includes(value)) {
      errors.push(`${path}: "${value}" not in enum [${schema.enum.join(", ")}]`);
    }
    return;
  }
  if (t === "number" || t === "integer") {
    if (typeof value !== "number") errors.push(`${path}: expected ${t}, got ${typeOf(value)}`);
    return;
  }
  if (t === "boolean") {
    if (typeof value !== "boolean") errors.push(`${path}: expected boolean, got ${typeOf(value)}`);
    return;
  }
  // No type / empty schema ({}): anything is allowed.
}

function conforms(name, value, schemaRef) {
  const errors = [];
  validate(value, schemaRef, "$", errors);
  record(name, errors.length === 0, errors.slice(0, 3).join("; "));
}

// --- HTTP helpers ----------------------------------------------------------

async function req(method, path, { body, headers, auth } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      ...(auth && TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}),
      ...(headers ?? {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  let json = null;
  try {
    json = await response.clone().json();
  } catch {
    json = null;
  }
  return { status: response.status, json, text: await response.text() };
}

const proxyCall = (tenantId) =>
  req("POST", "/v1/chat/completions", {
    body: { model: "demo", messages: [{ role: "user", content: "conformance" }] },
    headers: { "x-ward-tenant-id": tenantId, "x-ward-operation": "agent.tool_call" },
  });

// --- Flow ------------------------------------------------------------------

async function main() {
  let health;
  try {
    health = await req("GET", "/health");
  } catch {
    console.error(`Ward API unreachable at ${API}. Start it first (cd apps/api && npm run dev).`);
    process.exit(2);
  }

  // 1. Health matches HealthResponse.
  record("GET /health returns 200", health.status === 200);
  conforms("health conforms to HealthResponse", health.json, {
    $ref: "#/components/schemas/HealthResponse",
  });

  // 2. Contract is served.
  const yaml = await req("GET", "/openapi.yaml");
  record("GET /openapi.yaml serves the contract",
    yaml.status === 200 && yaml.text.startsWith("openapi: 3."));
  const jsonSpec = await req("GET", "/openapi.json");
  record("GET /openapi.json parses and matches title",
    jsonSpec.status === 200 && jsonSpec.json?.info?.title === contract.info.title);

  // Reset for a deterministic flow (mutation; auth if configured).
  const reset = await req("POST", "/ward/reset", { auth: true });
  if (reset.status === 401) {
    console.error(
      "Mutations require a control token. Set WARD_CONTROL_TOKEN (user bundle demo token: ward-demo-token)."
    );
    process.exit(2);
  }

  // 3. Acme request works and matches ChatCompletionResponse.
  const acme1 = await proxyCall("tenant_acme");
  record("Acme proxy call returns 200", acme1.status === 200);
  conforms("chat completion conforms to ChatCompletionResponse", acme1.json, {
    $ref: "#/components/schemas/ChatCompletionResponse",
  });

  // Tenants list + detail match Tenant.
  const tenants = await req("GET", "/ward/tenants");
  record("GET /ward/tenants returns 200 with tenants[]",
    tenants.status === 200 && Array.isArray(tenants.json?.tenants));
  conforms("tenants[] items conform to Tenant", tenants.json?.tenants ?? [], {
    type: "array",
    items: { $ref: "#/components/schemas/Tenant" },
  });
  const tenant = await req("GET", "/ward/tenants/tenant_acme");
  record("GET /ward/tenants/{tenantId} returns 200", tenant.status === 200);
  conforms("tenant detail conforms to Tenant", tenant.json?.tenant, {
    $ref: "#/components/schemas/Tenant",
  });

  // 4. Approval flow for Globex matches ApprovalResponse / transition shape.
  await proxyCall("tenant_globex");
  const approval = await req("POST", "/ward/tenants/tenant_globex/approval", {
    auth: true,
    body: { action: "constrain", actor: "conformance-smoke", reason: "openapi conformance" },
  });
  record("approval request returns 200", approval.status === 200);
  conforms("approval conforms to ApprovalResponse", approval.json, {
    $ref: "#/components/schemas/ApprovalResponse",
  });

  const applied = await req("POST", "/ward/tenants/tenant_globex/apply-approved-action", {
    auth: true,
    body: { approvalToken: approval.json?.approvalToken, phrase: approval.json?.requiredPhrase },
  });
  record("apply-approved-action returns 200", applied.status === 200);
  conforms("transition result: tenant conforms to Tenant", applied.json?.tenant, {
    $ref: "#/components/schemas/Tenant",
  });
  conforms("transition result: audit conforms to AuditEvent", applied.json?.audit, {
    $ref: "#/components/schemas/AuditEvent",
  });
  record("applied state is constrained", applied.json?.tenant?.state === "constrained");

  // 5-6. Globex blocked with a conforming WardError; Acme still fine.
  const blocked = await proxyCall("tenant_globex");
  record("Globex blocked after constrain (429)", blocked.status === 429);
  conforms("blocked body conforms to WardError", blocked.json, {
    $ref: "#/components/schemas/WardError",
  });
  const acme2 = await proxyCall("tenant_acme");
  record("Acme still succeeds after constrain", acme2.status === 200);

  // 7. Audit includes the approved action and conforms.
  const audit = await req("GET", "/ward/audit");
  record("GET /ward/audit returns 200", audit.status === 200);
  conforms("audit[] items conform to AuditEvent", audit.json?.audit ?? [], {
    type: "array",
    items: { $ref: "#/components/schemas/AuditEvent" },
  });
  record("audit includes the constrain action",
    (audit.json?.audit ?? []).some((e) => e.action === "constrain"));

  // Workflow runs: create (mock, running tenant) + list conform.
  const run = await req("POST", "/ward/workflow-runs", {
    auth: true,
    body: { tenantId: "tenant_acme", runner: "mock" },
  });
  record("POST /ward/workflow-runs returns 201", run.status === 201);
  conforms("created run conforms to WorkflowRun", run.json?.workflowRun, {
    $ref: "#/components/schemas/WorkflowRun",
  });
  const runs = await req("GET", "/ward/workflow-runs");
  record("GET /ward/workflow-runs returns 200", runs.status === 200);
  conforms("workflowRuns[] items conform to WorkflowRun", runs.json?.workflowRuns ?? [], {
    type: "array",
    items: { $ref: "#/components/schemas/WorkflowRun" },
  });

  // Cleanup.
  await req("POST", "/ward/tenants/tenant_globex/resume", {
    auth: true,
    body: { actor: "conformance-smoke", reason: "cleanup" },
  });

  const failed = results.filter((r) => !r.pass);
  console.log("");
  console.log(
    `OpenAPI conformance smoke: ${results.length - failed.length}/${results.length} checks passed.`
  );
  if (failed.length > 0) {
    console.log("The live API has drifted from openapi/ward.v0.yaml. Failing checks:");
    for (const f of failed) console.log(`  - ${f.name}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Conformance smoke crashed:", err);
  process.exit(2);
});
