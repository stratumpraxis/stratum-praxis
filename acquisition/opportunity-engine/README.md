# Opportunity Engine v1 — Kaggle + Devpost

Purpose: discover and qualify prize/competition opportunities that are safe to pursue and safe to win.

This module is deliberately narrower than the existing Acquisition Intelligence Engine. It does not create accounts, accept legal terms, solve CAPTCHAs, bypass rate limits, perform KYC, sign declarations, or invent identity/profile facts.

## v1 platforms

1. Kaggle — primary lane. Prefer official CLI/API after the owner has accepted competition rules.
2. Devpost — secondary lane. Prepare submissions automatically; Terms/Rules acceptance and final legal declarations remain human-gated.

## State machine

DISCOVERED -> AUDITED -> ELIGIBLE -> READY_TO_PREPARE -> PREPARED -> HUMAN_REQUIRED -> SUBMITTED -> RESULT_PENDING -> WON/LOST -> CLOSED

The engine may advance autonomously only through PREPARED. Any CAPTCHA, Terms acceptance, legal declaration, identity verification, KYC, tax form, signature, publicity consent, IP assignment, or ambiguous AI-use rule forces HUMAN_REQUIRED.

## Non-negotiable stop conditions

- CAPTCHA / reCAPTCHA / hCaptcha / Turnstile / "verify you are human"
- 401/403 authentication barrier not already authorized
- 429 rate limit
- Terms/Rules acceptance
- legal-name-as-signature or electronic signature
- KYC / liveness / ID upload
- tax forms (W-8BEN, W-9, local equivalents)
- payment details
- request to misrepresent identity, residence, skills, authorship, employment, or eligibility
- AI use prohibited or unclear
- Japan eligibility unclear
- paid entry / deposit / crypto transfer / prize-release fee
- open-ended employment or post-win service obligation
- mandatory follow-on phase unless explicitly approved
- IP assignment unless explicitly approved

## Opportunity acceptance profile

A default candidate is AUTO_ELIGIBLE only when all are true:

- Japan resident may participate
- individual participation allowed
- no entry fee
- reputable sponsor/platform
- AI use allowed or not required for the submission
- one-shot or clearly bounded deliverable
- no interview/employment obligation
- no mandatory Phase 2
- post-win burden is bounded and estimated <= 4 hours excluding optional publicity
- prize/payment route is documented
- IP is retained or license-only
- no hidden purchase requirement

Everything else is HUMAN_REVIEW or REJECT.

## Files

- `platform-policy.json` — frozen v1 platform safety policy
- `opportunities.json` — append-only discovery/decision ledger seed
- `lib/audit.mjs` — deterministic eligibility and safety classifier
- `cli/audit.mjs` — audit one JSON opportunity or the ledger
- `test/audit.test.mjs` — regression tests for human-gate and rejection boundaries

This module records facts and decisions. It never fabricates a submission result. `SUBMITTED` requires external proof (competition submission id/url or platform confirmation evidence). `WON` requires official winner evidence.
