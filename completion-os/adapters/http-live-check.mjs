import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

function normalizeUrl(value) {
  if (!value) return null;
  try {
    const u = new URL(value);
    u.hash = '';
    return u.href;
  } catch {
    return null;
  }
}

function extractCanonical(html) {
  const tags = String(html).match(/<link\b[^>]*>/gi) || [];
  for (const tag of tags) {
    if (!/\brel\s*=\s*["'][^"']*canonical[^"']*["']/i.test(tag)) continue;
    const m = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i);
    if (m) return m[1].trim();
  }
  return null;
}

function matchesAll(html, values = []) {
  const text = String(html);
  return values.filter(v => !text.includes(v));
}

function matchesForbidden(html, values = []) {
  const text = String(html);
  return values.filter(v => text.includes(v));
}

function hasAsset(html, asset) {
  const escaped = String(asset).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?:src|href)\\s*=\\s*["'][^"']*${escaped}(?:[?#][^"']*)?["']`, 'i');
  return re.test(String(html));
}

function normalizeStatus(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function classifyLiveHttp({ spec, status, finalUrl, html, fetchError = null }) {
  if (!spec || typeof spec !== 'object') throw new Error('spec must be an object');
  const expectedStatus = Number(spec.expected_status ?? 200);
  const evidence = [];
  const failures = [];

  if (fetchError) {
    return {
      status: 'unknown',
      evidence: [`HTTP fetch inconclusive: ${fetchError}`],
      static_checks_passed: false,
      next_action: 'Retry one read-only Live check when the endpoint is reachable; do not claim Live from source or deploy evidence alone.'
    };
  }

  const actualStatus = normalizeStatus(status);
  evidence.push(`HTTP status: ${actualStatus ?? 'unknown'}`);
  if (actualStatus !== expectedStatus) failures.push(`Expected HTTP ${expectedStatus}, got ${actualStatus ?? 'unknown'}.`);

  if (spec.url) {
    const expectedUrl = normalizeUrl(spec.url);
    const actualUrl = normalizeUrl(finalUrl || spec.url);
    evidence.push(`Final URL: ${actualUrl || finalUrl || 'unknown'}`);
    if (expectedUrl && actualUrl) {
      const expected = new URL(expectedUrl);
      const actual = new URL(actualUrl);
      if (expected.origin !== actual.origin) failures.push(`Expected origin ${expected.origin}, got ${actual.origin}.`);
    }
  }

  const canonical = extractCanonical(html);
  if (spec.canonical) {
    const expectedCanonical = normalizeUrl(spec.canonical);
    const actualCanonical = canonical ? normalizeUrl(new URL(canonical, spec.url || finalUrl).href) : null;
    evidence.push(`Canonical: ${actualCanonical || 'missing'}`);
    if (!actualCanonical) failures.push('Canonical link is missing or invalid.');
    else if (expectedCanonical !== actualCanonical) failures.push(`Expected canonical ${expectedCanonical}, got ${actualCanonical}.`);
  }

  const missingText = matchesAll(html, spec.required_substrings || []);
  for (const item of missingText) failures.push(`Required marker missing: ${item}`);

  const forbiddenText = matchesForbidden(html, spec.forbidden_substrings || []);
  for (const item of forbiddenText) failures.push(`Forbidden marker present: ${item}`);

  const missingAssets = (spec.required_assets || []).filter(asset => !hasAsset(html, asset));
  for (const item of missingAssets) failures.push(`Required asset reference missing: ${item}`);

  if (failures.length) {
    return {
      status: 'fail',
      evidence: [...evidence, ...failures],
      static_checks_passed: false,
      next_action: 'Fix only the verified Live contract failure, deploy once, then rerun this read-only check.'
    };
  }

  evidence.push('Static HTTP/HTML contract checks passed.');

  if (spec.runtime_required !== false) {
    return {
      status: 'unknown',
      evidence,
      static_checks_passed: true,
      next_action: 'Run real-browser verification for JavaScript boot and the required interactive behavior before marking Live as pass.'
    };
  }

  return {
    status: 'pass',
    evidence,
    static_checks_passed: true,
    next_action: null
  };
}

async function fetchLive(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': 'Completion-OS-Live-Check/1.0' }
    });
    return {
      status: response.status,
      finalUrl: response.url,
      html: await response.text(),
      fetchError: null
    };
  } catch (error) {
    return { status: null, finalUrl: url, html: '', fetchError: error.message };
  } finally {
    clearTimeout(timer);
  }
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
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
    let sample;
    if (args.html) {
      sample = {
        status: Number(args.status || spec.expected_status || 200),
        finalUrl: args['final-url'] || spec.url,
        html: fs.readFileSync(args.html, 'utf8'),
        fetchError: null
      };
    } else {
      if (!spec.url) throw new Error('spec.url is required in live fetch mode');
      sample = await fetchLive(spec.url, Number(args.timeout || 15000));
    }
    process.stdout.write(`${JSON.stringify(classifyLiveHttp({ spec, ...sample }), null, 2)}\n`);
  } catch (error) {
    console.error(`HTTP live-check adapter error: ${error.message}`);
    process.exit(1);
  }
}
