// projcheck.mjs — does the recorded stream match the emitter as PORT_SPEC §4e
// describes it, and what does the export's rounding cost?
//
//   node work/re/projcheck.mjs out/draws.json
//
// The recorded vertices are already PROJECTED: `_show_scene` hands Warp3D screen
// coordinates, so replaying the stream tests the raster path and says nothing
// about the animation that produced them. A port of `_calc_matrix` has to be
// checked in OBJECT space, which means inverting what the emitter did:
//
//     rz = 1/z_eye                  (fres on hardware, see §6)
//     out.x = x·scale·rz + cx       out.y = y·scale·rz + cy
//     out.z = 4·rz                  out.w = rz
//
// TWO DIFFERENT z's, AND CONFUSING THEM COSTS AN AFTERNOON. The `z` field in the
// record is the DEPTH VALUE, `4·rz` — not eye-space depth. Eye-space depth is
// `1/w`. Checking the record's `z` against `1/w`, finding a ratio of four, and
// concluding the spec is wrong is reading the wrong field, which is exactly what
// happened here first.
//
// So the invariant to test is `z == 4·w`, and the second question is how much
// the EXPORT degrades it. That used to matter a great deal: rounding every
// coordinate to five decimals is ample for a screen position and ruinous for a
// reciprocal — at an eye depth of 40,000 the true `w` is 2.5e-5, and five places
// move it by 20%. `export.py` now keeps `z` and `w` whole, and this file detects
// which kind of stream it was handed rather than assuming either.
import fs from 'node:fs';

const path = process.argv[2] ?? 'out/draws.json';
const doc = JSON.parse(fs.readFileSync(path, 'utf8'));

let bad = 0;
const say = (ok, what, detail = '') => {
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${what}${detail ? `  ${detail}` : ''}`);
};

// Ten floats a vertex: x y z w u v r g b a.
const STRIDE = 10;
// How much the export rounded is a property of the FILE, not an assumption:
// older streams rounded every field to five decimals, newer ones keep z and w
// at full precision. Detect it rather than hard-coding either, because both the
// tolerance and the depth-error table below depend on it, and quoting the wrong
// one reports a fixed export as still broken.
function detectStep(d) {
  for (const s of d.scenes ?? []) {
    for (const f of s.frames ?? []) {
      for (const dr of f.draws ?? []) {
        for (let i = 3; i < dr.v.length; i += 10) {
          const w = dr.v[i];
          if (w && Math.abs(w * 1e5 - Math.round(w * 1e5)) > 1e-9) return 0;
        }
      }
    }
  }
  return 5e-6;                      // every w sits on a five-decimal grid
}
const STEP = detectStep(doc);
const ROUNDING = STEP ? STEP * 5 : 1e-9;

let verts = 0, draws = 0, degenerate = 0, offBy = 0, worst = 0, worstAt = null;
const screen = { x: [Infinity, -Infinity], y: [Infinity, -Infinity] };
const eye = [Infinity, -Infinity];
const scales = new Set();
// How far the round-tripped eye depth can drift with distance. This is what
// bounds any future check of a reimplemented `_calc_matrix`.
const buckets = [10, 100, 1000, 10000, Infinity].map((hi) => ({ hi, n: 0, worst: 0 }));

for (const scene of doc.scenes ?? []) {
  for (const frame of scene.frames ?? []) {
    for (const d of frame.draws ?? []) {
      draws++;
      scales.add(d.scale);
      const v = d.v;
      for (let i = 0; i + STRIDE <= v.length; i += STRIDE) {
        const [sx, sy, z, w] = [v[i], v[i + 1], v[i + 2], v[i + 3]];
        verts++;
        if (w === 0) { degenerate++; continue; }
        const diff = Math.abs(z - 4 * w);
        if (diff > ROUNDING) offBy++;
        if (diff > worst) { worst = diff; worstAt = { z, w, scale: d.scale }; }

        const zEye = 1 / w;
        if (zEye < eye[0]) eye[0] = zEye;
        if (zEye > eye[1]) eye[1] = zEye;
        for (const [k, val] of [['x', sx], ['y', sy]]) {
          if (val < screen[k][0]) screen[k][0] = val;
          if (val > screen[k][1]) screen[k][1] = val;
        }
        // With w known to +/- STEP, the recovered depth 1/w is known to about
        // STEP/w^2 absolute — STEP * z_eye^2, growing quadratically. STEP is 0
        // for a full-precision export, and then so is this.
        const rel = STEP / (w * w);
        const b = buckets.find((x) => zEye <= x.hi);
        b.n++;
        if (rel > b.worst) b.worst = rel;
      }
    }
  }
}

console.log(`${draws} draws, ${verts} vertices, ${degenerate} with w = 0`);
console.log(STEP
  ? `w is rounded to five decimals in this export (+/- ${STEP})`
  : 'w is at full precision in this export');
console.log(`${scales.size} distinct focal scales`);
console.log(`screen extent  x [${screen.x[0].toFixed(2)}, ${screen.x[1].toFixed(2)}]`
  + `  y [${screen.y[0].toFixed(2)}, ${screen.y[1].toFixed(2)}]`);
console.log(`eye depth 1/w  [${eye[0].toFixed(2)}, ${eye[1].toFixed(2)}]`);
console.log(STEP
  ? "recovered eye depth, and what the export's rounding costs it:"
  : 'recovered eye depth, exact to float32:');
for (const b of buckets) {
  if (!b.n) continue;
  console.log(`   z_eye <= ${b.hi === Infinity ? 'inf' : b.hi}`.padEnd(22)
    + `${String(b.n).padStart(7)} vertices   worst absolute error ${b.worst.toFixed(1)}`);
}

say(offBy === 0, "z is 4w on every vertex, to within the export's rounding",
  `${offBy} outside ${ROUNDING}, worst ${worst.toExponential(2)}`
  + (worstAt ? ` at z=${worstAt.z}, w=${worstAt.w}` : ''));
say(verts > 100000, 'the stream is big enough for that to mean something', `${verts}`);
say(eye[0] > 0, 'every recovered eye depth is positive', `min ${eye[0].toFixed(3)}`);

console.log(bad === 0 ? '\nall checks passed' : `\n${bad} checks FAILED`);
process.exit(bad ? 1 : 0);
