# Devpost Submission Draft

## Project title
SpendLens — Gemini Financial Digital Twin for SaaS Spend Recovery

## Category
The Taskmaster

## Elevator pitch
SpendLens is an autonomous SaaS and AI spend-recovery agent. Instead of merely reporting expenses, it reasons across subscription cost, seat utilization, tool overlap and renewal timing, then produces a quantified recovery plan and what-if scenarios.

## Problem
Modern teams accumulate SaaS and AI subscriptions quickly. Finance dashboards can show historical spend, but they rarely answer the operational question: **what should we cancel, downgrade, consolidate or renegotiate next — and how much will it save without breaking workflows?**

## What SpendLens does
- Ingests normalized SaaS, AI, usage and renewal records.
- Uses Gemini 3.5 Flash to detect duplicate categories, inactive seats, oversized plans and near-term renewal risks.
- Produces structured, quantified findings instead of open-ended chat.
- Ranks actions into Do Today, Do This Week and Before Renewal.
- Generates what-if scenarios such as replacing one automation platform with another or reducing unused AI seats.
- Converts approved recommendations into a safe execution manifest, keeping model decisioning separate from irreversible vendor mutations.

## Technologies used
- Gemini 3.5 Flash
- Google GenAI SDK
- FastAPI / Python
- Docker
- Google Cloud Run
- Base44 competition demo UI
- GitHub Pages demo UI

## Data sources
The current demo uses synthetic SaaS subscription, usage and renewal data to make the workflow reproducible and privacy-safe. The architecture supports later ingestion of invoices, screenshots, contracts and vendor APIs.

## What we learned
The important product shift was moving from an AI expense dashboard to an agentic recovery workflow. Judges and users do not need another chat interface; they need the system to make a defensible decision, quantify impact, surface risk and produce a concrete action queue. Separating recommendation from mutation also creates a safer path from prototype to production.

## Architecture summary
Browser/demo UI → Cloud Run FastAPI Agent → Google GenAI SDK → Gemini 3.5 Flash → structured findings/action queue → safe execution simulator. Vendor and procurement APIs can be added as scoped tools after approval.

## Production-readiness notes
The backend is containerized for Cloud Run. The API exposes a health endpoint identifying the configured Gemini model, an autonomous analysis endpoint and a separate execution endpoint. For a real deployment, the Gemini credential should be stored in Google Secret Manager and vendor mutations should use scoped identities and explicit approvals.

## Demo video outline (~4 min)
0:00–0:25 — Problem: teams pay for overlapping SaaS/AI tools and dashboards stop at reporting.
0:25–0:50 — Value proposition: SpendLens finds recoverable money and tells you what to do next.
0:50–1:20 — Show sample stack and one-click analysis.
1:20–2:05 — Show savings KPIs, duplicate tools, oversized plans and renewal risk.
2:05–2:40 — Show Do Today / This Week / Before Renewal action plan.
2:40–3:10 — Show What-if scenarios and projected savings.
3:10–3:35 — Show Cloud Run dashboard/service URL and call /health or /analyze.
3:35–3:55 — Show architecture diagram and GitHub repo.
3:55–4:00 — Close: SpendLens turns software spend from passive reporting into autonomous recovery.
