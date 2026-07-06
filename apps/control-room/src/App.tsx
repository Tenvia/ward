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

type Theme = "dark" | "light";

const THEME_STORAGE_KEY = "ward_control_room_theme";

function initialTheme(): Theme {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return "dark";
}

function nextTheme(theme: Theme): Theme {
  return theme === "dark" ? "light" : "dark";
}


export function App() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(initialTheme);

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

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const selectedTenant =
    tenants.find((t) => t.tenantId === selectedTenantId) ?? tenants[0] ?? null;

  return (
    <>
      <header className="header">
        <div className="brand-block">
          <div className="brand-row">
            <h1>WARD CONTROL ROOM</h1>
            {health ? <DeploymentModeBadge mode={health.deploymentMode} /> : null}
          </div>
          <div className="sub">
            Local prototype control plane · API{" "}
            {health ? <span className="status-ok">ok</span> : "connecting"} · upstream{" "}
            {health?.upstreamMode ?? "unknown"} · not production auth
          </div>
        </div>
        <div className="header-controls">
          <label className="token-field">
            <span>Control token</span>
            <input
              type="password"
              placeholder="if required"
              defaultValue={getControlToken()}
              onChange={(e) => setControlToken(e.target.value)}
              aria-label="control token"
            />
          </label>
          <button
            className="theme-toggle"
            type="button"
            onClick={() => setTheme((current) => nextTheme(current))}
            aria-label={`switch to ${nextTheme(theme)} theme`}
          >
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        </div>
      </header>
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
