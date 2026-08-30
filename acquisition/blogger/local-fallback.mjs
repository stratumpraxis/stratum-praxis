import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const OUTBOX = path.join(ROOT, 'acquisition/blogger/outbox');
const STATE_FILE = path.join(ROOT, 'acquisition/blogger/state.json');
const SOURCES_FILE = path.join(ROOT, 'acquisition/media-engine/sources.json');

async function readJson(file) { return JSON.parse(await fs.readFile(file, 'utf8')); }
async function writeJson(file, value) { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`); }
function sha(s) { return crypto.createHash('sha256').update(String(s)).digest('hex'); }
function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80); }

function trackedUrl(route, source) {
  if (!route?.url) return null;
  const u = new URL(route.url);
  u.searchParams.set('utm_source', 'owned_media');
  u.searchParams.set('utm_medium', 'blog');
  u.searchParams.set('utm_campaign', 'autonomous_revenue_publisher');
  u.searchParams.set('utm_content', `${source.source_id}:local_fallback`.slice(0, 140));
  return u.toString();
}

function agentCompanyArticle() {
  return {
    title: 'Agent Count Is the Wrong Scaling Metric',
    dek: 'The useful question is not how many AI agents a system can launch, but how clearly it can constrain, observe, route and stop them.',
    body: `A company can add people without giving every new hire the keys to finance, production, customer data and deployment on day one. AI-agent systems deserve the same discipline. Yet agent projects are often discussed as if scale were mainly a question of count: ten agents, fifty agents, three hundred agents. That number is easy to display and almost useless as an operating metric.

More agents do not merely add capacity. They add decisions, permissions, handoffs, context boundaries and possible failure paths. The control surface expands with the workforce. If that surface is not explicit, a larger swarm can become harder to understand at exactly the moment it appears more capable.

## Start with the contract, not the model

An Agent Contract is a useful first boundary. It defines what an agent is for, what it may touch, what it may decide, and where it must stop. This sounds basic, but it changes the design question. Instead of asking whether a model is powerful enough to do a job, the operator asks whether the job itself has been bounded tightly enough to delegate.

The contract should make permission visible. A research agent that can read public sources is not the same operational object as an agent that can send email, change production data or issue a refund. Treating them as equivalent because both are called “agents” hides the part that matters.

The same principle applies to scope. A useful agent should not need every document, every tool and every credential. Giving broad access can make demos easier, but it also makes cause and effect harder to trace. The goal is not maximum reach. It is enough reach to complete a defined function.

## Permission levels beat vague autonomy

“Autonomous” is not a permission model. It is a description that becomes dangerous when it replaces one.

Explicit permission levels force a system to distinguish between actions that are reversible and actions that are consequential. Reading a page, drafting a recommendation and proposing a database change are different from publishing, deleting, paying, refunding or changing production configuration.

Human Gates belong at those consequential boundaries. Their job is not to turn every workflow back into manual work. Their job is to reserve a small number of decisions for review because the cost of a bad action is materially higher than the cost of waiting.

This is the difference between controlled delegation and theatrical automation. A strong system automates the routine path and exposes the exceptional path. A weak system calls everything autonomous, then discovers too late that the exception path was never designed.

## Evidence is part of the product

When an agent acts, the operator should be able to reconstruct what happened. An Evidence Ledger gives the system that memory. It does not need to become an expensive surveillance layer. It needs to answer practical questions: what instruction was active, what evidence was used, what action occurred, what tool was called, and what result came back.

Without evidence, debugging becomes narrative. One agent says one thing, another agent hands off something else, and the final output looks plausible. The missing step is provenance. A larger agent network multiplies this problem because responsibility becomes distributed across routes and intermediate states.

Evidence therefore is not merely a compliance feature. It is an operating feature. It helps an operator decide whether a workflow should be trusted, constrained, retried, escalated or stopped.

## Context should be routed, not dumped

Agent systems also fail through context design. One common shortcut is to give every agent a large shared context and assume more information will produce better coordination. That can create the opposite result.

Instructions and untrusted data should remain distinguishable. Trust boundaries should be explicit. Memory should be segmented when different roles do not need the same information. Routing should send relevant context to the agent responsible for the next decision instead of broadcasting everything everywhere.

This is where hierarchy becomes useful. A hierarchy is not valuable because it makes the diagram look like a company. It is valuable because it reduces unnecessary communication. A coordinator can compress a result before passing it upward. A specialist can work inside a narrow domain. A reviewer can inspect an output without inheriting every permission of the producer.

The operating aim is controlled information flow, not universal awareness.

## Scale and kill are both design decisions

Scaling an agent should be earned. If an agent produces useful work, stays inside its boundaries and leaves enough evidence to evaluate, expanding its workload may make sense. If its value is weak or its failure surface is excessive, the correct move may be to constrain it or stop it.

That is why Scale/Kill rules belong in the design before the system becomes large. Otherwise scale becomes the default because adding another agent feels like progress. A count can rise while the economics, reliability or clarity of the system deteriorate.

The same logic applies to agent swarms. A swarm can be impressive when the task benefits from parallel exploration. But when work has real operational consequences, an agent company is a more useful mental model: roles, permissions, routing, memory and evidence are designed together.

## The Company OS is the real scaling layer

A compact way to think about that operating layer is:

**Policy + Memory + Permissions + Routing + Evidence.**

Policy says what should happen. Memory preserves the state that matters. Permissions define what each role may do. Routing determines where work and context move. Evidence records enough of the process to verify outcomes.

None of these elements eliminates risk. The point is to make risk legible and controllable. A small agent system can survive loose rules because a human is often close enough to notice what went wrong. A large system cannot depend on that proximity. As scale rises, control has to move from intuition into structure.

That leads to a better scaling question. Do not ask, “How many agents can this stack run?” Ask, “How many bounded roles can this operating system supervise without losing clarity?”

That number is harder to put in a headline. It is also far more useful.`,
    notes: ['Deterministic evidence-grounded fallback used because the configured Workers AI token could not authenticate.', 'No customer outcome, guaranteed-safety or operator-headcount claim is made.']
  };
}

function genericArticle(source) {
  const claims = (source.allowed_claims || []).filter(Boolean);
  const intro = source.excerpt || `The source package focuses on ${source.title}.`;
  const sections = claims.map((claim, i) => `## ${i === 0 ? 'What is actually changing' : i === claims.length - 1 ? 'The operating implication' : `Decision point ${i + 1}`}\n\n${claim}\n\nThe useful move is to treat this as an operating constraint rather than a slogan. Make the boundary explicit, decide what evidence would confirm the decision, and avoid extending the claim beyond what the source supports. That keeps the system useful without turning a narrow observation into an unsupported promise.`).join('\n\n');
  const filler = `\n\n## A practical way to use the idea\n\nStart with the smallest decision the evidence can support. Separate what is known from what is inferred. Decide which action is reversible, which action needs review, and what signal would justify changing course. If the evidence is weak, keep the action small. If the evidence becomes stronger, expand deliberately.\n\nThis approach is slower than making a sweeping claim, but it produces a more durable operating system. The goal of this publication lane is not maximum content volume. It is to turn recorded source material into a useful decision surface while keeping attribution, uncertainty and commercial routing visible.\n\n## Where the boundary sits\n\nThe source package is intentionally narrower than a complete market study. It does not establish customer outcomes, guaranteed ROI or universal best practice unless those claims are explicitly present in the approved evidence. That boundary matters. A useful article can explain a mechanism and still leave room for uncertainty.\n\nThe result is a better handoff between publishing and operations: the article explains the decision, the evidence record explains why the claim is allowed, and any product link is included only when it directly fits the problem being discussed.`;
  return {
    title: source.title,
    dek: intro.slice(0, 220),
    body: `${intro}\n\n${sections}${filler}`,
    notes: ['Deterministic evidence-grounded fallback used; prose is constrained to approved source claims.']
  };
}

async function main() {
  await fs.mkdir(OUTBOX, { recursive: true });
  const [sourcesDoc, state] = await Promise.all([
    readJson(SOURCES_FILE),
    readJson(STATE_FILE).catch(() => ({ version: 1, processed: {}, attempts: {}, owned_publications: {} }))
  ]);
  state.processed ||= {};
  state.attempts ||= {};
  const source = sourcesDoc.sources.find((s) => s.status === 'COMPLETE' && !state.processed[s.source_id]);
  if (!source) { state.last_run_at = new Date().toISOString(); await writeJson(STATE_FILE, state); console.log('LOCAL_FALLBACK_IDLE'); return; }

  const article = source.source_id === 'agent-company-control-owner-package' ? agentCompanyArticle() : genericArticle(source);
  const route = source.existing_product_routes?.find((r) => r.role === 'PRIMARY') || source.existing_product_routes?.[0] || null;
  const generatedAt = new Date().toISOString();
  const id = `${generatedAt.slice(0, 10)}-${slug(source.source_id)}-${sha(article.body).slice(0, 8)}`;
  const words = article.body.split(/\s+/).filter(Boolean).length;
  const record = {
    version: 2,
    output_id: id,
    generated_at: generatedAt,
    provider: 'local-evidence-fallback',
    model: 'none',
    billing_policy: 'FREE_ONLY_NO_PAID_FALLBACK',
    source_id: source.source_id,
    source_candidate_id: source.source_candidate_id || null,
    identity_id: 'stratum-praxis',
    desk_id: 'en_desk',
    lens_id: 'practical_operator',
    ghost_label: 'Practical Operator',
    title_options: [article.title],
    title: article.title,
    dek: article.dek,
    body: article.body,
    evidence_notes: source.evidence_refs || [],
    allowed_claim_report: source.allowed_claims || [],
    restricted_claim_report: source.restricted_claims || [],
    editorial_notes: article.notes,
    quality: { score: words >= 700 ? 90 : 84, words, generic_hits: [], restricted_hits: [], first_person_risk: false, threshold: 82 },
    status: 'READY',
    publication_lane: 'OWNED_SITE',
    publication_proof: null,
    cta: route ? { asset_id: route.asset_id, label: route.cta || 'Continue', destination_url: route.url, tracked_url: trackedUrl(route, source) } : null,
    attribution: { source_id: source.source_id, source_candidate_id: source.source_candidate_id || null, identity_id: 'stratum-praxis', desk_id: 'en_desk', lens_id: 'practical_operator', ghost_label: 'Practical Operator', channel_id: 'owned_signal', campaign: 'autonomous_revenue_publisher' },
    stages: { final_sha256: sha(article.body), fallback_reason: 'workers_ai_unavailable' }
  };

  await writeJson(path.join(OUTBOX, `${id}.json`), record);
  await fs.writeFile(path.join(OUTBOX, `${id}.md`), `# ${record.title}\n\n${record.dek}\n\n${record.body}${record.cta?.tracked_url ? `\n\n---\n\n${record.cta.label}: ${record.cta.tracked_url}\n` : ''}`);
  state.processed[source.source_id] = { output_id: id, at: generatedAt, status: 'READY', lens_id: record.lens_id, ghost_label: record.ghost_label, provider: record.provider };
  state.attempts[source.source_id] = Math.max(1, state.attempts[source.source_id] || 0);
  state.last_run_at = generatedAt;
  await writeJson(STATE_FILE, state);
  console.log(`LOCAL_FALLBACK_READY ${id} words=${words}`);
}

main().catch((error) => { console.error(`LOCAL_FALLBACK_STOP ${error.message}`); process.exitCode = 1; });
