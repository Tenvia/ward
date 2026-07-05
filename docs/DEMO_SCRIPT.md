# Ward Demo Script

## Recording target

Length: 5 minutes.

Audience: design partners, CTOs/VPs Eng at existing SaaS companies,
technical advisors.

Tone: concrete, technical, honest. Do not imply production readiness.

## Upstream honesty (read before recording)

The verified demo runs against Ward's **mock upstream** — no external
LLM is called, and every mock response says so in its body.
Pass-through to a real provider exists behind config
(`WARD_UPSTREAM_OPENAI_BASE_URL` + `OPENAI_API_KEY`) but is UNTESTED,
and streaming is unsupported (see `docs/CLAIMS_AND_EVIDENCE.md`).
Until pass-through is verified:

- Record and narrate the demo with the mock upstream, and say so out
  loud (the narration line below covers it).
- Everything else in the demo is real: the app, the loop, the
  detection, the approval, the enforcement, the audit trail.

Once pass-through is verified, update this script and drop the mock
narration line.

## Setup

A real, unmodified Express app (`examples/node-express-ai-saas/`). Two
tenants: Acme and Globex. Each makes AI calls through Ward's proxy.
Nothing about the app is Ward-aware except the base URL and the tenant
header.

## Script

### 0:00-0:30 — Baseline

Both tenants' calls flow normally through Ward's proxy.

> "This is an unmodified Express app. The only thing that changed this
> morning is the OpenAI base URL."

### 0:30-1:15 — Integrate live (the credibility beat)

Show the actual diff: `OPENAI_BASE_URL` points at Ward's proxy endpoint,
one header (`x-ward-tenant-id`) is added to the client. Redeploy. That is
the whole integration.

### 1:15-2:00 — Trigger the problem

Globex's agent enters a real retry loop — repeated calls, not faked
counters. Ward's proxy sees every call and the per-tenant
request/pressure counters climb live. Acme's counter stays flat.

### 2:00-2:45 — Attribution and evidence

The Control Room flags Globex by name with the evidence (requests in
window vs threshold). Ward flags pressure; it never auto-constrains.

> "Operators decide; Ward brings evidence. Recommended: Constrain —
> block Globex's outbound calls, keep the app up."

### 2:45-3:15 — Approve

Request approval, get the single-use token, type the exact
confirmation phrase, apply. Globex's next proxy calls are rejected at
the edge (429) — the proxy stopped it, not "the SDK chose to stop."

### 3:15-4:00 — Proof of non-impact

Split screen: Globex's window shows the contained state, app still
loads. Acme's window: uninterrupted, timeline never blipped.

### 4:00-4:45 — Recover and audit

Resume Globex; calls flow again. Pull up the audit trail: detection ->
evidence -> approval -> transition -> resume, one linked timeline.

### 4:45-5:00 — Close

> "We didn't touch Acme. We didn't touch the app's code path. We changed a
> base URL this morning and gained a kill switch we didn't have
> yesterday."

## Demo line (anchor)

> Globex was contained. Acme never blipped.

## The six things that must be real

If any one of these is faked, the demo reads as theater:

1. One real Express app, unmodified except the base-URL/header change.
2. One tenant genuinely misbehaving (a real repeated-call loop — not a
   script that fakes numbers).
3. One visible, ticking request/pressure counter for the bad tenant.
4. One approval-gated action that stops it (single-use token, exact
   phrase).
5. One split-screen proof that the other tenant never noticed.
6. One audit record tying evidence, approval, and action together.

Anything that is NOT real (today: the mock upstream standing in for a
real LLM provider) must be labeled exactly that, out loud.

## Required narration lines

Say these out loud, do not skip them:

- "This is a real Express app; nothing is scripted except the loop."
- "Ward is running its mock upstream for this recording — no external
  LLM is called, and every response says so. The attribution,
  detection, enforcement, and audit you're watching are real."
  (Drop only once pass-through mode is verified and used.)
- "The operator approval requires a single-use token and an exact
  confirmation phrase; the app never holds a privileged control
  credential."
- "The audit trail persists across restarts with the SQLite prototype;
  compliance-grade retention and export are planned, not shipped."
- "If Ward is up but its policy lookup fails, requests pass through
  flagged and audited — fail-open, never silent. If the Ward process
  itself is fully down, proxied traffic stops; an HA story is planned,
  and we don't claim it yet."

## Historical note

Earlier drafts of this script assumed real OpenAI calls end to end and
compared the evidence bar against internal Saastle lab demos. That
comparison is retired; the current bar is simpler: every element on
the "six things" list is real, and anything simulated is labeled.
