import { useCallback, useEffect, useState } from "react";
import {
  fetchAudit,
  fetchHealth,
  fetchTenants,
  fetchWorkflowRuns,
  getControlToken,
  setControlToken,
} from "./api";
import type { AuditEvent, HealthResponse, Tenant, WorkflowRun } from "./types";
import { TenantList } from "./components/TenantList";
import { TenantDetail } from "./components/TenantDetail";
import { IncidentPanel } from "./components/IncidentPanel";
import { WorkflowRuns } from "./components/WorkflowRuns";
import { OperatorActionPanel } from "./components/OperatorActionPanel";
import { AuditTimeline } from "./components/AuditTimeline";
import { DeploymentModeBadge } from "./components/DeploymentModeBadge";

const POLL_INTERVAL_MS = 2000;

export function App() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [nextTenants, nextRuns, nextAudit, nextHealth] = await Promise.all([
        fetchTenants(),
        fetchWorkflowRuns(),
        fetchAudit(),
        fetchHealth(),
      ]);
      setTenants(nextTenants);
      setRuns(nextRuns);
      setAudit(nextAudit);
      setHealth(nextHealth);
      setConnectionError(null);
    } catch (err) {
      setConnectionError(err instanceof Error ? err.message : "Ward API unreachable");
    }
  }, []);

  useEffect(() => {
    void refresh();
    const handle = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(handle);
  }, [refresh]);

  const selectedTenant =
    tenants.find((t) => t.tenantId === selectedTenantId) ?? tenants[0] ?? null;

  return (
    <>
      <div className="header">
        <h1>WARD CONTROL ROOM</h1>
        {health ? <DeploymentModeBadge mode={health.deploymentMode} /> : null}
        <span className="sub">
          {health
            ? `api ok / upstream ${health.upstreamMode}`
            : "connecting to ward api..."}
        </span>
        <span className="sub">prototype - not production auth</span>
        <span className="sub" style={{ marginLeft: "auto" }}>
          <input
            style={{ width: 180 }}
            type="password"
            placeholder="control token (if required)"
            defaultValue={getControlToken()}
            onChange={(e) => setControlToken(e.target.value)}
            aria-label="control token"
          />
        </span>
      </div>
      {connectionError ? (
        <div className="panel error-box" style={{ margin: 12 }}>
          Ward API unreachable at the configured base URL: {connectionError}
        </div>
      ) : null}
      <div className="layout">
        <div>
          <TenantList
            tenants={tenants}
            selectedTenantId={selectedTenant?.tenantId ?? null}
            onSelect={setSelectedTenantId}
          />
          <IncidentPanel tenants={tenants} onSelect={setSelectedTenantId} />
        </div>
        <div>
          <TenantDetail tenant={selectedTenant} />
          <WorkflowRuns runs={runs} selectedTenant={selectedTenant} onChanged={refresh} />
        </div>
        <div>
          <OperatorActionPanel tenant={selectedTenant} onChanged={refresh} />
          <AuditTimeline events={audit} />
        </div>
      </div>
    </>
  );
}
