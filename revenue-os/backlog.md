# Revenue OS Backlog

This is a revenue-priority recovery queue, not a general to-do list. Re-rank only when new verified evidence appears.

## P0 — recover the live distribution run

- VERIFIED 2026-08-27T12:23Z (`distribution/buffer-post-status.mjs`, GitHub Actions run 33071594665): the Instagram AI/SaaS cost-review post (Buffer id `6a8f23f6b2db23b19c501243`, due 2026-08-27T01:27:00Z) is `status: error`, `sentAt: null`, `externalLink: null`. It never reached anyone. Root cause: it referenced the corrupted `distribution/ai-saas-cost-instagram-20260827.png` before that file was fixed (fix merged in `11ae9be22f91675ddf302182864c935ec3647a77`, after this post's dueAt had already passed). This run is now classified FAILED per the rule below — a deliberate single re-launch of the `ai_saas_cost_review` campaign (not a blind retry) is unblocked, but has not been done yet. See `revenue-os/metrics.json` `first_distribution_run_2026_08_27`.
- A second, unrelated Instagram post (`vector-note-ai-team-ig-20260827`, Buffer id `6a8ff2a9323198a35b118f6b`, due 2026-08-29T13:47:00Z) is currently `status: scheduled` and uses the now-fixed image, so it should publish normally — re-check status after its due time (see `second_distribution_run_2026_08_27`).
- Do not create another Instagram launch payload for a given campaign until that specific run is classified as PUBLISHED and MEASURED or is shown to have failed (as above).
- RETRY LAUNCHED 2026-08-27T12:27Z (commit `e2fd58485e81f06aed400cdb93213229aeaea20a`, workflow run 33071919211): re-queued the same approved `ai_saas_cost_review` creative as Buffer post `6a902d26821a598e398e4c51`, accepted with `status: scheduled` and no image error — confirms the corrupted-PNG root cause is fixed. `dueAt` 2026-08-30T12:14:00Z. Re-check with `distribution/buffer-post-status.mjs` after that time; do not queue a further retry for this campaign until this one is confirmed sent or failed.

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

- Microsoft Store AI Automation ROI Planner: as of 2026-08-27, manifest/service-worker/icon defects are fixed and verified locally (PWABuilder manifest validation 0/15 failed, SW precache confirmed, real desktop/mobile screenshots captured — see `microsoft-ai-roi-planner/STORE_SUBMISSION.md`). Still requires Partner Center account / identity steps (MFA/identity-verification), product identity / reservation, PWABuilder package generation against the merged production URL, package upload and final submission. Keep this as a bounded manual lane, not an automated retry loop.

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
