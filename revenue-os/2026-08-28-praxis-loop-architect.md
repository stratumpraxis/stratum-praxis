# Praxis Loop Architect + Claude Revenue Loop

Date: 2026-08-28
Status: implementation branch

## Why this exists

Recent market/reference signals repeatedly point to five adjacent demand areas: higher-quality AI-built websites, Claude Code workflow automation, model/task routing, AI ad/creative production, and reusable skills/plugins. These are useful only when connected to a measurable business loop rather than treated as isolated AI tricks.

Praxis Loop Architect is therefore a **free decision tool**, not a new paid SKU. It routes one bottleneck into the right execution pattern and then hands qualified users to existing Stratum Praxis assets such as the AI Agent ROI Calculator, Revenue Router, and $499 Workflow Audit.

## Original combination

The tool combines:

1. Workflow opportunity scoring
2. Revenue-bottleneck routing
3. Claude-first execution architecture
4. Model-tier routing by task/risk
5. Human approval boundaries
6. Creative / website / analytics / distribution lanes
7. Measurement and amplification rules

The differentiator is not “AI can automate this.” The result must answer:

- what should run autonomously,
- what should remain human-approved,
- what Claude pattern fits,
- what metric decides success,
- where the output goes next,
- and when the loop must stop.

## Claude capability basis

Current Anthropic guidance supports the following patterns and they map cleanly to the existing Stratum Praxis operating model:

- **Agent Skills**: package reusable instructions, scripts, and resources as durable procedural knowledge.
- **Subagents / agent teams**: delegate bounded specialist work rather than asking one context to own every task.
- **Hooks**: automatically run tests, linting, validation, or other checks at defined points.
- **Background tasks**: keep long-running work active while the main agent proceeds.
- **Checkpoints**: preserve recoverability during longer autonomous work.
- **Claude Agent SDK**: build custom agentic experiences with the same core patterns used by Claude Code.
- **Claude Code GitHub Action**: respond to issues/PRs or run explicit automations in GitHub, with configurable tool permissions and Anthropic/API/OAuth authentication.

Operational rule: use these capabilities to increase verified throughput, not autonomy for its own sake.

## Revenue loop contract

`Signal -> Evidence check -> Bottleneck -> Route -> Execute -> Verify -> Authorized ship -> Measure -> Amplify / revise / stop`

Every recurring Claude task must carry:

- primary revenue metric,
- evidence source,
- owner,
- allowed tools,
- forbidden actions,
- stop conditions,
- destination asset,
- verification step.

## Claude lane design

### 1. Demand Scout

Reads approved public/owned signals or existing Acquisition Intelligence output. It identifies a demand pattern and writes one bounded candidate. It does not create products or publish.

### 2. Asset Router

Checks whether the opportunity can be absorbed by an existing page/tool/product. New asset creation is a last resort.

### 3. Build Operator

For code/site work, uses Claude Code with a project skill, specialist subagent where useful, checkpoints, and test/lint hooks. Produces a branch/PR, not an automatic production merge.

### 4. Creative Operator

Turns a validated angle into a creative brief, claim boundary, shot/UI plan, variants, and delivery spec. Rendering may be handed to an approved creative tool. Public release remains on the authorized distribution lane.

### 5. Revenue QA

Checks destination URL, CTA, checkout, analytics, factual support, duplication, policy/safety, and whether the expected metric can actually be observed.

### 6. Conversion Analyst

Reads bounded funnel evidence and picks the largest current loss. Proposes one reversible intervention. Amplification requires downstream improvement.

## Model routing rule

Do not spend the highest-reasoning model on every step.

- Fast/low-cost tier: classification, extraction, formatting, deterministic transformation, first-pass triage.
- Strong general tier: normal coding, synthesis, content adaptation, routine analysis.
- Highest reasoning tier: architecture, ambiguous tradeoffs, complex debugging, high-stakes review.

Model names, limits, pricing, and availability change; the loop stores the **tier role**, not a hard-coded commercial plan.

## Safety boundary

Claude may autonomously research from approved sources, classify, draft, edit files, run approved tests, generate candidates, and prepare PRs.

Claude must not autonomously:

- approve or merge its own production change,
- change pricing or payment destinations,
- send high-volume unsolicited outreach,
- publish through an unapproved account,
- bypass platform controls,
- make irreversible financial/legal/identity decisions,
- treat social claims or earnings screenshots as verified facts.

## Monetization path

Praxis Loop Architect remains free and routes by problem:

- uncertain automation economics -> AI Agent ROI Calculator
- market signal without action -> Revenue Router
- high-value implementation problem -> $499 Workflow Audit

This avoids adding another low-context product while making existing revenue paths easier to enter.

## Measurement

Minimum events:

- `praxis_loop_architect_completed`
- `loop_architect_to_roi`
- `loop_architect_to_router`
- `loop_architect_to_workflow_audit`

Decision metric hierarchy:

qualified visit -> tool completion -> relevant CTA -> checkout start -> purchase -> delivery -> activation -> return

Do not optimize tool completions if downstream behavior is weak.

## Next activation layer

A Claude Code / GitHub automation can be added beside the existing `claude-bridge` only if authentication and permissions are verified. It should be proposal-first, least-privilege, and should not create a second publishing authority. The existing Claude -> GitHub -> safety audit -> Buffer path remains the publishing source of truth.
