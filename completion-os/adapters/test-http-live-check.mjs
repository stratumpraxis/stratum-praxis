import assert from 'node:assert/strict';
import { classifyLiveHttp } from './http-live-check.mjs';

const baseSpec = {
  url: 'https://example.test/',
  expected_status: 200,
  canonical: 'https://example.test/',
  runtime_required: true,
  required_substrings: ['Utility Ready', 'id="app"'],
  required_assets: ['app.js', 'app.css'],
  forbidden_substrings: ['Other Brand']
};

const goodHtml = `<!doctype html><html><head>
<link rel="canonical" href="https://example.test/">
<link rel="stylesheet" href="/app.css">
</head><body><div id="app">Utility Ready</div><script src="/app.js"></script></body></html>`;

const staticOnly = classifyLiveHttp({
  spec: baseSpec,
  status: 200,
  finalUrl: 'https://example.test/',
  html: goodHtml
});
assert.equal(staticOnly.status, 'unknown');
assert.equal(staticOnly.static_checks_passed, true);
assert.match(staticOnly.next_action, /real-browser verification/i);

const noRuntimeNeeded = classifyLiveHttp({
  spec: { ...baseSpec, runtime_required: false },
  status: 200,
  finalUrl: 'https://example.test/',
  html: goodHtml
});
assert.equal(noRuntimeNeeded.status, 'pass');
assert.equal(noRuntimeNeeded.static_checks_passed, true);

const wrongCanonical = classifyLiveHttp({
  spec: baseSpec,
  status: 200,
  finalUrl: 'https://example.test/',
  html: goodHtml.replace('https://example.test/', 'https://old.example.test/')
});
assert.equal(wrongCanonical.status, 'fail');
assert.ok(wrongCanonical.evidence.some(x => x.includes('Expected canonical')));

const contaminated = classifyLiveHttp({
  spec: baseSpec,
  status: 200,
  finalUrl: 'https://example.test/',
  html: goodHtml.replace('Utility Ready', 'Utility Ready Other Brand')
});
assert.equal(contaminated.status, 'fail');
assert.ok(contaminated.evidence.some(x => x.includes('Forbidden marker present')));

const missingAsset = classifyLiveHttp({
  spec: baseSpec,
  status: 200,
  finalUrl: 'https://example.test/',
  html: goodHtml.replace('<script src="/app.js"></script>', '')
});
assert.equal(missingAsset.status, 'fail');
assert.ok(missingAsset.evidence.some(x => x.includes('Required asset reference missing')));

const unavailable = classifyLiveHttp({
  spec: baseSpec,
  status: null,
  finalUrl: 'https://example.test/',
  html: '',
  fetchError: 'network timeout'
});
assert.equal(unavailable.status, 'unknown');
assert.equal(unavailable.static_checks_passed, false);

console.log('HTTP live-check adapter tests passed');
