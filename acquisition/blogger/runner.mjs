import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const MODEL = process.env.BLOGGER_MODEL || 'gpt-5.6-sol';
const API_KEY = process.env.OPENAI_API_KEY || '';
const OUT_DIR = path.join(ROOT, 'acquisition/blogger/outbox');
const STATE_FILE = path.join(ROOT, 'acquisition/blogger/state.json');
const SOURCES_FILE = path.join(ROOT, 'acquisition/media-engine/sources.json');
const IDENTITY_FILE = path.join(ROOT, 'acquisition/media-engine/identity.json');
const LENSES_FILE = path.join(ROOT, 'acquisition/media-engine/lenses.json');
const CHANNELS_FILE = path.join(ROOT, 'acquisition/media-engine/channels.json');

const BANNED_GENERIC = [
  'in today\'s fast-paced world', 'in today\'s digital landscape', 'game changer',
  'this changes everything', 'here is everything you need to know', 'the ultimate guide',
  'in conclusion', 'it is important to note that', 'unlock the power of'
];

async function readJson(file) { return JSON.parse(await fs.readFile(file, 'utf8')); }
async function writeJson(file, value) { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`); }
function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80); }
function sha(s) { return crypto.createHash('sha256').update(String(s)).digest('hex'); }
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

function sourceText(source) {
  return [source.title, source.excerpt, ...(source.allowed_claims || [])].filter(Boolean).join('\n');
}

async function callModel(stage, payload) {
  if (!API_KEY) throw new Error('OPENAI_API_KEY is not configured');
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      reasoning: { effort: stage === 'critic' ? 'medium' : 'high' },
      max_output_tokens: 9000,
      input: payload
    })
  });
  if (!response.ok) throw new Error(`OpenAI Responses API ${response.status}: ${await response.text()}`);
  const json = await response.json();
  const text = json.output_text || (json.output || []).flatMap((o) => o.content || []).filter((c) => c.type === 'output_text').map((c) => c.text).join('\n');
  if (!text) throw new Error(`No text returned for ${stage}`);
  return text;
}

function baseRules(identity, source, lens) {
  return `You are the editorial desk for one truthful identity: ${identity.public_descriptor}\n\n` +
    `SOURCE TITLE: ${source.title}\nSOURCE EXCERPT:\n${source.excerpt || ''}\n\nALLOWED CLAIMS:\n${(source.allowed_claims || []).map((x) => `- ${x}`).join('\n')}\n\n` +
    `RESTRICTED CLAIMS:\n${(source.restricted_claims || []).map((x) => `- ${typeof x === 'string' ? x : x.phrase}`).join('\n')}\n\n` +
    `LENS: ${lens.lens_id}\nPURPOSE: ${lens.purpose}\n\n` +
    `Hard rules: never invent biography, clients, purchases, testing, revenue, credentials, travel, private facts, quotes, sources, numbers, or lived experience. ` +
    `Do not claim first-hand experience unless the source explicitly approves it. Preserve uncertainty. Do not write SEO sludge or generic motivational copy. ` +
    `Prefer concrete distinctions, tradeoffs, decision criteria, and non-obvious implications. The article must be useful even if the reader never clicks a CTA.`;
}

async function generate(source, identity, lens) {
  const rules = baseRules(identity, source, lens);
  const draft = await callModel('draft', `${rules}\n\nSTAGE 1 — DRAFT\nWrite a strong English long-form article of roughly 900-1500 words. Avoid canned introductions and conclusions. Return article text only.`);
  const critic = await callModel('critic', `${rules}\n\nSTAGE 2 — CRITIC\nCritique the draft below. Identify generic AI phrasing, weak logic, unsupported claims, repetition, predictable structure, missing counterarguments, shallow sections, false certainty, and anything that feels like a template. Be specific.\n\nDRAFT:\n${draft}`);
  const deepened = await callModel('deepen', `${rules}\n\nSTAGE 3 — DEEPEN\nRewrite the draft using the critic. Add at least one non-obvious distinction, a real tradeoff, concrete decision criteria, and a counterargument or limiting case grounded only in the allowed source material. Do not add invented facts. Return article text only.\n\nDRAFT:\n${draft}\n\nCRITIC:\n${critic}`);
  const finalRaw = await callModel('final', `${rules}\n\nSTAGE 4 — HUMANIZE + FINAL EDIT\nEdit for natural rhythm, varied sentence length, strong transitions, specificity, and restraint. Remove filler, repetitive headings, textbook scaffolding, empty summaries, and sales language that has not earned its place. Never fake typos or personal anecdotes.\n\nReturn STRICT JSON only with keys: title_options (array, max 3), selected_title, dek, body_markdown, evidence_notes (array), allowed_claim_report (array), restricted_claim_report (array), cta_recommendation (object with include boolean, reason string, route_index integer or null), editorial_notes (array).\n\nARTICLE:\n${deepened}`);
  return { draft, critic, deepened, final: JSON.parse(stripFence(finalRaw)) };
}

function localQuality(final, source) {
  const body = String(final.body_markdown || '');
  const lower = body.toLowerCase();
  const words = body.split(/\s+/).filter(Boolean).length;
  const genericHits = BANNED_GENERIC.filter((p) => lower.includes(p));
  const restrictedHits = (source.restricted_claims || []).map((x) => typeof x === 'string' ? x : x.phrase).filter((p) => p && lower.includes(String(p).toLowerCase()));
  const firstPersonRisk = /\b(i tested|i bought|i purchased|my client|my customers|i earned|i visited|when i lived)\b/i.test(body);
  const sentenceLengths = body.split(/[.!?]+/).map((x) => x.trim().split(/\s+/).filter(Boolean).length).filter(Boolean);
  const rhythmSpread = sentenceLengths.length ? Math.max(...sentenceLengths) - Math.min(...sentenceLengths) : 0;
  let score = 100;
  if (words < 750) score -= 25;
  if (words > 2200) score -= 8;
  score -= genericHits.length * 10;
  score -= restrictedHits.length * 25;
  if (firstPersonRisk) score -= 35;
  if (rhythmSpread < 8) score -= 10;
  if (!final.selected_title || !body) score = 0;
  return { score: Math.max(0, score), words, generic_hits: genericHits, restricted_hits: restrictedHits, first_person_risk: firstPersonRisk, rhythm_spread: rhythmSpread, threshold: 82 };
}

function chooseCta(final, source) {
  if (!final.cta_recommendation?.include) return null;
  const i = Number(final.cta_recommendation.route_index);
  const route = Number.isInteger(i) ? source.existing_product_routes?.[i] : null;
  return route || null;
}

function trackedUrl(route, source, lensId) {
  if (!route?.url) return null;
  const u = new URL(route.url);
  u.searchParams.set('utm_source', 'owned_media');
  u.searchParams.set('utm_medium', 'blog');
  u.searchParams.set('utm_campaign', 'international_personal_media');
  u.searchParams.set('utm_content', `${source.source_id}:${lensId}`.slice(0, 140));
  return u.toString();
}

function markdownArtifact(record) {
  const cta = record.cta?.tracked_url ? `\n\n---\n\n${record.cta.label || 'Continue'}: ${record.cta.tracked_url}\n` : '';
  return `---\nsource_id: ${record.source_id}\nidentity_id: ${record.identity_id}\ndesk_id: ${record.desk_id}\nlens_id: ${record.lens_id}\nstatus: ${record.status}\nquality_score: ${record.quality.score}\nmodel: ${record.model}\n---\n\n# ${record.title}\n\n${record.dek ? `${record.dek}\n\n` : ''}${record.body}${cta}`;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const [sourcesDoc, identity, lensesDoc, channelsDoc] = await Promise.all([readJson(SOURCES_FILE), readJson(IDENTITY_FILE), readJson(LENSES_FILE), readJson(CHANNELS_FILE)]);
  const state = await readJson(STATE_FILE).catch(() => ({ version: 1, processed: {}, last_run_at: null }));
  const eligible = sourcesDoc.sources.filter((s) => s.status === 'COMPLETE' && !state.processed[s.source_id]);
  if (!eligible.length) { state.last_run_at = new Date().toISOString(); await writeJson(STATE_FILE, state); console.log('BLOGGER_IDLE no unprocessed COMPLETE sources'); return; }
  if (!API_KEY) { console.log('BLOGGER_BLOCKED OPENAI_API_KEY missing; no source marked processed'); process.exitCode = 2; return; }

  // One excellent article per run. Prevents volume pressure and makes failures inspectable.
  const source = eligible[0];
  const chosen = pickLens(source, lensesDoc);
  const generated = await generate(source, identity, chosen.lens);
  const quality = localQuality(generated.final, source);
  const ctaRoute = chooseCta(generated.final, source);
  const channel = channelsDoc.channels.devto;
  const publishLane = channel?.account_state === 'CONNECTED' && channel.ai_content_policy_state === 'VERIFIED' ? 'HUMAN_REVIEW_REQUIRED' : 'HUMAN_PUBLISH_REQUIRED';
  const status = quality.score >= quality.threshold && !quality.first_person_risk && quality.restricted_hits.length === 0 ? 'READY' : 'DRAFT';
  const id = `${new Date().toISOString().slice(0, 10)}-${slug(source.source_id)}-${sha(generated.final.body_markdown).slice(0, 8)}`;
  const record = {
    version: 1, output_id: id, generated_at: new Date().toISOString(), model: MODEL,
    source_id: source.source_id, source_candidate_id: source.source_candidate_id || null,
    source_hash: source.content_hash, identity_id: identity.identity_id, desk_id: 'en_desk', lens_id: chosen.id,
    title_options: generated.final.title_options || [], title: generated.final.selected_title, dek: generated.final.dek || '', body: generated.final.body_markdown,
    evidence_notes: generated.final.evidence_notes || [], allowed_claim_report: generated.final.allowed_claim_report || [], restricted_claim_report: generated.final.restricted_claim_report || [],
    editorial_notes: generated.final.editorial_notes || [], quality, status, publication_lane: publishLane,
    publication_proof: null,
    cta: ctaRoute ? { asset_id: ctaRoute.asset_id, label: ctaRoute.cta, destination_url: ctaRoute.url, tracked_url: trackedUrl(ctaRoute, source, chosen.id) } : null,
    attribution: { source_id: source.source_id, source_candidate_id: source.source_candidate_id || null, identity_id: identity.identity_id, desk_id: 'en_desk', lens_id: chosen.id, channel_id: 'devto', campaign: 'international_personal_media' },
    stages: { draft_sha256: sha(generated.draft), critic_sha256: sha(generated.critic), deepen_sha256: sha(generated.deepened), final_sha256: sha(generated.final.body_markdown) }
  };
  await writeJson(path.join(OUT_DIR, `${id}.json`), record);
  await fs.writeFile(path.join(OUT_DIR, `${id}.md`), markdownArtifact(record));
  if (status === 'READY') state.processed[source.source_id] = { output_id: id, at: record.generated_at, status };
  state.last_run_at = record.generated_at;
  await writeJson(STATE_FILE, state);
  console.log(`BLOGGER_${status} ${id} quality=${quality.score} lane=${publishLane}`);
  if (status !== 'READY') process.exitCode = 3;
}

main().catch((error) => { console.error(`BLOGGER_ERROR ${error.stack || error.message}`); process.exitCode = 1; });
