# Stratum Praxis public-site revenue architecture

Date: 2026-09-11
Status: active routing model
Change type: extension / routing clarification. Existing pages, prices, checkouts and public assets remain intact.

## Objective

Turn a large public inventory into a small number of buyer journeys. Do not make visitors browse the whole site. Route by business problem, then by commitment level.

Core sequence:

ENTRY / FREE EVIDENCE -> DECISION ROUTER -> SELF-SERVICE PAID -> PROFESSIONAL ESCALATION -> RECURRING / FOLLOW-ON

Primary labels:

- ENTRY: search/social/free diagnostic entry.
- ROUTER: category or decision page that chooses the next route.
- PAID: direct self-service conversion page.
- ESCALATION: higher-value specialist or recurring service.
- PROOF / SUPPORT: trust, docs, sample, licence, changelog or legal terminal.
- RESEARCH ENTRY: public discovery asset that must not compete with the core B2B navigation.

## Tier 0 — Home

- `/` — TOP / ROUTER.
- Job: choose one business problem, not one product.
- Primary lanes: Spend & ROI, Workflow & Automation, Agent Operations & Governance, Compliance & Release Readiness.
- Secondary surfaces: Systems Library and Research / Utility. Keep them out of the primary purchase ladder unless context makes them relevant.

## Tier 1 — Four revenue lanes

### A. Spend & ROI

Highest-value monetization ladder because it supports one-time audit, success-based recovery and recurring monitoring.

ENTRY
- `/ai-saas-waste-calculator.html`
- `/ai-saas-spend-audit-checklist.html`

ROUTER / MID
- `/live-lab.html`
- `/product-router.html`

PAID
- `/ai-value-realization-kit.html` — $39 self-service.

ESCALATION / END
- `/ai-saas-spend-waste-audit.html` — $499 fixed-scope spend audit.
- `/ai-saas-spend-monitoring.html` — post-audit Verified Savings Recovery + $199/$499 monthly monitoring.

Recommended path:
`Waste Calculator / Spend Checklist -> $39 Value Kit -> $499 Spend Audit -> Recovery / Monitoring`

### B. Workflow & Automation

ENTRY
- `/b2b/`
- `/ai-consultant.html`

ROUTER / MID
- `/live-lab.html`
- `/product-router.html`
- `/sample-workflow-audit.html` — PROOF, not primary entry.

PAID
- `/ai-workflow-sop-governance-kit.html` — $49 self-service implementation / governance layer.
- `/ai-value-realization-kit.html` — $39 when the bottleneck is value proof rather than SOP design.

ESCALATION / END
- `/workflow-audit.html` — $499 fixed-scope professional audit.

Recommended path:
`Workflow Diagnostic -> $39 Value Case OR $49 SOP/Governance -> $499 Workflow Audit`

### C. Agent Operations & Governance

ENTRY
- `/ai-agent-economics-calculator.html`
- `/agent-control-auditor.html`
- `/ai-council-builder.html`
- `/ai-council-builder-ja.html` — localized alternate of the Council path, not a separate business lane.

ROUTER / MID
- `/ai-agent-procurement-governance-guide.html` — chooses vendor due diligence vs permissions/governance vs workflow audit.
- `/product-router.html`

PAID
- `/ai-workspace-safety-workflow-kit.html` — $19.
- `/cross-agent-operating-kit.html` — $69 / $149 / $299 licence ladder.
- `/ai-council-builder.html` — $29 paid toolkit after the free diagnostic.
- Vendor / governance products reached from the procurement guide remain child products of this lane.

SECONDARY PAID / MARKETPLACE
- `/safe-api-automation-kit.html` — keep as a technical subroute; do not make it a primary navigation choice while checkout routes through generic marketplace surfaces.
- `/workflow-operator.html` — keep as a Systems/operations subroute; do not let it compete with Cross-Agent as the main agent-operations offer.

ESCALATION / END
- `/workflow-audit.html` when the workflow itself is not defined strongly enough for vendor/control decisions.

Recommended path:
`Economics / Control Auditor -> $19 Safety OR $69–299 Cross-Agent -> Procurement/Governance route when relevant -> $499 Audit only for company-specific workflow decisions`

### D. Compliance & Release Readiness

ENTRY
- `/eu-ai-act-article-50-checklist.html`

ROUTER / MID
- `/live-lab.html`
- `/product-router.html`

PAID
- `/eu-ai-act-article-50-transparency-readiness-pack.html` — $129 one-time.

ESCALATION / END
- `/workflow-audit.html` only when the operational workflow needs company-specific review. Do not present the audit as legal certification.

Recommended path:
`Article 50 Checklist -> $129 Readiness Pack -> workflow-specific professional review if justified`

## Tier 1 secondary — Systems Library

Role: developer / operator proof and technical catalogue. Public, indexable, but secondary to the four buyer lanes.

HUB / ROUTER
- `/systems/`

FREE TECHNICAL LEAVES
- `/systems/products/truth-gate/`
- `/systems/products/duplicate-guard/`
- `/systems/products/attribution-contract/`

PROOF / SUPPORT TERMINALS
- `/systems/docs/`
- `/systems/licenses/`
- `/systems/changelog/`

Revenue rule: technical proof may cross-link to Cross-Agent Operating Kit or other relevant operating products, but Systems should not become a second generic storefront.

## Tier 1 secondary — Utility / Research

Role: discovery, SEO, experiments and research. Keep these pages public where intended, but do not make them equal-weight B2B navigation choices.

RESEARCH ENTRY
- `/revenue-pump/`
- `/revenue-pump/auto/`
- `/money-resilience/`
- `/ai-monetization-reality-check.html`
- `/ai-income-claim-checklist.html`
- `/rustchain-bounty-radar.html`

Routing rule:
- Revenue Pump may route to a relevant B2B revenue/audit path after it finds a real blockage.
- AI monetization / income-claim pages may route into revenue/product decision assets when fit is explicit.
- Money Resilience and Bounty Radar remain independent research/utility surfaces unless a natural B2B decision exists. Do not force unrelated monetization.

## Global navigation

Primary nav should stay small:

1. Home
2. Free Tools
3. Paid Routes
4. Audit

Secondary/footer navigation:
- Systems
- Research / Utilities
- Privacy
- Terms

Do not expose the full page inventory in the header.

## Page-role rule

Every public page must answer two routing questions:

1. What role am I? ENTRY / ROUTER / PAID / ESCALATION / PROOF / SUPPORT / RESEARCH ENTRY.
2. What is the single next useful action?

Avoid multiple equal-weight CTAs. A page can mention alternatives, but one route must be visually primary.

## Revenue priority

1. Spend & ROI — strongest LTV ladder: $39 -> $499 -> recovery / $199–499 monthly.
2. Workflow & Automation — broadest B2B demand: free diagnosis -> $39/$49 -> $499.
3. Agent Operations & Governance — strongest product AOV: $19 -> $69/$149/$299, with procurement/governance children.
4. Compliance — high-intent niche: free Article 50 check -> $129 readiness pack.
5. Systems / Research — acquisition and proof surfaces, not independent top-level revenue competitors.

## Non-destructive rules

- Preserve all current URLs and checkout destinations.
- Do not delete public Research or Systems assets merely because they are secondary.
- Do not change prices as part of information-architecture work.
- Keep localized alternates as alternates, not separate category choices.
- Prefer routing and hierarchy changes over creating more products or landing pages.
