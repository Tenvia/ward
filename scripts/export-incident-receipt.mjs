// Ward incident receipt export.
//
// Reads Ward audit evidence (from SQLite storage or a live Ward API)
// and emits a Markdown incident receipt answering the canonical
// operator questions: which tenant, what happened, mode in effect,
// blocks and would-blocks, state transitions, actors, approvals,
// supporting evidence, and a limitations section.
//
// Honesty:
// - This is OPERATIONAL evidence assembled from Ward's local audit
//   log. It is NOT legal/compliance certification, NOT a tamper-proof
//   forensic report, and NOT a substitute for a production audit
//   trail (none of which Ward currently implements).
//
// Usage:
//   node scripts/export-incident-receipt.mjs \
//     --tenant <id> \
//     --db ./.ward/ward.db \
//     --out /tmp/receipt.md
//
// Optional:
//   --json                  emit machine-readable JSON instead of Markdown
//   --api http://host:port  read audit/tenants from a live Ward instead
//   --token <bearer>       bearer token for the live Ward (control auth)
//   --include-overrides     include per-tenant mode override events
//                           (default: included when present)

import { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";
import { statSync } from "node:fs";

const args = parseArgs(process.argv.slice(2));

const TENANT = args.tenant ?? null;
const DB_PATH = args.db ?? "./.ward/ward.db";
const API_URL = args.api ?? null;
const TOKEN = args.token ?? null;
const EMIT_JSON = "json" in args;
const OUT_PATH = args.out ?? null;
const INCLUDE_OVERRIDES = !("include-overrides" in args) || args["include-overrides"] !== "false";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      out[key] = "true";
    } else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

async function loadFromDb(path) {
  let dbHandle = null;
  let rawRows = [];
  // Best-effort: if the SQLite file is missing, fall back to an empty
  // event set. The receipt still renders — that's a feature for the
  // "no events yet" path. Validation errors surface on the caller side.
  try {
    if (!existsSync(path)) {
      throw new Error(`sqlite db not found at ${path}`);
    }
    dbHandle = new DatabaseSync(path);
    rawRows = dbHandle.prepare("SELECT event FROM audit_events ORDER BY rowid ASC").all();
  } finally {
    if (dbHandle) dbHandle.close();
  }
  return rawRows.map((row) => parseJson(row.event));
}

async function loadFromApi(url, token) {
  const headers = token ? { authorization: `Bearer ${token}` } : {};
  const auditRes = await fetch(`${stripTrailing(url)}/ward/audit`, { headers });
  if (!auditRes.ok) throw new Error(`audit fetch failed: ${auditRes.status}`);
  const auditBody = await auditRes.json();
  const tenantsRes = await fetch(`${stripTrailing(url)}/ward/tenants`, { headers });
  const tenantsBody = tenantsRes.ok ? await tenantsRes.json() : { tenants: [] };
  return {
    events: auditBody.audit ?? [],
    tenants: tenantsBody.tenants ?? [],
  };
}

function existsSync(path) {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

function stripTrailing(s) {
  return s.endsWith("/") ? s.slice(0, -1) : s;
}

function parseJson(s) {
  try {
    return JSON.parse(s);
  } catch {
    return { _raw: s };
  }
}

function filterByTenant(events, tenantId) {
  if (!tenantId) return events;
  return events.filter((e) => e && e.tenantId === tenantId);
}

function bucketEvents(events) {
  const transitions = [];
  const blocks = [];
  const overrides = [];
  const approvals = [];
  const pressure = [];
  const proxyEvents = [];
  const workflow = [];
  const others = [];
  for (const ev of events) {
    if (!ev || typeof ev !== "object") continue;
    switch (ev.action) {
      case "constrain":
      case "pause":
      case "resume":
        transitions.push(ev);
        if (ev.evidence?.approvedFlow === true) approvals.push(ev);
        break;
      case "would_block":
        blocks.push(ev);
        break;
      case "mode_override_changed":
        overrides.push(ev);
        break;
      case "approval_requested":
        approvals.push(ev);
        break;
      case "pressure_detected":
        pressure.push(ev);
        break;
      case "proxy_fail_open":
        proxyEvents.push(ev);
        break;
      case "workflow_run_created":
      case "workflow_run_blocked":
      case "workflow_run_completed":
      case "workflow_run_failed":
      case "workflow_run_cancelled":
        workflow.push(ev);
        break;
      default:
        if (ev.action) others.push(ev);
    }
  }
  return { transitions, blocks, overrides, approvals, pressure, proxyEvents, workflow, others };
}

function transitionsSummary(transitions, tenantId) {
  if (transitions.length === 0) return "*No state transitions recorded for this tenant.*";
  const lines = [];
  for (const t of transitions) {
    lines.push(
      `- **${escape(t.timestamp)}** ` +
      `\`${t.action}\` by \`${t.actor || "unknown"}\` — ` +
      `\`${t.previousState || "?"} → ${t.nextState || "?"}\` ` +
      (t.reason ? `(${escape(t.reason)})` : "") +
      ` _(event \`${t.id}\`)_`
    );
  }
  return lines.join("\n");
}

function blocksSummary(blocks) {
  if (blocks.length === 0) return "*No `would_block` events recorded.*";
  const lines = [];
  const counts = new Map();
  for (const b of blocks) {
    const key = `${b.previousState || "?"}-via-${b.evidence?.effectiveMode || "?"}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  for (const [key, count] of counts.entries()) {
    lines.push(`- ${count} attempt(s) **${key.split("-via-")[0]}** with effectiveMode \`${key.split("-via-")[1]}\``);
  }
  lines.push("");
  lines.push("Most recent attempt:");
  const last = blocks[blocks.length - 1];
  lines.push(
    `- **${escape(last.timestamp)}** ` +
    `tenant=\`${last.tenantId}\` would-have-blocked at \`${last.previousState}\` ` +
    `with effectiveMode=\`${last.evidence?.effectiveMode || "?"}\`, ` +
    `override=\`${last.evidence?.override || "inherit"}\`, ` +
    `operation=\`${last.evidence?.operation || "?"}\` _(event \`${last.id}\`)_`
  );
  return lines.join("\n");
}

function overridesSummary(overrides) {
  if (overrides.length === 0) return "*No per-tenant mode overrides recorded.*";
  const lines = [];
  for (const o of overrides) {
    lines.push(
      `- **${escape(o.timestamp)}** ` +
      `by \`${o.actor || "unknown"}\`: ` +
      `\`${o.evidence?.previousOverride || "?"} → ${o.evidence?.nextOverride || "?"}\` ` +
      (o.reason ? `(${escape(o.reason)})` : "") +
      ` _(event \`${o.id}\`)_`
    );
  }
  return lines.join("\n");
}

function approvalsSummary(approvals, transitions) {
  if (approvals.length === 0) return "*No approval-token activity recorded.*";
  const lines = [];
  for (const a of approvals) {
    if (a.action === "approval_requested") {
      lines.push(
        `- **${escape(a.timestamp)}** ` +
        `\`approval_requested\` for action \`${a.action}\` by \`${a.actor || "unknown"}\` ` +
        `_(event \`${a.id}\`)_`
      );
    } else if (a.action && a.action !== "approval_requested") {
      lines.push(
        `- **${escape(a.timestamp)}** ` +
        `\`${a.action}\` applied via approved flow by \`${a.actor || "unknown"}\` ` +
        `on \`${a.previousState || "?"} → ${a.nextState || "?"}\` ` +
        `_(event \`${a.id}\`)_`
      );
    }
  }
  return lines.join("\n");
}

function escape(s) {
  if (s === undefined || s === null) return "";
  return String(s).replace(/[\\`*_{}\[\]()#+\-.!|>]/g, "\\$&");
}

function renderMarkdown(payload) {
  const { generatedAt, tenantId, scope, totalEvents, eventIds, buckets, tenants } = payload;
  const lines = [];
  lines.push(`# Ward incident receipt`);
  lines.push("");
  lines.push(`**Generated:** ${escape(generatedAt)}`);
  lines.push(`**Scope:** ${escape(scope)}`);
  if (tenantId) {
    lines.push(`**Tenant:** \`${escape(tenantId)}\``);
  } else {
    lines.push(`**Tenants covered:** ${tenants.map((t) => `\`${t.tenantId}\``).join(", ") || "_none_"}`);
  }
  lines.push(`**Audit event count:** ${totalEvents}`);
  lines.push("");

  if (eventIds.length > 0) {
    lines.push("## Relevant event IDs");
    lines.push("");
    lines.push("```");
    for (const id of eventIds) lines.push(id);
    lines.push("```");
    lines.push("");
  }

  lines.push("## State transitions");
  lines.push("");
  lines.push(transitionsSummary(buckets.transitions, tenantId));
  lines.push("");

  lines.push("## Blocks and would-blocks");
  lines.push("");
  lines.push(blocksSummary(buckets.blocks));
  lines.push("");

  if (INCLUDE_OVERRIDES && buckets.overrides.length > 0) {
    lines.push("## Per-tenant mode overrides");
    lines.push("");
    lines.push(overridesSummary(buckets.overrides));
    lines.push("");
  }

  if (buckets.approvals.length > 0) {
    lines.push("## Approvals");
    lines.push("");
    lines.push(approvalsSummary(buckets.approvals, buckets.transitions));
    lines.push("");
  }

  if (buckets.proxyEvents.length > 0) {
    lines.push("## Proxy degraded behavior");
    lines.push("");
    for (const p of buckets.proxyEvents) {
      lines.push(`- **${escape(p.timestamp)}** \`proxy_fail_open\` on \`${p.tenantId}\` — ${escape(p.reason || "")} _(event \`${p.id}\`)_`);
    }
    lines.push("");
  }

  if (buckets.workflow.length > 0) {
    lines.push("## Workflow runs");
    lines.push("");
    for (const w of buckets.workflow) {
      lines.push(`- **${escape(w.timestamp)}** \`${w.action}\` on \`${w.tenantId}\` _(event \`${w.id}\`)_`);
    }
    lines.push("");
  }

  lines.push("## Limitations");
  lines.push("");
  lines.push("- This receipt is **operational evidence** assembled from Ward's local audit log.");
  lines.push("- It is **NOT** legal or compliance certification, **NOT** a tamper-proof forensic report, and does **NOT** satisfy any production audit retention requirement.");
  lines.push("- Tenants, audit events, and storage are local prototype artifacts: a single SQLite database file (or in-memory store during tests) — there is no replicated, shared, or off-host audit trail.");
  lines.push("- Approval-token behavior is a prototype operator boundary (single shared bearer; no per-operator identity); do not treat approval records as cryptographic operator attribution.");
  lines.push("- This receipt does not establish data provenance for caller traffic beyond what Ward's local audit recorded at the time of the events.");
  lines.push("");

  return lines.join("\n");
}

function renderJson(payload) {
  return JSON.stringify(payload, null, 2);
}

async function main() {
  let events;
  let tenants;
  let sourceLabel;
  if (API_URL) {
    const live = await loadFromApi(API_URL, TOKEN);
    events = live.events;
    tenants = live.tenants;
    sourceLabel = `live api ${API_URL}`;
  } else {
    events = await loadFromDb(DB_PATH);
    tenants = [];
    sourceLabel = `sqlite ${resolve(DB_PATH)}`;
  }
  const filtered = filterByTenant(events, TENANT);
  const buckets = bucketEvents(filtered);
  const generatedAt = new Date().toISOString();
  const eventIds = filtered.map((e) => e.id).filter(Boolean);
  const payload = {
    generatedAt,
    tenantId: TENANT,
    scope: TENANT ? `tenant \`${TENANT}\`` : "all tenants",
    source: sourceLabel,
    totalEvents: filtered.length,
    eventIds,
    buckets: {
      transitions: buckets.transitions,
      blocks: buckets.blocks,
      overrides: buckets.overrides,
      approvals: buckets.approvals,
      pressure: buckets.pressure,
      proxyEvents: buckets.proxyEvents,
      workflow: buckets.workflow,
      others: buckets.others,
    },
    tenants,
  };
  const output = EMIT_JSON ? renderJson(payload) : renderMarkdown(payload);
  if (OUT_PATH) {
    const fs = await import("node:fs/promises");
    await fs.writeFile(OUT_PATH, output, "utf8");
    console.error(`Receipt written to ${OUT_PATH} (source: ${sourceLabel}, tenant: ${TENANT ?? "all"}, events: ${filtered.length})`);
  } else {
    process.stdout.write(output);
    if (!output.endsWith("\n")) process.stdout.write("\n");
  }
}

main().catch((err) => {
  console.error(`export-incident-receipt failed: ${err.message}`);
  process.exit(1);
});
