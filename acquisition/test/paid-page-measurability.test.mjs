// Every page that can take money must be measurable.
//
// This exists because an audit found 21 paid pages emitting nothing at all. A
// checkout click on any of them was invisible, which does not just lose data - it
// makes the funnel numbers wrong in a specific, misleading direction. The recorded
// "17 checkout_clicks in 30 days" was measured over a fraction of the paid surface
// while reading as if it covered all of it.
//
// The rules are deliberately narrow. This does not check copy, price or design. It
// checks the three things without which a paid page cannot be reasoned about at all:
// it emits events, its checkout links are identifiable, and those identifiers are
// unique so two pages cannot be confused for one another.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import { REPO_ROOT } from '../lib/util.mjs';

const SKIP_DIRS = ['.git', 'node_modules', 'systems/packages'];

// Buyer-only delivery pages sit behind a completed purchase and are noindex. They
// are not an acquisition surface and are deliberately out of scope.
const SKIP_PREFIXES = ['delivery/'];

const CHECKOUT_ANCHOR = /<a\b[^>]*buy\.stripe\.com[^>]*>/g;

async function paidPages() {
  const found = [];
  async function walk(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const rel = path.relative(REPO_ROOT, full);
      if (SKIP_DIRS.some((d) => rel.startsWith(d) || rel.includes(`/${d}`))) continue;
      if (entry.isDirectory()) { await walk(full); continue; }
      if (!entry.name.endsWith('.html')) continue;
      if (SKIP_PREFIXES.some((p) => rel.startsWith(p))) continue;
      const html = await fs.readFile(full, 'utf8');
      if (/buy\.stripe\.com\//.test(html)) found.push({ rel, html });
    }
  }
  await walk(REPO_ROOT);
  return found;
}

test('every paid page loads the shared analytics', async () => {
  const pages = await paidPages();
  assert.ok(pages.length > 0, 'the audit must actually find paid pages');
  const silent = pages.filter((p) => !p.html.includes('scos-analytics.js')).map((p) => p.rel);
  assert.deepEqual(silent, [],
    'these pages can take money but emit no events, so their checkouts cannot be measured');
});

test('every checkout link carries a stable analytics id', async () => {
  const pages = await paidPages();
  const anonymous = [];
  for (const { rel, html } of pages) {
    for (const anchor of html.match(CHECKOUT_ANCHOR) ?? []) {
      if (!anchor.includes('data-analytics-id')) anonymous.push(rel);
    }
  }
  // Without an id, scos-analytics.js falls back to the link text, which changes with
  // a copy edit and differs per language on any page with a translation switcher.
  assert.deepEqual([...new Set(anonymous)], [],
    'these checkout links would report a copy-dependent cta_id');
});

test('no two pages share a checkout analytics id', async () => {
  const pages = await paidPages();
  const owners = new Map();
  for (const { rel, html } of pages) {
    for (const anchor of html.match(CHECKOUT_ANCHOR) ?? []) {
      const id = /data-analytics-id="([^"]+)"/.exec(anchor)?.[1];
      if (!id) continue;
      if (!owners.has(id)) owners.set(id, new Set());
      owners.get(id).add(rel);
    }
  }
  const shared = [...owners.entries()]
    .filter(([, files]) => files.size > 1)
    .map(([id, files]) => `${id} used by ${[...files].join(', ')}`);
  assert.deepEqual(shared, [], 'a reused cta_id merges two funnels into one number');
});

test('the audit covers the known paid destinations', async () => {
  // A guard on the guard: if the discovery pattern ever stops matching, the three
  // tests above would pass by finding nothing at all.
  const pages = await paidPages();
  const rels = pages.map((p) => p.rel);
  for (const expected of ['prompt-store/index.html', 'cross-agent-operating-kit.html']) {
    assert.ok(rels.includes(expected), `${expected} must be discovered as a paid page`);
  }
  assert.ok(pages.length >= 40, `expected the full paid surface, found ${pages.length}`);
});
