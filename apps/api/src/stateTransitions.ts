// RC3 Slice 4: explicit tenant state transition contract.
//
// Allowed transitions (matrix):
//   running      -> constrained | paused   (yes)
//   constrained  -> running    | paused    (yes)
//   paused       -> running                (yes; resume path, approval-supported)
//   paused       -> constrained            (NO — operator must resume first)
//   X            -> X                     (NO — rejected, not silently no-op'd)
//
// The helper is pure: it does not read or mutate tenant state itself.
// It is consulted by `applyTransition` (in tenants.ts) before delegating
// to `setState`. Rejections are surfaced as a `WardError` by the caller.
//
// This module has zero side effects and is unit-testable in isolation.
import type { TenantState } from "./types.js";

const VALID_STATES: ReadonlySet<TenantState> = new Set<TenantState>([
  "running",
  "constrained",
  "paused",
]);

export function isValidWardState(value: unknown): value is TenantState {
  return typeof value === "string" && VALID_STATES.has(value as TenantState);
}

// Explicit per-pair allow table. Each entry is a (from, to) pair; absence
// means the transition is rejected.
const ALLOWED_PAIRS: ReadonlySet<string> = new Set(
  [
    ["running", "constrained"],
    ["running", "paused"],
    ["constrained", "running"],
    ["constrained", "paused"],
    ["paused", "running"],
  ].map(([from, to]) => `${from}->${to}`)
);

export function canTransitionTenantState(
  from: TenantState,
  to: TenantState
): boolean {
  if (!isValidWardState(from) || !isValidWardState(to)) return false;
  if (from === to) return false;
  return ALLOWED_PAIRS.has(`${from}->${to}`);
}

export interface TransitionRejection {
  readonly reason:
    | "same_state"
    | "invalid_state"
    | "unsupported_transition";
  readonly from: TenantState | null;
  readonly to: TenantState | null;
  readonly message: string;
}

export function explainRejection(
  from: TenantState,
  to: TenantState
): TransitionRejection {
  if (!isValidWardState(from)) {
    return {
      reason: "invalid_state",
      from,
      to,
      message: `current state '${String(from)}' is not a recognized Ward tenant state`,
    };
  }
  if (!isValidWardState(to)) {
    return {
      reason: "invalid_state",
      from,
      to,
      message: `target state '${String(to)}' is not a recognized Ward tenant state`,
    };
  }
  if (from === to) {
    return {
      reason: "same_state",
      from,
      to,
      message: `tenant is already in '${from}' state; same-state transition is not allowed`,
    };
  }
  return {
    reason: "unsupported_transition",
    from,
    to,
    message: `transition from '${from}' to '${to}' is not in the allowed transition contract`,
  };
}
