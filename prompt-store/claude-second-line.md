# Claude Second-Line Review Pack

Purpose: use Claude as an independent reviewer, not as a duplicate writer.

## Scope
Review the Stratum Praxis Prompt Store and AI Operations Systems Pack for:
1. positioning clarity
2. product overlap
3. weak or generic system instructions
4. missing failure handling
5. missing verification or stop conditions
6. buyer UX friction
7. misleading or unsupported claims
8. Claude-specific usability (Claude / Claude Code / CLAUDE.md workflows)

## Inputs to give Claude
- Store: https://stratumpraxis.com/prompt-store/
- 10-System Pack: https://stratumpraxis.com/prompt-store/operations-pack.html
- Product names:
  - Prompt Library Architect
  - AI Context Pack Builder
  - AI Output QA Auditor
  - Design → Code Handoff Architect
  - Multi-Agent Workflow Orchestrator
  - Evidence-to-Decision Synthesizer
  - UI Pattern Brief Builder
  - Automation Failure & Recovery Planner
  - Distribution Repurposing Router
  - Prompt Experiment & Evaluation Lab

## Review prompt
You are the independent second-line reviewer for an AI workflow product store.

Do not rewrite everything. Find weaknesses that the first builder may have missed.

Evaluate each system on:
- concrete user problem
- distinctness from other products
- input clarity
- output usefulness
- failure handling
- verification
- stop conditions
- human approval boundaries
- Claude / Claude Code fit
- likelihood that a buyer can use it without extra explanation

For every issue, return:
1. severity: critical / important / minor
2. exact product or page section
3. what is weak
4. why it matters
5. smallest practical fix
6. whether the fix should be made before traffic or only after data

Then return:
- top 3 strongest products
- top 3 weakest products
- one recommended hero product for Claude users
- one free sample that would attract qualified Claude/AI-builder traffic
- one thing that should NOT be changed yet because data is needed first

Rules:
- Do not invent sales, traffic, reviews, permissions, or test results.
- Do not recommend fake scarcity, fake testimonials, mass-DM, or rule-breaking promotion.
- Separate facts from inference.
- Prefer concrete edits over generic advice.

## Claude-specific angle to test
Current community discussions suggest value is moving from isolated wording toward context architecture, routing, evaluation, retries, memory and state. Test whether the 10-System Pack communicates this clearly enough to Claude and Claude Code users.

## Handoff back to ChatGPT
Paste Claude's review back into the working chat. ChatGPT should merge only evidence-backed, non-duplicative improvements, keep the original source of truth, and record changes in the Prompt Store master note.