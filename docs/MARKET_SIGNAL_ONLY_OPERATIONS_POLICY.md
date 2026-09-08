# MARKET｜SIGNAL-ONLY OPERATIONS POLICY

Last Owner Update: 2026-09-08

## 0｜目的

MARKETは、**外部行動とRevenue前進は増やすが、内部ノイズは増やさない。**

出版・Distribution・Buyer接触・応募・提出など、Revenueへ近づく外向き実行は止めない。

一方で、GitHub Actions・Slack・Scheduled Run・Evidence Commit・Owner向け報告は、**State Changeがない限り原則サイレント**にする。

最上位原則：

> **Do more externally. Report less internally.**

---

# 1｜SILENT BY DEFAULT

以下は、Owner向け報告・Slack投稿・Issue作成・Evidence Commitを行わない。

- 0件だった
- 新規Signalなし
- Replyなし
- Purchaseなし
- Checkoutなし
- Trafficなし
- CandidateをCUTしただけ
- 既知のWaiting状態を再確認しただけ
- 同じErrorを再検出しただけ
- 内部Test PASSだけ
- Workflowが予定どおり何もしなかっただけ
- Draft / Candidate / Preparedが増えただけ
- 「今回も0」報告
- 「監視継続中」報告
- 「異常なし」報告

**No-opは成功として静かに終了する。**

---

# 2｜REPORT GATE

外部へ報告してよいのは、原則以下のState Changeのみ。

## A. Revenue State Change

- Purchase / Payment
- Paid Contract
- Reward / Commission / Tip
- Checkout開始
- Contract開始

## B. Buyer State Change

- Qualified Buyer Reply
- Interview / Meeting
- Qualified Human Visit
- CTA到達
- Official Apply / Submission

## C. External Action Completed

- 実Publish + Public URL
- 実Submit + Submission Evidence
- 実Contact + External send evidence
- Deliverable提出

## D. Human Gate

- Ownerしか越えられない実ゲート
- Credential / KYC / OAuth / Payment approval等で、本当にOwner操作が必要な場合

## E. Route Failure After Failover Exhausted

- Primary失敗
- Fallback失敗
- 代替Revenue Routeも使えず
- そのRouteが現実にBLOCKED

この場合のみBLOCKEDとして報告する。

---

# 3｜0 REPORT BAN

**0を毎Run報告しない。**

Verified Revenue = 0という事実は改変しないが、

- 毎回「0円でした」
- 毎回「Reply 0」
- 毎回「応募0」

のような反復通知は禁止。

0は、

- Ownerが明示的に現状確認した時
- 日次/週次の統合Truth Reportで必要な時
- 以前の非0 Stateから0へ異常変化した時

のみ表示する。

**Zero is truth, not a notification event.**

---

# 4｜GITHUB ACTIONS NOISE CONTROL

GitHub Actionsは「動いている感」を作るために走らせない。

各Workflowは最低1つ、以下の目的を持つこと。

- External Publish
- External Send / Submit
- Revenue-near State Transition
- Critical Health Check
- Regression Prevention
- Deployment required for Revenue Route

それ以外の定期Workflowは削減・停止候補。

## Actions hard rules

1. **No-op = exit 0 silently**
2. No SignalでIssue / Commit / Slack投稿を作らない
3. 同じErrorを毎Run通知しない
4. 同一Failureはdedupe keyで抑制
5. Retryは原則1回まで。以後Fallbackへ
6. Fallback成功時はError報告不要
7. 一回限りの`*-once` Workflowは役目終了後に停止・削除候補へ
8. 古いSmoke TestをCronで残さない
9. Credential / quotaが既知BLOCKEDなら再試行しない
10. 監視系はEvent-drivenを優先し、不要なPollingを避ける

---

# 5｜SCHEDULE / AUTOMATION REPORTING

Scheduled Runは、時間になったからOwnerへ話しかけるものではない。

毎回の実行は内部で完結し、**State Changeがなければ通知しない。**

例：

- Buyer Replyなし → silent
- Revenue変化なし → silent
- 同じBLOCK継続 → silent
- Publish候補なし → silent
- 新Signalなし → silent

通知するのは、

- Purchase / Reward / Contract
- Qualified Reply
- Submission / Publish完成
- 新しいOwner Gate
- Revenue Routeの実BLOCK

のみ。

---

# 6｜PUBLISHING IS EXEMPT FROM LOW-ACTION BIAS

出版そのものを減らさない。

Publishing Revenue Cellは、需要・品質・Destinationがある限り、

- note
- Article
- Ghost
- Newsletter
- Video Source
- SNS derivative
- Book / Chapter candidate

を積極的に市場投入してよい。

ただし内部報告は分離する。

## Publishing execution

**Publish aggressively.**

## Publishing reporting

**Report only meaningful external state changes.**

報告対象：

- Public URLが生えた
- Paid article公開
- Distribution実行
- Qualified Human Signal
- Checkout
- Purchase

報告不要：

- 下書き完成
- 校正完了
- 章候補追加
- Draft READY
- 「まだ売れていない」
- 「今のところ反応なし」

---

# 7｜GITHUB EVIDENCE RULE

GitHubは活動日記にしない。

残すもの：

- State Transition
- External Evidence
- Causal Diff
- Reproducible Failure
- Regression Fix
- Public URL / Submission ID
- Purchase / Contract / Reward evidence reference
- 重要なRouting / Identity / Policy変更

残さないもの：

- 0報告
- 待機報告
- 同じ失敗の再記録
- 単なる候補一覧
- 内部思考メモ
- 「確認したが変化なし」

---

# 8｜FAILURE HANDLING

失敗はOwnerへ投げる前に自動で処理する。

```text
Primary Route fails
↓
Classify failure
↓
Known blocked? → do not retry
↓
Fallback exists? → switch
↓
Fallback succeeds → silent recovery
↓
Fallback also fails
↓
Another non-duplicate Revenue Route exists? → switch
↓
All viable routes blocked
↓
Only then report BLOCKED
```

**Failure detected ≠ Owner notification.**

---

# 9｜DEDUP / COOLDOWN

同一内容の通知・Error・Stateを反復しない。

最低限のdedupe key：

`cell + route + state + external_target + error_code`

同じkeyでState変化がなければ再通知しない。

Cooldown中に同じFailureが出ても内部Traceのみ残す。

---

# 10｜OWNER REPORT FORMAT

Ownerへ見せるのは短くする。

1. **何が現実に動いたか**
2. **Before → After**
3. **External Evidence**
4. **Revenue-near Signal**
5. **Owner Gate（ある場合のみ）**

何も動いていなければ、報告自体を出さない。

---

# 11｜CENTRAL OPERATING RULE

MARKET全体を次の2層に分離する。

```text
EXECUTION PLANE
市場観測
→ Publish / Contact / Apply / Submit
→ Buyer / Human
→ CTA / Checkout
→ Revenue

REPORTING PLANE
State Change Filter
→ Dedup
→ Evidence Gate
→ Owner通知
```

Execution Planeは止めない。

Reporting Planeだけを厳しく絞る。

---

# 12｜FINAL RULE

**出版・外向き実行は増やす。**

**Actions・内部報告・0報告・待機報告は減らす。**

目標は「静かなシステム」ではなく、

> **外ではよく動き、内側では必要な時だけ喋るMARKET**

にすること。
