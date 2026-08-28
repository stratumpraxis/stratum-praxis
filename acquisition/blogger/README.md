# Autonomous Blogger Runner

This is the unattended execution layer for Issue #56. It consumes only `COMPLETE` sources already accepted by `acquisition/media-engine/sources.json`, chooses one best-fit editorial lens, and produces at most one English article per run.

## Flow

`COMPLETE source -> lens selection -> draft -> critic -> deepen -> humanize/final edit -> local quality gate -> READY/DRAFT -> outbox`

The workflow runs every six hours and can also be dispatched manually. It never creates accounts, bypasses authentication, or marks an item published. Current channel evidence leaves publication at `HUMAN_PUBLISH_REQUIRED` or `HUMAN_REVIEW_REQUIRED` until the authoritative channel/provider contracts prove otherwise.

## Model access

The runner uses the OpenAI Responses API and reads `OPENAI_API_KEY` only from the GitHub Actions secret of the same name. No key is stored in the repository. `BLOGGER_MODEL` is an optional repository variable and defaults to `gpt-5.6-sol`.

If the secret is absent, the job stops with `BLOGGER_BLOCKED` and does **not** mark a source processed.

## Quality and safety

The model is instructed through four distinct passes rather than one-shot generation. A deterministic local gate then checks minimum useful length, generic AI phrasing, restricted-claim leakage, obvious unsupported first-person experience, and basic rhythm variation. The default READY threshold is 82/100.

The source register remains immutable. Generated artifacts are additive under `acquisition/blogger/outbox/`; historical acquisition, distribution, trend-video, and revenue ledgers are not modified.

A source is marked processed only after a READY artifact is created. A DRAFT remains eligible for a later retry after the underlying implementation or source is improved.

## Publishing boundary

READY is not PUBLISHED. This runner intentionally does not call DEV, Bluesky, Threads, note, or any other publishing API. An external publisher adapter may be added only after `distribution/provider-policy.json` plus `acquisition/media-engine/channels.json` prove authorization, automation compatibility, disclosure handling, and an owning publisher.
