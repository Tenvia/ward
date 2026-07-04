// WardClient: a thin typed HTTP client for the Ward API.
// Prototype: no auth, no retries. Requires a fetch-capable runtime
// (Node 18+ or a browser).
import {
  WardApiError,
  type ApplyApprovedActionInput,
  type ApprovalRequestInput,
  type ApprovalResponse,
  type AuditEvent,
  type CreateWorkflowRunInput,
  type FailMode,
  type GuardInput,
  type GuardResult,
  type Tenant,
  type TransitionInput,
  type TransitionResult,
  type WorkflowRun,
} from "./types.js";

export interface WardClientOptions {
  baseUrl?: string;
}

const DEFAULT_BASE_URL = "http://localhost:4317";

export class WardClient {
  private readonly baseUrl: string;

  constructor(options: WardClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  }

  private async request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: body !== undefined ? { "content-type": "application/json" } : {},
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    let json: unknown = null;
    try {
      json = await response.json();
    } catch {
      json = null;
    }
    if (!response.ok) {
      throw new WardApiError(response.status, json);
    }
    return json as T;
  }

  async listTenants(): Promise<Tenant[]> {
    const data = await this.request<{ tenants: Tenant[] }>("GET", "/ward/tenants");
    return data.tenants;
  }

  async getTenant(tenantId: string): Promise<Tenant> {
    const data = await this.request<{ tenant: Tenant }>(
      "GET",
      `/ward/tenants/${encodeURIComponent(tenantId)}`
    );
    return data.tenant;
  }

  async requestApproval(tenantId: string, input: ApprovalRequestInput): Promise<ApprovalResponse> {
    return this.request<ApprovalResponse>(
      "POST",
      `/ward/tenants/${encodeURIComponent(tenantId)}/approval`,
      input
    );
  }

  async applyApprovedAction(
    tenantId: string,
    input: ApplyApprovedActionInput
  ): Promise<TransitionResult> {
    return this.request<TransitionResult>(
      "POST",
      `/ward/tenants/${encodeURIComponent(tenantId)}/apply-approved-action`,
      input
    );
  }

  async constrainTenant(tenantId: string, input?: TransitionInput): Promise<TransitionResult> {
    return this.request<TransitionResult>(
      "POST",
      `/ward/tenants/${encodeURIComponent(tenantId)}/constrain`,
      input ?? {}
    );
  }

  async pauseTenant(tenantId: string, input?: TransitionInput): Promise<TransitionResult> {
    return this.request<TransitionResult>(
      "POST",
      `/ward/tenants/${encodeURIComponent(tenantId)}/pause`,
      input ?? {}
    );
  }

  async resumeTenant(tenantId: string, input?: TransitionInput): Promise<TransitionResult> {
    return this.request<TransitionResult>(
      "POST",
      `/ward/tenants/${encodeURIComponent(tenantId)}/resume`,
      input ?? {}
    );
  }

  async createWorkflowRun(input: CreateWorkflowRunInput): Promise<WorkflowRun> {
    const data = await this.request<{ workflowRun: WorkflowRun }>(
      "POST",
      "/ward/workflow-runs",
      input
    );
    return data.workflowRun;
  }

  async getWorkflowRun(runId: string): Promise<WorkflowRun> {
    const data = await this.request<{ workflowRun: WorkflowRun }>(
      "GET",
      `/ward/workflow-runs/${encodeURIComponent(runId)}`
    );
    return data.workflowRun;
  }

  async listWorkflowRuns(): Promise<WorkflowRun[]> {
    const data = await this.request<{ workflowRuns: WorkflowRun[] }>(
      "GET",
      "/ward/workflow-runs"
    );
    return data.workflowRuns;
  }

  async cancelWorkflowRun(runId: string): Promise<WorkflowRun> {
    const data = await this.request<{ workflowRun: WorkflowRun }>(
      "POST",
      `/ward/workflow-runs/${encodeURIComponent(runId)}/cancel`
    );
    return data.workflowRun;
  }

  async getAudit(): Promise<AuditEvent[]> {
    const data = await this.request<{ audit: AuditEvent[] }>("GET", "/ward/audit");
    return data.audit;
  }

  // Cooperative containment guard. Checks tenant state, then either runs
  // the callback (running) or returns a decision without running it
  // (constrained/paused). If Ward cannot answer the policy question, the
  // fail mode decides: "open" (default) runs the callback and reports
  // fail_open; "closed" refuses and reports fail_closed. Fail-open is
  // never silent. This cannot stop code that bypasses the guard; it is
  // weaker than egress-proxy enforcement by design.
  async guard<T>(input: GuardInput<T>): Promise<GuardResult<T>> {
    const operation = input.operation ?? "unspecified";
    const failMode: FailMode = input.failMode ?? "open";

    let state: Tenant["state"] = "running";
    let tenantKnown = true;
    try {
      const tenant = await this.getTenant(input.tenantId);
      state = tenant.state;
    } catch (err) {
      if (err instanceof WardApiError && err.status === 404) {
        // Tenant not tracked yet: Ward's default state is running.
        tenantKnown = false;
        state = "running";
      } else {
        // Ward unreachable, or reachable but unable to answer.
        const message = err instanceof Error ? err.message : String(err);
        if (failMode === "open") {
          input.onFailOpen?.(err);
          const result = await input.run();
          return {
            decision: "fail_open",
            ran: true,
            reason:
              `Ward could not answer the policy check for tenant ${input.tenantId}; ` +
              `operation ${operation} ran WITHOUT containment (failMode=open).`,
            error: message,
            result,
          };
        }
        return {
          decision: "fail_closed",
          ran: false,
          reason:
            `Ward could not answer the policy check for tenant ${input.tenantId}; ` +
            `operation ${operation} was not run (failMode=closed).`,
          error: message,
        };
      }
    }

    if (state === "running") {
      const result = await input.run();
      return { decision: "allowed", ran: true, state, tenantKnown, result };
    }
    return {
      decision: state,
      ran: false,
      state,
      tenantKnown,
      reason: `Tenant ${input.tenantId} is ${state}; operation ${operation} was not run.`,
    };
  }
}

export function createWardClient(options: WardClientOptions = {}): WardClient {
  return new WardClient(options);
}
