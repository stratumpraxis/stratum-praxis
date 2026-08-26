# Revenue Link Ledger

Last updated: 2026-08-26

Use this file as the source of truth when preparing X posts, note articles, comparison pages, affiliate content, and internal cross-links.

## Current product validation cycle — 2026-08-26

### External distribution actually placed

- Public GitHub placement: https://github.com/stratumpraxis/stratum-praxis#current-digital-products
- Placement commit: `f1c2782d760c3313419b6b4ca10bd1d10cd9d96e`
- AI App Builder Router 2026: https://payhip.com/b/LBtbr
- AI Council Builder GitHub-attributed LP: https://stratumpraxis.com/ai-council-builder.html?utm_source=github&utm_medium=referral&utm_campaign=current_products&utm_content=ai_council_builder
- Smartphone Income Blueprint GitHub-attributed LP: https://stratumpraxis.com/smartphone-income-blueprint.html?utm_source=github&utm_medium=referral&utm_campaign=current_products&utm_content=smartphone_income_blueprint
- Smartphone AI Slide Factory GitHub-attributed LP: https://stratumpraxis.com/smartphone-ai-slide-factory.html?utm_source=github&utm_medium=referral&utm_campaign=current_products&utm_content=smartphone_ai_slide_factory
- Search distribution: IndexNow expanded to AI Council EN/JA, Smartphone Income Blueprint, and Smartphone AI Slide Factory; execution confirmed successful on 2026-08-26.

### Distribution status

- Buffer API authentication and publishing-channel connection are both complete. Buffer is no longer blocked by a zero-channel state.
- The previous Smartphone Income one-shot distribution run was a safe no-op while the API key was missing. Do not count that historical run as a post.
- Next verification gate: run real Buffer publishing, capture each public posting URL, map it to the product CTA, and add only verified URLs to the ledger.
- Medium / DEV / note / X / YouTube outside Buffer-connected channels still require their own publish/connect verification before they are counted as placed.

### Measured baseline

- Smartphone Income Blueprint, latest 30-day non-test PostHog funnel at verification time: `funnel_view = 2`, `primary_cta_click = 0`, `checkout_click = 0`.
- Current interpretation: the measured leak is after landing-page arrival and before the tracked primary CTA.
- AI Council Builder EN/JA: no matching product journey events returned for the same validation query at verification time.
- Smartphone AI Slide Factory: product-specific funnel/CTA/checkout instrumentation added and deployed on 2026-08-26; real-user traffic must accumulate before a conversion rate can be claimed.

### Checkout / buyer delivery

- AI Council Builder EN — $29: Stripe Live active; paid Checkout Session + exact offer + purchase email are verified server-side before the private Worker workspace opens; Activation writes Stripe metadata and a PostHog activation event.
- AI Council Builder JA — ¥3,980: same verified-buyer pattern as EN with its own exact Payment Link and JPY offer checks.
- Smartphone Income Blueprint — $19: Stripe Live active; exact paid offer + purchase email → signed token → protected Buyer Kit → Stripe/PostHog Activation.
- Smartphone AI Slide Factory — $19: Stripe Live active. Completion now redirects to `smartphone-ai-slide-factory-access.html?session_id={CHECKOUT_SESSION_ID}`; the Worker verifies the exact paid $19 offer and checkout email before issuing a signed buyer token. Unauthenticated protected routes for Slide Factory, Smartphone Income, Council EN and Council JA all passed the automated 401 smoke test. Activation writes Stripe metadata and a PostHog event.

### Genuine-purchase gate

- Latest checked Stripe Checkout Sessions contained no `payment_status=paid` result for this validation pass.
- Smartphone Income has at least one real open/unpaid Checkout Session, which proves checkout initiation but not purchase.
- Therefore the first genuine Stripe purchase remains `WAITING FOR REAL BUYER`.
- A genuine-purchase completion requires: `paid purchase → buyer verification → buyer-only delivery → activation → revenue record`.
- Never convert 0 to 1 through test traffic, internal QA, or assumed delivery.

## Priority Revenue Pipe — AI & SaaS Spend Decisions

- Hub: https://stratumpraxis.com/ai-saas-spend.html
- Current status: ACTIVE / PRIMARY
- Core demand: small teams buying and renewing AI/SaaS while struggling to justify value, control overlap, predict usage cost and make renewal decisions
- High-intent organic entry: https://stratumpraxis.com/saas-spend-management-small-business.html
- New high-intent free entry: https://stratumpraxis.com/ai-agent-cost-roi-calculator.html
- New entry intent: AI agent cost calculator / AI agent ROI calculator / agent payback / human-review overhead / AI implementation economics
- Organic intent: SaaS spend management for small business / AI spend management / renewal and cost-control buyers comparing whether they need dedicated software
- Free entry: https://stratumpraxis.com/ai-saas-spend-audit-checklist.html
- Exposure calculator: https://stratumpraxis.com/ai-saas-waste-calculator.html
- $39 self-service Decision Kit: https://stratumpraxis.com/ai-saas-spend-decision-kit.html
- $39 Stripe: https://buy.stripe.com/cNi00kgfq7j5ewUfkf6Zy06
- $499 Spend Waste Audit: https://stratumpraxis.com/ai-saas-spend-waste-audit.html
- $499 Stripe: https://buy.stripe.com/14A00kgfqavh4Wkgoj6Zy02
- Monthly Monitoring: https://stratumpraxis.com/ai-saas-spend-monitoring.html
- Core $199/month Stripe: https://buy.stripe.com/aFaaEY9R25aXdsQb3Z6Zy04
- Pro $499/month Stripe: https://buy.stripe.com/cNi6oI7IU6f1gF2c836Zy05
- Post-audit Verified Savings Recovery: 15% of mutually verified first-year savings under written baseline/verification method
- Pipe order: AI-agent ROI/cost search → free calculator → $39 decision system → $499 independent audit → optional 15% verified savings recovery → optional $199/$499 monthly monitoring
- Routing rule: send AI-agent economics intent to the new ROI calculator; send cold/low-intent stack traffic to the organic guide, hub or free checklist; send high-intent renewal/cost-control traffic to the Decision Kit or Audit
- Success metrics: organic impressions, calculator visits, calculator-to-$39 clicks, guide clicks, hub visits, checklist starts, checkout clicks, $39 conversions, $499 conversions, monitoring subscriptions, verified recovery engagements
- Stop rule: do not expand product scope until traffic and conversion data show which layer is pulling demand

## Stratum Praxis hub

- AI Revenue Toolkit comparison hub
  - LP: https://stratumpraxis.com/ai-revenue-toolkit.html
  - Role: choose between VERIFY / OPERATE / ROUTE products

## Product 1 — Revenue Router

- Price: $29 one-time
- LP: https://stratumpraxis.com/revenue-router.html
- Stripe: https://buy.stripe.com/cNifZifbm7j574s1tp6Zy08
- Role: route verified research into content, affiliate, product, lead-generation, or B2B revenue actions

## Product 2 — AI Monetization Reality Check

- Price: $19 one-time
- LP: https://stratumpraxis.com/ai-monetization-reality-check.html
- Stripe: https://buy.stripe.com/cNi7sMgfq1YLagE4FB6Zy0j
- Free entry: https://stratumpraxis.com/ai-income-claim-checklist.html
- Role: evaluate evidence, reproducibility, hidden dependencies and risk behind AI income claims

## Product 3 — AI Workspace Safety & Workflow Kit

- Price: $19 one-time
- LP: https://stratumpraxis.com/ai-workspace-safety-workflow-kit.html
- Stripe: https://buy.stripe.com/28E3cwd3e9rd9cAb3Z6Zy0m
- Free entry: https://stratumpraxis.com/ai-workspace-safety-checklist.html
- Role: set practical data boundaries, AI roles, connector permissions, context portability and incident readiness

## Product 4 — AI Council Builder

- Price: $29 one-time
- LP / free diagnostic: https://stratumpraxis.com/ai-council-builder.html
- Stripe: https://buy.stripe.com/dRm00k2oAdHt0G49ZV6Zy0E
- Paid delivery: verified purchase → private Worker workspace
- Role: diagnose whether the buyer needs one AI, a specialist pair, or a role-separated multi-AI council; provide reusable council prompts, meeting protocols and decision memo
- Included bonus: local-only AI subscription overlap/spend optimizer; it does not access or cancel third-party subscriptions
- Safety structure: no API keys, no account sharing, no third-party AI resale, no automatic external actions, no ongoing support
- Acquisition intent: which AI should I use / ChatGPT vs Claude vs Gemini / AI team / multi-AI workflow / AI subscription overlap / use multiple AI models
- Success metrics: diagnostic views, diagnostic completions, checkout clicks, verified purchases, activations
- Stop rule: do not build hosted multi-model orchestration unless real buyers demonstrate demand that justifies API/security/support burden

## A8.net — confirmed link

- Program: Value AI Writer byGMO
- Affiliate link: https://px.a8.net/svt/ejp?a8mat=4BABTH+8NZ5RM+1JUK+1HNDBM
- Status: link acquired
- Best-fit content: Japanese AI writing / content production / SEO workflow comparisons and tutorials
- Disclosure: clearly label affiliate/PR content according to applicable platform and A8 guidance

## A8.net — next target slots

- Slot 2: TBD
- Slot 3: TBD

Selection rule: prefer programs with direct fit to current AI/workflow audience, clear purchase intent, credible landing pages, and natural inclusion in comparison/decision content. Do not add unrelated high-commission offers.

## note

- Japanese hub article: not yet published
- Recommended role: educational comparison hub that routes readers to the three self-products, free tools, and relevant A8 offers

## Overseas SaaS affiliate

- Status: not yet confirmed/approved
- First candidates to evaluate after A8/note: Make, HubSpot, Semrush or other official programs with direct workflow/AI relevance

## Routing rule

- Which AI / multi-AI / AI council / AI subscription overlap intent → AI Council Builder free diagnostic → $29 verified workspace
- AI agent cost / ROI / payback intent → AI Agent Cost & ROI Calculator → $39 Decision Kit / $499 Audit
- SaaS spend management / AI spend management search intent → high-intent organic entry → AI & SaaS Spend Decision Hub
- AI/SaaS spend, renewal, overlap or cost-control intent → AI & SaaS Spend Decision Hub
- Product-specific X post → direct product LP
- Educational Japanese post → note hub (once live)
- Low-intent visitor → free checklist/tool first
- AI income claim → Reality Check
- AI work safety / multi-AI workflow → Workspace Safety & Workflow Kit or AI Council Builder depending on intent
- Verified research with monetization intent → Revenue Router
- Relevant Japanese SaaS/tool comparison → A8 affiliate where disclosure and fit are appropriate