# Music Stock Pack v1 — Live Launch Checkpoint

Date: 2026-09-13
State: CHECKOUT_IMPLEMENTED_DELIVERY_PERMISSION_PENDING
Target metric: verified live checkout start → verified payment → verified buyer delivery

## Revenue asset

Music Stock Pack v1 has been rebuilt from deterministic procedural source rather than transcoding the old MP3 previews into fake WAV masters.

Tracks:
- MSV1-001 Quiet Momentum — 96 BPM / C major
- MSV1-002 Late Desk Glow — 82 BPM / A minor
- MSV1-003 Soft Systems — 110 BPM / F major

Each track now has verified files for:
- 60s Master
- 30s Edit
- 15s Edit
- 48 kHz / 24-bit PCM / stereo WAV
- 60s MP3 preview

Production evidence includes:
- deterministic generation source
- metadata.csv
- manifest.json
- rights/source note
- QA report
- SHA256 per generated file

## Drive packages

Canonical folder:
- https://drive.google.com/drive/folders/1bJzr1gRDdj1Za-rL4mZ665TtN2KFQZak

New packages:
- Paid delivery: `Music_Stock_Pack_v1_PAID_DELIVERY_2026-09-13.zip`
  - Drive file ID: `144J1PYWrt3API48scIEk4ZFYMMd2TiXl`
  - ZIP SHA256: `131910f3a150f9d3b3fa5bff3939a2bd375722cd9e13420b2542df0596a74dec`
  - current sharing: owner only / shared=false
- Evidence archive: `Music_Stock_Pack_v1_EVIDENCE_2026-09-13.zip`
- Preview archive: `Music_Stock_Pack_v1_PREVIEW_2026-09-13.zip`

The paid ZIP must remain inaccessible before verified payment.

## Checkout implementation

Fresh branch from current main:
- `music-stock-pack-v1-live-launch`

Implemented:
- `/music-stock-pack-v1.html`
- `/music-stock-pack-v1-access.html`
- `/music-stock-pack-v1-delivery.html`
- `worker/music-stock-pack-worker.js`
- worker entrypoint changed to the Music wrapper
- deployment smoke tests extended for Music purchase guards

Checkout route:
- `GET /music-stock-pack-v1/checkout`
- creates a Stripe Checkout Session server-side
- mode: one-time payment
- amount: USD $9.00
- uses inline Stripe `price_data`; no pre-created Product/Price/Payment Link is required
- success return: `/music-stock-pack-v1-access.html?session_id={CHECKOUT_SESSION_ID}`

Purchase verification route:
- `POST /music-stock-pack-v1/login`
- requires valid Checkout Session ID
- verifies `mode=payment`
- verifies `payment_status=paid`
- verifies `status=complete`
- verifies amount = 900 USD cents
- verifies `market_route=music_stock_pack_v1`
- verifies checkout email match
- returns a signed 7-day buyer access token only after all checks pass

Delivery verification route:
- `GET /music-stock-pack-v1/delivery?token=...`
- verifies signed token
- re-checks the live Stripe Checkout Session
- only then returns delivery metadata

## Automated safety checks

Deployment workflow now tests:
- invalid Music Checkout Session login → HTTP 400
- Music delivery without buyer token → HTTP 401

Existing Worker route smoke tests remain in place.

## License surface

$9 launch license is deliberately narrow:
- buyer may use tracks in the buyer's own finished content, including monetized content
- standalone resale / redistribution / sublicensing of source audio is prohibited
- exclusivity and client-transfer rights are not included in this launch license

Do not create extra price tiers until purchase evidence exists.

## Remaining blocker

The paid ZIP is correctly private, but there is not yet an automatic post-payment Google Drive permission grant to the verified checkout email.

Do not merge or call delivery complete until one of these is verified end-to-end:
1. automatic Drive reader permission is granted to the verified checkout email after payment, or
2. another protected delivery mechanism is implemented without exposing the paid ZIP before payment.

NEXT P0:
- connect verified Stripe purchase email → buyer-only Drive access grant → confirm buyer can download → then merge and smoke-test live $9 checkout.

## Evidence state

Rebuilt paid WAV assets ✅
30s / 15s edits ✅
New MP3 previews ✅
Metadata / Rights / SHA evidence ✅
Paid ZIP ✅
Paid ZIP private before payment ✅
Server-side $9 Checkout implementation ✅ (branch)
Server-side purchase verification ✅ (branch)
Signed buyer token ✅ (branch)
Buyer delivery page ✅ (branch)
Automatic post-payment Drive permission ⬜
Live deployment / Checkout Evidence ⬜
Qualified Buyer Action ⬜
Payment Evidence ⬜
