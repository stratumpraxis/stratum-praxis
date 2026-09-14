# Sources

All technical claims in this kit are grounded in public RustChain source/docs.

1. RustChain repository
   - https://github.com/Scottcjn/Rustchain

2. RIP-200 implementation
   - `node/rip_200_round_robin_1cpu1vote.py`
   - Supports: “1 CPU = 1 Vote”, deterministic round-robin description, time-aging antiquity multipliers, reward weighting, and the local rotating-fingerprint selector/fail-closed comments.
   - https://github.com/Scottcjn/Rustchain/blob/main/node/rip_200_round_robin_1cpu1vote.py

3. RIP-309 measurement rotation
   - `node/rip_309_measurement_rotation.py`
   - Supports the six fingerprint families and reward-active check rotation. The canonical list uses `simd_identity`; compatibility code elsewhere also bridges the `simd_bias` wording.
   - https://github.com/Scottcjn/Rustchain/blob/main/node/rip_309_measurement_rotation.py

4. Hardware fingerprinting background
   - `docs/whitepaper/hardware-fingerprinting.md`
   - Supports the project’s stated goal of rewarding physical hardware while discounting/rejecting cheaply scalable virtualized environments.
   - https://github.com/Scottcjn/Rustchain/blob/main/docs/whitepaper/hardware-fingerprinting.md

## Accuracy notes
- The script deliberately does **not** claim that any individual fingerprint check is impossible to spoof.
- No benchmark, payout amount, live miner count, token price, or unsupported performance statistic is used.
- “Physical hardware age → economic input” is explanatory framing of Proof-of-Antiquity, not a claim that fingerprinting provides perfect hardware identity.
