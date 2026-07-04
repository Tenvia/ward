import type { Tenant } from "../types";

// An "incident" in the Phase 1 prototype is a tenant with detected
// pressure or an active containment state. There is no separate
// incident object yet.
export function IncidentPanel({
  tenants,
  onSelect,
}: {
  tenants: Tenant[];
  onSelect: (tenantId: string) => void;
}) {
  const incidents = tenants.filter((t) => t.detectedPressure || t.state !== "running");
  return (
    <div className="panel">
      <h2>Incidents</h2>
      {incidents.length === 0 ? (
        <div className="empty">No pressure detected. No tenants contained.</div>
      ) : (
        incidents.map((tenant) => (
          <div className="audit-item" key={tenant.tenantId}>
            <div>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onSelect(tenant.tenantId);
                }}
              >
                {tenant.tenantId}
              </a>{" "}
              <span className={`chip ${tenant.state}`}>{tenant.state}</span>
            </div>
            <div className="meta">
              {tenant.detectedPressure
                ? tenant.lastPressureReason ?? "pressure detected"
                : "contained by operator"}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
