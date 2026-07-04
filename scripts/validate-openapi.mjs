// Validate openapi/ward.v0.yaml and regenerate openapi/ward.v0.json.
//
// Contributor tooling (Node + the `yaml` package). Users never need
// this: the API serves the committed contract at /openapi.yaml and
// /openapi.json. Checks: file exists, YAML parses, required paths and
// schemas exist, and the JSON twin is kept in sync.
//
// Usage: npm run validate:openapi
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parse } from "yaml";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const yamlPath = join(root, "openapi", "ward.v0.yaml");
const jsonPath = join(root, "openapi", "ward.v0.json");

const REQUIRED_PATHS = [
  "/health",
  "/v1/chat/completions",
  "/ward/tenants",
  "/ward/tenants/{tenantId}",
  "/ward/tenants/{tenantId}/constrain",
  "/ward/tenants/{tenantId}/pause",
  "/ward/tenants/{tenantId}/resume",
  "/ward/tenants/{tenantId}/approval",
  "/ward/tenants/{tenantId}/apply-approved-action",
  "/ward/workflow-runs",
  "/ward/workflow-runs/{runId}",
  "/ward/workflow-runs/{runId}/cancel",
  "/ward/audit",
  "/ward/reset",
];

const REQUIRED_SCHEMAS = [
  "Tenant",
  "TenantState",
  "AuditEvent",
  "ApprovalRequest",
  "ApprovalResponse",
  "ApplyApprovedActionRequest",
  "WorkflowRun",
  "WorkflowRunStatus",
  "WorkflowRunRequest",
  "WardError",
  "HealthResponse",
  "ChatCompletionRequest",
  "ChatCompletionResponse",
];

const errors = [];

let raw;
try {
  raw = readFileSync(yamlPath, "utf8");
} catch {
  console.error(`FAIL: ${yamlPath} does not exist`);
  process.exit(1);
}

let doc;
try {
  doc = parse(raw);
} catch (err) {
  console.error(`FAIL: YAML does not parse: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}

if (!doc?.openapi?.startsWith("3.")) errors.push("missing/unexpected `openapi: 3.x` version field");
if (!doc?.info?.title || !doc?.info?.version) errors.push("missing info.title or info.version");

for (const p of REQUIRED_PATHS) {
  if (!doc?.paths?.[p]) errors.push(`missing path: ${p}`);
}
for (const s of REQUIRED_SCHEMAS) {
  if (!doc?.components?.schemas?.[s]) errors.push(`missing schema: ${s}`);
}
if (!doc?.components?.securitySchemes?.controlToken) {
  errors.push("missing securitySchemes.controlToken");
}

if (errors.length > 0) {
  console.error(`OpenAPI validation FAILED (${errors.length} problems):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

writeFileSync(jsonPath, JSON.stringify(doc, null, 2) + "\n");
console.log(`OpenAPI validation passed: ${REQUIRED_PATHS.length} paths, ${REQUIRED_SCHEMAS.length} schemas present.`);
console.log(`Regenerated ${jsonPath} from the YAML source of truth.`);
