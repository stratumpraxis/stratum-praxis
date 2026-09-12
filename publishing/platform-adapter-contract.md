# Stratum Platform Adapter Contract

All publishers must be Stratum-owned and fail closed.

## Input

A validated publish package containing: brand, content_id, platform, body, media, CTA, destination, UTM, and selected Stratum account.

## Required preflight

BRAND_CHECK -> ACCOUNT_CHECK -> CHANNEL_CHECK -> DESTINATION_CHECK -> CTA_CHECK -> EVIDENCE_CHECK

Any failure => do not publish.

## Publish result

A platform adapter must return and persist:

- accepted: boolean
- account: verified Stratum account identifier
- platform
- post_id
- public_url
- published_at
- error_class when failed

`Scheduled` is never equivalent to `Published`.

## Failure handling

OAuth expired -> HUMAN_GATE_REAUTH
API unsupported -> allowed fallback publisher or MANUAL_GATE
Paid publisher limitation -> prefer official API or manual gate
Platform restriction -> select another approved Stratum channel
Repeated same failure -> stop; never infinite retry

## X

X is MANUAL_ONLY for post, schedule, reply, DM, follow, like, and repost. AI may prepare the content package only.

## Human gates

Never automate new OAuth authorization, new prices, new products, new checkout creation, important brand changes, personal DMs, high-risk claims, or permission reviews after terms changes.

## Revenue evidence order

Payment > Checkout/Contract > Qualified Buyer Action > Qualified Traffic > Reach.
