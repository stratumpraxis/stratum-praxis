# Revenue OS Backlog

This is a revenue-priority recovery queue, not a general to-do list. Re-rank only when new verified evidence appears.

## P0 — recover the live distribution run [DISTRIBUTED, not yet MEASURED]

- CLOSED 2026-08-27: the original Instagram AI/SaaS cost-review post (Buffer id `6a8f23f6b2db23b19c501243`) failed (`status: error`, corrupted-image root cause). Do not reopen or re-retry that specific post id — it is superseded by the retry below.
- PUBLISHED — verified 2026-08-30T13:01Z (`distribution/buffer-post-status.mjs`, GitHub Actions run 33313034773):
  - `ai-saas-cost-ig-20260827-retry1` (Buffer id `6a902d26821a598e398e4c51`, utm_content=`ig_20260827_retry1` → `ai-saas-waste-calculator.html`): `status: sent`, sentAt `2026-08-30T12:14:08.933Z`, live post: https://www.instagram.com/p/DcqfJlkFnsV/. Confirms the corrupted-PNG fix (PR #34) fully resolved the original failure.
  - `vector-note-ai-team-ig-20260827` (Buffer id `6a8ff2a9323198a35b118f6b` → note.com AI-team article): `status: sent`, sentAt `2026-08-29T13:47:08.639Z`, live post: https://www.instagram.com/p/DcoE_3oFqMQ/.
- NEXT: pull PostHog evidence for `utm_content=ig_20260827_retry1` pageviews/CTA/checkout on `ai-saas-waste-calculator.html`, and any referral evidence for the note.com post, before calling either run MEASURED. Do not launch a further Instagram post for this campaign until that measurement is done — this is now a measurement gap, not a publishing gap.

## P0 — first genuine purchase proof [checkout-completion gap, not a link/traffic problem]

- Current Stripe evidence still has no verified genuine purchase. Keep the focus on existing live paths rather than catalog growth.
- RULED OUT 2026-08-30T13:08Z (`revenue-safety-loop.yml` run 33313340497, PR #67): all 32 distinct `buy.stripe.com` payment links on the site return HTTP 200 and none report inactive/expired. Dead or misconfigured checkout links are not the explanation for `checkout_click: 17` vs `stripe_live_payment_intents: 0` (see `revenue-os/2026-08-29-revenue-activation.md` §8). This check now runs every 6h and will auto-escalate a GitHub issue if a link ever breaks — no need to re-verify link reachability manually.
- What remains needs Stripe Dashboard or API read access (abandoned-session detail, payment-method decline reasons, currency/country blocks, or a price/line-item mismatch inside an actual Checkout Session) — see HUMAN REQUIRED below. No session so far has had this access; do not keep re-deriving the same "traffic vs conversion" hypothesis without it.
- When the first legitimate purchase appears, verify the full chain: completed payment → correct buyer-only delivery → activation / first use. Do not use a self-purchase or synthetic transaction as market validation.

## P1 — market-signal LP strengthening (2026-08-27)

- Ran a market-signal pass (public search only, no scraping/login-required sources): "shadow AI" spend + CFO quarterly-accountability pressure is a strong, current, multi-source-verified 2026 demand signal that matches the existing AI & SaaS Spend Decision Hub funnel exactly (free `ai-saas-waste-calculator.html` -> `ai-saas-spend-audit-checklist.html` -> $39 `ai-value-realization-kit.html` -> $499 `ai-saas-spend-waste-audit.html`), which is also this campaign's active Instagram distribution target. Scored 88/110 — see `revenue-os/metrics.json` `market_signal_loop_2026_08_27`.
- New-product gate correctly fails here (existing offer already absorbs this demand), so the action was a copy-only strengthening of `ai-saas-waste-calculator.html` (PR #39, commit `fd189b19900291081b7dd3a655db7202312c7c44`, deployed and Pages-build-verified): added "Shadow AI tools" to the existing waste-pattern checklist and a 4-item objection-handling FAQ. No pricing, CTA, calculator logic, or analytics taxonomy changed.
- Traffic/conversion impact of this change is PENDING/UNVERIFIED — no PostHog access in this session. Check `primary_cta_click` on this page pre/post 2026-08-27 once real traffic arrives before amplifying further.

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

- Stripe Dashboard checkout-completion diagnosis: `checkout_click: 17` vs `stripe_live_payment_intents: 0` over 30 days, and dead/expired payment links are now ruled out (all 32 return HTTP 200, see P0 above). The owner (or a session with Stripe Dashboard/API read access) needs to check the abandoned/incomplete Checkout Sessions for the actual reason — payment-method decline, currency/country restriction, or a price/line-item mismatch. No agent session so far has had this access; do not keep re-diagnosing this from the site side without it.
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
