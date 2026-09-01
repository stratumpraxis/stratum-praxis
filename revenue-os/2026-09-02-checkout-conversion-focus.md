# 2026-09-02 Qualified Traffic Revenue Audit

## Initial observation

PostHog, last 30 days with test accounts filtered, returned:

- `funnel_view = 131`
- `primary_cta_click = 18`
- `checkout_click = 18`

Stripe live Checkout Sessions returned `has_more = false` and no returned session had `payment_status = paid`.

## Source audit correction

A deeper source breakdown changed the decision:

- `checkout_click` from `utm_source=codex`: 17
- `checkout_click` from `utm_source=youtube`: 1

Therefore raw checkout-click totals cannot be treated as qualified buyer intent. `filterTestAccounts=true` did not remove Codex operational browser activity, and `$virt_traffic_type=Regular` also did not identify it as operational traffic.

Funnel views by source in the same 30-day cut:

- `direct`: 42
- `codex`: 35
- `chatgpt.com`: 22
- `instagram`: 8
- `facebook.com`: 2
- `youtube`: 2
- `bluesky`: 1
- `vector_praxis`: 1
- no `utm_source`: 18

Direct and missing-source traffic remain ambiguous and must not automatically be counted as qualified external demand.

## External downstream signal

The one externally attributable YouTube checkout click reached:

`/agentic-ai-governance-permission-kit.html`

with campaign:

`agent-control-20260827`

This is the strongest externally attributable downstream route found in this audit. It is a signal, not a purchase.

## Stripe evidence

- No paid Checkout Session was found in the returned live Checkout Session set.
- Cross-Agent Operating Kit — Personal ($69) has multiple observed live sessions tagged with routes including `direct`, `bluesky`, and `vpj_hub`, but all observed sessions are expired/unpaid.
- Tagged sessions are not automatically unique external buyers because operational/test activity may create sessions.
- Cross-Agent sessions use `cancel_url = https://stripe.com`, which does not return an abandoning buyer to the product page.

## Revenue decision

The current highest-leverage problem is two-part:

1. **Measurement integrity** — operational activity is inflating buyer-intent metrics.
2. **Qualified external distribution** — externally attributable traffic that progresses toward checkout is still thin.

Do not increase raw posting volume merely to raise views. Increase attributable external traffic through existing channels and existing assets, then measure downstream movement.

## Priority

1. Exclude `utm_source=codex` from executive revenue scoring while retaining it for QA/debug.
2. Keep direct/missing-source traffic in an `AMBIGUOUS` bucket until attributable.
3. Reinforce existing external routes that produce downstream movement, beginning with the YouTube → governance-kit route found here.
4. Continue testing Instagram because it produced 8 attributable funnel views, but do not call it a winner until CTA/checkout movement appears.
5. Preserve existing products, prices, checkout URLs, and delivery paths unless a production change is explicitly approved.
6. Keep Cross-Agent offer-hierarchy and checkout-return improvements as conversion candidates, but do not let polluted internal traffic falsely promote them above qualified-distribution work.

## Target

Primary: first verified paid purchase from a qualified external source.

Supporting:

- qualified external product-page views
- qualified external CTA clicks
- qualified external checkout clicks
- completed purchases
- attributed revenue

## Evidence state

Current: `TRAFFIC` plus one externally attributable `INTENT` signal from YouTube.

`PURCHASE` is not verified.
