# Vector note upgrade research pack

Target article:
https://note.com/deft_eel6718/n/ncaff8351e529

Current title:
AIを増やすほど仕事が遅くなる理由──ChatGPT・Claude・GitHubを「チーム」に変える設計

Current public state verified 2026-09-08:
- Price shown publicly: ¥1,480
- Public likes shown: 5
- Public free section available
- Purchase count: not publicly verifiable
- Verified revenue attributable to this upgrade: ¥0

## Research 1 — Demand

Demand is not treated as proven purchase demand.

Observed pain signal:
- Claude Code issue #11455 asks for session handoff / continuity support because users must manually re-brief new sessions and can lose pending context.
- A newer issue cluster (#59492) consolidates multiple handoff / restart requests, indicating the pain is not isolated to one report.

Interpretation:
- There is evidence of workflow pain around session continuity and state transfer.
- There is not yet evidence that this specific Japanese audience will pay ¥1,480 for a handoff template.

Sources:
- https://github.com/anthropics/claude-code/issues/11455
- https://github.com/anthropics/claude-code/issues/59492

## Research 2 — Independent verification

Official product behavior supports the broader premise that persistent context is scoped and tool-dependent rather than magically shared across every AI runtime.

ChatGPT Projects:
- Projects keep project chats, files, instructions and project memory together for ongoing work.
- That continuity is inside the project context; it is not a universal state transfer mechanism across unrelated runtimes.

Source:
- https://help.openai.com/en/articles/10169521-projects-in-chatgpt

Claude Code:
- Claude Code supports project memory through CLAUDE.md and related memory locations.
- CLI also supports continuing/resuming Claude Code conversations.
- These mechanisms reduce repeated setup, but they do not by themselves establish a cross-tool acceptance protocol between ChatGPT, Claude, Codex, GitHub and external execution systems.

Sources:
- https://docs.anthropic.com/zh-CN/docs/claude-code/memory
- https://docs.anthropic.com/en/docs/claude-code/cli-usage

## Research 3 — Red team / policy / editorial risk

Risks to remove from the article:
- Do not say "AI has no memory" as a blanket statement.
- Do not say the handoff template "guarantees" speed, accuracy or revenue.
- Do not imply that ChatGPT Projects, Claude Code memory or session resume features do not exist.
- Do not present one GitHub issue as proof of broad market willingness to pay.
- Do not use revenue screenshots or earnings claims to push purchase.
- Do not treat likes as purchase evidence.
- Avoid instructions that encourage bypassing platform safeguards or automating note publishing through fragile browser hacks.

Editorial improvement needed in the current public section:
- The opening repeats the same "AI increases but humans become traffic controllers" idea multiple times.
- The article currently focuses on role separation, but the highest-value upgrade is the handoff + acceptance layer between roles.
- The paid delta should be operational templates and verification rules, not more generic AI-tool commentary.

note editorial evidence:
- note editorial analysis of 100 well-purchased business/IT paid articles says the free area often works best when it includes reader empathy/problem framing and a clear benefit before the paywall.

Source:
- https://note.com/notemag/n/nb51c6c55f1ac

## Paid Value Gate

PASS, but only as an upgrade to the existing article, not as a new standalone product.

Paid delta to add:
1. AI handoff sheet
2. Handoff acceptance response
3. DONE vs VERIFIED distinction
4. Correction protocol when sender/receiver states disagree
5. ChatGPT → Claude example
6. Claude → Codex example
7. Codex → ChatGPT / MARKET example
8. Minimal version for small workflows

Why this can justify paid placement:
- It compresses implementation work into reusable templates.
- It addresses an observed workflow pain.
- It makes the existing article more executable rather than merely explanatory.

Why price is not raised yet:
- Purchase lift after the upgrade is not verified.
- Keep ¥1,480 until post-update behavior / purchase evidence exists.

## Revenue route

Existing Vector note (¥1,480)
→ buyer reads upgraded paid section
→ optional next step only if relevant: Cross-Agent Operating Kit
→ Stripe / existing commerce system

No new product, LP, brand or site.

## State

READY_DRAFT_ONLY

Human gate:
- Owner must update the existing paid note because there is no verified direct note publishing connector in the current execution environment.
- Before insertion, compare against the hidden/current paid section to avoid duplication.

Verified revenue from this upgrade: ¥0
