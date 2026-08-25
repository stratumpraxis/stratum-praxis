# AI Council Builder — Revenue handoff

Date: 2026-08-25
Owner/brand: Stratum Praxis
Status: **LAUNCHED / MAIN MERGED / WORKER DEPLOY VERIFIED**

## Offer

**AI Council Builder — Find your AI team. Assign the roles. Run better decisions.**

One-time self-serve digital toolkit. Public free diagnostic identifies whether a buyer is better suited to a Lean Solo, Specialist Pair, or Council workflow. Paid workspace provides AI-stack planning, role-based multi-agent prompts, meeting protocols, a final decision memo, and a local-only AI subscription overlap/spend optimizer.

Price: **$29 USD one-time**
Stripe Product: `prod_V8ZA4x9rwoN7VZ`
Stripe Price: `price_1U8I2UJMK7zFs9975vOb3wPD`
Stripe Payment Link ID: `plink_1U8I2cJMK7zFs997FUnqeZ3Z`
Checkout: https://buy.stripe.com/dRm00k2oAdHt0G49ZV6Zy0E
Public page: https://stratumpraxis.com/ai-council-builder.html
Purchase access: https://stratumpraxis.com/ai-council-builder-access.html?session_id={CHECKOUT_SESSION_ID}

## Revenue path

Qualified search/social/direct traffic
→ free AI setup diagnostic
→ free profile result
→ $29 CTA
→ Stripe Payment Link
→ Checkout completion redirect
→ purchase email + Checkout Session verification
→ exact Price / amount / currency / Payment Link validation in Cloudflare Worker
→ signed private workspace URL
→ activation event

Tracked public events use the existing Stratum Praxis analytics layer: `funnel_view`, `primary_cta_click`, `checkout_click`, plus `diagnostic_complete`, `verification_submit`, `access_granted`, and `access_denied`. Verified Worker events: `revenue_verified` and `activation`.

## Product structure decision

The product does **not** host or resell third-party AI models. This avoids carrying model API usage, credentials, account custody, token cost, provider outages, automated external actions, or ongoing support obligations. Buyers use AI services they independently choose.

The subscription optimizer is included as a **bonus/value-add**, not a separate financial product. It accepts manually entered service names, costs and primary jobs in the browser, flags apparent overlap, performs no login/cancellation/purchase action, and advises the user to verify current billing before changing subscriptions.

## Safety boundary

- General productivity and ordinary business decision support only.
- Not designed as the sole basis for medical, legal, financial, credit, employment, eligibility, emergency, safety-critical or other high-stakes decisions.
- No API keys, passwords or third-party credentials requested or stored.
- No automatic sending, publishing, purchasing, deletion or subscription cancellation.
- AI outputs may be wrong; material claims should be independently verified.
- Third-party AI features, pricing and availability can change.
- No guarantee of savings, accuracy, income, business result or ongoing compatibility.
- Refund/consumer-right wording must not claim to override applicable law or statutory rights.

## Implementation

Merged PR: `#22 Launch AI Council Builder`
Merge commit: `f96f2246f551df3a5b37006ce1347beefe2f135a`
Public sales/diagnostic page: `ai-council-builder.html`
Access verification page: `ai-council-builder-access.html`
Worker wrapper: `worker/council-worker.js`
Worker entry point: `worker/council-worker.js`
The wrapper handles `/council/*` and delegates every other request to the existing Worker, preserving prior products.

## Deployment / QA

- GitHub PR #22 merged successfully to `main`.
- Cloudflare Worker deployment workflow run `32840373294`: deploy job completed **success**; deployment step, status recording, and job completion all passed.
- Stratum Praxis HTTPS verification workflow run `32840373259`: `verify-http` job completed **success**.
- Stripe Product and one-time $29 Payment Link are live.
- Paid content remains behind server-side purchase verification; public access page contains no paid workspace content.
- A real paid purchase has not been fabricated for QA. Purchase/activation remains truthfully unverified until the first genuine paid Checkout completes.

## Initial metrics / truth state

At launch:
- Qualified product-page traffic: 0 measured after launch
- CTA: 0 measured after launch
- Checkout starts: 0 measured after launch
- Verified purchases: 0
- Revenue: $0
- Verified paid activation: 0

Do not treat QA page loads or invalid verification tests as customer demand.

## Target metric and next bottleneck

Primary first milestone: **first verified paid purchase and activation**.

Priority after launch:
1. Qualified distribution to the free diagnostic.
2. Measure `diagnostic_complete → checkout_click → revenue_verified → activation`.
3. Improve the single weakest measured step.
4. Do not add hosted live multi-model API orchestration unless real buyers demonstrate demand that justifies API/security/support burden.
