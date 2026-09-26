# Sources — RustChain #16601 Shorts Kit 04

Current-source audit: **2026-09-26**  
Pinned RustChain source snapshot: **91d0d2487743161e3dac7a8bd8116dd8f5f30678**

This kit deliberately uses only mechanics that are explicit in the pinned implementation.

## Claim → pinned source map

### “1 CPU = 1 Vote” / deterministic round-robin
- RIP-200 L3–13 defines deterministic round-robin and equal CPU turns.
- RIP-200 L535–540 explicitly states each attested CPU gets one turn per rotation and “pure 1 CPU = 1 vote”.
- https://github.com/Scottcjn/Rustchain/blob/91d0d2487743161e3dac7a8bd8116dd8f5f30678/node/rip_200_round_robin_1cpu1vote.py#L3-L13
- https://github.com/Scottcjn/Rustchain/blob/91d0d2487743161e3dac7a8bd8116dd8f5f30678/node/rip_200_round_robin_1cpu1vote.py#L535-L540

### Antiquity changes reward weight
- RIP-200 L6–13 states rewards are weighted by a time-decaying antiquity multiplier.
- The multiplier table begins at L156; examples include G4 = 2.5x at L377 and Sandy Bridge = 1.1x at L394.
- https://github.com/Scottcjn/Rustchain/blob/91d0d2487743161e3dac7a8bd8116dd8f5f30678/node/rip_200_round_robin_1cpu1vote.py#L6-L13
- https://github.com/Scottcjn/Rustchain/blob/91d0d2487743161e3dac7a8bd8116dd8f5f30678/node/rip_200_round_robin_1cpu1vote.py#L371-L395

### Vintage advantage decays over blockchain lifetime
- `DECAY_RATE_PER_YEAR = 0.15` at L477.
- `get_time_aged_multiplier` at L486–512 documents and implements linear decay of the vintage bonus over chain age.
- https://github.com/Scottcjn/Rustchain/blob/91d0d2487743161e3dac7a8bd8116dd8f5f30678/node/rip_200_round_robin_1cpu1vote.py#L477-L512

## Accuracy boundary
- No live reward balance, profitability, miner count, token price, or unsupported benchmark is quoted.
- The short does not claim age increases consensus voting power; it distinguishes participation turns from reward weighting.
- No mock terminal output is presented as a real capture.
- The wording “reward preservation” is explanatory framing of the time-aged antiquity reward mechanism.
