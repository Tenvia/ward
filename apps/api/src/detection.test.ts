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

describe("detectPressure", () => {
  beforeEach(() => {
    dateNowValues = [];
    dateNowIdx = 0;
  });

  it("returns detected=false when request count is below threshold", () => {
    // Install stub FIRST so Date.now() is controlled; use it to capture the stubbed value.
    const restore = installDateNowStub();
    try {
      const now = Date.now(); // stubbed
      ts(now);               // make it the active stub value

      const record: TenantRecord = {
        tenantId: "acme",
        state: "running",
        requestCount: 0,
        recentRequestTimestamps: Array.from(
          { length: config.loopRequestThreshold - 1 },
          (_, i) => now - i * 10,
        ),
        detectedPressure: false,
        lastPressureReason: null,
        estimatedSpend: 0,
        activeWorkflowRuns: 0,
        deploymentMode: "local",
        updatedAt: new Date(now).toISOString(),
      };
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

      const record: TenantRecord = {
        tenantId: "acme",
        state: "running",
        requestCount: 0,
        recentRequestTimestamps: Array.from(
          { length: config.loopRequestThreshold },
          () => now - 1,
        ),
        detectedPressure: false,
        lastPressureReason: null,
        estimatedSpend: 0,
        activeWorkflowRuns: 0,
        deploymentMode: "local",
        updatedAt: new Date(now).toISOString(),
      };
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

      const record: TenantRecord = {
        tenantId: "acme",
        state: "running",
        requestCount: 0,
        recentRequestTimestamps: [insideTs, outsideTs],
        detectedPressure: false,
        lastPressureReason: null,
        estimatedSpend: 0,
        activeWorkflowRuns: 0,
        deploymentMode: "local",
        updatedAt: new Date(now).toISOString(),
      };
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

      // 5 timestamps just inside the window, 3 timestamps well outside
      const justInside = Array.from({ length: 5 }, (_, i) => now - (500 + i * 10));
      const farOutside = Array.from(
        { length: 3 },
        (_, i) => now - config.loopWindowMs - 100 - i * 1000,
      );

      const record: TenantRecord = {
        tenantId: "acme",
        state: "running",
        requestCount: 0,
        recentRequestTimestamps: [...justInside, ...farOutside],
        detectedPressure: false,
        lastPressureReason: null,
        estimatedSpend: 0,
        activeWorkflowRuns: 0,
        deploymentMode: "local",
        updatedAt: new Date(now).toISOString(),
      };
      const result = detectPressure(record);
      assert.strictEqual(result.requestsInWindow, 5);
      assert.strictEqual(result.detected, false); // 5 < default threshold of 8
    } finally {
      restore();
    }
  });
});
