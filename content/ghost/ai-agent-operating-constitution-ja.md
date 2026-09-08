---
title: "AI社員を増やす前に、権限と停止条件を決める──Agent Operating Constitution"
slug: ai-agent-operating-constitution-ja
language: ja
status: draft
source_note: https://note.com/deft_eel6718/n/nfce5ac047c15
canonical_strategy: "Ghostは無料の概念記事。Role Charter / Permission Matrix / Evidence Contract / Failure Protocolの完全版は既存note有料版へ残す。"
---

# AI社員を増やす前に、権限と停止条件を決める

AIに役割を付けるのは簡単です。

Research担当。
Writer担当。
Sales担当。
QA担当。

でもRole名だけでは運用になりません。

必要なのは、

**Role + Permission + Approval + Evidence + Escalation + Stop**

です。

## Role名より境界を決める

AIに「営業担当」と名前を付けても、

- 誰へ送っていいか
- 何件まで送っていいか
- どの内容なら自動送信してよいか
- 契約条件を変更してよいか
- どこで人間確認が必要か

が決まっていなければ危険です。

## Actionを3段階に分ける

```text
GREEN
低リスク。自動実行可。

YELLOW
条件付き。Evidenceまたは承認が必要。

RED
高リスク。Human Gateまたは禁止。
```

すべてをAIに任せる必要も、すべて人間が確認する必要もありません。

## Human Gateを決める

たとえば、

- Money
- Identity
- Contract
- Sensitive Data
- Irreversible Change
- High Reputation Risk

は明示的な承認対象にする。

一方、公開情報のResearchや低リスクの反復処理は、利用中のサービスとpolicyが許す範囲で自動化できます。

## Evidence Contractを作る

AIの「完了しました」をそのまま信じません。

```text
記事を書いた = DONE
public URLを確認 = VERIFIED

code changed = DONE
test / target environment確認 = VERIFIED

CTA click = SIGNAL
Purchase = REVENUE
```

Roleごとに完了の意味を揃えることで、次工程へ誤った状態が渡りにくくなります。

## Escalationを整える

Agentが止まったとき、

「どうしますか？」

だけでは人間の仕事が増えます。

最低限、

- Goal
- Current State
- Blocker
- Evidence
- Options
- Recommended
- Human Action
- Resume Point

を返させる。

これなら人間はGateだけ越え、AIはそこから再開できます。

## FailureはTraceへ変える

失敗をゼロにするのではなく、

Detect → Stop → Preserve → Classify → Rollback → Learn → Resume

の流れを用意します。

同じ失敗が繰り返されないよう、Failure Traceを次のEvalやRegression Testへ変える。

## Agentを増やさない

新しいAgentは、同じ欠損が何度も起き、既存Roleでは処理できないことがEvidenceで確認されたときだけ追加します。

「面白そう」「便利そう」は理由にしません。

## AIを社員のように扱う本当の意味

人格を付けることではありません。

- 担当範囲
- 権限
- 禁止事項
- 完了条件
- Evidence
- Escalation
- Stop条件
- Outcome

を持たせることです。

完全版のAgent Role Charter、Permission Matrix、Approval Gate、Evidence Contract、Failure / Rollback Protocolは既存noteへ追記しています。

https://note.com/deft_eel6718/n/nfce5ac047c15

## Sources

Running Codex safely at OpenAI:
https://openai.com/index/running-codex-safely/

OpenAI Presence:
https://openai.com/index/introducing-openai-presence/

OpenAI Presence Help:
https://help.openai.com/en/articles/20001405
