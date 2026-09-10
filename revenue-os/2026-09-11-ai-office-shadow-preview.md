# AI Office Shadow Preview — 2026-09-11

## Status

SHADOW_PREVIEW_READY

Production `index.html`, live product pages, checkout, delivery and analytics behavior are unchanged.

## Objective

Rebuild the Stratum Praxis top-level experience as a B2B AI Office / Decision Workspace rather than a conventional landing page, while preserving verified revenue routes and avoiding fabricated evidence.

## Preview files

- `preview/index.html`
- `preview/office.css`
- `preview/office.js`
- `preview/workflow-audit.html`

All preview HTML pages use `noindex,nofollow,noarchive` and are not linked from the production navigation.

## Implemented interaction model

- Five decision launchers: Workflow / Cost / Agent / Revenue / Audit.
- Launcher selection updates the current decision, route type, recommended destination and next action.
- ROI Snapshot uses only visitor-entered values; no assumptions are pre-filled.
- Evidence Pulse intentionally remains empty until real evidence exists.
- Recent Decision stores only routes opened on the current device using localStorage.
- EN / JA / ES UI switching.
- Shared visual system between the top preview and representative Workflow Audit preview.
- Mobile-first layout and `prefers-reduced-motion` handling.
- Existing B2B URLs are reused where verified.

## Revenue architecture represented

Problem → Free Evidence → Decision → Recommended Action → Paid escalation when justified.

Primary visible entrances:

1. Diagnose — temporary verified target `/b2b/`
2. Free Tools — `/live-lab.html`
3. B2B Products — `/product-router.html`
4. Professional Audit — `/workflow-audit.html` via the representative preview

## Known gap: Offer Optimizer

The newer site specification names **Stratum Offer Optimizer** as the primary general diagnosis / routing entry. No matching implementation or verified URL is present in the current repository state inspected on 2026-09-11.

The Shadow Preview therefore does **not** invent an Offer Optimizer URL. It uses the existing verified Workflow Decision Diagnostic at `/b2b/` as the temporary Diagnose target and labels this limitation in the preview.

Before production top promotion, either:

- connect the real existing Offer Optimizer if its verified implementation is recovered, or
- deliberately designate an existing diagnosis/router as the replacement.

## Change boundary

This checkpoint is visual/UX work only. Do not silently change:

- prices
- checkout URLs
- delivery
- legal copy
- verified analytics semantics
- product definitions
- active/legacy asset classification

## Next gate

1. Publish only the isolated Shadow Preview so it can be reviewed on a real URL.
2. Review desktop and mobile behavior visually.
3. Correct the preview if needed.
4. Do not replace production `index.html` until the top design is accepted.
5. After acceptance, connect the real Diagnose/Offer Optimizer route, promote the top, validate CTA/analytics invariants, then extend the shared system to confirmed ACTIVE B2B pages only.
