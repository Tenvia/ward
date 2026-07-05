import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { getOrCreateTenant, getTenant, listTenants, recordRequest, markPressure, setState, resetAllTenants } from "./tenantState.js";

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
    resetAllTenants();
    dateNowValues = [];
    dateNowIdx = 0;
  });

  // ── getOrCreateTenant ─────────────────────────────────────────────────────

  it("returns an existing tenant without creating a new one", () => {
    const restore = installDateNowStub();
    try {
      const t1 = getOrCreateTenant("acme");
      t1.state = "paused";
      const t2 = getOrCreateTenant("acme");
      assert.strictEqual(t2.state, "paused");
      assert.strictEqual(t2.tenantId, "acme");
    } finally {
      restore();
    }
  });

  it("creates a new tenant with default fields", () => {
    const restore = installDateNowStub();
    try {
      const t = getOrCreateTenant("brand-new");
      assert.strictEqual(t.tenantId, "brand-new");
      assert.strictEqual(t.state, "running");
      assert.strictEqual(t.requestCount, 0);
      assert.strictEqual(t.detectedPressure, false);
      assert.strictEqual(t.lastPressureReason, null);
      assert.strictEqual(t.estimatedSpend, 0);
      assert.strictEqual(t.activeWorkflowRuns, 0);
    } finally {
      restore();
    }
  });

  // ── recordRequest ─────────────────────────────────────────────────────────

  it("increments requestCount on each call", () => {
    const restore = installDateNowStub();
    try {
      ts(Date.now()); // seed
      const t1 = recordRequest("acme");
      assert.strictEqual(t1.requestCount, 1);
      const t2 = recordRequest("acme");
      assert.strictEqual(t2.requestCount, 2);
      const t3 = recordRequest("acme");
      assert.strictEqual(t3.requestCount, 3);
    } finally {
      restore();
    }
  });

  it("creates the tenant if it does not exist before recording", () => {
    const restore = installDateNowStub();
    try {
      const t = recordRequest("unknown-tenant");
      assert.strictEqual(t.tenantId, "unknown-tenant");
      assert.strictEqual(t.requestCount, 1);
      assert.strictEqual(getTenant("unknown-tenant")?.requestCount, 1);
    } finally {
      restore();
    }
  });

  it("accumulates estimatedSpend", () => {
    const restore = installDateNowStub();
    try {
      // Install stub first so Date.now() is controlled.
      // Each stubbed Date.now() call returns the last-pushed ts; recordRequest
      // records Date.now() internally as the request timestamp, so all three
      // calls receive the same stubbed value (set by the first ts()).
      ts(Date.now());
      // default estimatedCostPerRequest = 0.002
      recordRequest("acme");
      recordRequest("acme");
      recordRequest("acme");
      const t = recordRequest("acme");
      assert.strictEqual(t.requestCount, 4);
      assert.strictEqual(t.estimatedSpend, 0.008);
    } finally {
      restore();
    }
  });

  // ── markPressure ─────────────────────────────────────────────────────────

  it("sets detectedPressure true and stores lastPressureReason", () => {
    const restore = installDateNowStub();
    try {
      const t = markPressure("acme", "too many loops");
      assert.strictEqual(t.detectedPressure, true);
      assert.strictEqual(t.lastPressureReason, "too many loops");
    } finally {
      restore();
    }
  });

  // ── setState ─────────────────────────────────────────────────────────────

  it("setState(running) clears the detectedPressure flag", () => {
    // First phase: create tenant and simulate pressure
    let restore = installDateNowStub();
    try {
      getOrCreateTenant("acme");
      markPressure("acme", "loop pressure");
      const t = getTenant("acme");
      assert.strictEqual(t!.detectedPressure, true);
    } finally {
      restore();
    }
    // Second phase: transition to running — pressure must clear
    restore = installDateNowStub();
    try {
      const result = setState("acme", "running");
      assert.strictEqual(result.previous, "running");
      assert.strictEqual(result.next, "running");
      const t = getTenant("acme");
      assert.strictEqual(t!.detectedPressure, false, "detectedPressure must be cleared on resume");
    } finally {
      restore();
    }
  });

  it("setState(constrained) does NOT clear detectedPressure", () => {
    // First phase: create tenant and simulate pressure
    let restore = installDateNowStub();
    try {
      getOrCreateTenant("acme");
      markPressure("acme", "loop detected");
    } finally {
      restore();
    }
    // Second phase: transition to constrained — pressure must remain
    restore = installDateNowStub();
    try {
      setState("acme", "constrained");
      const t = getTenant("acme");
      assert.strictEqual(t!.detectedPressure, true, "detectedPressure must NOT be cleared on non-running transition");
    } finally {
      restore();
    }
  });

  it("setState returns previous and next state", () => {
    const restore = installDateNowStub();
    try {
      getOrCreateTenant("acme");
      setState("acme", "paused");
      const result = setState("acme", "running");
      assert.strictEqual(result.previous, "paused");
      assert.strictEqual(result.next, "running");
    } finally {
      restore();
    }
  });

  // ── resetAllTenants ──────────────────────────────────────────────────────

  it("resetAllTenants clears all tenant records", () => {
    const restore = installDateNowStub();
    try {
      ts(Date.now());
      recordRequest("t1");
      recordRequest("t2");
      recordRequest("t3");
      assert.strictEqual(listTenants().length, 3);
    } finally {
      restore();
    }
    resetAllTenants();
    assert.strictEqual(listTenants().length, 0);
    assert.strictEqual(getTenant("t1"), undefined);
  });
});
