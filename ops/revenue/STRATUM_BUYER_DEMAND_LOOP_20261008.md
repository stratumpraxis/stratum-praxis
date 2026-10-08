# Stratum｜買い手起点の24H収益循環
更新: 2026-10-08
Owner: Stratum Praxis / B2B。DIBは証拠と優先順位のみ。

## 現在の直接証拠
- 自社B2Bページに無料診断・成果物サンプル・既存$499 AuditへのStripe購入導線がある。
- GitHub Pages検証とRevenue Safety Loopは成功。
- 外部Bluesky投稿済み。ただしBuyer/PaymentはUNKNOWN。
- $499 Auditの納品は人的レビューが必要。完全自動納品・継続課金と呼ばない。

## 既存イベント駆動の最短ルート
1. 既存Radarで業務自動化の具体的な失敗・購買意向を分類する。推定需要と直接Buyer Signalを区別する。
2. 公開情報に根拠がある1つの問題に対して、既存サイト上の実務例と既存Auditの適合性を確認する。
3. 既存の許可済み公式配信経路だけで発信。連投・DM・未承認営業メール禁止。
4. 購入者は既存Stripeへ直接進む。無料診断・サンプルも維持。
5. 署名検証済み決済イベントまたは決済事業者の直接読取がある場合だけPAID_CONFIRMEDにする。クリック・サイト訪問・フォームは昇格禁止。
6. PAID_CONFIRMEDなら同一注文IDで重複排除して既存Ownerへ納品作業を引き継ぐ。受領確認後のみDELIVERED。
7. 返金・苦情・再購入・継続依頼を検証して1変数だけ改善。追加制作は実需要・既存Offer不足の証拠がある場合のみ。

## 新商品を作る判断
同じ失敗問題への有料問い合わせが複数回確認され、既存Auditよりも固定範囲・自動納品で価値提供できると判明した場合のみ、既存Stratum基盤上に最小追加する。新Repo・決済・スケジュールは原則不要。

## 状態と停止条件
Current: BUYER_SIGNAL_UNKNOWN / PAYMENT_UNKNOWN / DELIVERY_HUMAN_GATE。
First Broken Stage: 信頼できるB2B買い手の具体的な購入行動。
Wake: 既存市場イベント・有資格問い合わせ・Stripe決済事業者の直接証拠・納品完了。
Stop: 未許可の外部送信、決済先変更、本人確認、契約、外部システムへの未承認変更、重複配信。
Evidence: source URL / event ID / timestamp / project owner / stage / verification / next action。
Success: 外部Payment→納品→再購入。公開・CI・投稿だけでは売上ゼロと断定せずUNKNOWNを保持。
