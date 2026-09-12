---
paths:
  - "publishing/**"
  - "distribution/**"
  - ".github/workflows/*social*"
  - ".github/workflows/*publish*"
---

# Stratum Social Cadence Guard

Before any autonomous Stratum social publish, inspect durable publication evidence for that exact Stratum-owned platform/account.

Decision order:

1. Confirm the account is Stratum-owned and verified.
2. Confirm the destination is an existing Stratum asset with a real revenue or qualified-traffic route.
3. Check the most recent verified publication timestamp for the same platform.
4. Check whether the proposed post duplicates the same message, asset, angle, or destination.
5. If a recent verified post already exists and the new post is not time-sensitive or materially distinct, HOLD instead of publishing.
6. Never use another brand/account as a substitute for Stratum.
7. A queued item is not a published item. Only external platform evidence may advance the state to PUBLISHED.

The guard exists to protect account health and downstream conversion quality. More posts are not automatically better; qualified traffic, buyer action, checkout and payment remain the objective.

When a post is held for cadence safety, preserve the candidate and record the evidence/reason instead of deleting it. Resume only when the platform/account is no longer in a rapid-repeat state or new evidence justifies publication.

Default evidence order:

`account identity -> last verified public URL/time -> duplicate/angle check -> destination/UTM check -> publish or HOLD -> external publication evidence`
