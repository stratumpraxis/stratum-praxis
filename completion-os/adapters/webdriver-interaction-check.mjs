import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function request(path, { method = 'GET', body } = {}) {
  const response = await fetch(`http://127.0.0.1:9515${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.value?.error) throw new Error(data?.value?.message || `WebDriver HTTP ${response.status}`);
  return data.value;
}

async function waitDriver(timeoutMs = 10000) {
  const end = Date.now() + timeoutMs;
  let last;
  while (Date.now() < end) {
    try { return await request('/status'); } catch (e) { last = e; await sleep(250); }
  }
  throw last || new Error('ChromeDriver did not become ready');
}

async function execute(sessionId, script, args = []) {
  return request(`/session/${sessionId}/execute/sync`, { method: 'POST', body: { script, args } });
}

async function waitSelector(sessionId, selector, timeoutMs = 15000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const ok = await execute(sessionId, 'return !!document.querySelector(arguments[0])', [selector]);
    if (ok) return true;
    await sleep(250);
  }
  return false;
}

export async function runInteractionCheck(spec, driverPath) {
  if (!driverPath) {
    return { status: 'unknown', interaction_passed: false, evidence: ['ChromeDriver binary unavailable.'], next_action: 'Run the interaction probe on a runner with ChromeDriver.' };
  }

  const driver = spawn(driverPath, ['--port=9515'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let driverErr = '';
  driver.stderr.on('data', d => { driverErr += d.toString(); });
  let sessionId;
  try {
    await waitDriver();
    const session = await request('/session', {
      method: 'POST',
      body: {
        capabilities: {
          alwaysMatch: {
            browserName: 'chrome',
            'goog:chromeOptions': { args: ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] }
          }
        }
      }
    });
    sessionId = session.sessionId;
    await request(`/session/${sessionId}/url`, { method: 'POST', body: { url: spec.url } });

    if (!(await waitSelector(sessionId, spec.wait_for, Number(spec.wait_timeout_ms || 15000)))) {
      return { status: 'fail', interaction_passed: false, evidence: [`Runtime selector did not appear: ${spec.wait_for}`], next_action: 'Inspect runtime boot or selector drift before changing unrelated code.' };
    }

    const before = await execute(sessionId, `
      const el=document.querySelector(arguments[0]);
      return el ? String(el.textContent||'').trim() : null;
    `, [spec.observe.selector]);

    const mutation = await execute(sessionId, `
      const el=document.querySelector(arguments[0]);
      if(!el) return {ok:false,reason:'target missing'};
      const prop=arguments[1], value=arguments[2], events=arguments[3]||[];
      const previous=el[prop];
      if(prop==='checked') el.checked=Boolean(value); else el[prop]=String(value);
      for(const name of events) el.dispatchEvent(new Event(name,{bubbles:true}));
      return {ok:true,previous,current:el[prop]};
    `, [spec.action.selector, spec.action.property, spec.action.value, spec.action.events || ['input','change']]);

    if (!mutation?.ok) {
      return { status: 'fail', interaction_passed: false, evidence: [`Interaction target failed: ${spec.action.selector}`], next_action: 'Inspect the verified interaction target/handler before changing unrelated code.' };
    }

    await sleep(Number(spec.observe.wait_ms || 900));
    const after = await execute(sessionId, `
      const el=document.querySelector(arguments[0]);
      return el ? String(el.textContent||'').trim() : null;
    `, [spec.observe.selector]);

    if (spec.restore !== false) {
      await execute(sessionId, `
        const el=document.querySelector(arguments[0]);
        if(!el) return false;
        const prop=arguments[1], value=arguments[2], events=arguments[3]||[];
        el[prop]=value;
        for(const name of events) el.dispatchEvent(new Event(name,{bubbles:true}));
        return true;
      `, [spec.action.selector, spec.action.property, mutation.previous, spec.action.events || ['input','change']]).catch(() => null);
    }

    const changed = before !== null && after !== null && before !== after;
    const evidence = [
      `Runtime target: ${spec.action.selector}`,
      `Observed selector: ${spec.observe.selector}`,
      `Before: ${before}`,
      `After: ${after}`
    ];

    if (!changed) {
      return { status: 'fail', interaction_passed: false, evidence, next_action: 'The page booted, but the defined input/change did not change the expected result. Inspect the verified event/result path.' };
    }

    return { status: 'pass', interaction_passed: true, evidence, next_action: null };
  } catch (error) {
    return {
      status: 'unknown',
      interaction_passed: false,
      evidence: [`WebDriver probe inconclusive: ${error.message}`, driverErr.slice(-1000)].filter(Boolean),
      next_action: 'Retry one read-only browser interaction probe when the runner/endpoint is healthy.'
    };
  } finally {
    if (sessionId) await request(`/session/${sessionId}`, { method: 'DELETE' }).catch(() => null);
    driver.kill('SIGTERM');
  }
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
    const result = await runInteractionCheck(spec, args.driver || process.env.CHROMEDRIVER);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    console.error(`WebDriver interaction adapter error: ${error.message}`);
    process.exit(1);
  }
}
