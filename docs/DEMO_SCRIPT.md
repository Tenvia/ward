# Ward Demo Script

## Recording target

Length: 5 minutes.

Audience: design partners, CTOs/VPs Eng at existing SaaS companies,
technical advisors.

Tone: concrete, technical, honest. Do not imply production readiness.

## Setup

A real, unmodified Express app. Two tenants: Acme and Globex. Each has a
background agent loop calling the real OpenAI API. Nothing about the app is
Ward-aware until the integration step.

## Script

### 0:00-0:30 — Baseline

Both tenants' agents run normally against the real OpenAI API through
Ward's proxy.

> "This is an unmodified Express app. The only thing that changed this
> morning is the OpenAI base URL."

### 0:30-1:15 — Integrate live (the credibility beat)

Show the actual diff: `OPENAI_BASE_URL` points at Ward's proxy endpoint,
one header (`X-Ward-Tenant`) is added to the client. Redeploy. That is the
whole integration.

### 1:15-2:00 — Trigger the problem

Globex's agent hits a broken tool and enters a retry loop. Ward's proxy
sees every call — real traffic, not simulated — and the loop-count/spend
counter climbs live. Acme's counter stays flat.

### 2:00-2:45 — Attribution and recommendation

The cockpit flags Globex by name with the evidence (calls/min, dollars
burned).

> "Recommended: Constrain — hold Globex's outbound calls, keep the app up."

### 2:45-3:15 — Approve

Click Constrain, confirmation token, approve. Globex's next proxy calls
are held/rejected at the edge — the proxy physically stopped it, not "the
SDK chose to stop."

### 3:15-4:00 — Proof of non-impact

Split screen: Globex's window shows "agent paused by operator," app still
loads. Acme's window: uninterrupted, timeline never blipped.

### 4:00-4:45 — Recover and audit

Click Resume, Globex's agent resumes cleanly. Pull up the incident record:
detection -> evidence -> approval -> transition -> resume, one linked
timeline.

### 4:45-5:00 — Close

> "We didn't touch Acme. We didn't touch the app's code path. We changed a
> base URL this morning and gained a kill switch we didn't have
> yesterday."

## Demo line (anchor)

> Globex was contained. Acme never blipped.

## The six things that must be real

If any one of these is faked, the demo reads as theater:

1. One real Express app, unmodified except the base-URL/header change.
2. One tenant genuinely misbehaving (a real retry loop against a real
   broken tool — not a script that fakes numbers).
3. One visible, ticking cost/loop counter for the bad tenant.
4. One click that stops it, gated by an approval step.
5. One split-screen proof that the other tenant never noticed.
6. One exportable record tying evidence, approval, and action together.

## Required narration lines

Say these out loud, do not skip them:

- "This is a real Express app; nothing is scripted except the broken tool."
- "The proxy sees real traffic — this is not a simulated pressure signal."
- "The operator approval requires a confirmation token; the app never
  holds a privileged control credential."
- "The audit record today persists for the duration of this incident
  path; durable long-term retention is a planned, not yet shipped, Ward
  capability." (Only state this if durable audit has not yet shipped —
  update once it has.)
- "Ward fails open — if the control plane were unreachable, calls would
  pass through unmodified, not fail."

## Relationship to Saastle's own demo

Ward's demo is a materially stronger evidence bar than Saastle's own M5/M6
lab demos, which use synthetic, deterministic pressure signals explicitly
labeled `simulated: true` (see `docs/SAASTLE_SOURCE_MAP.md`). Ward's demo
must use real traffic end to end. Do not borrow Saastle's "simulated"
framing into Ward's demo narration unless a specific piece of Ward's own
demo is, in fact, simulated — and if so, label it exactly that plainly.
