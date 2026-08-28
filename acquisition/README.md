# Acquisition Intelligence Engine

**Purpose:** turn the existing Stratum Praxis asset base into a measurable, safe, repeatable
acquisition system. The bottleneck this addresses is *qualified traffic to already-live
revenue assets*, not product creation.

This is an operational system, not a platform. It is file-based, dependency-free, runs on
the Node already available in CI, and adds no service and no database.

## What it does NOT do

- It does not publish anything. Every publish path terminates at a human approval step or an
  existing publisher lane.
- It does not create products. The router's new-product gate stays closed whenever any
  inventory asset fits the demand.
- It does not generate engagement. There is no click, view, follow, or purchase simulation
  anywhere in this directory, and the ledger refuses to record a purchase without a
  payment-provider evidence reference.
- It does not replace anything that already works. See "What it reuses".

## The loop

```
demand signal
  -> scored (acquisition/lib/signal-score.mjs)
  -> routed to an existing verified asset (acquisition/lib/router.mjs)
  -> channels chosen per asset x audience x intent (acquisition/lib/router.mjs)
  -> attribution attached (acquisition/lib/utm.mjs)
  -> queued as DRAFT (acquisition/distribution-queue.json)
  -> safety gate (acquisition/lib/safety.mjs)
  -> READY, waiting on a human approval decision
  -> [HUMAN] approve + publish through an existing lane
  -> PUBLISHED (external_post_id required)
  -> VERIFIED (an independent status read required)
  -> measured into the unified ledger (acquisition/lib/ledger.mjs)
  -> classified SCALE / ITERATE / STOP / INSUFFICIENT_DATA (acquisition/lib/winner.mjs)
```

## What it reuses

Nothing here is a parallel copy of an existing mechanism.

| Existing system | How this engine uses it |
| --- | --- |
| `distribution/source-routing.json` | the only source of `utm_source` / `utm_medium`. Channel names are validated against it; an undefined channel is refused, never invented. |
| `distribution/provider-policy.json` | the only authority on who may publish where. A platform with no `publishingEnabled` provider becomes `HUMAN_REQUIRED`. |
| `distribution/safety-audit.mjs`, `claude-bridge/validate-candidate.mjs` | their blocked-claim patterns, domain allowlist and UTM requirement are the base of `lib/safety.mjs`. |
| `trend-video-engine/publish-ledger.json` | adapted **read-only** into the unified ledger view. The video lane's file is never written by this engine, and a guard aborts the sync if it changes. |
| `scos-analytics.js`, `signal/analytics.js` | `lib/taxonomy.mjs` `ANALYTICS_EVENTS` is the deployed event list. An asset may not declare an event that no page emits. |
| `revenue-os/backlog.md` P0 rule | mechanically enforced by the cross-lane collision guard, which blocks a new payload while another lane still has an in-flight run for the same destination or campaign. |
| `revenue-link-ledger.md`, `AGENTS.md` | the inventory's evidence trail. Every `revenue_destination` was read from a page's own markup or cited to one of these documents. |

## Files

```
acquisition/
  asset-inventory.json       PHASE 1  verified assets; UNKNOWN stays UNKNOWN
  demand-signals.json        PHASE 3  signals with per-dimension evidence classes
  distribution-queue.json    PHASE 8  the queue and its state contract
  distribution-ledger.json   PHASE 9  acquisition-owned ledger records (append-only)
  lib/
    taxonomy.mjs             frozen vocabularies derived from deployed systems
    util.mjs                 NOT_MEASURED vs 0 primitives, deterministic slugs
    inventory.mjs            PHASE 1  validation, routability, live-checkout test
    signal-score.mjs         PHASE 3  9 weighted dimensions, safety + measurement floors
    router.mjs               PHASE 2  asset routing; PHASE 4 channel selection
    utm.mjs                  PHASE 5  deterministic attribution
    safety.mjs               PHASE 11 safety gate + cross-lane collision guard
    queue.mjs                PHASE 8  state machine
    ledger.mjs               PHASE 9  unified ledger + trend-video adapter
    winner.mjs               PHASE 7  SCALE / ITERATE / STOP / INSUFFICIENT_DATA
  cli/
    verify-inventory.mjs     validate the inventory; --live records HTTP_VERIFIED
    route.mjs                score a signal, route it, emit a DRAFT queue item
    queue-check.mjs          validate the queue and run the safety gate
    ledger-sync.mjs          build the unified ledger view (read-only by default)
    daily-report.mjs         PHASE 10 the twelve-question report
  test/                      101 tests, including deliberately invalid fixtures
  reports/                   dated report output from `daily-report.mjs --write`
```

## Commands

```bash
# validate the inventory against the repository (offline; safe anywhere)
node acquisition/cli/verify-inventory.mjs

# record HTTP_VERIFIED states - run from CI, where the public site is reachable
node acquisition/cli/verify-inventory.mjs --live --write

# route every demand signal to an existing asset
node acquisition/cli/route.mjs --all
node acquisition/cli/route.mjs --signal shadow-ai-spend-accountability-2026-08 --json

# validate the queue and run the safety gate (report only)
node acquisition/cli/queue-check.mjs
node acquisition/cli/queue-check.mjs --apply     # persists DRAFT -> READY / ERROR

# unified distribution ledger across the acquisition and video lanes
node acquisition/cli/ledger-sync.mjs

# the daily acquisition report
node acquisition/cli/daily-report.mjs
node acquisition/cli/daily-report.mjs --write     # also writes acquisition/reports/

# tests
node --test 'acquisition/test/*.test.mjs'
```

## Evidence discipline

Three separations are enforced in code, not by convention:

1. **NOT_MEASURED is not 0.** `null` means no measurement exists. `0` means a measurement was
   taken and it was zero. `NOT_INSTRUMENTED` means the ledger has no column for that stage.
   `lib/util.mjs` `rate()` refuses to compute a rate from an unmeasured denominator.
2. **A hypothesis is not evidence.** Every scored dimension carries `OBSERVED`, `ASSUMPTION`
   or `HYPOTHESIS`. A signal whose weight is entirely hypothesis cannot reach `DISTRIBUTE`,
   and the report prints `claim_strength` next to every score.
3. **A request is not a result.** `PUBLISHED` requires an `external_post_id`. `VERIFIED`
   requires an independent status read with recorded evidence. `SCALE` requires either
   payment-provider evidence or measured CTA *and* checkout progression - views alone never
   produce `SCALE`.

## Approval and human boundaries

The queue can reach `READY` on its own. It cannot go further without
`approval_status: HUMAN_APPROVED`, which no code in this directory sets.

Marked `HUMAN_REQUIRED` today:

- **Approval of any queued item.** Every item ships as `PENDING_HUMAN`.
- **Creative production.** No image, video or copy asset is generated here.
- **DEV / Pinterest / Bluesky / Threads / LINE.** `distribution/provider-policy.json` has
  `publishingEnabled: false` for all of them; each needs a one-time owner authentication or
  connection step. This engine surfaces them and stops.
- **Live URL verification** when run outside CI, where outbound HTTPS to the public site may
  be blocked.
- **Payment evidence.** Only an owner-side Stripe / Payhip / Gumroad record can move a route
  to a purchase count.

## Adding a demand signal

1. Add an entry to `acquisition/demand-signals.json` with all nine dimensions scored and an
   honest `evidence` class on each. Cite `observed_basis` for anything marked `OBSERVED`.
2. `node acquisition/cli/route.mjs --signal <id>` - read the matched asset, the risks and the
   generated attribution.
3. If the route is sound, copy the printed `draft_queue_item` into
   `acquisition/distribution-queue.json`.
4. `node acquisition/cli/queue-check.mjs` - resolve every block before asking for approval.

## Adding an asset

Only add an asset you can verify. `verify-inventory.mjs` cross-checks the declared
`repo_file` against the filesystem and the `public_url` against `sitemap.xml`, and fails if
the declared `verification_state` claims more than can be proven. Read the
`revenue_destination` out of the page's own markup rather than from a document, and record
where you read it in `revenue_destination.evidence`.

## Companion modules

Two upstream/downstream companions live inside this directory. Neither is a parallel
engine: both import this engine's inventory, router, UTM builder, safety patterns, queue
vocabulary, ledger guards and winner logic rather than reimplementing them, and neither
writes any file this engine owns.

| Module | Issue | Job |
| --- | --- | --- |
| [`signal-intelligence/`](signal-intelligence/README.md) | #53 | upstream. Ingests multi-family market evidence, enforces independent corroboration and the 2-Signal Rule, scores a Revenue Signal Score, runs a mandatory verified existing-asset fit gate, and emits `SOURCE_CANDIDATE` records. |
| [`media-engine/`](media-engine/README.md) | #52 | downstream. Consumes promoted candidates and owner-approved sources under one truthful operator identity, derives EN/ES desk x lens outputs, and runs the truth, localization, duplication, provider-policy and publish-proof gates. |

```
market + owned evidence
  -> signal-intelligence  (corroboration, score, verified-asset fit)
  -> SOURCE_CANDIDATE
  -> media-engine         (identity, desk, lens, localization, truth, duplication)
  -> provider gate        -> distribution/provider-policy.json
  -> attribution          -> lib/utm.mjs, distribution/source-routing.json
  -> ledger + winner      -> lib/ledger.mjs, lib/winner.mjs
```

Neither module publishes anything, creates a product, creates an account, or creates an
identity. `signal-intelligence/cli/promote.mjs --write` is the only write path across both,
and it writes only `signal-intelligence/candidates.json`.
