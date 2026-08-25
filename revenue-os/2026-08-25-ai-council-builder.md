# AI Council Builder — Revenue handoff

Date: 2026-08-25
Owner/brand: Stratum Praxis
Status: implementation branch prepared; live Stripe product and Payment Link created

## Offer

**AI Council Builder — Find your AI team. Assign the roles. Run better decisions.**

One-time self-serve digital toolkit. Public free diagnostic identifies whether a buyer is better suited to a Lean Solo, Specialist Pair, or Council workflow. Paid workspace provides AI-stack planning, role-based multi-agent prompts, meeting protocols, a final decision memo, and a local-only AI subscription overlap/spend optimizer.

Price: **$29 USD one-time**
Stripe Product: `prod_V8ZA4x9rwoN7VZ`
Stripe Price: `price_1U8I2UJMK7zFs9975vOb3wPD`
Stripe Payment Link ID: `plink_1U8I2cJMK7zFs997FUnqeZ3Z`
Checkout: https://buy.stripe.com/dRm00k2oAdHt0G49ZV6Zy0E
Public page target: https://stratumpraxis.com/ai-council-builder.html
Purchase access target: https://stratumpraxis.com/ai-council-builder-access.html?session_id={CHECKOUT_SESSION_ID}

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

Branch: `ai-council-builder`
Public sales/diagnostic page: `ai-council-builder.html`
Access verification page: `ai-council-builder-access.html`
New Worker wrapper: `worker/council-worker.js`
Worker config changes entry point from `ai-consultant-worker.js` to `council-worker.js`. The wrapper handles `/council/*` and delegates every other request to the existing Worker, preserving prior products.

## Initial metrics / truth state

At creation time:
- Qualified product-page traffic: 0 measured after launch
- CTA: 0 measured after launch
- Checkout starts: 0 measured after launch
- Verified purchases: 0
- Revenue: $0
- Verified paid activation: 0

Do not treat QA page loads or invalid verification tests as customer demand.

## Target metric and next bottleneck

Primary first milestone: **first verified paid purchase and activation**.

After deployment, priority order:
1. Verify public page, Stripe redirect, denial behavior and Worker deployment.
2. Create qualified distribution to the free diagnostic rather than new products.
3. Evaluate `diagnostic_complete → checkout_click → revenue_verified` with real traffic.
4. Improve the single weakest step from measured data.

Do not add live multi-model API orchestration until real customer evidence proves it is worth taking on API cost, security, provider and support burden.
