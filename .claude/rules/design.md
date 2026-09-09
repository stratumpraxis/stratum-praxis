# Design execution rule

For any UI, UX, landing-page, diagnostic, calculator, product-page, motion, or visual implementation in this repository:

1. Read `/DESIGN.md` first.
2. Preserve existing product logic, pricing, checkout destinations, legal language, analytics markers, and verified revenue routes unless the task explicitly requires a change.
3. Reuse the existing visual system before inventing a new one.
4. Build from Primitives → Components → Screens. Do not prompt directly from vague style words into final UI.
5. Avoid generic AI-SaaS defaults: purple gradients, excessive glass, gradient text, random glow, decorative card walls, and too many equal CTAs.
6. Maintain human readability, semantic HTML, heading order, canonical metadata, stable URLs, and machine-readable product/CTA information.
7. Motion must clarify hierarchy or state. Use physical-feeling easing/inertia sparingly and support `prefers-reduced-motion`.
8. Mobile is part of the design, not a later cleanup step.
9. Complete visual work through implementation, live deploy, route verification, and relevant analytics invariant checks when available.
10. Do not claim revenue impact from a design change without downstream buyer/payment evidence.
