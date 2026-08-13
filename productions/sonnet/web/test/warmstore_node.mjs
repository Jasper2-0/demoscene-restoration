// warmstore_node.mjs — Node-side warm-store helpers shared by the harnesses.
//
// The store itself is recorded by bake_warmstore.mjs (a real browser boot with
// `?warm=record`); this module answers the two questions every harness has:
// "which store dir will a boot with these query params look for?" and "is that
// store fresh, and if not, rebake it".
//
//   import { ensureWarmStore } from './warmstore_node.mjs';
//   const dir = await ensureWarmStore('quality=original');   // bakes if stale
//
// Freshness is the same rule warmstore.js applies in the browser: every module
// in the modulegraph must hash to what the manifest recorded.  If the config
// resolver here ever drifted from main.js's, the baked dir would not be the one
// the page loads and the page would report a cold boot — which the equivalence
// guard in generate_test.mjs asserts against, so the drift cannot go unseen.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WORK = path.resolve(HERE, '..', '..');

/** Mirror of main.js's config resolution (quality -> texscale default etc.). */
export function resolveWarmDir(query) {
  const p = new URLSearchParams(query);
  const original = p.get('quality') === 'original';
  let texscale = 2;
  if (original) texscale = 1;
  else {
    const q = Number(p.get('texscale'));
    if (q === 1 || q === 2 || q === 4) texscale = q;
  }
  const lighting = p.get('lighting') === 'legacy' ? 'legacy' : 'fixed';
  return `${original ? 'original' : 'remaster'}-ts${texscale}-${lighting}`;
}

/** {relpath: sha256} for every module the boot can execute. */
export function moduleGraphSources() {
  const list = execFileSync(process.execPath, [path.join(HERE, 'modulegraph.mjs')],
    { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  const out = {};
  for (const rel of list) {
    out[rel] = crypto.createHash('sha256')
      .update(fs.readFileSync(path.join(WORK, rel))).digest('hex');
  }
  return out;
}

export function storeIsFresh(dirName, sources = moduleGraphSources()) {
  const mp = path.join(WORK, 'work/baked/warm', dirName, 'manifest.json');
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(mp, 'utf8')); } catch { return false; }
  if (manifest.version !== 1 || !manifest.sources) return false;
  const recorded = manifest.sources;
  const keys = new Set([...Object.keys(recorded), ...Object.keys(sources)]);
  for (const k of keys) if (recorded[k] !== sources[k]) return false;
  return fs.existsSync(path.join(WORK, 'work/baked/warm', dirName, 'blob.bin'));
}

/** Bake (or rebake) the store for `query` if it is missing or stale.
 *  Returns the dir name a boot with those params will look for. */
export async function ensureWarmStore(query) {
  const dirName = resolveWarmDir(query);
  if (storeIsFresh(dirName)) return dirName;
  console.log(`warmstore: (re)baking ${dirName} …`);
  execFileSync(process.execPath,
    [path.join(HERE, 'bake_warmstore.mjs'), `--query=${query}`],
    { stdio: 'inherit' });
  if (!storeIsFresh(dirName)) {
    throw new Error(`warmstore: bake did not produce a fresh ${dirName} — ` +
      `resolveWarmDir() may have drifted from main.js's config resolution`);
  }
  return dirName;
}
