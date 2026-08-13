// unpack.mjs — repeatable extraction of Lapsus.dat into unpacked/lapsus_dat.
//
//   node productions/lapsus/work/unpack.mjs [--verify]
//
// Lapsus.dat is a plain ZIP (PK\x03\x04 at byte 0) — no custom container.
// This script exists so the extraction is a recorded, hash-verified step
// rather than a one-off: it unzips src/Lapsus.dat (itself rehydrated from the
// originals/ archive pinned in prod.json), writes MANIFEST.sha256 over the
// result, and with --verify checks an existing extraction instead.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const WORK = path.dirname(fileURLToPath(import.meta.url));
const DAT = path.join(WORK, 'src', 'Lapsus.dat');
const OUT = path.join(WORK, 'unpacked', 'lapsus_dat');
const MANIFEST = path.join(WORK, 'MANIFEST.sha256');
const verify = process.argv.includes('--verify');

if (!fs.existsSync(DAT)) {
  console.error('missing src/Lapsus.dat — rehydrate: node tools/fetch/originals.mjs lapsus, then unzip into work/src/');
  process.exit(1);
}

if (!verify) {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  execFileSync('unzip', ['-q', DAT, '-d', OUT]);
}

const walk = (d) => fs.readdirSync(d, { withFileTypes: true })
  .sort((a, b) => a.name.localeCompare(b.name, 'en'))
  .flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const lines = walk(OUT).map((f) => {
  const h = crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
  return `${h}  ${path.relative(WORK, f)}`;
});

if (verify) {
  const want = fs.readFileSync(MANIFEST, 'utf8').trim().split('\n');
  const got = lines;
  if (want.length !== got.length || want.some((l, i) => l !== got[i])) {
    console.error('MANIFEST MISMATCH — extraction differs from the recorded one');
    process.exit(1);
  }
  console.log(`verified ${got.length} files against MANIFEST.sha256`);
} else {
  fs.writeFileSync(MANIFEST, lines.join('\n') + '\n');
  console.log(`extracted ${lines.length} files, wrote MANIFEST.sha256`);
}
