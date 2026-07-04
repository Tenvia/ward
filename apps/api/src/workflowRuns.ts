// Workflow run store + runner dispatch.
//
// Runner status honesty:
//   - mock runner: implemented prototype (in-process simulation)
//   - docker runner: dev-only prototype behind WARD_ENABLE_DOCKER_RUNNER,
//     disabled by default (see dockerRunner.ts)
//   - kubernetes runner: planned adapter (stub, see k8sRunner.ts)
//
// Containment rules (Phase 1):
//   - paused tenant      -> new run is created as "blocked", never executed
//   - constrained tenant -> new run is created as "blocked", never executed
//   - running tenant     -> mock run executes; docker/k8s runs fail fast
//                           with a clear "planned adapter" error
import { randomBytes } from "node:crypto";
import { logAudit } from "./audit.js";
import { killDockerRun, startDockerRun } from "./dockerRunner.js";
import { startK8sRun } from "./k8sRunner.js";
import { adjustActiveWorkflowRuns, getOrCreateTenant } from "./tenantState.js";
import type { RunnerKind, WorkflowRun, WorkflowRunStatus } from "./types.js";

const runs = new Map<string, WorkflowRun>();
const RUNNER_KINDS: RunnerKind[] = ["mock", "docker", "kubernetes"];

export function isRunnerKind(value: unknown): value is RunnerKind {
  return typeof value === "string" && RUNNER_KINDS.includes(value as RunnerKind);
}

function nowIso(): string {
  return new Date().toISOString();
}

function updateStatus(run: WorkflowRun, status: WorkflowRunStatus): void {
  run.status = status;
  run.updatedAt = nowIso();
}

export function createWorkflowRun(input: {
  tenantId: string;
  runner: RunnerKind;
  image?: string;
  command?: string[];
}): WorkflowRun {
  const tenant = getOrCreateTenant(input.tenantId);
  const run: WorkflowRun = {
    id: `run_${randomBytes(8).toString("hex")}`,
    tenantId: input.tenantId,
    runner: input.runner,
    status: "queued",
    ...(input.image !== undefined ? { image: input.image } : {}),
    ...(input.command !== undefined ? { command: input.command } : {}),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  runs.set(run.id, run);

  if (tenant.state !== "running") {
    updateStatus(run, "blocked");
    run.error = `Tenant ${input.tenantId} is ${tenant.state}; workflow run blocked by Ward.`;
    logAudit({
      tenantId: input.tenantId,
      action: "workflow_run_blocked",
      actor: "ward-runtime",
      reason: run.error,
      evidence: { runId: run.id, runner: run.runner, tenantState: tenant.state },
    });
    return run;
  }

  logAudit({
    tenantId: input.tenantId,
    action: "workflow_run_created",
    actor: "ward-runtime",
    reason: `Workflow run accepted (runner=${input.runner})`,
    evidence: { runId: run.id, runner: run.runner, image: run.image ?? null },
  });

  void executeRun(run);
  return run;
}

async function executeRun(run: WorkflowRun): Promise<void> {
  updateStatus(run, "running");
  adjustActiveWorkflowRuns(run.tenantId, 1);
  try {
    if (run.runner === "mock") {
      await executeMockRun(run);
    } else if (run.runner === "docker") {
      const result = await startDockerRun(run);
      if ((run.status as WorkflowRunStatus) !== "cancelled") {
        updateStatus(run, "completed");
        run.result = { runner: "docker", ...result };
        logAudit({
          tenantId: run.tenantId,
          action: "workflow_run_completed",
          actor: "ward-runtime",
          reason: "Docker workflow run completed (dev-only prototype runner)",
          evidence: { runId: run.id, image: run.image ?? null, exitCode: result.exitCode },
        });
      }
    } else {
      await startK8sRun(run);
    }
  } catch (err) {
    if ((run.status as WorkflowRunStatus) !== "cancelled") {
      updateStatus(run, "failed");
      run.error = err instanceof Error ? err.message : "unknown runner error";
      logAudit({
        tenantId: run.tenantId,
        action: "workflow_run_failed",
        actor: "ward-runtime",
        reason: run.error,
        evidence: { runId: run.id, runner: run.runner },
      });
    }
  } finally {
    adjustActiveWorkflowRuns(run.tenantId, -1);
  }
}

// Mock runner: implemented prototype. Simulates a short agent workflow
// entirely in-process. No containers, no external calls.
async function executeMockRun(run: WorkflowRun): Promise<void> {
  await sleep(750);
  if ((run.status as WorkflowRunStatus) === "cancelled") return;
  // A pause/constrain applied mid-run does not kill a mock run in
  // Phase 1; only new runs are blocked. Documented in ARCHITECTURE.md.
  updateStatus(run, "completed");
  run.result = {
    runner: "mock",
    note: "Mock workflow run completed. No real agent container was executed.",
    steps: ["fetch_task", "call_llm_via_ward_proxy", "write_result"],
  };
  logAudit({
    tenantId: run.tenantId,
    action: "workflow_run_completed",
    actor: "ward-runtime",
    reason: "Mock workflow run completed",
    evidence: { runId: run.id },
  });
}

export function cancelWorkflowRun(runId: string): WorkflowRun | undefined {
  const run = runs.get(runId);
  if (!run) return undefined;
  if (run.status === "queued" || run.status === "running") {
    updateStatus(run, "cancelled");
    run.error = "Cancelled by operator.";
    if (run.runner === "docker") {
      killDockerRun(run.id);
    }
    logAudit({
      tenantId: run.tenantId,
      action: "workflow_run_cancelled",
      actor: "operator",
      reason: "Cancelled via API",
      evidence: { runId: run.id },
    });
  }
  return run;
}

export function getWorkflowRun(runId: string): WorkflowRun | undefined {
  return runs.get(runId);
}

export function listWorkflowRuns(): WorkflowRun[] {
  return Array.from(runs.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function resetWorkflowRuns(): void {
  runs.clear();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
