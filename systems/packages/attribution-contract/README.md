# Attribution Contract

**Know which channel produced the sale — or know that you cannot know.**

Attribution breaks in two boring ways. First, the same campaign gets tagged three
different ways (`Tool Sprawl`, `tool-sprawl`, `toolsprawl`) and shows up in analytics as
three lanes that each look too small to matter. Second, a CTA ships without tags at all,
so the click that mattered arrives anonymous and the funnel quietly reports a rate that
is not real.

This package fixes both mechanically: one routing table declares every channel, links are
built from it deterministically, and a CI command fails the build when a link would
arrive unattributed. It also refuses to compute a conversion rate from a funnel with a
missing stage, because that number is fiction.

- **Outcome:** every tracked link is identical for identical inputs, every CTA is
  verifiably attributable before it ships, and every reported rate has a measured
  denominator behind it.
- **Intended user:** solo operators and small teams running their own acquisition —
  anyone who owns both the links and the analytics and needs the two to agree.
- **Not for:** cross-device identity resolution, server-side conversion APIs, or
  attribution modelling. It governs the parameters, not the model.

## Requirements

- Node.js 18 or newer.
- No dependencies, no build step, no network access, no telemetry.

## Supported platforms

Anywhere Node 18+ runs: macOS, Linux, Windows, Docker, GitHub Actions, GitLab CI, and
serverless runtimes supporting ES modules. The library performs no I/O; only
`loadRouting()` and the CLI read files.

## File structure

```
attribution-contract/
├── README.md
├── LICENSE
├── CHANGELOG.md
├── package.json
├── src/
│   ├── attribution.mjs   build, apply, verify, campaign key, funnel, revenue claim
│   ├── routing.mjs       the channel table: loader and validator
│   └── cli.mjs           `build` and `verify` commands for CI
├── examples/
│   ├── routing.example.json  five channels, owned domains, checkout hosts
│   ├── links.example.json    two good links and two broken ones
│   └── sample-output.txt     what `verify` prints for them
└── test/
    └── attribution.test.mjs  18 tests
```

## Setup

1. Copy this directory into your project (for example `lib/attribution/`).
2. Copy `examples/routing.example.json` to `routing.json` and declare your real channels,
   owned domains and checkout hosts.
3. Build links with `buildTrackedUrl()` instead of writing query strings by hand.
4. Add `verify` to CI over the links your site and queues actually publish.

## Configuration example

```json
{
  "channels": {
    "newsletter": { "utm_source": "newsletter", "utm_medium": "email" },
    "x":          { "utm_source": "x",          "utm_medium": "social" },
    "youtube":    { "utm_source": "youtube",    "utm_medium": "video" }
  },
  "owned_domains": ["example.com"],
  "checkout_hosts": ["buy.stripe.com", "payhip.com", "gumroad.com"]
}
```

A channel missing `utm_source` or `utm_medium` is rejected at load. An undeclared channel
throws at build time and lists the ones that exist — the error is the prompt to make a
deliberate decision, not to invent a tag inline.

## Usage

```js
import { loadRouting } from './src/routing.mjs';
import { buildTrackedUrl, verifyAttribution, summariseFunnel } from './src/attribution.mjs';

const routing = await loadRouting('./routing.json');

const { url, params } = buildTrackedUrl({
  routing,
  channel: 'newsletter',
  assetId: 'checklist',
  campaign: 'Tool Sprawl',     // slugged deterministically to tool_sprawl
  contentAngle: 'renewal-costs',
  variant: 'b',
  destinationUrl: 'https://example.com/checklist'
});

const check = verifyAttribution(url, { routing });
// { ok: true, host, owned_destination, checkout_destination, checkout_provider }
```

## Validation command

```
npm test          # 18 tests
npm run check     # verifies the sample links; exits 1 because two are broken
node src/cli.mjs build  --routing routing.json --channel x --asset kit --campaign launch --destination https://example.com/kit
node src/cli.mjs verify --routing routing.json --links links.json
```

`verify` accepts an array of URL strings or `{ id, url }` objects. Exit codes: `0` all
attributable, `1` at least one is not, `2` bad usage or an invalid routing table.

## Sample input and output

`examples/links.example.json` holds four links: one owned destination, one checkout
destination, one untagged CTA and one that is both insecure and off-domain.
`examples/sample-output.txt` is the exact `verify` output — two passes, two failures with
every problem named, and a `2/4` summary.

## Measurement that refuses to lie

`summariseFunnel()` reports each stage as a number or as `NOT_MEASURED`. `null` and
`undefined` mean "no measurement exists"; `0` means "measured, and it was zero". Those
are different facts and the module never collapses one into the other.

A stage with a value while an earlier stage has none is reported in `gaps`, and the rate
that would span the gap comes back `null` rather than as a plausible-looking number.

`verifyRevenueClaim()` applies the same rule to money: a click event is evidence that a
button was pressed, not that a payment settled. Revenue is only attributable with
payment-provider evidence.

## Known limitations

- **Client-side parameters only.** Once a visitor reaches a hosted checkout you do not
  control, the parameters may not survive into the payment record. Where they do not,
  the honest move is to record the boundary, not to assume continuity. This package
  gives you `checkout_provider` so you can document exactly where the chain ends.
- **No identity resolution.** Same person, two devices, two lanes. Nothing here
  deduplicates them.
- **`verifyAttribution` is structural.** It proves the parameters are present and the
  host is approved. It cannot prove your analytics tool actually recorded the visit.
- **Slugging is lossy by design.** `slug()` folds case, punctuation and accents into
  `[a-z0-9_]`. Two genuinely different campaign names that differ only in punctuation
  will collide — that is the same property that stops one campaign becoming three.
- **No attribution model.** First-touch, last-touch and multi-touch are decisions for
  your analytics layer.

## Failure handling

`buildUtm()` and `applyUtm()` throw on an undeclared channel, a missing asset or
campaign, or a non-https destination — all of which are programming errors that should
stop a build rather than emit a bad link. `verifyAttribution()` never throws; it returns
problems so you can report them all at once. The recommended wiring is fail-closed in CI
and log-only at runtime.

## Rollback

Self-contained and stateless. Delete the directory and the call sites. Links already
published keep working — they are ordinary URLs — so removing the package never breaks
existing attribution, it only stops enforcing it.

## Security notes

- No network calls, no telemetry, no dependencies to audit.
- Never put a token, an email address or any personal identifier into `utm_content` or
  `asset_id`: these values end up in referrer headers, browser history and third-party
  analytics.
- `applyUtm()` refuses non-https destinations, which prevents attaching campaign data to
  a cleartext request.
- `verifyAttribution()` enforces an allowlist of destination hosts, so a link that has
  been rewritten to point somewhere unexpected fails the check.

## Version and update policy

Version 1.0.0. Semver: new checks or additional returned fields are a minor version,
changes to the parameter names, the slug algorithm or the returned shapes are a major
version — a slug change would re-label historical campaigns, so it will never happen in
a patch. Updates ship as new versions; nothing auto-updates and nothing phones home.

## License

MIT — see `LICENSE`. You may use, modify and redistribute it, including commercially.

## Support boundary

Provided as-is. The tests and this README are the documentation. There is no SLA, no
analytics configuration service, and no guarantee about how any third-party checkout or
analytics provider handles the parameters once a visitor leaves your domain.
