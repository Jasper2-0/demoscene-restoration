// texunits.mjs — how many texture units does the demo actually need?
//
//   node productions/lapsus/work/verify/texunits.mjs
//
// The engine has TWO units, and the reflection shares unit 1 with the DIFF /
// LUMI texture (RENDER.md §14). A third unit would only ever be needed by a
// surface carrying both — so this counts them. The answer is zero, and the
// mesh shader was rewritten onto minigl's two units because of it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLWO } from '../js/lwo.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LWO_DIR = path.join(HERE, '..', 'unpacked', 'lapsus_dat', 'data', 'lwo');

const files = fs.readdirSync(LWO_DIR).filter((f) => /\.lwo$/i.test(f)).sort();
// Classified by what each UNIT carries, so the categories are exclusive and
// the counts sum to the surface total.
const tally = new Map();
const both = [];
let surfaces = 0;

for (const f of files) {
  const lwo = parseLWO(new Uint8Array(fs.readFileSync(path.join(LWO_DIR, f))));
  for (const s of lwo.surfaces) {
    surfaces++;
    const blocks = s.blocks ?? [];
    const colr = blocks.some((b) => b.channel === 'COLR');
    const second = blocks.some((b) => b.channel === 'DIFF' || b.channel === 'LUMI');
    // Mask bit 0x80 is cleared unless reflectivity > 0.95 — a dim reflection
    // is no reflection at all (RENDER.md §4).
    const refl = (s.reflection ?? 0) > 0.95 && !!s.reflectionImage;
    const mask80 = refl && !colr;          // reflection alone -> unit 0
    const refl1 = refl && !mask80;         // reflection beside a colour -> unit 1

    const unit0 = colr ? 'colour' : mask80 ? 'reflection' : '—';
    const unit1 = second ? 'texture' : refl1 ? 'reflection' : '—';
    const key = `${unit0.padEnd(10)} | ${unit1}`;
    tally.set(key, (tally.get(key) ?? 0) + 1);
    if (second && refl1) both.push(`${f}:${s.name}`);
  }
}

console.log(`${files.length} objects, ${surfaces} surfaces\n`);
console.log('  unit 0     | unit 1     | surfaces');
console.log('  -----------+------------+---------');
for (const [k, n] of [...tally].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(23)}| ${String(n).padStart(6)}`);
}
console.log(`\n  NEEDS A THIRD UNIT: ${both.length}`);
if (both.length) {
  console.log('\n' + both.map((b) => `    ${b}`).join('\n'));
  console.log('\n  RENDER.md §14 says this is zero. It is not — re-read §4.');
  process.exit(1);
}
