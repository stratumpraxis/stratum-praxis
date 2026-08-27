#!/usr/bin/env node
/**
 * Media integrity check (zero dependency).
 *
 * Why this exists: two separate revenue-path failures were caused by
 * structurally corrupt media that looked fine in `git status`:
 *   - distribution/ai-saas-cost-instagram-20260827.png was truncated, so the
 *     Instagram AI/SaaS cost-review Buffer post failed (status=error, never sent).
 *   - microsoft-ai-roi-planner/icon-*.png was corrupt, blocking Store readiness.
 *
 * Both were found only after an external platform rejected them. This check
 * finds that class of defect before it reaches a publisher or a store review.
 *
 * Usage: node tools/check-media-integrity.mjs [path ...]
 *   No arguments => scan the whole repository.
 * Exit 0 = all media structurally valid. Exit 1 = at least one defect.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname, relative, resolve } from 'node:path';

const REPO_ROOT = resolve(new URL('..', import.meta.url).pathname);
const SKIP_DIRS = new Set(['.git', 'node_modules']);
const MEDIA_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.mp4', '.ico']);

function walk(dir, out) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(join(dir, entry.name), out);
    } else if (entry.isFile() && MEDIA_EXT.has(extname(entry.name).toLowerCase())) {
      out.push(join(dir, entry.name));
    }
  }
  return out;
}

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function checkPng(buf) {
  if (buf.length < 8 || !buf.subarray(0, 8).equals(PNG_SIG)) return 'not a PNG (bad signature)';
  let offset = 8;
  let sawIhdr = false;
  let sawIdat = false;
  let sawIend = false;
  let width = 0;
  let height = 0;
  while (offset + 8 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const chunkEnd = dataStart + length + 4; // + CRC
    if (chunkEnd > buf.length) return `truncated: chunk "${type}" claims ${length} bytes but file ends early`;
    if (type === 'IHDR') {
      if (length < 13) return 'IHDR chunk too short';
      width = buf.readUInt32BE(dataStart);
      height = buf.readUInt32BE(dataStart + 4);
      sawIhdr = true;
    }
    if (type === 'IDAT') sawIdat = true;
    if (type === 'IEND') { sawIend = true; offset = chunkEnd; break; }
    offset = chunkEnd;
  }
  if (!sawIhdr) return 'missing IHDR chunk';
  if (!width || !height) return `invalid dimensions ${width}x${height}`;
  if (!sawIdat) return 'missing IDAT image data';
  if (!sawIend) return 'truncated: missing IEND end-of-file chunk';
  if (offset !== buf.length) return `trailing garbage after IEND (${buf.length - offset} bytes)`;
  return null;
}

function checkJpeg(buf) {
  if (buf.length < 4) return 'file too small to be a JPEG';
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return 'not a JPEG (missing SOI marker)';
  if (buf[buf.length - 2] !== 0xff || buf[buf.length - 1] !== 0xd9) {
    return 'truncated: missing EOI (FFD9) end marker';
  }
  return null;
}

function checkGif(buf) {
  const head = buf.subarray(0, 6).toString('ascii');
  if (head !== 'GIF87a' && head !== 'GIF89a') return 'not a GIF (bad header)';
  if (buf[buf.length - 1] !== 0x3b) return 'truncated: missing GIF trailer (0x3B)';
  return null;
}

function checkWebp(buf) {
  if (buf.length < 12) return 'file too small to be a WebP';
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') {
    return 'not a WebP (bad RIFF/WEBP header)';
  }
  const declared = buf.readUInt32LE(4) + 8;
  if (declared > buf.length) return `truncated: RIFF header declares ${declared} bytes, file has ${buf.length}`;
  return null;
}

function checkSvg(buf) {
  const text = buf.toString('utf8');
  if (!/<svg[\s>]/i.test(text)) return 'no <svg> root element';
  if (!/<\/svg\s*>\s*$/i.test(text.trimEnd())) return 'truncated: no closing </svg>';
  if (text.includes('�')) return 'contains replacement characters (encoding damage)';
  const opens = (text.match(/<(?!\/|\?|!)([a-zA-Z][\w:-]*)/g) || []).length;
  if (opens === 0) return 'no elements found';
  return null;
}

const ICO_HEADER_SIZE = 6;
const ICO_ENTRY_SIZE = 16;

function checkIco(buf) {
  if (buf.length < ICO_HEADER_SIZE) return 'file too small to be an ICO';
  if (buf.readUInt16LE(0) !== 0 || buf.readUInt16LE(2) !== 1) return 'not an ICO (bad header)';
  const count = buf.readUInt16LE(4);
  if (count === 0) return 'ICO declares zero images';
  for (let i = 0; i < count; i += 1) {
    const entry = ICO_HEADER_SIZE + i * ICO_ENTRY_SIZE;
    if (entry + ICO_ENTRY_SIZE > buf.length) return 'truncated: ICO directory shorter than declared image count';
    const size = buf.readUInt32LE(entry + 8);
    const offset = buf.readUInt32LE(entry + 12);
    if (offset + size > buf.length) return `truncated: ICO image ${i + 1} extends past end of file`;
  }
  return null;
}

/**
 * Walks the ISO-BMFF box tree. A truncated MP4 (the common CI/render failure)
 * shows up as a box whose declared size runs past the end of the file, or as a
 * file with no `moov` — which every player and every upload API rejects.
 */
function checkMp4(buf) {
  if (buf.length < 8) return 'file too small to be an MP4';
  let offset = 0;
  let sawFtyp = false;
  let sawMoov = false;
  let sawMdat = false;
  while (offset + 8 <= buf.length) {
    let size = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    let headerSize = 8;
    if (size === 1) {
      if (offset + 16 > buf.length) return 'truncated: 64-bit box size header runs past end of file';
      const large = buf.readBigUInt64BE(offset + 8);
      if (large > BigInt(Number.MAX_SAFE_INTEGER)) return 'implausible 64-bit box size';
      size = Number(large);
      headerSize = 16;
    } else if (size === 0) {
      size = buf.length - offset; // box extends to end of file
    }
    if (size < headerSize) return `invalid box "${type}" with size ${size}`;
    if (offset + size > buf.length) {
      return `truncated: box "${type}" claims ${size} bytes but only ${buf.length - offset} remain`;
    }
    if (type === 'ftyp') sawFtyp = true;
    if (type === 'moov') sawMoov = true;
    if (type === 'mdat') sawMdat = true;
    offset += size;
  }
  if (offset !== buf.length) return `truncated: ${buf.length - offset} trailing bytes are not a complete box`;
  if (!sawFtyp) return 'missing ftyp box (not a valid MP4 container)';
  if (!sawMoov) return 'missing moov box — file is unplayable and will be rejected on upload';
  if (!sawMdat) return 'missing mdat box — container has no media data';
  return null;
}

const CHECKERS = {
  '.png': checkPng,
  '.jpg': checkJpeg,
  '.jpeg': checkJpeg,
  '.gif': checkGif,
  '.webp': checkWebp,
  '.svg': checkSvg,
  '.mp4': checkMp4,
  '.ico': checkIco,
};

const targets = process.argv.slice(2);
let files;
if (targets.length === 0) {
  files = walk(REPO_ROOT, []).sort();
} else {
  files = [];
  for (const target of targets) {
    const abs = resolve(target);
    const info = statSync(abs);
    if (info.isDirectory()) files.push(...walk(abs, []));
    else files.push(abs);
  }
  files = files.filter((f) => MEDIA_EXT.has(extname(f).toLowerCase())).sort();
}

const failures = [];
for (const file of files) {
  const ext = extname(file).toLowerCase();
  const checker = CHECKERS[ext];
  if (!checker) continue;
  const buf = readFileSync(file);
  const rel = relative(REPO_ROOT, file);
  if (buf.length === 0) {
    failures.push(`${rel}: file is empty`);
    continue;
  }
  let problem;
  try {
    problem = checker(buf);
  } catch (error) {
    problem = `parser error: ${error.message}`;
  }
  if (problem) failures.push(`${rel}: ${problem}`);
}

console.log(`Checked ${files.length} media file(s).`);
if (failures.length > 0) {
  console.error(`\nMedia integrity FAILED — ${failures.length} defect(s):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error('\nDo not publish or submit these assets. Re-render the source and commit the fixed binary.');
  process.exit(1);
}
console.log('Media integrity OK — no truncated, empty, or malformed assets found.');
