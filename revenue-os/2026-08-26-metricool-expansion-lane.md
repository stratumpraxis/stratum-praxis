# Metricool Expansion Lane — 2026-08-26

## Decision
- Buffer remains the only autonomous publisher for Instagram, TikTok, and YouTube.
- Metricool Free is adopted as the analytics/MCP layer and as an expansion observer for currently unused social networks.
- Existing Instagram/TikTok/YouTube should be connected to Metricool for analytics only; Metricool publishing stays disabled to prevent duplicate posts.

## Free-plan facts verified 2026-08-26
- 1 brand.
- Up to 20 published posts/month through Metricool Planner.
- 30 days analytics history.
- Metricool MCP available on Free.
- LinkedIn and X/Twitter are not available on Free.
- Candidate Free connections for expansion: Facebook, Threads, Bluesky, Pinterest, Google Business, subject to actually owning/creating an appropriate profile and each network's OAuth/platform rules.

## Architecture
Signal / trend discovery -> content/video production -> safety QA -> Buffer (Instagram/TikTok/YouTube) -> Metricool analytics/MCP -> PostHog -> Stripe -> revenue attribution -> winner replication.

Metricool should not be judged by likes alone. Its purpose is to add social-side evidence to the revenue chain so themes can ultimately be ranked by qualified traffic, CTA, checkout and purchase outcomes.

## Onboarding order
1. Create Metricool Free account and one brand.
2. Connect Instagram, TikTok, YouTube as analytics-only sources.
3. Connect already-owned unused Free-compatible networks first, if available.
4. For new networks, prioritize only surfaces that add a genuinely new distribution path; do not create empty accounts just to increase channel count.
5. Connect Metricool MCP to an approved AI client for read/analysis use first.
6. Keep autonomous Metricool publishing disabled until a specific non-overlapping service is intentionally assigned and passes Distribution Safety Auditor review.

## Expansion priority
1. Bluesky / Threads — low-friction text distribution if an appropriate existing account can be used safely.
2. Pinterest — useful when evergreen visual assets and landing pages exist.
3. Facebook Page — useful if a real page/brand presence is appropriate; do not create one solely for vanity reach.
4. Google Business — only if there is a legitimate eligible business/location profile; never create a misleading listing.

## Deferred
- Vista Social: reconsider for inbox/team/approval needs that justify the paid cost.
- Publer: reconsider only if Buffer Free materially blocks required distribution or Publer becomes meaningfully differentiated.

## Safety rule
One autonomous publisher per social service. No duplicate posting paths, no credential sharing in repository files, no bypass of OAuth/2FA/CAPTCHA, and no automatic retries after unknown external publication state.
