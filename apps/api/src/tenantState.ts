// Tenant state store: in-process Map cache with write-through to the
// configured storage backend. With the default memory backend this is
// lost on restart; with WARD_STORAGE=sqlite, tenants are rehydrated
// on boot (prototype persistence, not production storage).
import { config } from "./config.js";
import { storage } from "./storage/index.js";
import type { TenantRecord, TenantState, WardModeOverride } from "./types.js";

const tenants = new Map<string, TenantRecord>();
for (const record of storage.loadTenants()) {
  // Pre-Slice-3 SQLite rows may lack modeOverride; treat as "inherit".
  if (!record.modeOverride) {
    record.modeOverride = "inherit";
  }
  tenants.set(record.tenantId, record);
}

function nowIso(): string {
  return new Date().toISOString();
}

// Allowed override values for the public API. Keep aligned with
// WardModeOverride in types.ts; defined locally to avoid widening the
// public type surface.
const ALLOWED_MODE_OVERRIDES: ReadonlySet<WardModeOverride> = new Set([
  "inherit",
  "observe",
  "enforce",
]);

export function isValidModeOverride(value: unknown): value is WardModeOverride {
  return typeof value === "string" && ALLOWED_MODE_OVERRIDES.has(value as WardModeOverride);
}

export function getOrCreateTenant(tenantId: string): TenantRecord {
  let record = tenants.get(tenantId);
  if (!record) {
    record = {
      tenantId,
      state: "running",
      requestCount: 0,
      recentRequestTimestamps: [],
      detectedPressure: false,
      lastPressureReason: null,
      estimatedSpend: 0,
      activeWorkflowRuns: 0,
      deploymentMode: config.deploymentMode,
      modeOverride: "inherit",
      updatedAt: nowIso(),
    };
    tenants.set(tenantId, record);
    storage.saveTenant(record);
  } else if (!record.modeOverride) {
    // Lazy backfill for legacy rows.
    record.modeOverride = "inherit";
  }
  return record;
}

export function getTenant(tenantId: string): TenantRecord | undefined {
  return tenants.get(tenantId);
}

export function listTenants(): TenantRecord[] {
  return Array.from(tenants.values());
}

export function recordRequest(tenantId: string): TenantRecord {
  const record = getOrCreateTenant(tenantId);
  const t = Date.now();
  record.requestCount += 1;
  record.recentRequestTimestamps.push(t);
  record.estimatedSpend = round(record.estimatedSpend + config.estimatedCostPerRequest);
  record.recentRequestTimestamps = record.recentRequestTimestamps.filter(
    (ts) => t - ts <= config.loopWindowMs
  );
  record.updatedAt = nowIso();
  storage.saveTenant(record);
  return record;
}

export function markPressure(tenantId: string, reason: string): TenantRecord {
  const record = getOrCreateTenant(tenantId);
  record.detectedPressure = true;
  record.lastPressureReason = reason;
  record.updatedAt = nowIso();
  storage.saveTenant(record);
  return record;
}

export function setState(
  tenantId: string,
  state: TenantState
): { previous: TenantState; next: TenantState } {
  const record = getOrCreateTenant(tenantId);
  const previous = record.state;
  record.state = state;
  if (state === "running") {
    // Resume clears the pressure flag; a new loop will re-flag it.
    record.detectedPressure = false;
  }
  record.updatedAt = nowIso();
  storage.saveTenant(record);
  return { previous, next: state };
}

export function setModeOverride(
  tenantId: string,
  override: WardModeOverride
): { previous: WardModeOverride; next: WardModeOverride; record: TenantRecord } {
  if (!isValidModeOverride(override)) {
    throw new Error(`invalid mode override: ${String(override)}`);
  }
  const record = getOrCreateTenant(tenantId);
  const previous: WardModeOverride = record.modeOverride ?? "inherit";
  record.modeOverride = override;
  record.updatedAt = nowIso();
  storage.saveTenant(record);
  return { previous, next: override, record };
}

export function adjustActiveWorkflowRuns(tenantId: string, delta: number): void {
  const record = getOrCreateTenant(tenantId);
  record.activeWorkflowRuns = Math.max(0, record.activeWorkflowRuns + delta);
  record.updatedAt = nowIso();
  storage.saveTenant(record);
}

export function resetAllTenants(): void {
  tenants.clear();
  storage.clearTenants();
}

function round(n: number): number {
  return Math.round(n * 10000) / 10000;
}
