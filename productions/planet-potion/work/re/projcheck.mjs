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
// So the invariant to test is `z == 4·w`, and the interesting number is not
// whether it holds — it holds by construction — but how badly the EXPORT
// degrades it. `draws.json` rounds every coordinate to five decimals, and `w` is
// a reciprocal: at an eye depth of 40,000 the true `w` is 2.5e-5, and rounding
// that to five places moves it by 20%. The export is a fine oracle for screen
// positions and a poor one for far-field depth, and a port checked against it
// needs to know where that line falls.
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
// draws.json rounds to five decimals, so z and w each carry up to 5e-6 of error
// and the difference z - 4w up to 2.5e-5. Anything inside that is the export,
// not the emitter.
const ROUNDING = 2.5e-5;

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
        // w is known to +/- 5e-6, so the recovered depth 1/w is known to about
        // 5e-6/w^2 absolute — which is 5e-6 * z_eye^2, and grows quadratically.
        const rel = 5e-6 / (w * w);
        const b = buckets.find((x) => zEye <= x.hi);
        b.n++;
        if (rel > b.worst) b.worst = rel;
      }
    }
  }
}

console.log(`${draws} draws, ${verts} vertices, ${degenerate} with w = 0`);
console.log(`${scales.size} distinct focal scales`);
console.log(`screen extent  x [${screen.x[0].toFixed(2)}, ${screen.x[1].toFixed(2)}]`
  + `  y [${screen.y[0].toFixed(2)}, ${screen.y[1].toFixed(2)}]`);
console.log(`eye depth 1/w  [${eye[0].toFixed(2)}, ${eye[1].toFixed(2)}]`);
console.log("recovered eye depth, and what the export's rounding costs it:");
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
