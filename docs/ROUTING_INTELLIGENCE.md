# Routing Intelligence — shared research + MARKET operating model

## Core discovery

Do not default to building another diagnostic, product, brand, or page.

**We already own many useful decision assets. Connect them.**

The missing capability is not more diagnosis. It is a living reception layer that decides which existing asset should wake up for which person, at which moment, and whether that asset is still safe and commercially relevant to use.

## Canonical loop

```text
Asset Registry
→ Freshness / Fit Check
→ Routing Intelligence
→ 1 Best Next Step
→ MARKET Route
→ Revenue Evidence
→ Routing Update
↺
```

A candidate asset is eligible for routing only when all of the following are true:

```text
Candidate asset
↓
Still correct now?
↓
URL alive?
↓
Offer alive?
↓
Fits the current market?
↓
Revenue destination connected?
↓
YES only → Routing
```

Do not send traffic to stale pages, dead CTAs, retired offers, broken checkout paths, or assets that no longer fit current MARKET doctrine.

## Public-side principle

The public entrance should not ask people to understand internal vocabulary such as revenue-model taxonomy, agent architecture, funnel stages, or MARKET structure.

Use the reverse-perspective test:

> Imagine the visitor does not love AI, does not trust quizzes, does not want to be sold to, does not want jargon, and will not spend more than a few minutes. Can the entrance still help them identify what to fix first?

Lead with felt problems such as:

- AI tools keep multiplying and I do not know what is worth using.
- I want to use AI for work or income, but I do not know where to start.
- I already have a product or service, but people are not buying.
- I built or use an AI agent, but it is not turning into money.
- AI / SaaS spend is growing and I cannot tell if it is worth it.
- I would rather earn through concrete paid work or contracts first.
- I publish or get attention, but there is no clear revenue exit.

The visible output should be one plain-language next step, not a catalog of tools and not a flattering persona label.

Prefer:

> First fix buyer clarity — not the product.

Over:

> You are an Autonomous Agent type.

## Research role

Research does not sell the product.

Research learns:

**Under which conditions did which decision asset, revenue model, or route actually help?**

Responsibilities:

1. Maintain the asset registry and health model.
2. Maintain condition → asset → route hypotheses.
3. Learn from CTA clicks, checkout, contract, purchase, payment, no-response, rejection, and other commercial evidence.
4. Update routing logic based on observed evidence.
5. Avoid multiplying new diagnostics when an existing asset already solves the repeated problem.

Research output is incomplete until MARKET uses it.

## MARKET role

MARKET receives the selected route and moves it into reality.

Examples include existing:

- B2B / Workflow Audit
- Gumroad / Digital Product
- Publishing
- Community
- GWR / Contract / Bounty
- Stratum Praxis
- MarketNest
- other validated revenue routes

MARKET success remains external movement toward payment, not diagnostic completion.

## Evidence returned to routing

Important events:

```text
Qualified Visit
→ Result
→ Result CTA
→ Revenue Destination
→ Commercial Signal / Contract
→ Checkout
→ Purchase / Payment
```

Negative evidence also matters:

- no response
- result CTA not clicked
- checkout reached but not paid
- route rejected by user
- offer no longer exists
- asset becomes stale

A completed diagnostic is not revenue.

## Asset Health fields

Minimum registry fields:

- `asset_id`
- `asset_name`
- `public_url`
- `owner`
- `purpose`
- `conditions_fit`
- `url_live`
- `content_current`
- `offer_live`
- `market_fit`
- `revenue_destination_live`
- `last_checked_at`
- `health_status` (`ACTIVE`, `VERIFY`, `LEGACY`, `RETIRED`)
- `last_revenue_evidence_at`
- `notes`

Only `ACTIVE` assets with all required routing gates passing should be automatically eligible.

## New-asset gate

A new product, brand, page, diagnostic, or revenue route should be considered only when repeated external evidence shows an important condition cannot be handled by existing healthy assets.

Before creating anything new, ask:

> Can three existing assets be refreshed, merged, or routed differently to solve this?

## Shared principle

**Do not build again by default. Connect what already exists.**

The goal is a learning network in which older decision assets become more useful over time because real-market outcomes update when and where they should be used.
