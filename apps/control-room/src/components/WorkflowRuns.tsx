import { useState } from "react";
import { cancelWorkflowRun, createWorkflowRun } from "../api";
import type { Tenant, WorkflowRun } from "../types";

export function WorkflowRuns({
  runs,
  selectedTenant,
  onChanged,
}: {
  runs: WorkflowRun[];
  selectedTenant: Tenant | null;
  onChanged: () => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleCreate() {
    if (!selectedTenant) return;
    setBusy(true);
    setError(null);
    try {
      await createWorkflowRun(selectedTenant.tenantId, "mock");
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "create failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel(runId: string) {
    setError(null);
    try {
      await cancelWorkflowRun(runId);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "cancel failed");
    }
  }

  return (
    <div className="panel">
      <h2>Workflow Runs</h2>
      <div className="row">
        <button onClick={() => void handleCreate()} disabled={busy || !selectedTenant}>
          Start mock run{selectedTenant ? ` for ${selectedTenant.tenantId}` : ""}
        </button>
        <span className="muted">
          mock runner: implemented / docker + kubernetes runners: planned adapters
        </span>
      </div>
      {error ? <div className="error-box">{error}</div> : null}
      {runs.length === 0 ? (
        <div className="empty">No workflow runs yet.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Run</th>
              <th>Tenant</th>
              <th>Runner</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id}>
                <td>
                  {run.id}
                  {run.error ? <div className="meta muted">{run.error}</div> : null}
                </td>
                <td>{run.tenantId}</td>
                <td>{run.runner}</td>
                <td>{run.status}</td>
                <td>
                  {run.status === "queued" || run.status === "running" ? (
                    <button onClick={() => void handleCancel(run.id)}>cancel</button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
