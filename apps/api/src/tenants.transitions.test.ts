// RC3 Slice 4: tests for the wire-through contract check inside
// applyTransition. These exercise the integration with the in-memory
// tenant state module; they do not require a running server.
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  applyTransition,
} from "./tenants.js";
import { listAudit, resetAudit } from "./audit.js";
import { resetAllTenants } from "./tenantState.js";

describe("tenants.applyTransition — contract enforcement", () => {
  beforeEach(() => {
    resetAllTenants();
    resetAudit();
  });

  it("allows running -> constrained and captures previous/next in audit", () => {
    const result = applyTransition({
      tenantId: "t_running_to_constrained",
      action: "constrain",
      actor: "smoke-transition",
      reason: "test",
    });
    assert.strictEqual(result.ok, true);
    if (!result.ok) return;
    assert.strictEqual(result.previous, "running");
    assert.strictEqual(result.next, "constrained");
    assert.strictEqual(result.audit.action, "constrain");
    assert.strictEqual(result.audit.previousState, "running");
    assert.strictEqual(result.audit.nextState, "constrained");
    assert.strictEqual(result.audit.actor, "smoke-transition");
    assert.strictEqual(result.audit.reason, "test");
    assert.strictEqual(result.audit.schemaVersion, 1);
  });

  it("rejects paused -> constrained with reason=unsupported_transition", () => {
    applyTransition({
      tenantId: "t_paused_to_constrained",
      action: "pause",
      actor: "smoke",
      reason: "go paused first",
    });
    const result = applyTransition({
      tenantId: "t_paused_to_constrained",
      action: "constrain",
      actor: "smoke",
      reason: "should be rejected",
    });
    assert.strictEqual(result.ok, false);
    if (result.ok) return;
    assert.strictEqual(result.rejection, "unsupported_transition");
    assert.strictEqual(result.previous, "paused");
    assert.strictEqual(result.next, "constrained");
    assert.match(result.message, /not in the allowed transition contract/);
    // Audit must not contain the rejected action.
    const actions = listAudit().map((e) => e.action);
    assert.ok(!actions.includes("constrain"));
  });

  it("rejects same-state transition with reason=same_state", () => {
    applyTransition({
      tenantId: "t_same_state",
      action: "constrain",
      actor: "smoke",
      reason: "first",
    });
    const result = applyTransition({
      tenantId: "t_same_state",
      action: "constrain",
      actor: "smoke",
      reason: "second (rejected)",
    });
    assert.strictEqual(result.ok, false);
    if (result.ok) return;
    assert.strictEqual(result.rejection, "same_state");
    assert.match(result.message, /already in 'constrained' state/);
  });

  it("allows the full five-step allowed chain", () => {
    const expect = [
      { action: "constrain" as const, from: "running", to: "constrained" },
      { action: "pause" as const, from: "constrained", to: "paused" },
      { action: "resume" as const, from: "paused", to: "running" },
      { action: "pause" as const, from: "running", to: "paused" },
      { action: "resume" as const, from: "paused", to: "running" },
    ];

    const tenantId = "t_chain";
    for (const step of expect) {
      const r = applyTransition({
        tenantId,
        action: step.action,
        actor: "smoke",
        reason: "chain",
      });
      assert.strictEqual(r.ok, true, `expected ${step.from}->${step.to} to be allowed`);
      if (!r.ok) return;
      assert.strictEqual(r.previous, step.from);
      assert.strictEqual(r.next, step.to);
    }
  });
});
