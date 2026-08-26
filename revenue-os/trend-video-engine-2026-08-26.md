# Trend Video Engine — Launch Handoff — 2026-08-26

## Objective

Increase qualified external reach with a safety-first short-video loop that can turn current demand signals into original, commercially usable social video and verify delivery without manual posting.

Target metrics: verified sent posts, external video views, profile/site visits from video traffic, qualified sessions, CTA clicks and downstream revenue.

## Mechanism

Trend discovery / demand evidence -> primary-source fact verification -> safety/rights/originality gate -> `trend-video-engine/current.json` -> GitHub Actions renderer -> fail-closed QA -> public MP4 -> official Buffer API -> delayed delivery verification -> `publish-ledger.json`.

This is a separate companion lane. It does not replace the existing Buffer image/content distribution mechanism.

## Safety defaults

- Original procedural motion graphics, typography and synthesized audio by default.
- No third-party media unless commercial-use rights are explicitly evidenced.
- No free-plan HeyGen output for monetized content.
- Reject real-person/celebrity likenesses, copyrighted entertainment footage/characters/logos, tragedy/crime exploitation, minors/sexual content, political persuasion, high-stakes advice and unverified allegations.
- AI-generated disclosure is enabled for supported destinations.
- At most one external create attempt per manifest/service; `attempted`, `sending`, `sent`, `scheduled`, `unknown` and equivalent non-retry states are protected from duplicate automatic reposting.
- A green GitHub workflow alone is not publication evidence; Buffer post state and destination link are required.

## First verified cycle

Manifest: `2026-08-26-ai-agents-japan-v1`

Topic: Google Cloud Next Tokyo 26 / Japanese enterprise AI-agent deployment. Factual basis uses Google Cloud Japan official Day 1 and Day 2 event summaries published 2026-08-25. No Google footage, logos, people or screenshots were used.

Output: `media/trend-videos/2026-08-26-ai-agents-japan-v1.mp4`

QA: PASS — 24.0 seconds, 720x1280, H.264 video + AAC audio, original-procedural rights mode.

Verified delivery:

- TikTok `@stratumpraxis` — sent — https://tiktok.com/@stratumpraxis/video/7678283285138574599
- YouTube `// Forwelle` — sent — https://www.youtube.com/watch?v=OgrDG1Z16rY
- Instagram `praxisstratum` — sent — https://www.instagram.com/reel/Dcf_BMviXJ3/

## Recurring research cell

A recurring Trend Video Engine task is enabled for morning, midday and evening in Asia/Tokyo. Each run may publish at most one candidate and may publish zero when safety, factual, originality or demand thresholds do not pass.

Demand discovery should inspect Google Trends, public/search-indexed X signals, TikTok trend surfaces, YouTube rankings/vidIQ when available, and public web/Reddit where useful. Social signals identify demand; primary/official sources establish facts.

## Current operating rule

Do not optimize for posting volume. Optimize for: qualified attention + originality + account safety + auditable rights + verified delivery + revenue learning.
