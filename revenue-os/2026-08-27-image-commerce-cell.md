# Image Commerce Cell — 2026-08-27

## Objective

Build one original image IP into a low-manual, multi-market revenue line across LINE stickers, digital PNG packs, image marketplaces, Pinterest-led discovery and selective POD.

## Current target metric

First verified image-commerce purchase, followed by marketplace-level demand evidence. Do not count page creation, review submission or test checkout as revenue validation.

## Market evidence used

- LINE official usage research: OK / acknowledgement expressions are the most-used class across broad demographics; positive emotions also rank strongly.
- LINE review/recommendation guidance: daily-conversation usefulness, clear expressions/messages and simple readable illustration are preferred.
- 2026 regional LINE case material: approachable characters, warm emotion, light humor and everyday usefulness recur as successful properties.
- Etsy current best-seller pages show substantial demand for digital planner/GoodNotes stickers, meme/cat reaction imagery and multi-image PNG bundles.
- Competitive implication: generic cute-only character art is crowded. v1 should combine practical daily reaction coverage with a distinctive, slightly surreal, text-independent visual identity.

## Adopted v1 concept

**Quiet Creature Reactions / ちょい無言リアクション**

- One original compact rounded creature.
- Strong silhouette and facial readability at small size.
- Minimal palette and transparent-background compatibility.
- No existing character, logo, celebrity, brand mascot or recognizable third-party IP.
- Japanese 40-reaction set + English 40-reaction set + text-free master set.
- Prioritize acknowledgement, thanks, greetings, tired/busy, surprise, encouragement, affection and silent-support reactions.

## Channel architecture

1. LINE Creators Market — JP 40-pack after human-required creator registration/review boundary.
2. Owned Image Commerce Hub — https://stratumpraxis.com/image-commerce/
3. Direct digital pack — Stripe one-time checkout only after real ZIP + buyer-only delivery are ready and verified.
4. Etsy — English/global digital sticker and planner-oriented pack after shop/KYC verification.
5. BOOTH — Japanese PNG / digital sticker pack after account verification.
6. SUZURI — selective POD only for proven/winning designs, not every design by default.
7. Pinterest — evergreen discovery back to owned hub and verified marketplace listings; connect only after channel/account state is verified.

## Existing automation that can be reused

- `distribution/buffer-publisher.mjs`
- `distribution/content-queue.json`
- GitHub Actions distribution workflows
- `scos-analytics.js` / PostHog event capture on owned pages
- Existing Stripe verified-buyer delivery patterns in the repository
- sitemap / IndexNow publication flow

## Safety gates

- Do not bypass KYC, CAPTCHA, identity checks, legal acceptance or platform review.
- Do not activate a paid checkout until the delivered archive exists.
- Do not publish full-resolution paid assets as social previews.
- Do not claim a marketplace listing is live until its public URL is verified.
- Do not create fabricated testimonials, sales numbers or ranking claims.
- Do not mass-create POD SKUs before demand evidence exists.

## State at checkpoint

- Demand research: DONE
- Concept and 40 JP / 40 EN reaction taxonomy: DONE
- Google Drive operating memo: DONE
- Account ledger additions for LINE / Etsy / SUZURI / BOOTH / Pinterest: DONE, all explicitly marked unverified where appropriate
- Owned bilingual launch hub: COMMITTED to main
- Sitemap: UPDATED
- Verify Stratum Praxis Pages workflow for sitemap commit: SUCCESS
- IndexNow workflow: triggered on commit; final outcome must be checked separately
- Artwork master: NOT YET CREATED
- LINE upload ZIP: NOT YET CREATED
- Direct paid ZIP: NOT YET CREATED
- Stripe image-product checkout: intentionally NOT CREATED because deliverable does not yet exist
- LINE / Etsy / BOOTH / SUZURI submission: blocked by unverified external account/identity state and missing artwork
- Buffer live post: intentionally NOT SENT before real product/listing exists

## Next irreversible gate

Create and QA original master artwork. After artwork exists, export marketplace variants, build ZIPs, verify direct delivery, then enable Stripe and publish distribution. Human action should be requested only at creator-account/KYC/review submission boundaries that cannot be safely automated.
