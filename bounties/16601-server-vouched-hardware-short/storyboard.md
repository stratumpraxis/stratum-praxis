# 9:16 storyboard / exact capture plan

Target duration: **55–60s**. Use hard cuts plus short code-zoom transitions; no stock footage required.

## 0:00–0:04 — Hook
- Full-screen typography: `TYPE “VINTAGE” ≠ VINTAGE REWARD`
- Small terminal cursor blink after `VINTAGE`.
- VO: “You can’t just type ‘vintage’ into a miner and expect RustChain to pay the vintage tier.”

## 0:04–0:11 — Claim vs evidence
- Split screen:
  - left: fake request JSON with `device_family: "console"`
  - right: server icon + fingerprint waveform
- Overlay arrow: `CLIENT CLAIM → SERVER CHECK`
- VO: “RustChain’s current node tries to separate what the miner claims from what the server is willing to vouch for.”

## 0:11–0:21 — Server classification
- Screen capture of `node/rustchain_v2_integrated_v2.2.1_rip200.py` at `derive_verified_device()`.
- Search-highlight the function name, then zoom to `_vouch_claimed_device()`.
- On-screen labels: `device` / `fingerprint` / `server-derived`.
- VO covers attestation evidence and classification.

## 0:21–0:33 — Premium claim gate
- Show `_vouch_claimed_device()` and highlight branches for console / ARM / above-neutral claims.
- Animate a simple decision tree:
  `premium claim` → `supporting evidence?` → YES / NO
- NO branch drops to `UNVOUCHED_DEVICE`.
- VO explains that unsupported premium claims fall back instead of receiving the requested bonus.

## 0:33–0:42 — Neutral fallback
- Code capture on `UNVOUCHED_DEVICE = {"device_family": "x86_64", "device_arch": "modern"}`.
- Do not add made-up payout numbers; label only: `neutral modern fallback`.
- VO: “...the code falls back to an UNVOUCHED_DEVICE: modern x86-64 at the neutral rate.”

## 0:42–0:51 — Enrollment trust boundary
- Show `resolve_enroll_weight_device()`.
- Highlight comment text stating reward weight should be bound to attested/fingerprinted hardware rather than request-body `device`.
- Visual: `stored attestation` gets a check mark; `later request body` gets a warning triangle.
- VO explains enrollment prefers stored attestation state.

## 0:51–0:59 — Payoff
- Black background, large text:
  `CLAIMING OLD HARDWARE IS CHEAP`
  then
  `EARNING THE BONUS REQUIRES EVIDENCE`
- Small footer: `Source: Scottcjn/Rustchain @ 59339bc`
- End without a marketing CTA; this is an explanatory short.

## Capture notes
- Crop GitHub/code captures tightly enough that function names are legible on mobile.
- Keep code on screen for at least 2 seconds when a function is named.
- Never imply the system is impossible to spoof; describe only what the current source enforces.
- If motion is added, use scale/position/opacity only; avoid distracting 3D effects.
