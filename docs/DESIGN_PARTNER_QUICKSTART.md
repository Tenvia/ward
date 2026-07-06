# Ward Design Partner Quickstart

Pause one customer's AI agents. Everyone else keeps running.

## What Ward does

Ward sits between your SaaS and your LLM/tool providers as a
tenant-aware egress proxy with a control plane. Every AI call carries
your customer's tenant ID; when one customer's agent loops or goes
sideways, an operator constrains or pauses that tenant — with an
approval step and an audit trail — while every other customer's
traffic keeps flowing.

## What it does not do yet

Prototype auth (one shared token, not RBAC). Single-node,
prototype/demo-supported operation — not production-ready, no SLA. If
the Ward process itself is hard-down, proxied traffic does not flow;
surviving that needs fallback routing on your side. Ward does not
currently provide an HA path for hard-down scenarios.

## 1. Choose the run mode

Use one of these paths; do not mix their tokens:

| Mode | Use when | Command | Control token |
| --- | --- | --- | --- |
| Evaluator-safe pull path | You want the published image, explicit `.env`, and generated token | Follow `docs/EVALUATOR_QUICKSTART.md` first | `WARD_CONTROL_TOKEN` from `.env` |
| Local demo build path | You are demoing from a checkout and accept local demo defaults | `docker compose -f docker-compose.user.yml up --build` | `ward-demo-token` |

Both modes serve one Ward container on port 4317. The walkthrough below
works in either mode; use the token for the mode you chose.

## 2. Open the Control Room

http://localhost:4317 — served by the same container. Paste your control
token into the field at the top right. In evaluator-safe mode this is
the generated `WARD_CONTROL_TOKEN` from `.env`; in local demo build mode
it is the demo token `ward-demo-token`.

## 3. Make an Acme request

```bash
curl -X POST http://localhost:4317/v1/chat/completions \
  -H "x-ward-tenant-id: tenant_acme" -H "content-type: application/json" \
  -d '{"model":"demo","messages":[{"role":"user","content":"order status"}]}'
```

Returns a mock completion (no API key needed) attributed to
`tenant_acme`. The tenant appears in the Control Room.

## 4. Trigger Globex pressure

Simulate a runaway agent loop — fire ~10 quick calls:

```bash
for i in $(seq 1 10); do
  curl -s -o /dev/null -X POST http://localhost:4317/v1/chat/completions \
    -H "x-ward-tenant-id: tenant_globex" -H "content-type: application/json" -d '{}'
done
```

Within a couple of seconds the Control Room flags Globex with
"Request loop pressure" (default threshold: 8 requests / 10s). Ward
never auto-constrains — operators decide.

## 5. Constrain Globex

In the Control Room: select Globex, click "Request approval", type the
exact phrase `constrain tenant_globex`, click "Apply approved action".
(Or via curl/`wardctl` with the Bearer token.)

## 6. Confirm Acme still works

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:4317/v1/chat/completions \
  -H "x-ward-tenant-id: tenant_acme" -H "content-type: application/json" -d '{}'   # 200
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:4317/v1/chat/completions \
  -H "x-ward-tenant-id: tenant_globex" -H "content-type: application/json" -d '{}' # 429
```

Globex was contained. Acme never blipped.

## 7. See the audit evidence

```bash
curl http://localhost:4317/ward/audit
```

Pressure detection, the approval request, and the constrain transition
(with previous/next state, actor, and reason) are all there. With the
default Docker setup this survives container restarts (SQLite volume).

## 8. Integrate your stack

The contract is HTTP/OpenAPI — `curl http://localhost:4317/openapi.yaml`.

- Proxy-only (start here): change your OpenAI base URL to Ward and add
  `x-ward-tenant-id`. Hard containment for routed calls. Pass-through
  to your real provider via `WARD_UPSTREAM_OPENAI_BASE_URL` +
  `OPENAI_API_KEY`.
- SDK guard (optional): cooperative pre-work checks; TypeScript SDK
  exists, or one HTTP GET from any language.
- Workflow runners: mock today, dev-only Docker prototype, Kubernetes
  planned.

Details and honest guarantees: `docs/EXISTING_SAAS_INTEGRATION.md`.

Giving this demo to someone? Use
`docs/DESIGN_PARTNER_EVALUATION_SCRIPT.md`.

## Talk to us

We are looking for multi-tenant SaaS teams that have had at least one
"one customer's agent went sideways" incident. If that's you, run the
demo above and tell us where it does and doesn't fit your stack.
