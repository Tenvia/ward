// Kubernetes workflow runner — PLANNED ADAPTER (Phase 1 stub).
//
// Status: not implemented. This module defines the adapter surface the
// real Kubernetes runner will fill: create a Job (or Pod) per workflow
// run in a runner namespace, labeled per tenant, and honor tenant
// containment (paused tenant -> no new Jobs; pause during a run ->
// Job deletion/suspension).
//
// Intended shape (see docs/KUBERNETES_PLAN.md):
//   - Job per run, labels: ward.dev/tenant-id, ward.dev/run-id
//   - runner namespace with NetworkPolicy forcing egress through Ward
//   - status watched via the Kubernetes API and mirrored into the run
import type { WorkflowRun } from "./types.js";

export const k8sRunnerStatus = "planned" as const;

export async function startK8sRun(run: WorkflowRun): Promise<never> {
  throw new Error(
    `Kubernetes runner is a planned adapter in Phase 1 and is not implemented. ` +
      `Run ${run.id} was not started. Use runner "mock" for the local demo.`
  );
}
