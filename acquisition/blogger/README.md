# Autonomous Revenue Publisher

The unattended generation lane. It selects one revenue opportunity, produces at most one
English article per run, gates it, and hands a READY artifact to the owned-site publisher.

## Flow

```
revenue vertical + promoted candidate      acquisition/revenue-verticals.json, signal-intelligence
  -> one source, chosen by opportunity     lib/vertical.mjs (selectOpportunity)
  -> draft -> critic -> deepen -> final    free-runner.mjs, free Workers AI only
  -> truth / privacy / lens / source gate  media-engine/lib/truth-gate.mjs
  -> duplication + cannibalization gate    media-engine/lib/duplication.mjs
  -> CTA route verification                lib/cta-gate.mjs
  -> editorial quality v2                  lib/editorial-quality.mjs
  -> READY or DRAFT -> outbox/             owned-publisher.mjs -> signal/auto/
```

## Zero paid AI API cost

This is a hard policy, not a default. `free-runner.mjs` calls exactly one endpoint,
`api.cloudflare.com`, with a model from a fixed allowlist of free Workers AI models. There
is no paid fallback, no third-party gateway, no automatic upgrade, and no code path that
reads a billable provider's credential. A 429 or 403 raises `FREE_TIER_STOP` and the run
ends; free quota exhaustion is a stop, never an escalation.

The v1 `runner.mjs`, which called the OpenAI Responses API, was removed rather than left
unreferenced in the tree: an unused paid lane is still a paid lane. `paid_credentials_present`
is reported in every artifact so an operator can see that the policy held even when a paid
key happened to exist in the environment.

`acquisition/blogger/test/publication-policy.test.mjs` holds all of this.

## Choosing what to write

`acquisition/revenue-verticals.json` declares each revenue theme: buyer problem, eligible
evidence families, audience, the verified existing asset the CTA must reach, freshness and
evidence minimums, and prohibited claims. `lib/vertical.mjs` scores every eligible theme on

```
demand strength x purchase intent x existing asset fit x freshness x measurement quality
--------------------------------------------------------------------------------------
                             operational burden
```

and returns exactly one winner. Adding a revenue theme is a record in that file plus
evidence in `acquisition/signal-intelligence/signals.json`; it is not a code change.
Article count is never the objective.

## The quality model

`lib/editorial-quality.mjs` replaces the v1 model, which started at 100 and subtracted
penalties for a short phrase list - so polished, provenance-free, framework-heavy prose
scored 100. The v2 model is additive over fifteen weighted dimensions, and separates two
kinds of failure:

**Critical failures override the aggregate entirely.** A specific number that does not
appear in the recorded source material, invented human texture (a remembered email, a
habitual routine, a client situation, an outcome written as if it happened), a restricted
source claim, a truth-gate violation, an unverified CTA route, a generic CTA, or a
duplicate. Any one of these caps the reported score at 49 and sets `publishable: false`.

**Ceilings limit a clean but thin article.** No non-obvious decision rule, tradeoff or
boundary condition caps at 79. A source figure used without visible attribution caps at 88.
Template structure caps at 85, uniform cadence at 87, illustrative figures at 92.

Bands: `90+` strong, `82-89` READY only if every critical gate also passes, `<82` revise.
100 requires all fifteen dimensions at 10 and is expected to be very rare.

## Gates that actually run

`lib/gates.mjs` executes the authoritative media-engine truth gate and duplication gate on
the generated article, plus the CTA gate and the quality model, and records which gates
ran in the artifact. The published disclosure is derived from that list, so it names only
controls the runtime executed.

## Publishing boundary

READY is not PUBLISHED. `owned-publisher.mjs` writes the page under `signal/auto/` and
records `PUBLISH_REQUESTED`. `VERIFIED` is assigned only after an independent HTTP read of
the canonical URL returns OK. A source is marked processed only once a READY artifact
exists; a DRAFT stays eligible for a later retry.

The source register is immutable and the historical acquisition, distribution, trend-video
and revenue ledgers are never written by this lane.
