# Signal Praxis v2｜Engagement × Multilingual Operating Model

Date: 2026-08-25

## Goal
Turn Signal Praxis from a static information page into a daily-use information utility that safely converts qualified traffic into useful actions and revenue paths without dark patterns.

## Top constraints
1. Safety first: no copied-summary farm, no outrage bait, no high-risk claims, no noisy autoplay.
2. Low responsibility: social posts are signals, important claims require official/primary verification.
3. Revenue-aware: every high-value page should have a natural next step, but no forced click pattern.
4. Low-cost: reuse GitHub Pages, existing domain, PostHog, PWA, IndexNow, RSS and current product/tool assets.
5. Versioned: ship usable v1/v2 quickly, then improve from actual behavior data.

## Page-internal roles
- Product Experience Lead: daily-use layout, information density, navigation, mobile behavior.
- Attention Architect: uses motion, hierarchy and visual rhythm to guide attention without anxiety or manipulation.
- Feed Designer: Discover / YouTube / X-inspired vertical discovery flow; next item should be obvious.
- Conversion UX Lead: inserts context-matched CTAs that feel like the natural next action.
- Motion Safety Lead: muted/in-view previews only; respect prefers-reduced-motion; no surprise audio.
- Multilingual Editor: Japanese and English are required; Spanish is enabled as a third interface language.
- Translation QA: keep meaning and risk language aligned between JA/EN/ES.
- Distribution Lead: Google/Bing/Discover/RSS + existing Medium/note/X/DEV/GitHub/YouTube assets; avoid single-platform dependency.
- PWA/App Lead: browser-installable Signal Praxis and future store packaging readiness.
- Measurement Lead: track page views, article clicks, filters, language switches, saves, installs and revenue CTA clicks.
- Safety Gate: blocks scraping workarounds, duplicate spam, unverified income claims, high-risk personal allegations and noisy autoplay.
- Pruning Lead: removes features that add complexity without increasing retention, qualified traffic, useful action or revenue.
- Chief Optimizer: chooses the highest-leverage next improvement from observed data.

## Implemented in v2
- Stronger feed-style home page inspired by recurring-use products rather than a static corporate landing page.
- Sticky top navigation and mobile bottom navigation.
- “Live Signal” visual state with subtle motion.
- Large visual cards with stronger hierarchy and play-style affordance.
- Search and topic filters.
- Save-for-later state in localStorage.
- PWA install prompt when supported.
- Japanese / English / Spanish UI switcher persisted locally.
- Three seed articles now switch JA / EN / ES inside the article page.
- Contextual soft CTA inserted after the first signal feed.
- Motion respects prefers-reduced-motion.
- Infrastructure is ready for muted playsinline in-view video previews when real video assets exist.
- Service worker cache bumped to v2.

## Distribution rule from shared ledgers
Existing records already prioritize external placement and qualified traffic over more production. Reuse existing Medium / note / X and other verified channels before creating new accounts. Keep X as a supporting line, not a single point of failure. Track each route as language × demand surface × asset × CTA × measurement.

## Current next priorities
1. Verify live deployment and mobile rendering.
2. Add real visual assets (large article images / short muted preview clips) only where they improve comprehension.
3. Connect existing Medium and note lines to Signal Praxis with non-duplicate teaser content.
4. Verify DEV / YouTube / Microsoft Store or PWA packaging paths before activating.
5. Expand feed only from verified demand signals; avoid volume targets.
6. Add revenue routes article-by-article: own tool/product first, then affiliate/API/data/marketplace only when relevant.
7. Measure repeat visits, article CTR, save rate, tool CTR, checkout starts and purchases.

## Explicitly not doing now
- Chinese or Russian localization in this product.
- Surprise-audio autoplay.
- X scraping or bypass automation.
- Mass AI article generation.
- Adding unrelated product categories just to increase page count.
