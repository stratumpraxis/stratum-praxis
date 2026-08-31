# Forwelle Revenue Video Operator

Purpose: run one safe, original English short per day and distribute it through the existing official Buffer publishing lane to Forwelle's YouTube Shorts, TikTok and Instagram Reels accounts.

## Daily lane

1. Source Scout collects public trend signals from Hacker News and Bluesky plus owner-provided intake.
2. Only candidates with a verified first-party factual source may enter autonomous publication.
3. Winning-structure learning ranks up to 10 curated external references and measured Forwelle results, then extracts repeatable structural patterns only. It never copies wording, footage, creator identity, branding or protected expression. When the evidence set is too small, the planner keeps conservative defaults instead of pretending a pattern is proven.
4. The editor creates an original Forwelle angle. OpenRouter is used when configured; a conservative original fallback exists so an editor outage does not force unsafe guessing.
5. Speechify creates narration.
6. MoneyPrinterTurbo is integrated as an optional candidate-material provider. It is fail-soft and candidate-only: generated material is not promoted into `thirdPartyAssets` or autonomous publication until rights/source provenance and quality are verified.
7. The current operator renderer creates original 9:16 procedural motion graphics and soundtrack; narration is mixed over it. Remotion remains the preferred final-composition layer in the production architecture and is not removed unless a tested full replacement is superior across quality, automation, repeatability and maintainability.
8. Fail-closed QA rejects unsafe categories, unverified facts, copyrighted media, real-person likenesses, wrong codecs, bad dimensions or missing audio.
9. The distribution safety auditor confirms Buffer is the single approved publisher.
10. Buffer channel allowlists prevent cross-brand posting. A service is blocked if the Forwelle channel cannot be matched safely.
11. Publication evidence is recorded as attempted / queued / sent. A post is not treated as published without external evidence.
12. YouTube 24h / 72h public performance snapshots are collected when the current OAuth scope permits it. Measured structure profiles feed the next winning-pattern extraction. Instagram and TikTok metric adapters remain fail-soft until an approved analytics connection is available.

## Winning-video learning loop

`winning-video-samples.json` accepts curated external references. `history.json` supplies Forwelle's own videos once 24h/72h YouTube metrics exist. `scripts/extract-winning-patterns.mjs` ranks the best available evidence, keeps the top 10, extracts structural signals, and writes `winning-patterns.json`. The planner only uses the resulting editorial brief after the configured minimum evidence threshold is met.

The intended loop is:

reference/own results -> top evidence set -> repeated structure -> original script -> render -> publish -> 24h/72h metrics -> next extraction

This is structural learning, not copying.

## MoneyPrinterTurbo provider

`moneyprinter-candidate.mjs` supports the current MoneyPrinterTurbo `/api/v1/videos` and task APIs. Set `MONEYPRINTERTURBO_BASE_URL` to activate it and optionally `MONEYPRINTERTURBO_API_KEY` when the service is protected. Without a configured endpoint the stage records `SKIPPED_NOT_CONFIGURED` and the existing production lane continues normally.

MoneyPrinterTurbo output remains `candidateOnly` by default. Candidate video is transient on the runner and is recorded in `asset-plan.json`; it is not automatically used by the published render. This deliberately preserves fail-closed rights handling while keeping the provider ready for future Canva/Remotion asset orchestration.

## Safe schedule

Phase 1 is intentionally one original per day at approximately 08:00 JST. There is no automatic escalation to two originals per day. Weak or unverified source days are allowed to publish zero videos.

## Owner intake

The owner does not need to edit repository files. When screenshots, links or notes are supplied in ChatGPT and followed by a short instruction such as `回して`, ChatGPT can verify the factual source, append an item to `manual-intake.json`, and trigger the operator. Manual intake receives a ranking boost but does not bypass fact, rights or account-safety checks.

## Durable state

- `config.json` — schedule, source, learning, provider, renderer, channel and safety policy.
- `manual-intake.json` — owner-provided candidate sources.
- `winning-video-samples.json` — curated high-performing reference-video observations.
- `winning-patterns.json` — current evidence-backed structural learning state.
- `asset-plan.json` — latest optional asset-provider result and promotion state.
- `scout-latest.json` — latest ranked signals.
- `current.json` — current selected video manifest and structure profile.
- `last-qa.json` — latest QA evidence.
- `publish-ledger.json` — per-platform Buffer attempt/publication states.
- `history.json` — published/attempted video history, structure profiles and metrics snapshots.
- `state.json` — deduplication and last-run state.
- `run-status.json` — latest operator outcome.

No infinite retries, CAPTCHA bypass, authentication bypass, unverified factual publication, cross-brand bulk posting or automatic duplicate retry after unknown external state.
