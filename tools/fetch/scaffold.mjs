// scaffold.mjs — start a new restoration from a Demozoo id.
//
//   node tools/fetch/scaffold.mjs <demozoo-id> --slug <slug> [--kind restoration|evidence]
//
// One command instead of a folder copied from a neighbor: creates the standard
// productions/<slug>/ layout, pulls metadata from Demozoo, fetches the original
// archive (checksum-pinned on first download), and stubs the RE notes with the
// provenance links already in place. The capture step is printed, not run —
// choosing the right reference video is a judgment call.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { prodPath, readProd, repoRoot } from './lib/prod.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const id = Number(args.find((a) => /^\d+$/.test(a)));
const slug = args.includes('--slug') ? args[args.indexOf('--slug') + 1] : null;
const kind = args.includes('--kind') ? args[args.indexOf('--kind') + 1] : 'restoration';
if (!id || !slug) { console.error('usage: node tools/fetch/scaffold.mjs <demozoo-id> --slug <slug> [--kind restoration|evidence]'); process.exit(2); }
if (fs.existsSync(prodPath(slug))) { console.error(`${slug}: already exists — refusing to scaffold over it`); process.exit(1); }

const base = path.join(repoRoot, 'productions', slug);
for (const d of ['work/re', 'work/reference', 'work/verify', ...(kind === 'restoration' ? ['web'] : [])]) {
  fs.mkdirSync(path.join(base, d), { recursive: true });
}

// metadata first (writes prod.json), then the archive against it
execFileSync('node', [path.join(HERE, 'demozoo.mjs'), slug, '--id', String(id)], { stdio: 'inherit' });
const prod = readProd(slug);
prod.kind = kind;
if (kind === 'evidence') prod.status = { web: 'none', pagesRepo: null };
const { writeProd } = await import('./lib/prod.mjs');
writeProd(prod);
try {
  execFileSync('node', [path.join(HERE, 'originals.mjs'), slug], { stdio: 'inherit' });
} catch {
  console.error(`${slug}: original archive fetch failed — fill originals[].urls in prod.json and re-run tools/fetch/originals.mjs ${slug}`);
}

fs.writeFileSync(path.join(base, 'work/re/NOTES.md'), `# ${prod.title ?? slug} — reverse-engineering notes

- demozoo: ${prod.links?.demozoo ?? '—'}
- pouet: ${prod.links?.pouet ?? '—'}
- original: ${prod.originals?.[0]?.urls?.[0] ?? '—'}

## Triage

(Read every .nfo/.txt/file_id.diz first — see METHOD.md §1. Identify the
packer, parse the PE, find where the data lives and what it links against.)
`);

console.log(`
scaffolded productions/${slug}/
next:
  1. add a reference capture: edit captures[] in productions/${slug}/prod.json
     (youtube id + path), then: node tools/fetch/capture.mjs ${slug} --record
  2. unpack the original into work/unpacked/ with a repeatable script
  3. hash it: shasum -a 256 ... > work/MANIFEST.sha256
  4. start work/re/NOTES.md — the pipeline is METHOD.md
`);
