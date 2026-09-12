# Dead Checkout Guard — 2026-09-13

## Why this exists

A revenue page can be indexed, visually correct and analytics-enabled while still leaking revenue if its checkout destination is inactive, retired or belongs to an older offer.

On 2026-09-13, `saas-renewal-decision.html` ranked relatively higher than the current $39 Spend Decision Kit pages in Search Console, but one $39 CTA still pointed to the retired AI Value Realization Kit Stripe Payment Link. Stripe confirmed that old link was inactive, while the current AI & SaaS Spend Decision Kit link was active and redirected buyers to the purchased workspace.

## Guard

Before optimizing traffic or conversion on any revenue-bearing Stratum page, validate the full path:

`Landing page -> CTA -> destination -> active checkout -> after-completion delivery -> attribution`

For direct Stripe links, check live `Payment Link.active` when tools permit. Do not infer checkout health from the presence of a URL.

Classify checkout destinations:

- `ACTIVE_VERIFIED` — live provider confirms active and destination matches the current offer.
- `LEGACY_REDIRECT` — an owned page intentionally routes to the current offer; acceptable but lower priority than a direct verified route when conversion distance matters.
- `INACTIVE` — provider confirms checkout is disabled; treat as P0 revenue leak.
- `MISMATCHED` — live checkout exists but belongs to a different/older product; treat as P0 until corrected.
- `UNVERIFIED` — destination exists but current provider state could not be confirmed; do not make strong claims or scale traffic until verified.

## Next-command integration

When the owner says `次`, if a page with meaningful traffic/impressions or buyer intent has an `INACTIVE`, `MISMATCHED`, or high-risk `UNVERIFIED` checkout, repairing that path outranks SEO copy expansion, new content and outbound contact.

## Completed repair

`saas-renewal-decision.html`:

- replaced legacy `$39 AI Value Realization Kit` product-detail route with the current `$39 AI & SaaS Spend Decision Kit` details route;
- replaced inactive Stripe Payment Link `https://buy.stripe.com/9B6bJ22oA6f160oegb6Zy00` with active current link `https://buy.stripe.com/cNi00kgfq7j5ewUfkf6Zy06`;
- added `data-product="ai_saas_spend_decision_kit"` to preserve product-level checkout attribution.

No pricing was changed. No outbound contact was sent.
