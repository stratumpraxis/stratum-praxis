import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

import {
  adaptTrendVideoLedger,
  appendRecord,
  emptyFunnel,
  makeRecord,
  normalizeExternalStatus,
  recordMeasurement,
  summarize,
  unifiedView
} from '../lib/ledger.mjs';
import { readJson, repoPath } from '../lib/util.mjs';

const videoLedger = await readJson('trend-video-engine/publish-ledger.json');

test('the existing video ledger is adapted, not replaced', () => {
  const records = adaptTrendVideoLedger(videoLedger);
  const expected = Object.entries(videoLedger.items)
    .flatMap(([, services]) => Object.keys(services).filter((s) => !s.startsWith('_')));
  assert.equal(records.length, expected.length, 'every video-lane entry must appear in the unified view');
  for (const record of records) {
    assert.equal(record.lane, 'trend-video-engine');
    assert.match(record.source_ref, /^trend-video-engine\/publish-ledger\.json#/);
  }
});

test('reading the video ledger never mutates the file on disk', async () => {
  const before = await fs.readFile(repoPath('trend-video-engine/publish-ledger.json'), 'utf8');
  adaptTrendVideoLedger(await readJson('trend-video-engine/publish-ledger.json'));
  const after = await fs.readFile(repoPath('trend-video-engine/publish-ledger.json'), 'utf8');
  assert.equal(before, after);
});

test('Buffer statuses map to distinct meanings', () => {
  assert.equal(normalizeExternalStatus('sent'), 'PUBLISHED');
  assert.equal(normalizeExternalStatus('sending'), 'IN_FLIGHT');
  assert.equal(normalizeExternalStatus('scheduled'), 'IN_FLIGHT');
  assert.equal(normalizeExternalStatus('attempted'), 'IN_FLIGHT', 'a sent request is not a publication');
  assert.equal(normalizeExternalStatus('error'), 'ERROR');
  assert.equal(normalizeExternalStatus('rejected'), 'ERROR');
  assert.equal(normalizeExternalStatus('something-new'), 'UNKNOWN');
  assert.equal(normalizeExternalStatus(undefined), 'UNKNOWN');
});

test('the adapter agrees with the real ledger contents', () => {
  // Derived from the live ledger, never from a frozen count: the video lane is an
  // append-only production state file that legitimately grows between runs.
  const records = adaptTrendVideoLedger(videoLedger);
  const byId = new Map(records.map((r) => [r.ledger_id, r]));

  for (const [manifestId, services] of Object.entries(videoLedger.items)) {
    for (const [service, entry] of Object.entries(services)) {
      if (service.startsWith('_')) continue;
      const record = byId.get(`tve:${manifestId}:${service}`);
      assert.ok(record, `${manifestId}.${service} is missing from the adapted view`);
      assert.equal(record.status, normalizeExternalStatus(entry.status));
      assert.equal(record.post_id, entry.postId ?? null);
      assert.equal(record.published_at, entry.sentAt ?? null);
      assert.equal(record.external_link, entry.externalLink ?? null);

      // The invariant that matters: only a genuinely sent post is PUBLISHED, and a
      // PUBLISHED record must carry the platform's own send timestamp.
      if (record.status === 'PUBLISHED') {
        assert.ok(record.published_at, `${record.ledger_id} is PUBLISHED without a sentAt`);
      } else {
        assert.equal(record.published_at, null, `${record.ledger_id} is not PUBLISHED but carries a publication time`);
      }
    }
  }

  const published = byId.get('tve:2026-08-26-ai-agents-japan-v1:youtube');
  assert.equal(published.status, 'PUBLISHED');
  assert.equal(published.external_link, 'https://www.youtube.com/watch?v=OgrDG1Z16rY');
});

test('a post still in flight on main is never counted as published', () => {
  // Guards the exact regression main introduced: a new "sending" record must not
  // silently become a publication.
  const records = adaptTrendVideoLedger(videoLedger);
  const sending = Object.entries(videoLedger.items)
    .flatMap(([id, services]) => Object.entries(services)
      .filter(([service, entry]) => !service.startsWith('_') && ['sending', 'scheduled', 'attempted'].includes(entry.status))
      .map(([service]) => `tve:${id}:${service}`));

  for (const id of sending) {
    const record = records.find((r) => r.ledger_id === id);
    assert.equal(record.status, 'IN_FLIGHT', `${id} must stay IN_FLIGHT`);
    assert.notEqual(record.status, 'PUBLISHED');
    assert.equal(record.published_at, null);
  }
});

test('a new record starts with every funnel stage NOT_MEASURED, never zero', () => {
  const funnel = emptyFunnel();
  for (const key of ['downstream_views', 'cta_clicks', 'checkout', 'purchase']) {
    assert.equal(funnel[key], null, `${key} must start as NOT_MEASURED (null), not 0`);
  }
});

test('appending is idempotent by ledger_id and keeps prior evidence', () => {
  let ledger = { version: 1, records: [] };
  const record = makeRecord({ ledger_id: 'acq:x', lane: 'acquisition', platform: 'tiktok', status: 'IN_FLIGHT' });
  ledger = appendRecord(ledger, record);
  ledger = appendRecord(ledger, { ...record, status: 'PUBLISHED', post_id: 'p1' });
  assert.equal(ledger.records.length, 1);
  assert.equal(ledger.records[0].status, 'PUBLISHED');
  assert.equal(ledger.records[0].post_id, 'p1');
  assert.equal(ledger.records[0].history[0].from_status, 'IN_FLIGHT');
});

test('a purchase cannot be recorded without payment evidence', () => {
  const ledger = appendRecord({ version: 1, records: [] },
    makeRecord({ ledger_id: 'acq:y', lane: 'acquisition', platform: 'tiktok', status: 'PUBLISHED' }));

  assert.throws(
    () => recordMeasurement(ledger, 'acq:y', { purchase: 1, measurement_source: 'posthog' }),
    /without purchase_evidence from a payment provider/
  );

  const ok = recordMeasurement(ledger, 'acq:y', {
    purchase: 1,
    purchase_evidence: 'stripe:pi_3ABC',
    measurement_source: 'stripe-live'
  });
  assert.equal(ok.records[0].funnel.purchase, 1);
  assert.ok(ok.records[0].funnel.measured_at);
});

test('a measurement without a source is refused', () => {
  const ledger = appendRecord({ version: 1, records: [] },
    makeRecord({ ledger_id: 'acq:z', lane: 'acquisition', platform: 'tiktok', status: 'PUBLISHED' }));
  assert.throws(() => recordMeasurement(ledger, 'acq:z', { downstream_views: 10 }), /without measurement_source/);
  assert.throws(() => recordMeasurement(ledger, 'acq:missing', { measurement_source: 'x' }), /unknown ledger_id/);
});

test('a measured zero is preserved as zero, not as NOT_MEASURED', () => {
  let ledger = appendRecord({ version: 1, records: [] },
    makeRecord({ ledger_id: 'acq:zero', lane: 'acquisition', platform: 'tiktok', status: 'PUBLISHED' }));
  ledger = recordMeasurement(ledger, 'acq:zero', { downstream_views: 0, cta_clicks: 0, measurement_source: 'posthog-2026-08-27' });
  const summary = summarize(ledger.records);
  assert.equal(summary.stages.destination_view.measured, 1);
  assert.equal(summary.stages.destination_view.total, 0, 'a real measured zero must survive as 0');
  assert.equal(summary.stages.checkout.total, 'NOT_MEASURED', 'an unmeasured stage must not become 0');
});

test('uninstrumented stages are distinguished from unmeasured ones', () => {
  const summary = summarize(adaptTrendVideoLedger(videoLedger));
  assert.equal(summary.stages.impression.total, 'NOT_INSTRUMENTED');
  assert.equal(summary.stages.purchase.total, 'NOT_MEASURED');
  assert.notEqual(summary.stages.purchase.total, 0);
});

test('the unified view merges lanes without dropping or duplicating records', () => {
  const adapted = adaptTrendVideoLedger(videoLedger);
  const own = { version: 1, records: [makeRecord({ ledger_id: 'acq:a', lane: 'acquisition', platform: 'youtube', status: 'PUBLISHED' })] };
  const unified = unifiedView(own, adapted);
  assert.equal(unified.length, adapted.length + 1);
  assert.equal(new Set(unified.map((r) => r.ledger_id)).size, unified.length);

  const overlapping = { version: 1, records: [{ ...adapted[0], lane: 'acquisition' }] };
  assert.equal(unifiedView(overlapping, adapted).length, adapted.length, 'an owned record wins over the adapted copy');
});

test('adapting an empty or malformed ledger yields no records rather than throwing', () => {
  assert.deepEqual(adaptTrendVideoLedger({}), []);
  assert.deepEqual(adaptTrendVideoLedger(null), []);
  assert.deepEqual(adaptTrendVideoLedger({ items: { a: null, b: { _state: { status: 'x' } } } }), []);
});

test('attribution absence on historical posts is recorded, never back-filled', () => {
  const records = adaptTrendVideoLedger(videoLedger);
  for (const record of records) {
    // Every adapted record must state its attribution status explicitly.
    assert.ok(['ATTRIBUTED', 'UNATTRIBUTED', 'NOT_APPLICABLE', 'UNVERIFIED'].includes(record.attribution_state),
      `${record.ledger_id} has no attribution_state`);

    if (record.attribution_state === 'ATTRIBUTED') {
      assert.ok(record.utm && record.utm.utm_source,
        `${record.ledger_id} claims attribution without a utm_source`);
    } else {
      assert.ok(!record.utm || !record.utm.utm_source,
        `${record.ledger_id} is not ATTRIBUTED but carries a utm_source`);
    }
  }
});

test('a post published without attribution is never counted as attributed', () => {
  const summary = summarize(adaptTrendVideoLedger(videoLedger));
  assert.equal(
    summary.attribution.published_with_attribution
    + summary.attribution.published_without_attribution
    + summary.attribution.published_not_applicable,
    summary.published,
    'every published record must fall into exactly one attribution bucket'
  );
  assert.equal(summary.attribution.unattributed_ledger_ids.length, summary.attribution.published_without_attribution);
});

test('a record built with real attribution is reported as attributed', () => {
  const attributed = makeRecord({
    ledger_id: 'acq:attributed',
    lane: 'acquisition',
    platform: 'tiktok',
    status: 'PUBLISHED',
    utm: { utm_source: 'tiktok', utm_medium: 'social_video', utm_campaign: 'c', utm_content: 'd', asset_id: 'e' }
  });
  assert.equal(attributed.attribution_state, 'ATTRIBUTED');
  assert.equal(summarize([attributed]).attribution.published_with_attribution, 1);
});
