# Design execution rule

For any UI, UX, landing-page, diagnostic, calculator, product-page, motion, or visual implementation in this repository:

1. Read `/DESIGN.md` first.
2. Read `/STRATUM-VISUAL-REVENUE-SKILL.md` before any Stratum-facing UI or visual implementation.
3. Preserve existing product logic, pricing, checkout destinations, legal language, analytics markers, and verified revenue routes unless the task explicitly requires a change.
4. Reuse the existing visual system before inventing a new one, but do not preserve a weak layout merely because it already exists. If the current structure hides product value, redesign from the DOM/information hierarchy level.
5. Build from Primitives → Components → Screens → Motion → QA. Do not prompt directly from vague style words into final UI.
6. Avoid generic AI-SaaS defaults: purple gradients, excessive glass, gradient text, random glow, decorative card walls, and too many equal CTAs.
7. Maintain human readability, semantic HTML, heading order, canonical metadata, stable URLs, and machine-readable product/CTA information.
8. Motion must clarify hierarchy, state, cause/effect, progress, comparison, feedback, or next action. Use physical-feeling easing/inertia sparingly and support `prefers-reduced-motion`.
9. Mobile is part of the design, not a later cleanup step. A hero that consumes the first viewport with typography alone is a failure even if it looks impressive.
10. Convert invisible product capability into visible evidence wherever possible: KPI, score, comparison, cost structure, decision state, risk band, workflow map, or ranked opportunity.
11. Result screens should be designed as decision artifacts. When appropriate, make them easy to save, copy, print, or share without exposing private user data.
12. Complete visual work through implementation, visual comparison, mobile QA, CTA QA, route verification, analytics invariant checks, and live verification when available.
13. Do not call a major Stratum screen complete below 85/100 overall across first impression, B2B trust, hierarchy, comprehension, usability, result clarity, CTA clarity, revenue routing, mobile, motion usefulness, and brand consistency.
14. Do not claim revenue impact from a design change without downstream buyer/payment evidence.
15. Do not restore legacy, held, creator, life, or other-brand assets to make a page look fuller. Solve visual emptiness with hierarchy, evidence, layout, and interaction.

Core test before shipping:

> Did the screen merely become prettier, or did the buyer’s decision become faster, clearer, more trustworthy, and more likely to move to the correct next action?

Only the second counts as Stratum design progress.
