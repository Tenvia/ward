import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { detectPressure } from "./detection.js";
import type { TenantRecord } from "./types.js";
import { config } from "./config.js";

// detectPressure is pure — no module state to reset.
// All behavior is derived from the passed TenantRecord and Date.now().

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

function ts(val: number): void {
  dateNowValues.push(val);
  dateNowIdx = dateNowValues.length - 1;
}

// RC3 Slice 3: TenantRecord now requires modeOverride. Tests that build
// a TenantRecord literal use "inherit" so behavior matches the default
// observed at runtime.
function baseRecord(
  now: number,
  ts: ReadonlyArray<number>,
  overrides: Partial<TenantRecord> = {}
): TenantRecord {
  return {
    tenantId: "acme",
    state: "running",
    requestCount: 0,
    recentRequestTimestamps: [...ts],
    detectedPressure: false,
    lastPressureReason: null,
    estimatedSpend: 0,
    activeWorkflowRuns: 0,
    deploymentMode: "local",
    modeOverride: "inherit",
    updatedAt: new Date(now).toISOString(),
    ...overrides,
  };
}

describe("detectPressure", () => {
  beforeEach(() => {
    dateNowValues = [];
    dateNowIdx = 0;
  });

  it("returns detected=false when request count is below threshold", () => {
    const restore = installDateNowStub();
    try {
      const now = Date.now(); // stubbed
      ts(now);               // make it the active stub value

      const record = baseRecord(
        now,
        Array.from(
          { length: config.loopRequestThreshold - 1 },
          (_, i) => now - i * 10
        )
      );
      const result = detectPressure(record);
      assert.strictEqual(result.detected, false);
      assert.strictEqual(result.requestsInWindow, config.loopRequestThreshold - 1);
      assert.strictEqual(result.windowMs, config.loopWindowMs);
      assert.strictEqual(result.threshold, config.loopRequestThreshold);
    } finally {
      restore();
    }
  });

  it("returns detected=true when request count equals threshold", () => {
    const restore = installDateNowStub();
    try {
      const now = Date.now();
      ts(now);

      const record = baseRecord(
        now,
        Array.from({ length: config.loopRequestThreshold }, () => now - 1)
      );
      const result = detectPressure(record);
      assert.strictEqual(result.detected, true);
      assert.strictEqual(result.requestsInWindow, config.loopRequestThreshold);
    } finally {
      restore();
    }
  });

  it("ignores timestamps older than loopWindowMs", () => {
    const restore = installDateNowStub();
    try {
      const now = Date.now();
      ts(now);

      // One timestamp inside the window, one just outside
      const insideTs = now - 500;                      // well within 10 s
      const outsideTs = now - config.loopWindowMs - 1; // just past the boundary

      const record = baseRecord(now, [insideTs, outsideTs]);
      const result = detectPressure(record);
      // Only the inside timestamp should be counted
      assert.strictEqual(result.requestsInWindow, 1);
      assert.strictEqual(result.detected, false);
    } finally {
      restore();
    }
  });

  it("counts all timestamps within the window and ignores those just outside", () => {
    const restore = installDateNowStub();
    try {
      const now = Date.now();
      ts(now);

      const inside = now - 100;                       // inside
      const insideHalf = now - config.loopWindowMs / 2; // inside
      const outside = now - config.loopWindowMs - 1;  // just outside
      const far = now - config.loopWindowMs * 2;       // way outside

      const record = baseRecord(now, [inside, insideHalf, outside, far]);
      const result = detectPressure(record);
      assert.strictEqual(result.requestsInWindow, 2);
      assert.strictEqual(result.detected, false);
    } finally {
      restore();
    }
  });
});
