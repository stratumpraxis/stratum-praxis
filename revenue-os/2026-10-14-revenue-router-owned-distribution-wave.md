# Revenue Router Owned Distribution Wave — 2026-10-14

## Objective

Move the verified Revenue Router $29 path one stage upstream from External Buyer Payment by reusing existing Stratum-owned discovery and distribution assets. No product, price, checkout, or delivery redesign.

## Verified public distribution

### Stratum Bluesky

- Account: `stratumpraxis.bsky.social`
- Public URL: https://bsky.app/profile/stratumpraxis.bsky.social/post/3mxstnyierd2r
- State: PUBLISHED / account verified
- Destination: existing Stratum Signal article with Revenue Router route

### Stratum TikTok

- Account: `stratumpraxis`
- Buffer post: `6acf18eeb610c3011fa1f472`
- Public URL: https://tiktok.com/@stratumpraxis/video/7696397636697427206
- State: PUBLISHED
- Destination: Revenue Router sales page
- Duplicate stop: queue item inactive after Buffer acceptance

### DEV.to

- Existing article ID: `4801935`
- Public URL: https://dev.to/stratumpraxis/before-buying-another-ai-tool-diagnose-one-recurring-workflow-first-18go
- Existing article updated in place; no duplicate article created.
- Revenue Router CTA added.
- API readback: update verified.

### GitHub

- Stratum README now includes Revenue Router in top buyer entry points and Primary B2B entry points.
- Existing Signal articles now route qualified AI-tool / workflow readers to Revenue Router.

### Search / AI discovery

- Revenue Router is present in `sitemap.xml`.
- Revenue Router is present in `llms.txt`.
- Revenue Router is present in Product Router.
- IndexNow includes Revenue Router.
- Recent Signal Praxis IndexNow runs completed successfully.
- General search visibility may lag indexing; do not treat temporary search absence as a broken page.

## Human Gates / held channels

### Instagram

State: BLOCKED_RECONNECT.

- Buffer accepted a post object but platform delivery failed.
- Account: `praxisstratum`
- Error: Buffer lost authorization / Invalid Credentials.
- Do not retry until the Instagram channel is reconnected.
- Official Instagram API path is also blocked because repository secrets `INSTAGRAM_ACCESS_TOKEN` and `INSTAGRAM_USER_ID` are absent.

### WordPress

State: BLOCKED_AUTH.

- Approved Stratum WordPress article exists.
- `WPCOM_ACCESS_TOKEN` is not configured.
- Current WordPress connector exposes Vector sites only; do not mix brands.
- Do not retry until Stratum WordPress authorization is restored.

## Revenue evidence after owned distribution

Latest Stripe readback after the TikTok publication baseline:

- Matched new Revenue Router Checkout Sessions: 0
- Verified paid Revenue Router Sessions: 0

This is not evidence that the distribution failed; it is only the current payment state at the readback time.

## Current first broken stage

External qualified buyer action / payment.

The technical path remains:

Owned discovery -> Revenue Router -> live Stripe Checkout -> paid-session verification -> Buyer Access -> protected delivery.

## Operating decision

- Freeze product, price, checkout and delivery changes.
- Do not duplicate Bluesky, TikTok, DEV or Instagram submissions.
- Do not retry Instagram or WordPress while their explicit authorization gates remain unresolved.
- Preserve published URLs and UTM attribution.
- Treat future live Checkout or Payment evidence as the next valid trigger for downstream action.
