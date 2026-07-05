import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { requestApproval, consumeApproval, resetApprovals } from "./approvals.js";
import { resetAudit } from "./audit.js";

// approvals and audit are in-memory; reset between every test.

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

describe("approvals", () => {
  beforeEach(() => {
    resetApprovals();
    resetAudit();
    dateNowValues = [];
    dateNowIdx = 0;
  });

  // ── requestApproval ─────────────────────────────────────────────────────

  it("issues an approval token and required phrase", () => {
    const restore = installDateNowStub();
    try {
      ts(Date.now()); // seed stub
      const record = requestApproval({
        tenantId: "acme",
        action: "constrain",
        actor: "op1",
        reason: "high spend",
      });
      assert.ok(record.approvalToken.startsWith("ward_"));
      assert.strictEqual(record.tenantId, "acme");
      assert.strictEqual(record.action, "constrain");
      assert.strictEqual(record.actor, "op1");
      assert.strictEqual(record.requiredPhrase, "constrain acme");
      assert.strictEqual(record.used, false);
      assert.ok(record.expiresAt.length > 0);
    } finally {
      restore();
    }
  });

  it("each call generates a unique token", () => {
    const restore = installDateNowStub();
    try {
      ts(Date.now());
      const r1 = requestApproval({ tenantId: "acme", action: "pause", actor: "op", reason: "x" });
      const r2 = requestApproval({ tenantId: "acme", action: "pause", actor: "op", reason: "x" });
      assert.notStrictEqual(r1.approvalToken, r2.approvalToken);
    } finally {
      restore();
    }
  });

  // ── consumeApproval — phrase mismatch ─────────────────────────────────

  it("rejects a wrong confirmation phrase", () => {
    const restore = installDateNowStub();
    try {
      ts(Date.now());
      const { approvalToken } = requestApproval({
        tenantId: "acme",
        action: "pause",
        actor: "op",
        reason: "too many loops",
      });
      const result = consumeApproval({
        tenantId: "acme",
        approvalToken,
        phrase: "wrong phrase",
      });
      assert.strictEqual(result.ok, false);
      if (!result.ok) {
        assert.strictEqual(result.error, "ward_approval_phrase_mismatch");
      }
    } finally {
      restore();
    }
  });

  // ── consumeApproval — tenant mismatch ─────────────────────────────────

  it("rejects a tenant mismatch", () => {
    const restore = installDateNowStub();
    try {
      ts(Date.now());
      const { approvalToken } = requestApproval({
        tenantId: "acme",
        action: "constrain",
        actor: "op",
        reason: "spend",
      });
      const result = consumeApproval({
        tenantId: "other-tenant",
        approvalToken,
        phrase: "constrain acme",
      });
      assert.strictEqual(result.ok, false);
      if (!result.ok) {
        assert.strictEqual(result.error, "ward_approval_tenant_mismatch");
      }
    } finally {
      restore();
    }
  });

  // ── consumeApproval — expired token ────────────────────────────────────

  it("rejects an expired token", () => {
    // Phase 1: issue at stubbed time T
    let restore = installDateNowStub();
    let token = "";
    try {
      ts(Date.now()); // stubbed seed
      const record = requestApproval({
        tenantId: "acme",
        action: "resume",
        actor: "op",
        reason: "cool down",
      });
      token = record.approvalToken;
      // expiresAt = T + 120_000 ms; save T so we can compute T + 200_000
    } finally {
      restore();
    }
    // Phase 2: advance clock to T + 200_000 ms (well past 120 s TTL)
    // dateNowValues[0] holds the stubbed T from phase 1; compute future from it.
    const issueTime = dateNowValues[0] as number;
    restore = installDateNowStub();
    try {
      ts(issueTime + 200_000); // stubbed future time
      const result = consumeApproval({
        tenantId: "acme",
        approvalToken: token,
        phrase: "resume acme",
      });
      assert.strictEqual(result.ok, false);
      if (!result.ok) {
        assert.strictEqual(result.error, "ward_approval_expired");
      }
    } finally {
      restore();
    }
  });

  // ── consumeApproval — single-use ──────────────────────────────────────

  it("consumes the token on success and the token cannot be reused", () => {
    const restore = installDateNowStub();
    try {
      ts(Date.now());
      const { approvalToken, requiredPhrase } = requestApproval({
        tenantId: "acme",
        action: "pause",
        actor: "op",
        reason: "looping",
      });
      const result1 = consumeApproval({
        tenantId: "acme",
        approvalToken,
        phrase: requiredPhrase,
      });
      assert.strictEqual(result1.ok, true);

      // Second attempt with the same token must fail — token is deleted
      const result2 = consumeApproval({
        tenantId: "acme",
        approvalToken,
        phrase: requiredPhrase,
      });
      assert.strictEqual(result2.ok, false);
      if (!result2.ok) {
        assert.strictEqual(result2.error, "ward_approval_not_found");
      }
    } finally {
      restore();
    }
  });

  it("returns the approval record on success", () => {
    const restore = installDateNowStub();
    try {
      ts(Date.now());
      const { approvalToken, requiredPhrase, tenantId, action, actor, reason } =
        requestApproval({
          tenantId: "acme",
          action: "constrain",
          actor: "admin",
          reason: "cost limit",
        });
      const result = consumeApproval({
        tenantId,
        approvalToken,
        phrase: requiredPhrase,
      });
      assert.strictEqual(result.ok, true);
      if (result.ok) {
        assert.strictEqual(result.approval.action, action);
        assert.strictEqual(result.approval.actor, actor);
        assert.strictEqual(result.approval.reason, reason);
        assert.strictEqual(result.approval.used, true);
      }
    } finally {
      restore();
    }
  });
});
