# StackPulse

## Product
A low-noise AI/SaaS/cloud reliability and material-change radar. Free users check official service state quickly; future Pro users save a dependency stack and receive consolidated incident/change alerts.

## Source policy
- Prefer provider-owned public status pages and documented public status endpoints.
- Atlassian Statuspage documents a page-level Status API intended to surface status in other websites/apps. Public pages can expose live status without a private API key; never expose authenticated management keys client-side.
- Store only normalized facts needed for the product: provider, component, status, incident title/status/timestamps, official source URL and fetch timestamp.
- Do not republish long incident prose. Link to the official source.
- Do not infer an outage from social chatter.

## Normalized model
`service_id`, `service_name`, `category`, `overall_status`, `incident_id`, `incident_title`, `incident_state`, `started_at`, `updated_at`, `official_url`, `checked_at`.

## Status vocabulary
`operational`, `maintenance`, `degraded`, `partial_outage`, `major_outage`, `unknown`.

## Safe scheduler
- Default target: every 5 minutes per official source only after endpoint/terms verification.
- Back off on 429/5xx; no tight retry loops.
- Cache last successful state and show `unknown/stale` when refresh fails rather than inventing operational status.
- Only persist a new history record when normalized state changes or a new incident appears.

## Free surface
- Multi-service overview.
- Provider official-source links.
- Current normalized state when verified ingestion is connected.
- Recent incident/change summaries with official links.

## Pro surface (preparing)
- Saved Stack (5–50 dependencies).
- Consolidated incident board.
- Meaningful incident/change alerts.
- History and team view.
- Email/webhook routing only after delivery is verified.

## Measurement
Track: `stackpulse_view`, `official_status_click`, `service_filter`, `pro_interest`, later `saved_stack_created`, `alert_enabled`, `alert_delivered`.

## Completion state
The product shell, source registry, normalized model, scheduler policy, safety behavior, monetization boundary and measurement contract are defined. Live aggregation remains gated on implementing/validating each provider's public endpoint and a scheduler/storage runtime. Until then the page must label itself staging/noindex and link to official status rather than displaying fabricated live states.