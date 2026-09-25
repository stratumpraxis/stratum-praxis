import fs from 'node:fs/promises';
import {
  loadProjectAdapterRegistry,
  resolveProjectAdapter
} from './project-adapter-router-v0.mjs';

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

async function githubDispatch({ repository, workflow, ref, inputs, token }) {
  const url = `https://api.github.com/repos/${repository}/actions/workflows/${encodeURIComponent(workflow)}/dispatches`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'x-github-api-version': '2022-11-28'
    },
    body: JSON.stringify({ ref, inputs })
  });

  if (response.status === 204) return { ok: true, status: 204, url };
  const body = await response.text();
  return { ok: false, status: response.status, url, body: body.slice(0, 1000) };
}

async function main() {
  const decisionFile =
    process.argv[2] ||
    process.env.CONTROL_LOOP_DECISION_FILE ||
    '/tmp/control-loop-decision.json';
  const outFile =
    process.env.CONTROL_LOOP_DISPATCH_RECEIPT ||
    'revenue-os/control-loop/dispatch-receipt.runtime.json';
  const dryRun = String(process.env.CONTROL_LOOP_DRY_RUN || '').toLowerCase() === 'true';

  const decision = JSON.parse(await fs.readFile(decisionFile, 'utf8'));
  const registry = await loadProjectAdapterRegistry();
  const route = resolveProjectAdapter(decision, registry);

  const receipt = {
    control_loop_version: 'autonomous-control-loop-v0',
    routed_at: new Date().toISOString(),
    status: route.status,
    reason: route.reason,
    decision_id: route.decision?.decision_id || null,
    action_id: route.decision?.action_id || null,
    business_unit: route.decision?.business_unit || null,
    dispatch: route.dispatch || null,
    dry_run: dryRun,
    github_dispatch: null
  };

  if (route.status !== 'ROUTABLE') {
    await fs.writeFile(outFile, JSON.stringify(receipt, null, 2) + '\n', 'utf8');
    console.log(JSON.stringify(receipt, null, 2));
    process.exit(route.status === 'HUMAN_GATE' ? 0 : 3);
  }

  if (dryRun) {
    receipt.status = 'DRY_RUN_ROUTABLE';
    await fs.writeFile(outFile, JSON.stringify(receipt, null, 2) + '\n', 'utf8');
    console.log(JSON.stringify(receipt, null, 2));
    return;
  }

  const currentRepository = text(process.env.GITHUB_REPOSITORY);
  const sameRepository = currentRepository && currentRepository === route.dispatch.repository;
  const token = sameRepository
    ? text(process.env.GITHUB_TOKEN)
    : text(process.env.CONTROL_LOOP_GITHUB_TOKEN);

  if (!token) {
    receipt.status = 'BLOCKED';
    receipt.reason = sameRepository
      ? 'LOCAL_DISPATCH_TOKEN_MISSING'
      : 'CROSS_PROJECT_DISPATCH_TOKEN_MISSING';
    await fs.writeFile(outFile, JSON.stringify(receipt, null, 2) + '\n', 'utf8');
    console.log(JSON.stringify(receipt, null, 2));
    process.exit(4);
  }

  const dispatched = await githubDispatch({
    ...route.dispatch,
    token
  });
  receipt.github_dispatch = dispatched;

  if (!dispatched.ok) {
    receipt.status = 'DISPATCH_FAILED';
    receipt.reason = `GITHUB_WORKFLOW_DISPATCH_HTTP_${dispatched.status}`;
    await fs.writeFile(outFile, JSON.stringify(receipt, null, 2) + '\n', 'utf8');
    console.log(JSON.stringify(receipt, null, 2));
    process.exit(5);
  }

  receipt.status = 'DISPATCHED';
  receipt.reason = 'DECISION_DELIVERED_TO_PROJECT_RUNTIME';
  await fs.writeFile(outFile, JSON.stringify(receipt, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify(receipt, null, 2));
}

main().catch(async (error) => {
  const failure = {
    control_loop_version: 'autonomous-control-loop-v0',
    status: 'FAILED',
    reason: text(error?.code) || text(error?.name) || 'UNEXPECTED',
    message: text(error?.message) || String(error)
  };
  console.error(JSON.stringify(failure, null, 2));
  process.exit(1);
});
