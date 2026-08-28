# Acquisition Intelligence Engine — build record

Date: 2026-08-27
Branch: `claude/acquisition-intelligence-engine-7wdj7p`
Owner axis: acquisition routing and measurement. This is a **new axis**, not a replacement
for the Revenue Distribution Engine, the Outbound Revenue Executor role, the trend-video
engine, or the Buffer distribution lane. Each of those keeps its own file and its own job.

## Bottleneck this addresses

Per `AGENTS.md` and `revenue-os/backlog.md`, the current constraint is qualified traffic to
already-live offers, with Stripe Live still showing no verified purchase as of 2026-08-24.
The gap was not a missing product; it was that demand → asset → channel → attribution →
downstream evidence had no machine-readable representation, so nothing could be compared or
replicated.

## What was built

`acquisition/` — a file-based, dependency-free engine (Node 22, no package manager, no new
service, no database). See `acquisition/README.md` for the full command surface.

- **Asset inventory** (23 assets) built only from URLs that resolve to a file in this
  repository, with `revenue_destination` read out of each page's own markup.
- **Asset router** that refuses to recommend a new product whenever an existing asset fits.
- **Signal scoring** with a per-dimension evidence class, a safety floor and a measurement
  floor.
- **Channel selection** per asset × audience × intent, never mass distribution.
- **Deterministic UTM/attribution** whose source and medium come from
  `distribution/source-routing.json`, so the existing analytics taxonomy is preserved.
- **Queue state machine** where a request is never `PUBLISHED` and a publish is never
  `VERIFIED`.
- **Unified distribution ledger** that adapts `trend-video-engine/publish-ledger.json`
  read-only, so video and image/text distribution finally sit in one view.
- **Winner engine** where views alone can never produce `SCALE`.
- **Daily acquisition report** answering the twelve operating questions from repository
  state only.

## Findings surfaced by the build

1. **`return-gate-growth-os.html` has no checkout.** The page renders "Direct checkout
   temporarily paused" and contains no Stripe/Payhip/Gumroad link, while
   `revenue-os/metrics.json` `return_gate_monetization_closure_2026_08_27` describes a
   Return Gate → $24 Growth OS route. The route exists; the purchase cannot complete. The
   inventory records this as `status: PAUSED_CHECKOUT` / `revenue_destination.type: PAUSED`,
   the router attaches `CHECKOUT_PAUSED_NO_PURCHASE_POSSIBLE`, and the daily report lists it
   under commercial path gaps. **Not changed here** — pricing and store URLs are owner-only
   per `AGENTS.md`.
2. **`roi.stratumpraxis.com` is DOC_ONLY.** It is listed under verified destinations in
   `AGENTS.md`, but no source file for it exists in this repository and it is not in
   `sitemap.xml`. It is recorded as `DOC_ONLY` and is therefore excluded from routing until
   somebody verifies it.
3. **Two live commercial pages are absent from `sitemap.xml`** —
   `ai-saas-spend-decision-kit.html` and `product-router.html`. Both are marked `REPO_ONLY`.
4. **The video lane carries no attribution.** Every adapted `trend-video-engine` record has
   no UTM parameters and `campaign: UNKNOWN`, so none of the 11 published video posts can be
   attributed to a destination or a funnel stage. This is the single largest measurement gap
   in the current distribution picture.
5. **No downstream measurement exists on any distribution record.** Across all 12 unified
   ledger records, every funnel stage is `NOT_MEASURED` — which is a different statement
   from zero, and is preserved as such.

## Safety posture

The engine composes existing controls rather than duplicating them:
`distribution/provider-policy.json` decides who may publish where,
`distribution/safety-audit.mjs` and `claude-bridge/validate-candidate.mjs` supply the
blocked-claim patterns and domain allowlist, and `scos-analytics.js` supplies the event
taxonomy. Added on top: cadence limits, a retry ceiling, duplicate campaign and duplicate
copy detection, destination/asset agreement, and a cross-lane collision guard that
mechanically enforces the backlog P0 rule.

That guard immediately blocked the first seeded queue item: `distribution/launch-now.json`
still has an in-flight `ai_saas_cost_review` Instagram run for
`ai-saas-waste-calculator.html`, so the new Instagram payload for the same destination is
refused until that run is confirmed sent or failed.

## Verification performed

- 101 tests pass (`node --test 'acquisition/test/*.test.mjs'`), including deliberately
  invalid inventory, invalid queue and unsafe queue fixtures.
- `distribution/distribution-safety-auditor.mjs` and `distribution/safety-audit.mjs` still
  pass unchanged.
- All 15 GitHub workflows parse.
- An integration test asserts that no file under `trend-video-engine/`, `distribution/`,
  `revenue-os/` (metrics/backlog), `revenue-link-ledger.md`, `scos-analytics.js`,
  `sitemap.xml` or `AGENTS.md` is modified by any engine command, including under concurrent
  invocation.

## HUMAN_REQUIRED

- Approval of every queued item (`approval_status: PENDING_HUMAN`; no code sets it).
- Creative production for any queued item.
- DEV / Pinterest / Bluesky / Threads / LINE connection and authentication.
- Live HTTPS verification must run from GitHub Actions
  (`Acquisition Intelligence Engine Check` → `live_url_verification`); outbound HTTPS to the
  public site was blocked from the authoring environment.
- Any decision about the paused Return Gate Growth OS checkout.

## Highest-value next step

Attribution on the video lane. Eleven video posts are published and none of them can be
traced to a destination, so the strongest existing distribution channel produces no
learnable signal. Adding a tracked destination URL to the video manifest and recording it in
the ledger would convert the entire video lane from unmeasurable to measurable without
producing a single new asset.
