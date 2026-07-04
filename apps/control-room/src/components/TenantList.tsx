import type { Tenant } from "../types";

export function TenantList({
  tenants,
  selectedTenantId,
  onSelect,
}: {
  tenants: Tenant[];
  selectedTenantId: string | null;
  onSelect: (tenantId: string) => void;
}) {
  return (
    <div className="panel">
      <h2>Tenants</h2>
      {tenants.length === 0 ? (
        <div className="empty">
          No tenants tracked yet. Tenants appear on their first Ward-proxied call.
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Tenant</th>
              <th>State</th>
              <th>Reqs</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <tr
                key={tenant.tenantId}
                className={`tenant-row${tenant.tenantId === selectedTenantId ? " selected" : ""}`}
                onClick={() => onSelect(tenant.tenantId)}
              >
                <td>
                  {tenant.detectedPressure ? <span className="pressure-dot" /> : null}
                  {tenant.tenantId}
                </td>
                <td>
                  <span className={`chip ${tenant.state}`}>{tenant.state}</span>
                </td>
                <td>{tenant.requestCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
