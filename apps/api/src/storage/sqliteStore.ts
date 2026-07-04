// SQLite persistence via the Node built-in node:sqlite module.
// Prototype: records are stored as JSON blobs keyed by id, which keeps
// the schema flexible while the record shapes are still moving.
//
// node:sqlite is experimental in Node 22 (prints an ExperimentalWarning
// at load). It is loaded lazily so the default memory backend never
// touches it. Requires Node >= 22.13.
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import type { AuditEvent, TenantRecord } from "../types.js";
import type { WardStorage } from "./types.js";

// Minimal local typing; @types/node 20 does not know node:sqlite.
interface SqliteStatement {
  run(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
}
interface SqliteDatabase {
  exec(sql: string): void;
  prepare(sql: string): SqliteStatement;
}

export function createSqliteStore(path: string): WardStorage {
  const require = createRequire(import.meta.url);
  const { DatabaseSync } = require("node:sqlite") as {
    DatabaseSync: new (path: string) => SqliteDatabase;
  };

  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      tenant_id TEXT PRIMARY KEY,
      record TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      event TEXT NOT NULL
    );
  `);

  const upsertTenant = db.prepare(
    "INSERT INTO tenants (tenant_id, record) VALUES (?, ?) " +
      "ON CONFLICT(tenant_id) DO UPDATE SET record = excluded.record"
  );
  const selectTenants = db.prepare("SELECT record FROM tenants");
  const insertAudit = db.prepare("INSERT OR REPLACE INTO audit_events (id, event) VALUES (?, ?)");
  const selectAudit = db.prepare("SELECT event FROM audit_events ORDER BY rowid ASC");

  return {
    kind: "sqlite",
    loadTenants: () =>
      selectTenants.all().map((row) => JSON.parse((row as { record: string }).record)) as TenantRecord[],
    saveTenant: (record: TenantRecord) => {
      upsertTenant.run(record.tenantId, JSON.stringify(record));
    },
    clearTenants: () => {
      db.exec("DELETE FROM tenants");
    },
    loadAuditEvents: () =>
      selectAudit.all().map((row) => JSON.parse((row as { event: string }).event)) as AuditEvent[],
    appendAuditEvent: (event: AuditEvent) => {
      insertAudit.run(event.id, JSON.stringify(event));
    },
    clearAudit: () => {
      db.exec("DELETE FROM audit_events");
    },
  };
}
