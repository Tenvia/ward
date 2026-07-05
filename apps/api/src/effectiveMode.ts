// RC3 Slice 3: pure helper that computes the effective Ward mode for a
// given request. The global setting (WARD_MODE) is the default; the
// per-tenant override (inherit|observe|enforce) narrows or pins the
// tenant's effective mode. "inherit" defers to the global default;
// "observe" and "enforce" pin the tenant regardless of the global
// setting. Never used as a way to bypass enforcement.
import type { WardMode, WardModeOverride } from "./types.js";

export function effectiveWardMode(
  globalMode: WardMode,
  override: WardModeOverride
): WardMode {
  if (override === "inherit") return globalMode;
  return override;
}
