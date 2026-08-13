#!/usr/bin/env node
// Verify an assembled Wonder dist tree independently of the build that made it.
//
//   node tools/verify-wonder-dist.mjs dist/wonder-webgl
//
// WHY THIS EXISTS SEPARATELY FROM check-sunflower-assets.mjs.  That tool proves
// the WORKING TREE matches the preserved extraction.  This one proves the tree
// that will actually be uploaded does — a copy step can drop a file, mangle
// filename case on a case-insensitive volume, or truncate a binary, and none of
// that is visible in the source repo afterwards.  The dist is the artifact the
// provenance claim is made about, so the dist is what gets re-hashed.
//
// It also walks the ES module graph from both HTML entry points.  The runtime
// has no bundler: a missing module is not a build error, it is a blank canvas
// and one line in a console nobody has open.

import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const target = process.argv[2];
if (!target || process.argv.length > 3) {
  console.error('usage: node tools/verify-wonder-dist.mjs <dist-directory>');
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
const REQUIRED = [
  'index.html', 'timeline.html', 'timeline.css', 'assets-manifest.json',
  'js/main.js', 'js/timeline-inspector.js', 'LICENSE', 'README.md', '.nojekyll',
];
for (const name of REQUIRED) {
  if (!await exists(name)) fail(`missing ${name}`);
}

// Authoring-only trees must NOT be here. They are harmless to serve but they
// misdescribe the artifact: a dist that carries a test directory reads as if
// the tests ran against it.
for (const name of ['test', 'tools', '.python-version']) {
  if (await exists(name)) fail(`authoring-only path shipped: ${name}`);
}

// ---- 2. every shipped asset, re-hashed against the manifest.
if (await exists('assets-manifest.json')) {
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'assets-manifest.json'), 'utf8'));
  const expected = new Map(manifest.assets.map((entry) => [entry.path, entry]));
  const shipped = await walk(path.join(root, 'assets')) ?? [];

  for (const relative of shipped) {
    if (!expected.has(relative)) fail(`assets/${relative} is not in the manifest`);
  }
  for (const [relative, entry] of expected) {
    // Compared case-exactly on purpose. macOS will happily serve `D1_Face.jpg`
    // for a request for `d1_face.jpg`; GitHub Pages will not, and that class of
    // bug survives every local test and appears only after publication.
    if (!shipped.includes(relative)) {
      fail(`assets/${relative} is missing (or its filename case differs)`);
      continue;
    }
    const bytes = await fs.readFile(path.join(root, 'assets', relative));
    if (bytes.length !== entry.size) {
      fail(`assets/${relative}: ${bytes.length} bytes, manifest says ${entry.size}`);
    } else if (createHash('sha256').update(bytes).digest('hex') !== entry.sha256) {
      fail(`assets/${relative}: sha256 does not match the preserved extraction`);
    }
  }
  console.log(`  ${expected.size} assets re-hashed against assets-manifest.json`);
}

// ---- 3. the module graph, walked from the pages rather than from the folder.
// Globbing js/ would prove only that files exist. Walking the graph proves the
// page can boot: every specifier resolves, and nothing ships unreferenced.
const ENTRY_PAGES = ['index.html', 'timeline.html'];
const SPECIFIER = /(?:^|[\s;}])(?:import|export)\b[^'"]*?from\s*['"]([^'"]+)['"]|(?:^|[\s;}])import\s*['"]([^'"]+)['"]/g;

const reached = new Set();
const queue = [];
for (const page of ENTRY_PAGES) {
  if (!await exists(page)) continue;
  const html = await fs.readFile(path.join(root, page), 'utf8');
  for (const match of html.matchAll(/<script[^>]+src="([^"]+)"/g)) {
    queue.push({ specifier: match[1], from: page });
  }
  // Stylesheets and the inter-page links are part of "can this page boot".
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

const shippedModules = (await walk(path.join(root, 'js')) ?? []).map((name) => `js/${name}`);
for (const module of shippedModules) {
  if (!reached.has(module)) fail(`${module} ships but no entry point reaches it`);
}
console.log(`  ${reached.size} modules reachable from ${ENTRY_PAGES.join(' + ')}`);

if (failures) {
  console.error(`\n${failures} problem(s) in ${root}`);
  process.exit(1);
}
console.log(`verified ${root}`);
