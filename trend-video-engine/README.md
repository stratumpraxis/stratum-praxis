# Trend Video Engine

Safety-first autonomous short-video growth lane for Stratum Praxis / Forwelle.

## Objective

Run a durable loop:

current public demand signals -> candidate scoring -> factual verification -> rights/safety gate -> platform-specific creative -> original vertical video render -> monetization/originality QA -> official Buffer publication -> result log -> analytics learning.

This lane extends the existing Buffer distribution system; it does not replace the existing image/content queue.

## North-star targets

The objective is not upload count. The objective is to increase the probability of sustainable platform monetization while protecting account health and building a recognizable original channel.

### YouTube / Forwelle

Authorized channel: `UCw9wnPzccaPba5rLKWyL6nQ`.

Current ad/Premium YPP target before Feb 1, 2027:

- 1,000 subscribers; and
- either 4,000 qualified public long-form watch hours in the previous 12 months;
- or 10 million qualified public Shorts views in the previous 90 days.

Phone verification / advanced access is useful but is not by itself YPP eligibility. Shorts-feed watch time does not count toward the 4,000-hour path.

Operating model: use Shorts for discovery/subscriber conversion, then expand winning topics into genuinely original 3-8 minute explainers when justified so the channel can also build qualified long-form watch hours.

Channel-level originality review: at least every 5 uploads, ask: **If a human monetization reviewer watches five consecutive uploads, is it immediately obvious that they are meaningfully different works with clear creative authorship?** If not, stop/rebuild the format before scaling.

### TikTok

Creator Rewards direction of travel (subject to current region/account eligibility at review time):

- 10,000 followers;
- 100,000 video views in the previous 30 days;
- qualifying original high-quality videos at least one minute long.

Use two separate TikTok modes:

- **GROWTH CLIP**: compact, high-retention native TikTok edit optimized for discovery and follows.
- **REWARDS-READY**: 60-90 second original narrative/explainer when the topic genuinely supports the length and eligibility conditions.

Do not pad weak topics just to cross one minute. Verify account/region eligibility before treating Creator Rewards as available.

## Team structure

Current operating roles:

Market Radar -> Motion Design -> TikTok Team -> YouTube/Forwelle Team -> Rights/Safety Auditor -> Monetization Auditor -> Originality Auditor -> Contrarian/Reverse-Personality Auditor -> Publication -> Analytics/Learning.

TikTok and YouTube are separate operating teams. Never assume one edit, hook, pacing model, title, CTA or duration is optimal for both platforms. A topic may publish on one platform and be rejected on the other.

## Source policy

Demand discovery may use Google Trends, public/search-indexed X signals, TikTok Creative Center/public trend surfaces, YouTube rankings/vidIQ when available, Reddit and public web search. Social signals are treated as demand signals, not factual authority.

Material factual claims must be supported by primary/official sources whenever possible. Internet slang/memes may be used as cultural demand signals but must not be presented as medical/scientific diagnoses.

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
- third-party media whose commercial-use rights cannot be evidenced;
- mass-produced, repetitive, interchangeable AI templates whose authorship is not obvious.

## Default creative format

From video #2 onward, use a near-future kinetic visual language rather than static slideshow cards: moving UI layers, depth/parallax cues, continuously moving typography, data/grid motifs, scan/pulse accents used sparingly, scene continuity and deliberate procedural sound design. Avoid strobe, flicker, full-screen flashes and eye-strain glitch effects.

Use original procedural motion graphics, typography, diagrams, synthesized audio and original analysis. Do not use third-party visual/audio assets by default. This avoids dependence on stock licensing and makes the rights chain auditable.

If third-party media is ever used, `thirdPartyAssets` in the manifest must include a source URL, license URL and `commercialUseVerified: true`; otherwise QA fails closed.

Do not use free-plan HeyGen output in monetized videos. The engine should remain independent of paid generation services unless the owner explicitly approves a commercially licensed plan/cost.

## Originality gate

Each video must add at least two meaningful creator signals such as a distinct thesis, interpretation, comparison, framework, data interpretation, narrative structure, motion-design sequence or practical takeaway. Repetitive template-filling with only names/numbers changed is not sufficient. When no candidate clears the originality and safety gates, publish nothing.

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

`render.py` renders a 720x1280 H.264/AAC MP4 using FFmpeg, original procedural graphics and original procedural audio.

`qa.py` fails closed unless the manifest and rendered file satisfy rights/safety requirements and technical checks.

## Publication

`distribution/buffer-video-publisher.mjs` uses Buffer's official API. It only posts to connected, unlocked channels and records the returned Buffer post state in logs. Instagram Reels, TikTok and YouTube Shorts are supported when those Buffer channels are actually connected.

A GitHub Actions success is not treated as publication evidence unless the Buffer response contains a post object. No eligible channel is a blocker, not a fake success.

## Frequency

The external scheduled research cell runs morning, midday and evening. Each run may ship at most one topic, with independent TikTok/YouTube creative decisions. It is valid to ship zero when the trend, rights, factual, originality or monetization gate does not pass.
