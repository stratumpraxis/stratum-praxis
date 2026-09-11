# Stratum Praxis — Market Validation Freeze

Status: **structure frozen for market validation**

This is not a claim that the revenue system is proven. Current state: **the sales hypothesis is close to testable; payment evidence remains the deciding proof.**

## Public decision architecture

Three primary decision systems only:

1. **Spend & ROI**
2. **Workflow**
3. **Agent Operations**

**Control / compliance is a shared guardrail across all three systems, not a fourth business line unless explicitly approved later.**

## Do not expand by default

Until market evidence justifies a change, do not add new public product categories, major navigation items, large UI frameworks, or parallel business lines merely because they could improve the site.

Allowed changes during the freeze:

- resolve information-architecture inconsistencies
- reduce purchase-decision friction
- strengthen real purchase triggers
- clarify operator/contact/delivery/scope/exclusions/terms
- improve accessibility, performance, mobile reliability and defects
- improve SEO / structured semantics without changing the commercial architecture
- add or repair measurement hooks
- improve copy or visual hierarchy when it makes the existing decision easier

## Purchase decision test

Each major route should let a visitor answer, quickly:

**Am I the target? → What decision will this help me make? → What can I learn for free? → Why would paid depth be justified? → What does it cost? → What do I receive? → What happens after purchase?**

Prefer repairing a break in this sequence over adding another page.

## Purchase-trigger framing

Lead with moments where a buyer must make a decision, for example:

- Before a SaaS renewal, decide what to keep, reduce or remove.
- AI spend increased but the value cannot be explained internally.
- Decide whether one recurring workflow should actually be automated before funding implementation.
- Before adding agents or autonomy, make unit economics, permissions and human gates explicit.

Avoid leading with abstract AI categories when a concrete decision moment is available.

## Trust boundary

Maintain:

- no invented ROI
- no fabricated clients, testimonials, payment evidence or urgency
- fixed-scope language where applicable
- clear samples and fictional examples labeled as such
- clear delivery, scope, exclusions, contact, terms and post-purchase path
- Buyer Workspace as a return layer after paid action

## Measurement contract

Canonical journey events:

- `route_select`
- `free_tool_start`
- `free_tool_complete`
- `paid_product_view`
- `checkout_click`
- `purchase` and/or `verified_access` only from explicit verified hooks
- `buyer_return`

Do not infer a purchase from a product-page view or Buyer Workspace visit.

## Search / AI readability

For commercial routes, keep these concepts explicit in rendered HTML and metadata where practical:

**Who / Problem / Price / Deliverable / Scope / Timing / Next action**

Keep title, description, canonical, sitemap and structured data aligned with the same three-system architecture.

## Change principle during validation

**Addition is not the default. Consistency, trust, measurement and purchase-trigger clarity come first.**

If a proposed change makes it harder to attribute market results to the current structure, defer it until evidence justifies the expansion.
