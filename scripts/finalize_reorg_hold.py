from pathlib import Path
import re

for name in ['passage-hub/index.html', 'passage-network.html', 'ordlume/index.html']:
    p = Path(name)
    if not p.exists():
        continue
    s = p.read_text(encoding='utf-8')
    m = re.search(r'<meta\s+name=["\']robots["\']\s+content=["\'][^"\']*["\']\s*/?>', s, re.I)
    if m:
        s = s[:m.start()] + '<meta name="robots" content="noindex,follow">' + s[m.end():]
    elif '</head>' in s:
        s = s.replace('</head>', '<meta name="robots" content="noindex,follow">\n</head>', 1)
    p.write_text(s, encoding='utf-8')

p = Path('sitemap.xml')
if p.exists():
    s = p.read_text(encoding='utf-8')
    for url in [
        'https://stratumpraxis.com/passage-hub/',
        'https://stratumpraxis.com/passage-network.html',
        'https://stratumpraxis.com/ordlume/',
    ]:
        s = re.sub(r'\s*<url><loc>' + re.escape(url) + r'</loc>.*?</url>', '', s)
    p.write_text(s, encoding='utf-8')

memo = Path('docs/REORG_HOLD_AND_CANONICAL_CANDIDATES_20260910.md')
memo.parent.mkdir(parents=True, exist_ok=True)
memo.write_text('''# 再編成｜保留・正規ページ候補メモ 2026-09-10

## ② 非公開 / 保留

### 公開URLあり
- Passage Hub — https://stratumpraxis.com/passage-hub/
- Passage Network — https://stratumpraxis.com/passage-network.html
- Ordlume — https://stratumpraxis.com/ordlume/

処理方針: メインHPに出さない / `noindex,follow` / sitemap除外 / URLとコードは保存 / 404化しない。

### 公開単独URLなし・未確認
- Business Pulse — Vector repo内コンポーネント。現在のWorks Hub本体から呼び出されていないため追加公開停止処理なし。
- Lingua Flow — 公開URL未確認。資産保存。
- SOVLTA BLW — 公開URL未確認。資産保存。
- Qelvane — 公開URL未確認。資産保存。

## ③ 新しい正規ページ候補

### 優先度 高
- Solo Company Score — https://stratumpraxis.com/solo-company-score.html
- One-Person Business AI Operating System — https://stratumpraxis.com/one-person-business-ai-operating-system.html
- AI Stack Optimizer — 公開URL未確認

### 優先度 中
- AI Agent Bottleneck — 公開URL未確認
- Life Resilience Check — https://stratumpraxis.com/life-resilience-check/
- Life Resilience Toolkit — https://stratumpraxis.com/life-resilience-toolkit/
- Household Resilience Checklist — https://stratumpraxis.com/household-resilience-checklist/
- 72-Hour Household Readiness — https://stratumpraxis.com/72-hour-household-readiness/
- Monthly Money Leak Audit — https://stratumpraxis.com/monthly-money-leak-audit/
- Life Resilience OS — https://stratumpraxis.com/life-resilience-os/

### 優先度 低 / 保留
- Passage Hub — https://stratumpraxis.com/passage-hub/
- Passage Network — https://stratumpraxis.com/passage-network.html
- Ordlume — https://stratumpraxis.com/ordlume/

## 安全ルール
- 新しい正規ページ完成前に旧URLを削除しない。
- 同内容を複製公開する前に canonical / redirect を決める。
- 再配置時だけ301と内部リンクを整理する。
- 現時点では追加の計測・ブランド横断作業は行わない。
''', encoding='utf-8')
