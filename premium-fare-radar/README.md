# Premium Fare Radar

## Product boundary
Premium-economy/business/first-class opportunity alerts. The site is discovery/routing only: the airline or approved OTA owns inventory, booking, payment, changes, refunds and fulfilment.

## Evidence gate
Skyscanner currently offers an affiliate program, but its Travel API application states it is aimed at established businesses with a large audience. Therefore:
- Do not build around assumed Skyscanner API access.
- Do not scrape airline/OTA inventory.
- Keep the current page noindex until an approved commercial fare source or affiliate feed is actually granted.
- A normal approved affiliate link can be used only according to the partner program's terms; it is not a substitute for live fare-data rights.

## Launch sequence after approval
1. Receive approved fare/offer data.
2. Normalize route, cabin, travel window, observed price/context, expiry/checked time and approved booking URL.
3. Alert only when an opportunity passes a documented threshold; do not promise the fare remains available.
4. User opens detail and leaves to airline/OTA to book.
5. Measure alert open → detail → approved outbound booking click → reported commission where available.

## Localization
Keep data and UI separate. Start with English; Japanese is the first translation after the data source is stable. Add languages only where search/booking evidence exists. Currency display is informational and must identify timestamp/source where relevant.

## Safety
No fake fares, no copied booking inventory, no automated purchase, no concierge promise, no refund handling, no claim that the site is an airline/agent unless legally true.

## Current status
**Conditional / HOLD at data gate.** Product UX and business boundary are ready; further engineering should stop until approved commercial data/affiliate access is verified.