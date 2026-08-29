// Autonomous Revenue Publisher v2 - free-only generation lane.
//
// ZERO PAID AI API COST. Cloudflare Workers AI only, from a fixed allowlist. There is no
// paid fallback, no gateway to a third-party model, and no automatic upgrade. Quota
// exhaustion stops the run; it never escalates.
//
// What changed in v2:
//   - the source is chosen by the revenue-vertical contract, not by array order
//   - the authoritative media-engine truth and duplication gates actually execute here
//   - the quality model is acquisition/blogger/lib/editorial-quality.mjs, where a
//     critical truth failure overrides the aggregate and 100 is very hard to reach
//   - the CTA must reach a verified route and must complete the reader's decision
//   - the artifact records which gates ran, so the published disclosure can be true

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

import { loadInventory } from '../lib/inventory.mjs';
import { loadVerticals, selectOpportunity } from '../lib/vertical.mjs';
import { knownChannels, loadSourceRouting } from '../lib/utm.mjs';
import { loadAssetPageText, trackedUrl } from './lib/cta-gate.mjs';
import { disclosureFor, runEditorialGates } from './lib/gates.mjs';

const ROOT = process.cwd();
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const TOKEN = process.env.CLOUDFLARE_API_TOKEN || '';
const MODEL = process.env.BLOGGER_FREE_MODEL || '@cf/google/gemma-4-26b-a4b-it';

/** The only models this lane may call. Every one is on the Cloudflare free allowance. */
const FREE_MODELS = new Set([
  '@cf/google/gemma-4-26b-a4b-it',
  '@cf/zai-org/glm-4.7-flash',
  '@cf/nvidia/nemotron-3-120b-a12b'
]);

/** Environment variables that would indicate a billable provider is in play. */
const PAID_PROVIDER_ENV = Object.freeze([
  'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_API_KEY',
  'AZURE_OPENAI_API_KEY', 'MISTRAL_API_KEY', 'COHERE_API_KEY', 'AI_GATEWAY_TOKEN'
]);

const OUT_DIR = path.join(ROOT, 'acquisition/blogger/outbox');
const STATE_FILE = path.join(ROOT, 'acquisition/blogger/state.json');
const SOURCES_FILE = path.join(ROOT, 'acquisition/media-engine/sources.json');
const IDENTITY_FILE = path.join(ROOT, 'acquisition/media-engine/identity.json');
const LENSES_FILE = path.join(ROOT, 'acquisition/media-engine/lenses.json');
const CHANNELS_FILE = path.join(ROOT, 'acquisition/media-engine/channels.json');
const CANDIDATES_FILE = path.join(ROOT, 'acquisition/signal-intelligence/candidates.json');

const MAX_ATTEMPTS = 2;
const MIN_WORDS = 750;

async function readJson(file) { return JSON.parse(await fs.readFile(file, 'utf8')); }
async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}
function sha(s) { return crypto.createHash('sha256').update(String(s)).digest('hex'); }
function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80); }
function stripFence(s) { return String(s).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''); }

export function pickLens(source, lenses) {
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

/**
 * Choose what to write, in the order the routing principle demands.
 * Vertical opportunities first, ranked by
 * demand x purchase intent x asset fit x freshness x measurement / burden.
 * Owner-approved packages remain eligible behind them so the existing lane still works.
 */
export function chooseWork({ opportunity, sources, state }) {
  const attempts = state.attempts || {};
  const processed = state.processed || {};
  const usable = (source) => source
    && source.status === 'COMPLETE'
    && !processed[source.source_id]
    && (attempts[source.source_id] || 0) < MAX_ATTEMPTS;

  for (const assessment of opportunity.eligible) {
    const full = opportunity.assessments.find((a) => a.vertical_id === assessment.vertical_id);
    const candidateId = full?.candidate?.source_candidate_id;
    const source = sources.find((s) => s.source_candidate_id && s.source_candidate_id === candidateId);
    if (usable(source)) {
      return { source, vertical_id: assessment.vertical_id, assessment: full, lane: 'REVENUE_VERTICAL' };
    }
  }

  const ownerPackage = sources.find((s) => s.source_type === 'OWNER_APPROVED_SOURCE' && usable(s));
  if (ownerPackage) return { source: ownerPackage, vertical_id: null, assessment: null, lane: 'OWNER_APPROVED_SOURCE' };

  return null;
}

function assertFreeOnly(model = MODEL) {
  if (!FREE_MODELS.has(model)) {
    throw new Error(`BLOGGER_FREE_MODEL_NOT_ALLOWLISTED ${model}; this lane may only call the free Workers AI allowlist`);
  }
  const paid = PAID_PROVIDER_ENV.filter((name) => process.env[name]);
  // A paid credential in the environment is not used and never becomes a fallback. It is
  // reported so an operator can see that the free-only policy held anyway.
  return { model, allowlisted: true, paid_credentials_present: paid, paid_fallback_used: false };
}

/**
 * Output budget per stage. A free model has a finite context, and the whole editorial
 * contract plus a full draft plus a large output budget is what made the v2 final stage
 * come back empty on its first run. Each stage now asks for only what it produces.
 */
const STAGE_BUDGET = Object.freeze({
  draft: 2600,
  critic: 900,
  deepen: 2600,
  polish: 2600,
  envelope: 800
});

/**
 * Which stages the run cannot proceed without. The free tier returns an empty
 * completion often enough that treating every stage as required makes the lane
 * fragile for no editorial benefit: a missing critique costs quality, and the quality
 * gate is what decides whether the result is publishable anyway. A missing draft or a
 * missing envelope leaves nothing to gate, so those still stop the run.
 */
const REQUIRED_STAGES = Object.freeze(['draft', 'envelope']);

const STAGE_TEMPERATURE = Object.freeze({ draft: 0.6, critic: 0.3, deepen: 0.5, polish: 0.45, envelope: 0.2 });

const stageDiagnostics = [];
let consecutiveEmpty = 0;

/**
 * Consecutive empty completions on a 200 response are how this free tier reports that
 * the allowance is spent. Past this many in a row, stop: the policy is that quota
 * exhaustion halts the run, and burning further attempts neither helps nor is free.
 */
const EMPTY_COMPLETION_CIRCUIT_BREAK = 4;

async function callModelOnce(stage, prompt) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${MODEL}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
      max_tokens: STAGE_BUDGET[stage] ?? 2500,
      temperature: STAGE_TEMPERATURE[stage] ?? 0.5
    })
  });
  const raw = await response.text();
  if (!response.ok) {
    // Free quota exhausted or refused: stop. Never upgrade, never fall back to a
    // billable provider.
    if (response.status === 429 || response.status === 403) throw new Error(`FREE_TIER_STOP ${response.status} ${raw.slice(0, 500)}`);
    throw new Error(`WORKERS_AI_ERROR ${response.status} ${raw.slice(0, 500)}`);
  }
  const json = JSON.parse(raw);
  const text = json?.result?.response || json?.result?.text || json?.result?.choices?.[0]?.message?.content || '';
  stageDiagnostics.push({
    stage,
    prompt_chars: prompt.length,
    max_tokens: STAGE_BUDGET[stage] ?? 2500,
    returned_chars: text.length,
    result_keys: Object.keys(json?.result || {}),
    usage: json?.result?.usage ?? null,
    finish_reason: json?.result?.choices?.[0]?.finish_reason ?? null,
    // An empty completion arrives as HTTP 200, so the body is the only place the reason
    // is visible. Kept short and only when the completion was empty.
    empty_body_sample: text ? null : raw.slice(0, 400)
  });
  if (!text) consecutiveEmpty += 1; else consecutiveEmpty = 0;
  return text;
}

async function callModel(stage, prompt) {
  if (!ACCOUNT_ID || !TOKEN) throw new Error('CLOUDFLARE_ACCOUNT_ID/CLOUDFLARE_API_TOKEN not configured');
  assertFreeOnly();
  // Two retries, because an empty completion on the free tier is transient. A retry is
  // not an upgrade: same model, same free allowance, no billable provider anywhere.
  for (const attempt of [1, 2]) {
    const text = await callModelOnce(stage, prompt);
    if (text.trim()) return text;
    if (consecutiveEmpty >= EMPTY_COMPLETION_CIRCUIT_BREAK) {
      throw new Error(`FREE_TIER_STOP ${consecutiveEmpty} consecutive empty completions on HTTP 200; the free Workers AI allowance appears to be spent. Stopping rather than upgrading.`);
    }
    if (attempt < 2) continue;
    if (REQUIRED_STAGES.includes(stage)) throw new Error(`NO_TEXT_RETURNED ${stage} after 2 attempts`);
    console.log(`  STAGE_SKIPPED ${stage} returned no text after 2 attempts; continuing without it`);
    return '';
  }
  return '';
}

/** The editorial contract handed to the model, built from the source and the vertical. */
export function buildRules(identity, source, lens, vertical, { compact = false } = {}) {
  const claimLedger = (source.claim_ledger || [])
    .map((c) => `- [${c.claim_type}] ${c.claim}${c.attribution_required ? '  (MUST be attributed or labelled)' : ''}`)
    .join('\n');
  const routes = (source.existing_product_routes || [])
    .map((r, i) => `  ${i}. role=${r.role} asset=${r.asset_id} cta="${r.cta ?? 'none declared'}"${r.microcopy ? ` microcopy="${r.microcopy}"` : ''}`)
    .join('\n');

  if (compact) {
    // The later stages already hold the article. They need the prohibitions and the
    // route list, not the whole contract again.
    return [
      `Identity: ${identity.public_descriptor}`,
      vertical ? `Reader: ${(vertical.target_audiences || []).join(', ')}. Decision model: ${(vertical.decision_model || []).join(' / ') || 'n/a'}.` : '',
      'ALLOWED CLAIMS (nothing outside this list may be asserted):',
      (source.allowed_claims || []).map((x) => `- ${x}`).join('\n'),
      'HARD RULES: no statistic, price or count that is not in ALLOWED CLAIMS unless the sentence labels it as an example; every source figure carries its provenance in the same sentence; no invented email, routine, client, purchase, test, conversation or outcome; at most one heading per 300 words and at most two coined capitalised terms; no closing motivational paragraph and no summary restating the piece; vary sentence and paragraph length; keep at least one decision rule, one tradeoff and one case where the obvious answer is wrong.',
      'EXISTING ROUTES (the CTA must be one of these by index):',
      routes || '  none'
    ].filter(Boolean).join('\n');
  }

  return [
    `You are a working editorial desk, not a content spinner. Identity: ${identity.public_descriptor}`,
    '',
    `SOURCE: ${source.title}`,
    source.excerpt || '',
    '',
    vertical ? `REVENUE VERTICAL: ${vertical.vertical_id}
BUYER PROBLEM: ${vertical.buyer_problem}
EDITORIAL ANGLE: ${vertical.editorial_angle}
READER: ${(vertical.target_audiences || []).join(', ')} - write for one of these people, not for an enterprise finance department.
DECISION MODEL the reader must be able to apply by the end: ${(vertical.decision_model || []).join(' / ') || 'n/a'}
DECISION DIMENSIONS available: ${(vertical.decision_dimensions || []).join('; ') || 'n/a'}` : '',
    '',
    'ALLOWED CLAIMS (nothing outside this list may be asserted):',
    (source.allowed_claims || []).map((x) => `- ${x}`).join('\n'),
    '',
    claimLedger ? `CLAIM LEDGER - every claim you use belongs to exactly one of these types, and the writing must make the type obvious to the reader:\n${claimLedger}` : '',
    '',
    'RESTRICTED CLAIMS (these phrases and their meanings are forbidden):',
    (source.restricted_claims || []).map((x) => `- ${typeof x === 'string' ? x : x.phrase}`).join('\n'),
    (source.prohibited_claims || []).length ? `\nPROHIBITED:\n${source.prohibited_claims.map((x) => `- ${x}`).join('\n')}` : '',
    vertical?.prohibited_claims?.length ? vertical.prohibited_claims.map((x) => `- ${x}`).join('\n') : '',
    '',
    `LENS: ${lens.lens_id} - ${lens.purpose}`,
    '',
    'EXISTING ROUTES (the CTA must be one of these by index):',
    routes || '  none',
    '',
    'HARD RULES - each of these is checked mechanically after you write, and a violation fails the article:',
    '1. NUMBERS. Do not write any statistic, price, percentage, count or money amount that is not present in ALLOWED CLAIMS, unless the sentence itself labels it as an example or scenario ("for example", "suppose", "say a"). An unlabelled number that is not in the source is a fabrication.',
    '2. ATTRIBUTION. Any figure that comes from the source must carry its provenance in the same sentence ("publicly reported figures describe...", "posts recorded by this publication describe..."). A bare number reads as a fact you measured.',
    '3. NO INVENTED EXPERIENCE. Never write a remembered email, a routine that "usually" happens, a client situation, a purchase, a test, a conversation, a daily habit, a saving, or any outcome that happened to someone. You have none. Not softened, not hedged, not attributed to a persona: absent.',
    '4. HYPOTHETICALS. If you need a concrete illustration, label it as an example or scenario in the same sentence or in the heading above it. Never present an illustration as a report.',
    '5. STRUCTURE. At most one heading per roughly 300 words. At most two coined capitalised terms in the whole piece - no page of "The X Gap", "The Y Tax", "The Z Framework", "The W Matrix". No closing motivational paragraph, no summary that restates what the reader just read, no "in conclusion", "moreover", "furthermore", "at its core", "ultimately".',
    '6. RHYTHM. Vary sentence and paragraph length deliberately. Some sentences should be short. Do not write every paragraph at the same size.',
    '7. INSIGHT. The article must contain at least one non-obvious decision rule, a real tradeoff, and at least one case where the obvious recommendation is wrong. State the boundary conditions.',
    '8. CTA. The closing route must be the one that actually completes the reader\'s decision, named by its route index. Give it a label that says what the reader gets, never "Continue", "Learn more" or "Open the tool".',
    '',
    'Do not closely paraphrase copyrighted prose or imitate a named writer. Preserve uncertainty. No defamation, fake scarcity, guaranteed ROI, hidden sponsorship, professional legal/medical/financial advice, keyword stuffing. The article must be useful to someone who never clicks the CTA.'
  ].filter((x) => x !== '').join('\n');
}

async function generate(source, identity, lens, vertical) {
  const base = buildRules(identity, source, lens, vertical);
  const brief = buildRules(identity, source, lens, vertical, { compact: true });

  const draft = await callModel('draft', `${base}\n\nDRAFT: Write an English long-form article of roughly 900-1300 words. Open on the reader's actual decision, not on a scene. Article only, markdown headings allowed.`);

  const critic = await callModel('critic', `${brief}\n\nCRITIC: List every violation of the hard rules in the article below, plus generic AI phrasing, unsupported claims, weak logic, repetition, predictable structure, missing counterarguments and false certainty. Quote the offending sentence for each. Be brief.\n\n${draft}`);

  const deepenPrompt = critic
    ? `${brief}\n\nDEEPEN: Rewrite the article using the critique. Remove every unsupported number and every invented human detail. Add at least one non-obvious decision rule, one real tradeoff, and one case where the obvious recommendation should not be followed - grounded only in the allowed claims. Article only.\n\nARTICLE:\n${draft}\n\nCRITIQUE:\n${critic}`
    : `${brief}\n\nDEEPEN: Rewrite the article below. Remove every unsupported number and every invented human detail. Add at least one non-obvious decision rule, one real tradeoff, and one case where the obvious recommendation should not be followed - grounded only in the allowed claims. Article only.\n\nARTICLE:\n${draft}`;
  const deepened = (await callModel('deepen', deepenPrompt)) || draft;

  const polished = (await callModel('polish', `${brief}\n\nFINAL EDIT: Humanize the rhythm and transitions. Vary sentence length. Cut filler, textbook scaffolding, unearned sales language, repeated summaries, and any coined capitalised term beyond two. Never fake an anecdote or a typo. Return the finished article only - no preamble, no JSON.\n\n${deepened}`)) || deepened;

  // The body never round-trips through JSON: it is taken verbatim from the polish
  // stage, and only the small metadata envelope is asked for as JSON. That keeps the
  // envelope well inside the free model's output budget.
  const body = stripFence(polished).replace(/^#\s+.+\n+/, '').trim();
  const envelopeRaw = await callModel('envelope', `${brief}\n\nReturn STRICT JSON only, no prose, describing the article below. Keys: title_options (array, max 3), selected_title (string), dek (one sentence), evidence_notes (array: for each figure used, where it came from), claim_type_report (array of {claim, type} where type is one of VERIFIED_FACT, PUBLIC_CLAIM, EXAMPLE, HYPOTHESIS, INTERPRETATION), allowed_claim_report (array), restricted_claim_report (array), cta_recommendation ({include: boolean, reason: string, route_index: integer, label: string, microcopy: string}), editorial_notes (array). Do NOT include the article body.\n\nARTICLE:\n${body}`);

  const envelope = parseEnvelope(envelopeRaw);
  return {
    draft,
    critic,
    deepened,
    polished,
    stages_completed: { draft: Boolean(draft), critic: Boolean(critic), deepen: deepened !== draft, polish: polished !== deepened, envelope: true },
    final: { ...envelope, body_markdown: body }
  };
}

/** Tolerant JSON extraction: a free model often wraps or prefaces its JSON. */
export function parseEnvelope(raw) {
  const cleaned = stripFence(raw);
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end <= start) throw new Error('ENVELOPE_NOT_JSON');
    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

async function loadPriorOutputs() {
  const names = (await fs.readdir(OUT_DIR).catch(() => [])).filter((n) => n.endsWith('.json')).sort();
  const records = [];
  for (const name of names) {
    const record = await readJson(path.join(OUT_DIR, name)).catch(() => null);
    if (!record) continue;
    records.push({
      derivation_id: record.output_id,
      source_id: record.source_id,
      language: 'en',
      lens_id: record.lens_id,
      channel_id: record.attribution?.channel_id || 'owned_signal',
      campaign: record.attribution?.campaign || 'autonomous_revenue_publisher',
      target_asset: record.cta?.asset_id || null,
      cta_id: record.cta?.asset_id || null,
      audience: record.audience || [],
      title: record.title,
      hook: record.dek,
      body: record.body,
      created_at: record.generated_at,
      published_at: record.publication_state === 'PUBLISH_REQUESTED' ? record.generated_at : null
    });
  }
  return records;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const [sourcesDoc, identity, lensesDoc, channelsDoc, candidatesDoc, verticals, sourceRouting] = await Promise.all([
    readJson(SOURCES_FILE), readJson(IDENTITY_FILE), readJson(LENSES_FILE), readJson(CHANNELS_FILE),
    readJson(CANDIDATES_FILE), loadVerticals(), loadSourceRouting()
  ]);
  const inventory = await loadInventory('acquisition/asset-inventory.json', { knownChannels: knownChannels(sourceRouting) });
  const state = await readJson(STATE_FILE).catch(() => ({ version: 3, processed: {}, attempts: {}, last_run_at: null }));
  state.attempts ||= {};
  state.processed ||= {};

  // One opportunity per run, chosen by the routing principle, never by article count.
  const opportunity = selectOpportunity(verticals, candidatesDoc.candidates || []);
  const work = chooseWork({ opportunity, sources: sourcesDoc.sources, state });

  if (!work) {
    state.last_run_at = new Date().toISOString();
    state.last_selection = {
      at: state.last_run_at,
      selected: null,
      eligible: opportunity.eligible,
      not_eligible: opportunity.assessments.filter((a) => !a.eligible).map((a) => ({ vertical_id: a.vertical_id, reasons: a.reasons }))
    };
    await writeJson(STATE_FILE, state);
    console.log('BLOGGER_IDLE no eligible revenue opportunity and no unprocessed owner package');
    return;
  }

  const policy = assertFreeOnly();
  if (!ACCOUNT_ID || !TOKEN) {
    console.log('BLOGGER_BLOCKED free Workers AI credentials missing; no paid fallback, no source marked processed');
    return;
  }

  const { source, vertical_id: verticalId, assessment, lane } = work;
  const vertical = verticalId ? verticals.byId.get(verticalId) : null;
  state.attempts[source.source_id] = (state.attempts[source.source_id] || 0) + 1;

  const chosen = pickLens(source, lensesDoc);
  const generated = await generate(source, identity, chosen.lens, vertical);

  const primaryRoute = (source.existing_product_routes || [])[Number(generated.final?.cta_recommendation?.route_index)] || null;
  const assetPageText = primaryRoute
    ? await loadAssetPageText(inventory.byId?.get?.(primaryRoute.asset_id)
      ?? inventory.assets.find((a) => a.asset_id === primaryRoute.asset_id))
    : '';

  const article = {
    title: generated.final.selected_title,
    dek: generated.final.dek || '',
    body: generated.final.body_markdown,
    evidence_notes: generated.final.evidence_notes || [],
    cta_recommendation: generated.final.cta_recommendation || {}
  };

  const gates = runEditorialGates(article, {
    source,
    identity,
    lens: chosen.lens,
    lensId: chosen.id,
    vertical,
    inventory,
    published: await loadPriorOutputs(),
    assetPageText,
    minWords: MIN_WORDS
  });

  const channel = channelsDoc.channels.devto;
  const publishLane = channel?.account_state === 'CONNECTED' && channel.ai_content_policy_state === 'VERIFIED'
    ? 'HUMAN_REVIEW_REQUIRED' : 'HUMAN_PUBLISH_REQUIRED';
  const status = gates.status;

  const id = `${new Date().toISOString().slice(0, 10)}-${slug(source.source_id)}-${sha(article.body).slice(0, 8)}`;
  const ctaRoute = gates.cta.ok ? gates.cta.route : null;

  const record = {
    version: 3,
    output_id: id,
    generated_at: new Date().toISOString(),
    provider: 'cloudflare-workers-ai-free-only',
    model: MODEL,
    billing_policy: 'FREE_ONLY_NO_PAID_FALLBACK',
    billing_evidence: policy,
    selection: {
      lane,
      vertical_id: verticalId,
      opportunity_score: assessment?.opportunity_score ?? null,
      opportunity_breakdown: assessment?.opportunity_breakdown ?? null,
      considered: opportunity.eligible,
      not_eligible: opportunity.assessments.filter((a) => !a.eligible).map((a) => ({ vertical_id: a.vertical_id, reasons: a.reasons }))
    },
    source_id: source.source_id,
    source_candidate_id: source.source_candidate_id || null,
    source_hash: source.content_hash,
    identity_id: identity.identity_id,
    desk_id: 'en_desk',
    lens_id: chosen.id,
    title_options: generated.final.title_options || [],
    title: article.title,
    dek: article.dek,
    body: article.body,
    audience: source.audience_keys || [],
    evidence_notes: article.evidence_notes,
    claim_type_report: generated.final.claim_type_report || [],
    allowed_claim_report: generated.final.allowed_claim_report || [],
    restricted_claim_report: generated.final.restricted_claim_report || [],
    editorial_notes: generated.final.editorial_notes || [],
    quality: gates.quality,
    gates: {
      executed: gates.gates_executed,
      truth: gates.truth,
      duplication: gates.duplication,
      cta: { ok: gates.cta.ok, failures: gates.cta.failures, warnings: gates.cta.warnings, reason: gates.cta.reason }
    },
    blocking_reasons: gates.blocking_reasons,
    disclosure: disclosureFor(gates),
    status,
    publication_lane: publishLane,
    publication_proof: null,
    cta: ctaRoute ? {
      asset_id: ctaRoute.asset_id,
      label: gates.cta.label,
      microcopy: gates.cta.microcopy_text,
      destination_url: ctaRoute.url,
      tracked_url: trackedUrl(ctaRoute, { source, lensId: chosen.id, verticalId })
    } : null,
    attribution: {
      source_id: source.source_id,
      source_candidate_id: source.source_candidate_id || null,
      vertical_id: verticalId,
      identity_id: identity.identity_id,
      desk_id: 'en_desk',
      lens_id: chosen.id,
      channel_id: 'owned_signal',
      campaign: 'autonomous_revenue_publisher'
    },
    stages_completed: generated.stages_completed,
    stage_diagnostics: stageDiagnostics,
    stages: {
      draft_sha256: sha(generated.draft),
      critic_sha256: sha(generated.critic),
      deepen_sha256: sha(generated.deepened),
      polish_sha256: sha(generated.polished),
      final_sha256: sha(article.body)
    }
  };

  await writeJson(path.join(OUT_DIR, `${id}.json`), record);
  const ctaBlock = record.cta?.tracked_url
    ? `\n\n---\n\n**${record.cta.label}** — ${record.cta.tracked_url}${record.cta.microcopy ? `\n\n${record.cta.microcopy}` : ''}\n`
    : '';
  await fs.writeFile(
    path.join(OUT_DIR, `${id}.md`),
    `# ${record.title}\n\n${record.dek ? `${record.dek}\n\n` : ''}${record.body}${ctaBlock}`
  );

  if (status === 'READY') state.processed[source.source_id] = { output_id: id, at: record.generated_at, status };
  state.last_run_at = record.generated_at;
  state.last_selection = { at: record.generated_at, selected: verticalId, lane, eligible: opportunity.eligible };
  await writeJson(STATE_FILE, state);

  for (const d of stageDiagnostics) {
    console.log(`  STAGE ${d.stage} prompt_chars=${d.prompt_chars} max_tokens=${d.max_tokens} returned_chars=${d.returned_chars}`);
  }
  console.log(`BLOGGER_${status} ${id} quality=${gates.quality.score} band=${gates.quality.band} vertical=${verticalId ?? 'none'} attempt=${state.attempts[source.source_id]}/${MAX_ATTEMPTS}`);
  for (const reason of gates.blocking_reasons) console.log(`  BLOCKED_BY ${reason}`);
  for (const cap of gates.quality.caps) console.log(`  CAP ${cap.code} ceiling=${cap.ceiling} ${cap.detail}`);
}

const isEntry = process.argv[1] && import.meta.url === `file://${path.resolve(process.argv[1])}`;
if (isEntry) {
  main().catch((error) => {
    for (const d of stageDiagnostics) {
      console.error(`  STAGE ${d.stage} prompt_chars=${d.prompt_chars} max_tokens=${d.max_tokens} returned_chars=${d.returned_chars} finish=${d.finish_reason} usage=${JSON.stringify(d.usage)}${d.empty_body_sample ? ` body=${JSON.stringify(d.empty_body_sample)}` : ''}`);
    }
    console.error(`BLOGGER_STOP ${error.message}`);
    process.exitCode = 0;
  });
}

export { main, assertFreeOnly, FREE_MODELS, PAID_PROVIDER_ENV, STAGE_BUDGET };
