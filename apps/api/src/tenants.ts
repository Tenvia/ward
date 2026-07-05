// Tenant control endpoints: list/inspect, direct state transitions,
// and the operator approval flow. Prototype only — no production RBAC;
// these endpoints are open on the local network.
//
// RC3 Slice 3: per-tenant mode override route (POST /:tenantId/mode).
// RC3 Slice 4: explicit state transition contract enforced here.
// applyTransition consults canTransitionTenantState before delegating
// to setState. Rejected transitions return HTTP 409 with a clear
// ward_invalid_transition error.
import { Router } from "express";
import type { Request, Response } from "express";
import { logAudit } from "./audit.js";
import { consumeApproval, isApprovableAction, requestApproval } from "./approvals.js";
import { requireControlAuth } from "./controlAuth.js";
import { detectPressure } from "./detection.js";
import {
  getOrCreateTenant,
  getTenant,
  isValidModeOverride,
  listTenants,
  setModeOverride,
  setState,
} from "./tenantState.js";
import {
  canTransitionTenantState,
  explainRejection,
  isValidWardState,
} from "./stateTransitions.js";
import type { ApprovableAction, AuditEvent, TenantRecord, TenantState } from "./types.js";

export const tenantsRouter = Router();

export interface ApplyTransitionInput {
  tenantId: string;
  action: ApprovableAction;
  actor: string;
  reason: string;
  evidence?: Record<string, unknown>;
}

export interface ApplyTransitionSuccess {
  ok: true;
  tenant: TenantRecord | undefined;
  audit: AuditEvent;
  previous: TenantState;
  next: TenantState;
}

export interface ApplyTransitionRejection {
  ok: false;
  tenant: TenantRecord | undefined;
  audit: undefined;
  previous: TenantState | null;
  next: TenantState;
  rejection:
    | "same_state"
    | "invalid_state"
    | "unsupported_transition";
  message: string;
}

export type ApplyTransitionResult =
  | ApplyTransitionSuccess
  | ApplyTransitionRejection;

export class WardTransitionError extends Error {
  public readonly rejection: "same_state" | "invalid_state" | "unsupported_transition";
  public readonly from: TenantState | null;
  public readonly to: TenantState | null;
  public readonly tenantId: string;
  constructor(input: {
    tenantId: string;
    rejection: ApplyTransitionRejection["rejection"];
    from: TenantState | null;
    to: TenantState;
    message: string;
  }) {
    super(input.message);
    this.name = "WardTransitionError";
    this.rejection = input.rejection;
    this.from = input.from;
    this.to = input.to;
    this.tenantId = input.tenantId;
  }
}

// Express guarantees route params exist for matched routes;
// noUncheckedIndexedAccess types them as string | undefined.
function tenantParam(req: Request): string {
  return req.params.tenantId ?? "";
}

const ACTION_TO_STATE: Record<ApprovableAction, TenantState> = {
  constrain: "constrained",
  pause: "paused",
  resume: "running",
};

export function applyTransition(input: ApplyTransitionInput): ApplyTransitionResult {
  const target = ACTION_TO_STATE[input.action];
  // Ensure the tenant exists so we can read its current state for the
  // contract check. Approval-flow callers pre-create the tenant; this
  // is idempotent for an existing record.
  const existing = getTenant(input.tenantId);
  const isNew = !existing;
  if (isNew) {
    getOrCreateTenant(input.tenantId);
  }
  const current = (getTenant(input.tenantId)?.state ?? "running") as TenantState;

  if (!canTransitionTenantState(current, target)) {
    const detail = explainRejection(current, target);
    return {
      ok: false,
      tenant: getTenant(input.tenantId),
      audit: undefined,
      previous: detail.from,
      next: detail.to ?? target,
      rejection: detail.reason,
      message: detail.message,
    };
  }

  const { previous, next } = setState(input.tenantId, target);
  const event = logAudit({
    tenantId: input.tenantId,
    action: input.action,
    actor: input.actor,
    reason: input.reason,
    previousState: previous,
    nextState: next,
    ...(input.evidence !== undefined ? { evidence: input.evidence } : {}),
  });
  return {
    ok: true,
    tenant: getTenant(input.tenantId),
    audit: event,
    previous,
    next,
  };
}

// isValidWardState is re-exported from this module so callers can narrow
// tenant state values at the boundary without reaching into
// stateTransitions directly.
export { isValidWardState as isValidTenantState };

tenantsRouter.get("/", (_req: Request, res: Response) => {
  res.json({ tenants: listTenants() });
});

tenantsRouter.get("/:tenantId", (req: Request, res: Response) => {
  const tenant = getTenant(tenantParam(req));
  if (!tenant) {
    res.status(404).json({
      error: "ward_tenant_not_found",
      message: `Tenant ${tenantParam(req)} is not tracked by Ward yet.`,
    });
    return;
  }
  res.json({ tenant, pressure: detectPressure(tenant) });
});

function sendRejection(res: Response, rejection: ApplyTransitionRejection): void {
  // 409 Conflict: the tenant's current state precludes this transition.
  // 400 Bad Request: caller asserted a state that the request body or
  // current tenant doesn't support.
  const status = rejection.rejection === "invalid_state" ? 400 : 409;
  res.status(status).json({
    error: "ward_invalid_transition",
    message: rejection.message,
    rejection: rejection.rejection,
    from: rejection.previous,
    to: rejection.next,
  });
}

function directTransition(action: ApprovableAction) {
  return (req: Request, res: Response) => {
    const { actor, reason } = (req.body ?? {}) as { actor?: string; reason?: string };
    const result = applyTransition({
      tenantId: tenantParam(req),
      action,
      actor: actor ?? "unknown",
      reason: reason ?? `Direct ${action} via API`,
    });
    if (!result.ok) {
      sendRejection(res, result);
      return;
    }
    res.json({ tenant: result.tenant, audit: result.audit });
  };
}

tenantsRouter.post("/:tenantId/constrain", requireControlAuth, directTransition("constrain"));
tenantsRouter.post("/:tenantId/pause", requireControlAuth, directTransition("pause"));
tenantsRouter.post("/:tenantId/resume", requireControlAuth, directTransition("resume"));

tenantsRouter.post("/:tenantId/approval", requireControlAuth, (req: Request, res: Response) => {
  const { action, actor, reason } = (req.body ?? {}) as {
    action?: unknown;
    actor?: string;
    reason?: string;
  };
  if (!isApprovableAction(action)) {
    res.status(400).json({
      error: "ward_invalid_action",
      message: `action must be one of: constrain, pause, resume`,
    });
    return;
  }
  getOrCreateTenant(tenantParam(req));
  const approval = requestApproval({
    tenantId: tenantParam(req),
    action,
    actor: actor ?? "unknown",
    reason: reason ?? "",
  });
  res.json({
    approvalToken: approval.approvalToken,
    requiredPhrase: approval.requiredPhrase,
    expiresAt: approval.expiresAt,
    action: approval.action,
    tenantId: approval.tenantId,
  });
});

tenantsRouter.post("/:tenantId/apply-approved-action", requireControlAuth, (req: Request, res: Response) => {
  const { approvalToken, phrase } = (req.body ?? {}) as {
    approvalToken?: string;
    phrase?: string;
  };
  if (!approvalToken || !phrase) {
    res.status(400).json({
      error: "ward_missing_fields",
      message: "approvalToken and phrase are required.",
    });
    return;
  }
  const consumed = consumeApproval({
    tenantId: tenantParam(req),
    approvalToken,
    phrase,
  });
  if (!consumed.ok) {
    res.status(400).json({ error: consumed.error, message: consumed.message });
    return;
  }
  const result = applyTransition({
    tenantId: tenantParam(req),
    action: consumed.approval.action,
    actor: consumed.approval.actor,
    reason: consumed.approval.reason,
    evidence: {
      approvalToken: consumed.approval.approvalToken,
      requiredPhrase: consumed.approval.requiredPhrase,
      approvedFlow: true,
    },
  });
  if (!result.ok) {
    sendRejection(res, result);
    return;
  }
  res.json({ tenant: result.tenant, audit: result.audit });
});

// RC3 Slice 3: per-tenant mode override. Body shape:
//   { mode: "inherit" | "observe" | "enforce",
//     actor?: string,
//     reason?: string }
// Response shape mirrors TransitionResult.
// Override changes are audited with action="mode_override_changed".
tenantsRouter.post("/:tenantId/mode", requireControlAuth, (req: Request, res: Response) => {
  const { mode, actor, reason } = (req.body ?? {}) as {
    mode?: unknown;
    actor?: string;
    reason?: string;
  };
  if (!isValidModeOverride(mode)) {
    res.status(400).json({
      error: "ward_invalid_mode_override",
      message: "mode must be one of: inherit, observe, enforce",
    });
    return;
  }
  const tenantIdParam = tenantParam(req);
  const { previous, next, record } = setModeOverride(tenantIdParam, mode);
  const event = logAudit({
    tenantId: tenantIdParam,
    action: "mode_override_changed",
    actor: actor ?? "unknown",
    reason: reason ?? "",
    evidence: {
      previousOverride: previous,
      nextOverride: next,
    },
  });
  res.json({ tenant: record, audit: event });
});
