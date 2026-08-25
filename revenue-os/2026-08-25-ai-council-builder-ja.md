# AI Council Builder 日本語版 — Revenue handoff

Date: 2026-08-25
Owner/brand: Stratum Praxis
Status: implementation prepared; live Stripe product and Payment Link created

## Offer

**AI Council Builder 日本語版 — AIを増やす前に、役割を決める。**

英語版 AI Council Builder v1.0 の低コスト日本語ローカライズ。診断ロジック、安全構造、購入検証、Activation計測は同じ考え方を再利用し、表示・プロンプト・訴求・円価格を日本向けに変更。

Price: **¥3,980 JPY one-time**
Stripe Product: `prod_V8ZiZ4z7OWZuI2`
Stripe Price: `price_1U8IYqJMK7zFs997UnlcYsTM`
Stripe Payment Link: `plink_1U8IZ4JMK7zFs997TUWi4Vnv`
Checkout: https://buy.stripe.com/cNiaEY3sE5aX88wegb6Zy0F
Public page: https://stratumpraxis.com/ai-council-builder-ja.html
Purchase access: https://stratumpraxis.com/ai-council-builder-ja-access.html?session_id={CHECKOUT_SESSION_ID}

## Product structure

無料：60〜90秒のAI使い分け診断 → Lean Solo / Specialist Pair / Council 型を判定。

有料：
- AI Stack Planner
- Scout / Builder / Skeptic / Verifier / Judge / Failure Simulator / Cost Keeper の日本語役割プロンプト
- Fast Check / Evidence Check / Decision Council / Red-Team Council
- 最終判断メモ
- AI課金の重複・月額・年間換算チェック
- 安全運用境界

## Safety architecture

- 第三者AIの利用権を販売しない
- APIキー、パスワード、AIアカウントを預からない
- 外部投稿、送信、購入、削除、契約解除を自動実行しない
- 一般的な生産性・調査整理・通常業務の判断支援として位置づける
- 医療・法律・金融・信用・雇用・適格性・緊急・安全上重要な判断の唯一の根拠にしない
- AI出力の正確性、節約額、成果、継続互換性を保証しない
- 導入代行・個別サポート・継続更新を商品範囲に含めない
- 消費者の法定権利を免責文で排除する表現はしない

## Verified delivery

Stripe checkout completion
→ Checkout Session ID
→ 購入メール入力
→ Cloudflare Worker `/council-ja/login`
→ paid / exact price / amount / currency / payment link / purchaser email を照合
→ HMAC署名付き private workspace URL
→ `/council-ja/workspace`
→ Activation metadata + PostHog `activation`

## Tracking

Public: `funnel_view`, `diagnostic_complete`, `primary_cta_click`, `checkout_click`, `verification_submit`, `access_granted`, `access_denied`

Verified Worker: `revenue_verified`, `activation`

Product key: `ai_council_builder_ja`

## Distribution handoff

日本語版の初期外部露出は note 紹介を予定。noteでは「複数AIを契約する前に、役割を分ける」「ChatGPTだけで十分かを診断」「AI会議を多数決にしない」「AI課金の重複整理」の教育コンテンツから無料診断へ送る。

## Truth state

Launch前の実顧客データ：購入 0 / 売上 ¥0 / verified activation 0。
QAや管理者アクセスを実需要として数えない。

## Stop rule

英語版・日本語版ともに新機能を増やす前に、実流入 → diagnostic_complete → checkout_click → revenue_verified → activation の実測で最大ボトルネックを確認する。