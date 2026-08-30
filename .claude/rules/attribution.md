---
paths:
  - "**/*utm*"
  - "**/*analytics*"
  - "**/*posthog*"
  - "**/*attribution*"
  - "**/*publisher*"
---

# Attribution Rules

Never claim attribution unless the identifier survives the required path.

Required reasoning chain:

traffic source
→ landing
→ CTA
→ checkout
→ purchase where supported

Verify the actual payload or event data.

Do not infer attribution merely because UTM parameters exist at landing.

Publisher changes must not silently destroy attribution.

Preserve historical evidence.
Never rewrite old ledger entries to make current behavior appear successful.

## Repository note

`revenue-link-ledger.md` and the dated files in `revenue-os/` are historical
evidence. Append dated entries; do not rewrite past measurements, verified
URLs, or recorded revenue state. This matches the Data integrity and
change-control guard in `AGENTS.md`.
