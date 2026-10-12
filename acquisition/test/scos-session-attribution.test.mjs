import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const source = await fs.readFile(new URL('../../scos-analytics.js', import.meta.url), 'utf8');

test('explicit campaign parameters refresh the current session attribution', () => {
  assert.match(
    source,
    /const hasExplicitSignal\s*=\s*\['utm_source','utm_medium','utm_campaign','utm_content','utm_term','asset_id','route_id'\]/
  );
  assert.match(
    source,
    /if \(!session \|\| typeof session !== 'object' \|\| hasExplicitSignal\)/
  );
  assert.match(
    source,
    /sessionStorage\.setItem\(SESSION_ATTRIBUTION_KEY, JSON\.stringify\(session\)\)/
  );
});

test('fresh explicit campaign signal also updates last-touch attribution', () => {
  assert.match(
    source,
    /const hasFreshSignal = hasExplicitSignal \|\| current\.utm_source !== 'direct' \|\| current\.utm_campaign \|\| current\.referrer/
  );
  assert.match(
    source,
    /if \(hasFreshSignal \|\| !storageGet\(LAST_TOUCH_KEY\)\) storageSet\(LAST_TOUCH_KEY, current\)/
  );
});

test('Stripe checkout decoration still uses the current attribution object', () => {
  assert.match(source, /attribution\.utm_source/);
  assert.match(source, /attribution\.utm_campaign/);
  assert.match(source, /attribution\.utm_content/);
  assert.match(
    source,
    /if \(attribution\[key\]\) url\.searchParams\.set\(key, attribution\[key\]\)/
  );
});
