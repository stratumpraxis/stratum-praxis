// Locate the trend-video manifest that produced a published post.
//
// Manifests live in three places and are rotated, so the manifest for an older post may
// only survive in git history. All lookups are READ-ONLY: this module runs `git show`,
// never `git write`, and never touches trend-video-engine/ on disk.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';

import { REPO_ROOT, isPlainObject, repoPath } from './util.mjs';

const run = promisify(execFile);

export const ROTATING_MANIFESTS = Object.freeze([
  'trend-video-engine/current.json',
  'trend-video-engine/tiktok-stratum-current.json'
]);

export const VARIANTS_DIR = 'trend-video-engine/variants';

function parse(raw) {
  try {
    const value = JSON.parse(raw);
    return isPlainObject(value) && value.id ? value : null;
  } catch {
    return null;
  }
}

async function readWorktree(relPath) {
  try {
    return parse(await fs.readFile(repoPath(relPath), 'utf8'));
  } catch {
    return null;
  }
}

async function gitShow(ref, relPath) {
  try {
    const { stdout } = await run('git', ['show', `${ref}:${relPath}`], { cwd: REPO_ROOT, maxBuffer: 8 * 1024 * 1024 });
    return parse(stdout);
  } catch {
    return null;
  }
}

async function historyOf(relPath) {
  try {
    const { stdout } = await run('git', ['log', '--format=%H', '--', relPath], { cwd: REPO_ROOT, maxBuffer: 8 * 1024 * 1024 });
    return stdout.split('\n').map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Build a manifest_id -> manifest map from every available source.
 * Worktree copies win over historical ones; the first historical hit wins after that.
 */
export async function collectManifests({ includeHistory = true } = {}) {
  const found = new Map();
  const sources = new Map();

  const remember = (manifest, source) => {
    if (!manifest || found.has(manifest.id)) return;
    found.set(manifest.id, manifest);
    sources.set(manifest.id, source);
  };

  // 1. variants/ - the durable per-post archive
  try {
    for (const entry of await fs.readdir(repoPath(VARIANTS_DIR))) {
      if (!entry.endsWith('.json')) continue;
      const rel = path.posix.join(VARIANTS_DIR, entry);
      remember(await readWorktree(rel), rel);
    }
  } catch { /* no variants dir is not an error */ }

  // 2. the rotating current manifests
  for (const rel of ROTATING_MANIFESTS) remember(await readWorktree(rel), rel);

  // 3. git history of the rotating manifests, for posts whose manifest has since rotated out
  if (includeHistory) {
    for (const rel of ROTATING_MANIFESTS) {
      for (const sha of await historyOf(rel)) {
        remember(await gitShow(sha, rel), `${rel}@${sha.slice(0, 7)}`);
      }
    }
  }

  return { manifests: found, sources };
}
