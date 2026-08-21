#!/usr/bin/env node
// Verify an assembled Lapsus dist tree independently of the build that made it.
//
// MODE:       CHECK
// OBSERVABLE: what is ACTUALLY on disk in the dist tree — presence, size and
//             filename case — never what the build intended to put there.
// UNITS:      bytes and exact paths.
//
//   node tools/verify-lapsus-dist.mjs dist/lapsus-webgl
//
// WHY THIS IS SEPARATE FROM THE BUILD.  The build knows what it MEANT to copy.
// This reads only what is actually on disk, so a dropped file, a truncated
// binary or a filename whose case changed on a case-insensitive volume fails
// here rather than in a browser after publication.
//
// It also walks the ES module graph from index.html. The runtime has no
// bundler and no import map: a specifier that does not resolve is not a build
// error, it is a black canvas and one line in a console nobody has open. The
// Lapsus tree makes that risk concrete — web/js/main.js imports OUT of web/
// into ../../work/js/, and index.html moves up a level during the build, so
// "does every path still line up" is the one thing assembly can silently break.
//
// See also tools/smoke-lapsus-dist.mjs, which boots the tree in Chrome. This
// verifier is the static half: it needs no browser and runs in a second.

import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const target = process.argv[2];
if (!target || process.argv.length > 3) {
  console.error('usage: node tools/verify-lapsus-dist.mjs <dist-directory>');
  process.exit(2);
}
const root = path.resolve(target);

let failures = 0;
const fail = (message) => { console.error(`fail: ${message}`); failures++; };

async function walk(directory, prefix = '') {
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...(await walk(path.join(directory, entry.name), relative) ?? []));
    else if (entry.isFile()) files.push(relative);
  }
  return files;
}

const exists = async (relative) => {
  try {
    await fs.access(path.join(root, relative));
    return true;
  } catch {
    return false;
  }
};

// ---- 1. the files a served copy cannot do without.
// prod.json is in this list because it is RUNTIME data here, not metadata: the
// player reads its capture offsets to place the two tracks on one clock.
const REQUIRED = [
  'index.html', 'prod.json', 'README.md', '.nojekyll',
  'web/js/main.js', 'web/js/shared/minigl.js',
  'work/MANIFEST.sha256',
];
for (const name of REQUIRED) {
  if (!await exists(name)) fail(`missing ${name}`);
}

// Authoring-only trees must NOT be here. They are harmless to serve, but they
// misdescribe the artifact: a dist carrying work/verify/ reads as if those
// harnesses ran against it, and work/ghidra/ is a decompiler project nobody
// should be downloading from a demo page.
for (const name of ['work/verify', 'work/re', 'work/ghidra', 'work/src', 'work/unpack.mjs']) {
  if (await exists(name)) fail(`authoring-only path shipped: ${name}`);
}

// ---- 2. every shipped data file, re-hashed against the preserved extraction.
// MANIFEST.sha256 lives at work/MANIFEST.sha256 in the working tree and its
// paths are relative to that directory, which is exactly where the mirrored
// layout puts them — so the manifest ships as-is and keeps meaning the same
// thing. Comparison is against a real directory listing, never fs.access:
// macOS answers access('Data/X.LWO') for data/x.lwo, and GitHub Pages will not.
if (await exists('work/MANIFEST.sha256')) {
  const text = await fs.readFile(path.join(root, 'work/MANIFEST.sha256'), 'utf8');
  const expected = new Map();
  for (const line of text.split('\n')) {
    const match = /^([0-9a-f]{64})\s+(.+)$/.exec(line.trim());
    if (match) expected.set(match[2], match[1]);
  }
  if (!expected.size) fail('work/MANIFEST.sha256 lists no files');

  const shipped = new Set((await walk(path.join(root, 'work/unpacked')) ?? [])
    .map((name) => `unpacked/${name}`));

  for (const relative of shipped) {
    if (!expected.has(relative)) fail(`work/${relative} is not in MANIFEST.sha256`);
  }
  let hashed = 0;
  for (const [relative, sha] of expected) {
    if (!shipped.has(relative)) {
      fail(`work/${relative} is missing (or its filename case differs)`);
      continue;
    }
    const bytes = await fs.readFile(path.join(root, 'work', relative));
    if (createHash('sha256').update(bytes).digest('hex') !== sha) {
      fail(`work/${relative}: sha256 does not match the preserved extraction`);
    } else hashed++;
  }
  console.log(`  ${hashed} data files re-hashed against MANIFEST.sha256`);
}

// ---- 3. the module graph, walked from the page rather than from the folder.
// Globbing web/js/ and work/js/ would prove only that files exist. Walking the
// graph proves the page can boot: index.html reaches main.js at its new depth,
// every ../../work/js/ specifier still lands inside the dist, and nothing ships
// that no entry point reaches.
const ENTRY_PAGES = ['index.html'];
const SPECIFIER = /(?:^|[\s;}])(?:import|export)\b[^'"]*?from\s*['"]([^'"]+)['"]|(?:^|[\s;}])import\s*['"]([^'"]+)['"]/g;

const reached = new Set();
const queue = [];
for (const page of ENTRY_PAGES) {
  if (!await exists(page)) continue;
  const html = await fs.readFile(path.join(root, page), 'utf8');
  const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)];
  if (!scripts.length) fail(`${page} has no <script src>; the build's rewrite did not apply`);
  for (const match of scripts) queue.push({ specifier: './' + match[1].replace(/^\.\//, ''), from: page });
  for (const match of html.matchAll(/<link[^>]+href="([^"]+)"/g)) {
    const href = match[1];
    if (href.startsWith('http') || href.startsWith('#')) continue;
    if (!await exists(path.normalize(path.join(path.dirname(page), href)))) {
      fail(`${page} references ${href}, which is not in the dist`);
    }
  }
}

while (queue.length) {
  const { specifier, from } = queue.shift();
  if (!specifier.startsWith('.')) {
    fail(`${from} imports the non-relative specifier "${specifier}"; the dist has no import map`);
    continue;
  }
  const resolved = path.normalize(path.join(path.dirname(from), specifier));
  if (resolved.startsWith('..')) {
    fail(`${from} imports "${specifier}", which escapes the dist root`);
    continue;
  }
  if (reached.has(resolved)) continue;
  reached.add(resolved);
  if (!await exists(resolved)) {
    fail(`${from} imports "${specifier}", which is not in the dist`);
    continue;
  }
  const source = await fs.readFile(path.join(root, resolved), 'utf8');
  for (const match of source.matchAll(SPECIFIER)) {
    queue.push({ specifier: match[1] ?? match[2], from: resolved });
  }
  if (/\bimport\s*\(/.test(source)) {
    // Dynamic imports are invisible to this walk, so the guarantee below would
    // quietly stop being true. There are none today; say so if that changes.
    fail(`${resolved} uses a dynamic import(), which this verifier cannot follow`);
  }
}

const shippedModules = [
  ...(await walk(path.join(root, 'web/js')) ?? []).map((name) => `web/js/${name}`),
  ...(await walk(path.join(root, 'work/js')) ?? []).map((name) => `work/js/${name}`),
];
for (const module of shippedModules) {
  if (!reached.has(module)) fail(`${module} ships but no entry point reaches it`);
}
console.log(`  ${reached.size} modules reachable from ${ENTRY_PAGES.join(' + ')}`);

if (failures) {
  console.error(`\n${failures} problem(s) in ${root}`);
  process.exit(1);
}
console.log(`verified ${root}`);
