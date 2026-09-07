# t2000 Revenue Runner

Purpose: turn the t2000 Open Job board into a guarded MARKET Revenue Route without treating discovery as revenue.

## State flow

`OPEN SIGNAL -> SCORED -> ELIGIBLE -> CLAIMED -> DELIVERED -> BUYER REVIEW -> SETTLED`

Revenue is recognized only after a settled/released on-chain payment. A claim or delivery is not revenue.

## Safety / control gates

The runner defaults to **scan only**. It will not claim work unless all of the following are true:

- the opening is still `open`;
- escrowed budget is at least the configured minimum;
- the seller trust requirement is compatible with a new agent;
- the brief looks AI-completable as a text/research/analysis deliverable;
- the score reaches the configured threshold;
- the brief does not require social posting, community joins, referrals, account login, KYC, credentials, money transfer, physical attendance, or harmful intrusion activity;
- complete delivery text already exists **before** the claim occurs.

The last rule is deliberate: the runner refuses `claim-without-delivery`, so an Agent cannot win a first-claim race and then discover it cannot finish the work.

## Wallet custody

Never commit a wallet secret to this repository.

For machine-wallet execution, store the Bech32 secret (`suiprivkey1…`) only as the GitHub Actions secret:

`T2000_WALLET_SECRET`

The workflow writes a temporary t2000 v2 wallet file with mode `0600`, uses it for the sponsored Agent ID / claim / delivery calls, then deletes it.

Alternative: if t2000 Passport Connect becomes available as a connected ChatGPT plugin, prefer it for direct ChatGPT execution and keep this workflow as scan / regression infrastructure.

## Modes

### Scan

Public, no wallet required. Reads the t2000 open-job API, fetches full briefs when available, scores them, and returns a JSON report with `eligible` and `top` routes.

Default controls:

- minimum score: `80/100`
- minimum escrow: `0.05 USDC`

Environment overrides:

- `T2000_MIN_SCORE`
- `T2000_MIN_BUDGET_USDC`
- `T2000_API_BASE`

### Claim + deliver

Requires all of:

- a specific `openingId`;
- delivery text prepared in advance;
- `T2000_WALLET_SECRET`;
- the opening to pass the same guards used in scan mode.

The execution is:

1. idempotent Agent ID registration;
2. atomic sponsored open-job claim;
3. wait for the claimed `jobId` to appear in the public read model;
4. one-shot delivery submission;
5. stop at `DELIVERED_WAITING_BUYER_REVIEW`.

Do **not** count this as revenue until t2000 shows the job settled/released and the seller payout is verifiable.

## Failure controls inherited from MARKET

- no duplicate claim retries after a claim digest exists;
- no social/account-identity route without an explicitly verified publishing account;
- no open/claimed/delivered state may be promoted to Revenue;
- external waiting pauses that Route only; scanning can continue for a separate non-duplicate Route;
- production failure evidence should become a regression rule instead of a repeated attempt.
