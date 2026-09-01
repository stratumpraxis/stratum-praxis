# Revenue Metric Integrity Rule

## Purpose

Prevent operational QA, agent browsing, internal testing, and ambiguous machine activity from being counted as market demand or buyer intent.

## Executive scoreboard buckets

1. **QUALIFIED EXTERNAL** — attributable external traffic that can reasonably represent a real audience or buyer path.
2. **AMBIGUOUS** — direct / missing-source traffic that cannot yet be proven external or internal.
3. **OPERATIONAL / QA** — known internal agent, test, validation, browser-automation, or deployment-check activity.

Only `QUALIFIED EXTERNAL` may justify channel or offer scaling.

## Known operational label

- `utm_source=codex` → `OPERATIONAL / QA`

Do not treat `filterTestAccounts=true` as sufficient protection against operational browser traffic.
Do not treat `$virt_traffic_type=Regular` as proof of a human buyer.

## Evidence ladder

`EXTERNAL TRAFFIC`
→ `EXTERNAL CTA`
→ `EXTERNAL CHECKOUT`
→ `PAID PURCHASE`
→ `DELIVERED`
→ `ATTRIBUTED`

Never promote a metric to the next state without evidence.

## 2026-09-02 audit example

Raw:

- funnel views: 131
- primary CTA clicks: 18
- checkout clicks: 18

Source audit:

- checkout clicks from `codex`: 17
- checkout clicks from `youtube`: 1

In this specific cut, raw checkout-click count overstated usable external buyer-intent evidence by approximately 18x. The raw total remains useful for QA, but not as market-demand evidence.

## Operating requirement

Every revenue-cycle review must show both:

- raw operational metrics, and
- qualified-external metrics.

If they materially diverge, fix measurement integrity before making a SCALE / KILL decision.
