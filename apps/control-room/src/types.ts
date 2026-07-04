// Control Room types. Mirrors the Ward API's public shapes.

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

export interface ApprovalResponse {
  approvalToken: string;
  requiredPhrase: string;
  expiresAt: string;
  action: ApprovableAction;
  tenantId: string;
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

export interface HealthResponse {
  status: string;
  service: string;
  deploymentMode: DeploymentMode;
  upstreamMode: string;
}
