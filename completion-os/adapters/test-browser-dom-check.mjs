import assert from 'node:assert/strict';
import { classifyBrowserDom } from './browser-dom-check.mjs';

const spec = {
  interaction_required: true,
  required_substrings: ['class="app-ready"', 'data-result'],
  forbidden_substrings: ['id="boot"'],
  minimum_counts: { 'data-item=': 3 }
};

const booted = '<body class="app-ready"><div data-result></div><i data-item="1"></i><i data-item="2"></i><i data-item="3"></i></body>';
const good = classifyBrowserDom({ spec, dom: booted });
assert.equal(good.status, 'unknown');
assert.equal(good.browser_boot_passed, true);
assert.match(good.next_action, /interaction checks/i);

const complete = classifyBrowserDom({ spec: { ...spec, interaction_required: false }, dom: booted });
assert.equal(complete.status, 'pass');
assert.equal(complete.browser_boot_passed, true);

const staleBoot = classifyBrowserDom({ spec, dom: booted + '<div id="boot"></div>' });
assert.equal(staleBoot.status, 'fail');
assert.equal(staleBoot.browser_boot_passed, false);

const tooFew = classifyBrowserDom({ spec, dom: booted.replace('<i data-item="3"></i>', '') });
assert.equal(tooFew.status, 'fail');
assert.ok(tooFew.evidence.some(x => x.includes('count too low')));

const noBrowser = classifyBrowserDom({ spec, dom: '', browserError: 'chrome unavailable' });
assert.equal(noBrowser.status, 'unknown');
assert.equal(noBrowser.browser_boot_passed, false);

console.log('Browser DOM adapter tests passed');
