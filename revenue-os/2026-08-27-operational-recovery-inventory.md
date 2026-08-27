# Operational recovery inventory — 2026-08-27

Scope: recurring failures, unfinished work, repeated manual intervention and
partially automated workflows found in current repository evidence (`main`,
workflow run history, `revenue-os/`, `distribution/`, `.deployment-status/`,
live page/asset state). Built from the current tree rather than from earlier
summaries.

Branch: `claude/operational-burden-recovery-68rqui`.

**Guardrail observed throughout:** the AI/SaaS Spend experiment has an open
measurement (Instagram post `6a902d26821a598e398e4c51`, due 2026-08-30, and the
pre/post `primary_cta_click` read on `ai-saas-waste-calculator.html`). Nothing
in that funnel's pages or payloads was modified. Where a fix would otherwise
have touched it, the page is listed as a documented, dated exemption instead.
The held set is the funnel chain itself plus
`guides/ai-saas-renewal-cost-check.html`, whose only job is routing into that
calculator and kit. Hub pages that merely list the $39 kit among many products
are treated as general site assets and were fixed normally.

---

## 1. Corrupt media reaching publishers and stores — FIXED (durable)

- **Evidence.** `revenue-os/metrics.json` `first_distribution_run_2026_08_27`:
  Buffer post `6a8f23f6b2db23b19c501243` returned `status: error`, `sentAt:
  null`, `externalLink: null` — it reached nobody. Root cause was the truncated
  `distribution/ai-saas-cost-instagram-20260827.png` (6,603 bytes; the valid
  file is 115,765). Separately, `microsoft-ai-roi-planner/icon-512.png` was
  corrupt (7,016 → 14,578 bytes) and blocked Store readiness. Both were found
  only after an external platform rejected them.
- **Recurrence risk.** High. Media is rendered by CI (`render.py`,
  `render-campaign.py`, `cairosvg`) and committed as binaries; a truncated
  write looks identical to a good one in `git status`.
- **Revenue impact.** Total for the affected run — a scheduled campaign that
  never reached an audience — plus a blocked Store submission.
- **Human time.** Hours of after-the-fact diagnosis per occurrence.
- **Fix.** `tools/check-media-integrity.mjs` validates PNG/JPEG/GIF/WebP/ICO/
  SVG/MP4 structure (chunk walk, IEND/EOI/trailer, MP4 box tree, `moov`
  presence, empty files). Runs on every push and pull request via
  `.github/workflows/repo-integrity.yml`. Verified against deliberately
  truncated copies of the real assets.

## 2. Publish paths with no safety gate — FIXED (durable)

- **Evidence.** `distribution-launch-once.yml` and
  `ai-stack-five-posts-20260827.yml` both post to Instagram with `DRY_RUN: '0'`
  and ran no audit. `distribution/safety-audit.mjs` existed but was wired only
  into the scheduled `distribution-buffer.yml`. Neither checked the media a
  payload references — which is precisely how issue 1 reached Buffer.
- **Recurrence risk.** High; these are the workflows actually used to launch.
- **Revenue impact.** A failed or unsafe post is a lost campaign slot.
- **Fix.** Both workflows now run `tools/check-distribution-payloads.mjs` and
  `distribution/safety-audit.mjs` before publishing. The payload checker
  verifies ids, text, HTTPS, approved destination host, UTM parameters,
  Instagram's media requirement, and that every repo-hosted `imageUrl`/
  `videoUrl` exists **and passes the media integrity check**.

## 3. Editing the launcher re-published a finished campaign — FIXED (durable)

- **Evidence.** `distribution-launch-once.yml` listed
  `distribution/buffer-publisher.mjs` and its own workflow file as push
  triggers, so touching either re-ran the publisher against whatever was still
  in `launch-now.json`.
- **Recurrence risk.** High, and it conflicts directly with the backlog rule
  "do not create another Instagram launch payload for a given campaign until
  that run is classified".
- **Revenue impact.** Duplicate posting risks the account, not just the post.
- **Fix.** The workflow now triggers on `distribution/launch-now.json` alone.

## 4. Bot workflows racing each other's pushes — FIXED (durable)

- **Evidence.** Trend Video Factory run #2 (`32960026300`) failed; the next
  commit is literally "Retry Dopagaki TikTok publish after Git sync fix". Six
  workflows commit evidence back to `main` with a bare
  `git pull --rebase; git push` and no retry.
- **Recurrence risk.** Medium-high, rising with parallel agents.
- **Human time.** Each occurrence costs a manual re-run.
- **Fix.** All six now use `tools/git-sync-push.sh`: rebase and retry, bounded
  to three attempts, then fail loudly. No infinite retries. Verified against a
  simulated concurrent push.

## 5. Analytics blind spot on the money path — FIXED (durable)

- **Evidence.** 26 of the 59 pages linking to Stripe/Payhip/Gumroad never
  loaded `scos-analytics.js`. Their `checkout_click` and `primary_cta_click`
  events did not exist in PostHog at all. The set included
  `sample-workflow-audit.html` (AGENTS.md: current high-value proof asset) and
  `accounting-ai-workflow-audit.html` (current niche high-intent page).
- **Recurrence risk.** High — the omission is invisible on the page.
- **Revenue impact.** Direct. AGENTS.md's stated priority is a first verified
  purchase plus better measurement of CTA clicks, checkout starts and
  conversion rate; an unreported page cannot contribute to either, and zero
  events is indistinguishable from zero interest.
- **Fix.** 21 pages instrumented (script tag only — no copy, CTA, pricing,
  destination or event-name change). `tools/check-analytics-coverage.mjs`
  fails the build on any new checkout page without analytics. Five documented
  exemptions: the four AI/SaaS Spend funnel pages (measurement hold) and the
  Store-submission PWA. The metadata hold covers three pages.

## 6. Dead and stale destinations — FIXED (durable)

- **Evidence.** `signal/index.html` linked to `partner.html`; the published
  file is `partners.html` (and that is what `signal/sitemap.xml` advertises),
  so the sponsor page was unreachable from its only nav entry. Two
  buyer-delivery pages still pointed their "ROI Calculator" button at
  `icy-scene-001e.practicalaireport.workers.dev`; PR #34 fixed the
  verification API host on one of those pages but not the visible button.
- **Recurrence risk.** Medium; `verify-stratumpraxis-pages.yml` only fires on
  pushes touching one of 28 hardcoded paths, so nothing notices a destination
  that rots on its own.
- **Revenue impact.** A buyer clicking a dead delivery link is an activation
  failure on an already-paid customer.
- **Fix.** Both links corrected (ROI Calculator now points at
  `roi.stratumpraxis.com`, the destination recorded as verified in AGENTS.md).
  `tools/check-internal-links.mjs` validates all 814 internal references
  offline on every push. `tools/live-site-health.mjs` checks 133 live
  destinations daily — every sitemap URL, every external checkout link, every
  owned worker/fallback host — read-only, no credentials, one request each.
  `verify-stratumpraxis-pages.yml` is left untouched and continues to serve
  its own purpose.

## 7. Published pages that could not be shared — FIXED

- **Evidence.** 57 of 70 sitemap URLs had no Open Graph or Twitter card
  metadata; one had no canonical URL; three Signal articles had no meta
  description. Every share rendered as a bare link.
- **Revenue impact.** Suppressed click-through on the active distribution
  channel, on pages already built and paid for.
- **Fix.** Metadata backfilled from each page's own title and description — no
  invented copy. `tools/check-page-metadata.mjs` gates it in CI.
  `tools/backfill-page-metadata.mjs` is idempotent and additive for future
  pages.

## 8. Unused / duplicated media — VERIFIED, NOTHING TO REMOVE

- **Evidence.** `tools/audit-asset-references.mjs` classified all 27 binary
  assets (67.2 MB): 11 IN_USE, 16 KEEP, **0 DELETE_CANDIDATE, 0
  UNKNOWN_REFERENCE, 0 byte-identical duplicates**. Full report:
  `revenue-os/2026-08-27-asset-reference-audit.md`.
- **Conclusion.** There is no media cleanup to perform. Every video is still
  named by `trend-video-engine/publish-ledger.json`, which is the evidence
  trail for published posts. No deletion was attempted and none should be.

## 9. Provider-policy drift — REPORTED, owner decision

- **Evidence.** `distribution/content-queue.json` targets `bluesky`, `threads`
  and `linkedin`. `distribution/provider-policy.json` lists Buffer's
  `allowedServices` as instagram/tiktok/youtube, marks bluesky and threads
  `publishingEnabled: false`, and excludes linkedin on the free plan. The
  scheduled `distribution-buffer.yml` runs this queue daily.
- **Why it is not currently harmful.** `buffer-publisher.mjs` only posts to
  channels that exist and are unpaused in the Buffer account, so unconnected
  services are a silent no-op — which is also why the drift went unnoticed.
- **Fix applied.** `tools/check-distribution-payloads.mjs` now reports the
  drift on every run (non-fatal, because the intended resolution is a
  decision, not a code change).
- **Decision needed:** connect and authorize those services in
  `provider-policy.json`, or retire the queue items. Recorded in the backlog.

## 10. Scheduled distribution run cadence — VERIFY

- **Evidence.** `distribution-buffer.yml` has a daily `17 1 * * *` cron but
  `total_count` for that workflow is 1 (a single `schedule` run at
  2026-08-26T04:05Z). The 2026-08-27 window appears not to have produced a run.
- **Assessment.** GitHub delays or drops scheduled runs under load, so one
  missing window is not proof of a defect. Not actionable from repository
  evidence alone.
- **Next step.** Re-check the run list after the next two windows before
  changing anything. Do not add a second scheduler in the meantime — that
  would create the duplicate-publisher condition provider-policy forbids.

---

## HUMAN REQUIRED

Everything automatable in these lanes is done. What remains is owner-only.

1. **Microsoft Store — AI Automation ROI Planner.** Unchanged from the existing
   backlog entry and re-confirmed today: manifest, service worker, icons and
   screenshots are fixed and verified locally. Remaining steps need Partner
   Center identity/MFA, product identity reservation, PWABuilder package
   generation against the production URL, upload and submission. Smallest
   action: sign in to Partner Center and reserve the product name.
2. **Provider-policy decision (item 9).** Smallest action: one line — either
   connect Bluesky/Threads in Buffer and set `publishingEnabled: true` for
   them, or set `active: false` on the affected `content-queue.json` items.
3. **AI/SaaS Spend measurement close-out.** After the 2026-08-30 Instagram post
   is confirmed sent, read `primary_cta_click` on
   `ai-saas-waste-calculator.html` pre/post, then lift the five exemptions in
   `tools/check-analytics-coverage.mjs` and
   `tools/backfill-page-metadata.mjs`. Smallest action: run
   `node tools/backfill-page-metadata.mjs` and
   `node tools/check-analytics-coverage.mjs` after removing the hold entries.

No authentication, MFA, CAPTCHA, rate limit or platform control was bypassed,
and no synthetic traffic or engagement was created.

---

## What now runs without a human

| Check | Trigger | Cost to a human |
| --- | --- | --- |
| Media integrity | every push / PR | 0 |
| Internal reference integrity | every push / PR | 0 |
| Published page metadata | every push / PR | 0 |
| Distribution payload + referenced media | every push / PR **and before every publish** | 0 |
| Analytics coverage on checkout pages | every push / PR | 0 |
| Live destination health (133 URLs) | daily 06:25 UTC | 0 unless something breaks |
| Evidence push retry | inside 6 workflows | 0 |
