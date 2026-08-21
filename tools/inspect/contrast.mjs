// contrast.mjs — how much STRUCTURE is there to correlate?
//
// MODE:       REPORT
// OBSERVABLE: standard deviation of both frames beside r — the DENOMINATOR of the
//             correlation, which decides whether a low r means anything.
// UNITS:      luma 0-255. An sd of 2.5 on a mean of 254 is a flat white frame; r
//             there is noise, not a defect.
//
//   node tools/inspect/contrast.mjs wonder final
//   node tools/inspect/contrast.mjs wonder final effect_40b040 effect_40c990
//   node tools/inspect/contrast.mjs energia unaligned
//
// Pearson's r is a ratio whose denominator is the product of the two frames'
// standard deviations. compare.mjs already guards the fully degenerate case (both
// variances below 0.25 -> compare levels instead), but that bar is very low: a
// frame can be visually near-uniform, carry an sd of 6 or 8, and still produce an
// r that is mostly noise. Such a sample scores like a broken effect and cannot be
// fixed by changing the port, because there is no picture there to get right.
//
// So before treating a low r as a defect, ask what its denominator was. This
// prints sd for both frames next to r, which separates "we draw the wrong thing"
// from "there is almost nothing to draw".
//
// It also flags the opposite case, which is the more useful one in practice: a
// LOW r where both sds are healthy AND the mean luma matches is a pure structure
// error -- the port is drawing the right amount of light in the wrong places.
//
// Promoted from productions/wonder/work/tools/frame-contrast.mjs, which had
// wonder's paths compiled in.
import fs from 'node:fs';
import { grayOf } from './compare.mjs';
import { fromRepo } from '../harness/index.mjs';

const [prodName, tag = 'final', ...want] = process.argv.slice(2);
if (!prodName) {
  console.error('usage: node tools/inspect/contrast.mjs <production> [tag=final] [part ...]');
  process.exit(2);
}

const dir = fromRepo('productions', prodName, 'work/verify/inspect');
const runPath = `${dir}/run${tag ? `-${tag}` : ''}.json`;
if (!fs.existsSync(runPath)) {
  console.error(`no such run: ${runPath}`);
  console.error(`  available: ${fs.readdirSync(dir).filter((f) => /^run.*\.json$/.test(f)).join(', ')}`);
  process.exit(2);
}
const run = JSON.parse(fs.readFileSync(runPath, 'utf8'));
const parts = want.length ? want : [...new Set(run.samples.map((s) => s.part))];

const sd = (buf) => {
  let m = 0;
  for (const v of buf) m += v;
  m /= buf.length;
  let s = 0;
  for (const v of buf) { const d = v - m; s += d * d; }
  return Math.sqrt(s / buf.length);
};

// A sample worth chasing: both frames have real structure, the levels agree, and
// r is still low. Nothing about the brightness is wrong, so the geometry or its
// placement is.
const pureStructure = (r, so, sr, mo, mr) =>
  r < 0.6 && so > 12 && sr > 12 && Math.abs(mo - mr) / Math.max(mr, 1) < 0.05;

console.log(`${prodName}  run ${tag}`);
console.log('part                local       r   sdOurs   sdRef  meanOurs  meanRef');
const flagged = [];
for (const part of parts) {
  console.log('');
  for (const s of run.samples.filter((x) => x.part === part).sort((a, b) => a.r - b.r)) {
    const ref = `${dir}/frames/ref_${s.captureTime.toFixed(3)}.png`;
    let so = NaN, sr = NaN;
    try { so = sd(grayOf(s.ours)); } catch { /* frame not kept */ }
    try { sr = sd(grayOf(ref)); } catch { /* reference not cached */ }
    const hit = pureStructure(s.r, so, sr, s.meanOurs, s.meanRef);
    if (hit) flagged.push({ part, local: s.local, r: s.r, capture: s.captureTime });
    console.log(part.padEnd(18), String(s.local).padStart(7), s.r.toFixed(3).padStart(7),
      so.toFixed(1).padStart(8), sr.toFixed(1).padStart(7),
      String(s.meanOurs).padStart(9), String(s.meanRef).padStart(8),
      hit ? '  <== pure structure' : '');
  }
}

if (flagged.length) {
  console.log(`\n${flagged.length} sample(s) with matching levels, real contrast and low r.`);
  console.log('These cannot be brightness bugs — the light is right and its placement is not:');
  for (const f of flagged.sort((a, b) => a.r - b.r)) {
    console.log(`   ${f.part.padEnd(18)} local ${String(f.local).padStart(7)}  capture ${f.capture.toFixed(2)}s  r ${f.r.toFixed(3)}`);
  }
}
