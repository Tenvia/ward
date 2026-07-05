import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  getOrCreateTenant,
  getTenant,
  listTenants,
  recordRequest,
  markPressure,
  setState,
  resetAllTenants,
  isValidModeOverride,
  setModeOverride,
} from "./tenantState.js";

let dateNowValues: number[] = [];
let dateNowIdx = 0;

function installDateNowStub(): () => void {
  dateNowValues = [];
  dateNowIdx = 0;
  const original = Date.now;
  Date.now = () => {
    const value = dateNowValues[dateNowIdx];
    return value ?? original();
  };
  return () => {
    Date.now = original;
  };
}

// Push a timestamp and advance the index so Date.now() returns it.
function ts(val: number): void {
  dateNowValues.push(val);
  dateNowIdx = dateNowValues.length - 1;
}

describe("tenantState", () => {
  beforeEach(() => {
    // Reset module state and clear any active Date stub.
    resetAllTenants();
    dateNowValues = [];
    dateNowIdx = 0;
  });

  // ── getOrCreateTenant ──────────────────────────────────────────────────

  it("returns an existing tenant without creating a new one", () => {
    const first = getOrCreateTenant("acme");
    const before = listTenants().length;
    const again = getOrCreateTenant("acme");
    assert.strictEqual(again, first);
    assert.strictEqual(listTenants().length, before);
  });

  it("creates a new tenant with default fields", () => {
    const record = getOrCreateTenant("acme");
    assert.strictEqual(record.tenantId, "acme");
    assert.strictEqual(record.state, "running");
    assert.strictEqual(record.requestCount, 0);
    assert.deepStrictEqual(record.recentRequestTimestamps, []);
    assert.strictEqual(record.detectedPressure, false);
    assert.strictEqual(record.lastPressureReason, null);
    assert.strictEqual(record.estimatedSpend, 0);
    assert.strictEqual(record.activeWorkflowRuns, 0);
    assert.ok(typeof record.updatedAt === "string");
  });

  // ── recordRequest ──────────────────────────────────────────────────────

  it("increments requestCount on each call", () => {
    // getOrCreateTenant and recordRequest share the same in-memory
    // record, so t1 and t2 are the same object reference. Capture
    // t1.requestCount into a local *value* before mutating, and
    // compare against the post-increment count.
    const t1 = getOrCreateTenant("acme");
    const before = t1.requestCount;
    recordRequest("acme");
    const t2 = getOrCreateTenant("acme");
    assert.strictEqual(t2.requestCount, before + 1);
  });

  it("creates the tenant if it does not exist before recording", () => {
    recordRequest("globex");
    const t = getOrCreateTenant("globex");
    assert.strictEqual(t.tenantId, "globex");
    assert.strictEqual(t.requestCount, 1);
  });

  it("accumulates estimatedSpend", () => {
    const before = getOrCreateTenant("acme").estimatedSpend;
    recordRequest("acme");
    recordRequest("acme");
    recordRequest("acme");
    const after = getOrCreateTenant("acme").estimatedSpend;
    assert.ok(after > before);
    assert.ok(Number.isFinite(after));
  });

  // ── markPressure ───────────────────────────────────────────────────────

  it("sets detectedPressure true and stores lastPressureReason", () => {
    markPressure("acme", "request loop");
    const t = getOrCreateTenant("acme");
    assert.strictEqual(t.detectedPressure, true);
    assert.strictEqual(t.lastPressureReason, "request loop");
  });

  // ── setState ──────────────────────────────────────────────────────────

  it("setState(running) clears the detectedPressure flag", () => {
    markPressure("acme", "loop");
    setState("acme", "constrained");
    setState("acme", "running");
    const t = getOrCreateTenant("acme");
    assert.strictEqual(t.state, "running");
    assert.strictEqual(t.detectedPressure, false);
  });

  it("setState(constrained) does NOT clear detectedPressure", () => {
    markPressure("acme", "loop");
    setState("acme", "constrained");
    const t = getOrCreateTenant("acme");
    assert.strictEqual(t.state, "constrained");
    assert.strictEqual(t.detectedPressure, true);
  });

  it("setState returns previous and next state", () => {
    const result = setState("acme", "paused");
    assert.strictEqual(result.previous, "running");
    assert.strictEqual(result.next, "paused");
  });

  // ── resetAllTenants ───────────────────────────────────────────────────

  it("resetAllTenants clears all tenant records", () => {
    getOrCreateTenant("t1");
    getOrCreateTenant("t2");
    assert.ok(listTenants().length >= 2);
    resetAllTenants();
    assert.strictEqual(listTenants().length, 0);
    assert.strictEqual(getTenant("t1"), undefined);
  });
});

// RC3 Slice 3: per-tenant mode override. Additive describe block; the
// original tenantState tests above remain untouched.
describe("tenantState modeOverride", () => {
  beforeEach(() => {
    resetAllTenants();
  });

  it("default modeOverride for a new tenant is 'inherit'", () => {
    const record = getOrCreateTenant("acme");
    assert.strictEqual(record.modeOverride, "inherit");
  });

  it("isValidModeOverride accepts the documented values and rejects the rest", () => {
    assert.strictEqual(isValidModeOverride("inherit"), true);
    assert.strictEqual(isValidModeOverride("observe"), true);
    assert.strictEqual(isValidModeOverride("enforce"), true);
    assert.strictEqual(isValidModeOverride("off"), false);
    assert.strictEqual(isValidModeOverride(""), false);
    assert.strictEqual(isValidModeOverride(null), false);
    assert.strictEqual(isValidModeOverride(undefined), false);
    assert.strictEqual(isValidModeOverride(42), false);
  });

  it("setModeOverride changes the override and returns previous/next", () => {
    const fresh = getOrCreateTenant("acme");
    assert.strictEqual(fresh.modeOverride, "inherit");
    const result = setModeOverride("acme", "observe");
    assert.strictEqual(result.previous, "inherit");
    assert.strictEqual(result.next, "observe");
    assert.strictEqual(result.record.modeOverride, "observe");
    const after = getOrCreateTenant("acme");
    assert.strictEqual(after.modeOverride, "observe");
  });

  it("setModeOverride rejects invalid values by throwing", () => {
    assert.throws(() => setModeOverride("acme", "off" as never), /invalid mode override/);
    assert.throws(() => setModeOverride("acme", "" as never), /invalid mode override/);
    assert.throws(() => setModeOverride("acme", null as never), /invalid mode override/);
  });
});
