# Storyboard — vertical 9:16, ≤60s

## 0–6s — Hook
Visual: split screen. Left: generic “newer/faster hardware” upward arrow. Right: an older beige laptop silhouette staying on screen.
On-screen text: **“What if OLD hardware still mattered?”**
Narration: hook sentence from `script.md`.

## 6–15s — Rule change
Visual: terminal-style card with `RIP-200` and a large line: `1 CPU = 1 Vote`.
Secondary line: `deterministic round-robin block producer selection`.
On-screen source tag: `node/rip_200_round_robin_1cpu1vote.py`.

## 15–25s — Reward weighting
Visual: three simple machine icons labeled “older / middle / newer”. Keep block-turn icons equal, then animate the reward bars to different heights.
On-screen text: **“Turns are equal. Rewards are antiquity-weighted.”**
Do not show invented payout amounts.

## 25–40s — Physical hardware check
Visual: six labels orbit a CPU icon, then highlight four at a time:
`clock_drift` · `cache_timing` · `simd_bias` · `thermal_drift` · `instruction_jitter` · `anti_emulation`.
On-screen text: **“Rotating hardware fingerprint checks”**.
Source tag: `ROTATING_FINGERPRINT_CHECKS` / active count `4`.

## 40–50s — Core idea
Visual: fake VM/cloud icon fades backward; physical desktop/laptop icon stays foreground.
On-screen text: **“Physical identity → age-weighted rewards”**.
Narration: “So the idea is simple…” line.

## 50–60s — CTA
Visual: clean terminal capture / typography only.
On-screen text:
`pip install clawrtc`
`github.com/Scottcjn/Rustchain`
Final line: **“Proof of Antiquity”**.

## Production notes
- Use only original typography, generated shapes, and terminal/source captures.
- No third-party footage or music required.
- Keep all technical labels exactly as written in the cited source.
- Avoid unverified performance, price, supply, environmental, or earnings claims.
