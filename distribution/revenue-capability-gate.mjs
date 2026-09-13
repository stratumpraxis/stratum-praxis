import { readFile, writeFile } from 'node:fs/promises';

const SELECTED_FILE = new URL('./revenue-strike-selected.json', import.meta.url);
const AUDIT_FILE = new URL('./buffer-channel-audit-result.json', import.meta.url);
const PERFORMANCE_FILE = new URL(process.env.REVENUE_PERFORMANCE_FILE || './revenue-performance.runtime.json', import.meta.url);
const OUT_FILE = new URL('./revenue-dispatch-plan.json', import.meta.url);

async function readJson(url, fallback) {
  try { return JSON.parse(await readFile(url, 'utf8')); }
  catch { return fallback; }
}

const selected = await readJson(SELECTED_FILE, []);
const audit = await readJson(AUDIT_FILE, null);
const performance = await readJson(PERFORMANCE_FILE, null);

const brandNames = new Set((process.env.REVENUE_BRAND_CHANNEL_NAMES || 'stratumpraxis,praxisstratum')
  .split(',')
  .map(value => value.trim().toLowerCase())
  .filter(Boolean));
const textPublisherServices = new Set((process.env.REVENUE_TEXT_PUBLISHER_SERVICES || 'linkedin,threads,bluesky,mastodon')
  .split(',')
  .map(value => value.trim().toLowerCase())
  .filter(Boolean));

const channels = (audit?.organizations || []).flatMap(org => org?.channels || []);
const connectedBrandChannels = channels.filter(channel => {
  const names = [channel?.name, channel?.displayName].map(value => String(value || '').trim().toLowerCase());
  return names.some(name => brandNames.has(name))
    && channel?.isLocked !== true
    && channel?.isDisconnected !== true
    && channel?.isQueuePaused !== true;
});

const dispatchable = [];
const blocked = [];

for (const item of selected) {
  const services = Array.isArray(item?.services) ? item.services : [];
  for (const rawService of services) {
    const service = String(rawService).toLowerCase();
    const connected = connectedBrandChannels.find(channel => String(channel?.service || '').toLowerCase() === service);

    if (performance?.status !== 'live') {
      blocked.push({ id: item.id, service, reason: 'evidence_not_live' });
      continue;
    }
    if (!connected) {
      blocked.push({ id: item.id, service, reason: 'brand_channel_not_connected' });
      continue;
    }
    if (!textPublisherServices.has(service)) {
      blocked.push({ id: item.id, service, reason: 'publisher_adapter_not_compatible_with_queue_asset' });
      continue;
    }

    dispatchable.push({
      id: item.id,
      service,
      channel_id: connected.id,
      selection_mode: item.selection_mode || 'explore',
      evidence_mode: item.evidence_mode || null
    });
  }
}

const output = {
  generated_at: new Date().toISOString(),
  status: dispatchable.length > 0 ? 'READY' : 'BLOCKED_CAPABILITY',
  performance_status: performance?.status || 'missing',
  connected_brand_channels: connectedBrandChannels.map(channel => ({
    id: channel.id,
    name: channel.name,
    service: channel.service
  })),
  text_publisher_services: [...textPublisherServices],
  dispatchable,
  blocked
};

await writeFile(OUT_FILE, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
