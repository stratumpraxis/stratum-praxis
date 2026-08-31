import fs from 'node:fs';
import path from 'node:path';
import {SAFE_AREA, TELOP_COPY, TELOP_RULES} from '../src/telop-spec.mjs';

const fail = (message) => {
  console.error(`QA FAIL: ${message}`);
  process.exit(1);
};

const output = process.argv[2] || 'out/forwelle-agent-stop-condition.mp4';
const specs = Object.values(TELOP_COPY);

if (SAFE_AREA.left < TELOP_RULES.minSideSafeArea || SAFE_AREA.right < TELOP_RULES.minSideSafeArea) {
  fail('horizontal safe area is too small');
}
if (SAFE_AREA.top < TELOP_RULES.minTopSafeArea) fail('top safe area is too small');
if (SAFE_AREA.bottom < TELOP_RULES.minBottomSafeArea) fail('bottom safe area is too small');

const seen = new Set();
for (const spec of specs) {
  if (!spec.role) fail('every telop requires a semantic role');
  if (!spec.eyebrow || !spec.counter) fail(`${spec.role}: eyebrow/counter missing`);
  if (!Array.isArray(spec.lines)) fail(`${spec.role}: title lines missing`);
  if (spec.lines.length < TELOP_RULES.minTitleLines || spec.lines.length > TELOP_RULES.maxTitleLines) {
    fail(`${spec.role}: title must use ${TELOP_RULES.minTitleLines}-${TELOP_RULES.maxTitleLines} lines`);
  }
  for (const line of spec.lines) {
    if (!line.trim()) fail(`${spec.role}: empty title line`);
    if (line.length > TELOP_RULES.maxCharsPerTitleLine) {
      fail(`${spec.role}: title line exceeds ${TELOP_RULES.maxCharsPerTitleLine} characters: ${line}`);
    }
  }
  if (!Number.isInteger(spec.accentLine) || spec.accentLine < 0 || spec.accentLine >= spec.lines.length) {
    fail(`${spec.role}: accentLine must point to one title line`);
  }
  const fingerprint = spec.lines.join(' ').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (seen.has(fingerprint)) fail(`${spec.role}: duplicate screen message`);
  seen.add(fingerprint);
}

if (!fs.existsSync(output)) fail(`rendered MP4 missing: ${output}`);
const bytes = fs.statSync(output).size;
if (bytes < 100_000) fail(`rendered MP4 unexpectedly small: ${bytes} bytes`);

const report = {
  approved: true,
  preset: TELOP_RULES.preset,
  sceneCount: specs.length,
  safeArea: SAFE_AREA,
  titleRules: {
    maxLines: TELOP_RULES.maxTitleLines,
    maxCharsPerLine: TELOP_RULES.maxCharsPerTitleLine,
  },
  outputFile: output,
  bytes,
  checks: [
    'platform-safe text margins',
    'one primary title message per scene',
    'title line-count and density limits',
    'explicit accent line per scene',
    'duplicate primary-message rejection',
    'rendered output exists and is non-trivial',
  ],
};

const reportPath = 'out/qa-report.json';
fs.mkdirSync(path.dirname(reportPath), {recursive: true});
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log('QA PASS');
console.log(JSON.stringify(report, null, 2));
