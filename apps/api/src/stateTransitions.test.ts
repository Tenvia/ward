import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canTransitionTenantState,
  explainRejection,
  isValidWardState,
} from "./stateTransitions.js";

describe("stateTransitions — isValidWardState", () => {
  it("accepts the three tenant states", () => {
    assert.strictEqual(isValidWardState("running"), true);
    assert.strictEqual(isValidWardState("constrained"), true);
    assert.strictEqual(isValidWardState("paused"), true);
  });

  it("rejects other strings, null, undefined, and numbers", () => {
    assert.strictEqual(isValidWardState("paused "), false);
    assert.strictEqual(isValidWardState(""), false);
    assert.strictEqual(isValidWardState("off"), false);
    assert.strictEqual(isValidWardState(null), false);
    assert.strictEqual(isValidWardState(undefined), false);
    assert.strictEqual(isValidWardState(0), false);
    assert.strictEqual(isValidWardState({}), false);
  });
});

describe("stateTransitions — allowed transitions", () => {
  const allowed: Array<["running" | "constrained" | "paused", "running" | "constrained" | "paused"]> = [
    ["running", "constrained"],
    ["running", "paused"],
    ["constrained", "running"],
    ["constrained", "paused"],
    ["paused", "running"],
  ];

  for (const [from, to] of allowed) {
    it(`${from} -> ${to} is allowed`, () => {
      assert.strictEqual(canTransitionTenantState(from, to), true);
    });
  }
});

describe("stateTransitions — rejected transitions", () => {
  it("paused -> constrained is rejected", () => {
    assert.strictEqual(canTransitionTenantState("paused", "constrained"), false);
  });

  it("same-state transitions are rejected for all three states", () => {
    assert.strictEqual(canTransitionTenantState("running", "running"), false);
    assert.strictEqual(canTransitionTenantState("constrained", "constrained"), false);
    assert.strictEqual(canTransitionTenantState("paused", "paused"), false);
  });

  it("explainRejection returns unsupported_transition for paused -> constrained", () => {
    const r = explainRejection("paused", "constrained");
    assert.strictEqual(r.reason, "unsupported_transition");
    assert.strictEqual(r.from, "paused");
    assert.strictEqual(r.to, "constrained");
    assert.match(r.message, /not in the allowed transition contract/);
  });

  it("explainRejection returns same_state with a clear message", () => {
    const r = explainRejection("running", "running");
    assert.strictEqual(r.reason, "same_state");
    assert.match(r.message, /already in 'running' state/);
  });

  it("explainRejection returns invalid_state for malformed targets", () => {
    // Cast: explainRejection types reject any non-TenantState at compile
    // time, but at runtime a string that isn't a known state lands here.
    const r = explainRejection("running" as never, "off" as never);
    assert.strictEqual(r.reason, "invalid_state");
  });
});
