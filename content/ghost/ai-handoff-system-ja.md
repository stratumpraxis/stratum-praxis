---
title: "AIを増やす前に、引き継ぎを作る──ChatGPT・Claude・Codexを止めないHandoff設計"
slug: ai-handoff-system-ja
language: ja
status: draft
source_note: https://note.com/deft_eel6718/n/ncaff8351e529
canonical_strategy: "Ghost版は無料の概念・SEO記事。実務テンプレートは既存note有料版へ残す。"
---

# AIを増やす前に、引き継ぎを作る

ChatGPT、Claude、Codexを使い分けると、できることは増えます。

ところがAIを増やした後に、人間側の仕事が減らないことがあります。

原因の一つは、モデル性能ではなく**仕事の受け渡し**です。

ChatGPTで調べた内容をClaudeへ説明し直す。
Claudeで決めた仕様をCodexへ渡す。
Codexが実装した後、「どこまで本当に終わったのか」をもう一度確認する。

個々のAIは速くても、この引き継ぎが毎回人間頼みなら、全体の流れはそこで止まります。

## 継続機能があっても、別のAIへ状態が自動移植されるわけではない

現在のAIツールには、継続作業を支える仕組みがあります。

ChatGPTのProjectsでは、プロジェクト内のチャット、ファイル、指示などをまとめ、継続的な作業コンテキストとして利用できます。

Claude CodeにもCLAUDE.mdなどのプロジェクトメモリや、会話をcontinue / resumeする仕組みがあります。

これらは便利です。

しかし、ChatGPTの状態がそのままClaudeへ、Claudeの状態がそのままCodexへ、さらに実装結果が外部サービスへ自動的に同じ意味で引き継がれるわけではありません。

別の担当・別のセッション・別の実行環境をまたぐときには、共有できる形へ状態を落とす必要があります。

## 会話の要約より「現在状態」を渡す

引き継ぎでありがちなのが、過去の会話を長く要約する方法です。

でも次の担当が本当に知りたいのは、歴史全部ではありません。

- 最終目的
- 現在地
- 作業済み
- 何を根拠に確認したか
- 未完了
- すでに却下した案
- 次にやること

です。

特に重要なのは、

**DONEとVERIFIEDを分けること。**

「記事を書いた」はDONE。
「noteで公開URLを確認した」はVERIFIED。

「コードを書いた」はDONE。
「Productionで動作を確認した」はVERIFIED。

「Checkoutを開いた」はDONEでも、Purchaseではありません。

この区別がないと、AIの自己申告がそのまま次工程へ渡り、途中状態が完成状態として扱われやすくなります。

## HandoffだけでなくAcceptanceを作る

引き継ぎ文書を作るだけでも不十分です。

送り手が間違えている可能性があるからです。

そこで、

**WORK → HANDOFF → ACCEPTANCE → WORK**

という流れにします。

受け手は、引き継ぎを読んだらすぐ新しい仕事を始めず、重要ファイル、URL、テスト結果などを確認します。

そのうえで、

- ACCEPTED
- ACCEPTED WITH CORRECTIONS
- REJECTED

のどれかを返します。

この一段を入れることで、「前のAIが言っていたから」という理由だけで状態が引き継がれるのを防ぎやすくなります。

## GitHubは会話置き場ではなく、実装Evidenceの受け渡し地点にする

GitHubへAIとの会話を全部保存する必要はありません。

残す価値が高いのは、

- 変更されたファイル
- commit
- test result
- 実装上の決定
- 再現できるEvidence

です。

RevenueそのものはStripeなどのCommerce側がSource of Truthになります。

GitHubへ戻すのは、何を変えた結果、どんな市場反応が出たかという**学習可能な差分**です。

すると全体は、

```text
市場
↓
GitHub / 実装
↓
外部行動
↓
Buyer
↓
Revenue
↓
Evidence
↓
GitHubへ学習可能な差分
↓
次の外部行動
↺
```

という循環にできます。

## 役割を増やすより、受け渡しを固定する

AI活用では、新しいモデル、新しいAgent、新しい自動化ツールを追加したくなります。

でも、既存のAI同士で仕事が正しく渡っていないなら、人数を増やすほど交通整理が増える可能性があります。

先に固定したいのは、

- 誰が考えるか
- 誰が実装するか
- 何をEvidenceとするか
- 誰が受け取るか
- どの状態なら次へ進めるか

です。

この設計ができてから、必要なAIだけ追加する方が扱いやすくなります。

## 実際に使えるテンプレート

既存のVector有料noteでは、ここで扱った考え方を実務へ落とした、

- AI引き継ぎ票
- 受入確認フォーマット
- DONE / VERIFIED分類
- ChatGPT → Claude例
- Claude → Codex例
- Codex → ChatGPT / MARKET例
- 状態不一致のCorrection Rule

を追加しています。

既存記事:
https://note.com/deft_eel6718/n/ncaff8351e529

テンプレートが不要なら、このGhost記事の考え方だけでも十分始められます。

## Sources

OpenAI Projects:
https://help.openai.com/en/articles/10169521-projects-in-chatgpt

Claude Code memory:
https://docs.anthropic.com/zh-CN/docs/claude-code/memory

Claude Code CLI:
https://docs.anthropic.com/en/docs/claude-code/cli-usage

Claude Code handoff request:
https://github.com/anthropics/claude-code/issues/11455
https://github.com/anthropics/claude-code/issues/59492
