#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { rankOpportunities } from '../lib/value-network.mjs';

const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const inputArg = args.find((arg) => !arg.startsWith('--'));
const file = inputArg || path.resolve('acquisition/opportunity-engine/live-candidates.json');
const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
const ranked = rankOpportunities(payload.items || []);

const report = {
  generated_at: new Date().toISOString(),
  total: ranked.length,
  counts: ranked.reduce((acc, item) => {
    const state = item.routing.state;
    acc[state] = (acc[state] || 0) + 1;
    return acc;
  }, {}),
  items: ranked.map((item) => ({
    id: item.id,
    title: item.title,
    platform: item.platform,
    state: item.routing.state,
    lane: item.routing.lane,
    score: Number.isFinite(item.routing.score) ? Number(item.routing.score.toFixed(2)) : null,
    reasons: item.routing.audit?.reasons || [item.routing.reason],
    human_gates: item.routing.audit?.required_human_gates || []
  }))
};

if (jsonMode) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`Value Acquisition Network: ${report.total} candidate(s)`);
  for (const item of report.items) {
    console.log(`- ${item.id}: ${item.state} / ${item.lane} / score=${item.score ?? 'REJECT'}`);
    if (item.human_gates.length) console.log(`  HUMAN GATES: ${item.human_gates.join(', ')}`);
    if (item.reasons.length) console.log(`  reasons: ${item.reasons.join(', ')}`);
  }
}
