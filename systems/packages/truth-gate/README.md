# Truth Gate

**Stop an AI publishing pipeline from inventing a life it did not live.**

A language model asked to write in the first person will happily produce "I tested this
for a month", "my clients kept asking for it" and "in my 10 years of experience". None
of it is true, all of it is publishable, and none of it is caught by a spell-checker, a
plagiarism checker or a tone checker.

Truth Gate is the check that sits between your generator and your publisher. It reads a
draft, matches it against an explicit identity contract, and refuses any sentence that
requires a personal fact the contract has not approved with evidence.

- **Outcome:** no unevidenced first-person claim, no fabricated biography and no private
  data reaches your publishing step. Every rejection names the offending sentence and a
  safe rewrite.
- **Intended user:** anyone running an automated or semi-automated content pipeline —
  solo operators, small content teams, agencies publishing on behalf of a named person,
  and engineers adding a guardrail to an LLM writing step.
- **Not for:** fact-checking external claims, detecting AI-written text, or moderating
  third-party user content. It governs what *your* identity is allowed to assert.

## Requirements

- Node.js 18 or newer (uses `node:test` and `RegExp` Unicode property escapes).
- No dependencies, no build step, no network access, no telemetry.

## Supported platforms

Anywhere Node 18+ runs: macOS, Linux, Windows, Docker, GitHub Actions, GitLab CI, and
serverless runtimes that support ES modules. The library performs no I/O; only the
optional `loadIdentity()` helper and the CLI read files.

## File structure

```
truth-gate/
├── README.md
├── LICENSE
├── CHANGELOG.md
├── package.json
├── src/
│   ├── truth-gate.mjs      the gate: claim families, privacy, lens and source checks
│   ├── identity.mjs        contract loader and validator
│   └── cli.mjs             validation command, exits non-zero on violations
├── examples/
│   ├── identity.example.json   placeholder contract — replace every value
│   ├── lens.example.json       editorial lens with a generalisation rule
│   ├── sample-input.json       a deliberately failing draft
│   └── sample-output.txt       what the CLI prints for that draft
└── test/
    └── truth-gate.test.mjs     14 tests covering every gate
```

## Setup

1. Copy this directory into your project (for example `lib/truth-gate/`).
2. Copy `examples/identity.example.json` to `identity.json` and replace every value with
   facts you can evidence. This file is the whole product: the gate is only as honest as
   the contract.
3. Call the gate before your publish step.

## Configuration example

```json
{
  "identity_id": "your_operator_id",
  "public_descriptor": "How you describe yourself publicly.",
  "is_fictional": false,
  "languages": ["en"],
  "updated_at": "2026-08-29",
  "owned_asset_pattern": "yourdomain\\.com",
  "approved_location_values": ["portugal"],
  "approved_first_person_claims": [
    {
      "claim_id": "operates_own_assets",
      "evidence_ref": "Repository authorship: these pages are in this repo.",
      "scope": "Only assets you publish. Never third-party products."
    }
  ],
  "prohibited_first_person_claims": [
    { "claim_id": "personal_testing", "safe_rewrite": "This appears useful when ..." }
  ],
  "privacy_redactions": { "public_contact_allowlist": ["hello@yourdomain.com"] }
}
```

An approved claim without an `evidence_ref` **and** a `scope` is rejected at load time.
That refusal is deliberate: an approved first-person claim with no source of truth is
exactly the failure this contract exists to prevent.

## Usage

```js
import { loadIdentity } from './src/identity.mjs';
import { checkDraft } from './src/truth-gate.mjs';

const identity = await loadIdentity('./identity.json');
const result = checkDraft(draft, { identity, lens, source });

if (!result.ok) {
  // Do not publish. Every violation carries { gate, claim_id, field, sentence, safe_rewrite }.
  throw new Error(result.violations.map((v) => `${v.claim_id}: ${v.sentence}`).join('\n'));
}
```

## Validation command

```
npm test                 # 14 tests
npm run check            # runs the gate over the deliberately failing sample draft
node src/cli.mjs --identity identity.json --draft draft.json [--lens lens.json]
```

Exit codes: `0` clean, `1` violations found, `2` bad usage or an invalid contract. Wire
it into CI and a fabricated draft fails the job.

## Sample input and output

`examples/sample-input.json` contains four planted fabrications. `examples/sample-output.txt`
is the exact CLI output for it: four violations, each with the sentence and a rewrite.

## What it checks

| Gate | Catches |
| --- | --- |
| `FIRST_PERSON_TRUTH` | testing, purchase, habitual use, client work, customers/revenue, residence, employment, credentials, age/legal name, travel, testimonials, claimed authority, private sources, and other unevidenced first-person experience |
| `PRIVACY_LOCATION_SCOPE` | a location claim narrower than the contract approves |
| `PRIVACY` | API keys, assigned secrets, street addresses (Latin and Japanese forms), phone numbers, coordinates, payment cards, bank details, non-allowlisted emails |
| `LENS_CONTRACT` | phrasings a lens bans, and collective generalisations with no source or scope |
| `SOURCE_CONTRACT` | a claim the source material itself marks restricted |

English and Spanish patterns sit side by side on purpose: a fabrication blocked in
English must not survive by being written in Spanish.

## Known limitations

- **Pattern-based, not semantic.** It catches the phrasings that actually appear in
  generated copy. A sufficiently indirect fabrication ("the month I spent with it")
  can pass. Treat it as a floor, not a proof of truthfulness.
- **English and Spanish only.** Other languages need their own pattern sets; the
  structure is designed for that, but the patterns are not written.
- **It cannot verify your contract.** If you write `evidence_ref: "trust me"`, the gate
  will accept the claim. The contract is a human commitment, mechanically enforced.
- **False positives are expected and intended.** A sentence about work you genuinely did
  will be blocked unless the contract approves it. That is the trade the design makes.
- **No fact-checking.** It says nothing about whether external claims are accurate.

## Failure handling

The gate never rewrites, softens or hedges. It returns `{ ok: false, violations }` and
your pipeline decides. The recommended wiring is fail-closed: a violation stops the
publish, a human reads the named sentence, and either the draft changes or the contract
gains an evidenced claim. Never auto-approve a claim to clear a build.

If `loadIdentity()` throws, the contract itself is broken — `error.errors` lists every
problem. Do not fall back to an empty contract; an empty contract approves nothing but
also proves nothing.

## Rollback

The package is self-contained and stateless. To remove it, delete the directory and the
call site. It writes no files, keeps no database and stores no state between runs, so
there is nothing to migrate or clean up.

## Security notes

- No network calls, no telemetry, no third-party dependencies to audit.
- The privacy gate is a leak *detector*, not a redactor: it reports, it does not rewrite.
- Do not commit a filled-in `identity.json` containing a private email to a public
  repository. The allowlist exists for contacts that are already public.
- Regex matching runs over draft text you supply. Very large inputs cost linear time;
  the patterns avoid nested quantifiers, so catastrophic backtracking is not expected,
  but do not run it over untrusted multi-megabyte input in a request path.

## Version and update policy

Version 1.0.0. Semver: new claim families or stricter patterns are a minor version,
changes to the `violations` shape or the contract schema are a major version. Updates
are published as new versions of this package; there is no auto-update mechanism and
nothing phones home.

## License

MIT — see `LICENSE`. You may use, modify and redistribute it, including commercially.

## Support boundary

Provided as-is. The included tests and this README are the documentation. There is no
SLA, no installation service and no guarantee that the patterns catch every fabrication
your generator can produce.
