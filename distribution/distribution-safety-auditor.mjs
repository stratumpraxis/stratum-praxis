import fs from 'node:fs/promises';

const manifestPath = process.env.TREND_VIDEO_MANIFEST || 'trend-video-engine/current.json';
const qaPath = process.env.TREND_VIDEO_QA || 'trend-video-engine/last-qa.json';
const policyPath = process.env.DISTRIBUTION_PROVIDER_POLICY || 'distribution/provider-policy.json';

function fail(message) {
  console.error(`DISTRIBUTION SAFETY FAIL: ${message}`);
  process.exit(1);
}

const [manifest, qa, policy] = await Promise.all([
  fs.readFile(manifestPath, 'utf8').then(JSON.parse),
  fs.readFile(qaPath, 'utf8').then(JSON.parse),
  fs.readFile(policyPath, 'utf8').then(JSON.parse)
]);

if (policy.global?.singlePublisherPerService !== true) fail('singlePublisherPerService must be enabled');
if (policy.global?.requireSafetyQa !== true) fail('requireSafetyQa must be enabled');
if (qa.approved !== true) fail('technical/safety QA has not approved the asset');

const requested = [...new Set((manifest.publish?.services || []).map(s => String(s).trim().toLowerCase()).filter(Boolean))];
if (!requested.length) fail('no publish services requested');

const qaServices = new Set((qa.services || []).map(s => String(s).trim().toLowerCase()));
for (const service of requested) {
  if (!qaServices.has(service)) fail(`${service} was not included in the approved QA scope`);
}

const providers = policy.providers || {};
for (const service of requested) {
  const publishers = Object.entries(providers).filter(([, cfg]) =>
    cfg?.status === 'active' &&
    cfg?.publishingEnabled === true &&
    Array.isArray(cfg.allowedServices) &&
    cfg.allowedServices.map(x => String(x).toLowerCase()).includes(service)
  );
  if (publishers.length !== 1) {
    fail(`${service} must have exactly one active publisher; found ${publishers.length}`);
  }
  if (publishers[0][0] !== 'buffer') fail(`${service} autonomous publisher must currently be Buffer`);
}

const buffer = providers.buffer;
if (!buffer || buffer.status !== 'active' || buffer.publishingEnabled !== true) fail('Buffer primary publisher is not active');

if (manifest.safety?.approved !== true || manifest.safety?.factsVerified !== true || manifest.safety?.originalityVerified !== true) {
  fail('manifest safety/fact/originality approvals are incomplete');
}
if (manifest.safety?.copyrightedMedia === true || manifest.safety?.realPersonLikeness === true) {
  fail('copyrighted media or real-person likeness is not allowed in the autonomous lane');
}
if (manifest.publish?.aiGeneratedLabel !== true) fail('AI-generated labeling must stay enabled');

console.log('DISTRIBUTION_SAFETY_OK');
console.log('requested services:', requested.join(', '));
console.log('publisher:', 'buffer');
console.log('secondary analytics provider:', providers.metricool?.status || 'not-configured');
