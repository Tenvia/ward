// Audit trail: in-process array with write-through to the configured
// storage backend. Memory backend (default): lost on restart. SQLite
// backend: events are rehydrated on boot (prototype persistence).
import { storage } from "./storage/index.js";
import type { AuditEvent } from "./types.js";

const events: AuditEvent[] = [...storage.loadAuditEvents()];
let counter = events.reduce((max, e) => {
  const n = Number(e.id.replace("audit_", ""));
  return Number.isFinite(n) && n > max ? n : max;
}, 0);

export function logAudit(input: {
  tenantId: string;
  action: string;
  actor?: string;
  reason?: string;
  previousState?: string;
  nextState?: string;
  evidence?: Record<string, unknown>;
}): AuditEvent {
  counter += 1;
  const event: AuditEvent = {
    id: `audit_${counter}`,
    timestamp: new Date().toISOString(),
    tenantId: input.tenantId,
    action: input.action,
    actor: input.actor ?? "unknown",
    reason: input.reason ?? "",
    ...(input.previousState !== undefined ? { previousState: input.previousState } : {}),
    ...(input.nextState !== undefined ? { nextState: input.nextState } : {}),
    ...(input.evidence !== undefined ? { evidence: input.evidence } : {}),
  };
  events.push(event);
  storage.appendAuditEvent(event);
  return event;
}

export function listAudit(): AuditEvent[] {
  return [...events];
}

export function resetAudit(): void {
  events.length = 0;
  counter = 0;
  storage.clearAudit();
}
