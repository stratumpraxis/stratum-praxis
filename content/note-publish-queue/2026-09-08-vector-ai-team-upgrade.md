# READY_DRAFT_ONLY｜既存Vector有料note 更新パッケージ

対象:
https://note.com/deft_eel6718/n/ncaff8351e529

既存タイトルは維持:

# AIを増やすほど仕事が遅くなる理由──ChatGPT・Claude・GitHubを「チーム」に変える設計

価格: ¥1,480を維持

理由:
- URL / 既存評価を維持する
- 値上げは更新後の購入Evidenceを見てから判断する
- 今回は新商品化ではなく既存Paid Assetの価値向上

---

# 1｜無料エリア差し替え稿

## AIを増やしたのに、なぜ仕事が速くならないのか

ChatGPTで調べる。
Claudeで文章を整える。
Codexで実装する。
GitHubへ残す。

一つひとつを見ると、以前よりできることは増えています。

ところが複数のAIを使い始めると、別の仕事が増えます。

「前のAIに何を頼んだか」を説明する。
「どこまで終わったか」をもう一度確認する。
同じファイルを別のAIが触る。
前のセッションで却下した案が、次のセッションで復活する。

AIは増えたのに、最後は人間が交通整理をしている。

ここで問題になるのは、単純なモデル性能ではありません。

**仕事の受け渡しです。**

Claude Codeでは、セッションをまたいだ引き継ぎをもっと扱いやすくしてほしい、というFeature Requestが実際に出ています。そこでは、複数日にまたがる作業で「前回どこまで進んだか」「次に何をするか」を毎回説明する負担が挙げられています。

一方で、現在のAIツールに継続機能がまったくないわけでもありません。

ChatGPTのProjectsは、プロジェクト内のチャット・ファイル・指示などを継続作業の文脈としてまとめられます。
Claude CodeにもCLAUDE.mdなどのプロジェクトメモリや、会話をcontinue / resumeする仕組みがあります。

つまり問題は、

**「AIは何も覚えられない」ことではありません。**

本当に困るのは、

> ChatGPTで考えたことをClaudeへ渡す
> ↓
> Claudeで決めたことをCodexへ渡す
> ↓
> Codexで実装した結果をGitHubへ残す
> ↓
> 次のAIが、その状態を正しく理解して仕事を再開する

という**別の担当・別のセッション・別の実行環境をまたぐ受け渡し**です。

ここが曖昧だと、AIを増やすほど人間の確認作業が増えます。

---

## AIチームに必要なのは「役割分担」だけではない

複数AIを使うとき、最初に役割を分けるのは有効です。

たとえば、

- ChatGPT：調査、判断、構造整理
- Claude：長文編集、別角度の検討
- Codex：実装、テスト、GitHub作業
- GitHub：コード・変更・Evidenceの記録
- PostHog：行動を見る
- Stripe：最終的な売上を確認する

というように、全員に同じ仕事をさせない。

ただし、役割を分けただけではまだチームになりません。

前工程が

「できました」

と言い、次工程がその言葉をそのまま信じた瞬間に、別の事故が起きます。

たとえば、

- コードは書いたがDeployしていない
- 記事は完成したが公開していない
- Checkoutは開いたが購入されていない
- テストは通ったが本番では確認していない

という状態です。

だから必要なのは、単なる会話要約ではなく、

**現在状態と、その状態を確認したEvidenceを渡すこと。**

そして、受け取った側が

**「本当にその状態なのか」**

を確認してから仕事を開始することです。

この記事ではこの2つを、

**Handoff（引き継ぎ）**
と
**Acceptance（受入確認）**

として分けます。

---

## 「続きからお願い」で仕事が戻らない理由

新しいAIに、

「昨日の続きからお願い」

と伝えても、前提が共有されていなければ再開できません。

逆に、過去の会話を全部コピーすればいいかというと、それも重くなります。

必要なのは大量の履歴ではなく、現在の差分です。

最低限、次の情報があれば仕事はかなり渡しやすくなります。

- 最終目的
- 現在地
- 完了したもの
- Evidence
- 未完了
- すでに却下した案
- 次に実行すること

特に重要なのが、

**DONEとVERIFIEDを分けること。**

「作業した」と「確認できた」は同じではありません。

この区別を入れると、AIがAIの自己申告をそのまま引き継ぐ事故を減らせます。

---

## ここから先では、実際に使える形まで落とします

無料部分では、複数AIで仕事が遅くなる原因を

**モデル数ではなく、受け渡しの設計不足**

として整理しました。

有料部分では、説明だけで終わらず、実際に使える形として、

- AI引き継ぎ票
- 受入確認フォーマット
- DONE / VERIFIEDの状態分類
- 状態が食い違ったときの修正方法
- ChatGPT → Claudeの例
- Claude → Codexの例
- Codex → ChatGPT / MARKETへ戻す例
- 小さな作業向けの最小版

までまとめます。

AIを増やす前に、仕事が落ちずに渡る場所を作る。

そのための実務部分です。

---

# ここから有料

## 2｜AI引き継ぎ票

前の担当AIに、作業終了時に次の形式で残させます。

```text
【AI HANDOFF】

■ GOAL
この作業の最終目的：

■ CURRENT STATE
現在どこまで進んでいるか：

■ DONE
作業済み：

■ EVIDENCE
状態を確認できる証拠：
- URL
- file path
- commit
- test result
- external state
など

■ IN PROGRESS
途中：

■ NOT DONE
未完了：

■ BLOCKED
停止理由：

■ DECISIONS
すでに決定したこと：

■ REJECTED
検討したが採用しなかった案：

■ IMPORTANT FILES
次の担当が読むべきもの：

■ NEXT ACTION
次の担当が最初に実行すること：

■ DO NOT
やり直してはいけないこと：
```

この中で一番重要なのはEVIDENCEです。

「記事完成」だけなら自己申告です。

「article-final.mdが存在する」
「Production URLを開いた」
「27 tests PASS」
「Stripe Live PaymentIntentは0件」

まで分けると、次の担当が何を信用していいか判断しやすくなります。

---

## 3｜DONEとVERIFIEDを分ける

状態は最低限、次の5つに分けます。

```text
DONE
VERIFIED
IN_PROGRESS
BLOCKED
UNKNOWN
```

たとえば、

```text
記事執筆：DONE
note公開：UNKNOWN
購入確認：UNKNOWN
```

なら、文章は作ったが、市場にはまだ出ていません。

一方、

```text
Production Deploy：VERIFIED
Evidence：https://example.com/
HTTP：200
```

なら、次の担当がDeploy工程を最初からやり直す必要はありません。

AIチームで重複作業が起きる理由の一つは、

**「やった」と「現実に確認した」が一つの言葉になっていること**

です。

---

## 4｜受け手は、いきなり仕事を始めない

引き継ぎ票を作っても、それだけでは不十分です。

送り手のAIが状態を間違えている可能性があるからです。

そこで次のAIには、最初にこの確認をさせます。

```text
このHANDOFFを受領してください。

ただし、HANDOFF内の自己申告をそのまま事実として扱わないでください。

1. GOALを理解
2. CURRENT STATEを確認
3. 重要file / URL / artifactを確認
4. DONEのうちEvidenceがあるものを検証
5. EvidenceがないDONEはUNVERIFIEDへ変更
6. 矛盾があれば修正
7. NEXT ACTIONが現在も妥当か確認

その後、

ACCEPTED
ACCEPTED WITH CORRECTIONS
REJECTED

のいずれかを返してください。

受入確認が終わるまで、新しい実装を開始しないでください。
```

これは人間の会社で言えば、荷物を発送しただけで「納品完了」としないのと同じです。

送った。
受け取った。
中身を確認した。

ここまで分けます。

---

## 5｜受入確認の返答形式

```text
【HANDOFF ACCEPTANCE】

STATUS:
ACCEPTED WITH CORRECTIONS

GOAL:
確認済み

VERIFIED:
- main branch最新commit確認
- Production URL確認
- 27 tests PASS確認

UNVERIFIED:
- note公開状態
- 実Purchase

CORRECTION:
HANDOFFでは「公開済み」とされていたが、公開EvidenceがないためREADY_DRAFT_ONLYへ修正

NEXT ACTION:
完成稿のnote反映と公開後計測
```

これを入れると、前のAIの誤認が次のAIへそのまま継承されにくくなります。

---

## 6｜ChatGPT → Claudeへ渡す例

ChatGPTでResearchまで終わり、Claudeに長文編集を渡す場合。

```text
GOAL:
有料記事を1本完成させる

CURRENT STATE:
テーマ選定・Research完了

VERIFIED:
- Demand Source確認
- 公式Source確認
- Red Team調査完了

DONE:
- Reader Pain
- Article Outline
- Claims list

NOT DONE:
- 本文
- 3回編集
- 媒体別完成稿

IMPORTANT FILES:
research.md
claims.md
outline.md

NEXT ACTION:
Researchを根拠として本文を作成

DO NOT:
テーマ選定からやり直さない
```

ポイントは、次の担当に「自由に考えて」と渡さないことです。

前工程で決まったものと、次工程に残っているものを分離します。

---

## 7｜Claude → Codexへ渡す例

文章・仕様から実装へ移ると、必要な情報が変わります。

```text
GOAL:
Publishing Revenue EngineへResearch 3-passを接続

DONE:
仕様確定

VERIFIED:
README確認済み

IMPORTANT FILES:
docs/publishing-spec.md
acquisition/publishing/engine.mjs

REJECTED:
- 新規Repository作成
- 新規Product作成

NEXT ACTION:
既存engine.mjsへ最小変更で接続
```

ここではREJECTEDがかなり重要です。

別セッションのAIは、以前却下された案を知りません。

そのため、

「全部作り直した方が早い」
「新しいRepositoryにしましょう」

と戻ることがあります。

**やらないと決めたことも状態として渡す。**

これだけで再議論を減らせます。

---

## 8｜Codex → ChatGPTへ戻す例

実装後は、説明文より現実状態を返します。

```text
IMPLEMENTED:
6 files changed

TEST:
27 passed

DEPLOY:
not executed

EXTERNAL EFFECT:
none

REVENUE:
0

HUMAN GATE:
note final publish

NEXT:
実記事1件を本番で通してE2E検証
```

この形式なら、

「テストが通った」

ことと、

「市場で成果が出た」

ことを混同しません。

---

## 9｜状態が食い違った場合のCorrection Rule

送り手：

```text
Deploy：DONE
```

受け手が確認するとURLが404。

この場合、送り手へ戻って議論を始めるより、共有状態を更新します。

```text
PREVIOUS CLAIM:
Deploy DONE

OBSERVED:
Production URL = 404

CORRECTED STATE:
BLOCKED

NEXT ACTION:
Deployment stateを確認し、Live verificationを再実行
```

AI同士の仕事では、誰が正しかったかより、

**現在のSource of Truthを正すこと**

を優先した方が進みます。

---

## 10｜小さな作業なら6項目だけでいい

すべての仕事に長いHANDOFFは必要ありません。

小さな作業ではこれだけで十分です。

```text
目的：
現在地：
完了：
証拠：
未完了：
次にやること：
```

受け手は、

```text
確認したもの：
確認できなかったもの：
修正した状態：
次に実行すること：
```

だけ返す。

仕組みを重くしすぎないことも大事です。

---

## 11｜GitHubを「記憶」ではなく実装の受け渡し地点にする

GitHubへ全部の会話を保存する必要はありません。

残す価値が高いのは、

- 何が変わったか
- どのファイルが変わったか
- テスト結果
- 実装上の決定
- 再現できるEvidence

です。

RevenueそのもののSource of TruthはStripeなどのCommerce側に置きます。

GitHubへ戻すのは、

**何を変えたら、どんな市場反応につながったか**

という学習可能な差分です。

最終的な循環は、

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
GitHubへ学習可能な差分を戻す
↓
次の外部行動
↺
```

となります。

AI社員を増やすことより、この循環が切れないことの方が重要です。

---

## まとめ

複数AIを使うとき、問題は「どのAIが最強か」だけではありません。

役割を分けても、仕事が正しく渡らなければ人間の交通整理は残ります。

そこで、

**WORK
→ HANDOFF
→ ACCEPTANCE
→ WORK**

という小さな制度を入れる。

そして、

**DONEとVERIFIEDを分ける。**

これだけでも、

「昨日どこまでやった？」
「それ本当に公開した？」
「前のAIが何を決めた？」

という確認を減らしやすくなります。

AIを増やす前に、仕事が落ちずに渡る仕組みを作る。

この記事で伝えたかったのは、その一点です。

---

## 自然な次の導線

ここまでの方法は、個人でもMarkdownだけで始められます。

複数AIの役割・権限・handoff・Evidenceまで、より大きな運用単位で整理したい場合だけ、既存のCross-Agent Operating Kitを次の選択肢として案内する。

https://stratumpraxis.com/cross-agent-operating-kit.html

押し売りCTAにしない。記事内のテンプレートだけで解決する読者は、そのまま使える状態にする。

---

# 12｜公開設定

タイトル:
AIを増やすほど仕事が遅くなる理由──ChatGPT・Claude・GitHubを「チーム」に変える設計

価格:
¥1,480 維持

無料 / 有料境界:
「## ここから先では、実際に使える形まで落とします」の直後

推奨タグ（7個以内）:
- #ChatGPT
- #ClaudeCode
- #Codex
- #AIエージェント
- #生成AI
- #業務効率化
- #GitHub

既存の広すぎるタグ（副業 / マーケティング / SNS運用等）は、本文との直接適合が弱ければ削る。

見出し画像Brief:
- 黒〜ダークグレー背景
- 銀〜白のタイポグラフィ
- 人物・ロゴ・キャラクターなし
- 3つのノードが一本のhandoff lineで接続される抽象図
- Main copy: 「AIを増やす前に、引き継ぎを作る。」
- Sub: HANDOFF → ACCEPTANCE → WORK
- 文字量は少なくする

---

# 13｜Source / Claim notes

Article claims should remain limited to what these sources support.

OpenAI Projects:
https://help.openai.com/en/articles/10169521-projects-in-chatgpt

Claude Code memory:
https://docs.anthropic.com/zh-CN/docs/claude-code/memory

Claude Code CLI continue / resume:
https://docs.anthropic.com/en/docs/claude-code/cli-usage

Claude Code handoff demand signal:
https://github.com/anthropics/claude-code/issues/11455
https://github.com/anthropics/claude-code/issues/59492

note free-area editorial analysis:
https://note.com/notemag/n/nb51c6c55f1ac

Do not claim:
- guaranteed time savings
- guaranteed revenue
- universal absence of AI memory
- market-wide willingness to pay
- legal / security guarantees

State after package creation:
READY_DRAFT_ONLY

Verified revenue from this upgrade:
¥0
