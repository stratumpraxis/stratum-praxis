# Sources / Claim Map

All technical claims in this package are grounded in the public `Scottcjn/Rustchain` repository.

## 1. “1 CPU = 1 Vote”
Source: `node/rip_200_round_robin_1cpu1vote.py`

The module header states:
- RIP-200: Round-Robin Consensus (1 CPU = 1 Vote)
- deterministic round-robin block producer selection
- antiquity multipliers for rewards
- each CPU gets equal block-production turns

Public source:
https://github.com/Scottcjn/Rustchain/blob/main/node/rip_200_round_robin_1cpu1vote.py

## 2. Antiquity-weighted rewards
Source: same file above.

The module says rewards are weighted by a time-aging antiquity multiplier and contains the `ANTIQUITY_MULTIPLIERS` table.

No payout or performance numbers are invented in this package.

## 3. Rotating hardware fingerprint checks
Source: same file above.

`ROTATING_FINGERPRINT_CHECKS` contains exactly:
- `clock_drift`
- `cache_timing`
- `simd_bias`
- `thermal_drift`
- `instruction_jitter`
- `anti_emulation`

The file sets `ACTIVE_FINGERPRINT_CHECK_COUNT = 4` and includes logic for selecting an active subset, while failing closed to all checks when the previous-block-hash seed is unavailable.

## 4. Physical hardware / virtualization framing
Source: `docs/whitepaper/hardware-fingerprinting.md`

The document describes RustChain as rewarding real physical hardware and discounting or rejecting virtualized environments that can scale cheaply without corresponding physical cost.

Public source:
https://github.com/Scottcjn/Rustchain/blob/main/docs/whitepaper/hardware-fingerprinting.md

## 5. Protocol-level summary
Source: `docs/PROTOCOL_v1.1.md`

The protocol documentation states that RIP-200 replaces hash power with hardware identity and that the core principle is **1 CPU = 1 Vote**, weighted by hardware antiquity.

Public source:
https://github.com/Scottcjn/Rustchain/blob/main/docs/PROTOCOL_v1.1.md

## 6. Install command
Bounty/source ecosystem documentation uses the public install entry point:

`pip install clawrtc`

No claim is made here that installation alone proves mining eligibility or payout.
