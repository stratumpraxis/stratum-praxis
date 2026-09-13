# STRATUM｜安全収益ハートビート

更新: 2026-09-13  
状態: `CANONICAL / ACTIVE OPERATING RULE`  
対象: `stratumpraxis/stratum-praxis` と Stratum Praxis が所有・承認しているサイト、商品、決済、納品、計測、配信面のみ。

## 0. 役割

これは全プロジェクト共通の司令塔ではない。**Stratum 専用の収益循環制御**である。

目的は、新しいものを増やすことではなく、Stratum 内にすでに存在する需要・資産・導線・決済・納品をつなぎ、最短の未通過ボトルネックを安全に1つずつ通して、実売上の再現性まで到達させること。

基本循環:

`需要 → 既存Stratum Asset → Buyer適合 → 配信/流入 → Qualified Human Action → CTA → Checkout → Payment → Fulfillment → Evidence → Learning → 次の1手`

評価順位:

`Payment / Reward > Verified Checkout > Qualified Human Action > CTA > Qualified Visit > Traffic > Distribution`

制作完了、Draft、候補発見、Actions成功、監視成功、待機、Botアクセスは収益Evidenceではない。

## 1. Stratum 内部セル

Stratum は他プロジェクトの部署を借りて動かさない。以下を **Stratum 内部能力**として扱う。

- `Demand / Research` — 英語圏を中心に現在需要・購入文脈・Buyer painを確認する。
- `Asset Inventory` — 既存Utility / Diagnostic / Article / Video / Product / Proof / Checkoutを照合する。
- `Production` — Evidenceで必要性が確認された不足だけを制作・修正する。
- `Publishing / Distribution` — Stratum所有・承認済み面からQualified Trafficを作る。
- `Revenue Router` — Buyerを最短の既存Revenue Routeへ1本だけ接続する。
- `Checkout / Commerce` — 商品・価格・決済先の整合と実Checkoutを確認する。
- `Fulfillment` — 実購入後の納品・次工程を検証する。
- `Measurement` — Source → Human Action → CTA → Checkout → Payment → Deliveryを記録する。
- `Learning / Control` — WIN / HOLD / KILL / RESCUEと次の1手を決める。

MARKET、GWR、Vector、Forwelle、Arven等はStratumの内部セルではなく別プロジェクトであり、Stratum Heartbeatの実行依存先・配信先・資産供給元として自動利用しない。

## 2. Existing Asset First

新商品、新LP、新サイト、新Utility、新動画、新自動化を先に作らない。

必ず先に:

`Demand → Existing Asset Fit → Existing Revenue Route → Current Evidence → Bottleneck`

を確認する。

新規制作を許すのは、次のいずれかがEvidenceで確認された場合だけ。

1. 現在需要を受け止められる既存Assetがない。
2. CTAまたはRevenue Destinationが欠落・破損している。
3. Checkout / Deliveryが破損している。
4. 実ユーザーの離脱Evidenceが、特定の不足Assetを示している。

売れる状態まで到達したSurfaceは `FREEZE`。好みだけで再設計しない。

## 3. Route State

各Stratum Revenue Routeは最低限、次を持つ。

- `route_id`
- `asset_id / product_id`（既存IDがある場合）
- `funnel_stage`
- `status`: `ACTIVE | RESCUE | HOLD | KILL | WIN | HUMAN_GATE`
- `evidence_level`: `NONE | VISIT | QUALIFIED_ACTION | CTA | CHECKOUT | PAID | REPEAT`
- `last_external_evidence_at`
- `expires_at`
- `rescue_count`
- `next_action`
- `revenue_distance`
- `checkout_state`: `ACTIVE_VERIFIED | LEGACY_REDIRECT | INACTIVE | MISMATCHED | UNVERIFIED`
- `payment_state`: `NONE | CHECKOUT_OPEN | PAID | REFUNDED | DISPUTED`
- `safety_state`: `SAFE_AUTO | HUMAN_GATE | BLOCKED`
- `source / evidence_ref`

既存の Common Revenue Core を参照する場合も、Heartbeatが扱う実行対象は `business_unit=stratum` のみ。別business unitの市場実行を行わない。

## 4. Revenue Truth

正のPurchase / Paymentは、決済事業者などの実Evidenceなしに記録しない。

既存契約に合わせ、少なくとも次を区別する。

`traffic → product_view → cta_click → checkout_started → purchase → payment_captured / payment_settled → delivery → repeat_purchase`

`checkout_click` は `checkout_started` ではない。Checkout開始はProvider側のSession/Order等のEvidenceが必要。

### Bot / 自己テスト除外

以下はQualified Human Action・Revenue Evidenceとして扱わず、Route寿命を延長しない。

- `$virt_traffic_type = Automation / Bot / AI Agent`
- 自己テスト
- QA
- 監視
- crawler / synthetic check
- 自動巡回が作ったCTA / Checkoutイベント

人間由来を確認できないイベントは `UNVERIFIED` のまま保持する。

## 5. Heartbeat

デフォルトのRoute寿命は、最後の意味ある外部Evidenceから72時間。

- Qualified Visit → +24h
- Qualified Human Action / Buyer Reply → +72h
- CTA → +72h
- Verified Checkout → +120h、非購入Route中の最優先
- PAID → `WIN`
- Repeat Purchase → WIN強化・再現パターン保存

単なるTrafficや内部作業だけで永久延命しない。

## 6. 1回1ボトルネック

毎回、現在もっともRevenueに近い未通過点を **1つだけ**選ぶ。

- `A` Trafficなし → Demand location / Distribution
- `B` Trafficあり・Qualified Actionなし → Buyer fit / Positioning / Hook / Offer
- `C` Qualified Actionあり・CTAなし → Value / Trust / UX / CTA
- `D` CTAあり・Checkoutなし → Offer / Trust / Pricing friction / Checkout route
- `E` Checkoutあり・Purchaseなし → Buyer intent / Payment / Trust / Final friction
- `F` Purchaseあり・Repeatなし → Delivery / Value / Retention

下流を先に直さない。**最も深く到達した地点の次の1段だけ**を直す。

## 7. Dead Checkout Guard

Traffic拡大やSEO改善より先に、Revenue-bearing pageの実導線を確認する。

`Landing → CTA → Destination → Active Checkout → After-completion Delivery → Attribution`

`INACTIVE` / `MISMATCHED` はP0。意味あるTrafficがある高リスク `UNVERIFIED` も、追加集客より先に検証する。

URLが存在するだけでCheckout健全とは判定しない。

## 8. Rescue / HOLD / KILL

期限が近く外部Evidenceが増えていないRouteは、現在ボトルネックに直接効く **安全・可逆・既存承認済みの救命Actionを最大1回だけ**実行する。

救命Actionそのものは寿命を延長しない。結果として新しい外部Evidenceが出た時だけ延長する。

Evidenceが出なければ同じ内部作業を繰り返さず `HOLD` または `KILL`。

`Failure → Cause → Avoidance → Alternate safe route / HOLD / KILL`

無限リトライ禁止。

## 9. WIN

`CHECKOUT` は他の未購入Routeより優先。

`PAID` は `WIN`。ただし1件を永久Winner扱いせず、Buyer / Pain / Asset / Hook / Source / CTA / Price / Timing / Checkout / Fulfillmentを保存し、同一Stratum内の既存承認済み面で再現を試す。

再現できたRouteを強いWinnerとして増幅する。

## 10. Safe Auto / Human Gate

### SAFE_AUTO

既存接続・既存権限・Stratum所有範囲内で、可逆かつ規約に沿う場合のみ自動実行可能。

- 観測・計測・差分確認
- Route分類・優先順位更新
- 重複除去
- Evidence / State更新
- 既存Asset / DestinationへのRouting
- 既存承認済みWorkflowの安全な再開
- 既に承認されたStratum配信面での既存運用
- 壊れた内部リンク等の低リスク・明白な修復（価格・決済条件を変えない）

### HUMAN_GATE

- 新商品作成
- 価格変更・割引
- 広告費・課金・新たな金銭コミット
- 契約・法務・規約判断
- 秘密情報・API secret・2FA・本人確認
- 未承認の公開投稿先・Identity選択
- 大量/コールド送信
- 価値あるAssetの破壊的削除
- 別プロジェクト資産/アカウントのStratumへの流用
- Checkout / Payment設定そのものの変更

Human Gateに当たったRouteは、その1点だけ提示し、他の安全Routeは止めない。

## 11. Stratum現行の入口設計

Stratumにはすでに複数の既存入口・有料導線があるため、Heartbeatは新しい入口を増やす前に既存導線を比較する。

既存実装例:

- Workflow Diagnostic / ROI系 → `AI Workflow Opportunity Audit`
- Agent Economics / Spend系 → AI & SaaS関連の既存有料導線
- Agent Control Auditor → 既存Operating Kit系導線
- Revenue Router / claim-check系 → 最適な既存Revenue Route

既存の `$499 AI Workflow Opportunity Audit`、proof page、現在有効なStratum checkout群は、需要適合と現行Provider状態を確認した上で候補に含める。

## 12. X / SNS境界

停止・BAN・未確認のStratumアカウントを自動配信先として扱わない。

SNSはFollower数のためではなく、

`Viewer → Qualified Visit → Qualified Action → Revenue Destination → Checkout → Payment`

のために使う。投稿本数や再生数だけを成功としない。

## 13. 通知

ユーザーへ通知するのは意味ある変化だけ。

- Payment / Reward
- Verified Checkout
- Buyer / Qualified Human Response
- Rescue実行と結果
- HOLD / KILL
- WIN / 再現成功
- Human Gate
- 次Actionを変える重大Blocker

変化なし・0件・監視成功・内部整理だけなら通知しない。

## 14. 実行順

毎run:

`Revenue Evidence確認 → Bot除外 → Checkout健全性 → Active Route比較 → Revenueに最も近いボトルネック1つ → Safe Action 1つ → 実結果検証 → State更新 → WIN/HOLD/KILL/HUMAN_GATE → 次run`

Stratumの問いは常に1つ。

**「今あるStratum資産のうち、実在する人間をPaymentへ1段近づけるために、いま最も細い1点はどこか？」**
