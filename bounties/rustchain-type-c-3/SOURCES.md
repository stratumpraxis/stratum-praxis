# Sources

All technical claims in this Shorts kit are grounded in public RustChain repository material.

1. **RIP-201 Fleet Immune System design**  
   https://github.com/Scottcjn/Rustchain/blob/main/rips/docs/RIP-0201-fleet-immune-system.md  
   Supports: under RIP-200, rewards are pro-rata by time-aged antiquity multiplier; a fleet of 500 identical modern boxes could dominate by sheer count; RIP-201 groups identical hardware into bucket economics so a fleet shares a bucket slice.

2. **RIP-201 implementation**  
   https://github.com/Scottcjn/Rustchain/blob/main/rips/python/rustchain/fleet_immune_system.py  
   Supports: reward pot divided equally among active hardware buckets; miners within each bucket share their slice by time-aged weight; fleet members receive decayed multipliers within their bucket; underrepresented buckets may receive a bounded diversity boost.

3. **RIP-200 round-robin / antiquity weighting**  
   https://github.com/Scottcjn/Rustchain/blob/main/node/rip_200_round_robin_1cpu1vote.py  
   Supports: deterministic 1-CPU=1-vote block producer rotation and time-aging antiquity multipliers for rewards.

## Accuracy notes
- “500 identical boxes” is an example from RIP-201 documentation, not a statement about current live fleet size.
- No live ROI, current reward-pot size, or current miner-count claim is made in this kit.
