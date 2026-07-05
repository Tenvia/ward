// Ward API server.
//
// Phase 1 prototype: in-memory tenant state, approvals, audit, and
// workflow runs. Local/Docker demo only — no auth, no persistence.
// See docs/CLAIMS_AND_EVIDENCE.md before repeating any claim.
import express from "express";
import type { NextFunction, Request, Response } from "express";
import { config } from "./config.js";
import { listAudit, logAudit, resetAudit } from "./audit.js";
import { resetApprovals } from "./approvals.js";
import { detectPressure, pressureReason } from "./detection.js";
import {
  forwardToUpstream,
  mockChatCompletion,
  mockStreamChatCompletion,
  upstreamModeEnabled,
} from "./openaiProxy.js";
import {
  controlAuthStatus,
  requireControlAuth,
} from "./controlAuth.js";
import { dockerRunnerStatus } from "./dockerRunner.js";
import { mountOpenapiRoutes, openapiAvailable } from "./openapiRoutes.js";
import { mountStaticUi, uiAvailable } from "./staticAssets.js";
import { tenantsRouter } from "./tenants.js";
import {
  getOrCreateTenant,
  markPressure,
  recordRequest,
  resetAllTenants,
} from "./tenantState.js";
import {
  cancelWorkflowRun,
  createWorkflowRun,
  getWorkflowRun,
  isRunnerKind,
  listWorkflowRuns,
  resetWorkflowRuns,
} from "./workflowRuns.js";
import type { WardErrorBody } from "./types.js";

const app = express();
app.use(express.json());

// Express guarantees route params exist for matched routes;
// noUncheckedIndexedAccess types them as string | undefined.
function runIdParam(req: Request): string {
  return req.params.runId ?? "";
}

// Allow the Control Room (browser, different origin) to call this API.
// Wide-open CORS is acceptable for the local prototype only.
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header("access-control-allow-origin", "*");
  res.header("access-control-allow-headers", "content-type, authorization");
  res.header("access-control-allow-methods", "GET,POST,OPTIONS");
  res.header("access-control-expose-headers", "x-ward-fail-open");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "ward-api",
    wardMode: config.wardMode,
    deploymentMode: config.deploymentMode,
    upstreamMode: upstreamModeEnabled() ? "pass_through" : "mock_upstream",
    storage: config.storage,
    proxyFailMode: config.proxyFailMode,
    controlAuth: controlAuthStatus(),
    controlRoomBundled: uiAvailable(),
    openapi: { served: openapiAvailable(), path: "/openapi.yaml" },
    runners: {
      mock: "implemented (prototype)",
      docker:
        dockerRunnerStatus() === "prototype"
          ? "enabled (dev-only prototype)"
          : "disabled (enable with WARD_ENABLE_DOCKER_RUNNER=true; dev-only prototype)",
      kubernetes: "planned",
    },
  });
});

// ---------------------------------------------------------------------------
// OpenAI-compatible egress endpoint
// ---------------------------------------------------------------------------

app.post("/v1/chat/completions", async (req: Request, res: Response) => {
  const tenantId = req.header("x-ward-tenant-id");
  const operation = req.header("x-ward-operation") ?? "ai.chat_completion";
  const correlationId = req.header("x-ward-correlation-id") ?? null;

  if (!tenantId) {
    res.status(400).json({
      error: "ward_missing_tenant_header",
      message: "x-ward-tenant-id header is required for all Ward-proxied calls.",
    });
    return;
  }

  // Policy lookup. If it fails while Ward itself is up (storage fault),
  // WARD_PROXY_FAIL_MODE decides: open (default) allows the request with
  // a visible x-ward-fail-open header and an audit attempt; closed
  // blocks with 503. Fail mode never overrides a successful policy read.
  let tenant;
  try {
    if (config.testForcePolicyError) {
      throw new Error("Forced policy error (WARD_TEST_FORCE_POLICY_ERROR=true, test-only)");
    }
    tenant = getOrCreateTenant(tenantId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown policy error";
    if (config.proxyFailMode === "open") {
      res.header("x-ward-fail-open", "true");
      try {
        logAudit({
          tenantId,
          action: "proxy_fail_open",
          actor: "ward-runtime",
          reason:
            "tenant policy unavailable; allowed request because WARD_PROXY_FAIL_MODE=open",
          evidence: { operation, correlationId, error: message },
        });
      } catch {
        // The audit path may share the failing storage; fail-open must
        // still fail open.
      }
      try {
        if (upstreamModeEnabled()) {
          const { status, json } = await forwardToUpstream(req.body);
          res.status(status).json(json);
          return;
        }
        res.status(200).json(mockChatCompletion(req.body, tenantId));
      } catch (upstreamErr) {
        res.status(502).json({
          error: "ward_upstream_error",
          message:
            upstreamErr instanceof Error ? upstreamErr.message : "unknown upstream error",
        });
      }
      return;
    }
    res.status(503).json({
      error: "ward_policy_unavailable",
      message:
        `Tenant policy lookup failed and WARD_PROXY_FAIL_MODE=closed; request blocked. (${message})`,
      tenantId,
    });
    return;
  }
  // Enforcement happens before the request is counted or forwarded,
  // and is tenant-specific: one tenant's state never gates another's.
  if (tenant.state === "paused") {
    if (config.wardMode === "observe") {
      res.header("x-ward-would-block", "paused");
      logAudit({
        tenantId,
        action: "would_block",
        actor: "ward-runtime",
        reason: "Tenant paused; allowed in observe mode.",
        previousState: tenant.state,
        nextState: tenant.state,
        evidence: { operation, correlationId },
      });
    } else {
      const body: WardErrorBody = {
        error: "ward_tenant_paused",
        message: `Tenant ${tenantId} is paused by an operator. Request blocked.`,
        tenantId,
        state: "paused",
      };
      res.status(423).json(body);
      return;
    }
  }

  if (tenant.state === "constrained") {
    if (config.wardMode === "observe") {
      res.header("x-ward-would-block", "constrained");
      logAudit({
        tenantId,
        action: "would_block",
        actor: "ward-runtime",
        reason: "Tenant constrained; allowed in observe mode.",
        previousState: tenant.state,
        nextState: tenant.state,
        evidence: { operation, correlationId },
      });
    } else {
      const body: WardErrorBody = {
        error: "ward_tenant_constrained",
        message: `Tenant ${tenantId} is constrained by an operator. Request rejected; retry after resume.`,
        tenantId,
        state: "constrained",
      };
      res.status(429).json(body);
      return;
    }
  }

  const record = recordRequest(tenantId);
  const pressure = detectPressure(record);

  if (pressure.detected) {
    const reason = pressureReason(pressure);
    const alreadyFlagged = record.detectedPressure;
    markPressure(tenantId, reason);
    if (!alreadyFlagged) {
      // Audit only the false->true transition to avoid one event per
      // request while a loop is running. Phase 1 never auto-constrains;
      // the tenant stays running until an operator acts.
      logAudit({
        tenantId,
        action: "pressure_detected",
        actor: "ward-detector",
        reason,
        previousState: tenant.state,
        nextState: tenant.state,
        evidence: { ...pressure, operation, correlationId },
      });
    }
  }

  try {
    const wantsStream = Boolean(
      (req.body ?? ({} as { stream?: boolean })).stream
    );
    if (wantsStream) {
      // Streaming is mock-only for this slice. forwardToUpstream
      // does `await response.json()` and deadlocks on SSE; reject
      // the upstream + stream combo before any other branch.
      // Streaming also bypasses the pass-through branch entirely:
      // a request with `stream: true` plus
      // `WARD_UPSTREAM_OPENAI_BASE_URL` set receives the
      // deterministic mock stream, NOT upstream pass-through.
      res.status(200);
      res.setHeader("content-type", "text/event-stream");
      res.setHeader("cache-control", "no-cache");
      res.setHeader("connection", "keep-alive");
      res.flushHeaders?.();
      for await (const chunk of mockStreamChatCompletion(req.body, tenantId)) {
        res.write(chunk);
      }
      res.end();
      return;
    }
    if (upstreamModeEnabled()) {
      const { status, json } = await forwardToUpstream(req.body);
      res.status(status).json(json);
      return;
    }
    res.status(200).json(mockChatCompletion(req.body, tenantId));
  } catch (err) {
    res.status(502).json({
      error: "ward_upstream_error",
      message: err instanceof Error ? err.message : "unknown upstream error",
    });
  }
});

// ---------------------------------------------------------------------------
// Tenant control + approvals
// ---------------------------------------------------------------------------

app.use("/ward/tenants", tenantsRouter);

// ---------------------------------------------------------------------------
// Workflow runs
// ---------------------------------------------------------------------------

app.get("/ward/workflow-runs", (_req: Request, res: Response) => {
  res.json({ workflowRuns: listWorkflowRuns() });
});

app.get("/ward/workflow-runs/:runId", (req: Request, res: Response) => {
  const run = getWorkflowRun(runIdParam(req));
  if (!run) {
    res.status(404).json({ error: "ward_workflow_run_not_found" });
    return;
  }
  res.json({ workflowRun: run });
});

app.post("/ward/workflow-runs", requireControlAuth, (req: Request, res: Response) => {
  const { tenantId, runner, image, command } = (req.body ?? {}) as {
    tenantId?: string;
    runner?: unknown;
    image?: string;
    command?: string[];
  };
  if (!tenantId) {
    res.status(400).json({
      error: "ward_missing_tenant_id",
      message: "tenantId is required.",
    });
    return;
  }
  if (!isRunnerKind(runner)) {
    res.status(400).json({
      error: "ward_invalid_runner",
      message: `runner must be one of: mock, docker, kubernetes`,
    });
    return;
  }
  const run = createWorkflowRun({
    tenantId,
    runner,
    ...(image !== undefined ? { image } : {}),
    ...(command !== undefined ? { command } : {}),
  });
  res.status(201).json({ workflowRun: run });
});

app.post("/ward/workflow-runs/:runId/cancel", requireControlAuth, (req: Request, res: Response) => {
  const run = cancelWorkflowRun(runIdParam(req));
  if (!run) {
    res.status(404).json({ error: "ward_workflow_run_not_found" });
    return;
  }
  res.json({ workflowRun: run });
});

// ---------------------------------------------------------------------------
// Audit + reset
// ---------------------------------------------------------------------------

app.get("/ward/audit", (_req: Request, res: Response) => {
  res.json({ audit: listAudit() });
});

app.post("/ward/reset", requireControlAuth, (_req: Request, res: Response) => {
  resetAllTenants();
  resetAudit();
  resetApprovals();
  resetWorkflowRuns();
  res.json({ status: "reset" });
});

mountOpenapiRoutes(app);

// Static UI is mounted last so all API routes take precedence.
mountStaticUi(app);

app.listen(config.port, () => {
  console.log(`Ward API listening on http://localhost:${config.port}`);
  console.log(`Deployment mode: ${config.deploymentMode}`);
  console.log(`Upstream mode: ${upstreamModeEnabled() ? "pass_through" : "mock_upstream"}`);
});
