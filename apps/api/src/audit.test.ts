import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { logAudit, listAudit, resetAudit } from "./audit.js";

// Audit state lives in the same in-process array on the module.
// Each test gets a clean slate via resetAudit.

describe("audit", () => {
  beforeEach(() => {
    resetAudit();
  });

  // ── logAudit ────────────────────────────────────────────────────────────

  it("appends an event and returns it with a sequential id", () => {
    const ev1 = logAudit({ tenantId: "acme", action: "constrain" });
    assert.strictEqual(ev1.id, "audit_1");
    assert.strictEqual(ev1.tenantId, "acme");
    assert.strictEqual(ev1.action, "constrain");
    assert.ok(ev1.timestamp.length > 0);

    const ev2 = logAudit({ tenantId: "acme", action: "resume" });
    assert.strictEqual(ev2.id, "audit_2");
  });

  it("fills in optional fields with defaults", () => {
    const ev = logAudit({ tenantId: "acme", action: "pause" });
    assert.strictEqual(ev.actor, "unknown");
    assert.strictEqual(ev.reason, "");
  });

  it("records actor, reason, previousState, nextState, and evidence when provided", () => {
    const ev = logAudit({
      tenantId: "acme",
      action: "state_change",
      actor: "admin",
      reason: "cooling down",
      previousState: "running",
      nextState: "paused",
      evidence: { loopCount: 42 },
    });
    assert.strictEqual(ev.actor, "admin");
    assert.strictEqual(ev.reason, "cooling down");
    assert.strictEqual(ev.previousState, "running");
    assert.strictEqual(ev.nextState, "paused");
    assert.deepStrictEqual(ev.evidence, { loopCount: 42 });
  });

  // ── listAudit ──────────────────────────────────────────────────────────

  it("returns all logged events in order", () => {
    logAudit({ tenantId: "t1", action: "a" });
    logAudit({ tenantId: "t2", action: "b" });
    logAudit({ tenantId: "t3", action: "c" });
    const events = listAudit();
    assert.strictEqual(events.length, 3);
    assert.strictEqual(events[0]!.tenantId, "t1");
    assert.strictEqual(events[1]!.tenantId, "t2");
    assert.strictEqual(events[2]!.tenantId, "t3");
  });

  it("listAudit returns a copy — mutating the list does not affect internal state", () => {
    logAudit({ tenantId: "acme", action: "test" });
    const events = listAudit();
    events.length = 0;
    const again = listAudit();
    assert.strictEqual(again.length, 1);
  });

  // ── resetAudit ─────────────────────────────────────────────────────────

  it("resetAudit clears all events and resets the counter", () => {
    logAudit({ tenantId: "acme", action: "first" });
    logAudit({ tenantId: "acme", action: "second" });
    assert.strictEqual(listAudit().length, 2);

    resetAudit();

    assert.strictEqual(listAudit().length, 0);
    // Next event should resume from id audit_1
    const ev = logAudit({ tenantId: "acme", action: "after-reset" });
    assert.strictEqual(ev.id, "audit_1");
  });
});
