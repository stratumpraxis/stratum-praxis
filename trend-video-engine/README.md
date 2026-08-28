# Trend Video Engine

Safety-first autonomous short-video growth lane for Stratum Praxis / Forwelle, with a separate Japanese Vector Praxis TikTok lane.

## Objective

Run a durable loop:

current public demand signals -> candidate scoring -> factual verification -> rights/safety gate -> platform-specific creative -> original vertical video render -> monetization/originality QA -> official Buffer publication -> result log -> analytics learning.

This lane extends the existing Buffer distribution system; it does not replace the existing image/content queue.

## Brand and language routing

### Stratum Praxis / Forwelle

Default language: **English**.

Primary market: global / English-speaking demand. Use English-first trend research, hooks, scripts, titles, captions and metadata unless there is a strong evidence-based reason not to.

Connected destinations:

- Stratum Praxis TikTok: English.
- Forwelle YouTube: English.
- Stratum Praxis Instagram: English when the topic fits.

Do not publish Japanese-language growth videos to Stratum Praxis / Forwelle by default.

### Vector Praxis

Default language: **Japanese**.

Vector Praxis has a separate TikTok identity. The dedicated login/email must remain outside this public repository. Do not record credentials or raw private account identifiers in source control.

Do **not** create or operate a second YouTube channel for this video engine. Japanese YouTube is out of scope for now; Forwelle remains the single YouTube growth lane.

Vector Praxis TikTok should eventually receive a dedicated Buffer connection/workspace/channel if that can be done through official authentication without bypassing login, CAPTCHA, 2FA or platform controls. Until that connection is verified, treat Vector TikTok auto-publication as `BLOCKED-NOT-CONNECTED`, not as a reason to route Japanese content through Stratum Praxis.

## North-star targets

The objective is not upload count. The objective is to increase the probability of sustainable platform monetization while protecting account health and building recognizable original channels.

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

For Stratum Praxis TikTok, apply these modes in English. For Vector Praxis TikTok, apply the same monetization/safety gates but research and write natively for Japanese TikTok rather than translating the Stratum version mechanically.

## Team structure

Current operating roles:

Market Radar -> Motion Design -> TikTok Team -> YouTube/Forwelle Team -> Rights/Safety Auditor -> Monetization Auditor -> Originality Auditor -> Contrarian/Reverse-Personality Auditor -> Publication -> Analytics/Learning.

TikTok and YouTube are separate operating teams. Never assume one edit, hook, pacing model, title, CTA or duration is optimal for both platforms. A topic may publish on one platform and be rejected on the other.

Within TikTok, treat **Stratum English TikTok** and **Vector Japanese TikTok** as separate audience/brand lanes. They may use the same underlying trend only when each team independently judges it native and useful for its audience. Do not mechanically translate/cross-post.

## Source policy

Demand discovery may use Google Trends, public/search-indexed X signals, TikTok Creative Center/public trend surfaces, YouTube rankings/vidIQ when available, Reddit and public web search. Social signals are treated as demand signals, not factual authority.

For Stratum/Forwelle, prioritize English/global demand signals. For Vector TikTok, prioritize Japanese search/social demand signals.

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
- `brandLane` (`stratum-en`, `forwelle-en`, or `vector-ja-tiktok` when connected)
- `sources` with public URLs
- `scores`
- `safety`
- `scenes`
- `publish`

## Attribution (optional, additive)

A post only becomes measurable if the caption carries a tracked destination.
`distribution/buffer-video-publisher.mjs` sends `publish.caption` verbatim as the post
text, so the caption *is* the published payload: a link that is not in the caption is
never sent.

The `publish` block may therefore carry four optional fields:

| Field | Meaning |
| --- | --- |
| `destination_url` | the tracked URL. Must also appear verbatim in `publish.caption`. |
| `destination_asset_id` | the acquisition inventory asset it points at |
| `campaign_id` | the campaign token used in `utm_campaign` |
| `awareness_only` | `true` for a deliberate no-destination post |

All four are optional. A manifest without them renders and publishes exactly as before;
it is simply classified `UNATTRIBUTED` and cannot contribute routing evidence.

Generate the fields (source and medium come from `distribution/source-routing.json`, never
hardcoded):

```bash
node acquisition/cli/plan-video-attribution.mjs \
  --asset agentic-ai-governance-permission-kit --platform youtube --campaign agent_control_20260828
```

Validate a manifest before publishing:

```bash
node acquisition/cli/plan-video-attribution.mjs --validate trend-video-engine/current.json
```

Attribution for already-published posts is derived read-only from the manifest that
produced them and stored in `acquisition/distribution-ledger.json`. This file and
`publish-ledger.json` are never modified by that process.

**Why the caption counts as evidence, and where that stops.** The caption is treated as
proof of what was transmitted only because `distribution/buffer-video-publisher.mjs` --
the only script that creates records in `publish-ledger.json` -- reads the post body from
`publish.caption` and sends it verbatim as the post text. That proof is re-established
from the publisher's own source on every classification run: if the publisher is changed
so it no longer reads or no longer transmits that caption, every record degrades to
`UNVERIFIED` instead of continuing to claim attribution.

The proof does **not** generalise to other lanes. `distribution/buffer-publisher.mjs`
(image/text) builds its payload from `content-queue.json` as `${item.text}\n\n${item.url}`,
not from a manifest caption, and writes no ledger this contract covers.
`distribution/buffer-video-status.mjs` only updates entries that already exist and creates
none. Adding a new publisher that writes this ledger requires registering its own proof in
`acquisition/lib/attribution.mjs` first; until then its posts classify `UNVERIFIED`.

Known divergence: existing hand-written captions used `utm_medium=social` for YouTube,
while `distribution/source-routing.json` declares `video`. The planner emits the
declared value. Historical records keep whatever was actually sent and are never rewritten.

## Render and QA

`render.py` renders a 720x1280 H.264/AAC MP4 using FFmpeg, original procedural graphics and original procedural audio.

`qa.py` fails closed unless the manifest and rendered file satisfy rights/safety requirements and technical checks.

## Publication

`distribution/buffer-video-publisher.mjs` uses Buffer's official API. It only posts to connected, unlocked channels and records the returned Buffer post state in logs. Instagram Reels, TikTok and YouTube Shorts are supported when those Buffer channels are actually connected.

Routing must match brand and language. Never publish a Vector/Japanese manifest to a Stratum channel simply because that channel is connected.

A GitHub Actions success is not treated as publication evidence unless the Buffer response contains a post object. No eligible channel is a blocker, not a fake success.

## Next implementation steps

1. Keep the current Stratum Praxis TikTok / Forwelle YouTube / Stratum Instagram automation running **English-first**.
2. Add brand-lane routing validation to QA/publisher so language/account mismatches fail closed.
3. Connect Vector Praxis TikTok to Buffer through an official one-time login/auth flow when convenient. A separate free Buffer workspace/account is acceptable if needed; do not spend money or create unnecessary duplicate infrastructure without a clear need.
4. After Vector TikTok is connected, enable a separate Japanese research/creative branch with its own trend scoring and analytics loop.
5. Keep YouTube concentrated on Forwelle rather than fragmenting subscribers/watch time across multiple channels.

## Frequency

The external scheduled research cell runs morning, midday and evening. Each run may ship at most one topic per active brand lane, with independent TikTok/YouTube creative decisions. It is valid to ship zero when the trend, rights, factual, originality or monetization gate does not pass.
