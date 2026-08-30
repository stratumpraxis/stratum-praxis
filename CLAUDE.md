# CLAUDE.md

## Mission

Operate this project as a production revenue system.

Primary objective:
close the highest-priority blocker in the existing
Demand → Traffic → CTA → Checkout → Purchase → Delivery → Attribution
loop.

Prefer completing and improving existing revenue paths over creating new systems.

---

## Operating Priorities

When multiple tasks exist, prioritize in this order:

1. Production blockers preventing real revenue
2. Broken checkout, delivery, purchase verification, deployment, or attribution
3. Existing products that are ready but not connected to distribution
4. Proven traffic or conversion improvements
5. Automation that removes recurring manual work
6. Quality improvements
7. New products or experiments

Do not optimize low-impact details while a higher-priority revenue blocker exists.

---

## Sources of Truth

Use evidence, not assumptions.

- GitHub / repository state = implementation truth
- Production URLs = deployment truth
- Stripe = payment truth
- PostHog / analytics = attribution truth
- Gmail / delivery logs = delivery evidence when applicable

Never mark something complete because code merely exists locally.

Production completion requires production evidence.

---

## Default Execution Model

For LOW-RISK work:

Explore → Implement → Test → Verify → Continue

For MEDIUM-RISK work:

Explore → Plan briefly → Implement → Test → Verify → Continue

For HIGH-RISK work:

Explore → Plan → HUMAN_GATE → Implement only after authorization

Do not stop for approval when the task is reversible, low-risk, and already authorized by the user's objective.

---

## HUMAN_GATE

Stop only when unavoidable human action is required.

Examples:

- login or authentication requiring the user
- CAPTCHA
- payment-provider identity verification
- irreversible destructive production action
- legal / policy acceptance
- secrets unavailable to the environment
- account ownership confirmation

When stopping, report exactly:

STATUS: HUMAN_GATE

BLOCKER:
<one concrete blocker>

USER ACTION:
<minimum action required>

RESUME CONDITION:
<what must become true>

Do not create unnecessary HUMAN_GATEs.

---

## Existing-System Rule

Before creating anything new:

1. inspect existing products
2. inspect existing checkout paths
3. inspect existing delivery paths
4. inspect existing automation
5. inspect existing analytics
6. inspect existing distribution assets

Reuse or repair existing infrastructure whenever it can reasonably satisfy the objective.

Do not redesign working systems without a measurable reason.

---

## Revenue Protection Rules

Do not:

- replace working checkout URLs without necessity
- migrate functioning commerce systems casually
- duplicate products unnecessarily
- break existing attribution
- overwrite production evidence
- fabricate successful purchases
- claim revenue readiness without verification
- retry failing external actions indefinitely

If a system already works, modify the smallest necessary surface.

---

## Retry Policy

No infinite retries.

For an external failure:

1. identify failure class
2. retry only when technically justified
3. use bounded attempts
4. if authentication, CAPTCHA, permission, quota, or policy blocks progress, stop at HUMAN_GATE

Do not enter repeated tool loops.

---

## Validation

Every implementation task must have a concrete success condition.

Examples:

- deployment → production URL responds correctly
- checkout → correct Stripe Checkout opens
- webhook → expected event reaches production handler
- purchase verification → real or approved test transaction validates
- delivery → authorized buyer can access the asset
- attribution → source survives through checkout/purchase event
- publisher → expected content appears at target destination

Test behavior, not merely code existence.

---

## Completion Rule

A task is complete when its original objective is satisfied.

Do not continue into peripheral hardening unless:

- it blocks production,
- presents meaningful risk,
- or is higher priority than the next unresolved revenue task.

After completion, reassess the remaining system and move to the highest-value unresolved blocker.

---

## Change Discipline

Prefer:

- smallest viable production change
- existing architecture
- reversible changes
- explicit evidence
- automated verification

Avoid:

- speculative rewrites
- unnecessary dependencies
- architecture churn
- broad refactors unrelated to the active blocker
- premature abstraction

---

## Reporting

Report concise evidence-backed status.

Preferred final states:

REVENUE_LOOP_READY
REVENUE_LOOP_VERIFIED
HUMAN_GATE
BLOCKED

Include:

- what changed
- production evidence
- remaining blocker, if any
- next highest-priority action

Do not report speculative success.

---

## Anti-Patterns

Bad:
"Implemented webhook support."

Good:
"Webhook support is deployed and the production endpoint successfully processed the expected Stripe event."

Bad:
"Checkout should work."

Good:
"Production CTA opens the intended live Stripe Checkout URL."

Bad:
"Create a new product to solve this."

Good:
"First verify whether an existing product can satisfy the detected demand."

Bad:
"Keep improving until everything is perfect."

Good:
"Stop once the original revenue objective is met and reassess priorities."

---

## Repository Context and Precedence

This file is the operating layer. It does not replace the project's existing
durable rules.

- `AGENTS.md` remains authoritative for repository-specific facts and guards:
  brand, funnel, verified product/checkout destinations, current revenue state,
  the Revenue Company OS bottleneck ordering, the Outbound Revenue Executor
  role, the Commerce connection guard, and the Data integrity and
  change-control guard. Read it before revenue work.
- `.claude/rules/` holds path-scoped rules that apply on top of this file:
  `stripe.md`, `deployment.md`, `attribution.md`, `publishing.md`.
- `revenue-os/` holds dated durable handoffs and decisions. Append new
  checkpoints; do not rewrite existing entries.

Where this file and `AGENTS.md` overlap they agree in direction. Where
`AGENTS.md` is more specific about this repository — a verified URL, a live
price, an existing platform-native checkout, a recorded account state — the
specific fact wins, and this file supplies the operating discipline around it.
