// Example agent for the Docker runner path.
//
// This is what a Ward-managed agent container looks like: it takes its
// tenant identity from the environment and routes every LLM call
// through the Ward egress proxy. If Ward blocks the tenant (423/429),
// the agent stops — containment works even for containerized agents,
// because the egress chokepoint is outside the container.
//
// Status: the container itself is real and runnable (docker build/run
// or `npm start` locally). Ward's Docker *runner* that launches it is
// a planned adapter in Phase 1 — see apps/api/src/dockerRunner.ts.

const WARD_BASE_URL = process.env.WARD_BASE_URL ?? "http://localhost:4317";
const TENANT_ID = process.env.WARD_TENANT_ID ?? "tenant_globex";
const STEPS = Number(process.env.AGENT_STEPS ?? 5);
const STEP_DELAY_MS = Number(process.env.AGENT_STEP_DELAY_MS ?? 1000);

async function callWard(step: number): Promise<{ status: number; body: unknown }> {
  const response = await fetch(`${WARD_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-ward-tenant-id": TENANT_ID,
      "x-ward-operation": "agent.step",
      "x-ward-correlation-id": `docker_agent_step_${step}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Agent step ${step}: plan next action.` }],
    }),
  });
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { status: response.status, body };
}

async function main(): Promise<void> {
  console.log(`[docker-agent] tenant=${TENANT_ID} ward=${WARD_BASE_URL} steps=${STEPS}`);
  for (let step = 1; step <= STEPS; step += 1) {
    const { status } = await callWard(step);
    console.log(`[docker-agent] step=${step} ward_status=${status}`);
    if (status === 423 || status === 429) {
      console.log(`[docker-agent] tenant ${TENANT_ID} is contained by Ward; stopping.`);
      process.exit(0);
    }
    await new Promise((resolve) => setTimeout(resolve, STEP_DELAY_MS));
  }
  console.log(`[docker-agent] completed ${STEPS} steps.`);
}

main().catch((err) => {
  console.error(`[docker-agent] error`, err);
  process.exit(1);
});
