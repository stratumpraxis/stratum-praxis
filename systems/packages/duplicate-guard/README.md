# Duplicate Guard

**Stop your own content from competing with itself.**

An automated publishing pipeline produces near-duplicates for reasons that all look
reasonable in isolation: the same source gets a second angle, an article gets translated,
a headline gets reused because it worked, two campaigns point at the same page. The
result is a catalogue that splits its own traffic, repeats itself to the same audience,
and looks thin to search engines.

Duplicate Guard is the check between your drafting step and your publisher. It compares a
draft against its source, its siblings, and everything already published, and it blocks
the ones that are duplication rather than differentiation.

- **Outcome:** no restated source, no reshuffled reprint, no literal translation posing
  as a second article, and no two live items competing for one audience with one CTA.
- **Intended user:** anyone running a multi-channel or multi-language content pipeline —
  content ops teams, SEO operators, newsletter and social schedulers, and engineers
  adding a guardrail to an LLM drafting step.
- **Not for:** detecting plagiarism of *other* people's work, or scoring content quality.
  It governs your catalogue against itself.

## Requirements

- Node.js 18 or newer.
- No dependencies, no build step, no network access, no telemetry.

## Supported platforms

Anywhere Node 18+ runs: macOS, Linux, Windows, Docker, GitHub Actions, GitLab CI, and
serverless runtimes supporting ES modules. The library performs no I/O; only the CLI
reads files.

## File structure

```
duplicate-guard/
├── README.md
├── LICENSE
├── CHANGELOG.md
├── package.json
├── src/
│   ├── duplicate-guard.mjs   the seven rules and the structure/anchor heuristics
│   ├── text.mjs              normalisation, shingles, Jaccard, lane key
│   └── cli.mjs               validation command, exits non-zero when blocked
├── examples/
│   ├── draft.example.json    a draft that duplicates the catalogue
│   ├── catalog.example.json  one previously published item
│   └── sample-output.txt     what the CLI prints for that pair
└── test/
    └── duplicate-guard.test.mjs   16 tests covering every rule and both edges
```

## Setup

1. Copy this directory into your project (for example `lib/duplicate-guard/`).
2. Give the guard your published catalogue — an array of the items you have already
   shipped, in the shape below. Most pipelines already have this list.
3. Call it before your publish step and fail closed on `ok: false`.

## Item shape

```js
{
  id: 'draft-2026-08-29',      // required, used to name the item a block is against
  title: '...', hook: '...', body: '...', cta_text: '...',
  language: 'en',              // any tag you like; equality is all that matters
  channel_id: 'newsletter',    // where it goes
  source_id: 'src-1',          // what it came from
  target_asset: 'checklist',   // where the CTA sends the reader
  campaign: 'tool-sprawl',
  cta_id: 'checklist_cta',
  audience: ['founder'],
  published_at: '2026-08-27T09:00:00Z'   // or created_at
}
```

## Configuration example

Every threshold is overridable per call. These are the defaults:

```js
checkDuplication(draft, {
  published,
  source: { excerpt: '...' },
  now: Date.now(),
  thresholds: {
    copy_spin: 0.55,                        // same language, shingle overlap
    source_echo: 0.45,                      // draft vs its own source excerpt
    title_similarity: 0.6,
    structure_similarity: 0.85,             // heading + rhythm match
    cross_language_anchor: 0.8,             // shared numbers and proper nouns
    same_source_channel_cooldown_days: 14,
    same_audience_cta_cooldown_days: 7
  }
});
```

## Usage

```js
import { checkDuplication } from './src/duplicate-guard.mjs';

const result = checkDuplication(draft, { published, source });

for (const warning of result.warnings) log.warn(warning.rule, warning.detail);
if (!result.ok) {
  // Do not publish. Each block carries { rule, against, detail } plus its score.
  throw new Error(result.blocks.map((b) => `${b.rule}: ${b.detail}`).join('\n'));
}
```

## Validation command

```
npm test                 # 16 tests
npm run check            # runs the guard over the deliberately duplicated sample
node src/cli.mjs --draft draft.json --catalog catalog.json [--source source.json]
```

Exit codes: `0` clean, `1` blocked, `2` bad usage. Warnings are printed but never fail
the run.

## Sample input and output

`examples/draft.example.json` is a draft that reuses a headline, restates a published
article and targets the same audience with the same CTA two days later.
`examples/sample-output.txt` is the exact CLI output: one structural warning and three
blocks.

## The rules

| Rule | Blocks when |
| --- | --- |
| `SOURCE_ECHO` | the draft is mostly its own source restated rather than transformed |
| `COPY_SPIN` | same language, high shingle overlap with an existing item |
| `CROSS_LANGUAGE_DUPLICATE` | shared numbers and proper nouns *and* an identical structure — a literal translation |
| `REPEATED_TITLE` / `REPEATED_HOOK` | the headline or opening is identical or near-identical |
| `SAME_SOURCE_SAME_CHANNEL_COOLDOWN` | this source already went to this channel inside the cooldown |
| `SAME_AUDIENCE_CTA_COOLDOWN` | same audience, CTA and destination as a recent item — cannibalization |
| `STRUCTURE_REUSE` *(warning)* | same skeleton, different words: worth a human look, not a block |

A missing publish date is treated as *inside* the cooldown. Unknown recency is not
evidence of age.

## Known limitations

- **Lexical, not semantic.** Shingle overlap catches reworded copy, not a genuinely
  rewritten article that makes the same argument. Two texts with no shared vocabulary
  and one idea will pass.
- **Cross-language detection needs anchors.** It relies on numbers and proper nouns
  surviving translation. A translated piece with no figures and no names will not be
  detected as one, and text in a script without capitalisation (Japanese, Chinese,
  Arabic, Thai) yields no proper-noun anchors at all — only numbers.
- **`language` is compared by equality.** `en` and `en-US` are treated as different
  languages; normalise your tags before calling.
- **O(n) per published item.** Comparing against a very large catalogue on every draft
  gets slow; pre-filter to the same channel or a recent window.
- **Thresholds are judgement, not truth.** The defaults come from one production
  pipeline. Tune them against your own catalogue before trusting the numbers.

## Failure handling

The guard returns `{ ok, blocks, warnings }` and never edits the draft. The recommended
wiring is fail-closed on `blocks` and log-only on `warnings`. When a block is a genuine
false positive, the fix is to widen the specific threshold for that call — not to skip
the guard, and not to delete the item from the catalogue so the comparison disappears.

## Rollback

Self-contained and stateless. Delete the directory and the call site; nothing is written,
stored or migrated.

## Security notes

- No network calls, no telemetry, no dependencies to audit.
- Your catalogue stays in your process. Nothing is uploaded or compared remotely.
- Regex and set operations run over text you supply. Costs are linear in text length;
  the patterns avoid nested quantifiers. Pre-filter the catalogue rather than running
  an unbounded comparison inside a request path.

## Version and update policy

Version 1.0.0. Semver: new rules or stricter defaults are a minor version, changes to
the `blocks`/`warnings` shape or the item shape are a major version. Updates ship as new
versions of this package; nothing auto-updates and nothing phones home.

## License

MIT — see `LICENSE`. You may use, modify and redistribute it, including commercially.

## Support boundary

Provided as-is. The tests and this README are the documentation. There is no SLA, no
tuning service, and no guarantee that the heuristics catch every duplicate your pipeline
can produce.
