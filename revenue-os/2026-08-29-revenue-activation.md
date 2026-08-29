# Revenue activation — Systems Library integration and funnel measurement

Date: 2026-08-29. Append-only record. No entry above this file is rewritten.

## 1. Branch audit — the reported state was wrong in one important way

`claude/stratum-systems-library-mvp-1jzxit` was reported as 8 commits ahead of `main`
carrying unrelated Revenue Publisher, signal-intelligence and media-engine work.

Measured:

```
git merge-base origin/main origin/claude/stratum-systems-library-mvp-1jzxit
  -> b9ffb483ffd566e43562a0956a900ae237647854   (= origin/main HEAD)
git log --oneline origin/main..origin/claude/stratum-systems-library-mvp-1jzxit
  -> 311345b  Ship the Systems Library MVP: three verified packages, one reused checkout
```

One commit ahead, zero behind. The seven earlier commits were already merged to `main`
through their own PRs, so there was no unrelated history to carry and no cherry-pick,
selective merge or dependency untangling was required. Integration was a fast-forward
of a single commit.

That commit is additive: 50 files, +5694/-1. The only pre-existing files it touches are
`index.html` (one nav entry), `sitemap.xml` (+7 URLs, none removed) and
`revenue-link-ledger.md` (append-only section). `scos-analytics.js` is unchanged.

## 2. Claim audit

| Claim | State | Evidence |
| --- | --- | --- |
| 48 package tests (14/16/18) | VERIFIED | ran per-package: 14+16+18, 0 failures |
| 310 pre-existing tests still pass | VERIFIED | `node --test acquisition/**` -> 310 pass, 0 fail |
| build drift check exists and passes | VERIFIED | `node systems/build.mjs --check` -> up to date |
| manifest is the product source of truth | VERIFIED | all 7 pages regenerate from `systems/manifest.json` |
| reuses existing $17 Stripe checkout | VERIFIED | `buy.stripe.com/cNicN60gs9rd1K85JF6Zy0P` and `$17` pre-exist on `main` |
| no checkout/price/store URL created or changed | VERIFIED | diff vs `main` on `prompt-store/index.html` touches no href and no price |
| `scos-analytics.js` reused byte-for-byte | VERIFIED | file absent from the commit's diff |
| attribution survives to `checkout_click` | VERIFIED | reproduced independently, headless Chromium, see §4 |
| delivery verifies a paid session before access | VERIFIED (configuration) | `worker/prompt-store-worker.js`, see §5 |
| repo root LICENSE is MIT | VERIFIED | `LICENSE` line 1 |
| sitemap +7, none removed | VERIFIED | 74 -> 81 URLs, all pre-existing `<loc>` retained (82 after §3.1) |
| live `/systems/` URLs reachable | BLOCKED | egress policy answers 403 to CONNECT for stratumpraxis.com |
| real purchase / verified revenue | NOT_VERIFIED | `revenue-os/metrics.json`: `verified_revenue: null`, `stripe_live_payment_intents: 0` |

## 3. Defects found and fixed

Three real defects on the revenue path, none of them cosmetic:

1. **The paid product page was orphaned.** `/prompt-store/` was absent from
   `sitemap.xml` and no page on the site linked to it except an internal ops page.
   The one live paid product had no organic discovery path at all. Added to
   `sitemap.xml`. The Systems Library is now the first real internal route to it.

2. **The library -> product hop was unmeasured.** The paid catalogue card was a plain
   same-origin link, so it emitted no event: there was no way to tell the Systems
   Library apart from a page nobody clicks through. It now carries `data-primary-cta`
   and emits `primary_cta_click`. Generated from `systems/build.mjs`, keyed off
   `checkout_url`, so only entries that actually have a checkout are marked.

3. **Checkout `cta_id` was derived from link text.** None of the three Stripe CTAs on
   `/prompt-store/` had a `data-analytics-id`, so `scos-analytics.js` fell back to
   `textContent`. That page has an EN/JA switcher that rewrites button text, so the
   same button reported a different `cta_id` per language, and any copy edit silently
   renamed it. Added `prompt_store_hero_checkout`, `prompt_store_offer_checkout` and
   `prompt_store_sticky_checkout`. Hrefs, price and copy unchanged.

All three are now guarded in CI by `verify-systems-library.yml`, once in the committed
markup and once against the live pages after deploy.

## 4. Attribution — measured, not asserted

Reproduced locally against a static server with Chromium, `sendBeacon` intercepted and
all external egress blocked, so nothing was sent to PostHog.

Syndicated entry (reader arrives on the tracked link from an external platform):

```
/systems/?utm_source=owned_media&utm_medium=blog
         &utm_campaign=international_personal_media
         &utm_content=repeat-visit-sites-win-owner-package:structural_reflection
  -> primary_cta_click  cta_id=systems_card_ai-workflow-operator-bundle
  -> /prompt-store/
  -> checkout_click     product=workflow_operator_bundle
                        cta_id=prompt_store_offer_checkout
                        destination_host=buy.stripe.com
                        first_landing_path=/systems/
                        first_utm_source=owned_media  first_utm_medium=blog
                        utm_campaign=international_personal_media
                        utm_content=repeat-visit-sites-win-owner-package:structural_reflection
```

On-site entry (reader lands on the published article first) resolves differently and
correctly: first touch stays the article, so `checkout_click` carries
`first_landing_path=/signal/auto/the-durability-of-the-dashboard-...html` and
`first_utm_source=direct`. The article is still attributable at checkout, by landing
path rather than by campaign. This is first-touch behaviour working as designed, not a
defect: the internal CTA's UTMs deliberately do not overwrite a real acquisition source.

Attribution ended at `buy.stripe.com` when this was written. It no longer does — see §10.
No purchase is inferred from `checkout_click` either way.

## 5. Delivery

`worker/prompt-store-worker.js` requires, before issuing any access:
`payment_status === 'paid'`, `mode === 'payment'`, exactly one line item, the exact
price id, `amount_total === 1700`, currency `usd`, matching `payment_link`, and a
buyer email matching the checkout email. It then issues an HMAC-SHA-256 token with a
30-day expiry, and `/prompt-store/workspace` re-verifies the Stripe session on every
load. `STRIPE_SECRET_KEY` stays server-side; no secret reaches the client.

`deploy-ai-consultant-worker.yml` already smoke-tests this on every deploy:
`/prompt-store/workspace` must answer 401 unauthenticated, and an invalid login must
answer 400.

DELIVERY_CONFIGURATION_VERIFIED. DELIVERY_END_TO_END_VERIFIED remains NOT_VERIFIED —
it cannot be established without a real paid purchase, and none was made.

## 6. Acquisition connection

`acquisition/asset-inventory.json` did not contain the Systems Library or the $17
bundle, so the acquisition engine could not route to either. Both added, validated by
the existing inventory schema tests. Neither claims `HTTP_VERIFIED`: both are recorded
`REPO_AND_SITEMAP` with an explicit note that the live check happens in Actions.

The Revenue Publisher is WORKING and free-only: it ran at 2026-08-29T03:35Z on
Cloudflare Workers AI and produced a READY article at quality 100.

It had, however, published that article with **no CTA and no revenue destination** —
`existing_product_routes` was empty for its source. Fixed:

- `acquisition/media-engine/sources.json`: the source now routes to the Systems Library
  (PRIMARY) and the operator bundle (PURCHASE_PATH). The routes match what the source
  actually argues — durable properties come from repeatable structure rather than
  output volume — and assert nothing the source does not.
- `acquisition/blogger/owned-publisher.mjs`: a published record whose CTA is decided
  after publication is now re-rendered in place, same canonical URL, same publication
  history, page body only. Without it an article that went out with no revenue
  destination keeps none for ever. The pass is idempotent: a second run re-renders
  nothing.

No AI provider was called to do this. No paid API was enabled.

## 7. Not done, and why

- No purchase, test or live. That is a human authority boundary.
- No new product, brand, storefront, payment account or homepage change.
- The three packaged systems stay free and MIT. The repository is public and MIT, so
  the source is already MIT to everyone; a restrictive tier over it would not be
  enforceable. Whether a dual-licensed paid edition of *future* versions is possible is
  a question for professional legal review, not something to assert here.

## 8. The next revenue bottleneck

Not traffic, and not catalogue size. `revenue-os/metrics.json` records
`downstream_events_last_30d.checkout_click: 17` against
`stripe_live_payment_intents: 0`. Seventeen people reached a Stripe checkout in thirty
days and none of them paid.

That is a checkout-completion problem, and it sits after every part of the path this
work measured. It should be diagnosed from the Stripe dashboard — abandoned sessions,
payment-method failures, currency or country blocks — before any further acquisition
work. Sending more traffic into it would not change the outcome.

## 9. Collision with a parallel session, resolved by merge rather than by choosing

While this work was in flight, `main` gained five commits from another session,
including `78fb26d Publish Stratum Praxis Systems Library` — a second, hand-written
`/systems/index.html` on the same route, acting as a storefront for a newly shipped
Cross-Agent Operating Kit ($69 / $149 / $299) plus the prompt store.

Both pages claim one URL, so one of them had to give. Neither was discarded:

- The generated, manifest-driven library is kept, because it carries the drift check,
  the three package pages, the licence, docs and changelog routes, and 48 tests. A
  hand-written page would have left the other six `/systems/` routes 404 against the
  sitemap this work publishes.
- Everything the other session was selling is kept, by adding it to
  `systems/manifest.json` as external paid entries: the Cross-Agent Operating Kit at
  its entry tier, and the AI Operations Systems Pack. Both now render as measurable
  cards, and both were added to `acquisition/asset-inventory.json`.

Their own files — `cross-agent-operating-kit.html`, its access page, the worker and
the deploy workflow — are untouched. The set of `buy.stripe.com` URLs across the site
is byte-identical to `main`: nothing was added, removed or repointed.

Two further findings from that commit, both the same class of defect this work already
fixed once:

1. `cross-agent-operating-kit.html` was not in `sitemap.xml`. A just-shipped $69–$299
   product had no organic discovery path. Added.
2. That page's `/systems/` card linked `/prompt-store/ops10/`, which has no page —
   the worker serves only `/prompt-store/ops10/login` and `/prompt-store/ops10/workspace`
   under that path. The manifest routes it to `/prompt-store/operations-10.html`, the
   real sales page, which was also missing from the sitemap and is now in it.

The CI attribution guard is now driven from the manifest rather than a hardcoded id,
so a product added later cannot skip it.

**This resolution is the one judgement call in this work that an owner should confirm**,
because it changes what a visitor sees at `/systems/`. The commercial content is a
superset of what the other session shipped; the presentation is the generated one.

## 10. The Stripe boundary was bridged by parallel work, after §4 was written

`main` gained three more commits during this work, one of them
`534b95b Close Vector to Stripe revenue attribution loop`. It changes
`scos-analytics.js` to decorate every `buy.stripe.com` link at render and again at
pointerdown, setting `client_reference_id` plus the four UTM parameters on the
outbound checkout URL.

That supersedes the limitation recorded in §4. The correction matters, so it is stated
plainly rather than left to be inferred: **client-side attribution no longer stops at
the Stripe domain.** A payment can now be joined back to the session that produced it
through `client_reference_id`, which Stripe stores on the Checkout Session.

Re-verified in a browser after merging, on the full path from a syndicated entry:

```
/systems/?utm_source=owned_media&utm_medium=blog&utm_campaign=international_personal_media
  -> primary_cta_click   cta_id=systems_card_ai-workflow-operator-bundle
  -> /prompt-store/
  -> checkout_click      product=workflow_operator_bundle
                         cta_id=prompt_store_offer_checkout
                         first_landing_path=/systems/  first_utm_source=owned_media
  -> outbound URL        buy.stripe.com/cNicN60gs9rd1K85JF6Zy0P
       client_reference_id=prompt_store_owned_media_international_personal_media_
                           repeat-visit-sites-win-owner-package_structural_reflection
       utm_source=owned_media  utm_medium=blog
       utm_campaign=international_personal_media
       utm_content=repeat-visit-sites-win-owner-package:structural_reflection
```

The two pieces of work compose rather than collide. That commit bridges the boundary;
this one supplies a `/systems/` route worth attributing and the stable `cta_id` that
keeps the pre-checkout hops distinguishable. Neither is sufficient alone.

What is still NOT established: no purchase has occurred, so no `client_reference_id`
has ever been observed on a real Stripe payment. `verified_revenue` remains null and
`stripe_live_payment_intents` remains 0. The mechanism is verified; the revenue is not.

After the merge: 326 acquisition tests pass (310 plus 16 from the new work), 48 package
tests pass, build drift clean, and the manifest-driven attribution guard passes.

