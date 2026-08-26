# Instagram Growth & Revenue Cell

Updated: 2026-08-26

## Objective
Build a recommendation-safe Instagram distribution and monetization loop for Stratum Praxis. Optimize for qualified profile visits, site sessions, CTA clicks, checkout starts, purchases, and repeat audience—not raw posting volume.

## Operating principle
One strong post is better than five weak posts. Automate repeatable plumbing; keep topic selection, offer fit, quality, and policy checks adaptive.

## Page-split roles
1. **Signal Radar** — Finds Instagram-relevant demand, questions, search intent, product pain, and platform changes.
2. **Content Editor** — Chooses one audience + one problem + one useful takeaway per post.
3. **Creative Director** — Produces original vertical card/carousel/reel assets. No copyrighted characters, scraped creator media, or deceptive screenshots.
4. **Recommendation Safety Auditor** — Blocks misleading claims, engagement bait, repetitive spam, sensitive content, undisclosed commercial relationships, and duplicate language blasts.
5. **Distribution Operator** — Sends only approved payloads through Buffer; maximum default cadence is one feed/reel post per day unless data justifies more.
6. **Revenue Router** — Chooses the lowest-friction destination: free useful article first for cold traffic; product page only when intent is commercial.
7. **Conversion Analyst** — Reads UTM sessions, CTA clicks, checkout clicks, purchases, and revenue. Likes/followers are secondary.
8. **Monetization Scout** — Maintains four lanes: owned products, affiliate, creator/brand partnerships, fan support/subscriptions/gifts when eligible.
9. **Localization Editor** — Tests language expansion only after a format wins. Avoids simultaneous near-duplicate multilingual posts on one account.
10. **Pruner / Revenue CEO** — Weekly keep/kill/expand decision. Removes weak concepts and repetitive automation.

## Current connected infrastructure
- Buffer API: connected and healthy.
- Instagram channel: `praxisstratum`, connected, unlocked, not disconnected.
- First live distribution payload: Smartphone Income Blueprint card + tracked URL.
- First Buffer post ID: `6a8e5ed8abe7feaea6c4a5f1`.
- Existing revenue path: Instagram -> tracked Stratum Praxis page -> CTA -> Stripe.
- PostHog is the traffic/conversion truth; Stripe is the revenue truth.

## Content lanes
### A. Saveable utility (primary)
Checklists, decision rules, calculators, mini frameworks, before/after workflow maps. Goal: saves, shares, profile visits, qualified site sessions.

### B. Timely AI signal
Only publish when a platform/model/policy change changes a real decision. Route to Signal Praxis or an existing relevant tool.

### C. Proof / process
Show how a useful workflow is structured without fake earnings, fabricated testimonials, or guaranteed outcomes.

### D. Comparison / choice
"Use X when..., use Y when..." formats. Strong fit for existing comparison tools and buying guides.

### E. Offer post
Use sparingly after value posts. Explain who it is for, what problem it solves, price, and what it does not promise.

## Creative rules
- Default feed asset: original 4:5 or tall card; large readable headline; 1 idea; minimal text.
- Carousel when a concept requires steps; each card must stand alone.
- Reels only when motion adds understanding. Do not convert every card into a reel mechanically.
- No visual flashing, clickbait arrows, fake notifications, fake dashboards, or copied influencer imagery.
- Every post gets a unique `utm_content` value.

## Safe routing
Cold audience default:
Instagram -> useful existing Stratum Praxis article/tool -> contextual CTA -> product -> Stripe.

Commercial-intent audience:
Instagram -> matching product page -> Stripe.

Do not send every post directly to checkout. Avoid link-farm behavior. Prefer one clear profile destination and contextual internal links.

## Monetization ladder
### Lane 1 — Owned products (ACTIVE NOW)
Immediate priority. Highest control and measurement. Match post topic to an already-complete product or free utility.

### Lane 2 — Affiliate (GATED)
Activate only when a tool/product is genuinely relevant to a winning content lane. Disclose the commercial relationship clearly. Never recommend solely because commission exists. Track affiliate clicks separately from owned-product CTAs.

### Lane 3 — Creator / brand partnerships (ELIGIBILITY DEPENDENT)
Instagram Creator Marketplace is available in Japan for eligible accounts. Build a narrow public topic identity and a clean portfolio first. Use the Paid Partnership label / required branded-content disclosure for sponsored work.

### Lane 4 — Fan support (ELIGIBILITY DEPENDENT)
Instagram Subscriptions and Gifts are available in Japan for eligible creators/professional accounts. Do not model projected revenue until the Professional Dashboard confirms eligibility. If enabled, offer recurring utility (weekly decision briefs, member-only checklists, Q&A) rather than generic exclusives.

## Multilingual strategy
1. English is the default expansion language for global commercial intent.
2. Japanese may be used for a distinct local problem or when Japanese engagement materially outperforms.
3. Use Instagram's supported translation capabilities where appropriate; do not create repetitive clones across languages by default.
4. Add another language only after a winning format has enough signal to justify it.
5. Compare by qualified sessions / CTA / revenue, not reach alone.

## Recommendation / BAN safety gate
A post is blocked when any item below is true:
- guaranteed income, exaggerated earning implication, or fabricated proof;
- copied/reposted media without rights;
- engagement bait or follower/like manipulation;
- repeated near-identical posts or machine-translated duplicates;
- excessive posting/retry loops;
- sensitive or low-quality content likely to lose recommendation eligibility;
- affiliate/sponsor relationship not disclosed;
- destination link is broken, misleading, or does not match the post.

On API/platform errors: stop after a small bounded retry count, diagnose, then resume. Never infinite retry.

## Daily autonomous cycle — one-post default
1. Read yesterday's Instagram UTM traffic and revenue signals.
2. Scan for one high-value audience problem or material AI/platform change.
3. Score candidate against demand, relevance to existing asset, originality, safety, and monetization fit.
4. Pick only the top candidate; no post if nothing clears the quality gate.
5. Select destination: useful article/tool for cold traffic; product page for high intent.
6. Produce one original image/carousel/reel appropriate to the idea.
7. Run safety + recommendation audit.
8. Queue through Buffer with a unique UTM.
9. Record external post ID/URL/status when available.
10. Next cycle learns from qualified sessions, CTA, checkout, purchase.

## Weekly pruning cycle
- Rank posts by: qualified site sessions -> CTA rate -> checkout rate -> purchase/revenue.
- Secondary: saves, shares, profile visits, follows.
- **Expand:** top themes/formats with both audience and commercial signal.
- **Iterate:** reach but low CTA = destination/message mismatch.
- **Kill:** repeated low qualified traffic after enough impressions/tests.
- **Pause monetization:** if commercial posts reduce recommendation/engagement quality.
- Review platform policy/features and monetization eligibility once weekly, not obsessively every day.

## Corporate patterns adapted, not copied
- **Meta/Instagram:** build community + recurring fan value + brand/creator collaboration, not only outbound links.
- **CyberAgent/Ameba pattern:** treat content, distribution, commerce and IP/offer creation as one ecosystem; reuse winning audience insight across formats while keeping each post native to the platform.
- **Dentsu-style creator collaboration principle:** match creator/audience context to the commercial message, clearly disclose advertising, then verify effectiveness rather than judging exposure alone.

## Metrics scoreboard
Primary:
- Instagram-attributed qualified sessions
- CTA clicks
- checkout starts
- purchases
- revenue
- revenue per 1,000 qualified sessions

Secondary:
- profile visits
- saves
- shares
- follows
- reach

Guardrails:
- recommendation/account-status issues
- failed Buffer publishes
- duplicate-content rate
- commercial-post ratio
- broken-link count

## Current next actions
1. Verify first Instagram Buffer post moved from scheduled to published.
2. Read first Instagram UTM session / CTA / checkout data after enough time has elapsed.
3. Next post should be a value-first utility pointing to an existing free Stratum Praxis article/tool rather than another direct product pitch.
4. Check Professional Dashboard eligibility for Creator Marketplace, Gifts, and Subscriptions only when the account has enough activity; do not block distribution on these features.
5. Activate affiliate lane only after a winning content topic identifies a genuinely matching offer.
