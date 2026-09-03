# Stratum Praxis Autonomous Revenue Loop — 2026-09-03

## Objective

Turn the current Stratum Praxis acquisition stack into a closed decision loop that moves attention toward the best measured commercial route without turning one human into the permanent operator.

## Canonical loop

Money-flow / demand evidence
→ verified existing-asset match
→ bounded revenue-lane probe
→ attribution
→ destination traffic
→ primary CTA
→ actual checkout creation
→ verified purchase / revenue
→ winner classification
→ portfolio allocation
→ one bottleneck fix or scale action
→ repeat

## What is autonomous now

1. Existing asset inventory validation.
2. Demand-signal scoring and existing-asset routing.
3. Channel selection from the current provider policy.
4. Attribution and queue safety checks.
5. Unified ledger reading.
6. SCALE / ITERATE / STOP / INSUFFICIENT_DATA classification.
7. Portfolio ranking with human effort as a denominator.
8. A hard human-touch budget per cycle.
9. Three scheduled JST decision cycles: 08:30, 13:30 and 19:30.
10. Evidence report artifacts for each run.

The scheduled controller is `.github/workflows/autonomous-revenue-loop.yml`.

## What is intentionally NOT autonomous yet

- External publication that creates a new public statement or identity action.
- Production/main merges.
- Payment-provider or price changes.
- Product creation when an existing asset can serve the demand.
- Deletion, irreversible migration, paid ads or spend.
- Counting a purchase without payment-provider evidence.

These are Human Gates, not missing code.

## Remaining closure gaps

The decision loop can run by itself, but a fully closed revenue loop still needs live measurement ingestion from the deployed analytics and payment systems. Repository evidence currently contains strong routing and safety information, but many downstream route counters are still `NOT_MEASURED`.

The next infrastructure step is therefore not another product. It is a narrow measurement bridge:

PostHog / deployed analytics read
+ Stripe / Payhip / Gumroad purchase truth read
→ normalized route measurement
→ `acquisition/distribution-ledger.json` or an equivalent evidence store
→ portfolio allocator

Until that bridge exists, the controller can autonomously decide what should be measured or probed, but it must not pretend that stale or absent repository counters are live revenue.

## Human-capacity rule

One person operates Stratum Praxis with Forwelle. Therefore allocation uses:

`commercial evidence × route quality ÷ human burden`

The current policy caps a decision cycle at 30 human minutes and three active actions. This is deliberately conservative and can be changed in `acquisition/portfolio-policy.json` after real operating data exists.

## Success condition

The loop is considered revenue-closed only when the same route can prove:

`qualified traffic → CTA → actual checkout → verified purchase → attribution → portfolio reallocation`

without requiring the user to manually collect and reconcile the numbers every cycle.
