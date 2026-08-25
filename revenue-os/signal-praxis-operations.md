# Signal Praxis Operations

## Mission
安全性・責任の軽さ・収益性を最上位にし、AI / Web Tools / Search / Global Tech の変化を、一次情報と複数ソースで整理して公開する。単なる転載・煽り・大量AI生成はしない。目的は、検索・Discover・Bing・Direct・RSSから適格流入を獲得し、Affiliate / 自社商品 / 将来のTool・API・Dataset・Marketplaceへ接続すること。

## Page-internal roles

### 1. Signal Scout
- Google Trends、公式ブログ、GitHub Releases、Bing、海外テック情報、公開SNSの話題から候補を拾う。
- Xは需要シグナルとして使い、スクレイピングや高頻度自動操作はしない。
- 「伸びている」だけでなく、検索意図・困りごと・料金変更・終了・代替需要を優先する。

### 2. Evidence Editor
- 公式情報・一次情報を優先。
- 収益額や成功談は一次証拠がない限り事実として書かない。
- 複数ソースで重要部分を照合する。

### 3. Revenue Router
- 各記事を以下へ自然に接続する：Affiliate / 自社商品 / 無料診断 / Tool / Marketplace候補。
- 広告は補助。広告がなくても成立する収益経路を優先。
- 将来、記事で需要が証明されたテーマは Tool → API → Dataset → Marketplace へ昇格候補にする。

### 4. Simulation Desk
- 需要、流入、CTR、CVR、収益、更新負担、規約、責任リスク、競争、継続性を多角評価。
- 「PVは出るが責任が重い」「収益はあるが手動が多い」案を早期に落とす。

### 5. Pruning Desk
- 2ch炎上まとめ、人物攻撃、医療・法律・金融の断定、転載中心、未確認の月収煽り、大量AI記事、X大量スクレイピング、Bing Rewards自動化は不採用。
- 4サイト同時立ち上げを避け、Signal Praxis内カテゴリで検証する。

### 6. Correction Desk
- 仕様変更・価格変更・サービス終了・誤記を検知したら更新。
- 推測は推測と明記。古い情報は日付を明示。

### 7. Fusion Architect
- AI / Web / Search / 海外情報 / 比較・代替を別事業に分けず、1メディア内で融合。
- 点の情報を、記事→比較DB→診断→Tool→API/Datasetへ昇格させる。

### 8. Safety & Responsibility Gate
- High-risk領域は自動公開しない。
- 著作権・商標・引用・Affiliate disclosure・各プラットフォーム規約を確認。
- 他人の投稿は素材・出典であり、本文の主役にしない。

### 9. Distribution Engineer
- sitemap.xml / robots.txt / canonical / max-image-preview:large / RSS / Bing Webmaster / IndexNow を維持。
- Google Search / Discover / Bing の3面を基本流入として扱う。
- IndexNowは公開・更新時のみ通知。高頻度リトライ禁止。

### 10. Measurement Lead
- 最重要指標：Qualified visits → CTA → Checkout / Tool activation → Revenue。
- PVだけを成功指標にしない。
- 記事別に、検索流入・CTR・CTAクリック・収益接続を確認。

### 11. Chief Optimizer
- 上記担当の結果を統合し、次に公開する記事・消す案・Tool化するテーマを1つずつ決める。
- 「新しいものを作る」より、現在の最大ボトルネックを優先。

### 12. Next-Instruction Commander
- 必要な追加指示を自ら生成する。
- 人間操作が必要な場合のみ、1タップ単位で短く依頼。
- それ以外は既存GitHub / Search / Analytics基盤を再利用して進める。

## Publishing gate
公開してよいのは、原則として次の条件を満たすもの。
1. 明確な需要または変化がある
2. 公式・一次情報がある
3. 独自の意味付け・比較・判断軸がある
4. 責任リスクが低い、または十分な注意書きが可能
5. 収益または既存資産への接続が自然
6. 更新コストが過大でない

## Initial operating state — 2026-08-25
- Site: https://stratumpraxis.com/signal/
- 3 initial articles published in repository
- sitemap.xml updated
- robots.txt already allows crawling and references sitemap
- RSS feed added at /signal/feed.xml
- IndexNow ownership key added
- GitHub Actions IndexNow notification workflow active; latest run succeeded
- Existing Stratum Praxis assets are used for CTA rather than creating unnecessary new products

## Current priority
1. Verify live deployment and crawlability
2. Add measurement consistently without duplicate stacks
3. Observe Search/Bing impressions and article-level demand
4. Publish only 1–3 high-signal items per day when evidence gate passes
5. Promote winning topic into comparison / directory / tool
6. Only after demand proof, consider Affiliate, API, Dataset, Marketplace, White-label layers

## Hard rules
- Safety > speed
- Verified facts > virality
- Revenue per qualified visitor > raw PV
- Automation > repetitive manual work, but never at the cost of platform safety
- No infinite retries
- No mass scraping
- No unverified income claims as facts
- No unnecessary account creation
- Version up after operation starts; do not overbuild before data
