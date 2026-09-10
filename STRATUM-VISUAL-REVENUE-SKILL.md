# Stratum Visual Revenue Skill

Status: REQUIRED for Stratum web/product UI work
Updated: 2026-09-10

## Mission

Stratum is a B2B Revenue Intelligence / Decision System.
Visual design is not decoration. It is part of the revenue mechanism.

Every screen should improve this sequence:

Attention → Understanding → Trust → Decision → Action → Revenue

A technically correct page that looks generic, dense, weak, or hard to scan is NOT complete.

## Core principle: make capability visible

Do not ask only: “Does the feature work?”
Ask:

1. Can a buyer understand the value in 3–5 seconds?
2. Can the user see the important number before reading a paragraph?
3. Does the result feel like a decision artifact rather than raw output?
4. Is there one obvious next action?
5. Does the screen look valuable enough to save, share, show internally, or act on?

Implementation quantity, CSS volume, commit count, and feature count are not evidence of design quality.

## Function → Visual Evidence

Convert invisible capability into visible proof.

Examples:
- Calculation → headline KPI + comparison + cost structure
- Diagnostic → score + risk band + decision memo
- Audit → ranked opportunities + confidence + next action
- Workflow → before/after map + leakage indicators
- Agent control → permission boundaries + risk state + human gate

Prefer numbers, state, hierarchy, comparison, and diagrams over explanatory copy.

## Result → Publishable / Shareable Artifact

When appropriate, results should be designed so they can become a useful artifact outside the immediate screen.

A strong result should contain:
- clear title
- primary KPI / score
- concise context
- comparison or benchmark when supported
- decision state
- next recommended action
- Stratum attribution
- no invented proof or unsupported claims

Possible transformations:
- on-screen result panel
- compact internal decision summary
- printable/PDF-friendly view
- copyable summary
- social/video motion asset only when appropriate for the audience

Do not flatten critical information into decorative images when semantic HTML/data should remain available.

## Revenue Contact Density

Do not increase page count for its own sake.
Increase the number of relevant moments where a qualified user can naturally meet the correct next revenue action.

Good:
Problem → Free tool → Evidence → Decision → Paid escalation → Return route

Bad:
Catalog → many equal cards → many CTAs → user chooses blindly

## Hero rule

A Hero must communicate, without a paragraph wall:
- what Stratum is
- who it is for
- what decision it helps make
- what to press next

On mobile, the first viewport should not be consumed by typography alone.
The first meaningful CTA and at least one sentence of value/context should be reachable without excessive scrolling.

## Mobile rule

Mobile is a first-class revenue surface.
Check:
- headline does not dominate the whole viewport
- tap targets are comfortable
- form fields are not visually exhausting
- result KPI is visible before detail
- tables/comparisons do not become horizontal-scroll traps
- sticky CTA does not cover content
- safe-area is respected
- result/action hierarchy survives small screens

## Form rule

Forms should feel like decision input, not administration.

Use:
- grouped assumptions
- plain-language labels
- visible units
- helpful defaults only when clearly illustrative
- immediate validation
- progressive detail where possible

Avoid overwhelming the user with all complexity before they understand the decision being made.

## Motion rule

Motion must explain:
- state change
- cause/effect
- progress
- comparison
- feedback
- next action

Do not use motion simply to prove the page is modern.
No constant floating, random particles, decorative loops, or motion that competes with forms.
Always support prefers-reduced-motion.

## Share / reuse rule

When a useful static result exists, consider whether it can responsibly become another distribution surface.

Examples:
- decision summary → internal share card
- calculator output → visual cost comparison
- audit finding → anonymized educational diagram

Never publish private user data automatically.
Never turn confidential B2B inputs into social content by default.

## Design acceptance gate

Score each major screen separately:
- First impression
- B2B trust
- Information hierarchy
- Visual comprehension
- Form usability
- Result clarity
- CTA clarity
- Revenue routing
- Mobile
- Motion usefulness
- Brand consistency

No major Stratum screen should be called complete below 85/100 overall.
A weak score must trigger revision, not explanation.

## Completion evidence

Required sequence:

UX audit → zero-base redesign when needed → implementation → visual comparison → mobile QA → CTA QA → route QA → analytics invariant QA → live verification

“Looks slightly better” is not a completion condition.

## Ownership guard

Do not restore or surface legacy, held, creator, life, or other-brand assets to fill visual space.
Visual emptiness must be solved with hierarchy, layout, evidence, and interaction—not asset resurrection.

## Final question

Before shipping, ask:

“Did the screen merely become prettier, or did the buyer’s decision become faster, clearer, more trustworthy, and more likely to move to the correct next action?”

Only the second counts as Stratum design progress.
