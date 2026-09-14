# Sources

Technical claims in this package are grounded in the public RustChain repository.

1. **1 CPU = 1 Vote; antiquity-weighted rewards**
   - https://github.com/Scottcjn/Rustchain/blob/main/node/rip_200_round_robin_1cpu1vote.py
   - File header states RIP-200 is round-robin consensus with “1 CPU = 1 Vote” and time-aging antiquity multipliers.

2. **Six fingerprint checks / rotating measurement set**
   - https://github.com/Scottcjn/Rustchain/blob/main/node/rip_309_measurement_rotation.py
   - Public source defines the fingerprint check set including clock drift, cache timing, SIMD identity, thermal drift, instruction jitter, and anti-emulation.
   - https://github.com/Scottcjn/Rustchain/blob/main/node/rip_200_round_robin_1cpu1vote.py
   - Public source imports the reward-active fingerprint selector and defines rotating fingerprint checks.

3. **Physical hardware / VM resistance rationale**
   - https://github.com/Scottcjn/Rustchain/blob/main/docs/whitepaper/hardware-fingerprinting.md
   - Public documentation states RustChain is designed to reward real physical hardware and discount or reject virtualized environments that can cheaply scale without corresponding physical cost.

4. **Install command**
   - Project documentation / bounty materials use: `pip install clawrtc`.

## Accuracy note
This package intentionally avoids claiming the fingerprint system is impossible to bypass. It describes the intended design and the public implementation only.
