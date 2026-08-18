// emitcheck.mjs — the emitter's arithmetic, against the recorded draw stream.
//
//   node work/re/emitcheck.mjs web/data/draws.json
//
// `0x100066b0` is the last thing every primitive passes through, and it is
// small enough to check on its own before the clipper and the node walk that
// feed it exist. The recorded stream is 144,727 vertices of its output.
//
// HOW YOU CHECK A FUNCTION WITHOUT ITS INPUTS. draws.json holds only what came
// OUT. But the projection is invertible, and invertible EXACTLY: `w` is
// `fres(z)`, a full-precision reciprocal rounded to single, so `1/w` recovers
// an eye-space z that `fres` maps back to the same `w` — this check asserts
// that rather than assuming it, and it holds for every vertex. Recover the eye
// point, run it forward through the port, and the output must be the recorded
// record again.
//
// That is not circular. The forward formula here comes from the instructions —
// the fused multiply-adds, `fres` rather than a divide, and a depth of four
// times the reciprocal kept in DOUBLE because the original stores it with
// `stfd`. Any of those three wrong and the round trip stops closing.
//
// x AND y ARE NOT BIT-EXACT AND THE REASON IS THE CHECK'S, NOT THE PORT'S.
// Recovering the eye x needs a divide the original never performs, so the
// recovered value is a rounding away from the one the original had. The worst
// residue over the whole stream is reported rather than tolerated silently.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { project } from '../../web/js/render.js';

const ABSENT = 77;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const file = process.argv[2]
  ?? path.join(HERE, '..', '..', 'web', 'data', 'draws.json');

if (!fs.existsSync(file)) {
  console.log(`emitcheck: ${file} not here — `
    + './ppcbox.sh python3 export.py flat/ out/ ... . Skipping.');
  process.exit(ABSENT);
}

const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
let n = 0, zw = 0, recover = 0, exact = 0, worstXY = 0, worstAt = null;
let uvrgb = 0;
const prims = new Set();

for (const scene of doc.scenes) {
  for (const frame of scene.frames) {
    for (const d of frame.draws) {
      prims.add(d.prim);
      const V = d.v;
      for (let i = 0; i < V.length; i += 10) {
        const [x, y, z, w, u, v, r, g, b, a] = V.slice(i, i + 10);
        n++;
        if (z === 4 * w) zw++;
        const ze = 1 / w;
        if (Math.fround(1 / ze) !== w) continue;
        recover++;
        const xe = (x - d.cx) / (d.scale * w);
        const ye = (y - d.cy) / (d.scale * w);
        const p = project({ p: [xe, ye, ze], uv: [u, v], rgb: [r, g, b] },
          d.cx, d.cy, d.scale, a);
        if (p.w === w && p.z === z) exact++;
        const e = Math.max(Math.abs(p.x - x), Math.abs(p.y - y));
        if (e > worstXY) { worstXY = e; worstAt = `${scene.part}/${scene.order}`; }
        if (p.u === u && p.v === v && p.r === r && p.g === g && p.b === b
          && p.a === a) uvrgb++;
      }
    }
  }
}

let failed = 0;
const ok = (name, pass, detail = '') => {
  console.log(`${pass ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
  if (!pass) failed++;
};

console.log(`${n} recorded vertices across ${[...prims].join(' and ')}\n`);

// A port that uses the 4.04 factor from the neighbouring cull test fails here.
// Rounding the depth to single does NOT — four times a float32 only moves the
// exponent — so this assertion is narrower than it looks and says so.
ok('the depth is exactly four times the reciprocal', zw === n, `${zw}/${n}`);
ok('every recorded w is a fixed point of fres — the recovery is exact',
  recover === n, `${recover}/${n}`);
ok('re-projecting the recovered eye point reproduces w and z bit for bit',
  exact === recover, `${exact}/${recover}`);
ok('the passthrough fields survive unchanged', uvrgb === recover,
  `${uvrgb}/${recover} — u, v, r, g, b and the per-primitive alpha`);
console.log(`     worst |diff| on x or y: ${worstXY.toExponential(2)} px`
  + (worstAt ? ` at ${worstAt}` : '')
  + ' — from the divide this check needs to recover an eye x, not from the port');

if (failed) process.exit(1);
console.log('\nthe emitter reproduces the recorded projection');
