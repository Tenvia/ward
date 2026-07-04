# Saastle Internal App Direction

## Summary

Saastle is 10via's internal operating application for managing the
hosted Ward SaaS platform. It is for 10via operators, not Ward
customers. Ward is the external product; Saastle is the company's
control desk for running Ward as a service.

## Role

Saastle manages, over time:

- Hosted Ward tenants and deployments
- Ward customer accounts and workspaces
- Design partners and their feedback
- Incidents and customer-specific containment events
- Operator review and approval queues
- Audit review
- Agent/workflow health across the hosted platform
- Support workflows
- Internal metrics
- Billing/admin workflows (later)

## Architecture rule

Ward must not require Saastle at runtime.

Allowed:

- Saastle reads from and manages Ward through Ward's public APIs.
- Saastle acts as the internal control application for 10via's hosted
  Ward platform.
- Saastle preserves evidence, demos, and proof patterns from the
  original runtime-control work (Acme/Globex proof, constrained mode,
  operator approval, confirmation token, audit trail, AI-loop
  containment).
- Ward borrows product ideas from Saastle. Ward's approval-token flow
  is a native TypeScript reimplementation of Saastle's
  confirmation-token pattern, with no code or runtime dependency.

Forbidden:

- Ward importing from the Saastle repo, symlinking to it, or writing
  files into it.
- Ward customers needing to know about, understand, or run Saastle
  (including Elixir) to use Ward.
- Positioning Saastle as the public product.

## Boundary in practice

- Ward's repo (`~/Projects/10via/ward`) is standalone: TypeScript,
  Docker-first, self-hostable, no reference to Saastle in any runtime
  path.
- Saastle's repo remains private/internal and is the evidence source
  for the original runtime/control claims.
- When hosted Ward exists, Saastle consumes the same Ward APIs any
  customer could use, plus internal-only admin surfaces added later.

## Status

- Saastle-managed hosted Ward operations: planned. No integration is
  built yet, and none is required for anything in this repository.
