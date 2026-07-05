// Tenant control endpoints: list/inspect, direct state transitions,
// and the operator approval flow. Prototype only — no production RBAC;
// these endpoints are open on the local network.
//
// RC3 Slice 3: added POST /:tenantId/mode to set a per-tenant mode
// override (inherit | observe | enforce). Override changes are audited
// with action="mode_override_changed" carrying previousOverride and
// nextOverride in evidence.
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
import type { ApprovableAction, TenantState } from "./types.js";

export const tenantsRouter = Router();

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

function applyTransition(input: {
  tenantId: string;
  action: ApprovableAction;
  actor: string;
  reason: string;
  evidence?: Record<string, unknown>;
}) {
  const { previous, next } = setState(input.tenantId, ACTION_TO_STATE[input.action]);
  const event = logAudit({
    tenantId: input.tenantId,
    action: input.action,
    actor: input.actor,
    reason: input.reason,
    previousState: previous,
    nextState: next,
    ...(input.evidence !== undefined ? { evidence: input.evidence } : {}),
  });
  return { tenant: getTenant(input.tenantId), audit: event };
}

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

function directTransition(action: ApprovableAction) {
  return (req: Request, res: Response) => {
    const { actor, reason } = (req.body ?? {}) as { actor?: string; reason?: string };
    const result = applyTransition({
      tenantId: tenantParam(req),
      action,
      actor: actor ?? "unknown",
      reason: reason ?? `Direct ${action} via API`,
    });
    res.json(result);
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
  res.json(result);
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
