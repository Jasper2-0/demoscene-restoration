// originals.mjs — materialize the original release archives from prod.json.
//
//   node tools/fetch/originals.mjs <slug>       # verify/fetch one production
//   node tools/fetch/originals.mjs --all        # every production with a prod.json
//   node tools/fetch/originals.mjs --all --record  # pin hashes of files already on disk
//
// originals/ is gitignored (a public repo must not carry the archives), so this
// is how a fresh clone rebuilds it: every entry names its scene.org URL(s) and
// the pinned sha256. --record exists for the first migration, where the
// archives are already on disk and the hashes need writing INTO the manifest
// without any download.
import path from 'node:path';
import fs from 'node:fs';
import { listSlugs, readProd, writeProd, repoRoot } from './lib/prod.mjs';
import { materialize, sha256File } from './lib/download.mjs';

const args = process.argv.slice(2);
const record = args.includes('--record');
const slugs = args.includes('--all') ? listSlugs() : [args.find((a) => !a.startsWith('--'))].filter(Boolean);
if (!slugs.length) { console.error('usage: node tools/fetch/originals.mjs <slug|--all> [--record]'); process.exit(2); }

let failures = 0;
for (const slug of slugs) {
  const prod = readProd(slug);
  if (!prod?.originals?.length) { console.log(`${slug}: no originals[] entries`); continue; }
  let dirty = false;
  for (const entry of prod.originals) {
    const target = path.join(repoRoot, entry.path);
    try {
      if (record && fs.existsSync(target)) {
        const got = sha256File(target);
        if (entry.sha256 && entry.sha256 !== got) throw new Error(`on-disk hash differs from pinned`);
        if (!entry.sha256) { entry.sha256 = got; entry.bytes = fs.statSync(target).size; dirty = true; }
        console.log(`${slug}: recorded ${entry.path}  ${got.slice(0, 12)}…`);
        continue;
      }
      const r = await materialize(entry.urls ?? [], target, { sha256: entry.sha256 });
      if (!entry.sha256) { entry.sha256 = r.sha256; entry.bytes = r.bytes; dirty = true; }
      console.log(`${slug}: ${r.action} ${entry.path}  ${r.sha256.slice(0, 12)}…`);
    } catch (e) {
      failures++;
      console.error(`${slug}: FAIL ${entry.path}: ${e.message ?? e}`);
    }
  }
  if (dirty) writeProd(prod);
}
process.exit(failures ? 1 : 0);
