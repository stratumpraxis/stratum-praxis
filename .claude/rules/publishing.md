---
paths:
  - "**/*publish*"
  - "**/*content-queue*"
  - "**/*social*"
  - "**/*buffer*"
---

# Publishing Rules

Publishing automation must fail safely.

Never:

- infinitely retry
- bypass platform restrictions
- evade CAPTCHA
- spam duplicate content
- treat queued content as published content

Distinguish clearly:

QUEUED
ATTEMPTED
PUBLISHED
FAILED
ATTRIBUTED

Only mark PUBLISHED when external evidence confirms publication.

If credentials are missing, use a safe no-op when that is the existing design.
Avoid unnecessary redeployment loops.

## Repository note

The Safety Auditor and Duplication Auditor checks in `AGENTS.md` apply to all
distribution work: no rapid-repeat posting, no duplicate outreach to the same
audience, and no misleading claims. Route published items to an existing asset
with UTM labeling rather than creating a new landing page by default.
