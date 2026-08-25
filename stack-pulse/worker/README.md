# StackPulse runtime

Production backend for official-source status ingestion and history.

## Deploy gate
1. `npx wrangler d1 create stackpulse`
2. Replace `REPLACE_AFTER_D1_CREATE` in `wrangler.jsonc` with the returned database id.
3. `npx wrangler d1 execute stackpulse --remote --file=./schema.sql`
4. `npx wrangler deploy`
5. Trigger/test scheduled ingestion, then connect the public UI to `/api/status`.

The 15-minute cron is intentionally low frequency. Failures are stored as `unknown`; StackPulse never invents provider health. No secrets are stored in source. D1 is available on Cloudflare Free and Paid plans; Cron Triggers call `scheduled()` on the configured interval.
