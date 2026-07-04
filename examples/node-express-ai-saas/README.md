# Ward Demo App: Node/Express AI SaaS

## Summary

Prototype demo app used to prove Ward's egress-proxy integration story
locally. It is a minimal Express app with two tenants (Acme, Globex).
Globex can be put into a loop that repeatedly calls a mock agent tool
through Ward's proxy, simulating a broken tool causing runaway retries.
See `docs/PROXY_DEMO_RUNBOOK.md` at the repo root for the full walkthrough.

## Status

Prototype. Local demo only. Calls route through the Ward proxy prototype
in mock-upstream mode by default (no external OpenAI key needed). See
`docs/CLAIMS_AND_EVIDENCE.md` at the repo root for what is and is not
proven by this app.

## What this app demonstrates

1. A real Express app, unmodified except for the base-URL/header
   integration in `src/wardClient.ts`.
2. Two tenants, Acme and Globex, each able to call an agent tool through
   the Ward proxy.
3. Globex's loop is a real repeated call pattern (a `setInterval` hitting
   the proxy every 500ms), not a scripted counter inside Ward.
4. Ward's proxy attributes traffic per tenant via the `x-ward-tenant-id`
   header.
5. An operator can constrain Globex via the proxy's admin endpoint, and
   Globex's next proxy calls are blocked with HTTP 429.
6. Acme's tenant is provably unaffected throughout.

## Integration surface

The only Ward-specific code in this app is `src/wardClient.ts`: a base URL
and two headers on an otherwise ordinary outbound fetch call.

```ts
const response = await fetch(`${WARD_PROXY_BASE_URL}/v1/chat/completions`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-ward-tenant-id": tenantId,
    "x-ward-operation": "agent.tool_call",
  },
  body: JSON.stringify({ model: "gpt-4o-mini", messages: [...] }),
});
```

No other application code depends on Ward.

## Running the demo

```bash
npm install
npm run dev
```

Runs on `http://localhost:4401` by default. Requires the Ward proxy
prototype running on `http://localhost:4317` (see `apps/api/`). Full
walkthrough with curl commands: `docs/PROXY_DEMO_RUNBOOK.md`.

### Endpoints

- `GET /` — status page (JSON).
- `POST /tenants/acme/run-agent-once`
- `POST /tenants/globex/run-agent-once`
- `POST /tenants/globex/start-loop`
- `POST /tenants/globex/stop-loop`
