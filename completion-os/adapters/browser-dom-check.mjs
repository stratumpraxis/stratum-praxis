import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

function count(text, needle) {
  if (!needle) return 0;
  let n = 0, i = 0;
  while ((i = text.indexOf(needle, i)) !== -1) { n += 1; i += needle.length; }
  return n;
}

export function classifyBrowserDom({ spec, dom, browserError = null }) {
  if (!spec || typeof spec !== 'object') throw new Error('spec must be an object');
  if (browserError) {
    return {
      status: 'unknown',
      browser_boot_passed: false,
      evidence: [`Browser probe inconclusive: ${browserError}`],
      next_action: 'Run one real-browser probe when the endpoint/browser is available; do not infer runtime success from HTTP evidence.'
    };
  }

  const html = String(dom || '');
  const failures = [];
  const evidence = [];

  for (const marker of spec.required_substrings || []) {
    if (!html.includes(marker)) failures.push(`Required runtime marker missing: ${marker}`);
  }
  for (const marker of spec.forbidden_substrings || []) {
    if (html.includes(marker)) failures.push(`Forbidden runtime marker present: ${marker}`);
  }
  for (const [marker, min] of Object.entries(spec.minimum_counts || {})) {
    const actual = count(html, marker);
    evidence.push(`Count ${marker}: ${actual}`);
    if (actual < Number(min)) failures.push(`Runtime marker count too low: ${marker} expected >= ${min}, got ${actual}`);
  }

  if (failures.length) {
    return {
      status: 'fail',
      browser_boot_passed: false,
      evidence: [...evidence, ...failures],
      next_action: 'Inspect the verified browser-runtime failure, fix only that cause, deploy once, and rerun the browser probe.'
    };
  }

  evidence.push('Browser-rendered DOM contains all required runtime boot markers.');

  if (spec.interaction_required !== false) {
    return {
      status: 'unknown',
      browser_boot_passed: true,
      evidence,
      next_action: 'Run the defined interaction checks (input/change/result or support transition) before marking the full Live gate as pass.'
    };
  }

  return {
    status: 'pass',
    browser_boot_passed: true,
    evidence,
    next_action: null
  };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i], value = argv[i + 1];
    if (!key?.startsWith('--') || value == null) throw new Error('arguments must be --key value pairs');
    args[key.slice(2)] = value;
  }
  return args;
}

const isDirect = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirect) {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.spec) throw new Error('--spec is required');
    const spec = JSON.parse(fs.readFileSync(args.spec, 'utf8'));
    const dom = args.dom ? fs.readFileSync(args.dom, 'utf8') : '';
    const browserError = args.error || null;
    process.stdout.write(`${JSON.stringify(classifyBrowserDom({ spec, dom, browserError }), null, 2)}\n`);
  } catch (error) {
    console.error(`Browser DOM adapter error: ${error.message}`);
    process.exit(1);
  }
}
