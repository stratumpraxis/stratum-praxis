# 3-Pass Research｜Codex Revenue Company Upgrade

Target note:
https://note.com/deft_eel6718/n/n6643ede87ad3

Public state observed 2026-09-08:
- title: AIで作るだけでは稼げない。Codexを「実装部隊」にして、広告費0円から外貨収益を作る一人会社の設計書
- visible human signal: 2 likes
- current sale price on public page: ¥9,950, regular ¥13,400, sale shown through 2026-09-12 16:00
- purchase count / paid conversion: unverified
- verified revenue attributable to this upgrade: ¥0

## Research 1｜Demand

### Signal A｜AIで「作れる」こと自体が差別化になりにくい

2026年8月のSaaSコミュニティでは、AI codingによってソフトウェアの制作速度が上がる一方、製品数・競合数も増え、単体ソフトウェアよりもdistribution、positioning、trust、domain knowledgeが重要だという議論が継続している。

Evidence:
- https://www.reddit.com/r/SaaS/comments/1vry2tu/saas_isnt_dead_but_i_honestly_think_its_getting/
- https://www.reddit.com/r/SaaS/comments/1r0ix22/everyones_building_with_ai_nobodys_talking_about/

### Signal B｜大量実装してもRevenueは同じ速度で増えない

2026年7月のSaaS実例では、2人チーム＋AI coding agentsで8週間に2,642 commits / 約950 merged PRsを出しながら、Revenue成長は約€250から約€1k MRRだったというpostmortemがある。これは一般化できる証明ではないが、「shipping speed ≠ revenue speed」の具体例として利用価値がある。

Evidence:
- https://www.reddit.com/r/SaaS/comments/1uw56d1/8_weeks_2642_commits_5_offer_rewrites_1k_mrr_the/

### Signal C｜Buyerとの接触前に作ることへの反省

2026年8月のSaaSコミュニティでも「潜在顧客と話さずに機能を作り続けた」という失敗談が高反応を得ている。これも統計ではなくcommunity signalとして扱う。

Evidence:
- https://www.reddit.com/r/SaaS/comments/1vudj3q/this_actually_happened/

Demand conclusion:
**PASS**。ただし需要は「Codexの使い方」ではなく、AI codingをBuyer / Revenueへ接続する運用設計にある。

---

## Research 2｜Independent Verification

OpenAI公式ではCodexを、repositoryを読み、commands / testsを実行し、開発作業を進めるcoding agentとして説明している。AGENTS.mdなどでrepository固有の指示を与え、terminal logs / test results / citationsで作業を検証できることも説明されている。

Evidence:
- https://openai.com/index/introducing-codex/

2026年5月のOpenAI公式記事では、Codexの実運用について、access boundaries、human approval、telemetry、higher-risk actionsの明示などを重要な運用要素としている。つまり「AIに全部任せる」より、境界・承認・観測を設計する方が公式の運用思想とも整合する。

Evidence:
- https://openai.com/index/running-codex-safely/

Independent conclusion:
**PASS**。
記事の中核を「Codex＝自動で稼ぐAI」ではなく、**市場起点の実装をEvidence付きで進める実装部隊**へ修正する。

---

## Research 3｜Red Team / Legal / Policy

### Income claim risk

以下を禁止:
- Codexを使えば外貨収益が得られる
- 広告費0円なら利益率が高くなる
- この方法で月○万円になる
- 一人会社を自動化すれば人間作業が不要になる

記事は「実装コストを下げられる可能性」「既存の収益導線へ接続する設計」「RevenueはPurchase / Contract等で初めて確認」と表現する。

### Evidence distinction

必ず分ける:
- code / tests / deploy = implementation evidence
- visit / click / reply = human signal
- checkout = purchase intentに近い行動
- Purchase / Contract / Reward / Commission = revenue evidence

### Platform / note

note公式は有料記事を収益化手段として提供し、収益化のためのコンテンツ整理・価格設計・無料エリア設計などを案内している。今回の更新は既存有料記事の価値向上であり、新しい薄い記事の量産ではない。

Evidence:
- https://note.com/help/pg/monetize
- https://note.com/monetization-guide

### Copyright / source use

Redditは具体例・community signalとして要約し、成功数値を再現可能性の証明として使わない。OpenAI公式はCodex capability / safety boundariesの根拠に限定する。

Red Team conclusion:
**PASS WITH CONSTRAINTS**。
利益・収入・成功率を保証しない。実Revenue未確認の部分は明記する。

---

# Paid Value Gate

PASS。

無料で得られる情報:
- Codexがcoding agentであること
- AI codingで制作が速くなること
- distributionが重要という一般論

有料差分として追加する価値:
- Market → GitHub → External Action → Buyer → Revenue → GitHub の運用図
- BUILD / SHIP / SIGNAL / REVENUEの状態分離
- Revenue-Proximity Score
- Codexへ渡すRevenue Task Template
- 「新しいものを作らない」STOP条件
- Evidence Pack
- 7日間のRevenue Sprint
- 失敗Trace → 次Actionへの変換

これは情報の追加ではなく、読者が実際に何をCodexへ渡し、どの状態で止め、何をRevenueと認定するかを短縮する実務価値。

# Claim Ledger

| Claim | Evidence | Use |
|---|---|---|
| Codexはrepositoryを読み、commands/testsを実行できるcoding agent | OpenAI official | ALLOW |
| AGENTS.mdでrepo固有の指示を与えられる | OpenAI official | ALLOW |
| Codex運用ではboundary / approval / telemetryが重要 | OpenAI 2026-05-08 | ALLOW |
| AI codingで制作速度が上がってもRevenueが比例するとは限らない | community examples + logical distinction | QUALIFY |
| 2,642 commitsでも約€1k MRRだった例がある | Reddit single case | ALLOW AS EXAMPLE ONLY |
| Codexで外貨収益を作れる | no general proof | REMOVE / REWRITE |
| 広告費0円で稼げる | no general proof | REMOVE / REWRITE |

State after research: `READY_DRAFT_ONLY` until authenticated note update and public verification.