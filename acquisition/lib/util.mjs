// Shared primitives for the Acquisition Intelligence Engine.
// No dependencies: the repository is deliberately package-manager-free.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

export function repoPath(...parts) {
  return path.join(REPO_ROOT, ...parts);
}

export async function readJson(relOrAbs) {
  const file = path.isAbsolute(relOrAbs) ? relOrAbs : repoPath(relOrAbs);
  const raw = await fs.readFile(file, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`invalid JSON in ${relOrAbs}: ${error.message}`);
  }
}

export async function writeJson(relOrAbs, value) {
  const file = path.isAbsolute(relOrAbs) ? relOrAbs : repoPath(relOrAbs);
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export async function fileExists(relOrAbs) {
  const file = path.isAbsolute(relOrAbs) ? relOrAbs : repoPath(relOrAbs);
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

/** Deterministic lowercase snake slug. Same input always produces the same campaign token. */
export function slug(value, maxLength = 60) {
  return String(value == null ? '' : value)
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, maxLength)
    .replace(/_+$/g, '');
}

/** Collapse copy for duplicate detection: same wording, different spacing/case, is a duplicate. */
export function normalizeCopy(text) {
  return String(text == null ? '' : text)
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[\s　]+/g, ' ')
    .replace(/[^\p{L}\p{N} ]+/gu, '')
    .trim();
}

export function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * NOT_MEASURED must never collapse into 0.
 * `null`/`undefined` mean "no measurement exists"; 0 means "measured and it was zero".
 */
export function isMeasured(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

export function measuredOr(value, fallback = 'NOT_MEASURED') {
  return isMeasured(value) ? value : fallback;
}

/** Safe ratio that refuses to invent a rate from an unmeasured or zero denominator. */
export function rate(numerator, denominator) {
  if (!isMeasured(numerator) || !isMeasured(denominator)) return null;
  if (denominator <= 0) return null;
  return numerator / denominator;
}

export function uniq(list) {
  return [...new Set(list)];
}

export function parseUrl(value) {
  try {
    return new URL(String(value));
  } catch {
    return null;
  }
}

export function hostOf(url) {
  const parsed = url instanceof URL ? url : parseUrl(url);
  return parsed ? parsed.hostname.toLowerCase().replace(/^www\./, '') : '';
}

export function nowIso() {
  return new Date().toISOString();
}
