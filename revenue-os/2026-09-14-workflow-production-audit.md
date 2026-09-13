# Workflow / Production Path Audit — 2026-09-14

## Scope

This pass is execution, not redesign.

Goals:
- classify every workflow in `.github/workflows` as KEEP / MERGE / RETIRE / OUT-OF-SCOPE;
- remove duplicate automatic production deploy paths and completed source-mutation one-shots;
- preserve the existing Revenue Routes and site source;
- move toward one production path: `main update -> Build -> Validation -> Deploy -> Live Verification -> Evidence`;
- do not add a new workflow or product feature.

Inventory at audit start: **147 workflow files**.

## Production facts established before change

1. `stratumpraxis.com` currently resolves to GitHub Pages infrastructure and the live response reports `GitHub.com`.
2. The repository also had a second automatic deploy family targeting Cloudflare Pages project `stratum-praxis-site`: `Deploy Free Public Site -> Deploy Evolution Layer -> Deploy Trust SEO Layer -> Deploy Unified Site Kernel`.
3. Those Cloudflare workflows repeatedly built separate temporary `_site` variants and redeployed the same Cloudflare project.
4. `Deploy Free Public Site` was broad enough to trigger on unrelated main changes. On main commit `8593b633185ebd5660b90b89d08dce9bcb3b285c` (`music: add sampler part 08`) it failed, then downstream workflow-run listeners generated multiple skipped runs.
5. `Deploy GitHub Pages Production` is an existing fail-closed GitHub Pages build/deploy workflow: it prepares `_site`, normalizes GA4/internal links, checks production revenue markers, uploads a Pages artifact, and deploys only after build succeeds.
6. GitHub's repository-managed dynamic `pages build and deployment` is also currently active. That setting is outside `.github/workflows` and cannot be changed by this cleanup commit.

## Classification definitions

- **KEEP** — current responsibility remains useful and bounded.
- **MERGE** — useful responsibility overlaps the canonical production path; the duplicate automatic executor is retired in this pass and its durable responsibility is represented by the retained production build/validation/live-verification path or source itself.
- **RETIRE** — completed one-shot, dated patch, diagnosis, or source-mutating rollout tool. Its materialized source/evidence remains in Git history/current source; the executable workflow is removed.
- **OUT-OF-SCOPE** — not part of the production-site deploy path in this pass (social, media, publishing, workers/APIs, market/revenue operations, external project lanes). Left untouched to avoid unrelated breakage.

## KEEP (17)

- `auto-merge-internal-prs.yml`
- `common-revenue-core-allocator-nba-check.yml`
- `common-revenue-core-decision-evidence-check.yml`
- `common-revenue-core-economics-check.yml`
- `common-revenue-core-identity-reconciliation-check.yml`
- `common-revenue-core-ingestion-check.yml`
- `common-revenue-core-ledger-check.yml`
- `common-revenue-core-production-loop-check.yml`
- `common-revenue-core-resilience-check.yml`
- `common-revenue-core-safe-execution-check.yml`
- `common-revenue-core-schema-check.yml`
- `deploy-github-pages-production.yml`
- `indexnow-signal.yml`
- `spend-roi-revenue-regression.yml`
- `verify-agent-lab-revenue.yml`
- `verify-stratumpraxis-pages.yml`
- `verify-systems-library.yml`

## MERGE (4)

- `deploy-evolution-layer.yml`
- `deploy-free-public-site.yml`
- `deploy-trust-seo-layer.yml`
- `deploy-unified-site-kernel.yml`

Merge disposition:
- `deploy-free-public-site.yml`: retire the automatic Cloudflare deploy executor; production deploy belongs to GitHub Pages.
- `deploy-evolution-layer.yml`: retire chained shadow deployment; do not maintain a second deployed copy of the site.
- `deploy-trust-seo-layer.yml`: retire chained shadow deployment and its no-op schedule; durable SEO/trust assets must exist in source or canonical build.
- `deploy-unified-site-kernel.yml`: retire chained shadow deployment; build/validation responsibility stays with the canonical GitHub Pages path and retained verification workflows.

## RETIRE (27)

- `add-agent-control-auditor-to-site.yml`
- `apply-agent-roi-inbound-p0-20260913.yml`
- `apply-b2b-experience-2026.yml`
- `apply-brand-family.yml`
- `apply-cross-agent-hero-conversion-20260913.yml`
- `apply-external-monetization.yml`
- `apply-home-agent-cross-agent-direct-20260913.yml`
- `apply-inbound-revenue.yml`
- `apply-legacy-public-asset-notice-20260910.yml`
- `conversion-path-measurement-once.yml`
- `cross-agent-static-checkout-route-once.yml`
- `diagnose-stratum-domain-route-20260913.yml`
- `diagnose-stratum-live-origin-20260913.yml`
- `fix-home-search-snippet.yml`
- `fix-posthog-identity-continuity-once.yml`
- `fix-revenue-router-search.yml`
- `patch-agents-current-revenue-20260913.yml`
- `patch-cross-agent-agent-lab-choice.yml`
- `patch-cross-agent-conversion.yml`
- `patch-cross-agent-video-demo.yml`
- `promote-cross-agent-home-once.yml`
- `qa-posthog-identity-continuity-once.yml`
- `remove-home-gmail-revenue-exit-20260913.yml`
- `source-ga4-normalize-once.yml`
- `tighten-cross-agent-hero-20260913.yml`
- `verify-cross-agent-revenue-route-once.yml`
- `wire-cross-agent-attribution-once.yml`

## OUT-OF-SCOPE (99)

- `acquisition-engine-check.yml`
- `agent-control-auditor-social.yml`
- `ai-stack-five-posts-20260827.yml`
- `audit-cross-agent-v3-buffer-once.yml`
- `autonomous-blogger.yml`
- `buffer-channel-audit-once.yml`
- `buffer-connection-check.yml`
- `buffer-post-status-check.yml`
- `claude-bridge-validate.yml`
- `cross-agent-video-visual-qa-once.yml`
- `deploy-ai-consultant-worker.yml`
- `deploy-x402-agent-api.yml`
- `distribution-buffer.yml`
- `distribution-launch-once.yml`
- `forwelle-ab-metrics-0735-20260902.yml`
- `forwelle-abc-metrics-0742-20260902.yml`
- `forwelle-buffer-channel-audit-20260902.yml`
- `forwelle-buffer-disconnected-channel-audit-20260902.yml`
- `forwelle-buffer-evidence-once.yml`
- `forwelle-direct-public-insert-20260902.yml`
- `forwelle-direct-short-20260902.yml`
- `forwelle-hook-b-short-20260902.yml`
- `forwelle-horizontal.yml`
- `forwelle-live-metrics-once.yml`
- `forwelle-motion-c-short-20260902.yml`
- `forwelle-owned-distribution-once.yml`
- `forwelle-production-short.yml`
- `forwelle-public-metrics-snapshot-20260902.yml`
- `forwelle-public-watch-metrics-20260902.yml`
- `forwelle-publish-ai-wasnt-bottleneck-once.yml`
- `forwelle-revenue-video-metrics.yml`
- `forwelle-revenue-video-operator.yml`
- `forwelle-rss-metrics-once.yml`
- `forwelle-stratum-teaser-once.yml`
- `forwelle-title-test-once.yml`
- `market-ingest.yml`
- `music-stock-pack-v1-instagram-buffer.yml`
- `music-stock-pack-v1-instagram-evidence.yml`
- `music-stock-pack-v1-pinterest-official.yml`
- `music-stock-pack-v1-pinterest-publish.yml`
- `music-stock-pack-v1-tiktok-evidence.yml`
- `music-stock-pack-v1-tiktok-publish.yml`
- `pinterest-production-short.yml`
- `publish-cross-agent-instagram-once.yml`
- `publish-cross-agent-instagram-permission-v4-once.yml`
- `publish-cross-agent-tiktok-once.yml`
- `publish-devto.yml`
- `publish-ghost.yml`
- `remotion-smoke.yml`
- `render-ai-stack-campaign-videos.yml`
- `render-cross-agent-permission-v4-once.yml`
- `render-cross-agent-product-video.yml`
- `render-music-stock-pack-instagram.yml`
- `render-social-card.yml`
- `render-structureflow-note-ad.yml`
- `render-vector-faceless-truth-once.yml`
- `render-vector-faceless-truth-v2.yml`
- `render-vector-faceless-truth-v3.yml`
- `revenue-safety-loop.yml`
- `revenue-strike-launch.yml`
- `stratum-ai-saas-waste-wave1-hook-publish.yml`
- `stratum-ai-saas-waste-wave1-hook-verify.yml`
- `stratum-ai-saas-waste-wave1-ladder-publish.yml`
- `stratum-ai-saas-waste-wave1-numbers-publish.yml`
- `stratum-ai-saas-waste-wave1-numbers-verify.yml`
- `stratum-ai-saas-waste-wave1-queue.yml`
- `stratum-bluesky-publish.yml`
- `stratum-buffer-channel-audit.yml`
- `stratum-devto-publish.yml`
- `stratum-instagram-publish.yml`
- `stratum-pinterest-board.yml`
- `stratum-pinterest-discover.yml`
- `stratum-publication-hub.yml`
- `stratum-publishing-preflight.yml`
- `stratum-publishing-readiness.yml`
- `stratum-revenue-video-wave-20260913.yml`
- `stratum-social-evidence.yml`
- `stratum-social-now.yml`
- `stratum-social-verify.yml`
- `stratum-tiktok-direct-publish.yml`
- `stratum-tiktok-friendly-voice-publish-once.yml`
- `stratum-tiktok-friendly-voice-publish-v2.yml`
- `stratum-tiktok-more-agents-publish-once.yml`
- `stratum-tiktok-revenue-publish.yml`
- `stratum-workflow-audit-video-publish-once.yml`
- `stratum-workflow-audit-video-verify.yml`
- `t2000-revenue-radar.yml`
- `tiktok-stratum-direct-publish.yml`
- `trend-video-factory.yml`
- `trend-video-status.yml`
- `vector-visual-qa-artifact.yml`
- `verify-cross-agent-instagram-once.yml`
- `verify-cross-agent-instagram-permission-v4-once.yml`
- `verify-cross-agent-tiktok-post-once.yml`
- `verify-stratum-tiktok-friendly-voice.yml`
- `verify-stratum-tiktok-more-agents.yml`
- `youtube-auth-check.yml`
- `youtube-private-upload-smoke.yml`
- `youtube-scope-diagnostic-once.yml`

## Change record

### Change 1 — remove duplicate Cloudflare production chain

**Before**
- main changes could start `Deploy Free Public Site`.
- a successful run could cascade through Evolution -> Trust SEO -> Unified Site Kernel.
- all four targeted the same Cloudflare Pages project while the custom domain was actually served by GitHub Pages.
- unrelated changes could still create failure/skipped-run noise.

**Change**
- remove the four MERGE workflow files from `.github/workflows`.
- no HTML, JS, CSS, CNAME, checkout URL, product page, analytics source, or Revenue Route is changed.

**Verification**
- confirm the four workflow files are absent from the resulting main tree.
- confirm `deploy-github-pages-production.yml` and `verify-stratumpraxis-pages.yml` remain.
- confirm current source Revenue Route markers remain unchanged.
- confirm live custom domain still resolves through GitHub Pages.

**Result**
- automatic Cloudflare shadow deploy chain is removed from the repository workflow graph.
- a main commit can no longer start the four-workflow Cloudflare cascade.

### Change 2 — retire completed source-mutating / diagnostic one-shots

**Before**
- dated `apply-*`, `patch-*`, `fix-*`, diagnosis and selected `*-once` workflows remained executable after their source changes had already been materialized.
- several had write/push behavior and could create new commits if re-triggered.

**Change**
- remove only the high-confidence RETIRE set listed above.
- preserve all current source files and Git history.
- leave social/media/publishing/worker lanes OUT-OF-SCOPE even when their filename contains `once`, because their lifecycle is not part of this production-site cleanup.

**Verification**
- confirm each RETIRE path is absent from the resulting main tree.
- confirm no Revenue Route source file is deleted or rewritten by this commit.

**Result**
- fewer accidental re-entry points and fewer self-mutating workflow paths without altering live offers.

### Change 3 — preserve the canonical GitHub Pages production workflow

**Before**
- GitHub Pages production workflow and repository-managed Pages deployment both existed alongside the Cloudflare chain.

**Change**
- keep `deploy-github-pages-production.yml` as the intended canonical workflow-controlled production path.
- keep `verify-stratumpraxis-pages.yml` as live route verification.
- do not create another workflow.

**Verification**
- retained workflow files are present after cleanup.
- subsequent relevant production-source changes should use the existing GitHub Pages build/validation/deploy workflow.
- live verification remains fail-closed with HTTP/content checks.

**Result**
- `.github/workflows` now has one intended production deploy executor instead of five.
- one repository-level duplication remains outside this commit: GitHub's dynamic `pages build and deployment` is still enabled by Pages settings.

## Current intended production path

`main update`
-> `Deploy GitHub Pages Production / build`
-> source normalization + fail-closed production marker validation
-> Pages artifact
-> `Deploy GitHub Pages Production / deploy`
-> `Verify Stratum Praxis Pages`
-> Actions run/deployment evidence

Revenue truth remains separate: `Actions success != Revenue`. Payment/contract/reward evidence is still required for Revenue Evidence.

## Unresolved item

**GitHub Pages source setting**: repository-managed dynamic `pages build and deployment` is still active in addition to the retained workflow-controlled Pages deploy. This is a repository Pages setting, not a workflow file. The target final state is to use the retained `Deploy GitHub Pages Production` workflow as the only Pages deploy executor; the dynamic branch-source deployment must be disabled/switched at repository settings level.

Until that setting is changed, the workflow-file cleanup removes the Cloudflare duplicate chain and one-shot noise, but cannot truthfully claim there is only one GitHub Pages executor.

## Guardrails after this pass

- no new production deploy workflow without replacing an existing responsibility;
- no permanent one-shot source mutator after its change is materialized;
- no production deploy triggered by unrelated project/media changes unless those files are actually part of the public site artifact;
- no shadow origin that can diverge from `stratumpraxis.com`;
- Revenue Route changes must preserve verified checkout destinations and be followed by live verification;
- every future production automation change records Before -> Change -> Verification -> Result.
