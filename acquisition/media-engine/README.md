# International Personal Media Engine (Issue #52)

**Purpose:** turn approved source material and promoted Issue #53 candidates into
international, differentiated, attributable media - without creating a second content
department and without creating a single fictional person.

The durable model is:

```
ONE real operator -> language desks -> editorial lenses -> authorized channels -> measurable routes
```

It lives under `acquisition/` deliberately. This is a distribution and editorial companion
to the Acquisition Intelligence Engine, not a competing top-level engine: it consumes that
engine's inventory, router, UTM builder, safety patterns, queue-state vocabulary, ledger
guards and winner logic by direct import.

## There is one identity

`identity.json` describes `jp_independent_freelancer`: a Japan-based independent freelancer
publishing internationally. It is the real operator of this repository, described at a
deliberately broad, privacy-preserving level. It is not a character.

`lib/identity.mjs` refuses to load a contract whose `identity_id` is anything else, whose
`is_fictional` is not `false`, or which contains an identity list. There is no code path in
this repository that creates an identity, a persona, or an account.

## Desks and lenses

| Desk | State | Why |
| --- | --- | --- |
| `en_desk` | `ACTIVE` | every verified revenue asset that this desk would route to is English |
| `es_desk` | `TEST` | first-class contract, held at TEST until a localization QA pass is signed off and a channel exists whose provider policy permits Spanish publishing. Neither is true today. |

Four lenses, all `ACTIVE`: `japan_reality`, `independent_builder`, `practical_operator`,
`structural_reflection`. A lens is an editorial contract - an angle the one identity may
take. It has no biography and is never presented as a separate author.

**No Cartesian product.** A source does not generate every desk x lens combination.
`lib/derive.mjs` scores nine factors (audience fit, evidence fit, revenue fit, localization
feasibility, truth risk, policy risk, duplicate risk, freshness, operational burden) and
takes at most `max_outputs_per_source` from the eligible set. Five conditions are
disqualifying at any score: the lens does not accept the source type, it cannot use any of
the evidence families, Issue #53 excluded it, no bound channel carries its desk, or the
desk x lens combination is inside a `STOP` cooldown.

## The gates

Every derivation passes all of these or it does not advance.

**Truth gate** (`lib/truth-gate.mjs`). Thirteen first-person claim families - testing,
purchase, habitual use, client work, customers and revenue, residence history, employment,
credentials, age, travel, testimonials, claimed authority, private sources - each mapped to
a `claim_id` in the identity contract. A match is a violation unless that claim is
explicitly approved, and every violation names the safe rewrite. English and Spanish
patterns sit side by side: a fabrication blocked on the English desk must not survive by
being written in Spanish. Country-level location is approved; a city, ward or neighbourhood
is not. The same pass runs the privacy gate (credentials, addresses, phone numbers,
coordinates, financial details, and any email not on the public allowlist) and the
lens-specific rules, including the `japan_reality` bar on unsupported national
generalisation.

**Localization gate** (`lib/localize.mjs`). The Spanish desk is not a translation lane.
Four independent checks: the text is actually in the target language; it is not
sentence-for-sentence aligned with its English sibling (numbers and proper nouns survive
translation, so positional anchor overlap detects a literal rendering); at least five of
eight elements were genuinely adapted - framing, hook, terminology, examples, assumptions,
currency context, CTA wording, cultural context; and the CTA states plainly when the
destination is English-only, because implying Spanish-language delivery that does not exist
is a blocking failure.

**Duplication gate** (`lib/duplication.mjs`). Source echo, sentence-level copy-spin within
one language, literal EN/ES duplicates, repeated titles and hooks, reused structure with
words swapped, the same source to the same channel inside a cooldown, and the same
audience + CTA + destination inside a cooldown. Different language alone is not
differentiation.

**Provider gate** (`lib/publisher-gate.mjs`). `distribution/provider-policy.json` stays
authoritative and is never written here. `AUTO_PUBLISH_ALLOWED` requires all nine
conditions the issue lists to be individually proven. Anything less produces
`HUMAN_REVIEW_REQUIRED`, `HUMAN_PUBLISH_REQUIRED` or `BLOCKED`.

**Publish proof.** `DRAFT -> READY -> PUBLISH_REQUESTED -> PUBLISHED -> VERIFIED`, each
rung requiring its own evidence. `PUBLISH_REQUESTED` is not `PUBLISHED`: that needs an
external post id, a published timestamp and an account id. `PUBLISHED` is not `VERIFIED`:
that needs a canonical URL and an independent status read that actually verified. Each rung
maps onto an existing `acquisition/lib/taxonomy.mjs` queue state, so this is one state
machine expressed in the issue's vocabulary rather than a second one.

## Current channel state

No channel currently reaches `AUTO_PUBLISH_ALLOWED`, and that is the correct outcome rather
than a gap to work around.

| Lane | Routes |
| --- | --- |
| `AUTO_PUBLISH_ALLOWED` | none |
| `HUMAN_REVIEW_REQUIRED` | none |
| `HUMAN_PUBLISH_REQUIRED` | `devto:en_desk`, `bluesky:en_desk`, `bluesky:es_desk`, `threads:en_desk`, `threads:es_desk` |
| `BLOCKED` | `devto:es_desk` (desk not carried), `note:en_desk`, `note:es_desk` (Japanese-only, manual lane) |

Instagram, TikTok, YouTube, Pinterest and LINE are deliberately out of scope: the existing
image and video lanes already own them, and one channel gets one owning lane.

## Attribution

Not a second measurement system. UTM values come from `distribution/source-routing.json`
through `acquisition/lib/utm.mjs`, exactly as the acquisition queue builds them. The media
dimensions are packed into `utm_content`, because `scos-analytics.js` and the existing
ledger already read that parameter and would silently drop anything new. The full chain is
verified on every check:

```
candidate -> identity -> desk -> lens -> channel -> campaign -> CTA -> asset
```

`attachMeasurement()` refuses to attach a purchase or revenue figure without a
payment-provider evidence reference, mirroring the guard in `acquisition/lib/ledger.mjs`.

## Winner feedback

`classifyDeskLens()` calls `acquisition/lib/winner.mjs` unchanged. Views or followers alone
never trigger `SCALE`, and a purchase without payment evidence is ignored. A winning desk x
lens combination may receive higher routing priority, a dedicated site section, a dedicated
publication name or a dedicated authorized channel. It never becomes a new person:
`new_persona_created` is `false` and there is no code path that could set it otherwise.

## Files

```
acquisition/media-engine/
  identity.json      the single identity truth contract
  desks.json         en_desk (ACTIVE), es_desk (TEST)
  lenses.json        four editorial lens contracts and the derivation rule
  channels.json      bindings onto channels that already exist in distribution/source-routing.json
  sources.json       the source register; sources are immutable for provenance
  derivations.json   the derivation queue and its publish-proof ladder
  lib/               identity, source, truth-gate, localize, duplication,
                     publisher-gate, attribution, derive, context
  cli/               ingest-source, derive, queue-check, publish-check, report
  test/              80 tests
```

## Commands

```bash
node acquisition/media-engine/cli/ingest-source.mjs   # validate sources and their hashes
node acquisition/media-engine/cli/derive.mjs          # which desk x lens to produce next
node acquisition/media-engine/cli/queue-check.mjs     # run every gate over every derivation
node acquisition/media-engine/cli/publish-check.mjs   # audit the publish-proof ladder
node acquisition/media-engine/cli/report.mjs          # identity, desks, lenses, lanes, winner
node --test 'acquisition/media-engine/test/*.test.mjs'
```

Every CLI takes `--json`, and every one of them is read-only. This module writes no file at
all - it validates and reports.

## Note on the derivation plan

`derive.mjs` currently proposes `en_desk / independent_builder` and
`en_desk / structural_reflection` for the shadow-AI candidate rather than the
`practical_operator` pair already in `derivations.json`. That is the duplicate-risk factor
working: the two shipped outputs already occupy `practical_operator`, so the planner
proposes what has not been made yet.

## One-time owner actions before anything can publish

1. **DEV**: connect the account and configure the RSS import from
   `https://stratumpraxis.com/feed.xml` with canonical URLs pointing at
   `stratumpraxis.com`, then record the account id and the platform's current AI-content
   position in `channels.json`.
2. **Bluesky** (the only bound channel that could carry the Spanish desk): nominate or
   connect an account and assign a single owning publisher under the single-publisher rule
   in `distribution/provider-policy.json`.
3. **Spanish desk**: sign off a localization QA pass before `es_desk` moves off `TEST`.

No account is created by this engine, and none should be created merely to make the
architecture look complete.
