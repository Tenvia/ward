// Operator approval-token flow, implemented natively in Ward.
//
// Pattern: short-lived, single-use, tenant-bound, action-bound token
// plus an exact confirmation phrase the operator must echo back.
// Inspired by Saastle's confirmation-token boundary; no Saastle runtime
// dependency. In-memory only. Not production RBAC.
import { randomBytes } from "node:crypto";
import { config } from "./config.js";
import { logAudit } from "./audit.js";
import type { ApprovableAction, ApprovalRecord } from "./types.js";

const APPROVABLE_ACTIONS: ApprovableAction[] = ["constrain", "pause", "resume"];

const approvals = new Map<string, ApprovalRecord>();

export function isApprovableAction(action: unknown): action is ApprovableAction {
  return typeof action === "string" && APPROVABLE_ACTIONS.includes(action as ApprovableAction);
}

export function requestApproval(input: {
  tenantId: string;
  action: ApprovableAction;
  actor: string;
  reason: string;
}): ApprovalRecord {
  const approvalToken = `ward_${randomBytes(16).toString("hex")}`;
  const record: ApprovalRecord = {
    approvalToken,
    tenantId: input.tenantId,
    action: input.action,
    actor: input.actor,
    reason: input.reason,
    requiredPhrase: `${input.action} ${input.tenantId}`,
    expiresAt: new Date(Date.now() + config.approvalTtlMs).toISOString(),
    used: false,
  };
  approvals.set(approvalToken, record);
  logAudit({
    tenantId: input.tenantId,
    action: "approval_requested",
    actor: input.actor,
    reason: input.reason,
    evidence: {
      approvalAction: input.action,
      requiredPhrase: record.requiredPhrase,
      expiresAt: record.expiresAt,
    },
  });
  return record;
}

export type ConsumeResult =
  | { ok: true; approval: ApprovalRecord }
  | { ok: false; error: string; message: string };

export function consumeApproval(input: {
  tenantId: string;
  approvalToken: string;
  phrase: string;
}): ConsumeResult {
  const record = approvals.get(input.approvalToken);
  if (!record) {
    return {
      ok: false,
      error: "ward_approval_not_found",
      message: "Approval token not found. Request a new approval.",
    };
  }
  if (record.used) {
    return {
      ok: false,
      error: "ward_approval_already_used",
      message: "Approval token has already been used. Tokens are single-use.",
    };
  }
  if (record.tenantId !== input.tenantId) {
    return {
      ok: false,
      error: "ward_approval_tenant_mismatch",
      message: `Approval token is bound to ${record.tenantId}, not ${input.tenantId}.`,
    };
  }
  if (Date.now() > Date.parse(record.expiresAt)) {
    approvals.delete(input.approvalToken);
    return {
      ok: false,
      error: "ward_approval_expired",
      message: "Approval token has expired. Request a new approval.",
    };
  }
  if (record.requiredPhrase !== input.phrase) {
    return {
      ok: false,
      error: "ward_approval_phrase_mismatch",
      message: `Confirmation phrase must match exactly: "${record.requiredPhrase}"`,
    };
  }
  record.used = true;
  approvals.delete(input.approvalToken);
  return { ok: true, approval: record };
}

export function resetApprovals(): void {
  approvals.clear();
}
