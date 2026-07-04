import type { AuditEvent } from "../types";

export function AuditTimeline({ events }: { events: AuditEvent[] }) {
  const newestFirst = [...events].reverse();
  return (
    <div className="panel">
      <h2>Audit Timeline</h2>
      <div className="muted" style={{ marginBottom: 8 }}>
        In-memory audit trail. Lost on restart. Durable audit is planned.
      </div>
      {newestFirst.length === 0 ? (
        <div className="empty">No audit events yet.</div>
      ) : (
        newestFirst.map((event) => (
          <div className="audit-item" key={event.id}>
            <div>
              {event.action}
              {event.previousState && event.nextState && event.previousState !== event.nextState
                ? ` (${event.previousState} -> ${event.nextState})`
                : ""}
            </div>
            <div className="meta">
              {event.timestamp} / {event.tenantId} / actor: {event.actor}
              {event.reason ? ` / ${event.reason}` : ""}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
