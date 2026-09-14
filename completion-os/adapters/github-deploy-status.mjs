import fs from 'node:fs';

function uniqueLatestByContext(statuses) {
  const seen = new Set();
  const latest = [];
  for (const status of statuses || []) {
    if (!status?.context || seen.has(status.context)) continue;
    seen.add(status.context);
    latest.push(status);
  }
  return latest;
}

function retryHint(text = '') {
  const m = String(text).match(/retry\s+in\s+([^.;]+)/i);
  return m ? m[1].trim() : null;
}

function isExternalBlock(text = '') {
  return /(rate limit|quota|temporar(?:y|ily) unavailable|retry\s+in|capacity)/i.test(String(text));
}

export function classifyDeployStatuses(payload, contextPattern) {
  if (!payload || typeof payload !== 'object') throw new Error('status payload must be an object');
  if (!contextPattern) throw new Error('context pattern is required');

  const re = new RegExp(contextPattern, 'i');
  const latest = uniqueLatestByContext(Array.isArray(payload.statuses) ? payload.statuses : []);
  const matches = latest.filter(s => re.test(s.context || ''));

  if (!matches.length) {
    return {
      status: 'unknown',
      evidence: [`No latest commit status matched /${contextPattern}/i.`],
      next_action: 'Confirm the intended deployment context/project and collect deployment evidence.'
    };
  }

  const evidence = matches.map(s => {
    const description = s.description ? ` — ${s.description}` : '';
    const target = s.target_url ? ` — ${s.target_url}` : '';
    return `${s.context}: ${s.state}${description}${target}`;
  });

  const hardFailure = matches.find(s => ['failure', 'error'].includes(s.state) && !isExternalBlock(s.description));
  if (hardFailure) {
    return {
      status: 'fail',
      evidence,
      next_action: 'Inspect the failing deployment/build evidence, fix only the verified cause, then redeploy once.'
    };
  }

  const blocked = matches.find(s => ['failure', 'error'].includes(s.state) && isExternalBlock(s.description));
  if (blocked) {
    const hint = retryHint(blocked.description);
    return {
      status: 'blocked',
      evidence,
      next_action: hint
        ? `Do not retry before the provider window clears (${hint}). Then deploy once and record the deployed revision.`
        : 'Wait for the verified provider-side block to clear, then deploy once and record the deployed revision.',
      retry_after: hint || 'provider-defined'
    };
  }

  if (matches.some(s => s.state === 'pending')) {
    return {
      status: 'unknown',
      evidence,
      next_action: 'Wait for the current deployment status to resolve; do not start a duplicate deployment.'
    };
  }

  if (matches.every(s => s.state === 'success')) {
    return {
      status: 'pass',
      evidence,
      next_action: null
    };
  }

  return {
    status: 'unknown',
    evidence,
    next_action: 'Collect a definitive deployment status before claiming Deploy completion.'
  };
}

async function fetchCombinedStatus(repo, sha, token) {
  if (!repo || !sha) throw new Error('repo and sha are required');
  if (!token) throw new Error('GITHUB_TOKEN is required for live fetch mode');
  const response = await fetch(`https://api.github.com/repos/${repo}/commits/${sha}/status`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });
  if (!response.ok) throw new Error(`GitHub status fetch failed: ${response.status}`);
  return response.json();
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

if (process.argv[1]?.endsWith('github-deploy-status.mjs')) {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.context) throw new Error('--context is required');
    const payload = args.file
      ? JSON.parse(fs.readFileSync(args.file, 'utf8'))
      : await fetchCombinedStatus(args.repo, args.sha, process.env.GITHUB_TOKEN);
    process.stdout.write(`${JSON.stringify(classifyDeployStatuses(payload, args.context), null, 2)}\n`);
  } catch (error) {
    console.error(`GitHub deploy-status adapter error: ${error.message}`);
    process.exit(1);
  }
}
