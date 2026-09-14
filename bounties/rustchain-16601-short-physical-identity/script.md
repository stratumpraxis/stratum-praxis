# Script — ≤60 seconds

**Hook:** What if an old computer did not become less useful to a network just because faster hardware exists?

RustChain’s RIP-200 starts from a different rule: **one CPU, one vote**.

Block production is deterministic round-robin instead of a hash-power lottery, while rewards are weighted by hardware antiquity.

That means the network is not asking every miner to win an arms race for the newest machine.

But “old hardware” only matters if the hardware is real. RustChain’s reward path rotates physical fingerprint checks such as clock drift, cache timing, SIMD bias, thermal drift, instruction jitter, and anti-emulation checks.

So the idea is simple: **physical identity first, age-weighted rewards second.**

If you want to inspect the implementation yourself, start with the RustChain repo and `pip install clawrtc`.

**End card:** RustChain — Proof of Antiquity · github.com/Scottcjn/Rustchain
