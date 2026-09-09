# Stratum Praxis Video Production Standard

Updated: 2026-09-09

Purpose: raise Forwelle / Vector / Stratum video output from 'AI-generated content' to commercially credible, brand-consistent production.

## Core production loop

Demand / objective → visual identity → narrative → storyboard → shot design → assets → motion → narration → BGM / SFX → captions → finishing → platform reframe → QA → publish → retention / CTA evidence.

A rendered MP4 is not the completion condition.

## Visual identity gate

Before any production:
- read `/DESIGN.md`
- define canvas, palette, typography, motion vocabulary, and forbidden effects
- reuse the existing brand family unless a product has an explicit scoped exception

Do not start with generic default colors, generic AI gradients, or stock motion presets.

## Story and pacing

Every video should have a clear viewer job:
- understand
- compare
- trust
- act
- remember

For short-form, prioritize:
1. immediate premise
2. proof / contrast / demonstration
3. decision or payoff
4. CTA only when a real destination exists

Avoid long logo intros and throat-clearing.

## Shot design

Prefer intentional multi-shot construction over animating one still for the entire video.

Vary only when useful:
- wide / medium / close
- static / push / orbit / pan
- UI capture / generated visual / diagram / typography
- before / after
- problem / mechanism / result

Do not change camera language randomly just to create activity.

## Layout-first rule

Build the most important visible frame of each scene first.
Then animate into and out of that correct layout.

Do not use animation to guess where elements should land.

## Motion

Preferred:
- controlled easing
- soft inertia
- depth shift
- restrained parallax
- mask / reveal
- signal-flow motion
- kinetic typography where it improves comprehension

Avoid:
- endless floating
- random bounce
- spinning icons
- excessive zooms
- motion on every text element
- animation that reduces reading time

## Captions

Captions are an editorial layer, not raw transcription.

Rules:
- readable on mobile
- short phrase grouping
- safe margins for platform chrome
- consistent emphasis style
- avoid covering faces / core UI
- highlight only key words, not every word
- verify timing against narration

Sidecar subtitle files should be preserved when practical.

## Audio

Default production should consider three independent layers:
- narration / dialogue
- music
- sound effects / ambience

The spoken layer must remain intelligible on phone speakers.
Music should support pacing, not compete with the voice.
Use silence intentionally.

Do not publish weak, obviously synthetic voiceovers when a stronger available voice route exists.

## Generated footage

AI-generated video is one tool, not the visual default.

Use it when it adds:
- impossible / expensive scenes
- concept visualization
- controlled product storytelling
- useful B-roll
- motion that cannot be produced efficiently in CSS / SVG / programmatic graphics

Do not use generated footage when a simple UI recording, diagram, typography sequence, or real product image communicates better.

## Editable asset rule

When practical, preserve layers and reusable source:
- background
- foreground
- text
- logo / icon
- music
- narration
- subtitles
- reusable motion component

Avoid workflows that leave only one flattened asset when future reuse is likely.

## Tool routing

Choose tools by job, not habit.

Programmatic motion / repeatable branded explainers:
- Remotion
- HyperFrames / HTML + GSAP

Transcription / subtitle support:
- whisper.cpp or available transcription tooling

Avatar / multilingual presenter / lip-sync:
- HeyGen when presenter presence genuinely improves trust or communication

Generated / edited footage:
- connected video-generation or video-editing tools when the account supports the required capability

Final technical processing:
- FFmpeg
- ImageMagick for image assets

Do not force a paid generation route when an existing zero-cost toolchain solves the job adequately.

## Reframing

Do not treat 16:9 → 9:16 as a simple crop by default.

For each target surface, re-evaluate:
- subject placement
- caption safe area
- UI scale
- CTA visibility
- background continuation

Use generative expansion only when it materially preserves or improves the composition.

## Technical finish

Check:
- aspect ratio
- resolution
- frame rate consistency
- audio clipping
- subtitle timing
- text rendering
- compression artifacts
- first frame
- final frame / CTA

Upscale / HDR / denoise / sharpening are finishing tools, not automatic quality badges.

## Platform adaptation

A Short, Reel, TikTok, YouTube video, website hero loop, and product demo are different deliverables.

Do not shrink a desktop composition into a vertical canvas.
Re-compose for the target surface.

## Revenue connection

Before production, identify:
- Demand
- Destination
- CTA or paid opportunity
- expected external action

No destination = no revenue-production priority unless the video serves a clearly documented trust/proof role.

## QA gate

Before publish:
- brand consistency
- first 2-3 second clarity
- mobile readability
- no accidental AI artifacts
- no rights / licensing issue
- narration intelligibility
- music balance
- caption accuracy
- CTA correctness
- destination live
- tracking present where applicable

After publish, evaluate downstream evidence rather than production volume.

## Forbidden low-quality defaults

- single still + slow zoom as the whole video
- captions + music with no visual storytelling
- meaningless AI B-roll
- random camera changes
- generic cyberpunk / neon AI visuals
- excessive glow
- giant captions covering the frame
- desktop UI simply scaled down for 9:16
- unverified claims
- fake testimonials / metrics
- destination-less CTA
- calling render success a revenue result
