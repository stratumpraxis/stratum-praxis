# Revenue Pump｜Market → Payment

## Role

Commercial Revenue 専用の独立実行面。

市場Signalを見て終わらず、

Market Signal
→ Existing Revenue Route
→ Human Traffic
→ Qualified Action
→ Buyer Signal
→ Checkout / Contract
→ Payment / Payout
→ Repeat Revenue

までを、Current RealityとDirect Evidenceで前進させる。

## Runtime

- UI: `ops/revenue-pump/index.html`
- Revenue runtime: Supabase Edge Function `revenue-pump-engine`
- Market / Trend source: `company-monitor/api/trends`
- Company / Revenue evidence: `company-monitor`

## Priority

Payment / Payout
→ Checkout / Contract
→ Buyer Signal
→ Qualified Action
→ Human Traffic
→ Reach

## Boundaries

- Autonomous Operations Monitor: 監視・判断・Route。Revenue実行を抱え込まない。
- GitHubぽちぽち: 外部GitHub報酬専用。Execution StateをRevenue Pumpへ混ぜない。
- Revenue Pump: 商売全体の市場→売上専用。

共有してよいもの:
- 市場の傾向
- 収益方向
- Current Revenue State
- 成功 / 失敗パターン
- Evidence

共有しないもの:
- Account credentials
- Secrets
- GitHub bounty execution state
- Project固有の実行権限
- Runtime固有設定

## Execution Rules

- Current Direct Evidenceを最優先。
- Existing Asset / Existing Route first。
- Human Traffic = 0 の時に商品改修しない。
- Zero response時は Channel / Audience / Hook / Entry の1変数だけ変更。
- 正常RouteはBaseline保護。
- Task DONE / HTTP 200 / Deploy成功だけをRevenue成果にしない。
- Human Gate / External WaitはそのRouteだけ止め、他Routeを進める。
- GitHub paid-task workはこのEngineで実行しない。

## Success

Payment / Payout / Repeatable Revenue Evidence。

UI・Deploy・記事数・投稿数・Trafficだけでは成功扱いしない。
