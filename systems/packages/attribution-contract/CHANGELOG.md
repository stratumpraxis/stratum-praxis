# Changelog

All notable changes to Attribution Contract are recorded here. Versions follow semver.

## 1.0.0 — 2026-08-29

First packaged release, extracted clean-room from an internal acquisition pipeline that
builds and verifies every tracked link this way in production.

### Added
- `buildUtm()` / `buildTrackedUrl()`: deterministic parameters from a declared routing
  table; an undeclared channel throws instead of being guessed.
- `applyUtm()`: preserves hand-tagged parameters unless `overwrite` is passed, and
  refuses non-https destinations.
- `verifyAttribution()`: structural check that names every missing parameter, classifies
  the destination as owned or checkout, and reports `checkout_provider`.
- `campaignKey()`: stable lane identity across spellings.
- `summariseFunnel()`: stage-by-stage report where an unmeasured stage stays
  `NOT_MEASURED` and a broken chain is named rather than smoothed into a rate.
- `verifyRevenueClaim()`: revenue may only be attributed with payment-provider evidence.
- `src/cli.mjs` with `build` and `verify` commands for CI.

### Changed relative to the internal original
- The routing table, owned domains and checkout hosts are now inputs, not files the
  module reaches for on disk at a fixed repository path.
- The frozen brand-specific analytics-event vocabulary was dropped; the funnel stages
  are generic and the module makes no assumptions about your event names.
