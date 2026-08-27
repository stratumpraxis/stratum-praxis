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
4. Approved content is promoted to the existing Buffer lane (`distribution/launch-now.json` or an approved queue).
5. Existing Buffer workflow publishes through the single authorized publisher.
6. PostHog/Stripe results determine whether the angle is amplified, revised, or left quiet.

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
