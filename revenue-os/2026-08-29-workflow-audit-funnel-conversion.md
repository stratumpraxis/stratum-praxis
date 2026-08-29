# Workflow Audit funnel — landing → CTA → checkout (2026-08-29)

Bottleneck addressed: `/workflow-audit.html` was receiving real production traffic
(funnel_view 4, primary_cta_click 0, checkout_click 0, purchases 0). Priority 2 in the
Revenue Company OS order: improve conversion on an offer that already receives traffic.

No new offer was created. Price, product scope and the Stripe destination are unchanged.

## Verified production state (read from code, not from docs)

| Item | Verified value |
| --- | --- |
| Production URL | `https://stratumpraxis.com/workflow-audit.html` (GitHub Pages, `CNAME` → stratumpraxis.com) |
| Repository / branch | `stratumpraxis/stratum-praxis`, work on `claude/workflow-audit-funnel-lvdhm1`, deploys from `main` |
| Offer / price shown | AI Workflow Opportunity Audit, $499 one-time, written delivery |
| Checkout | Stripe Payment Link `https://buy.stripe.com/14A00kgfqavh4Wkgoj6Zy02` (shared with the AI/SaaS spend-audit pipe) |
| Tracking | `scos-analytics.js` → PostHog `us.i.posthog.com` |
| Source / UTM preservation | `decorateCheckoutLink()` appends `client_reference_id` + `utm_source/medium/campaign/content` to the Stripe URL |

## Root causes found for CTA = 0

1. **Attribution was split across two identities (measurement defect).**
   `funnel_view` was captured through the PostHog SDK (SDK-generated distinct id), while
   `primary_cta_click` and `checkout_click` were sent by raw `sendBeacon` using a separate
   `sp_anonymous_id_v2` value. The two ids never matched, so a PostHog funnel from view →
   CTA → checkout dropped to zero **by construction**. The reported 0 clicks is therefore
   not trustworthy evidence of zero clicks.
2. **The sample page was an untracked dead end.**
   `sample-workflow-audit.html` loaded no analytics at all and its Stripe button carried no
   analytics attributes — yet "View illustrative sample" sat directly beside the buy button
   above the fold. The most natural de-risking click left the measured funnel entirely.
3. **The CTA was below the fold on desktop.** At 1280×720 the hero CTA rendered at y=905 —
   a five-line headline plus generous hero padding consumed more than a full viewport.
4. **Two competing CTAs at the decision point**, both styled as buttons.
5. **A cheaper competing offer sat in the sticky header** (`$39 ROI Kit`) above the fold.
6. **The downsell section preceded the closing CTA**, intercepting buyers with a ¥4,980 and a
   $39 alternative before they reached the $499 close.
7. **No persistent purchase path on mobile** — the hero CTA scrolled away and the only other
   checkout link was at the very bottom of a long page.
8. **No way to diagnose a zero.** Nothing distinguished "nobody scrolled to the CTA" from
   "saw the CTA and did not click".

## Changes made

`scos-analytics.js` (shared bundle — additive, all 47 pages regression-checked)
- PostHog is bootstrapped with the same anonymous id used by the beacon path, and the beacon
  now reuses `posthog.get_distinct_id()`. View and click events land on one person, so the
  funnel joins.
- New `primary_cta_view` (IntersectionObserver, fires once when a CTA is actually seen).
- New `scroll_depth` at 25/50/75/90%.
- New `secondary_cta_click` for any tagged non-primary link, so CTA leaks stop being invisible.
- `[data-cta-persistent]` opts always-visible bars out of `primary_cta_view` so that
  diagnostic keeps meaning "the visitor reached a CTA in the page".

`workflow-audit.html`
- Headline shortened to a five-second claim; the qualifier moved into the lead.
- Hero rhythm tightened: offer, $499 price, single CTA and post-payment note now all sit
  above the fold at 1280×720 (CTA bottom y=530) and at 390×844.
- One dominant CTA in the hero; the sample link demoted to an inline text link.
- Post-payment certainty placed at the decision point (intake, no call, 3-business-day target)
  — wording kept to claims the page already makes.
- Downsell section moved to **after** the closing CTA.
- `$39 ROI Kit` removed from the header nav; nav now points at page sections and the sample.
- Sticky mobile checkout bar (mobile only, hidden on desktop).
- Every link tagged with `data-analytics-id`, internal links carry UTMs.

`sample-workflow-audit.html`
- Loads the analytics bundle; declares `data-funnel="workflow_audit_sample"`.
- Tracked checkout CTA added above the fold, existing bottom CTA tagged.
- Return links to the landing page carry UTMs.

## Verification performed

Headless Chromium against a local static server, 22 assertions, all passing:
CTA count and Stripe destination; `client_reference_id` and UTM survival into the Stripe URL;
offer/price/CTA/note above the desktop fold; downsell after the close; no cheaper offer in nav;
`funnel_view`, `primary_cta_view`, `primary_cta_click`, `checkout_click` all firing with a
**matching distinct id**; sample-page checkout click measured; sticky bar pinned, topmost and
hit-testable at three scroll depths with a real touch tap producing `checkout_click`;
no horizontal overflow at 390px; sticky bar hidden on desktop.
All 47 pages that load the shared bundle were re-checked for JS errors and `funnel_view`.

## Not verified — needs owner action

- **Live URL and Stripe link could not be reached from this session.** The egress proxy denied
  CONNECT to `stratumpraxis.com` and `buy.stripe.com` (403). Everything above is verified from
  production source and deploy configuration. Confirm the deployed page after merge.
- **The post-payment destination of the Stripe Payment Link is unverified.** Nothing in this
  repository defines where a buyer lands after paying, or how the intake is delivered. If that
  link has no success URL pointing at an intake, the funnel still breaks *after* checkout.
  This is the next bottleneck once CTA clicks appear, and it is owner-only (Stripe dashboard).

## Metrics to judge this change

Primary: `checkout_click` per `funnel_view` on `funnel = workflow_audit`.
Supporting: `primary_cta_view` / `funnel_view` (did they reach a CTA), `primary_cta_click` /
`primary_cta_view` (did seeing it convert), `scroll_depth` distribution, `secondary_cta_click`
by `cta_id` (where attention leaks), `workflow_audit_sample` funnel_view → checkout_click.

Decision rule: with the identity join fixed, treat the first ~100 `funnel_view` on this funnel
as the first honest baseline. The previous 4/0/0 is not a valid conversion measurement.
Do not conclude the offer fails from pre-fix data.
