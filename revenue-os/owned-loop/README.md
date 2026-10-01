# Owned Revenue Loop Foundation

Purpose: make Stratum Praxis increasingly capable of producing, routing, monetizing, measuring, and reusing value on infrastructure it controls.

This is **not a new brand, product, funnel, or agent hierarchy**. It is a coordination layer over existing owned assets.

## Core loop

```text
External/public signal
  -> owned capture surface
  -> owned free value
  -> owned offer page
  -> provider-native checkout
  -> owned return route
  -> first-party measurement
  -> next owned improvement
```

The objective is not to eliminate every external service. Search engines, social platforms, Stripe, Payhip, Gumroad, YouTube and other providers may remain useful roads or payment rails. The objective is to keep the **decision logic, durable assets, routing, measurement definitions and reusable value** on owned infrastructure whenever practical.

## What local production / local consumption means here

1. Research signals become reusable owned assets instead of disappearing in chat or social posts.
2. Owned assets route to other owned assets before sending a visitor to a third-party checkout.
3. A product page, diagnostic, calculator, guide or audit can consume demand created by another owned asset.
4. Every meaningful route has a measurable next step.
5. Successful routes feed evidence back into the ledger so the next improvement starts from real behavior rather than a blank page.
6. New assets are created only when the current library cannot absorb validated demand.

## Durable source of truth

- `ledger.json` — machine-readable map of owned producers, value assets, offer pages, return routes and metrics.
- `control.html` — read-only operator view of the ledger.
- `validate-owned-loop.mjs` — static validator. It fails if a loop skips straight to third-party commerce, lacks a return path, or lacks measurement.

## Routing rules

- Prefer same-domain or explicitly owned infrastructure for discovery, education, diagnosis and offer explanation.
- Third-party checkout is allowed only at the commerce boundary.
- Do not store direct Stripe / Payhip / Gumroad checkout URLs in this ledger. Product pages remain the owner of provider-specific checkout details, reducing drift.
- Do not treat social posting volume as production. A social post is a signal/distribution event; the durable asset must live in the owned system.
- Do not create a new landing page merely to satisfy the ledger. Reuse Live Lab, guides, systems, tools, product pages and Return Gate where they already fit.
- Keep one primary route per loop. Secondary routes can exist, but they must not compete for the same user decision.

## Evidence states

Use the repository-wide states from `AGENTS.md`:

`SIGNAL -> TRAFFIC -> INTENT -> PURCHASE -> DELIVERED -> ATTRIBUTED -> REPEATABLE`

The ledger must never label a click, view, publish event or queue entry as revenue.

## Human / safety boundary

This foundation does not automate identity, legal acceptance, payment confirmation, CAPTCHA, 2FA or platform access restrictions. It also does not add high-frequency posting, scraping, mass outreach or retry loops.

## Daily operating use

Morning:
1. Read yesterday's strongest evidence.
2. Select the largest leak in one existing loop.
3. Check current market demand only to decide which existing loop deserves attention.
4. Change one route or asset.

Afternoon:
5. Publish or deploy through the existing safe path.
6. Measure route movement.
7. Record evidence.

19:00 close:
8. Classify as `DONE`, `WAITING`, `NEXT`, `MERGE`, or `DROP`.
9. Update the ledger only when verified facts changed.

## Definition of success

The foundation is working when more revenue cycles can be completed as:

`owned signal asset -> owned value -> owned offer -> checkout -> owned return -> measured improvement`

with fewer one-off pages, fewer lost ideas, fewer external-platform dependencies, and less manual reconstruction of context.