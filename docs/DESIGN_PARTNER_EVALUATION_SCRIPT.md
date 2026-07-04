# Design Partner Evaluation Script

How to demo and discuss Ward with a design partner. The quickstart
(`docs/DESIGN_PARTNER_QUICKSTART.md`) helps them run Ward; this is the
script for the person giving the demo.

## Opening line

Ward lets you pause one customer's AI agents while everyone else keeps
running.

## Who this is for

- Multi-tenant SaaS teams.
- Teams adding agentic workflows to an existing product.
- Teams that worry one customer's agent loop, tool flood, or spend
  spike could hurt every other customer — and whose only levers today
  are a global flag or a hotfix.

## Five-minute demo flow

1. Start Ward: `docker compose -f docker-compose.user.yml up --build`.
2. Open the Control Room at http://localhost:4317 (token:
   `ward-demo-token`).
3. Acme request succeeds (curl from the quickstart) — tenant appears.
4. Globex starts pressure (10-call loop) — say "this is one customer's
   agent stuck retrying."
5. Ward flags pressure within seconds but does NOT auto-constrain —
   "operators decide; Ward brings evidence."
6. Approve the constraint: request approval, type the exact phrase.
   Point out the single-use token — approval is deliberate.
7. Globex now gets 429s. Show the loop stopping.
8. Acme still returns 200. Say the line: "Globex was contained. Acme
   never blipped."
9. Open the audit timeline: pressure evidence, the approval, the
   transition with actor and reason. "This is what you show the
   customer and your own support team afterward."

## Questions to ask the design partner

- Where do tenant-scoped agents/workflows run today?
- What happens right now if one tenant's agent loops?
- Do you already have tenant IDs available in the AI/tool call path?
- Would proxy-only integration (base URL + header) be acceptable?
- Where would fail-open vs fail-closed matter in your stack?
- What audit evidence would your support/customer teams need?
- Would Docker self-hosting be enough for an evaluation?
- What would block adoption?

## Objection handling

One aligned answer for all of these: Ward is not replacing those
tools. Ward is the tenant containment layer over them.

- "We already use LiteLLM/Portkey/Cloudflare AI Gateway." Good — those
  route and observe. Ward adds the per-tenant containment decision and
  the operator/approval/audit loop. Integration with gateways is the
  Strategy A direction; today Ward sits in the egress path the same
  way they do.
- "We use Okta/Entra/Auth0." That's workforce identity. Ward's
  shared-token auth is a prototype and will defer to your IdP later;
  nothing in Ward competes with it.
- "We use Bedrock/AgentCore." Ward is about which tenant may run, not
  where models run. AgentCore integration is on the Strategy A list.
- "We use Temporal/LangGraph." Keep them. Ward guards the tenant
  boundary around workflows; the runner abstraction and SDK guard are
  the hooks.
- "We need Kubernetes." Docker is first and verified; the K8s runner
  and deployment are planned (`docs/KUBERNETES_PLAN.md`). Honest
  answer: if K8s-native is a hard requirement today, Ward is early.
- "We cannot put a proxy in the critical path." Two honest answers:
  degraded fail-open is implemented and marked on every response; but
  hard-down of the proxy process still needs your fallback routing or
  an HA deployment, which doesn't exist yet. If that's disqualifying
  today, the cooperative SDK guard is the non-proxy entry point.
- "This is not production-ready." Correct, and we say so. It's a
  prototype for design partners; the claims ledger
  (`docs/CLAIMS_AND_EVIDENCE.md`) lists exactly what's real.

## What not to claim

Production readiness; production RBAC; hard-down proxy failover;
complete OpenAI compatibility; production-grade Docker runner;
Kubernetes runner; hosted Ward; Saastle-managed operations.
