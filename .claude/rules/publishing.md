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

## Signal-only reporting

Publishing execution and publishing reporting are separate. Continue publishing
when demand, quality, destination and account safety pass, but remain silent for
draft completion, editing/QA completion, queue changes, unchanged waiting, no
reaction, or no sale.

Report only an externally verified state change: a public URL, completed
distribution with provider evidence, qualified human action, checkout, purchase,
or a new owner-only gate. Do not make `0 revenue`, `0 replies`, or `0 traffic` a
headline. If a report is triggered by another material event and no payment
changed, use the neutral phrase `no verified payment change` once at most.

For one article or asset, batch the research, final copy, routing metadata and
publication evidence into the fewest coherent commits possible. Never create
separate marker/no-op/"still waiting" commits merely to show progress.

## Repository note

The Safety Auditor and Duplication Auditor checks in `AGENTS.md` apply to all
distribution work: no rapid-repeat posting, no duplicate outreach to the same
audience, and no misleading claims. Route published items to an existing asset
with UTM labeling rather than creating a new landing page by default.
