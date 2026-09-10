# Revenue Pump — operating state

Date: 2026-09-10
Status: IN USE / BUILDING
Owner surface: Stratum Praxis
Public route reserved: https://stratumpraxis.com/revenue-pump/

## Purpose

Revenue Pump is the Stratum Praxis mechanism for turning an existing website, URL, article, free resource, or dormant web asset into a clearer value path:

Problem → Answer → Decision → Action → Revenue

Revenue is an outcome layer, not a guarantee. The mechanism should never promise revenue, rankings, traffic, or conversion uplift.

## Product shape

The route is intentionally one-site-first:

1. Free Revenue Pump Scan
2. Revenue Pump Score
3. Worth Reworking score
4. Primary Block
5. Recommended transformation / next test
6. One primary value route + one alternative
7. Human-reviewed Revenue Pump Audit escalation
8. Blueprint / implementation escalation only after the audit is justified

Primary route types may include Paid, Lead, Affiliate, Support, Share, or Return. Do not force checkout when the page is not ready.

## URL guard

`/revenue-pump/` is now assigned to Revenue Pump and should not be reused, repurposed, or merged into the household-readiness utility or unrelated legacy assets.

The household readiness route remains separate:
https://stratumpraxis.com/72-hour-household-readiness/

## Operating rule

Use Revenue Pump to prioritize existing assets before creating more pages. The core question is not “what can we add?” but “where does the current useful asset stop, and what is the smallest next test that can connect it to a legitimate value route?”

## Current implementation state

Implementation branch: `revenue-pump-mvp`
Target path: `revenue-pump/index.html`
Analytics: reuse `/scos-analytics.js`; record scan starts/completions and CTA interest without sending the scanned URL as an analytics property.
