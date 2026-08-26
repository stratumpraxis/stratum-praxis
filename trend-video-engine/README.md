# Trend Video Engine

Safety-first autonomous short-video lane for Stratum Praxis.

## Objective

Run a durable loop:

current public demand signals -> candidate scoring -> factual verification -> rights/safety gate -> original vertical video render -> technical/content QA -> official Buffer publication -> result log.

This lane extends the existing Buffer distribution system; it does not replace the existing image/content queue.

## Source policy

Demand discovery may use Google Trends, public/search-indexed X signals, TikTok Creative Center/public trend surfaces, YouTube rankings/vidIQ when available, Reddit and public web search. Social signals are treated as demand signals, not factual authority.

Material factual claims must be supported by primary/official sources whenever possible.

## Automatic rejection gate

Do not autonomously publish a candidate that materially depends on:

- copyrighted film/TV/music/game/sports footage, logos or character art;
- celebrity or other real-person likenesses;
- tragedy, accidents, violent crime or exploitation of victims;
- minors or sexual content;
- partisan political persuasion;
- high-stakes medical, legal or financial advice;
- unverified allegations, rumors or fabricated metrics;
- impersonation or misleading synthetic media;
- third-party media whose commercial-use rights cannot be evidenced.

## Default creative format

Use original procedural motion graphics, typography, diagrams, synthesized audio and original analysis. Do not use third-party visual/audio assets by default. This avoids dependence on stock licensing and makes the rights chain auditable.

If third-party media is ever used, `thirdPartyAssets` in the manifest must include a source URL, license URL and `commercialUseVerified: true`; otherwise QA fails closed.

Do not use free-plan HeyGen output in monetized videos. The engine should remain independent of paid generation services unless the owner explicitly approves a commercially licensed plan/cost.

## Originality gate

Each video must add a distinct interpretation, comparison, framework, explanation or practical takeaway. Repetitive template-filling with only names/numbers changed is not sufficient. When no candidate clears the originality and safety gates, publish nothing.

## Manifest

`current.json` is the signed-off machine-readable input for one cycle. The scheduled research cell may replace this file only after a candidate passes the gates.

Required fields include:

- `id`, `title`, `topic`, `language`, `outputFile`
- `sources` with public URLs
- `scores`
- `safety`
- `scenes`
- `publish`

## Render and QA

`render.py` renders a 720x1280 H.264/AAC MP4 using FFmpeg and original procedural audio.

`qa.py` fails closed unless the manifest and rendered file satisfy rights/safety requirements and technical checks.

## Publication

`distribution/buffer-video-publisher.mjs` uses Buffer's official API. It only posts to connected, unlocked channels and records the returned Buffer post state in logs. Instagram Reels, TikTok and YouTube Shorts are supported when those Buffer channels are actually connected.

A GitHub Actions success is not treated as publication evidence unless the Buffer response contains a post object. No eligible channel is a blocker, not a fake success.

## Frequency

The external scheduled research cell is designed to run morning, midday and evening. Each run may ship at most one video. It is valid to ship zero when the trend, rights, factual or originality gate does not pass.
