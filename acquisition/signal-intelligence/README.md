# Acquisition Signal Intelligence (Issue #53)

**Purpose:** improve the eyes and ears of the Acquisition Intelligence Engine. This is an
upstream companion module, not a second brain. It decides whether a *market thesis* is
corroborated well enough to become a `SOURCE_CANDIDATE` at all; the existing engine still
owns routing, attribution, queueing, safety, the ledger and winner classification.

Dependency-free, file-based, offline. It reads from the repository and writes to exactly
one file: `candidates.json`.

## The loop

```
evidence records (signals.json)
  -> validated + fingerprinted + deduped        lib/normalize.mjs, lib/fingerprint.mjs
  -> classified into DEMAND / PAIN / MONEY      lib/bucket.mjs
  -> independent corroboration, 2-Signal Rule   lib/corroborate.mjs
  -> Revenue Signal Score 0-100                 lib/revenue-score.mjs
  -> VERIFIED existing-asset fit (mandatory)    lib/asset-fit.mjs -> acquisition/lib/router.mjs
  -> SOURCE_CANDIDATE handed to Issue #52       lib/source-candidate.mjs
  -> ranked with an exploration guard           lib/feedback.mjs -> acquisition/lib/winner.mjs
```

## What it reuses rather than reimplements

| Existing system | How this module uses it |
| --- | --- |
| `acquisition/lib/router.mjs` | the **only** asset router. `asset-fit.mjs` calls `routeDemand()` and uses the same `ROUTE_FLOOR`, so this layer can never promote a candidate the router would refuse. |
| `acquisition/asset-inventory.json` | the only source of verified assets. Nothing here adds an asset. |
| `acquisition/lib/winner.mjs` | the only source of `SCALE` / `ITERATE` / `STOP` / `INSUFFICIENT_DATA`. `feedback.mjs` converts verdicts into a ranking prior; it never invents one. |
| `acquisition/lib/safety.mjs` | `BLOCKED_CLAIM_PATTERNS` become part of every candidate's `prohibited_claims`. |
| `acquisition/lib/taxonomy.mjs` | `EVIDENCE_CLASSES` (`OBSERVED` / `ASSUMPTION` / `HYPOTHESIS`) are the same three classes the existing scorer uses. |
| `acquisition/lib/signal-score.mjs` | the model shape - named dimensions, integer scores, fixed weights, an evidence class on each - is deliberately the same, so both scores are auditable the same way. |
| `distribution/provider-policy.json`, `distribution/source-routing.json` | read-only, through the existing router. Never written. |

## The three rules that do the work

**1. The 2-Signal Rule.** Automatic promotion requires at least two `OBSERVED`,
non-expired, mutually independent signals from at least two independence groups, at least
one of which is external. Independence is refused when two records share an origin key (a
declared repost or the same canonical reference), are textual near-duplicates above the
policy threshold (an undeclared repost), or sit in the same independence group - which is
why Google Trends plus YouTube trends on one event is weak corroboration by design.
`ASSUMPTION` and `HYPOTHESIS` records are carried and reported because they legitimately
raise research priority, and they never enter this calculation.

**2. Four score dimensions are derived, not asserted.** `evidence_independence`,
`evidence_quality` and `freshness` are computed from the corroboration result, and
`existing_product_fit` from the asset-fit gate. Whatever a thesis claims for itself in
those four is overwritten, and the overwrite is reported in `overridden_dimensions`. A
thesis cannot score its own homework.

**3. Owned money evidence is never external consensus.** Owned CTA and checkout behaviour
is strong evidence of internal fit. `moneyEvidenceProfile()` reports
`external_consensus: false` for it, the candidate record carries that flag verbatim, and
`EXTERNAL_CONSENSUS` lands in `prohibited_claims`.

## Promotion

All four must hold, in this order:

1. the 2-Signal Rule is satisfied by independent `OBSERVED` evidence
2. the Revenue Signal Score bands at 70 or above (`<50` reject, `50-69` watch, `70-84`
   candidate, `85-100` high priority) after the evidence adjustment
3. a **verified** existing asset clears the fit gate
4. bucket coverage supports the band claimed - three buckets are required before
   `HIGH_PRIORITY_SOURCE_CANDIDATE` may be used

No fit means `WATCH_NO_ASSET_FIT`, `RESEARCH_GAP`, or - only with strong corroboration
*and* a score at 85 or above - `NEW_PRODUCT_RECOMMENDATION`. Even then nothing is built:
`product_created` is `false` on every record and `validateCandidate()` rejects a record
that says otherwise.

## Files

```
acquisition/signal-intelligence/
  policy.json        evidence families, corroboration rules, bands, gates, exploration guard
  providers.json     the honest connection register (see below)
  signals.json       evidence records and the theses they support
  candidates.json    the candidate store, append-only history per candidate
  lib/               normalize, fingerprint, bucket, corroborate, revenue-score,
                     asset-fit, source-candidate, feedback, pipeline
  cli/               ingest, rank, promote, report
  test/              50 tests
```

## Commands

```bash
node acquisition/signal-intelligence/cli/ingest.mjs      # validate and dedupe the evidence set
node acquisition/signal-intelligence/cli/rank.mjs        # corroborate, score, fit and rank
node acquisition/signal-intelligence/cli/promote.mjs     # dry run; --write persists candidates.json
node acquisition/signal-intelligence/cli/report.mjs      # the evidence report
node --test 'acquisition/signal-intelligence/test/*.test.mjs'
```

Every CLI takes `--json`. `promote.mjs --write` is the only write path in the module, and
it writes only `candidates.json`.

## Providers: connected vs contract-only

`providers.json` is the register, and no code in this module changes a
`connection_state`. `normalize.mjs` refuses `OBSERVED` evidence from a `CONTRACT_ONLY`
provider, so an unconnected provider cannot quietly become a source of evidence.

- `REPOSITORY_EVIDENCE` - `repository_records`, `owner_source_material`. Readable offline
  today; these are the only providers currently supplying evidence.
- `MANUAL_EVIDENCE_ONLY` - `posthog`, `stripe`, `payhip`, `gumroad`. Real accounts exist
  on the owner side, this repository has no connection to them, and evidence arrives only
  when the owner records it into a repository file.
- `CONTRACT_ONLY` - `reddit`, `product_hunt`, `google_trends`, `youtube_search_trends`,
  `software_reviews`, `question_demand`, `competitor_pricing_pages`, `hacker_news`. The
  contract is implemented and tested; each supplies **zero** evidence records today.

## Adding evidence

1. Add a record to `signals.json` with every required field, an honest `evidence_class`,
   and a `url_or_reference` naming exactly where it was read. `OBSERVED` without a
   reference is refused.
2. If it is a repost, mirror or syndication of something already recorded, give it the
   same `shared_origin_key`. The near-duplicate check catches most undeclared ones, but
   declaring it is the honest path.
3. `node acquisition/signal-intelligence/cli/rank.mjs` and read the corroboration section
   before the score. A rising score with unchanged corroboration is not progress.
