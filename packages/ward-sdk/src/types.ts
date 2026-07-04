// Ward SDK types. Mirrors the Ward API's public shapes.

export type TenantState = "running" | "constrained" | "paused";

export type DeploymentMode = "local" | "docker" | "kubernetes" | "hosted";

export interface Tenant {
  tenantId: string;
  state: TenantState;
  requestCount: number;
  recentRequestTimestamps: number[];
  detectedPressure: boolean;
  lastPressureReason: string | null;
  estimatedSpend: number;
  activeWorkflowRuns: number;
  deploymentMode: DeploymentMode;
  updatedAt: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  tenantId: string;
  action: string;
  actor: string;
  reason: string;
  previousState?: string;
  nextState?: string;
  evidence?: Record<string, unknown>;
}

export type ApprovableAction = "constrain" | "pause" | "resume";

export interface ApprovalRequestInput {
  action: ApprovableAction;
  actor: string;
  reason: string;
}

export interface ApprovalResponse {
  approvalToken: string;
  requiredPhrase: string;
  expiresAt: string;
  action: ApprovableAction;
  tenantId: string;
}

export interface ApplyApprovedActionInput {
  approvalToken: string;
  phrase: string;
}

export interface TransitionInput {
  actor?: string;
  reason?: string;
}

export interface TransitionResult {
  tenant: Tenant;
  audit: AuditEvent;
}

export type RunnerKind = "mock" | "docker" | "kubernetes";

export type WorkflowRunStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "blocked";

export interface WorkflowRun {
  id: string;
  tenantId: string;
  runner: RunnerKind;
  status: WorkflowRunStatus;
  image?: string;
  command?: string[];
  createdAt: string;
  updatedAt: string;
  result?: unknown;
  error?: string;
}

export interface CreateWorkflowRunInput {
  tenantId: string;
  runner: RunnerKind;
  image?: string;
  command?: string[];
}

// Fail mode when Ward cannot answer the policy question (unreachable,
// or reachable but erroring). "open" (default): run the callback so
// Ward never becomes the outage. "closed": refuse to run.
export type FailMode = "open" | "closed";

export interface GuardInput<T> {
  tenantId: string;
  operation?: string;
  run: () => Promise<T> | T;
  failMode?: FailMode;
  onFailOpen?: (error: unknown) => void;
}

export type GuardDecisionKind =
  | "allowed"
  | "constrained"
  | "paused"
  | "fail_open"
  | "fail_closed";

// Cooperative containment: the guard checks tenant state before running
// the callback. It cannot stop code that ignores the decision — this is
// weaker than egress-proxy enforcement. Fail-open is never hidden: the
// decision field says exactly what happened.
export interface GuardResult<T> {
  decision: GuardDecisionKind;
  ran: boolean;
  state?: TenantState;
  tenantKnown?: boolean;
  reason?: string;
  error?: string;
  result?: T;
}

// Backward-compatible alias for the pre-fail-mode name.
export type GuardDecision<T> = GuardResult<T>;

export class WardApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `Ward API error (HTTP ${status})`);
    this.name = "WardApiError";
    this.status = status;
    this.body = body;
  }
}
