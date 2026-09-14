# Completion OS

Completion OS is a small evidence-gate layer for answering two questions across existing assets:

1. **Where is this asset actually stopped?**
2. **What is the single next action that can move it forward?**

It does **not** replace `revenue-os/`, provider-specific deployment logic, `.deployment-status/`, analytics, or payment-provider evidence. It reads/normalizes evidence from those systems and identifies the **first unmet required gate**.

## Why this exists

A source change, successful build, public URL, click, checkout start, and verified payment are different facts. Treating them as interchangeable creates false completion and wasted work.

Completion OS uses a fixed canonical order:

`source → deploy → live → usage → action → payment`

An asset chooses only the gates required for its current target. Examples:

- Production target: `source → deploy → live`
- Utility/value target: add `usage`
- Conversion target: add `action`
- Revenue target: add `payment`

Do not add a later gate while silently skipping an earlier one. If a stage is genuinely irrelevant, leave it out of `required_gates` rather than marking a required stage as optional.

## Evidence states

Each required gate must have one of these states:

- `pass` — explicit evidence proves the gate.
- `fail` — evidence shows the gate is broken or incorrect.
- `blocked` — the gate cannot progress because of a verified external or human boundary.
- `unknown` — there is not enough evidence to claim pass or fail.
- `not_required` — valid only for non-required metadata; a required gate cannot use it.

The evaluator never infers later completion from earlier success.

## Core rule

> Act only on the first unmet required gate. Do not spend effort on later gates until the earlier gate is proven.

If `source=pass`, `deploy=blocked`, and `live=unknown`, the next job is deployment evidence — not more source polishing and not Live claims.

## Revision binding

Current production behavior and deployment of the **intended repository revision** are separate facts.

When a state includes `target_revision`, pass evidence for `source`, `deploy`, and `live` must also include the exact same `revision`. If the revision is missing or different, Completion OS treats that gate as `unknown` rather than reusing stale production evidence.

Example:

```json
{
  "asset_id": "example",
  "target": "production",
  "target_revision": "commit-123",
  "required_gates": ["source", "deploy", "live"],
  "gates": {
    "source": {"status":"pass","revision":"commit-123"},
    "deploy": {"status":"pass","revision":"commit-123"},
    "live": {"status":"pass","revision":"commit-123"}
  }
}
```

A browser test against a public URL can prove that **current production works** without proving which immutable revision produced that behavior. Such evidence belongs in a dated observation record until a deployment/revision marker binds it to the intended revision.

## Input shape

```json
{
  "asset_id": "example",
  "target": "production",
  "required_gates": ["source", "deploy", "live"],
  "gates": {
    "source": {
      "status": "pass",
      "evidence": ["commit:abc123"]
    },
    "deploy": {
      "status": "blocked",
      "evidence": ["provider rate limit"],
      "next_action": "Retry once after the provider limit clears and record the deployed revision.",
      "retry_after": "provider-defined"
    },
    "live": {
      "status": "unknown"
    }
  }
}
```

Run:

```bash
node completion-os/evaluate.mjs path/to/state.json
```

The output includes:

- `target_revision`
- `proven_through`
- `blocker_gate`
- `blocker_status`
- `blocker_evidence`
- `next_action`
- `retry_after`
- `human_gate`
- `later_gates_not_proven`

## Deployment-status adapter

`adapters/github-deploy-status.mjs` converts GitHub commit statuses (including Vercel status contexts) into a Completion OS `deploy` gate.

It distinguishes:

- provider success → `pass`
- real deployment/build failure → `fail`
- provider rate limit / quota / temporary capacity block → `blocked`
- still-running deployment → `unknown` with a no-duplicate-retry instruction
- missing matching context → `unknown`

Fixture mode:

```bash
node completion-os/adapters/github-deploy-status.mjs \
  --file completion-os/fixtures/vercel-rate-limit-status.json \
  --context '^Vercel – money-resilience$'
```

Live GitHub status mode:

```bash
GITHUB_TOKEN=... node completion-os/adapters/github-deploy-status.mjs \
  --repo stratumpraxis/stratum-praxis \
  --sha <commit-sha> \
  --context '^Vercel – money-resilience$'
```

The adapter only reads status evidence. It never retries or starts a deployment itself.

## HTTP Live-check adapter

`adapters/http-live-check.mjs` performs a read-only HTTP/HTML contract check for the `live` stage.

A Live contract can require:

- expected HTTP status
- expected production origin
- exact canonical URL
- required HTML markers
- required script / stylesheet references
- forbidden cross-brand or legacy markers

Current contracts live in:

- `live-specs/money-resilience.json`
- `live-specs/ordlume.json`

Live mode:

```bash
node completion-os/adapters/http-live-check.mjs \
  --spec completion-os/live-specs/money-resilience.json
```

Passing HTTP and static HTML checks is **not** enough to prove a JavaScript-heavy utility is working in a real browser. With `runtime_required: true`, static success remains `status: "unknown"` until browser evidence exists.

## Browser runtime evidence

`adapters/browser-dom-check.mjs` classifies DOM captured from a real browser engine. Contracts in `browser-specs/` verify that JavaScript replaced/extended the static shell and produced the expected runtime elements.

`adapters/webdriver-interaction-check.mjs` uses the W3C WebDriver HTTP protocol without application dependencies. Contracts in `interaction-specs/` mutate one safe browser-local input and verify that the expected result changes.

The production probe workflow is:

`.github/workflows/completion-os-live-browser.yml`

It is read-only with respect to repository and production configuration. Test input mutations happen only inside the disposable browser session and are restored where practical.

The dated production observation from 2026-09-14 is stored at:

`evidence/2026-09-14-production-runtime.json`

At that observation:

- Money Resilience browser boot passed and changing income changed the Core score from 72 to 78.
- OrdLume browser boot passed and checking one readiness item changed the score from 0 to 10.
- The public pages did not expose an immutable deployment revision, so the observation is **revision-unbound** and must not be used to claim that the latest repository commit was deployed.

## Safety and concurrency rules

- Never claim Deploy from build success alone.
- Never claim Live without checking the intended public endpoint and behavior.
- Never claim browser runtime from HTTP/HTML inspection alone.
- Never reuse production evidence for another revision unless the revision is explicitly bound.
- Never claim Usage from page availability alone.
- Never claim Action from a rendered CTA alone.
- Never claim Payment from a click, checkout session, or success redirect alone.
- Respect provider rate limits and repository retry bounds; no infinite retries.
- Do not force-push to solve concurrent main-branch edits.
- Production evidence remains in its provider/owned evidence store (for example `.deployment-status/`); dated cases and observations here are snapshots, not an authority override.
- Historical successful evidence must not be overwritten by assumptions.

## Current MVP

`evaluate.mjs` is intentionally dependency-free and deterministic. It does not mutate production, deploy anything, or query providers by itself. That keeps the decision layer reusable and safe.

`cases/2026-09-14-resilience.json` is a dated decision snapshot. `evidence/2026-09-14-production-runtime.json` is a dated production-behavior observation. Neither should be rewritten when later evidence advances.

The current adapters cover deployment status, HTTP/static Live contracts, browser boot, and a minimal input→result interaction probe. The next meaningful extension is read-only usage/action/payment evidence ingestion, while keeping those source systems authoritative.
