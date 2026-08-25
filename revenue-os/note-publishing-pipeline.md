# Note publishing pipeline

## Goal
Turn research into sellable Note articles without creating another planning/memo swamp.

## Supported facts verified 2026-08-26
- note supports paid articles and setting the free/paid boundary in its editor/app.
- note supports scheduled publishing through its product features (historically tied to note Premium / applicable publishing settings).
- note supports paid articles, magazines and memberships as monetization surfaces.
- No official creator write/publish API was verified in this research pass.

## Automation boundary
Do **not** publish through undocumented private endpoints, credential scripting or fragile browser automation. Until an official supported write integration is verified, final creation/publish/schedule actions in note remain human-controlled.

## Writer Cell output contract
Every accepted topic must leave the Cell as a publish-ready package, not a memo:
1. `article.md` — final title, free section, explicit paid boundary marker, paid section, CTA, tags, price recommendation and source notes.
2. `cover-brief.md` — image-generation-ready visual brief with title-safe layout; when image generation is available in the active conversation, generate the cover before handoff.
3. `x-copy.md` — 1–3 launch posts derived from the article.
4. `publish-checklist.md` — account, price, paid boundary, tags, cover, schedule/publish, URL capture.

## Queue
Store packages only under `content/note-drafts/YYYY-MM-DD-slug/`. States are folder-level and minimal: `READY`, `PUBLISHED`, `HOLD`. Do not create a second Note ideas database unless the publish queue itself becomes unmanageable.

## Human step target
The ideal remaining manual work is: open note editor → paste/import prepared article → set paid boundary/price → attach generated cover → schedule/publish → paste resulting URL back into the package. Everything before that should be prepared by the Writer/QA cells.

## Escalation
If a future official note publishing API/integration becomes available, replace the manual final step with that supported interface after a terms/safety review. Do not bypass the platform to save a few clicks.