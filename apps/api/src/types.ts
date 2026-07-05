// Ward API types. Phase 1 prototype: in-memory, local/Docker demo only.

export type TenantState = "running" | "constrained" | "paused";

export type DeploymentMode = "local" | "docker" | "kubernetes" | "hosted";

export type WardMode = "enforce" | "observe";

// RC3 Slice 3: per-tenant mode override. "inherit" defers to the
// global WARD_MODE setting; "observe" and "enforce" pin the tenant
// regardless of the global default. Computed per request via the
// effectiveWardMode helper; never used as a way to bypass enforcement.
export type WardModeOverride = "inherit" | "observe" | "enforce";

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
  // RC3 Slice 3: per-tenant mode override. Always present on in-memory
  // and freshly persisted tenants. Rehydrated SQLite rows persisted
  // before Slice 3 may lack this field at runtime; the tenantState
  // helpers treat undefined as "inherit".
  modeOverride: WardModeOverride;
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
