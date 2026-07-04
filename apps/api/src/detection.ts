// Windowed pressure detection. Prototype only — a fixed-threshold
// heuristic over an in-memory sliding window, not a production signal
// engine. Detection flags pressure; it never auto-constrains in Phase 1.
import { config } from "./config.js";
import type { PressureResult, TenantRecord } from "./types.js";

export function detectPressure(record: TenantRecord): PressureResult {
  const cutoff = Date.now() - config.loopWindowMs;
  const requestsInWindow = record.recentRequestTimestamps.filter((ts) => ts >= cutoff).length;
  return {
    detected: requestsInWindow >= config.loopRequestThreshold,
    requestsInWindow,
    windowMs: config.loopWindowMs,
    threshold: config.loopRequestThreshold,
  };
}

export function pressureReason(result: PressureResult): string {
  return `Request loop pressure: ${result.requestsInWindow} requests in ${result.windowMs}ms (threshold ${result.threshold})`;
}
