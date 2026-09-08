import { Hono } from 'hono';

const app = new Hono();
const AXES = ['scope', 'motion', 'depth', 'output', 'control'];
const ROLE_LABELS = {
  command: 'command',
  explore: 'explore',
  build: 'build',
  verify: 'verify',
  create: 'create',
  assist: 'assist',
};
const PROMPTS = {
  command: 'Confirm objective, constraints, existing assets, and completion criteria. Identify the single most important bottleneck, route work to the right role, and coordinate execution, verification, and the next decision. Never mark unverified work complete.',
  explore: 'Explore demand, competition, search intent, adjacent uses, and contrary evidence. Separate facts, hypotheses, and unknowns. Extract reusable structure, but do not treat discovery alone as an adoption decision.',
  build: 'Implement the target without breaking the existing specification. Minimize the change surface, run build/test/lint where possible, and report the diff plus anything still unverified. Prefer working output over explanation.',
  verify: 'Audit the result independently. Separate CONFIRMED, INFERRED, UNKNOWN, and BLOCKED. Classify issues P0-P3, test failure conditions as well as the happy path, and mark only demonstrated results complete.',
  create: 'Preserve the objective, target user, and usage context while improving readability, hierarchy, and usability. Reduce template-like output and optimize for comprehension, trust, and action.',
  assist: 'Support the existing workflow with repetitive tasks, organization, summaries, drafts, and checks. Keep human approval for important external publication, payments, deletion, and permission changes.',
};

function headers() {
  return {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  };
}

function validAddress(value = '') {
  return /^0x[a-fA-F0-9]{40}$/.test(String(value));
}

function runtime(env = {}) {
  const network = String(env.X402_NETWORK || 'eip155:84532');
  const price = String(env.X402_PRICE || '$0.01');
  const mode = String(env.X402_MODE || 'development');
  const productionPayTo = String(env.PAY_TO || '');
  const testPayTo = String(env.X402_TEST_PAY_TO || '');
  const apiKeyId = String(env.CDP_API_KEY_ID || '');
  const apiKeySecret = String(env.CDP_API_KEY_SECRET || '');
  const testnet = mode === 'development' && network === 'eip155:84532';
  const mainnet = mode === 'production' && network === 'eip155:8453';
  const paymentConfigured = testnet
    ? validAddress(testPayTo)
    : Boolean(mainnet && validAddress(productionPayTo) && apiKeyId && apiKeySecret);
  return {
    network,
    price,
    mode,
    payTo: testnet ? testPayTo : productionPayTo,
    apiKeyId,
    apiKeySecret,
    facilitator: testnet ? 'x402.org-testnet' : 'cdp',
    productionGuard: !mainnet || Boolean(validAddress(productionPayTo) && apiKeyId && apiKeySecret),
    paymentConfigured,
  };
}

function profileFromBody(body) {
  const source = body?.profile && typeof body.profile === 'object' ? body.profile : body;
  const profile = {};
  for (const axis of AXES) {
    const value = Number(source?.[axis]);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      throw new Error(`profile.${axis} must be a number from 0 to 100`);
    }
    profile[axis] = Math.round(value);
  }
  return profile;
}

function roleScores(p) {
  return {
    command: Math.round((p.scope + p.motion + p.control) / 3),
    explore: Math.round((p.scope + p.depth + p.output) / 3),
    build: Math.round((p.motion + (100 - p.output) + p.control) / 3),
    verify: Math.round(((100 - p.scope) + (100 - p.motion) + (100 - p.control)) / 3),
    create: Math.round(((100 - p.output) + p.motion + p.scope) / 3),
    assist: Math.round(((100 - p.control) + (100 - p.motion) + 50) / 3),
  };
}

function toolFit(scores) {
  const avg = (...roles) => Math.round(roles.reduce((sum, role) => sum + scores[role], 0) / roles.length);
  return [
    { tool: 'ChatGPT', role: 'command / exploration', score: avg('command', 'explore') },
    { tool: 'Codex', role: 'implementation / testing', score: avg('build', 'command') },
    { tool: 'Claude / Claude Code', role: 'verification / second implementation', score: avg('verify', 'build') },
    { tool: 'Gemini', role: 'large-context exploration / assistance', score: avg('explore', 'assist') },
    { tool: 'GitHub Copilot', role: 'implementation assistance', score: avg('build', 'assist') },
    { tool: 'Microsoft Copilot', role: 'work assistance / verification', score: avg('assist', 'verify') },
  ].sort((a, b) => b.score - a.score);
}

function routeProfile(profile) {
  const scores = roleScores(profile);
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const primary = ranked[0][0];
  const secondary = ranked[1][0];
  return {
    version: 'ai-fit-router-machine-v1',
    profile,
    primary_role: ROLE_LABELS[primary],
    secondary_role: ROLE_LABELS[secondary],
    role_scores: scores,
    tool_fit: toolFit(scores),
    initial_instructions: {
      primary: PROMPTS[primary],
      secondary: PROMPTS[secondary],
    },
    safety: {
      independent_verification_recommended: true,
      human_gate_for: ['external_publication', 'payments', 'deletion', 'permission_changes'],
    },
  };
}

let paymentCache = null;
async function getPaymentMiddleware(cfg) {
  const cacheKey = `${cfg.facilitator}|${cfg.network}|${cfg.price}|${cfg.payTo}|${cfg.apiKeyId}`;
  if (paymentCache?.key === cacheKey) return paymentCache.middleware;

  const [evm, hono] = await Promise.all([
    import('@x402/evm/exact/server'),
    import('@x402/hono'),
  ]);

  let facilitator;
  if (cfg.facilitator === 'x402.org-testnet') {
    const core = await import('@x402/core/server');
    facilitator = new core.HTTPFacilitatorClient({ url: 'https://x402.org/facilitator' });
  } else {
    const cdp = await import('@coinbase/cdp-sdk/x402');
    facilitator = cdp.createCdpFacilitatorClient({
      apiKeyId: cfg.apiKeyId,
      apiKeySecret: cfg.apiKeySecret,
    });
  }

  const server = new hono.x402ResourceServer(facilitator).register(cfg.network, new evm.ExactEvmScheme());
  const middleware = hono.paymentMiddleware({
    'POST /v1/ai-fit': {
      accepts: [{ scheme: 'exact', price: cfg.price, network: cfg.network, payTo: cfg.payTo }],
      description: 'Route an AI work profile to primary and secondary agent roles with tool-fit scores and safety gates.',
    },
  }, server);
  paymentCache = { key: cacheKey, middleware };
  return middleware;
}

app.get('/', (c) => {
  const cfg = runtime(c.env);
  return c.json({
    service: 'Stratum Praxis Agent API',
    product: 'AI Fit Router',
    machine_endpoint: 'POST /v1/ai-fit',
    schema_endpoint: 'GET /v1/ai-fit/schema',
    payment_protocol: 'x402',
    payment_ready: cfg.paymentConfigured,
    environment: cfg.mode,
    network: cfg.network,
    price: cfg.price,
    facilitator: cfg.facilitator,
  }, 200, headers());
});

app.get('/health', (c) => {
  const cfg = runtime(c.env);
  return c.json({
    ok: true,
    payment_ready: cfg.paymentConfigured,
    environment: cfg.mode,
    network: cfg.network,
    facilitator: cfg.facilitator,
    production_guard: cfg.productionGuard,
  }, 200, headers());
});

app.get('/v1/ai-fit/schema', (c) => {
  const cfg = runtime(c.env);
  return c.json({
    endpoint: 'POST /v1/ai-fit',
    price: cfg.price,
    payment_protocol: 'x402',
    environment: cfg.mode,
    input: {
      profile: {
        scope: '0=organize, 100=expand',
        motion: '0=confirm, 100=advance',
        depth: '0=deep, 100=broad',
        output: '0=create, 100=explore',
        control: '0=approval-heavy, 100=autonomous',
      },
    },
    output: ['primary_role', 'secondary_role', 'role_scores', 'tool_fit', 'initial_instructions', 'safety'],
  }, 200, headers());
});

app.use('/v1/ai-fit', async (c, next) => {
  if (c.req.method !== 'POST') return next();
  const cfg = runtime(c.env);
  if (!cfg.paymentConfigured) {
    return c.json({
      error: 'payment_not_configured',
      message: 'The paid endpoint is fail-closed until the active environment has a valid payment configuration.',
    }, 503, headers());
  }
  try {
    const middleware = await getPaymentMiddleware(cfg);
    return middleware(c, next);
  } catch {
    return c.json({ error: 'payment_gateway_unavailable' }, 503, headers());
  }
});

app.post('/v1/ai-fit', async (c) => {
  try {
    const body = await c.req.json();
    const profile = profileFromBody(body);
    return c.json(routeProfile(profile), 200, headers());
  } catch (error) {
    return c.json({ error: 'invalid_input', message: String(error?.message || 'Invalid JSON body') }, 400, headers());
  }
});

app.notFound((c) => c.json({ error: 'not_found' }, 404, headers()));

export default app;
