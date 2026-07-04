// Null persistence: state lives only in the in-process caches
// (tenantState.ts, audit.ts). Restart loses everything. This is the
// default backend and preserves the original Phase 1 behavior.
import type { WardStorage } from "./types.js";

export function createMemoryStore(): WardStorage {
  return {
    kind: "memory",
    loadTenants: () => [],
    saveTenant: () => undefined,
    clearTenants: () => undefined,
    loadAuditEvents: () => [],
    appendAuditEvent: () => undefined,
    clearAudit: () => undefined,
  };
}
