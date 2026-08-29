// Text primitives shared by the guard. No dependencies.

/**
 * Collapse copy for duplicate detection: the same wording with different spacing,
 * casing, punctuation or embedded URLs is the same copy.
 */
export function normalizeCopy(text) {
  return String(text == null ? '' : text)
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[\s　]+/g, ' ')
    .replace(/[^\p{L}\p{N} ]+/gu, '')
    .trim();
}

/** Deterministic lowercase snake slug. The same input always produces the same token. */
export function slug(value, maxLength = 60) {
  return String(value == null ? '' : value)
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, maxLength)
    .replace(/_+$/g, '');
}

/** Word shingles used for near-duplicate detection. */
export function shingles(text, size = 4) {
  const words = normalizeCopy(text).split(' ').filter(Boolean);
  if (words.length < size) return new Set(words.length ? [words.join(' ')] : []);
  const out = new Set();
  for (let i = 0; i <= words.length - size; i += 1) out.add(words.slice(i, i + size).join(' '));
  return out;
}

export function jaccard(a, b) {
  if (!a.size && !b.size) return 0;
  let shared = 0;
  for (const value of a) if (b.has(value)) shared += 1;
  const union = a.size + b.size - shared;
  return union === 0 ? 0 : shared / union;
}

/** Textual near-duplication between two passages. */
export function textSimilarity(a, b) {
  return jaccard(shingles(a), shingles(b));
}

/**
 * Stable identity for a distribution lane. Two items with the same key compete for the
 * same audience with the same destination, which is what cannibalization means here.
 */
export function laneKey({ channel, assetId, campaign }) {
  return [slug(channel, 24), slug(assetId, 60), slug(campaign, 60)].join('|');
}
