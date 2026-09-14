# Storyboard — RustChain: How Do You Prove a Computer Is Real?

Target: 16:9, 3–4 minutes. Clean terminal/documentary aesthetic. No invented benchmarks.

| Time | Narration beat | Visual / capture instruction |
|---|---|---|
| 0:00–0:15 | “If old hardware earns more, why not fake being old?” | Split screen: generic VM icon vs vintage laptop silhouette. On-screen question only; no unsupported numbers. |
| 0:15–0:35 | RustChain does not rely only on a self-reported hardware label. | Screen capture the public RustChain repo, then open `node/rip_309_measurement_rotation.py`. Highlight the list of fingerprint checks. |
| 0:35–1:10 | Six measurement families. | Animate six labels one at a time: clock drift, cache timing, SIMD identity, thermal drift, instruction jitter, anti-emulation. Use code capture behind the labels. |
| 1:10–1:40 | Why multiple physical signals matter. | Simple diagram: “claimed model name” → easy to copy; “measured behavior” → several independent signals. Avoid claiming any one check is unspoofable. |
| 1:40–2:10 | Measurement rotation. | Capture `node/rip_200_round_robin_1cpu1vote.py` and RIP-309 helper references. Diagram: previous chain state → selected checks → reward verification. |
| 2:10–2:35 | Fail-closed behavior when previous hash is unavailable. | Zoom on the source comment / logic returning all checks for an absent or zero previous hash. Caption: “No predictable easy fallback.” |
| 2:35–3:00 | RIP-200: 1 CPU = 1 Vote + antiquity-weighted rewards. | Open `node/rip_200_round_robin_1cpu1vote.py`; highlight the file header and antiquity multiplier section. |
| 3:00–3:25 | What the model is trying to value. | B-roll direction: old laptop / motherboard / repair bench using licensed or generated visuals only. Text: “physical hardware age → economic input.” |
| 3:25–3:45 | Summary + CTA. | Three-step graphic: Measure physical behavior → Rotate verification → Apply antiquity reward weight. End with RustChain repo + `pip install clawrtc`. |

## Capture notes
- Record only public repository pages/files.
- If using terminal captures, commands should be read-only (`git clone`, `grep`, `sed`, file viewing).
- Do not show wallet secrets, API keys, or private environment values.
- Use generated or rights-cleared hardware b-roll only.
