import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve('automation/forwelle-operator');
const manifest = JSON.parse(await fs.readFile(path.join(ROOT, 'current.json'), 'utf8'));
let ledger = {version:1, items:{}};
try { ledger = JSON.parse(await fs.readFile(path.join(ROOT, 'publish-ledger.json'), 'utf8')); } catch {}
let state = {version:1, recentCandidateIds:[], lastScoutAt:null};
try { state = JSON.parse(await fs.readFile(path.join(ROOT, 'state.json'), 'utf8')); } catch {}
let history = {version:1, items:[]};
try { history = JSON.parse(await fs.readFile(path.join(ROOT, 'history.json'), 'utf8')); } catch {}

const platformState = ledger.items?.[manifest.id] || {};
const services = manifest.publish?.services || [];
const platforms = {};
for (const service of services) {
  const x = platformState[service] || {};
  platforms[service] = {
    status: x.status || 'NOT_ATTEMPTED',
    postId: x.postId || null,
    externalLink: x.externalLink || null,
    sentAt: x.sentAt || null,
    dueAt: x.dueAt || null,
    message: x.message || null
  };
}
const published = Object.values(platforms).filter(x => x.status === 'sent' && x.externalLink);
const accepted = Object.values(platforms).filter(x => ['accepted','scheduled','sending','buffer'].includes(x.status));
const stateLabel = published.length ? 'PUBLISHED_PARTIAL_OR_FULL' : accepted.length ? 'QUEUED_OR_SENDING' : 'ATTEMPTED_OR_BLOCKED';
const item = {
  id: manifest.id,
  candidateId: manifest.sourceCandidateId || null,
  createdAt: manifest.createdAt,
  recordedAt: new Date().toISOString(),
  title: manifest.title,
  source: manifest.sources?.[0] || null,
  outputFile: manifest.outputFile,
  state: stateLabel,
  platforms,
  metrics: {}
};
const idx = history.items.findIndex(x => x.id === item.id);
if (idx >= 0) history.items[idx] = {...history.items[idx], ...item, metrics: history.items[idx].metrics || {}};
else history.items.unshift(item);
history.items = history.items.slice(0, 180);

if (manifest.sourceCandidateId) {
  state.recentCandidateIds = [manifest.sourceCandidateId, ...(state.recentCandidateIds || []).filter(x => x !== manifest.sourceCandidateId)].slice(0, 120);
}
state.lastRun = {id: manifest.id, at: item.recordedAt, state: stateLabel};
await fs.writeFile(path.join(ROOT, 'history.json'), JSON.stringify(history, null, 2) + '\n');
await fs.writeFile(path.join(ROOT, 'state.json'), JSON.stringify(state, null, 2) + '\n');
await fs.writeFile(path.join(ROOT, 'run-status.json'), JSON.stringify({at:item.recordedAt,status:stateLabel,manifestId:manifest.id,platforms}, null, 2) + '\n');
console.log(JSON.stringify({id: manifest.id, state: stateLabel, platforms}, null, 2));
