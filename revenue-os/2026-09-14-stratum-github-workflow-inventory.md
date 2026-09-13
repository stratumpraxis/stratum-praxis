# Stratum GitHub Workflow Inventory — 2026-09-14

Status: **Phase 1 inventory / deletion freeze**  
Scope: `stratumpraxis/stratum-praxis`  
Branch: `ops/stratum-github-stabilization-20260914`

## Safety boundary

No workflow is deleted by this inventory. A `RETIRE` or `OUT-OF-SCOPE` label below is a **provisional disposition**, not permission to delete. Before deletion, the workflow source, trigger, latest run, cross-workflow references, production effect, secret usage, and whether its result is already landed on `main` must be verified.

Site/product strategy, MARKET strategy, Stripe destinations, buyer routes, analytics contracts, SEO structure, and public product content are outside this cleanup scope.

## Current production fact

A fresh live-origin diagnostic on 2026-09-14 found:

- apex A records: GitHub Pages IPs `185.199.108.153`–`185.199.111.153`
- authoritative DNS: Cloudflare nameservers
- `www` CNAME: `stratumpraxis.github.io`
- live HTTP server: `GitHub.com`
- `x-github-request-id`: present
- `cf-ray`: absent

Therefore **`https://stratumpraxis.com/` is currently served by GitHub Pages**. Cloudflare is DNS authority, but the four Cloudflare Pages deployment workflows are not the current custom-domain production origin.

Canonical production candidate: `.github/workflows/deploy-github-pages-production.yml`.

Do not retire the Cloudflare workflows until their useful transformation/quality-gate logic has been reconciled into the canonical GitHub Pages build and the live custom domain passes verification.

## Confirmed technical bottlenecks

1. Cloudflare deployment chain currently exists as:
   `Deploy Free Public Site → Deploy Evolution Layer → Deploy Trust SEO Layer → Deploy Unified Site Kernel`.
2. Each stage rebuilds `_site`; multiple stages deploy the same Cloudflare Pages project.
3. A fresh diagnostic-only root-file change unexpectedly launched `Deploy Free Public Site`, proving the first deploy workflow's push trigger is too broad.
4. That Cloudflare run uploaded and deployed successfully, then failed because the exact deployment URL root returned HTTP 404 during verification. Treat this as **verification-contract failure after successful deploy**, not deployment failure.
5. GitHub Pages has its own independent production deployment path and is the live custom-domain origin.
6. `main` is currently **unprotected**; no required checks are enforced.
7. `actions/checkout@v4` emitted the Node 20 deprecation/forced-Node-24 warning in a current run. Versions must be updated only after official-release verification.
8. A Music Stock Pack commit is currently present on Stratum `main`, confirming cross-project material still reaches this repository.

## High-confidence inventory

| Workflow | Role | Trigger | Dependencies | Production impact | Secrets / elevated permission | Latest observed state | Class | Reason |
|---|---|---|---|---|---|---|---|---|
| `deploy-github-pages-production.yml` | Build + GitHub Pages deploy | scoped push to `main`; manual | site source, CNAME, Pages | **LIVE PRODUCTION** | `pages:write`, `id-token:write`; no secret value in file | source verified | KEEP | Live custom-domain origin; canonical pipeline candidate |
| `deploy-free-public-site.yml` | Cloudflare Pages build/deploy + route verification | broad push; manual | Cloudflare Pages project | non-canonical duplicate deploy | Cloudflare token/account ID | fresh run: deploy success, preview verify 404/failure | MERGE | Preserve useful checks, remove duplicate deploy after reconciliation |
| `deploy-evolution-layer.yml` | inject evolution/growth UI + Cloudflare deploy | `workflow_run` after Free Public; manual | previous deploy, Cloudflare | duplicate deploy | Cloudflare credentials | source verified | MERGE | transformation belongs in canonical build, not another deploy |
| `deploy-trust-seo-layer.yml` | trust/SEO transform, sitemap checks + Cloudflare deploy | `workflow_run`; manual; daily schedule | Evolution layer, route manifest, Cloudflare | duplicate deploy + audit | Cloudflare credentials | source verified | MERGE | keep audit/SEO logic; collapse deployment stage |
| `deploy-unified-site-kernel.yml` | kernel/motion/cinematic + market-contract quality gates + Cloudflare deploy | `workflow_run`; manual | Trust SEO, route manifest, analytics/terms | duplicate deploy | Cloudflare credentials | recent workflow_run often skipped amid unrelated changes | MERGE | richest quality gate; move into canonical production pipeline |
| `revenue-safety-loop.yml` | read-only revenue path health + evidence | relevant PR/push; daily; manual | public site, worker, referenced Stripe links | protects revenue path; no deploy | `contents:read`, `issues:write` | source verified | KEEP | bounded retries, artifacts, de-duplicated escalation; no destructive recovery |
| `acquisition-engine-check.yml` | acquisition validation/reporting only | relevant push/PR; manual | acquisition/distribution files | no production mutation | `contents:read` | source verified | KEEP | explicitly forbids auto-publish/account creation and production-lane mutation |
| `market-ingest.yml` | MARKET signal runtime/state ingest | hourly; dispatch; bounded push/PR; manual | GitHub/PostHog/Stripe/Supabase | revenue intelligence runtime | `contents:read`, `id-token:write`; secret refs for data providers | source verified | KEEP | business runtime, not deploy noise; revenue evidence contract present |
| `indexnow-signal.yml` | search notification | scoped push; manual | live custom domain | search signal only | no explicit elevated permission | source verified | MERGE | preserve IndexNow, replace hard-coded URL list with sitemap/manifest and run after production success |
| `diagnose-stratum-live-origin-20260913.yml` | one-time origin diagnostic | trigger-file push | DNS/live HTTP | writes sanitized evidence only | `contents:write` | fresh run success | RETIRE | result now established; date-stamped write-back diagnostic should not remain active |
| `deploy-ai-consultant-worker.yml` | worker deployment | pending source/run verification | worker runtime | potentially production | PENDING | PENDING | KEEP | potentially active production runtime; deletion prohibited until verified |
| `deploy-x402-agent-api.yml` | API deployment | pending source/run verification | API runtime | potentially production | PENDING | PENDING | KEEP | potentially active production runtime; deletion prohibited until verified |
| `spend-roi-revenue-regression.yml` | revenue regression check | pending | spend/ROI routes | validation | PENDING | PENDING | KEEP | directly protects commercial route; verify before any consolidation |
| `verify-agent-lab-revenue.yml` | revenue verification | pending | Agent Lab route | validation | PENDING | PENDING | KEEP | direct revenue verification candidate |
| `verify-stratumpraxis-pages.yml` | site verification | pending | public site | validation | PENDING | PENDING | KEEP | candidate for minimal post-deploy verification; inspect overlap |
| `verify-systems-library.yml` | systems-library verification | pending | systems routes | validation | PENDING | PENDING | KEEP | preserve until overlap with canonical verification is proven |

## Full provisional classification

For every workflow below, fields not already captured in the high-confidence table remain **PENDING SOURCE + RUN + REFERENCE VERIFICATION**. Shared rule: no file in this section may be deleted solely because of its filename or provisional class.

### KEEP — active-purpose candidates

Shared metadata until individually verified: trigger=PENDING; dependencies=PENDING; production impact=potential validation/runtime; secrets=PENDING; latest run=PENDING.

- `revenue-safety-loop.yml`
- `acquisition-engine-check.yml`
- `market-ingest.yml`
- `deploy-github-pages-production.yml`
- `deploy-ai-consultant-worker.yml`
- `deploy-x402-agent-api.yml`
- `spend-roi-revenue-regression.yml`
- `verify-agent-lab-revenue.yml`
- `verify-stratumpraxis-pages.yml`
- `verify-systems-library.yml`
- `common-revenue-core-production-loop-check.yml` — provisional canonical candidate within the fragmented common-revenue-core checks

### MERGE — purpose may remain, workflow fragmentation should not

Shared metadata until individually verified: trigger=PENDING except confirmed deploy chain; dependencies=PENDING; production impact=possible; secrets=PENDING; latest run=PENDING. Final deletion is blocked until replacement coverage exists and passes.

- `deploy-free-public-site.yml`
- `deploy-evolution-layer.yml`
- `deploy-trust-seo-layer.yml`
- `deploy-unified-site-kernel.yml`
- `indexnow-signal.yml`
- `distribution-buffer.yml`
- `stratum-buffer-channel-audit.yml`
- `stratum-publishing-preflight.yml`
- `stratum-publishing-readiness.yml`
- `stratum-social-evidence.yml`
- `stratum-social-now.yml`
- `stratum-social-verify.yml`
- `buffer-connection-check.yml`
- `buffer-post-status-check.yml`
- `publish-devto.yml`
- `publish-ghost.yml`
- `stratum-devto-publish.yml`
- `agent-control-auditor-social.yml`
- `common-revenue-core-allocator-nba-check.yml`
- `common-revenue-core-decision-evidence-check.yml`
- `common-revenue-core-economics-check.yml`
- `common-revenue-core-identity-reconciliation-check.yml`
- `common-revenue-core-ingestion-check.yml`
- `common-revenue-core-ledger-check.yml`
- `common-revenue-core-resilience-check.yml`
- `common-revenue-core-safe-execution-check.yml`
- `common-revenue-core-schema-check.yml`
- `pinterest-production-short.yml`
- `stratum-ai-saas-waste-wave1-hook-publish.yml`
- `stratum-ai-saas-waste-wave1-hook-verify.yml`
- `stratum-ai-saas-waste-wave1-ladder-publish.yml`
- `stratum-ai-saas-waste-wave1-numbers-publish.yml`
- `stratum-ai-saas-waste-wave1-numbers-verify.yml`
- `stratum-ai-saas-waste-wave1-queue.yml`
- `stratum-bluesky-publish.yml`
- `stratum-instagram-publish.yml`
- `stratum-pinterest-board.yml`
- `stratum-pinterest-discover.yml`
- `stratum-publication-hub.yml`
- `stratum-tiktok-direct-publish.yml`
- `stratum-tiktok-friendly-voice-publish-v2.yml`
- `stratum-tiktok-revenue-publish.yml`
- `stratum-workflow-audit-video-verify.yml`
- `tiktok-stratum-direct-publish.yml`
- `trend-video-factory.yml`
- `trend-video-status.yml`
- `verify-stratum-tiktok-friendly-voice.yml`
- `verify-stratum-tiktok-more-agents.yml`

Rationale: these appear to represent repeated checks/publishers for the same functional families. The target is not to remove distribution, evidence, or validation; it is to replace duplicated channel/campaign/runtime workflows with a smaller guarded set. Social identity must be exact-account/fail-closed before any publisher is retained as autonomous.

### RETIRE — provisional completed/test/one-shot candidates

Shared metadata until individually verified: role=one-shot, dated migration/patch, campaign/test/diagnostic, or superseded helper inferred from filename; trigger=PENDING; dependencies=PENDING; production impact=PENDING; secrets=PENDING; latest run=PENDING. **Deletion requires proof that effects are already on `main` and no live workflow references the file.**

- `add-agent-control-auditor-to-site.yml`
- `ai-stack-five-posts-20260827.yml`
- `apply-agent-roi-inbound-p0-20260913.yml`
- `apply-b2b-experience-2026.yml`
- `apply-brand-family.yml`
- `apply-cross-agent-hero-conversion-20260913.yml`
- `apply-external-monetization.yml`
- `apply-home-agent-cross-agent-direct-20260913.yml`
- `apply-inbound-revenue.yml`
- `apply-legacy-public-asset-notice-20260910.yml`
- `audit-cross-agent-v3-buffer-once.yml`
- `buffer-channel-audit-once.yml`
- `conversion-path-measurement-once.yml`
- `cross-agent-static-checkout-route-once.yml`
- `cross-agent-video-visual-qa-once.yml`
- `diagnose-stratum-domain-route-20260913.yml`
- `diagnose-stratum-live-origin-20260913.yml`
- `distribution-launch-once.yml`
- `fix-home-search-snippet.yml`
- `fix-posthog-identity-continuity-once.yml`
- `fix-revenue-router-search.yml`
- `patch-agents-current-revenue-20260913.yml`
- `patch-cross-agent-agent-lab-choice.yml`
- `patch-cross-agent-conversion.yml`
- `patch-cross-agent-video-demo.yml`
- `promote-cross-agent-home-once.yml`
- `publish-cross-agent-instagram-once.yml`
- `publish-cross-agent-instagram-permission-v4-once.yml`
- `publish-cross-agent-tiktok-once.yml`
- `qa-posthog-identity-continuity-once.yml`
- `remove-home-gmail-revenue-exit-20260913.yml`
- `render-cross-agent-permission-v4-once.yml`
- `source-ga4-normalize-once.yml`
- `stratum-revenue-video-wave-20260913.yml`
- `stratum-tiktok-friendly-voice-publish-once.yml`
- `stratum-tiktok-more-agents-publish-once.yml`
- `stratum-workflow-audit-video-publish-once.yml`
- `tighten-cross-agent-hero-20260913.yml`
- `verify-cross-agent-instagram-once.yml`
- `verify-cross-agent-instagram-permission-v4-once.yml`
- `verify-cross-agent-revenue-route-once.yml`
- `verify-cross-agent-tiktok-post-once.yml`
- `wire-cross-agent-attribution-once.yml`
- `youtube-scope-diagnostic-once.yml`
- `auto-merge-internal-prs.yml`
- `autonomous-blogger.yml`
- `claude-bridge-validate.yml`
- `remotion-smoke.yml`
- `render-ai-stack-campaign-videos.yml`
- `render-cross-agent-product-video.yml`
- `render-social-card.yml`
- `render-structureflow-note-ad.yml`
- `revenue-strike-launch.yml`
- `t2000-revenue-radar.yml`
- `youtube-auth-check.yml`
- `youtube-private-upload-smoke.yml`

### OUT-OF-SCOPE — belongs to an independently operated project/family unless proven needed by Stratum

Shared metadata until individually verified: role=inferred from project prefix/name; trigger=PENDING; dependencies=PENDING; production impact=must be proven; secrets=PENDING; latest run=PENDING. No migration is attempted here; no deletion until replacement/ownership and current usage are verified.

**Forwelle family**
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

**Vector family**
- `render-vector-faceless-truth-once.yml`
- `render-vector-faceless-truth-v2.yml`
- `render-vector-faceless-truth-v3.yml`
- `vector-visual-qa-artifact.yml`

**Music Stock family**
- `music-stock-pack-v1-tiktok-evidence.yml`
- `music-stock-pack-v1-tiktok-publish.yml`
- `render-music-stock-pack-instagram.yml`

## Canonical deploy consolidation target

Target shape after verification, not yet implemented:

`main/source → one build → Evolution/Growth/Trust/Kernel transforms → quality gates → GitHub Pages deploy → live stratumpraxis.com verification → IndexNow/search notification`

The four Cloudflare stages are currently classified `MERGE`, not deleted. Their transformation and quality-gate contracts must be compared line-by-line against the GitHub Pages build before consolidation.

## Security / permissions findings so far

- Public repository assumption confirmed for cleanup policy.
- Current `main` branch metadata reports no branch protection.
- Core workflows reviewed so far do not expose secret values in source; they reference GitHub Secrets/Vars where required.
- `Revenue Safety Loop` has `issues:write` because it creates a de-duplicated issue only after final health failure.
- `MARKET external signal ingest` uses `id-token:write` for short-lived OIDC state access, while its manual/dispatch path also references provider/Supabase secrets. Do not weaken this runtime without a replacement.
- The date-stamped origin diagnostic has `contents:write` solely to commit sanitized status and is a retirement candidate now that origin is established.
- No secret values were written by this inventory.

## Next verification gates

1. Inspect all four deploy workflows against `deploy-github-pages-production.yml` and produce a transformation/quality-gate reconciliation matrix.
2. Inspect latest runs/references for all `OUT-OF-SCOPE` families before stopping anything.
3. Inspect every `*-once`, dated apply/patch/diagnose/fix workflow and confirm its result exists on `main` before deletion.
4. Reduce broad deploy push triggers; a diagnostic trigger must never launch a site deploy again.
5. Consolidate social publishing only after exact expected account identity is enforceable per platform.
6. Move IndexNow URL generation to current sitemap/route manifest and run it after successful production verification.
7. Add minimal `main` protection if repository administration tooling/permissions permit it; otherwise record the exact manual setting needed.
8. Verify official current GitHub Action releases before replacing Node-20-targeting action versions.

## Evidence rule

Workflow count reduction is not success by itself. Success is one understandable production path, materially fewer duplicate runs/skips/failures, intact revenue/SEO/analytics routes, preserved monitoring, and Git history retaining evidence of retired automation.
