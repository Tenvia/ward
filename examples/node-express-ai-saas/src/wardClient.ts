// The only integration surface this demo app needs: a base URL and a
// tenant header. No other application code changes are required to route
// through Ward's egress proxy.

const WARD_PROXY_BASE_URL = process.env.WARD_PROXY_BASE_URL ?? "http://localhost:4317";

export interface AgentCallResult {
  ok: boolean;
  status: number;
  body: unknown;
}

export async function callAgentTool(tenantId: string, operation = "agent.tool_call"): Promise<AgentCallResult> {
  const response = await fetch(`${WARD_PROXY_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-ward-tenant-id": tenantId,
      "x-ward-operation": operation,
      "x-ward-correlation-id": `corr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Look up the customer's order status." }],
    }),
  });

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  return { ok: response.ok, status: response.status, body };
}
