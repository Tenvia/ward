// Ward API types. Phase 1 prototype: in-memory, local/Docker demo only.

export type TenantState = "running" | "constrained" | "paused";

export type DeploymentMode = "local" | "docker" | "kubernetes" | "hosted";

export interface TenantRecord {
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

export interface PressureResult {
  detected: boolean;
  requestsInWindow: number;
  windowMs: number;
  threshold: number;
}

export interface AuditEvent {
  schemaVersion: 1;
  id: string;
  timestamp: string;
  tenantId: string;
  action: string;
  actor: string;
  reason: string;
  previousState?: string;
  nextState?: string;
  evidence?: Record<string, unknown>;
  correlationId?: string;
}

export type ApprovableAction = "constrain" | "pause" | "resume";

export interface ApprovalRecord {
  approvalToken: string;
  tenantId: string;
  action: ApprovableAction;
  actor: string;
  reason: string;
  requiredPhrase: string;
  expiresAt: string;
  used: boolean;
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

export interface WardErrorBody {
  error: string;
  message: string;
  tenantId?: string;
  state?: TenantState;
}
export type WardMode = "enforce" | "observe";
