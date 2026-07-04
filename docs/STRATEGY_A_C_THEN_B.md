# Strategy: A + C first, then B

## Summary

Ward is the tenant containment layer over existing tools (Strategy A),
sold first to multi-tenant SaaS teams (Strategy C). It grows into an
open-source Docker/Kubernetes agent containment platform (Strategy B)
only after the first proof is solid.

## First lane (A + C)

The first buyer pain: "One customer's agentic workflow is going
sideways. Can we contain that tenant without taking everyone else
down?"

Ward's first lane is exactly six things:

1. Tenant state (running / constrained / paused)
2. Pressure evidence
3. Operator approval (token + phrase)
4. Containment action at the egress chokepoint
5. Audit receipt
6. Existing-SaaS demo proving it (Acme/Globex)

Ward does not try to replace gateways, identity providers,
observability tools, or workflow runtimes.

## Integrations over time (Strategy A)

- Gateways: LiteLLM, Portkey, Cloudflare AI Gateway
- Observability: Langfuse, LangSmith, AgentOps
- Identity: Okta, Entra, Auth0
- Workflow runtimes: Temporal, AgentCore
- Infrastructure: Docker, Kubernetes

All planned; none built. Ward should sit beside these, attributing and
containing per tenant, not competing with them.

## Strategy B later

- Open-source Docker/K8s agent containment platform
- Real workflow runners (Docker runner is a dev-only prototype today;
  K8s runner is planned)
- Durable state (SQLite prototype today; Postgres for hosted/K8s)
- Production deployment model

Docker and Kubernetes matter a lot, but they follow the product proof,
not the other way around. The proof remains: "Globex was contained.
Acme never blipped."
