# Revenue OS Backlog

This is a revenue-priority recovery queue, not a general to-do list. Re-rank only when new verified evidence appears.

## P0 — recover the live distribution run

- The Instagram AI/SaaS cost-review run is already scheduled through Buffer and must not be duplicated. After the scheduled publication time, recover the real public post URL, then verify social UTM traffic and downstream calculator / CTA / checkout events.
- Do not create another Instagram launch payload until the current run is classified as PUBLISHED and MEASURED or is shown to have failed.

## P0 — first genuine purchase proof

- Current Stripe evidence still has no verified genuine purchase. Keep the focus on existing live paths rather than catalog growth.
- When the first legitimate purchase appears, verify the full chain: completed payment → correct buyer-only delivery → activation / first use. Do not use a self-purchase or synthetic transaction as market validation.

## P1 — qualified traffic into existing assets

- Prioritize existing pages already connected to paid paths: AI/SaaS Spend funnel, AI Council Builder, Revenue Router, Workflow Audit, AI Operations Standard / SOP Kit, Return Gate, and other sitemap-listed assets.
- Search discovery work should amplify these existing pages rather than create generic new tools.
- Return Gate currently has no verified measured visits in the latest metrics; treat it as published but not yet validated as a traffic/revisit mechanism.

## P1 — measurement closure

- Separate pageview, qualified visit, CTA click, checkout click/start, purchase, delivery, activation, 24h revisit and 7d revisit. Do not collapse them into a generic completion state.
- Update `revenue-os/metrics.json` only from observed analytics, platform, payment, or deployment evidence.

## P2 — external waits; do not waste cycles

- AIToolsDir submissions: wait for review / listing result; no resubmission or repeated follow-up.
- Fab Game UI Pack: wait for approval; no new asset work while review is pending.
- X / Stratumpraxis: suspension decision remains external-blocked; do not route distribution through risky replacement behavior.

## HUMAN REQUIRED — owner-only, not agent retry work

- Microsoft Store AI Automation ROI Planner still requires Partner Center account / identity steps, product identity / reservation, real app screenshots, package upload and final submission. Keep this as a bounded manual lane, not an automated retry loop.

## Resolved blockers — do not reopen without new evidence

- Gumroad payout / identity verification is resolved and is not an active blocker.
- AI Practical Check v2 Production publish is complete.
- AI Consultant Worker STRIPE_SECRET_KEY configuration blocker is resolved.
- AI Council Builder JA Production / Stripe redirect setup is complete.

## New-product gate

Do not create a new product unless all are true:

1. There is specific demand evidence.
2. Existing offers cannot absorb the opportunity with a small change.
3. The current highest-proximity unfinished revenue paths have been reviewed by the Recovery Controller.
4. A purchase path is defined before building.
5. Success can be measured after launch.

Default preference: advance an existing path from PUBLISHED → DISTRIBUTED → MEASURED → PURCHASED → ACTIVATED before adding another asset.
