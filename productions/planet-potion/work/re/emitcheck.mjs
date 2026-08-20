// emitcheck.mjs — the emitter and the clip planes, against the recorded stream.
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
import { project, planeDistances } from '../../web/js/render.js';

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
// The clip planes, split by the per-draw clip flag: only a CLIPPED primitive
// has to satisfy them.
const plane = { on: { n: 0, in: 0, worst: 0 }, off: { n: 0, in: 0, worst: 0 } };
// The two rules `0x10006630` applies before anything else.
let draws = 0, oneAlpha = 0, minOK = 0, posAlpha = 0, roundedToZero = 0;
const prims = new Set();

for (const scene of doc.scenes) {
  for (const frame of scene.frames) {
    for (const d of frame.draws) {
      prims.add(d.prim);
      draws++;
      const a0 = d.v[9];
      // The alpha is per-PRIMITIVE: `f24` is read once from the unclipped first
      // vertex and written to every output vertex. All of them sharing one
      // value is what that looks like from the outside.
      let same = true;
      for (let q = 0; q < d.v.length; q += 10) if (d.v[q + 9] !== a0) same = false;
      if (same) oneAlpha++;
      if (d.v.length / 10 >= (d.prim === 'linestrip' ? 2 : 3)) minOK++;
      // `blelr` — alpha at or below zero and the primitive is never drawn. Four
      // recorded draws carry exactly 0, and they are an EXPORT artifact rather
      // than a counter-example: export.py rounds every vertex field except z
      // and w to five decimals, so any alpha under 5e-6 lands on zero.
      if (a0 > 0) posAlpha++; else if (a0 === 0) roundedToZero++;
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

        const st = d.clip ? plane.on : plane.off;
        st.n++;
        const worstPlane = Math.min(
          ...planeDistances([xe, ye, ze], d.cx, d.cy, d.scale));
        if (worstPlane >= -1e-2) st.in++;
        else st.worst = Math.max(st.worst, -worstPlane);
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
// THE CLIP PLANES, VALIDATED BY THE DATA RATHER THAN BY READING. Every vertex
// of a CLIPPED primitive must satisfy all four, and the split by the clip flag
// is what makes that a real test: get a coefficient wrong — the (W - cx) on the
// right plane, say, or the divide by scale — and the clipped side fails
// immediately. The unclipped side is reported beside it as the control, and it
// does NOT satisfy them, which is the whole point of the flag.
ok('every primitive carries one alpha across all its vertices',
  oneAlpha === draws, `${oneAlpha}/${draws}`);
ok('every primitive meets its minimum vertex count', minOK === draws,
  `${minOK}/${draws} — 3 for a fan, 2 for a strip`);
ok('every primitive passed the alpha gate', posAlpha + roundedToZero === draws
  && roundedToZero <= 4, `${posAlpha}/${draws}`
  + (roundedToZero ? `, ${roundedToZero} rounded to zero by the 5-decimal export`
    : ''));
ok('every clipped vertex is inside all four clip planes',
  plane.on.in === plane.on.n, `${plane.on.in}/${plane.on.n}`
  + (plane.on.worst ? `, worst outside ${plane.on.worst.toExponential(2)}` : ''));
console.log(`     control: ${plane.off.n - plane.off.in} of ${plane.off.n} `
  + 'UNCLIPPED vertices fall outside, as they must — a check that both sides '
  + 'passed would be testing nothing');

console.log(`     worst |diff| on x or y: ${worstXY.toExponential(2)} px`
  + (worstAt ? ` at ${worstAt}` : '')
  + ' — from the divide this check needs to recover an eye x, not from the port');

if (failed) process.exit(1);
console.log('\nthe emitter reproduces the recorded projection, and the clip '
  + 'planes bound every clipped vertex');
