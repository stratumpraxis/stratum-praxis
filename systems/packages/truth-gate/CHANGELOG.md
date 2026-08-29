# Changelog

All notable changes to Truth Gate are recorded here. Versions follow semver.

## 1.0.0 — 2026-08-29

First packaged release, extracted clean-room from an internal publishing pipeline that
has been running these checks in production.

### Added
- `checkTruth()` / `checkDraft()`: 14 first-person claim families with English and
  Spanish patterns, evaluated per sentence.
- Identity contract loader that refuses a roster, a fictional identity, or an approved
  claim with no `evidence_ref` and no `scope`.
- Location-scope gate: approved location values come from the contract, so a claim
  narrower than the approved scope is rejected.
- Privacy gate: credentials, assigned secrets, street addresses (Latin and Japanese
  forms), phone numbers, coordinates, payment cards, bank details, plus an email
  allowlist so an already-public contact is not treated as a leak.
- Lens contract: banned phrasings, plus a configurable collective-generalisation rule
  that passes a sourced or scoped sentence and blocks a bare one.
- Source contract: a claim the source itself marks restricted cannot appear in a
  derivative.
- `src/cli.mjs` validation command that exits non-zero on any violation.

### Changed relative to the internal original
- Every brand-specific value (identity id, approved country, owned-asset pattern,
  generalisation subject) moved out of the code and into the contract file.
- Spanish patterns ending in an accented vowel now use a Unicode-aware boundary. The
  original relied on `\b`, which does not match after `é`/`í`, so phrases such as
  "Ya lo probé durante una semana" passed the gate. They no longer do.
- `my client` widened to `my clients`.
