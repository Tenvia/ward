// Globex's runaway agent loop simulation. This represents a broken tool
// causing the agent to retry rapidly. It is a real repeated call pattern
// against the demo app's own process, not a scripted counter inside Ward.
import { callAgentTool } from "./wardClient.js";

const loops = new Map<string, NodeJS.Timeout>();

export function startLoop(tenantId: string, intervalMs = 500): void {
  if (loops.has(tenantId)) return;
  const handle = setInterval(async () => {
    try {
      const result = await callAgentTool(tenantId, "agent.tool_call");
      console.log(`[loop:${tenantId}] status=${result.status}`);
      if (result.status === 429 || result.status === 423) {
        console.log(`[loop:${tenantId}] blocked by Ward, stopping loop`);
        stopLoop(tenantId);
      }
    } catch (err) {
      console.error(`[loop:${tenantId}] error`, err);
    }
  }, intervalMs);
  loops.set(tenantId, handle);
}

export function stopLoop(tenantId: string): void {
  const handle = loops.get(tenantId);
  if (handle) {
    clearInterval(handle);
    loops.delete(tenantId);
  }
}

export function isLooping(tenantId: string): boolean {
  return loops.has(tenantId);
}
