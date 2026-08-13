// prod.mjs — read/validate/write productions/<slug>/prod.json.
//
// The manifest is the committed source of truth for provenance: demozoo/pouet
// identity, where the original archives live (originals[]), and which YouTube
// captures are the verification ground truth (captures[]). The payloads those
// entries describe are deliberately NOT in git — this file is what lets a
// fresh clone rehydrate them.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const SCHEMA = 1;

// Key order for serialization, so diffs stay stable no matter which tool
// last touched the file. Unknown keys are preserved (appended in their
// existing order) — readers must ignore what they do not understand.
const KEY_ORDER = [
  'schema', 'slug', 'title', 'group', 'kind', 'platform', 'releaseDate',
  'party', 'ids', 'links', 'credits', 'originals', 'captures', 'status',
];

export function prodPath(slug) {
  return path.join(repoRoot, 'productions', slug, 'prod.json');
}

export function listSlugs() {
  const dir = path.join(repoRoot, 'productions');
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((s) => fs.existsSync(prodPath(s)))
    .sort();
}

export function readProd(slug) {
  const p = prodPath(slug);
  if (!fs.existsSync(p)) return null;
  const prod = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (prod.schema !== SCHEMA) {
    throw new Error(`${p}: schema ${prod.schema}, this tool speaks ${SCHEMA}`);
  }
  if (prod.slug !== slug) throw new Error(`${p}: slug says ${prod.slug}`);
  return prod;
}

export function newProd(slug) {
  return {
    schema: SCHEMA, slug, title: null, group: null, kind: 'restoration',
    platform: null, releaseDate: null,
    party: { name: null, compo: null, ranking: null },
    ids: { demozoo: null, pouet: null },
    links: {},
    credits: [],
    originals: [],
    captures: [],
    status: { web: 'none', pagesRepo: null },
  };
}

export function writeProd(prod) {
  const ordered = {};
  for (const k of KEY_ORDER) if (k in prod) ordered[k] = prod[k];
  for (const k of Object.keys(prod)) if (!(k in ordered)) ordered[k] = prod[k];
  const p = prodPath(prod.slug);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(ordered, null, 2) + '\n');
  return p;
}

// Fill-nulls-only merge: incoming values land only where the manifest has
// null/undefined/empty, unless force. Hand-curated fields survive refetches.
export function merge(base, incoming, { force = false } = {}) {
  const empty = (v) => v == null || (Array.isArray(v) && v.length === 0)
    || (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0);
  for (const [k, v] of Object.entries(incoming)) {
    if (v == null) continue;
    if (typeof v === 'object' && !Array.isArray(v) && typeof base[k] === 'object' && base[k] != null && !Array.isArray(base[k])) {
      merge(base[k], v, { force });
    } else if (force || empty(base[k])) {
      base[k] = v;
    }
  }
  return base;
}
