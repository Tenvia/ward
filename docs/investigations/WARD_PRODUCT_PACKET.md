# Ward Product Packet (HISTORICAL — investigation artifact)

> **Historical document.** This packet predates the standalone
> TypeScript implementation; references to an Elixir/BEAM runtime or
> inherited engine are historical and no longer true (see
> `docs/ARCHITECTURE.md`). Current positioning: `docs/PRODUCT_SPINE.md`
> and `ROADMAP.md`. Nothing below is a current claim.

## Summary

Ward is positioned as the per-customer kill switch for AI SaaS: pause,
throttle, or recover one tenant's AI agent work without touching any other
tenant, and without requiring the customer's application to adopt the
Elixir/BEAM runtime. Integration is a base-URL change plus a small SDK
surface, not a rewrite.

## 1. Product Thesis

Ward sits in the two places an agent already talks to the outside world: the
LLM/tool call, and the loop that decides to keep working. It gives the
operator a lever at both points — pause, throttle, or recover one tenant's AI
work — while every other tenant's traffic is untouched. The Elixir/BEAM
engine (Saastle's existing supervision core) is Ward's internal brain, never
something a customer adopts or sees. What they adopt is a base-URL change and
a few lines of SDK.

**One-line thesis:** Ward turns "disable AI for everyone" into "pause Acme,"
without moving a single line of the customer's application code into a new
runtime.

## 2. First Buyer and Design-Partner Profile

- **Buyer:** CTO / VP Eng at a 10-100 person B2B SaaS with tenant-scoped AI
  agents, on a Node/Python/Ruby stack (not Elixir — that is the point).
- **Daily user:** on-call engineer, later support/CS.
- **Urgent pain:** one customer's agent loop or tool storm burns spend, hits
  a third-party rate limit, or writes bad data — and the only lever today is
  a global feature flag or a hotfix.
- **Disqualifiers:**
  - Teams with no per-tenant AI execution (nothing to contain).
  - Teams not yet in production with agents (no incident pressure yet).
  - Teams already deep in a homegrown per-tenant flag system they trust.
- **Qualifying question:** "Tell me about the last time one customer's AI
  feature caused an incident. What did you actually do?" — if the answer is
  "we don't have per-customer agents" or "we've never had that problem,"
  they are not this buyer yet.

## 3. The 5-Minute Demo Script (Plain Node/Express App)

Setup: an ordinary Express app, two tenants (Acme, Globex), each with a
background agent loop calling OpenAI. Nothing about the app is Ward-aware
until step 2.

| Time | Beat | Detail |
| --- | --- | --- |
| 0:00-0:30 | Baseline | Both tenants' agents run normally against the real OpenAI API through Ward's proxy. "This is an unmodified Express app. The only thing that changed this morning is the OpenAI base URL." |
| 0:30-1:15 | Integrate live (credibility beat) | Show the actual diff: `OPENAI_BASE_URL` to Ward's proxy endpoint, one header (`X-Ward-Tenant`) added to the client. Redeploy. That is the whole integration. |
| 1:15-2:00 | Trigger the problem | Globex's agent hits a broken tool and enters a retry loop. Ward's proxy sees every call (real traffic, not simulated) and the loop-count/spend counter climbs live. Acme's counter stays flat. |
| 2:00-2:45 | Attribution and recommendation | Cockpit flags Globex by name with evidence (calls/min, dollars burned). "Recommended: Constrain — hold Globex's outbound calls, keep the app up." |
| 2:45-3:15 | Approve | Click Constrain, confirmation token, approve. Globex's next proxy calls are held/rejected at the edge — the proxy physically stopped it, not "the SDK chose to stop." |
| 3:15-4:00 | Proof of non-impact | Split screen: Globex's window shows "agent paused by operator," app still loads. Acme's window: uninterrupted, timeline never blipped. |
| 4:00-4:45 | Recover and audit | Click Resume, Globex's agent resumes cleanly. Pull up the incident record: detection to evidence to approval to transition to resume, one linked timeline. |
| 4:45-5:00 | Close | "We didn't touch Acme. We didn't touch the app's code path. We changed a base URL this morning and gained a kill switch we didn't have yesterday." |

## 4. The Exact Integration Story

Three tiers, ship in this order, each standalone-sellable. No tier requires
the customer's application to run on BEAM — the Elixir core only runs inside
Ward's own container/service.

### Tier 1 — Egress Proxy (the wedge, ships first)

Point `OPENAI_BASE_URL` (or Anthropic/tool-API base URL) at Ward, pass a
tenant header. Ward's proxy attributes every outbound call by tenant, meters
it against the shadow runtime for that tenant, and enforces state at the
edge: constrained tenants get calls throttled or rejected before they reach
the real API.

- Integration time: minutes.
- Enforcement: physical — no cooperation from app code required.
- Solves the "pressure is simulated" gap honestly, because the proxy sees
  real traffic.

### Tier 2 — TypeScript SDK Guard/Lease (deeper containment)

`await ward.guard(tenantId, () => doWork())` around the agent loop or job
handler. Each iteration leases a short-lived permission from the tenant's
shadow runtime, pushed to the SDK over the existing tenant-scoped channels so
checks are local and fast, not a network round-trip per call.

- Constrained: lease returns throttle instructions.
- Paused: lease denied, loop parks.
- "Restart" is honestly a revoke-and-drain: all leases revoked, in-flight
  work checkpoints or aborts, fresh leases granted on resume.

### Tier 3 — Queue Middleware (later, not in the first 2 weeks)

BullMQ/Celery/Sidekiq adapters that check the shadow runtime before
dequeuing a tenant's job. This is the Governor-style backpressure expansion
— sequence it after Tiers 1-2 prove the wedge.

## 5. The Guarantee Ladder by Integration Mode

| Mode | What's enforced | What's not | Say this to buyers |
| --- | --- | --- | --- |
| Proxy only | Outbound LLM/tool calls physically held/blocked for a constrained or paused tenant | A local loop can still spin CPU/memory until its next outbound call | "Hard containment at the point of external cost and risk." |
| Proxy + SDK guard | Above, plus the loop itself yields at each lease check — spin is bounded to one iteration | Requires the app to call `ward.guard` around its loop | "Hard containment at the edge, cooperative containment on the loop itself." |
| SDK guard only (no proxy) | Loop yields at lease checks | Nothing stops calls that bypass the guard | Positioned as a fallback for non-LLM automations, not the lead story |

State this ladder explicitly in docs and in the pitch. Never imply
proxy-level guarantees for SDK-only integrations. Ward's decision path fails
open (allow) if the control plane is unreachable — Ward must never become
the outage.

## 6. The 2-Week Build Plan

### Week 1

- Build the egress proxy: pass-through to OpenAI/Anthropic, tenant
  attribution via header, per-tenant call/token counters backed by the
  existing Elixir supervision core (shadow runtime per tenant).
- Wire proxy counters into the existing enforcement/pressure tables —
  replace the simulated signal on this one path with real metered data.
- Docker one-liner (`docker run ward`) so a design partner can stand it up
  in one command.

### Week 2

- TS SDK: add `ward.guard(tenantId, fn)` lease primitive, backed by the
  existing tenant-scoped channel push (not polling).
- Durable audit record for the full incident lifecycle (detection to
  evidence to approval to transition to resume) — this was prototype-level
  before; make this one path real.
- Build the scripted demo: plain Express + OpenAI app, unmodified except the
  base-URL/header integration, matching the script in Section 3.
- Cut everything else from the surface area: hide policy/entitlement/OOM
  tables, multi-node, plugin hooks from anything a design partner sees.

**Do not touch** queue middleware, multi-node placement, or the cockpit's
broader policy UI in these two weeks.

## 7. The README Rewrite Outline

1. One-line pitch at the top: "Ward pauses one customer's AI agents while
   every other customer keeps running — no rebuild required."
2. 60-second quickstart: the base-URL + header change, nothing else, working
   example.
3. What Ward is not: not an agent framework, not APM/observability, not a
   plugin marketplace, not a Kubernetes replacement, not something you run
   your app inside.
4. How it works, one paragraph: proxy attributes traffic by tenant, shadow
   runtime tracks state, enforcement holds calls at the edge, operator
   approves containment, audit trail.
5. Guarantee ladder table (Section 5) — stated plainly, including what's not
   enforced per mode.
6. Honest status section: what's real today (proxy metering, containment,
   audit for this path) vs. prototype (multi-node, broader policy engine,
   queue middleware — not built yet).
7. Demo link/GIF of the Acme/Globex scenario.
8. Design partner CTA, not a generic "contributing" section.

**Remove or demote:** architecture deep-dives, the full primitive list,
anything implying production-readiness or multi-node support, above the
fold.

## 8. Claims We Can Make Now vs. Must Avoid

### Can claim now

- "Pause, throttle, or recover one customer's AI agent calls without
  touching others" — true once the proxy enforces this.
- "Integration is a base-URL and header change" — true for Tier 1.
- "Real per-tenant spend and call metering" — true once proxy metering
  ships.
- "Every containment action is approved and audited" — true once the audit
  path is durable.
- "Fails open — Ward being down never takes your app down" — true if built
  that way, and must be built that way before claiming it.

### Must avoid

- "Production-ready" / any uptime or SLA claim.
- "Works across multi-node deployments" — not built.
- Implying SDK-only integration gives edge-level enforcement — it doesn't;
  state the ladder.
- "Prevents all runaway AI costs" — it bounds one tenant's blast radius, it
  doesn't guarantee cost ceilings against every failure mode (e.g., a loop
  that never calls the proxied API).
- Any plugin-marketplace, generic-observability, or "platform" framing.

## 9. Objections from Existing SaaS Teams and Sharp Answers

- **"We already have feature flags."** Flags are global or manually
  tenant-keyed booleans with no runtime state, no lease/lockstep with
  in-flight work, and no audit trail tied to evidence. You can build "off,"
  you can't cheaply build "constrained-but-alive," approval-gated, and
  audited — that's the part that gets skipped until the incident.
- **"We're not on Elixir, this won't fit our stack."** You never touch
  Elixir. You change a base URL and add a header. The BEAM engine is Ward's
  internal implementation, the same way you don't need to know Postgres
  internals to use a hosted database.
- **"Another vendor in our critical path to OpenAI."** Ward fails open — if
  unreachable, calls pass through unmodified. Worst case is you lose
  containment temporarily, not availability.
- **"What about loops that don't call an external API?"** Proxy-only
  containment doesn't reach those; that's Tier 2 (SDK guard) — state the
  ladder honestly rather than overclaiming Tier 1 covers everything.
- **"Latency added to every LLM call."** Proxy adds one attribution/metering
  hop; benchmark and publish the number rather than asserting it away. If
  it's not negligible, that's a Week 1 finding to fix, not hide.
- **"How is this different from an LLM gateway/rate limiter we could build
  ourselves?"** A gateway limits; it doesn't model tenant state
  (running/constrained/paused), doesn't give an approval workflow, and
  doesn't produce an incident-shaped audit trail. Ward is the operational
  layer on top of the metering, not the metering itself.

## 10. The Minimum Lovable Demo That Proves the Category

The smallest thing that earns "I need this, not just I understand this":

- One real Express app, unmodified except the base-URL/header change.
- One tenant genuinely misbehaving (a real retry loop against a real broken
  tool — not a script that fakes numbers).
- One visible, ticking cost/loop counter for the bad tenant.
- One click that stops it, gated by an approval step.
- One split-screen proof that the other tenant never noticed.
- One exportable record tying evidence, approval, and action together.

If any one of these is faked (simulated pressure, a scripted "constrain"
that doesn't actually block a real call, no visible unaffected tenant), the
demo reads as theater and the category doesn't land. If all six are real,
five minutes is enough to produce "this is a lever I didn't have."
