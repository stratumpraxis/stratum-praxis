# Systems Library MVP

Date: 2026-08-29
Branch: `claude/stratum-systems-library-mvp-1jzxit`
Status: implemented; live verification deferred to GitHub Actions

## Bottleneck addressed

Per `AGENTS.md`, the current revenue priority is the first verified purchase and better
measurement between qualified traffic and completed payment. This work does not add a new
offer to chase that. It does two things:

1. It gives the developer-shaped audience a real entry point (`/systems/`) that routes into
   an existing paid product rather than into another landing page.
2. It closes a measurement gap: the route from an external tagged link, through the library,
   to `checkout_click` on the existing Stripe destination is now verifiable end to end.

Target metric: qualified visits to `/systems/` → `primary_cta_click` → `checkout_click` on
`buy.stripe.com` for `workflow_operator_bundle`. No new revenue is claimed.

## What shipped

Routes (all generated from `systems/manifest.json` by `systems/build.mjs`):

- `/systems/`
- `/systems/products/truth-gate/`
- `/systems/products/duplicate-guard/`
- `/systems/products/attribution-contract/`
- `/systems/licenses/`
- `/systems/docs/`
- `/systems/changelog/`

Packages (clean-room, MIT, zero dependencies, Node 18+):

| Package | Extracted from | Tests |
| --- | --- | --- |
| `systems/packages/truth-gate` | `acquisition/media-engine/lib/truth-gate.mjs`, `identity.mjs` | 14 pass |
| `systems/packages/duplicate-guard` | `acquisition/media-engine/lib/duplication.mjs`, `signal-intelligence/lib/fingerprint.mjs`, `lib/util.mjs`, `lib/utm.mjs` | 16 pass |
| `systems/packages/attribution-contract` | `acquisition/lib/utm.mjs`, `taxonomy.mjs`, `util.mjs` | 18 pass |

Paid entry: the existing `/prompt-store/` AI Workflow Operator Bundle, listed and linked.
Its page, price ($17), Stripe checkout and buyer-verification delivery were **not** created,
changed or duplicated.

## The licensing finding — needs an owner decision

The repository root `LICENSE` is MIT and the repository is public. Every file in it is
already MIT-licensed to everyone who can read it. A PERSONAL / COMMERCIAL / AGENCY licence
ladder over code extracted from it would not be enforceable on the published versions and
would not be honest to sell.

The three packages therefore ship MIT and free, and `/systems/licenses/` states the reason
plainly rather than implying generosity.

**Open decision, flagged for professional legal review:** whether to dual-licence *future*
versions of this code — a restrictive edition alongside the MIT history — so a paid tier
becomes possible. That is a legal and commercial decision for the owner. Nothing in this
work assumes an answer, and `LICENSE` was not modified.

## Selection and rejection

Ten internal assets were audited; the full evidence is in `systems/inventory.json`.

- SHIP_NOW: `truth-gate`, `duplicate-guard`, `attribution-contract`, `ai-workflow-operator-bundle`
- DEFER: `publisher-gate` (four-file policy coupling), `signal-intelligence` (inseparable from a populated asset inventory)
- NEEDS_HUMAN_REVIEW: `revenue-publisher` (selling a publisher that calls a third-party AI API puts the buyer's cost and ToS position on the seller)
- REJECT: `github-actions-starter` (would be new writing presented as an extraction), `prompt-pack` (duplicate of the already-live bundle)
- INTERNAL_ONLY: `scos-analytics.js` (live measurement layer; reused unchanged)

No demand evidence exists for any of the three packaged systems. Selection was made on
extraction safety, problem clarity and delivery readiness, not on measured demand. That is
recorded here so it is not later mistaken for validation.

## Defects found in the internal originals

Found while extracting, fixed in the packages only. The originals were **not** edited,
because `acquisition/media-engine/` overlaps with active branches and PR #54.

1. `truth-gate.mjs` — Spanish patterns ending in an accented vowel (`prob[ée]`, `compr[ée]`,
   `visit[ée]`, `constru[ií]`, `fund[ée]`) end with `\b`. JavaScript's `\b` is ASCII-based,
   so it does not match after `é`. "Ya lo probé durante una semana" passes the gate today.
   Fixed in the package with a Unicode-aware boundary.
2. `truth-gate.mjs` — the client-work pattern matches `my client` but not `my clients`.
3. `duplication.mjs` — `crossLanguageAnchorOverlap` counts sentence-initial capitalised
   words as proper nouns. Language-specific noise ("Small", "Los") dilutes the Jaccard
   overlap enough that a literal translation can score below the 0.8 threshold.

Recommended: port 1 and 2 into `acquisition/media-engine/lib/truth-gate.mjs` once the
branches touching that directory have merged. Item 3 is a tuning judgement, not a bug.

## Measurement — what was actually verified

Verified locally with a headless browser against the built pages, with the analytics
endpoint stubbed:

- `/systems/products/truth-gate/` emits `funnel_view` and `traffic_session_start` carrying
  `funnel`, `landing_path` and all four UTM dimensions.
- Its primary CTA emits `primary_cta_click` with `product=systems_truth_gate` and
  `cta_id=systems_truth_gate_download`.
- Landing on `/systems/` from a tagged link, following the paid card to `/prompt-store/`
  and clicking the buy CTA emits `checkout_click` with `product=workflow_operator_bundle`,
  `destination_host=buy.stripe.com`, and `first_landing_path=/systems/` preserved.

Boundary, recorded rather than papered over: once the visitor reaches `buy.stripe.com`,
client-side attribution stops. The Stripe payment record is the only place a purchase can
be tied back, and that mapping is not automated here. Revenue is never inferred from a
`checkout_click`.

Second boundary: `/prompt-store/` has no `data-analytics-id` on its CTA, so `cta_id` falls
back to the link text. That page was left untouched on purpose. Adding an explicit
`data-analytics-id` there is a one-line, reversible improvement for a later pass.

## Not verified from this session

Outbound HTTPS to `stratumpraxis.com`, `gumroad.com` and `payhip.com` is refused by the
network egress policy (403 on CONNECT). No live URL, live checkout page or live delivery
route could be fetched. `.github/workflows/verify-systems-library.yml` performs that
verification from Actions, which has egress, and keeps route / delivery / checkout-route
states separate. It never attempts a purchase.

## Zero-cost boundary

No paid API, no new hosting, no database, no new subscription, no new account. The packages
have no dependencies. The verification workflow is plain `curl` and `node --test` on the
existing free Actions allowance.

## Stop rule

Scope ends here: routes live, three real packages, one real paid checkout route reused,
documentation and licensing published, attribution connected, secrets scanned. No further
free tools, no additional products, no redesign.
