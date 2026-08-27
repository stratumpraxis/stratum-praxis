# 無人収益部門 — 2026-08-28

## Objective
既存の公開資産を、検索・コンテンツ流入から診断、意思決定、決済、購入確認、納品、再訪まで24時間接続する。新規商品の無目的な量産ではなく、既存資産の稼働率と売上寄与を上げる。

## Active lanes
1. AI無人化コンサル: `ai-consultant.html` → Stripe → Worker purchase verification → delivery/activation.
2. AI Fit Router JA: `ai-fit-router-ja/` →適合ルーティング → 有料導線.
3. Prompt Store: `prompt-store/` → 無料サンプル → 有料商品 → buyer-only access.
4. ROI Calculator: `ai-agent-cost-roi-calculator.html` → 意思決定 → relevant offer.
5. Signal / Bing: `signal/` + `.github/workflows/indexnow-signal.yml` → organic entry.
6. Return Gate: `return-gate/` → repeat visit / repeat activation.

## North-star funnel
Qualified organic/social traffic → useful free interaction → relevant offer click → checkout → verified purchase → delivery → activation → repeat visit → repeat purchase.

## Immediate build queue
### A. Async AI Advisor
- Create a dedicated, clearly AI-disclosed asynchronous advice product.
- Do not claim human review unless it actually occurs.
- Inputs: business context, objective, constraints, current assets, question.
- Output: structured diagnosis, assumptions, actions, risks, next checkpoint.
- Gate payment before premium response generation.
- Rate-limit and abuse-filter intake.
- Log `advisor_intake`, `advisor_checkout`, `advisor_purchase`, `advisor_delivery`, `advisor_followup`.

### B. Private certification / skill badge
- Treat as a private skills assessment, not a government/public qualification.
- Publish scope, assessment criteria, pass threshold, evidence policy, expiry/renewal policy and revocation policy before charging.
- No employment, income, legal-status or public-qualification claims.
- MVP: AI Workflow Operator Skills Assessment.

### C. Entertainment / fortune lane
- Separate brand and data surface from Stratum Praxis B2B.
- Position as entertainment / reflection, never certainty or professional medical/legal/financial guidance.
- Free result → paid extended reading → optional recurring reading.

### D. Note/content salesperson
- Content itself is the salesperson.
- No automated mass DM/comments.
- Research demand → create useful article → map one existing asset → add contextual CTA → measure outbound clicks.
- Human publication is allowed where platform access requires it.

### E. Bing / IndexNow
- Reuse existing IndexNow workflow.
- Submit only canonical, useful pages that are actually changed/new.
- No doorway pages, keyword stuffing or mass low-value generation.
- Measure Bing organic landing sessions separately from total organic.

## Stop conditions
- Any platform warning/CAPTCHA/account restriction.
- Broken purchase verification or delivery.
- Duplicate/low-value content generation.
- Claims that imply guaranteed revenue, official certification, professional advice or human review where none exists.
- Any automation requiring credentials/secrets not already configured: stop at the configuration boundary and document the exact missing binding.

## Success criteria
- Existing checkout-bearing assets remain functional.
- `unmanned/` becomes the internal/public routing hub for autonomous lanes.
- Each lane has measurable entry → checkout → delivery/activation events.
- No spam-based acquisition.
- New lanes are released only after end-to-end QA.