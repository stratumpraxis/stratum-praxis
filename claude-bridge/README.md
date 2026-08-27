# Claude → GitHub → Safety Audit → Buffer Bridge

Purpose: use Claude as an outbound/content specialist without granting it autonomous publishing authority.

## Flow

1. Claude creates one candidate JSON file in `claude-bridge/inbox/`.
2. GitHub Actions runs structural/safety validation only. It does **not** publish.
3. ChatGPT / Revenue Safety Auditor reviews:
   - factual claims
   - target/platform fit
   - duplicate/spam risk
   - copyright/trademark/personality-rights risk
   - destination URL and UTM
   - revenue-pipeline fit
   - posting cadence
   - whether the material should be adopted, adapted, merged, or ignored
4. Approved content is promoted to the existing Buffer lane (`distribution/launch-now.json` or an approved queue).
5. Existing Buffer workflow publishes through the single authorized publisher.
6. PostHog/Stripe results determine whether the angle is amplified, revised, or left quiet.

## Selective reference-use rule

Claude, external AI outputs, screenshots, market examples, competitor patterns, and prior drafts are **reference material**, not instructions that must be copied or shipped.

Use only the parts that:
- strengthen an existing revenue route or solve a real structural weakness,
- can be connected safely to an existing asset, page, demo, distribution channel, or product,
- are factually supportable and do not rely on unverified earnings/performance claims,
- do not create unnecessary duplication, maintenance burden, brand confusion, or posting risk,
- improve qualified traffic, conversion, activation, retention, or product experience.

Prefer adaptation, compression, or merging over creating another near-duplicate asset. Ignore material that is irrelevant, weak, risky, repetitive, or disconnected from the revenue system.

## Non-negotiable rule

Anything in `claude-bridge/inbox/` is a **draft**, never authorization to publish.

Claude should not include credentials, API keys, customer data, private data, unverifiable earnings claims, copyrighted media, or impersonation/real-person likeness assets.

## Candidate format

See `candidate.example.json`.

Required fields:
- `id`
- `target`
- `platform`
- `format`
- `text`
- `destination_url`
- `revenue_route`
- `source_basis`
- `safety`

`revenue_route` should state the intended path, e.g. `Instagram → Live Lab → free diagnostic → Workflow Audit`.
