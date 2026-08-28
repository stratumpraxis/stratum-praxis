import crypto from 'node:crypto';
import { buildTrackedUrl } from '../../acquisition/lib/utm.mjs';
import { normalizeCopy, slug } from '../../acquisition/lib/util.mjs';
import { routeBlockedByCooldown } from '../../acquisition/signal-intelligence/lib/index.mjs';

export const PUBLICATION_STATES = Object.freeze(['DRAFT', 'READY', 'PUBLISH_REQUESTED', 'PUBLISHED', 'VERIFIED']);
export const PUBLICATION_TRANSITIONS = Object.freeze({
  DRAFT: ['READY'], READY: ['PUBLISH_REQUESTED'], PUBLISH_REQUESTED: ['PUBLISHED'], PUBLISHED: ['VERIFIED'], VERIFIED: []
});
const EXPERIENCE_PATTERNS = [
  /\bi (?:tested|bought|purchased|use .* every day|used this|worked with|earned|lived in|visited)\b/i,
  /\b(?:my clients?|my customers?|my employer|my revenue|in my client work)\b/i,
  /\b(?:i am|i'm) (?:a certified|an? expert|employed by)\b/i
];
const BIOGRAPHY_FIELDS = ['legal_name', 'age', 'exact_location', 'employer', 'credentials', 'revenue', 'clients', 'travel_history'];

export function sourceHash(source) {
  return crypto.createHash('sha256').update(String(source.original_content ?? '')).digest('hex');
}
export function validateSource(source, existing = []) {
  const errors = [];
  for (const field of ['source_id', 'source_type', 'title', 'language', 'content_hash', 'created_at', 'completed_at', 'status', 'allowed_claims', 'restricted_claims', 'personal_experience_claims', 'evidence_refs', 'existing_product_routes']) {
    if (source?.[field] === undefined || source?.[field] === null) errors.push(`${field} is required`);
  }
  if (source?.status !== 'COMPLETE' && !['SOURCE_CANDIDATE', 'HIGH_PRIORITY_SOURCE_CANDIDATE'].includes(source?.candidate_status)) errors.push('source must be COMPLETE or a valid promoted #53 candidate');
  if (source?.source_type === 'SOURCE_CANDIDATE' && !source?.source_candidate_id) errors.push('source_candidate_id is required for #53 sources');
  if (source?.original_content !== undefined && source.content_hash !== sourceHash(source)) errors.push('content_hash does not match immutable original_content');
  if (existing.some((s) => s.source_id === source?.source_id || s.content_hash === source?.content_hash)) errors.push('duplicate source id or content hash');
  return errors;
}

export function truthGate(text, identity, source = {}) {
  const problems = [];
  for (const pattern of EXPERIENCE_PATTERNS) if (pattern.test(text)) {
    const approved = (source.personal_experience_claims || []).some((claim) => text.toLowerCase().includes(String(claim).toLowerCase()));
    if (!approved) problems.push(`unapproved first-person claim matches ${pattern}`);
  }
  for (const field of BIOGRAPHY_FIELDS) if (source[field] && !(identity.approved_first_person_claims || []).includes(`${field}:${source[field]}`)) problems.push(`fabricated or unapproved biography field: ${field}`);
  for (const claim of source.restricted_claims || []) if (normalizeCopy(text).includes(normalizeCopy(claim))) problems.push(`restricted claim used: ${claim}`);
  return { ok: problems.length === 0, problems };
}

function tokens(text) { return new Set(normalizeCopy(text).split(' ').filter((x) => x.length > 2)); }
export function similarity(a, b) {
  const left = tokens(a); const right = tokens(b);
  if (!left.size && !right.size) return 1;
  const overlap = [...left].filter((x) => right.has(x)).length;
  return overlap / Math.max(1, left.size + right.size - overlap);
}
export function duplicationGate(output, catalog = [], { threshold = 0.72, cooldownDays = 30, now = new Date() } = {}) {
  const problems = [];
  for (const prior of catalog) {
    if (normalizeCopy(output.title) === normalizeCopy(prior.title)) problems.push(`repeated title with ${prior.output_id}`);
    if (similarity(`${output.title} ${output.body}`, `${prior.title} ${prior.body}`) >= threshold) problems.push(`near-duplicate of ${prior.output_id}`);
    const recent = Date.parse(prior.created_at) >= now.getTime() - cooldownDays * 86400000;
    if (recent && prior.source_id === output.source_id && prior.channel_id === output.channel_id) problems.push('same source routed to same channel inside cooldown');
    if (recent && prior.audience === output.audience && prior.cta_id === output.cta_id && prior.destination_url === output.destination_url) problems.push('same audience + CTA + destination inside cooldown');
  }
  return { ok: problems.length === 0, problems };
}

export function localizationGate(output, sourceOutput = null) {
  const problems = [];
  if (!output?.title || !output?.body) problems.push('localized title and body are required');
  if (!Number.isFinite(output?.localization?.quality_score) || output.localization.quality_score < 0.7) problems.push('localization quality below 0.70');
  for (const key of ['framing', 'hook', 'terminology', 'examples', 'cta_wording', 'cultural_context']) if (!output?.localization?.[key]) problems.push(`localization evidence missing: ${key}`);
  if (output?.desk_id === 'es_desk' && sourceOutput && (normalizeCopy(output.body) === normalizeCopy(sourceOutput.body) || output.localization.literal_translation === true)) problems.push('Spanish output is a literal translation/copy');
  if (output?.desk_id === 'es_desk' && output?.target_asset_language === 'en' && output?.cta_present && !output?.english_only_disclosure) problems.push('English-only destination disclosure is required');
  return { ok: problems.length === 0, problems };
}

export function materialTransformationGate(output, source) {
  const score = similarity(output.body, source.original_content || '');
  return { ok: score < 0.72 && normalizeCopy(output.title) !== normalizeCopy(source.title), similarity: score, problems: score >= 0.72 ? ['output is copy-spin rather than material transformation'] : [] };
}

function providerForChannel(providerPolicy, channel) {
  return Object.entries(providerPolicy?.providers || {}).find(([, p]) => (p.allowedServices || []).map((x) => String(x).toLowerCase()).includes(channel));
}
export function publicationGate({ channel, providerPolicy, account_authorized = false, automation_permitted = false, disclosure_required = false, disclosure_state = 'NOT_REQUIRED', truth, duplication, localization, safety_ok = false }) {
  const provider = providerForChannel(providerPolicy, channel);
  const problems = [];
  if (!provider) problems.push('no provider declares this channel');
  if (!truth?.ok) problems.push('truth gate failed');
  if (!duplication?.ok) problems.push('duplication gate failed');
  if (!localization?.ok) problems.push('localization gate failed');
  if (!safety_ok) problems.push('safety/collision gate not proven');
  if (disclosure_required && disclosure_state !== 'SATISFIED') problems.push('required AI/content disclosure is unmet');
  if (!provider || provider[1].publishingEnabled !== true) return { lane: provider ? 'HUMAN_PUBLISH_REQUIRED' : 'BLOCKED', problems };
  if (!account_authorized) return { lane: 'HUMAN_PUBLISH_REQUIRED', problems: [...problems, 'account authorization not proven'] };
  if (!automation_permitted) return { lane: 'HUMAN_REVIEW_REQUIRED', problems: [...problems, 'intended automation compatibility not proven'] };
  if (problems.length) return { lane: 'BLOCKED', problems };
  return { lane: 'AUTO_PUBLISH_ALLOWED', problems: [] };
}

export function transitionPublication(item, to, proof = {}) {
  if (!PUBLICATION_TRANSITIONS[item.status]?.includes(to)) throw new Error(`illegal publication transition ${item.status} -> ${to}`);
  if (to === 'PUBLISHED' && (!proof.external_post_id || !proof.canonical_url || !proof.published_at || !proof.account_id)) throw new Error('PUBLISHED requires external post id, canonical URL, timestamp and account id');
  if (to === 'VERIFIED' && (!proof.independent_verification_ref || !proof.verified_at)) throw new Error('VERIFIED requires independent verification proof');
  return { ...item, status: to, publish_proof: { ...(item.publish_proof || {}), ...proof } };
}

export function buildMediaAttribution({ source, candidate, identity, desk, lens, channel, account_alias, target_asset, cta_id, campaign, destinationUrl, sourceRouting }) {
  const tracked = buildTrackedUrl({ channel, assetId: target_asset, campaign, contentAngle: `${desk}:${lens}`, variant: source.source_id, destinationUrl, sourceRouting });
  return {
    source_id: source.source_id, source_candidate_id: candidate?.source_candidate_id ?? null,
    identity_id: identity.identity_id, desk_id: desk, lens_id: lens, channel_id: channel,
    account_alias, campaign: slug(campaign), target_asset, cta_id,
    destination_url: tracked.url, utm_parameters: tracked.params
  };
}

export function deriveRoute({ source, candidate, identity, desk, lens, output, catalog = [], providerPolicy, sourceRouting, channel, account_alias, history = [], now = new Date(), account_authorized = false, automation_permitted = false, safety_ok = false }) {
  const sourceErrors = validateSource(source);
  if (sourceErrors.length) return { eligible: false, blocks: sourceErrors };
  if (!['en_desk', 'es_desk'].includes(desk.desk_id)) return { eligible: false, blocks: ['unknown desk'] };
  if (!['japan_reality', 'independent_builder', 'practical_operator', 'structural_reflection'].includes(lens.lens_id)) return { eligible: false, blocks: ['unknown lens'] };
  if (routeBlockedByCooldown(history, { topic: source.title, desk_id: desk.desk_id, lens_id: lens.lens_id, now })) return { eligible: false, blocks: ['STOP route remains inside cooldown'] };
  const truth = truthGate(`${output.title}\n${output.body}`, identity, source);
  const duplicate = duplicationGate(output, catalog, { now });
  const localization = localizationGate(output, output.source_desk_output);
  const transformed = materialTransformationGate(output, source);
  const gate = publicationGate({ channel, providerPolicy, account_authorized, automation_permitted, disclosure_required: output.platform_disclosure_required, disclosure_state: output.disclosure_state, truth, duplication: duplicate, localization, safety_ok });
  const blocks = [...truth.problems, ...duplicate.problems, ...localization.problems, ...transformed.problems, ...gate.problems];
  if (!transformed.ok && gate.lane !== 'BLOCKED') gate.lane = 'BLOCKED';
  const routeAsset = candidate?.best_existing_asset;
  const attribution = routeAsset ? buildMediaAttribution({ source, candidate, identity, desk: desk.desk_id, lens: lens.lens_id, channel, account_alias, target_asset: routeAsset.asset_id, cta_id: output.cta_id, campaign: output.campaign, destinationUrl: routeAsset.destination_url, sourceRouting }) : null;
  return { eligible: blocks.length === 0 || ['HUMAN_REVIEW_REQUIRED', 'HUMAN_PUBLISH_REQUIRED'].includes(gate.lane), publication_lane: gate.lane, blocks, attribution, provenance: { source_id: source.source_id, source_candidate_id: candidate?.source_candidate_id ?? null, identity_id: identity.identity_id, desk_id: desk.desk_id, lens_id: lens.lens_id, channel_id: channel }, account_creation: 'NEVER_AUTOMATIC' };
}

export function validatePaymentAttribution(event) {
  if (event?.purchase > 0 && !event?.payment_provider_evidence) return ['purchase attribution requires payment-provider evidence'];
  return [];
}
