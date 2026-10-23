// Media acquisition is independent of sales-reply / provider-settlement waits.
// This grants no publishing or monetization permission; downstream gates still apply.
export function mediaAcquisitionGate(status, now = Date.now()) {
  if (status?.project !== 'stratum' || status?.runtime?.company_active !== true || status?.runtime?.runtime !== 'SUPABASE_DIRECT')
    return 'HOLD_RUNTIME_NOT_DIRECT_ACTIVE';
  const observed = Date.parse(status.observed_at);
  if (!Number.isFinite(observed) || observed > now + 60000 || now - observed > 3600000)
    return 'HOLD_TELEMETRY_STALE';
  const counts = status?.acquisition?.counts_24h;
  const keys = ['intro_engaged', 'intro_cta', 'diagnostic_start', 'diagnostic_complete', 'audit_click'];
  if (!counts || keys.some(k => typeof counts[k] !== 'number' || !Number.isFinite(counts[k]) || counts[k] < 0))
    return 'HOLD_TELEMETRY_UNKNOWN';
  if (keys.some(k => counts[k] > 0)) return 'HOLD_REVIEW_OBSERVED_SIGNAL';
  return 'ACQUISITION_ELIGIBLE';
}
