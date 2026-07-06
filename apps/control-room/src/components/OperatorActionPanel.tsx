import { useState } from "react";
import { applyApprovedAction, directTransition, requestApproval } from "../api";
import type { ApprovableAction, ApprovalResponse, Tenant } from "../types";

// Approval flow UI. Mirrors the Ward API contract: request a
// short-lived single-use token, then echo the exact confirmation
// phrase to apply the action. Prototype boundary, not production RBAC.
export function OperatorActionPanel({
  tenant,
  onChanged,
}: {
  tenant: Tenant | null;
  onChanged: () => Promise<void>;
}) {
  const [action, setAction] = useState<ApprovableAction>("constrain");
  const [actor, setActor] = useState("demo-operator");
  const [reason, setReason] = useState("");
  const [approval, setApproval] = useState<ApprovalResponse | null>(null);
  const [phrase, setPhrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!tenant) {
    return (
      <div className="panel">
        <h2>Operator Actions</h2>
        <div className="empty">Select a tenant first.</div>
      </div>
    );
  }

  async function handleRequestApproval() {
    if (!tenant) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await requestApproval(tenant.tenantId, action, actor, reason);
      setApproval(response);
      setPhrase("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "approval request failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleApply() {
    if (!tenant || !approval) return;
    setBusy(true);
    setError(null);
    try {
      await applyApprovedAction(tenant.tenantId, approval.approvalToken, phrase);
      setNotice(`Applied: ${approval.action} ${tenant.tenantId}`);
      setApproval(null);
      setPhrase("");
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "apply failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDirect(directAction: ApprovableAction) {
    if (!tenant) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await directTransition(
        tenant.tenantId,
        directAction,
        actor,
        reason || `Direct ${directAction} from Control Room`
      );
      setNotice(`Applied: ${directAction} ${tenant.tenantId}`);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "action failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel">
      <h2>Operator Actions - {tenant.tenantId}</h2>
      <div className="field">
        <label>Actor</label>
        <input value={actor} onChange={(e) => setActor(e.target.value)} />
      </div>
      <div className="field">
        <label>Reason</label>
        <input
          value={reason}
          placeholder="e.g. Globex loop exceeded demo threshold"
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
      <div className="field">
        <label>Action (approval flow)</label>
        <select value={action} onChange={(e) => setAction(e.target.value as ApprovableAction)}>
          <option value="constrain">constrain</option>
          <option value="pause">pause</option>
          <option value="resume">resume</option>
        </select>
      </div>
      <div className="row">
        <button onClick={() => void handleRequestApproval()} disabled={busy}>
          Request approval
        </button>
      </div>
      {approval ? (
        <div className="approval-box">
          <div className="meta muted">
            Token issued (single-use, expires {approval.expiresAt}). Type the exact phrase to
            confirm:
          </div>
          <div style={{ margin: "6px 0" }}>
            <code>{approval.requiredPhrase}</code>
          </div>
          <div className="field">
            <input
              value={phrase}
              placeholder="type the confirmation phrase"
              onChange={(e) => setPhrase(e.target.value)}
            />
          </div>
          <button
            className="warn"
            onClick={() => void handleApply()}
            disabled={busy || phrase.length === 0}
          >
            Apply approved action
          </button>
        </div>
      ) : null}
      <div className="row">
        <span className="muted">Direct (skips approval — demo only):</span>
      </div>
      <div className="row">
        <button className="warn" onClick={() => void handleDirect("constrain")} disabled={busy}>
          Constrain
        </button>
        <button className="danger" onClick={() => void handleDirect("pause")} disabled={busy}>
          Pause
        </button>
        <button className="ok" onClick={() => void handleDirect("resume")} disabled={busy}>
          Resume
        </button>
      </div>
      {notice ? <div className="muted">{notice}</div> : null}
      {error ? <div className="error-box">{error}</div> : null}
    </div>
  );
}
