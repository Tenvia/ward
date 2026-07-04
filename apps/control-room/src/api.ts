// Thin fetch layer over the Ward API. Prototype: no auth, no retries.
import type {
  ApprovableAction,
  ApprovalResponse,
  AuditEvent,
  HealthResponse,
  RunnerKind,
  Tenant,
  WorkflowRun,
} from "./types";

// API base: explicit override first; otherwise, when the UI is served
// by the Ward API itself (bundled build), use the same origin; the
// contributor dev/preview server on :5173 talks to localhost:4317.
const API_BASE: string =
  import.meta.env.VITE_WARD_API_URL ??
  (window.location.port === "5173" ? "http://localhost:4317" : window.location.origin);

// Shared control token (prototype auth, not production RBAC).
// Runtime value (header field, kept in localStorage) wins over the
// optional build-time VITE_WARD_CONTROL_TOKEN.
const TOKEN_STORAGE_KEY = "ward_control_token";

export function getControlToken(): string {
  return (
    window.localStorage.getItem(TOKEN_STORAGE_KEY) ??
    (import.meta.env.VITE_WARD_CONTROL_TOKEN as string | undefined) ??
    ""
  );
}

export function setControlToken(token: string): void {
  if (token) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

async function request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      ...(getControlToken() ? { authorization: `Bearer ${getControlToken()}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const json = (await response.json().catch(() => null)) as
    | (T & { error?: string; message?: string })
    | null;
  if (!response.ok) {
    const message =
      json && typeof json === "object" && "message" in json && json.message
        ? String(json.message)
        : `Ward API error (HTTP ${response.status})`;
    throw new Error(message);
  }
  return json as T;
}

export async function fetchHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("GET", "/health");
}

export async function fetchTenants(): Promise<Tenant[]> {
  const data = await request<{ tenants: Tenant[] }>("GET", "/ward/tenants");
  return data.tenants;
}

export async function fetchWorkflowRuns(): Promise<WorkflowRun[]> {
  const data = await request<{ workflowRuns: WorkflowRun[] }>("GET", "/ward/workflow-runs");
  return data.workflowRuns;
}

export async function fetchAudit(): Promise<AuditEvent[]> {
  const data = await request<{ audit: AuditEvent[] }>("GET", "/ward/audit");
  return data.audit;
}

export async function requestApproval(
  tenantId: string,
  action: ApprovableAction,
  actor: string,
  reason: string
): Promise<ApprovalResponse> {
  return request<ApprovalResponse>(
    "POST",
    `/ward/tenants/${encodeURIComponent(tenantId)}/approval`,
    { action, actor, reason }
  );
}

export async function applyApprovedAction(
  tenantId: string,
  approvalToken: string,
  phrase: string
): Promise<{ tenant: Tenant; audit: AuditEvent }> {
  return request("POST", `/ward/tenants/${encodeURIComponent(tenantId)}/apply-approved-action`, {
    approvalToken,
    phrase,
  });
}

export async function directTransition(
  tenantId: string,
  action: ApprovableAction,
  actor: string,
  reason: string
): Promise<{ tenant: Tenant; audit: AuditEvent }> {
  return request("POST", `/ward/tenants/${encodeURIComponent(tenantId)}/${action}`, {
    actor,
    reason,
  });
}

export async function createWorkflowRun(
  tenantId: string,
  runner: RunnerKind
): Promise<WorkflowRun> {
  const data = await request<{ workflowRun: WorkflowRun }>("POST", "/ward/workflow-runs", {
    tenantId,
    runner,
    image: "ward-example-agent",
    command: ["node", "agent.js"],
  });
  return data.workflowRun;
}

export async function cancelWorkflowRun(runId: string): Promise<WorkflowRun> {
  const data = await request<{ workflowRun: WorkflowRun }>(
    "POST",
    `/ward/workflow-runs/${encodeURIComponent(runId)}/cancel`
  );
  return data.workflowRun;
}
