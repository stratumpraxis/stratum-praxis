# Stratum Praxis Design System

Updated: 2026-09-09

This file is the visual source of truth for Stratum Praxis web, product UI, motion, and video surfaces.

## Design intent

Stratum Praxis should feel like a practical decision system, not a generic AI SaaS template.

The visual language should communicate:
- clarity before spectacle
- evidence before hype
- practical intelligence
- calm confidence
- human readability
- strong but restrained motion

Target balance:
- luxury 40
- friendliness 60
- advanced 65
- complexity 20

## Core rule

AI may generate implementation, but it must not invent a new visual language per page.

Use this hierarchy:

Primitives → Components → Screens → Motion → QA

Do not skip directly from prompt to final screen.

## Primitives

### Color family

Primary brand family:
- Deep ink / near-black for high-contrast dark surfaces
- Warm paper / off-white for editorial and decision tools
- Mint / aquamarine for positive action and Stratum signature
- Soft lavender for analytical emphasis
- Soft blue for neutral decision emphasis

Semantic colors:
- green/mint = positive / safe / lower risk
- amber = caution / review
- red = risk / negative state

Do not use multiple saturated accent colors in the same hero.
Do not add neon, rainbow, cyberpunk, or arbitrary gradients unless the page has a specific product reason.

### Typography

Primary: Inter / system sans fallback.

Use:
- large, compact hero headlines
- short paragraphs
- strong hierarchy
- restrained uppercase labels
- readable line length

Do not:
- rotate body text
- put gradients on primary text
- overuse all-caps
- create decorative typography that reduces readability

### Spacing

Use generous whitespace.
Prefer fewer, stronger sections over dense card walls.
Mobile spacing is a first-class design surface.

### Radius

Use a small family of related radii rather than random values.
Cards should feel engineered, not bubbly.

### Shadows

Use soft depth only where it clarifies hierarchy.
No default glow on every card or button.

## Components

### Buttons

Primary CTA:
- one dominant action per major viewport
- strong contrast
- clear verb
- visually heavier than all other actions

Secondary CTA:
- lower contrast
- maximum 1-2 alongside a primary CTA

Do not show 5-6 equal-weight actions in a hero.

### Inputs

Inputs must:
- have explicit labels
- be touch-friendly
- show focus state
- explain unusual units
- avoid intimidating technical density when a simpler label works

### Cards

Cards must represent a decision, result, route, proof item, or grouped information.
Do not use cards merely to decorate empty space.

### Result blocks

Diagnostic and calculator results should answer:
1. What happened?
2. Why does it matter?
3. What should the user do next?

Result screens should be visually memorable enough to save or share when appropriate.

### Header / navigation

Keep the global header compact.
Do not expose the entire product catalog before the user understands where to start.

## Screens

### Hub

Goal: route people to the right existing asset.

Default hierarchy:
Problem → Free tool / Live Lab → Decision → Paid escalation only when useful.

### Diagnostic

Goal: reduce uncertainty.

Use:
- one question / one purpose per step
- visible progress
- explicit selected state
- clear next action
- mobile-first controls

### Calculator

Goal: turn assumptions into a decision.

Use:
- clear inputs
- live or immediate result
- one headline metric
- visual comparison or breakdown
- paid escalation only after the user sees value

### Paid decision tool

Goal: make the value, limits, and output legible before checkout.

Do not rely on hype, fake scarcity, or fabricated social proof.

## Motion system

Motion is part of the brand, not decoration.

Preferred motion vocabulary:
- soft depth shift
- delayed follow-through
- restrained parallax
- subtle signal flow
- inertia / easing that suggests physical weight
- result reveal with controlled emphasis

Avoid:
- constant floating everywhere
- infinite spinning elements
- random particle fields
- unnecessary bounce
- motion on every text line

Use `prefers-reduced-motion` support.

The default hero motion idea is a restrained Signal → Decision transformation, not generic glowing AI particles.

## Physical realism

When motion is used, prefer a hint of real-world physics:
- inertia
- weight
- elastic follow-through
- depth
- tension

The purpose is to reduce synthetic AI-template feel, not to imitate a game interface.

## Human + Agent-readable design

A page must work for humans and remain structurally legible to software agents.

Preserve:
- semantic HTML
- logical heading order
- stable URLs
- canonical URLs
- JSON-LD where relevant
- explicit product names
- explicit prices where relevant
- explicit limitations
- clear CTA labels
- machine-readable analytics markers

Never sacrifice semantic structure for visual effects.

## AI-generated asset rule

A generated visual is not finished merely because it looks good as one image.

When reuse matters, separate:
- background
- text
- foreground image
- icon / SVG
- motion layer

Prefer editable, reusable assets and components over flattened screenshots.

## Brand family consistency

Different products may have different personalities, but they must share:
- typography rhythm
- CTA behavior
- motion easing
- semantic colors
- result hierarchy
- spacing discipline
- copy tone

Do not make every page identical.
Do make it obvious that the pages belong to the same product family.

## What NOT to do

- Generic AI SaaS purple-gradient hero
- Neon / cyberpunk by default
- Gradient text for emphasis
- Excessive glassmorphism
- Six equal CTAs in one hero
- Decorative cards with no decision role
- Motion that competes with form completion
- Flattened AI artwork when editable structure is needed
- Fake testimonials, fake logos, fake metrics
- New visual language for every page

## Completion gate

A design change is not complete until:

Existing page → UX audit → design update → implementation → mobile QA → CTA QA → analytics invariant QA → live verification

Revenue logic, price, checkout, legal copy, and analytics must not be silently changed during visual work.
