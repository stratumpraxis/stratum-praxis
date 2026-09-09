# AI Agent Economics Calculator — Revenue QA Test Vectors

Owner: MarketNest Pro / AI Spend & Agent Economics (role ❷)
Purpose: validate the existing `ai-agent-cost-roi-calculator.html` upgrade against the Decision Logic Contract before production acceptance.

This is QA infrastructure, not a new product, page, offer, checkout, or public asset.

## Acceptance rules

Use the formulas in `docs/agent-economics-calculator-spec.md` as the source of truth.

- Currency outputs: tolerance ±$0.02 before display rounding.
- Ratios / percentages: tolerance ±0.1 percentage point.
- `Successes = 0` must never produce a finite profitable CPSO or a positive verdict.
- Decision precedence for these tests: `STOP` → `RIGHTSIZE` → `REVIEW` → `REDUCE` → `KEEP`.
- A cheaper alternative that fails the minimum quality/success floor must never trigger `RIGHTSIZE`.
- A diagnostic verdict and a commercial-routing recommendation are separate outputs: the math may say `KEEP` while stack complexity can still justify the existing $499 audit.
- Do not claim realized savings from modeled labor value unless the buyer states that the labor cost is actually removable/avoidable. Otherwise label it capacity value or modeled labor-equivalent value.

Common symbols:
`N` tasks/month, `K` runs/base attempt, `R` retry incidence, `A` extra retries when retry occurs, `Cm` model/API cost/run, `Ct` other variable tool cost/run, `F` fixed tool cost/month, `I` infra/observability/month, `S` final success rate, `Q` minimum success floor, `Hr` review coverage, `Hm` review minutes, `Fm` failure recovery minutes, `W` loaded hourly labor cost, `V` business value/success, `B` one-time build cost, `D` value confidence, `Bh` human minutes/task, `Bs` human success rate.

---

## Vector 1 — KEEP: economically strong, quality clear, low friction

Inputs:
- N=1000, K=1, R=0.10, A=1
- Cm=$0.08, Ct=$0.02, F=$300, I=$100
- S=0.95, Q=0.90
- Hr=0.02, Hm=0.5, Fm=1, W=$50
- V=$4, B=$1,000, D=0.90
- Bh=6, Bs=0.98
- no alternative model

Expected core outputs:
- expected runs/task = 1.10
- monthly runs = 1,100
- total monthly operating cost = $560.00
- successful outcomes = 950
- CPSO = $0.58947
- realized value = $3,420.00
- monthly net operating value = $2,860.00
- VCR = 6.10714
- payback = 0.34965 months
- review + failure burden = 8.93% of total cost

Expected decision: `KEEP`
Expected commercial route: free result / bounded next-step information; do not force the $499 audit solely from this one-workflow result.

---

## Vector 2 — STOP: recurring economics are negative

Inputs:
- N=1000, K=1, R=0.10, A=1
- Cm=$0.50, Ct=$0.10, F=$800, I=$300
- S=0.80, Q=0.90
- Hr=0.30, Hm=2, Fm=3, W=$50
- V=$0.50, B=$1,000, D=0.90
- Bh=6, Bs=0.98

Expected core outputs:
- total monthly operating cost = $2,760.00
- successful outcomes = 800
- CPSO = $3.45
- realized value = $360.00
- monthly net operating value = -$2,400.00
- VCR = 0.13043
- payback = no payback

Expected decision: `STOP`
Expected wording constraint: do not label this a savings opportunity; say the current configuration should not be scaled without redesign/re-establishing outcome economics.

---

## Vector 3 — RIGHTSIZE: cheaper model wins only after quality + total burden check

Current inputs:
- N=1000, K=1, R=0.10, A=1
- Cm=$0.50, Ct=$0.05, F=$300, I=$100
- S=0.95, Q=0.90
- Hr=0.15, Hm=1, Fm=3, W=$50
- V=$4, B=$1,000, D=0.90
- Bh=6, Bs=0.98

Alternative model:
- Cam=$0.15, Sa=0.93, Ra=0.12, Har=0.15

Expected current outputs:
- total monthly cost = $1,255.00
- CPSO = $1.32105
- current successes = 950

Expected alternative outputs:
- alternative total monthly cost = $924.00
- alternative successes = 930
- alternative CPSO = $0.99355
- CPSO reduction = 24.79%
- alternative success rate 0.93 >= Q 0.90

Expected decision: `RIGHTSIZE`
Expected caveat: migration/engineering cost must be surfaced separately if non-zero.

---

## Vector 4 — REVIEW: result is fragile near the quality floor

Inputs:
- N=1000, K=1, R=0.10, A=1
- Cm=$0.08, Ct=$0.02, F=$300, I=$100
- S=0.92, Q=0.90
- Hr=0.02, Hm=0.5, Fm=1, W=$50
- V=$1.20, B=$1,000, D=0.90
- Bh=6, Bs=0.98

Expected outputs:
- total monthly cost = $585.00
- successful outcomes = 920
- CPSO = $0.63587
- realized value = $993.60
- monthly net value = $408.60
- VCR = 1.69846
- S is only 2 percentage points above Q

Expected decision: `REVIEW`
Reason under contract: success rate is within 5 percentage points of the minimum acceptable floor; economics should not be presented as robust even though net value is positive.

---

## Vector 5 — REDUCE: profitable, but review/failure burden dominates cost

Inputs:
- N=1000, K=1, R=0.10, A=1
- Cm=$0.08, Ct=$0.02, F=$300, I=$100
- S=0.90, Q=0.85
- Hr=0.50, Hm=3, Fm=6, W=$50
- V=$8, B=$2,000, D=0.90
- Bh=6, Bs=0.98

Expected outputs:
- total monthly cost = $2,260.00
- successful outcomes = 900
- CPSO = $2.51111
- realized value = $6,480.00
- monthly net value = $4,220.00
- VCR = 2.86726
- review + failure burden = 77.43% of total cost

Expected decision: `REDUCE`
Expected interpretation: reduce review/retry/failure burden, scope or orchestration before scaling; positive ROI alone must not yield KEEP.

---

## Vector 6 — ZERO SUCCESS: hard edge case

Inputs: same as Vector 1 except `S=0`.

Expected outputs:
- total monthly cost = $1,351.67
- successful outcomes = 0
- CPSO = undefined/infinite (UI must show a safe human-readable value, never `NaN` as a decision)
- realized value = $0
- monthly net value = -$1,351.67
- no payback

Expected decision: `STOP`
Required QA: no divide-by-zero crash, no Infinity/NaN leak that breaks UI, no positive ROI/verdict.

---

## Vector 7 — CHEAPER MODEL FAILS QUALITY FLOOR: must NOT RIGHTSIZE

Current inputs:
- N=1000, K=1, R=0.10, A=1
- Cm=$0.80, Ct=$0.05, F=$300, I=$100
- S=0.96, Q=0.90
- Hr=0.02, Hm=0.5, Fm=1, W=$50
- V=$5, B=$1,000, D=0.90
- Bh=6, Bs=0.98

Alternative:
- Cam=$0.05, Sa=0.82, Ra=0.05, Har=0.01

Expected:
- current CPSO = $1.43403
- alternative total cost = $659.17
- alternative CPSO = $0.80386
- raw CPSO reduction ≈43.94%
- BUT alternative Sa=0.82 < Q=0.90

Expected decision: `KEEP` for the current configuration unless another independent REVIEW/REDUCE flag is triggered.
Required QA: `RIGHTSIZE` is forbidden despite the apparently large cost reduction.

---

## Vector 8 — COMMERCIAL ROUTING: one workflow math vs stack-level decision

Use Vector 1 numeric inputs, but buyer context states:
- 3+ model/tool vendors participate in the workflow,
- fixed tooling is shared across multiple workflows,
- renewal allocation is unclear.

Expected diagnostic decision: `KEEP` for the modeled workflow under stated assumptions.
Expected commercial route: existing `$499 AI & SaaS Spend Waste Audit` at `/ai-saas-spend-waste-audit.html` because the unresolved decision is stack-level allocation/renewal complexity.

Expected CTA principle:
`The calculator can size one workflow. If the decision spans multiple tools, models, renewals or unclear cost allocation, use the existing $499 AI & SaaS Spend Waste Audit for an independent stack-level decision review.`

Do not create a new paid product or checkout for this route.

---

## Production acceptance checklist for role ❷

Role ❷ signs off only when:
1. all eight vectors produce the expected decision behavior;
2. zero-success and zero/empty inputs fail safely;
3. alternative-model logic enforces the quality floor before cost comparison;
4. retry, human review and failure recovery are included before CPSO comparison;
5. modeled labor-equivalent value is not misrepresented as verified savings;
6. `$499` routing is triggered by unresolved complexity/exposure, not by fear-based copy or arbitrary upsell;
7. the existing audit destination remains `/ai-saas-spend-waste-audit.html` and no new paid destination is introduced.
