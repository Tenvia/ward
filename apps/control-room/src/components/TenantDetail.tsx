import type { Tenant } from "../types";
import { DeploymentModeBadge } from "./DeploymentModeBadge";

export function TenantDetail({ tenant }: { tenant: Tenant | null }) {
  if (!tenant) {
    return (
      <div className="panel">
        <h2>Tenant Detail</h2>
        <div className="empty">Select a tenant to inspect it.</div>
      </div>
    );
  }
  return (
    <div className="panel">
      <h2>Tenant Detail</h2>
      <dl className="kv">
        <dt>Tenant ID</dt>
        <dd>{tenant.tenantId}</dd>
        <dt>State</dt>
        <dd>
          <span className={`chip ${tenant.state}`}>{tenant.state}</span>
        </dd>
        <dt>Request count</dt>
        <dd>{tenant.requestCount}</dd>
        <dt>Estimated spend</dt>
        <dd>
          ${tenant.estimatedSpend.toFixed(4)}{" "}
          <span className="muted">(fixed per-call estimate, not a real cost model)</span>
        </dd>
        <dt>Detected pressure</dt>
        <dd>{tenant.detectedPressure ? "yes" : "no"}</dd>
        <dt>Last pressure reason</dt>
        <dd>{tenant.lastPressureReason ?? "-"}</dd>
        <dt>Active workflow runs</dt>
        <dd>{tenant.activeWorkflowRuns}</dd>
        <dt>Deployment mode</dt>
        <dd>
          <DeploymentModeBadge mode={tenant.deploymentMode} />
        </dd>
        <dt>Updated</dt>
        <dd>{tenant.updatedAt}</dd>
      </dl>
    </div>
  );
}
