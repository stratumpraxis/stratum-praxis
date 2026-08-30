# Forwelle Revenue Video Operator

Purpose: run one safe, original English short per day and distribute it through the existing official Buffer publishing lane to Forwelle's YouTube Shorts, TikTok and Instagram Reels accounts.

## Daily lane

1. Source Scout collects public trend signals from Hacker News and Bluesky plus owner-provided intake.
2. Only candidates with a verified first-party factual source may enter autonomous publication.
3. The editor creates an original Forwelle angle. OpenRouter is used when configured; a conservative original fallback exists so an editor outage does not force unsafe guessing.
4. Speechify creates narration.
5. The existing procedural renderer creates original 9:16 motion graphics and soundtrack; narration is mixed over it.
6. Fail-closed QA rejects unsafe categories, unverified facts, copyrighted media, real-person likenesses, wrong codecs, bad dimensions or missing audio.
7. The distribution safety auditor confirms Buffer is the single approved publisher.
8. Buffer channel allowlists prevent cross-brand posting. A service is blocked if the Forwelle channel cannot be matched safely.
9. Publication evidence is recorded as attempted / queued / sent. A post is not treated as published without external evidence.
10. YouTube 24h / 72h public performance snapshots are collected when the current OAuth scope permits it. Instagram and TikTok metric adapters remain fail-soft until an approved analytics connection is available.

## Safe schedule

Phase 1 is intentionally one original per day at approximately 08:00 JST. There is no automatic escalation to two originals per day. Weak or unverified source days are allowed to publish zero videos.

## Owner intake

The owner does not need to edit repository files. When screenshots, links or notes are supplied in ChatGPT and followed by a short instruction such as `回して`, ChatGPT can verify the factual source, append an item to `manual-intake.json`, and trigger the operator. Manual intake receives a ranking boost but does not bypass fact, rights or account-safety checks.

## Durable state

- `config.json` — schedule, source, channel and safety policy.
- `manual-intake.json` — owner-provided candidate sources.
- `scout-latest.json` — latest ranked signals.
- `current.json` — current selected video manifest.
- `last-qa.json` — latest QA evidence.
- `publish-ledger.json` — per-platform Buffer attempt/publication states.
- `history.json` — published/attempted video history plus metrics snapshots.
- `state.json` — deduplication and last-run state.
- `run-status.json` — latest operator outcome.

No infinite retries, CAPTCHA bypass, authentication bypass, unverified factual publication, cross-brand bulk posting or automatic duplicate retry after unknown external state.
