# Agent Control Auditor — intent / authority extension

Date: 2026-08-30  
Change type: extension (new product implementation; no existing mechanism replaced)

## Target metric

Increase completed, qualified agent audits by removing the technical starting barrier, while measuring the share of submitted configurations with excess or insufficient authority.

## Implemented boundary

- First input is the intended business outcome in plain language.
- Intent is normalized into goal, inputs, outputs, external actions, and human decision points.
- Actual L0–L5 capability is compared with the least-privilege authority ceiling implied by intent.
- Intended D0–D4 decision authority is compared with actual decision authority.
- Findings explain why extra capability may matter; extra capability alone does not reduce the score unless a material exposure or missing control is detected.
- Pasted and uploaded text is processed locally; supported files are limited to text formats and 500 KB.

## Measurement events

The page uses the existing `scos-analytics.js` funnel integration. Recommended downstream events are audit start, audit completed, authority-gap class, export, and checkout start when paid gating is implemented through a verified server-side commerce path.

## Deferred deliberately

Paid gating and purchase verification were not fabricated. No compatible server-side Agent Control Auditor entitlement exists in this repository. Existing product prices and checkout URLs remain unchanged.
