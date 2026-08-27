import { readFile } from 'node:fs/promises';

const queueFile = process.env.BUFFER_QUEUE_FILE || 'content-queue.json';
const allowedDomains = new Set((process.env.ALLOWED_REVENUE_DOMAINS || 'stratumpraxis.com').split(',').map(s => s.trim().toLowerCase()).filter(Boolean));
const maxServicesPerItem = Number(process.env.MAX_SERVICES_PER_ITEM || 3);
const requiredUtm = process.env.REQUIRE_UTM !== '0';

const riskyPhrases = [
  /guaranteed\s+(income|profit|returns?)/i,
  /risk[- ]?free\s+(income|profit|returns?)/i,
  /get\s+rich\s+quick/i,
  /instant\s+(income|profit|money)/i,
  /no\s+risk/i,
  /100%\s+guaranteed/i,
];

const queue = JSON.parse(await readFile(new URL(`./${queueFile}`, import.meta.url), 'utf8'));
if (!Array.isArray(queue)) throw new Error('Distribution queue must be an array');

const errors = [];
const seenIds = new Set();
const seenText = new Map();

for (const [index, item] of queue.entries()) {
  const label = item?.id || `index:${index}`;
  if (!item?.id || typeof item.id !== 'string') errors.push(`${label}: missing string id`);
  if (seenIds.has(item.id)) errors.push(`${label}: duplicate id`);
  seenIds.add(item.id);

  if (item.active === false) continue;

  if (!Array.isArray(item.services) || item.services.length === 0) errors.push(`${label}: no services`);
  if (Array.isArray(item.services) && item.services.length > maxServicesPerItem) errors.push(`${label}: ${item.services.length} services exceeds safe max ${maxServicesPerItem}`);

  const text = String(item.text || '').trim();
  if (!text) errors.push(`${label}: empty text`);
  const normalized = text.toLowerCase().replace(/\s+/g, ' ');
  if (seenText.has(normalized)) errors.push(`${label}: duplicate active text also used by ${seenText.get(normalized)}`);
  else seenText.set(normalized, label);
  for (const rule of riskyPhrases) if (rule.test(text)) errors.push(`${label}: risky promotional phrase matched ${rule}`);

  let url;
  try { url = new URL(item.url); } catch { errors.push(`${label}: invalid URL`); continue; }
  if (url.protocol !== 'https:') errors.push(`${label}: URL must use HTTPS`);
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (![...allowedDomains].some(d => host === d || host.endsWith(`.${d}`))) errors.push(`${label}: unapproved revenue domain ${host}`);
  if (requiredUtm && (!url.searchParams.get('utm_source') || !url.searchParams.get('utm_medium') || !url.searchParams.get('utm_campaign'))) errors.push(`${label}: missing required UTM parameters`);
}

if (errors.length) {
  console.error('Distribution safety audit FAILED');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log(`Distribution safety audit passed: ${queue.filter(x => x.active !== false).length} active items; max ${maxServicesPerItem} services/item; approved domains: ${[...allowedDomains].join(', ')}`);
