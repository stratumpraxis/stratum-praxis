# Social Distribution Stack — 2026-08-26

## Decision

Use a layered stack rather than multiple autonomous publishers.

- **Buffer Free** — primary and only autonomous publisher for Instagram, TikTok, and YouTube.
- **Metricool Free** — adopt as the secondary analytics / MCP layer after account OAuth. Publishing remains disabled in the operating policy to prevent duplicate posts.
- **Vista Social** — defer. Reconsider when shared inbox, DM automation, approval workflow, or team operations become a material bottleneck and the paid-plan economics are justified.
- **Publer** — defer. Its Free plan overlaps heavily with Buffer and its public API is not available to Free/Professional accounts as of 2026-08-26.

## Why this structure

The current bottleneck is not the number of social schedulers. It is reliable distribution, safe autonomous execution, measurement, and learning from revenue outcomes. Adding multiple active publishers would increase credential sprawl, duplicate-post risk, state divergence, and account-safety risk.

## Buffer role

Official sources reviewed 2026-08-26:
- Public API announcement: https://buffer.com/resources/buffer-public-api/
- API Help / limits: https://support.buffer.com/article/643-buffer-api
- Developer overview: https://buffer.com/developers
- API docs: https://developers.buffer.com/

Current useful capabilities:
- GraphQL public API and official MCP/CLI support.
- API available on Free plan.
- Free API allowance is sufficient for the current Instagram/TikTok/YouTube lane.
- Existing repository implementation already has channel discovery, video publishing, AI-generated metadata, idempotency ledger, connection checks, and fail-closed video QA.

Operational rule: new Buffer API features are adopted only when they create a concrete measurable gain and pass safety / duplication / compatibility review. New capability does not automatically mean new production dependency.

## Metricool role

Official sources reviewed 2026-08-26:
- Pricing: https://metricool.com/pricing/
- MCP: https://help.metricool.com/en/article/metricool-mcp-server-connect-your-ai-to-metricool-1mlbmxj/
- API access: https://help.metricool.com/en/article/api-access-to-metricool-19xq9kq/

Useful differentiation at current scale:
- Free: one brand, up to 20 scheduled posts/month, 30-day analytics, competitor tracking, AI assistant, and Metricool MCP.
- MCP is available on Free and can expose analytics/metrics and social-management operations to compatible AI clients.
- Full REST API / Make / Zapier access is plan-dependent and is not required for the current measurement role.

Adoption mode:
1. Create/login to one Metricool Free account.
2. Create one brand.
3. Connect the same Instagram, TikTok, and YouTube profiles.
4. Connect Metricool MCP through OAuth to the trusted AI client when desired.
5. Keep Metricool publishing disabled in `distribution/provider-policy.json` until Buffer is intentionally retired or a controlled fallback test is approved.

## Vista Social role

Official sources reviewed 2026-08-26:
- Pricing: https://vistasocial.com/pricing/
- API docs: https://docs.vistasocial.com/
- Make integration / plan notes: https://support.vistasocial.com/hc/en-us/articles/39714513075867-Do-I-need-the-API-add-on-to-use-Zapier-Make-or-N8N

Differentiation:
- Stronger team workflow, approvals, inbox / engagement automation, API/MCP/integration options, and broader social-management surface.
- Current paid entry economics are disproportionate to the present single-operator, zero/low-cost distribution objective.

Decision: do not create an account now. Reconsider only when the differentiated workflow has a real owner and measurable expected return.

## Publer role

Official sources reviewed 2026-08-26:
- Free plan: https://publer.com/help/en/article/what-does-the-free-plan-include-15znx1p/
- Pricing: https://publer.com/pricing
- Public API eligibility: https://publer.com/help/en/article/does-publer-have-a-public-api-194nknf/

Differentiation:
- Low-cost scheduling and broad social support.
- Free tier can manage three accounts, but this overlaps the current Buffer Free three-channel setup.
- Public API access is not available to the Free / Professional path at the current eligibility rules.

Decision: do not create an account now. Keep as a cold-standby candidate only.

## Safety architecture

Autonomous path:

Signal / content decision → asset rights verification → `trend-video-engine/qa.py` → `distribution/distribution-safety-auditor.mjs` → Buffer official API → publication ledger → analytics / revenue measurement.

Hard rules:
- One autonomous publisher per social service.
- No automatic retry after an unknown external state.
- Copyright-dependent media and real-person likeness stay out of the autonomous lane.
- Factual sources and commercial-use rights must be verified.
- AI-generated labeling stays enabled where supported/required.
- Secondary tools begin read/analytics-first; publishing is a promoted privilege, not a default.

## Cross-page context learning — 2026-08-27

A page or agent failing to see prior execution evidence must not be treated as proof that the underlying connection, asset, or workflow is broken. Classify such states as **unverified in the current context**, not **missing** or **failed**, until the source of truth is checked.

The safety behavior itself was correct and should be preserved: when publication state, channel state, or asset suitability cannot be verified, fail closed rather than improvising. The improvement is not to weaken the gate; it is to improve cross-page handoff and source-of-truth lookup so already-completed work is recognized earlier.

Operational rule:
- `unknown` / `not visible here` ≠ `not configured`.
- Check existing docs, repository state, publication ledger, analytics, and prior verified execution before rebuilding or declaring a blocker.
- Never replace a verified existing mechanism merely because another page lacks context.
- Keep Safety Auditor authority intact; improve context retrieval around it.

## Human-only gate still required

Metricool account creation/login and social OAuth authorization require the external Metricool / platform UI. No Metricool account-registration evidence was found in the connected Gmail search on 2026-08-26. This gate must not be represented as completed until OAuth succeeds.
