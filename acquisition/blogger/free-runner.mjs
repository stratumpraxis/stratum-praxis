import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const TOKEN = process.env.CLOUDFLARE_API_TOKEN || '';
const MODEL = process.env.BLOGGER_FREE_MODEL || '@cf/google/gemma-4-26b-a4b-it';
const FREE_MODELS = new Set([
  '@cf/google/gemma-4-26b-a4b-it',
  '@cf/zai-org/glm-4.7-flash',
  '@cf/nvidia/nemotron-3-120b-a12b'
]);
const OUT_DIR = path.join(ROOT, 'acquisition/blogger/outbox');
const STATE_FILE = path.join(ROOT, 'acquisition/blogger/state.json');
const SOURCES_FILE = path.join(ROOT, 'acquisition/media-engine/sources.json');
const IDENTITY_FILE = path.join(ROOT, 'acquisition/media-engine/identity.json');
const LENSES_FILE = path.join(ROOT, 'acquisition/media-engine/lenses.json');
const CHANNELS_FILE = path.join(ROOT, 'acquisition/media-engine/channels.json');
const MAX_ATTEMPTS = 2;
const MIN_WORDS = 750;
const QUALITY_THRESHOLD = 82;

const BANNED_GENERIC = [
  "in today's fast-paced world", "in today's digital landscape", 'game changer',
  'this changes everything', 'everything you need to know', 'ultimate guide',
  'in conclusion', 'it is important to note that', 'unlock the power of'
];

async function readJson(file) { return JSON.parse(await fs.readFile(file, 'utf8')); }
async function writeJson(file, value) { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`); }
function sha(s) { return crypto.createHash('sha256').update(String(s)).digest('hex'); }
function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80); }
function stripFence(s) { return String(s).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''); }

function pickLens(source, lenses) {
  const families = new Set(source.evidence_families || []);
  const order = ['practical_operator', 'independent_builder', 'structural_reflection', 'japan_reality'];
  let best = null;
  for (const id of order) {
    const lens = lenses.lenses[id];
    const overlap = (lens.eligible_families || []).filter((x) => families.has(x)).length;
    const sourceOk = (lens.eligible_source_types || []).includes(source.source_type);
    const score = (sourceOk ? 2 : 0) + overlap + (id === 'practical_operator' && source.existing_product_routes?.length ? 2 : 0);
    if (!best || score > best.score) best = { id, lens, score };
  }
  return best;
}

function rules(identity, source, lens) {
  return `You are a world-class editorial desk, not a content spinner. Identity: ${identity.public_descriptor}\n` +
    `SOURCE: ${source.title}\n${source.excerpt || ''}\nALLOWED CLAIMS:\n${(source.allowed_claims || []).map((x) => `- ${x}`).join('\n')}\n` +
    `RESTRICTED CLAIMS:\n${(source.restricted_claims || []).map((x) => `- ${typeof x === 'string' ? x : x.phrase}`).join('\n')}\n` +
    `LENS: ${lens.lens_id} — ${lens.purpose}\n` +
    `Never invent biography, clients, purchases, testing, revenue, credentials, travel, private facts, quotes, sources, numbers, lived experience, testimonials or results. ` +
    `Do not closely paraphrase copyrighted prose or imitate a named writer's distinctive style. Preserve uncertainty. No defamation, fake scarcity, guaranteed ROI, hidden sponsorship, legal/medical/financial professional advice, keyword stuffing or spam. ` +
    `The article must be useful without clicking a CTA. Prefer original synthesis, concrete distinctions, tradeoffs, counterarguments and decision criteria.`;
}

async function callModel(stage, prompt) {
  if (!ACCOUNT_ID || !TOKEN) throw new Error('CLOUDFLARE_ACCOUNT_ID/CLOUDFLARE_API_TOKEN not configured');
  if (!FREE_MODELS.has(MODEL)) throw new Error(`BLOGGER_FREE_MODEL_NOT_ALLOWLISTED ${MODEL}`);
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${MODEL}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], max_tokens: stage === 'final' ? 7000 : 5000, temperature: stage === 'critic' ? 0.3 : 0.55 })
  });
  const raw = await response.text();
  if (!response.ok) {
    if (response.status === 429 || response.status === 403) throw new Error(`FREE_TIER_STOP ${response.status} ${raw.slice(0, 500)}`);
    throw new Error(`WORKERS_AI_ERROR ${response.status} ${raw.slice(0, 500)}`);
  }
  const json = JSON.parse(raw);
  const text = json?.result?.response || json?.result?.text || json?.result?.choices?.[0]?.message?.content;
  if (!text) throw new Error(`NO_TEXT_RETURNED ${stage}`);
  return text;
}

async function generate(source, identity, lens) {
  const base = rules(identity, source, lens);
  const draft = await callModel('draft', `${base}\n\nDRAFT: Write an English long-form article around 900-1500 words. Strong opening, no canned intro/conclusion. Article only.`);
  const critic = await callModel('critic', `${base}\n\nCRITIC: Identify generic AI phrasing, unsupported claims, weak logic, repetition, predictable structure, missing counterarguments, shallow sections and false certainty.\n\n${draft}`);
  const deepened = await callModel('deepen', `${base}\n\nDEEPEN: Rewrite using the critique. Add at least one non-obvious distinction, real tradeoff, concrete decision criteria and a limiting case grounded only in the source.\n\nDRAFT:\n${draft}\n\nCRITIC:\n${critic}`);
  const finalRaw = await callModel('final', `${base}\n\nFINAL EDIT: Humanize rhythm and transitions; remove filler, textbook scaffolding and unearned sales language. Never fake anecdotes. Return STRICT JSON with title_options (max 3), selected_title, dek, body_markdown, evidence_notes, allowed_claim_report, restricted_claim_report, cta_recommendation {include,reason,route_index}, editorial_notes.\n\n${deepened}`);
  return { draft, critic, deepened, final: JSON.parse(stripFence(finalRaw)) };
}

function quality(final, source) {
  const body = String(final.body_markdown || '');
  const lower = body.toLowerCase();
  const words = body.split(/\s+/).filter(Boolean).length;
  const genericHits = BANNED_GENERIC.filter((p) => lower.includes(p));
  const restrictedHits = (source.restricted_claims || []).map((x) => typeof x === 'string' ? x : x.phrase).filter((p) => p && lower.includes(String(p).toLowerCase()));
  const firstPersonRisk = /\b(i tested|i bought|i purchased|my client|my customers|i earned|i visited|when i lived)\b/i.test(body);
  let score = 100 - (words < MIN_WORDS ? 25 : 0) - genericHits.length * 10 - restrictedHits.length * 25 - (firstPersonRisk ? 35 : 0);
  if (!final.selected_title || !body) score = 0;
  return { score: Math.max(0, score), words, generic_hits: genericHits, restricted_hits: restrictedHits, first_person_risk: firstPersonRisk, threshold: QUALITY_THRESHOLD };
}

function chooseCta(final, source) {
  if (!final.cta_recommendation?.include) return null;
  const i = Number(final.cta_recommendation.route_index);
  return Number.isInteger(i) ? source.existing_product_routes?.[i] || null : null;
}
function trackedUrl(route, source, lensId) {
  if (!route?.url) return null;
  const u = new URL(route.url);
  u.searchParams.set('utm_source', 'owned_media'); u.searchParams.set('utm_medium', 'blog');
  u.searchParams.set('utm_campaign', 'international_personal_media'); u.searchParams.set('utm_content', `${source.source_id}:${lensId}`.slice(0, 140));
  return u.toString();
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const [sourcesDoc, identity, lensesDoc, channelsDoc] = await Promise.all([readJson(SOURCES_FILE), readJson(IDENTITY_FILE), readJson(LENSES_FILE), readJson(CHANNELS_FILE)]);
  const state = await readJson(STATE_FILE).catch(() => ({ version: 2, processed: {}, attempts: {}, last_run_at: null }));
  state.attempts ||= {};
  const eligible = sourcesDoc.sources.filter((s) => s.status === 'COMPLETE' && !state.processed[s.source_id] && (state.attempts[s.source_id] || 0) < MAX_ATTEMPTS);
  if (!eligible.length) { state.last_run_at = new Date().toISOString(); await writeJson(STATE_FILE, state); console.log('BLOGGER_IDLE'); return; }
  if (!ACCOUNT_ID || !TOKEN) { console.log('BLOGGER_BLOCKED free Workers AI credentials missing; no paid fallback'); return; }
  const source = eligible[0]; state.attempts[source.source_id] = (state.attempts[source.source_id] || 0) + 1;
  const chosen = pickLens(source, lensesDoc);
  const generated = await generate(source, identity, chosen.lens);
  const q = quality(generated.final, source);
  const ctaRoute = chooseCta(generated.final, source);
  const channel = channelsDoc.channels.devto;
  const publishLane = channel?.account_state === 'CONNECTED' && channel.ai_content_policy_state === 'VERIFIED' ? 'HUMAN_REVIEW_REQUIRED' : 'HUMAN_PUBLISH_REQUIRED';
  const status = q.score >= q.threshold && !q.first_person_risk && q.restricted_hits.length === 0 ? 'READY' : 'DRAFT';
  const id = `${new Date().toISOString().slice(0, 10)}-${slug(source.source_id)}-${sha(generated.final.body_markdown).slice(0, 8)}`;
  const record = {
    version: 2, output_id: id, generated_at: new Date().toISOString(), provider: 'cloudflare-workers-ai-free-only', model: MODEL,
    billing_policy: 'FREE_ONLY_NO_PAID_FALLBACK', source_id: source.source_id, source_candidate_id: source.source_candidate_id || null,
    identity_id: identity.identity_id, desk_id: 'en_desk', lens_id: chosen.id, title_options: generated.final.title_options || [],
    title: generated.final.selected_title, dek: generated.final.dek || '', body: generated.final.body_markdown,
    evidence_notes: generated.final.evidence_notes || [], allowed_claim_report: generated.final.allowed_claim_report || [], restricted_claim_report: generated.final.restricted_claim_report || [],
    editorial_notes: generated.final.editorial_notes || [], quality: q, status, publication_lane: publishLane, publication_proof: null,
    cta: ctaRoute ? { asset_id: ctaRoute.asset_id, label: ctaRoute.cta, destination_url: ctaRoute.url, tracked_url: trackedUrl(ctaRoute, source, chosen.id) } : null,
    attribution: { source_id: source.source_id, source_candidate_id: source.source_candidate_id || null, identity_id: identity.identity_id, desk_id: 'en_desk', lens_id: chosen.id, channel_id: 'devto', campaign: 'international_personal_media' },
    stages: { draft_sha256: sha(generated.draft), critic_sha256: sha(generated.critic), deepen_sha256: sha(generated.deepened), final_sha256: sha(generated.final.body_markdown) }
  };
  await writeJson(path.join(OUT_DIR, `${id}.json`), record);
  await fs.writeFile(path.join(OUT_DIR, `${id}.md`), `# ${record.title}\n\n${record.dek ? `${record.dek}\n\n` : ''}${record.body}${record.cta?.tracked_url ? `\n\n---\n\n${record.cta.label || 'Continue'}: ${record.cta.tracked_url}\n` : ''}`);
  if (status === 'READY') state.processed[source.source_id] = { output_id: id, at: record.generated_at, status };
  state.last_run_at = record.generated_at; await writeJson(STATE_FILE, state);
  console.log(`BLOGGER_${status} ${id} quality=${q.score} attempt=${state.attempts[source.source_id]}/${MAX_ATTEMPTS}`);
}

main().catch((error) => { console.error(`BLOGGER_STOP ${error.message}`); process.exitCode = 0; });
