# Distribution Pack｜Vector AI handoff note upgrade

Source article:
https://note.com/deft_eel6718/n/ncaff8351e529

State:
READY_DRAFT_ONLY until existing note is updated.

Rule:
Do not copy the paid section verbatim into free channels.
Each channel gets a different angle.

---

# 1｜Newsletter version

Subject candidates:
1. AIを増やす前に「引き継ぎ」を作る
2. ChatGPT→Claude→Codexで仕事が止まる理由
3. DONEとVERIFIEDを分けるだけで、AIチームは扱いやすくなる

Body:

ChatGPT、Claude、Codexを使い分けると、できることは増えます。

でも複数AIを使い始めたあと、逆に人間の確認作業が増えることがあります。

前のAIに何を頼んだか。
どこまで終わったか。
本当に公開したのか。
テストは通ったのか。

この問題は、モデル性能より「受け渡し」の問題として考えた方が整理しやすいです。

ポイントは2つだけです。

1. Handoffで現在状態とEvidenceを渡す
2. 次のAIがAcceptanceで状態を確認してから仕事を始める

特に、

DONE = 作業した
VERIFIED = 現実状態を確認した

を分けます。

たとえば、

記事執筆：DONE
note公開：UNKNOWN
購入：UNKNOWN

なら、まだ市場には出ていません。

逆に、

Production deploy：VERIFIED
URL：確認済み

なら、次のAIがその工程を作り直す必要はありません。

この考え方を、既存のVector有料noteへ実務テンプレートとして追加する更新を準備しました。

記事:
https://note.com/deft_eel6718/n/ncaff8351e529

テンプレートが不要なら、まず自分の作業で

目的 / 現在地 / 完了 / 証拠 / 未完了 / 次にやること

の6項目だけ残してみるのがおすすめです。

---

# 2｜Bluesky / short social copy

## Post A — Pain

AIを増やしたのに仕事が速くならないとき、モデル性能より先に見る場所がある。

「前のAIが何をしたか」を人間が毎回説明しているなら、詰まりはHandoff。

WORK → HANDOFF → ACCEPTANCE → WORK

AIを増やす前に、仕事が落ちずに渡る仕組みを作る。

Destination:
https://note.com/deft_eel6718/n/ncaff8351e529

## Post B — DONE vs VERIFIED

AI運用で地味に効く区別。

DONE = 作業した
VERIFIED = 現実状態を確認した

「記事を書いた」はDONE。
「公開URLを確認した」はVERIFIED。

「Checkoutを開いた」はPurchaseではない。

この区別だけで、Agentの自己申告をそのまま次工程へ流しにくくなる。

## Post C — Contrarian

「最強AIを1人作る」より、

誰が考える
誰が実装する
何を証拠にする
誰が受け取る

を決めた方が、複数AIは扱いやすい。

役割分担だけでなく、受入確認まで作る。

## Post D — Small template

AI間の引き継ぎ、最初はこれだけでもいい。

目的：
現在地：
完了：
証拠：
未完了：
次にやること：

次のAIは「証拠」を確認してから作業開始。

長い会話ログを全部渡すより、現在状態を渡す。

## Post E — GitHub loop

GitHubをAIの「記憶箱」にしすぎない。

残すのは、
変更 / commit / test / decision / Evidence。

市場
→ GitHub
→ 外部行動
→ Buyer
→ Revenue
→ 学習可能な差分をGitHubへ戻す
→ 次の外部行動
↺

---

# 3｜Long video script

Working title:
AIを5人に増やしたのに仕事が遅い理由。足りないのは「引き継ぎ」です

Hook:

ChatGPT、Claude、Codex。
AIを増やしたら仕事が速くなると思っていたのに、なぜか自分の説明時間が増えていませんか。

前のAIに何を頼んだか説明する。
どこまで終わったか確認する。
新しいAIが、前に却下した案をまた提案する。

これ、AIの性能不足というより、引き継ぎの問題かもしれません。

今日は、複数AIを「優秀な個人の集まり」から「仕事を渡せるチーム」に変える、HandoffとAcceptanceの設計を紹介します。

Section 1 — Why role separation is not enough:

AIをチーム化する話では、役割分担がよく出てきます。

ChatGPTは調査。
Claudeは長文。
Codexは実装。
GitHubは変更履歴。

これは大事です。

でも、Research担当が「終わりました」と言ったものをWriterがそのまま信用する。
Codexが「実装完了」と言ったものをPublishing側が「公開済み」と勘違いする。

これでは役割を分けても事故は残ります。

Section 2 — Handoff:

そこで前工程は、会話の要約ではなく現在状態を残します。

目的。
現在地。
完了。
Evidence。
未完了。
次のAction。

特にEvidenceが重要です。

「Deployした」ではなく、URLを確認したのか。
「売れた」ではなく、Paymentが確認できたのか。

Section 3 — Acceptance:

次のAIは、引き継ぎを読んですぐ仕事を始めません。

重要ファイル、URL、テスト結果を確認して、

ACCEPTED
ACCEPTED WITH CORRECTIONS
REJECTED

のどれかを返します。

前のAIの自己申告を、次のAIが検証してから受け取る。

Section 4 — DONE vs VERIFIED:

ここで一番簡単に使えるのが、DONEとVERIFIEDを分けることです。

記事を書いた。DONE。
公開URLを確認した。VERIFIED。

コードを書いた。DONE。
Productionで動いた。VERIFIED。

Checkoutを開いた。Purchaseではない。

この違いを状態として残します。

Section 5 — GitHub loop:

そしてGitHubには、全部の会話を保存するのではなく、実装とEvidenceを残します。

Revenueの真実はStripeなどに置く。
GitHubへは、何を変えた結果、どんな反応につながったかを戻す。

市場
→ GitHub
→ 外部行動
→ Buyer
→ Revenue
→ 学習
→ 次の外部行動

この循環ができると、AIの人数そのものより、組織としての学習速度を上げやすくなります。

CTA:

今回の引き継ぎ票、受入確認、ChatGPT→Claude→Codexの実例は、既存のVector有料noteへ追加する形でまとめています。

必要な人だけ概要欄から確認してください。

https://note.com/deft_eel6718/n/ncaff8351e529

End:

AIを増やす前に、仕事が落ちずに渡る場所を作る。

それだけでも、複数AIの使い方はかなり変わります。

---

# 4｜Short video scripts

## Short 1 — 30 sec

AIを5人に増やしたのに仕事が遅い。

原因、AIの性能じゃないかもしれません。

ChatGPTからClaudeへ移るたびに説明。
ClaudeからCodexへ移るたびに説明。

これだと人間がずっと交通整理しています。

解決の最小形は、

目的
現在地
完了
証拠
未完了
次にやること

を次のAIへ渡すこと。

AIを増やす前に、引き継ぎを作る。

## Short 2 — 20 sec

AI運用で分けたい2つ。

DONE = やった
VERIFIED = 確認した

記事を書いたはDONE。
公開URLを確認したらVERIFIED。

Checkoutを開いたは、Purchaseじゃない。

AIの自己申告と現実状態を分けるだけで、引き継ぎはかなり扱いやすくなる。

## Short 3 — 30 sec

AIのHandoffは、送り手だけ作っても足りません。

次のAIが、ファイル、URL、テスト結果を確認してから

ACCEPTED
ACCEPTED WITH CORRECTIONS
REJECTED

を返す。

つまり、AIにも受入確認をさせる。

WORK → HANDOFF → ACCEPTANCE → WORK

これで「前のAIが言ってたから」を減らせます。

---

# 5｜Tracking

Primary destination:
https://note.com/deft_eel6718/n/ncaff8351e529

Recommended UTM where supported:
utm_source=<channel>
utm_medium=content
utm_campaign=vector_ai_handoff_upgrade_20260908
utm_content=<angle>

Revenue truth:
- note purchase / actual payment only
- likes, views, clicks and open checkout are not revenue

Winner rule:
- Do not mass-distribute all variants immediately.
- Publish the best-fit variant per channel.
- If a Human Signal appears, amplify that angle.
