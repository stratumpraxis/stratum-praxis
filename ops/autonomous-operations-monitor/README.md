# Autonomous Operations Portal（自動会社運転ポータル）

## Purpose

ChatGPTの会話だけに依存せず、会社のCurrent Runtimeを人間とAIの両方が同じ構造で確認できる入口。

Canonical entry:
https://fzqgpaxqolrjjhmxdcrf.supabase.co/functions/v1/company-monitor/

## Surfaces

- `index.html` — Operations Monitor
- `trends.html` — Trend Radar
- `audit.html` — Audit / Human Gate
- `project.html?id=<project_id>` — Project-local Operations

## Runtime doctrine

1. Human Gate以外は人間へ返さない。
2. Gateは Current Human / Minimal Handoff / Deferred / System Wait / AI-side に分離する。
3. Trend = Public Attention Signal。Buyer Signalへ自動昇格しない。
4. Project-owned identity only。Cross-project fallback禁止。
5. Reach ≠ Human Visit ≠ Qualified Action ≠ Checkout ≠ Payment。
6. PaymentはProvider Evidenceが出るまで未確認。
7. Projectページは Current / Revenue / Trends / Publishing / SNS / WordPress / Schedule / Evidence / Docs を同じProject IDで結ぶ。
8. Project数が増えたらpaginationし、1画面へ詰め込まない。
9. Auditは制作担当と分離する。
10. Direct ReadbackをState昇格条件にする。

## Current architecture

Digital Index Base / Docs
→ Autonomous Operations Portal
→ Self Scheduler / Task Runtime / Audit
→ Trend & Market Signals
→ Project-local decisioning
→ Publishing / Distribution
→ External Human
→ Qualified Action
→ Checkout
→ Payment
→ Fulfillment
→ Evidence
→ Learning / Docs / next cycle

## Current known runtime gap — 2026-09-25

Trend Radar と Operations Audit のScheduleはENQUEUEDまで成功しているが、初回Taskが `READY / wake_transport=null` のまま未消費。

Healthy reference:
`DONE / wake_transport=SUPABASE_PROJECT_WORKER_V1`

Therefore:

- Scheduler enqueue: healthy
- Trend worker endpoint: HTTP 200
- Audit worker endpoint: HTTP 200
- Human Gate: false
- unresolved: new-role READY task → generic project-worker transport / claim attachment

この2本はtransport付与が閉じるまで「24H自動実行完成」と扱わない。
