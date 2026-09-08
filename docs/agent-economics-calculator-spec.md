# AI Agent Economics Calculator — Decision Logic Contract

Owner: MarketNest Pro / AI Spend & Agent Economics
Role: calculation and diagnostic logic only. Site implementation, deploy, navigation and production monitoring belong to the site operator.

## Mission

Convert one AI-agent workflow into auditable unit economics:

`agent spend -> successful business outcomes -> cost per successful outcome -> human baseline -> model rightsizing -> KEEP / REDUCE / RIGHTSIZE / REVIEW / STOP -> existing $499 AI & SaaS Spend Waste Audit when complexity or decision exposure is high`

Do not optimize for the cheapest model. Optimize for the lowest defensible cost per successful business outcome while meeting the workflow's minimum acceptable success/quality floor.

## Core inputs

### Workload
- logical tasks per month `N`
- base model/tool runs per attempt `K`
- retry incidence `R` (0–1)
- average additional retry attempts when a retry occurs `A`

### Current stack
- model/API variable cost per run `Cm`
- other variable tool cost per run `Ct`
- fixed AI/tool/platform cost per month `F`
- infrastructure/observability cost per month `I`

### Reliability and human burden
- final successful outcome rate `S` (0–1)
- minimum acceptable success rate / quality floor `Q` (0–1)
- human review coverage `Hr` (0–1)
- minutes of human review when review occurs `Hm`
- failed-outcome recovery minutes `Fm`
- loaded human hourly cost `W`

### Business value and implementation
- business value per successful outcome `V`
- one-time implementation / migration cost `B`
- optional confidence factor `D` (0–1; default 1.0). This applies to claimed business value, not to measured costs.

### Human baseline
- human minutes per task today `Bh`
- human accepted/success rate `Bs` (0–1; default 1.0 when unknown, clearly labeled as an assumption)

### Alternative model for rightsizing
- alternative model/API cost per run `Cam`
- alternative final success rate `Sa`
- alternative retry incidence `Ra`
- alternative human review coverage `Har`

Keep the same workload, business value, tool fixed costs and human wage unless the user explicitly changes them.

## Core formulas

### Current agent

Expected runs per logical task:

`E = K * (1 + R * A)`

Expected monthly runs:

`Runs = N * E`

Variable AI/tool cost:

`VariableCost = Runs * (Cm + Ct)`

Human review cost:

`ReviewCost = N * Hr * (Hm / 60) * W`

Failure recovery cost:

`FailureCost = N * (1 - S) * (Fm / 60) * W`

Total monthly operating cost:

`TotalCost = VariableCost + F + I + ReviewCost + FailureCost`

Successful outcomes:

`Successes = N * S`

Cost per successful outcome:

`CPSO = TotalCost / Successes`

If `Successes = 0`, CPSO is undefined/infinite and the route must not be labeled profitable.

Risk-adjusted realized business value:

`RealizedValue = Successes * V * D`

Monthly net operating value:

`NetValue = RealizedValue - TotalCost`

Value-to-cost ratio:

`VCR = RealizedValue / TotalCost`

One-year net after build cost:

`Net12 = (NetValue * 12) - B`

Payback months:

`Payback = B / NetValue` when `NetValue > 0`; otherwise no payback.

### Human baseline

Human monthly cost:

`HumanCost = N * (Bh / 60) * W`

Human successful outcomes:

`HumanSuccesses = N * Bs`

Human cost per successful outcome:

`HumanCPSO = HumanCost / HumanSuccesses`

Agent vs human unit-economics improvement:

`UnitDelta = (HumanCPSO - CPSO) / HumanCPSO`

Never claim labor savings unless the user's human baseline actually represents cost that can be removed, avoided, or redeployed. Otherwise label the result "capacity value" or "modeled labor-equivalent value".

## Alternative-model / rightsizing formulas

Alternative expected runs:

`Ea = K * (1 + Ra * A)`

Alternative variable cost:

`AltVariableCost = N * Ea * (Cam + Ct)`

Alternative review cost:

`AltReviewCost = N * Har * (Hm / 60) * W`

Alternative failure recovery cost:

`AltFailureCost = N * (1 - Sa) * (Fm / 60) * W`

Alternative total cost:

`AltTotalCost = AltVariableCost + F + I + AltReviewCost + AltFailureCost`

Alternative successful outcomes:

`AltSuccesses = N * Sa`

Alternative CPSO:

`AltCPSO = AltTotalCost / AltSuccesses`

Rightsizing savings per successful outcome:

`RightsizeDelta = (CPSO - AltCPSO) / CPSO`

A cheaper alternative is NOT a rightsizing winner unless all are true:
1. `Sa >= Q` (meets the user's quality/success floor),
2. `AltCPSO < CPSO`,
3. the expected business value per success is not materially reduced by the model change,
4. any migration/engineering cost not already included in `B` is surfaced separately.

## Decision signal hierarchy

These are transparent decision signals, not universal financial advice.

### STOP
Use when either:
- `NetValue <= 0`, or
- the current workflow is below the minimum acceptable success floor and no tested alternative meets the floor.

Meaning: do not scale the current configuration. Redesign the workflow, remove spend, or re-establish the outcome definition first.

### RIGHTSIZE
Use when:
- current configuration is economically positive,
- an alternative model meets `Q`, and
- `AltCPSO` is at least 10% lower than current `CPSO` after retry/review/failure burden.

The 10% threshold is a practical signal to avoid recommending model churn for immaterial differences; show the actual delta and let the buyer decide.

### REVIEW
Use when any material uncertainty makes the verdict fragile, including:
- `VCR` between 1.0 and 1.25,
- current `S` is within 5 percentage points of `Q`,
- confidence factor `D < 0.70`,
- one or more major cost categories are unknown/estimated,
- model switch economics reverse under a modest change in success/retry/review assumptions.

### REDUCE
Use when the workflow remains positive but operating friction is consuming too much value, for example:
- retry + review + failure-recovery cost exceeds 25% of `TotalCost`, or
- payback is over 12 months while monthly operating value remains positive.

Meaning: reduce scope, frequency, retries, review burden, fixed tooling, or orchestration before scaling.

### KEEP
Use when:
- `NetValue > 0`,
- `S >= Q`,
- there is no qualifying rightsizing alternative,
- no REVIEW uncertainty flag is active,
- no REDUCE friction flag is active.

KEEP never means "perfect"; it means the current configuration survives the stated assumptions.

## Buyer-facing outputs

Always show numbers before the label:
- monthly total agent operating cost
- successful outcomes / month
- cost per successful outcome
- business value per successful outcome
- monthly realized value
- monthly net operating value
- value-to-cost ratio
- payback period when applicable
- human baseline cost per successful outcome
- current vs alternative-model CPSO
- retry/review/failure burden as dollars and % of total cost
- final signal: KEEP / REDUCE / RIGHTSIZE / REVIEW / STOP

Also show a sensitivity note: "If success rate falls X points / retry rate rises Y points / value per outcome falls Z%, the decision changes." When possible, compute the nearest break-even value per success:

`BreakEvenValuePerSuccess = TotalCost / (Successes * D)`

and the break-even success rate numerically when fixed and variable costs make an algebraic shortcut unsafe.

## Commercial routing to existing assets

No new product, brand, checkout or paid tier.

### Result / free information
Route here when the decision is simple and low-exposure: clear KEEP or STOP, high confidence, low monthly spend, no material model-choice ambiguity.

### Existing free diagnostic / decision tools
Route here when there is one bounded improvement axis (for example retry burden or a clear rightsizing candidate) and the buyer can act internally.

### Existing $499 AI & SaaS Spend Waste Audit
Primary paid destination: `/ai-saas-spend-waste-audit.html`

Recommend independent review when any of the following is true:
- recurring AI/SaaS/tool spend is high enough that one wrong renewal/model decision can exceed the $499 audit cost,
- 3+ model/tool vendors participate in the workflow,
- rightsizing changes quality, review burden, or reliability enough that a cheap-model comparison is not sufficient,
- success/value attribution is disputed or unclear,
- multiple workflows share fixed tooling and cost allocation is ambiguous,
- the result is REVIEW with 2+ uncertainty flags,
- the buyer needs KEEP / REDUCE / CONSOLIDATE / REVIEW / CANCEL decisions across the broader stack, not one agent.

CTA language should describe the unresolved decision, not promise savings. Example: "The calculator can size one workflow. If the decision spans multiple tools, models, renewals or unclear cost allocation, use the existing $499 AI & SaaS Spend Waste Audit for an independent stack-level decision review."

## Analytics contract for site operator

Suggested events/properties; implementation belongs to site operator.

- `agent_economics_calculation`
  - signal
  - monthly_total_cost_bucket
  - cpso_bucket
  - value_cost_ratio_bucket
  - success_rate_bucket
  - retry_burden_bucket
  - rightsizing_candidate (boolean)
  - audit_recommended (boolean)
  - do not send raw confidential cost inputs unless explicitly approved

- `agent_economics_audit_cta_click`
  - source_signal
  - audit_recommended
  - route_id

Existing shared analytics should preserve UTM/referrer/route attribution and decorate Stripe checkout as already implemented in `scos-analytics.js`.

## Guardrails

- No guaranteed savings or ROI.
- No universal claim that cheaper/smaller models are better.
- Do not treat token price alone as total cost.
- Do not ignore human review, retries, failed outcomes, fixed tools or migration cost.
- Do not count modeled labor-equivalent value as realized cash savings without evidence.
- Do not call a calculator run, CTA click or checkout visit "Revenue"; only payment-provider evidence is verified revenue.
- Keep all thresholds visible as decision heuristics, not hidden truths.

## Current industry rationale (2026)

- FinOps Foundation: model selection should be framed by cost per business outcome and minimum acceptable quality; over-modeling is analogous to over-provisioning. https://www.finops.org/insights/informing-ai-model-selection/
- FinOps Foundation Unit Economics: fully loaded unit metrics should include costs beyond direct technology use and be tied to business context. https://www.finops.org/framework/capabilities/unit-economics/
- Gartner, Aug. 17 2026: agentic workflow inference cost can rise sharply even as per-token economics improve, making inference tiering/routing and value measurement important. https://www.gartner.com/en/newsroom/press-releases/2026-08-17-gartner-predicts-ai-inference-costs-per-agentic-workflow-will-increase-more-than-fivefold-through-2028

## Acceptance for Role 2

The calculator logic is acceptable when a site operator can implement it without inventing missing economics, and test fixtures cover at least:
1. profitable high-quality KEEP,
2. cheaper model that fails quality floor -> NOT RIGHTSIZE,
3. cheaper model with lower CPSO and acceptable success -> RIGHTSIZE,
4. retry/review-heavy positive workflow -> REDUCE,
5. near break-even / low-confidence workflow -> REVIEW,
6. negative unit economics -> STOP,
7. zero-success case without divide-by-zero or false ROI,
8. multi-tool/high-ambiguity case -> existing $499 Audit recommendation.
