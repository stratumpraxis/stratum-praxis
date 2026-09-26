# Sources — RustChain #16601 Type B

Current-source audit: **2026-09-26**  
Pinned RustChain source snapshot: **91d0d2487743161e3dac7a8bd8116dd8f5f30678**

All factual claims in this kit are mapped to the pinned public RustChain source below so later changes to `main` cannot silently invalidate the review evidence.

## Claim → pinned source map

### 1. RIP-200 is deterministic round-robin with “1 CPU = 1 Vote”
- `node/rip_200_round_robin_1cpu1vote.py` L3–13 defines RIP-200, deterministic rotation, equal CPU turns, antiquity-weighted rewards, and time-aging.
- `node/rip_200_round_robin_1cpu1vote.py` L535–540 states that each attested CPU gets one turn per rotation and explicitly says “pure 1 CPU = 1 vote”.
- https://github.com/Scottcjn/Rustchain/blob/91d0d2487743161e3dac7a8bd8116dd8f5f30678/node/rip_200_round_robin_1cpu1vote.py#L3-L13
- https://github.com/Scottcjn/Rustchain/blob/91d0d2487743161e3dac7a8bd8116dd8f5f30678/node/rip_200_round_robin_1cpu1vote.py#L535-L540

### 2. Reward verification uses a rotating hardware-fingerprint set
- RIP-200 L36–44 lists the six rotating fingerprint checks and active count.
- RIP-200 L53–65 documents fail-closed behavior when the previous block hash is unavailable.
- https://github.com/Scottcjn/Rustchain/blob/91d0d2487743161e3dac7a8bd8116dd8f5f30678/node/rip_200_round_robin_1cpu1vote.py#L36-L44
- https://github.com/Scottcjn/Rustchain/blob/91d0d2487743161e3dac7a8bd8116dd8f5f30678/node/rip_200_round_robin_1cpu1vote.py#L53-L65

### 3. RIP-309 canonical check families and 4-of-6 selection
- `node/rip_309_measurement_rotation.py` L28–38 lists `clock_drift`, `cache_timing`, `simd_identity`, `thermal_drift`, `instruction_jitter`, and `anti_emulation`, with four active per epoch.
- L100–133 shows deterministic selection and the reward-path helper; empty previous-hash falls back to all checks.
- L161–169 states all six checks still run for logging/auditing while only the active four determine the evaluation.
- https://github.com/Scottcjn/Rustchain/blob/91d0d2487743161e3dac7a8bd8116dd8f5f30678/node/rip_309_measurement_rotation.py#L28-L38
- https://github.com/Scottcjn/Rustchain/blob/91d0d2487743161e3dac7a8bd8116dd8f5f30678/node/rip_309_measurement_rotation.py#L100-L133
- https://github.com/Scottcjn/Rustchain/blob/91d0d2487743161e3dac7a8bd8116dd8f5f30678/node/rip_309_measurement_rotation.py#L161-L169

### 4. Antiquity changes reward weight and decays over chain time
- RIP-200 L477 defines `DECAY_RATE_PER_YEAR = 0.15`.
- L486–512 implements the time-aged multiplier and documents the vintage-bonus decay.
- https://github.com/Scottcjn/Rustchain/blob/91d0d2487743161e3dac7a8bd8116dd8f5f30678/node/rip_200_round_robin_1cpu1vote.py#L477-L512

### 5. Example multiplier values used only when explicitly needed
- G4 is 2.5x at L377–380.
- Sandy Bridge is 1.1x at L394–395.
- `modern_intel` is 0.8x at L409.
- https://github.com/Scottcjn/Rustchain/blob/91d0d2487743161e3dac7a8bd8116dd8f5f30678/node/rip_200_round_robin_1cpu1vote.py#L371-L409

### 6. Physical-hardware / VM-resistance rationale
- `docs/whitepaper/hardware-fingerprinting.md` L5–12 states the design goal: reward real physical hardware and discount/reject virtualized environments that can cheaply scale.
- L102–106 explicitly states the limitation that software-only fingerprinting cannot perfectly distinguish real hardware from sophisticated emulation, and describes the multi-check mitigation.
- https://github.com/Scottcjn/Rustchain/blob/91d0d2487743161e3dac7a8bd8116dd8f5f30678/docs/whitepaper/hardware-fingerprinting.md#L5-L12
- https://github.com/Scottcjn/Rustchain/blob/91d0d2487743161e3dac7a8bd8116dd8f5f30678/docs/whitepaper/hardware-fingerprinting.md#L100-L106

### 7. Miner install command
The public RustChain repository documents `pip install clawrtc` / `python3 -m pip install clawrtc` in project materials, including:
- https://github.com/Scottcjn/Rustchain/blob/91d0d2487743161e3dac7a8bd8116dd8f5f30678/BCOS.md#L12
- https://github.com/Scottcjn/Rustchain/blob/91d0d2487743161e3dac7a8bd8116dd8f5f30678/docs/promo/HOOKS.md#L13

## Accuracy boundaries
- The package does **not** claim any fingerprint check is impossible to spoof.
- It does **not** claim hardware fingerprinting provides perfect identity.
- It does **not** invent live miner counts, payout amounts, token prices, profitability, or benchmark figures.
- It does **not** present reformatted/mock terminal text as a captured real execution.
- “Physical hardware age → economic input” is explanatory framing of the public Proof-of-Antiquity reward design, not a claim of perfect physical-device authentication.
