# The Blockchain Where Old Hardware Outearns New

Target runtime: ~3–4 minutes

## Narration

Most blockchains reward more compute, more capital, or more specialized hardware. RustChain takes the opposite idea: older physical hardware can earn a higher reward multiplier than newer machines.

Its consensus model is called Proof of Antiquity. The core principle is one CPU, one vote, but that vote is weighted by hardware antiquity. In the current RustChain README, a PowerPC G4 from 2003 is shown at a 2.5x multiplier, while modern x86_64 hardware is shown at 0.8x. The point is not raw speed. The point is preserving real machines and making their age an asset rather than a liability.

That creates an obvious problem: what stops somebody from pretending that a virtual machine is an old PowerPC Mac?

RustChain answers with hardware fingerprinting. The project describes six checks: clock-skew and oscillator drift, cache timing, SIMD identity, thermal drift entropy, instruction-path jitter, and anti-emulation detection. Instead of trusting a self-reported model name, the system looks for physical characteristics associated with real silicon.

The idea is simple: a virtual machine can copy labels, but it is much harder to reproduce the timing imperfections, cache behavior, thermal response, and architectural fingerprints of a real aging processor.

This changes the usual mining incentive. In most proof-of-work systems, old hardware becomes uncompetitive. In Proof of Antiquity, keeping an older machine alive can increase its relative value to the network. RustChain explicitly frames this as both a DePIN model and a hardware-preservation model.

The project also connects this physical identity layer to an agent economy. Its public documentation describes machine-to-machine payments, agent discovery through Beacon, and a bounty system where humans and AI-assisted contributors can earn RTC.

For a newcomer, the practical entry point is intentionally small. The repository points to `pip install clawrtc` as the starting command for the miner tooling.

So the full model is:

One physical CPU gets one vote.
Its vote is weighted by antiquity.
Hardware fingerprinting tries to verify that the machine is real rather than emulated.
And the network rewards preservation instead of endless hardware replacement.

That is the unusual bet behind RustChain: not faster hardware at any cost, but verifiable hardware that stays useful for longer.

To explore the implementation, start with the RustChain repository and its Proof-of-Antiquity documentation, then install the miner tooling with `pip install clawrtc`.

Disclosure: this package was prepared with AI assistance and manually source-checked against the public RustChain repository.