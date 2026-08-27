# OG / Social Metadata Fix — 2026-08-27

## Bottleneck identified

Every page on the Production site (all 76 HTML files, including every revenue-priority
landing page) was missing `og:image` and `twitter:card` tags. Sitewide, zero pages had
an Open Graph image. This directly damages the Impression → Visit step of the funnel:
any link to these pages shared on X, Instagram, note, Reddit, LinkedIn, Slack, Discord,
iMessage, etc. renders as a blank/generic preview instead of a branded card, which
suppresses click-through before a visitor ever reaches the site.

This is exactly the kind of "og / metadata改善" fix in scope for Production SEO work,
and it is upstream of every Distribution Content post this system schedules (Buffer,
note, TikTok, YouTube description links, etc.) — a better preview card raises CTR on
every existing and future post without creating a new asset, new product, or new page.

## What was implemented

- Generated one on-brand 1200x630 default OG/social card
  (`media/og/stratum-praxis-og-default.png`) using the site's own dark palette
  (`#090b0e` background, `#7b61ff` / `#36d7ff` / `#66e3c4` / `#ff7a3d` accents) and
  wordmark, rendered via a local headless-browser screenshot (Playwright/Chromium,
  not committed as a project dependency — output is a static asset only).
- Added `og:image`, `og:image:width`, `og:image:height`, `twitter:card`
  (`summary_large_image`) and `twitter:image` to the 15 highest revenue-proximity
  public pages named in `revenue-os/backlog.md` P1 ("AI/SaaS Spend funnel, AI Council
  Builder, Revenue Router, Workflow Audit ... Return Gate"):
  - `index.html`
  - `product-router.html` (the tracked external GitHub → offer entry point)
  - `ai-saas-spend.html` (ACTIVE / PRIMARY hub)
  - `ai-agent-cost-roi-calculator.html`
  - `saas-spend-management-small-business.html`
  - `ai-saas-spend-decision-kit.html`
  - `ai-saas-spend-waste-audit.html`
  - `ai-saas-spend-audit-checklist.html`
  - `workflow-audit.html`
  - `ai-council-builder.html`
  - `ai-council-builder-ja.html`
  - `return-gate-growth-os.html`
  - `revenue-router.html`
  - `sample-workflow-audit.html`
  - `accounting-ai-workflow-audit.html`
- Six of these pages (`product-router.html`, `ai-council-builder.html`,
  `ai-council-builder-ja.html`, `return-gate-growth-os.html`,
  `sample-workflow-audit.html`, `ai-saas-spend-decision-kit.html`) had no Open Graph
  block at all; a full `og:type` / `og:title` / `og:description` / `og:url` block was
  added using each page's existing `<title>` and meta description, not new copy.
  `ai-saas-spend-audit-checklist.html` already had a `twitter:card: summary` block
  without an image; it was upgraded in place to `summary_large_image` with an image
  rather than duplicated.
- Validated: all 15 files parse as well-formed HTML (Python `html.parser`, zero
  errors), each has exactly one `og:image` and one `twitter:card` tag, and the new
  image asset serves `200` locally with the correct content.
- No other pages, prices, offers, checkout links, or existing copy were changed.

## Not done in this session (scope/credential limits, not skipped)

- Real-world CTR/impression proof (the actual lift this produces on link-preview
  click-through) requires a real external share and PostHog UTM evidence; this session
  had no PostHog, Buffer, or Stripe credentials available (env had none), so it cannot
  query `revenue-os/metrics.json`-style live analytics or verify the previously
  scheduled Instagram post (`buffer_post_id: 6a8f23f6b2db23b19c501243`,
  `first_distribution_run_2026_08_27` in `metrics.json`). That recovery task is
  unchanged from `backlog.md` P0 and should run in the credentialed CI/Action context
  that normally holds those secrets, not from an interactive session without them.
- No new external placements (directories, Reddit, social posts) were published this
  session for the same reason: no connector, no browser-automation tool, and no
  platform credentials were available to this session. Fabricating a "published" claim
  without evidence would violate the existing genuine-purchase / genuine-evidence rule
  in `AGENTS.md`, so this is reported as blocked rather than claimed complete.
- Per-page custom OG images (rather than one shared brand card) were not built; the
  shared default is the minimal reversible fix. A follow-up could generate
  page-specific cards for the top 2-3 offers if social CTR data justifies the effort.

## Next highest-value channel

Recover and verify the already-scheduled Instagram post
(`distribution/launch-now.json`, `buffer_post_id: 6a8f23f6b2db23b19c501243`,
scheduled `2026-08-27T01:27:00Z`) in an environment with `BUFFER_API_KEY` and the
PostHog project 573335 credentials, capture the public post URL, and confirm
`social_utm_pageviews_after_publish` in `metrics.json`. That post now links to a
calculator page; the OG fix in this session means any further reshare of that same
link will carry the branded card automatically.
