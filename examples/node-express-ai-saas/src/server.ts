// Minimal Node/Express demo app representing an existing AI SaaS.
// Prototype only. The only Ward-specific code is wardClient.ts, which
// adds a base URL and a tenant header to an otherwise ordinary
// outbound LLM call.
import express from "express";
import type { Request, Response } from "express";
import { TENANTS } from "./tenants.js";
import { callAgentTool } from "./wardClient.js";
import { startLoop, stopLoop, isLooping } from "./agentLoop.js";

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT ?? 4401);

function statusBody() {
  return {
    app: "ward-demo-node-express-ai-saas",
    status: "ok",
    tenants: TENANTS,
    globexLoopRunning: isLooping(TENANTS.globex),
  };
}

app.get("/", (_req: Request, res: Response) => {
  res.json(statusBody());
});

app.get("/status", (_req: Request, res: Response) => {
  res.json(statusBody());
});

app.post("/tenants/acme/run-agent-once", async (_req: Request, res: Response) => {
  const result = await callAgentTool(TENANTS.acme);
  res.status(result.status).json(result.body);
});

app.post("/tenants/globex/run-agent-once", async (_req: Request, res: Response) => {
  const result = await callAgentTool(TENANTS.globex);
  res.status(result.status).json(result.body);
});

app.post("/tenants/globex/start-loop", (_req: Request, res: Response) => {
  startLoop(TENANTS.globex);
  res.json({ status: "loop_started", tenantId: TENANTS.globex });
});

app.post("/tenants/globex/stop-loop", (_req: Request, res: Response) => {
  stopLoop(TENANTS.globex);
  res.json({ status: "loop_stopped", tenantId: TENANTS.globex });
});

app.listen(PORT, () => {
  console.log(`Ward demo SaaS app listening on http://localhost:${PORT}`);
});
