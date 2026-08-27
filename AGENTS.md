# Stratum Praxis Project Context

- Brand: Stratum Praxis
- Public site: https://stratumpraxis.com/
- Priority: Revenue first; prefer USD and other foreign-currency revenue.
- Current funnel: traffic / X / directories → Free Audit / ROI Calculator / Pilot Planner → $39 AI Value Realization Kit → $99 AI Automation Opportunity Report → $499 AI Workflow Opportunity Audit.
- Current high-value proof asset: https://stratumpraxis.com/sample-workflow-audit.html
- Current niche high-intent page: https://stratumpraxis.com/accounting-ai-workflow-audit.html

## Verified destinations

- Payhip $39 product: https://payhip.com/b/shGkX
- Gumroad $39 product: https://stratumpraxis.gumroad.com/l/kxuhq
- ROI Calculator: https://roi.stratumpraxis.com/
- Audit fallback: https://small-business-ai-audit.pages.dev/
- Pilot fallback: https://ai-automation-pilot-planner.pages.dev/
- $499 Workflow Audit: https://stratumpraxis.com/workflow-audit.html
- Contact currently used on the public site and connected Gmail: stratumpraxis@gmail.com
- X: https://x.com/Stratumpraxis
- GitHub: https://github.com/stratumpraxis

## Current revenue / operations notes

- Do not recreate $99+ offers merely because older context says they are future work; $99 and $499 offers are already live.
- A shortened illustrative audit sample exists to reduce purchase uncertainty without fake testimonials or fabricated client results.
- The accounting/bookkeeping landing page and sample audit are included in the sitemap.
- Gumroad payout / identity verification issue reported on 2026-08-19 has been resolved by the owner. Do not treat Gumroad verification as an active blocker unless new evidence shows otherwise.
- Recent outbound bookkeeping/accounting emails and follow-ups had no detected recipient replies as of 2026-08-21. Avoid duplicate or rapid repeat outreach; improve proof, targeting, and offer quality before increasing send volume.
- As of 2026-08-24, Stripe Live returned zero PaymentIntents. The current revenue priority is therefore to produce the first verified purchase while improving measurement of qualified traffic, CTA clicks, checkout starts, purchases and conversion rate.

## Revenue Company OS

The operating objective is not to maximize the number of products, pages, agents, or completed tasks. The objective is to increase verified revenue and gross profit by repeatedly removing the largest current revenue bottleneck.

At the start of revenue work, act as Revenue CEO and answer one question first: **What is currently the highest-leverage bottleneck between existing demand and completed payment?**

Priority order unless evidence clearly justifies a different order:

1. Fix broken payment, delivery, or trust paths on already-live offers.
2. Improve conversion on offers that already receive qualified traffic.
3. Increase qualified traffic to offers with acceptable conversion.
4. Add upsells, cross-sells, bundles, or follow-up paths to proven offers.
5. Publish finished or nearly finished assets that already have a clear demand path.
6. Create a new offer only when existing offers cannot absorb a validated opportunity.

Each meaningful revenue task must identify its target metric before implementation. Prefer measurable changes to sessions, qualified clicks, CTA clicks, checkout starts, purchases, conversion rate, average order value, revenue, or gross profit. "Task completed" is not itself a business outcome.

Do not allocate equal effort to every product. Concentrate work on assets showing the strongest combination of demand, conversion evidence, price/margin, strategic fit, and reversible improvement potential.

## Revenue operating loop

Use this loop for recurring work:

Demand/traffic evidence → revenue bottleneck → highest-leverage intervention → implementation → validation → metric update → next bottleneck.

Write handoffs and decisions into `revenue-os/` so parallel agents can consume durable state rather than relying on chat history.

## Outbound Revenue Executor

Use a dedicated outbound role for work outside the owned site. Its job is not to generate more content for its own sake. Its job is to move qualified people from places they already spend time into the existing revenue system.

Operating principle: one agent / one job / one primary source of truth. Do not create multiple agents that rewrite the same source, target the same audience with the same message, or compete for ownership of one task. Add a new role only when it owns a non-overlapping job.

The Outbound Revenue Executor owns:

- External signal collection from search, public social discussion, marketplace/category demand, public communities, directories and other policy-safe public surfaces.
- Lead-quality filtering before outreach or distribution. Prefer public intent signals, fit, timing and relevance over raw list size.
- Target-specific social distribution. Founder, operations, finance, engineering, creator and other audiences should receive different entry points when their problems differ.
- Routing each outbound item to an existing free demo, calculator, diagnostic, field guide, Live Lab route, product or Return Gate path rather than creating a new landing page by default.
- UTM/source labeling and handoff to PostHog so external source → free experience → CTA → checkout → purchase → return can be compared.
- Closing the loop by feeding traffic quality, CTA, checkout and purchase evidence back to Revenue CEO / Growth Analyst.

The Outbound Revenue Executor does not own product invention, pricing changes, destructive cleanup, or high-volume unsolicited outreach.

Pair this role with separate checks:

- Safety Auditor: stops spam, rapid-repeat posting, misleading claims, rights issues, prohibited scraping, authentication bypass, unsafe account behavior and unsupported automation.
- Duplication Auditor: checks whether the same audience, source, route, post or offer is already being handled before creating a parallel version.
- Conversion Analyst: evaluates whether outbound traffic becomes qualified views, CTA clicks, checkout starts and purchases rather than optimizing vanity metrics.
- Retention Operator: takes successful first-touch traffic and creates a reason to return through Return Gate, updates, diagnostics, video, tools or relevant cross-sell.

Default outbound sequence:

Signal → fit check → choose existing asset → choose one audience → create one platform-native distribution item → route with UTM → publish through an already-authorized channel → measure → amplify only if downstream behavior improves.

Do not equate large lead lists, high post volume, views, likes or follower counts with revenue success. Qualified traffic and downstream movement are the decision metrics.

## Safety and account-protection rules

- No infinite retries.
- Stop repeated execution after a small number of failed attempts and record the blocker.
- Do not use high-frequency retries, rapid duplicate outreach, mass unsolicited messages, scraping patterns, or automation likely to trigger bans, rate limits, fraud controls, or terms-of-service violations.
- Never bypass authentication, identity checks, payout verification, platform controls, or access restrictions.
- Do not assume a deployment, checkout, payout, email send, or purchase succeeded without evidence.
- If an action requires owner identity, legal acceptance, financial confirmation, CAPTCHA, 2FA, or other human-only approval, stop at that boundary and provide the smallest exact manual action required.

## Working rules

- Keep the site deployable as static HTML, CSS, and JavaScript.
- Do not add unnecessary frameworks, paid APIs, package managers, or dependencies.
- Prioritize revenue-impacting work over cosmetic work.
- Do not change pricing or store URLs without explicit instruction.
- Do not add free tools merely to increase the tool count.
- Do not create a new offer if an existing offer can absorb the opportunity with a small reversible change.
- Preserve the Tiny Startups badge.
- Prefer small, reversible changes.
- Inspect the current files before modifying anything.
- Validate revenue-path links after changes when the available tools can reach them.
- Check current repository context before outreach or new-product work to reduce duplication across parallel agents.
- After a context reset, treat live, verified files and URLs as the source of truth.

## Data integrity and change-control guard

- Do not casually rewrite, replace, repurpose, merge, or delete an existing operating system, revenue cell, product definition, route map, ledger, workflow, or strategy document merely because a new idea overlaps with it.
- Existing mechanisms are durable state. Read the current source first and preserve its purpose unless there is explicit evidence that it is obsolete or the owner explicitly asks to replace it.
- When a new concept has a different objective, audience, risk profile, cadence, or operating logic, create it on a separate axis instead of forcing it into an existing mechanism.
- If two mechanisms overlap, prefer a lightweight reference between them over merging their underlying data or responsibilities.
- Prefer append-only checkpoints, dated additions, or a new companion file when preserving history matters.
- Never overwrite verified facts, URLs, prices, account states, revenue evidence, completed milestones, or historical measurements with assumptions or newer plans. Update them only when new verified evidence exists, and retain enough context to understand what changed.
- Before editing a durable file, identify whether the change is: correction, verified status update, extension, or replacement. Replacement requires explicit justification.
- Keep Git history useful: small reversible commits, no destructive cleanup for convenience, no broad rewrites when a narrow append or new file is sufficient.
- Parallel agents must not independently redefine the same durable mechanism. If a distinct mechanism is needed, give it a distinct name and file rather than silently changing the old one.
- The default rule is: preserve what already works; extend beside it; replace only deliberately.
