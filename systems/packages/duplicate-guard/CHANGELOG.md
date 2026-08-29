# Changelog

All notable changes to Duplicate Guard are recorded here. Versions follow semver.

## 1.0.0 — 2026-08-29

First packaged release, extracted clean-room from an internal publishing pipeline that
has been running these checks in production.

### Added
- `checkDuplication()`: seven rules — source echo, same-language copy-spin,
  cross-language duplicate, repeated title, repeated hook, same-source/same-channel
  cooldown, and same-audience/CTA/destination cooldown.
- `STRUCTURE_REUSE` warning for the same skeleton with substitutions, reported without
  blocking.
- Shingle, Jaccard, normalisation and lane-key primitives exported separately for reuse.
- Every threshold overridable per call via `thresholds`; the defaults are the values the
  original pipeline runs.
- `src/cli.mjs` validation command that exits non-zero when a draft is blocked.

### Changed relative to the internal original
- All repository-specific coupling removed: the guard takes plain objects and has no
  knowledge of a routing file, an analytics taxonomy or a campaign registry.
- Cross-language anchor extraction no longer counts sentence-initial capitalised words
  as proper nouns unless the same word also appears mid-sentence. The original counted
  them, which diluted the anchor overlap with language-specific noise ("Small", "Los")
  and let literal translations score below the duplicate threshold.
