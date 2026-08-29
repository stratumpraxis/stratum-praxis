# Cross-Agent Operating Kit — Production Memo

Status: SALES_PATH_IMPLEMENTED / DEPLOYMENT_NOT_VERIFIED

## Public pages
- Product: https://stratumpraxis.com/cross-agent-operating-kit.html
- Systems Library: https://stratumpraxis.com/systems/
- Buyer access: https://stratumpraxis.com/cross-agent-operating-kit-access.html

## Stripe Live
- Product: Cross-Agent Operating Kit
- Personal: $69 — https://buy.stripe.com/4gM9AU3sE1YLcoM4FB6Zy0T
- Commercial: $149 — https://buy.stripe.com/28EeVe5AMcDp74sdc76Zy0U
- Agency: $299 — https://buy.stripe.com/dRmcN65AMcDp0G46NJ6Zy0V

## Delivery
- Stripe Checkout redirects to buyer access page with Checkout Session ID.
- Worker verifies paid Checkout Session + matching checkout email.
- Verified buyers receive private workspace access.
- Product content is stored server-side in Stripe product metadata and loaded only after purchase verification.

## Production note
- GitHub production changes and Stripe Live configuration are completed.
- Latest Cloudflare Worker deployment result is not yet verified here.
- Do not record a verified sale until an actual paid Checkout Session is confirmed.

## Next revenue action
Drive qualified traffic from existing note/X/distribution routes to the product page and measure: landing → checkout click → paid purchase → verified workspace access.
