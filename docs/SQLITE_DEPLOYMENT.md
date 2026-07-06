# Ward SQLite Deployment and Recovery

## Summary

This note is the RC4 Slice 3 reference for running Ward with the local
SQLite persistence backend (`WARD_STORAGE=sqlite`). It answers four
evaluator questions:

1. What does SQLite mode in Ward actually persist?
2. What survives an API container restart?
3. How is the data backed up or restored today?
4. What is intentionally out of scope?

SQLite mode is a local prototype persistence path. It is not HA, not
shared across replicas, not Postgres, not compliance retention, and not
tamper-evident. The state it persists is enough for a single
evaluator or design-partner machine to keep tenant state and audit
evidence across an API restart, and not more.

## When to use SQLite mode

Use SQLite mode when:

- you are evaluating Ward locally or in a single container
- you want tenant state and audit events to survive an API restart or
  a container restart without external infrastructure
- you do not need replication, failover, or multi-replica consistency

Do not use SQLite mode when:

- you need HA, multi-replica shared state, or zero data loss across
  multiple machines
- you need compliance-grade retention, tamper-evident signing, or
  export to an audit sink
- you need Postgres durability, migrations, or shared query access

## See also

- `docs/ENVIRONMENT.md` — supported env vars; the
  `WARD_STORAGE` and `WARD_SQLITE_PATH` rows point back here.
- `docs/EVALUATOR_QUICKSTART.md` — copy/paste evaluator path that
  uses SQLite persistence.
- `docs/DEPLOYMENT_MODEL.md` — storage backends overview.
- `docs/DOCKER_RUNBOOK.md` — compose stacks that mount the
  evaluator volume.


## What SQLite mode persists

When `WARD_STORAGE=sqlite`, Ward writes to a single SQLite database
file at `WARD_SQLITE_PATH` (default `.ward/ward.db`, container default
`/data/ward.db`). The schema is intentionally minimal
(`apps/api/src/storage/sqliteStore.ts`):

Persisted across API restarts:

- tenant records: state (`running`, `constrained`, `paused`),
  `modeOverride` (`inherit`, `observe`, `enforce`), pressure counters,
  `estimatedSpend`, last pressure reason
- audit events: every `constrain`, `pause`, `resume`,
  `mode_override_changed`, `approval_requested`,
  `apply_approved_action`, `would_block`, `pressure_detected`,
  `proxy_fail_open`, and workflow-run event that the API has emitted
  since the SQLite store was first enabled

Not persisted (in-memory even with SQLite enabled):

- approval tokens (`apps/api/src/approvals.ts`)
- workflow runs in process memory

This split is documented in `docs/DEPLOYMENT_MODEL.md` and is the
expected behavior: only durable state lives in SQLite.

## What survives a restart

Survives an API process restart:

- every audit event with the same `id`, `schemaVersion`, `timestamp`,
  `tenantId`, `action`, `actor`, `reason`, `previousState`, and
  `evidence` it had before the restart
- tenant state, `modeOverride`, and accumulated counters

Survives a container restart when SQLite is on a named Docker
volume:

- everything that survives an API process restart
- the database file itself remains on the `ward-data` (root compose)
  or `ward-user-data` (user/pull compose) volume

Does **not** survive:

- `docker compose down --volumes` on the API container
- deleting or corrupting the SQLite file outside Ward
- re-pointing `WARD_SQLITE_PATH` to a different file or empty
  directory without copying the prior file

Restart persistence is verified by `npm run smoke:audit-durability`
on this dev machine. The smoke boots Ward A in observe mode, records
audit events, kills the process, boots Ward B with the same
`WARD_SQLITE_PATH`, and confirms the events survived with the same
identifiers. The script prints its own check count.

## Backup and restore today

The supported backup path is filesystem copy of the SQLite file while
Ward is stopped, plus filesystem copy back to restore. There is no
built-in online backup command, no export to S3, and no incremental
backup tooling.

### Backup (local dev, no container)

```bash
# Stop Ward first to avoid mid-transaction edge cases.
cp ./.ward/ward.db ./.ward/ward.db.backup-$(date +%Y%m%d-%H%M%S)
```

### Backup (container, while stopped)

```bash
docker compose --env-file .env -f docker-compose.pull.yml down
docker run --rm \
  -v ward-user-data:/data \
  -v "$PWD":/backup \
  alpine cp /data/ward.db /backup/ward.db.backup-$(date +%Y%m%d-%H%M%S)
docker compose --env-file .env -f docker-compose.pull.yml up -d
```

### Restore (container)

```bash
docker compose --env-file .env -f docker-compose.pull.yml down
docker run --rm \
  -v ward-user-data:/data \
  -v "$PWD":/backup \
  alpine sh -c 'cp /backup/ward.db.<timestamp> /data/ward.db'
docker compose --env-file .env -f docker-compose.pull.yml up -d
```

Restore expectations:

- audit event identifiers must remain identical
- tenant records must reflect the same state as at backup time
- the in-memory audit counter resumes past the persisted maximum;
  it does not regress and does not collide with existing event ids

Caveats:

- backup is offline only; the API must be stopped
- WAL sidecar files (`-wal`, `-shm`) should be included if present
  at backup time
- restoring an older backup overwrites newer events without warning
- restoring across Node versions is fine, but restoring across schema
  versions is not yet designed

## What SQLite mode is not

SQLite mode in Ward is intentionally not:

- HA or multi-replica durable storage
- a shared database for multiple API instances
- a compliance audit sink
- a tamper-evident log (the database is unsigned, single-file, and
  operator-editable)
- a Postgres replacement
- a replacement for the incident receipt export
  (`npm run incident:export`), which is the supported way to hand
  audit evidence to a human

## node:sqlite notes

Ward uses Node's built-in `node:sqlite` module
(`apps/api/src/storage/sqliteStore.ts`). This module is
**experimental in Node 22** and requires Node >= 22.13. The
ExperimentalWarning prints once when the module is first loaded; the
API still functions correctly.

Implications for evaluators:

- keep the runtime on Node 22.13+ for SQLite mode
- do not treat `ExperimentalWarning` as a failure; the SQLite store
  is the same prototype either way
- if Node 24 stabilizes `node:sqlite`, Ward's expected change is a
  one-line dependency on the stable API; the storage interface does
  not change

## Operational signals to watch

- `apps/api/src/server.ts` logs `Ward storage: sqlite (<path>)` at
  boot. Confirm the path matches `WARD_SQLITE_PATH`; a wrong path
  silently creates a fresh empty database.
- `GET /health` reports `storage: sqlite` when enabled.
- `npm run incident:export -- --db <WARD_SQLITE_PATH>` reads audit
  events from the SQLite file directly and writes a Markdown
  receipt. Use it when validating persistence outside the live API.
- A missing SQLite file at boot is not a hard error today: the store
  re-creates the schema and starts empty. A missing file is
  typically a backup-restore mistake, a wrong
  `WARD_SQLITE_PATH`, or a Docker volume not mounted.
- The audit-durability smoke fails fast if restart does not preserve
  audit events; re-run it after any change to the storage path.

## Out of scope for this slice

- online backup tooling
- incremental backup
- cross-replica consistency
- Postgres durability
- retention policy and audit-sink export
- signed or tamper-evident receipts
- automatic backup scheduling
- anything that would make SQLite mode safe for production
