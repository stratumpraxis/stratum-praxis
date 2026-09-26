# Revenue Pump

Revenue Pump is the commercial revenue execution engine.

## Purpose
全市場を横断して、既存資産を実売上まで前進させる。

## Flow
Market Signal
→ Revenue Route Selection
→ First Broken Stage
→ Distribution
→ Qualified Human
→ Buyer Signal
→ Checkout / Contract
→ Payment
→ Fulfillment
→ Repeat Revenue

## Success Evidence
- Payment
- Payout
- Cash Evidence

## Scope
- WordPress
- Search
- SNS
- Marketplace
- Affiliate
- Existing Product
- Buyer Outreach
- Checkout
- Contract
- Payment
- Fulfillment
- Repeat Revenue

## Boundary
GitHub ぽちぽちの Accepted / Payout は参照Evidenceとして表示できるが、
Revenue Pumpの通常Execution Stateへは取り込まない。

## Identity
専用Gmailは未作成。
必要性が発生するまで既存Identityを流用しない。

## Runtime
Dedicated runtime: `revenue-pump-engine`
Monitor is read/dispatch only.
