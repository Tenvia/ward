// Storage abstraction so tenant state and audit persistence are
// swappable. Phase 1 backends: memory (default, no persistence) and
// sqlite (prototype, node:sqlite). Workflow runs and approval tokens
// intentionally stay in-memory for now.
import type { AuditEvent, TenantRecord } from "../types.js";

export type StorageKind = "memory" | "sqlite";

export interface WardStorage {
  kind: StorageKind;
  loadTenants(): TenantRecord[];
  saveTenant(record: TenantRecord): void;
  clearTenants(): void;
  loadAuditEvents(): AuditEvent[];
  appendAuditEvent(event: AuditEvent): void;
  clearAudit(): void;
}
