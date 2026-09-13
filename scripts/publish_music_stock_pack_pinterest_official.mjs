#!/usr/bin/env node
import fs from 'node:fs';

const token = (process.env.PINTEREST_ACCESS_TOKEN || '').trim();
const expected = (process.env.PINTEREST_EXPECTED_USERNAME || 'stratumpraxis').trim().toLowerCase();
const fail = (m) => { console.error(`FAIL_CLOSED: ${m}`); process.exit(1); };
if (!token) fail('PINTEREST_ACCESS_TOKEN missing');

const API = 'https://api.pinterest.com/v5';
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
const boardName = 'Music & Audio Assets | Stratum Praxis';
const boardDescription = 'Original instrumental music and audio assets for product demos, tutorials, coding and study content, presentations, and social video.';
const title = 'Music Stock Pack v1 — 9 WAVs for $9';
const description = '$9 gets 9 ready-to-edit WAV files: 3 original instrumental tracks × 60s / 30s / 15s. Built for SaaS demos, tutorials, app walkthroughs, coding and study content, presentations and social video. 48 kHz / 24-bit stereo.';
const link = 'https://stratumpraxis.com/music-stock-pack-v1.html?utm_source=pinterest&utm_medium=social&utm_campaign=music_v1_pinterest01';
const imageUrl = 'https://raw.githubusercontent.com/stratumpraxis/stratum-praxis/main/assets/music-stock-pack-v1-instagram.png';

async function jsonRequest(path, options = {}) {
  const r = await fetch(`${API}${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  const text = await r.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch (_) { body = { raw: text.slice(0, 500) }; }
  if (!r.ok) fail(`${options.method || 'GET'} ${path} failed ${r.status}: ${text.slice(0, 500)}`);
  return { status: r.status, body };
}

async function listAll(path) {
  const items = [];
  let bookmark = null;
  for (let page = 0; page < 20; page++) {
    const sep = path.includes('?') ? '&' : '?';
    const suffix = bookmark ? `${sep}bookmark=${encodeURIComponent(bookmark)}` : '';
    const { body } = await jsonRequest(path + suffix);
    items.push(...(body?.items || []));
    bookmark = body?.bookmark || null;
    if (!bookmark) break;
  }
  return items;
}

const { body: account } = await jsonRequest('/user_account');
if (String(account?.username || '').toLowerCase() !== expected) fail(`ACCOUNT_CHECK failed: expected ${expected}, got ${account?.username || 'unknown'}`);
if (String(account?.account_type || '').toUpperCase() !== 'BUSINESS') fail(`ACCOUNT_TYPE_CHECK failed: ${account?.account_type || 'unknown'}`);

const boards = await listAll('/boards?page_size=100');
let board = boards.find((b) => b.name === boardName);
let boardCreated = false;
if (!board) {
  const created = await jsonRequest('/boards', {
    method: 'POST',
    body: JSON.stringify({ name: boardName, description: boardDescription })
  });
  board = created.body;
  boardCreated = true;
}
if (!board?.id) fail('Board ID missing after create/lookup');

const pins = await listAll(`/boards/${encodeURIComponent(board.id)}/pins?page_size=100`);
let pin = pins.find((p) => p.link === link || p.title === title);
let pinCreated = false;
if (!pin) {
  const created = await jsonRequest('/pins', {
    method: 'POST',
    body: JSON.stringify({
      board_id: board.id,
      title,
      description,
      link,
      media_source: { source_type: 'image_url', url: imageUrl, is_standard: true }
    })
  });
  if (created.status !== 201 && created.status !== 200) fail(`Unexpected create Pin status: ${created.status}`);
  pin = created.body;
  pinCreated = true;
}
if (!pin?.id) fail('Pin ID missing after create/lookup');

const { body: verifiedPin } = await jsonRequest(`/pins/${encodeURIComponent(pin.id)}`);
if (String(verifiedPin?.board_id || '') !== String(board.id)) fail('PIN_BOARD_VERIFY failed');
if (verifiedPin?.link && verifiedPin.link !== link) fail(`PIN_LINK_VERIFY failed: ${verifiedPin.link}`);

const evidence = {
  brand: 'Stratum',
  asset: 'Music Stock Pack v1',
  platform: 'pinterest',
  account_handle: account.username,
  account_id: account.id || null,
  account_type: account.account_type || null,
  account_verified: true,
  board_id: String(board.id),
  board_name: board.name,
  board_created: boardCreated,
  pin_id: String(pin.id),
  pin_created: pinCreated,
  pin_title: verifiedPin?.title || title,
  destination: verifiedPin?.link || link,
  image_url: imageUrl,
  public_url: `https://www.pinterest.com/pin/${pin.id}/`,
  verified_at: new Date().toISOString()
};

fs.mkdirSync('publishing/evidence', { recursive: true });
fs.writeFileSync('publishing/evidence/stratum-pinterest-music-stock-pack-v1-001.json', JSON.stringify(evidence, null, 2) + '\n');
console.log('PINTEREST_MUSIC_PUBLICATION_EVIDENCE:', JSON.stringify(evidence));
