# Social Revenue Expansion — 2026-08-26

## Decisions
- Buffer remains the only autonomous publisher for Instagram, TikTok, and YouTube.
- Metricool is the social analytics/MCP layer.
- Adopt Bluesky, Threads, and Pinterest as the next social expansion surfaces.
- Facebook Page remains deferred.
- Vista Social and Publer remain deferred until their differentiated value exceeds overlap/cost.
- Revenue teacher signal: verified purchase, not likes or raw engagement.

## Operating roles
- SNS Link Connection Cell: connect adopted networks, confirm account ownership, OAuth state, profile consistency, and link destinations. Never bypass login, CAPTCHA, 2FA, or platform controls.
- Social Distribution Cell: routes platform-appropriate content without creating duplicate publisher ownership.
- Site Derivative Architecture Cell: creates owned entry pages that turn social attention into a specific revenue decision rather than generic traffic.
- Revenue Connection Cell: connects each entry page to the closest existing owned offer, Stripe checkout, or B2B audit.
- Measurement Cell: Metricool = social-side observation; PostHog = owned-site behavior; Stripe = purchase truth.
- Safety Audit Cell: verifies rights, factual claims, destination relevance, disclosures, duplicate-post prevention, working links, and no automatic retry after unknown external state.
- Recorder: records only adopted decisions, live assets, blockers, ownership, and measured outcomes.

## New owned entry asset
`/social-revenue-pathfinder.html`

Purpose: free diagnostic that routes social visitors by intent into the closest existing revenue path instead of sending every visitor to the same product.

Routes:
- Educational / durable intent -> evergreen content -> Revenue Router ($29)
- Comparison intent -> comparison / affiliate-compatible route -> Revenue Router ($29)
- Concrete workflow pain -> existing small owned product -> Revenue Router ($29)
- High-value economic decision -> AI Value Realization Kit ($39)
- Team / budget / governance problem -> Workflow Audit ($499)

## Platform roles
### Bluesky
Adopted for concise expertise, commentary, research signals, and owned-link discovery. Do not copy-paste identical posts mechanically across networks.

### Threads
Adopted for conversational short-form distribution and topic testing. Use as an attention/interest surface; route only relevant posts to owned pages.

### Pinterest
Adopted as the durable discovery surface. Prefer evergreen visuals tied directly to the destination content. Use clear, working destination URLs and ensure Pin topic, creative, description, and landing page match.

## Connection status
- Instagram: connected to Buffer; Metricool analytics connection pending external OAuth.
- TikTok: connected to Buffer; Metricool analytics connection pending external OAuth.
- YouTube: connected to Buffer; Metricool analytics connection pending external OAuth.
- Bluesky: adopted; account/OAuth connection pending external account setup or confirmation.
- Threads: adopted; account/OAuth connection pending external account setup or confirmation.
- Pinterest: adopted; business/creator account connection pending external account setup or confirmation.
- Facebook Page: deferred.

## Safety gates before any new autonomous publisher is enabled
1. Exactly one publisher owns each social service.
2. Destination URL is live and relevant to the post.
3. Rights and factual claims are verified where applicable.
4. Required commercial/affiliate/AI disclosures are present.
5. Unknown external publish state is never auto-retried.
6. PostHog/UTM measurement exists before scaling.
7. A network is scaled only after qualified traffic and downstream revenue evidence justify it.

## Next human-only gates
- Create/confirm Metricool Free account.
- Connect Instagram, TikTok, YouTube to Metricool for analytics only.
- Create/confirm Bluesky, Threads, Pinterest accounts where not already available.
- Complete OAuth/account verification for adopted expansion networks.
- Keep Metricool publishing disabled until publisher ownership is explicitly assigned after connection verification.
