// PURPOSE / INVOCATION
//   node productions/wonder/work/tools/scratch/check-shite-deform-normals.mjs
//
//   Does the shite vertex modifier (callback 0x40e490), driven by the normal field
//   the port actually passes it, reproduce what the executable drew? Exits 1 if not.
//
// MODE:       CHECK
// OBSERVABLE: two independent ones, deliberately -- (a) absolute error between the
//             modelled deformed vertex positions and the executable's OWN submitted
//             vertices, and (b) the number of triangles the facing test then keeps.
//             Either alone is weak; a count can be hit by many wrong frames, and a
//             three-vertex fit can be flattered by a lucky phase.
// UNITS:      object space, pre-modelview. Frame is the shite OBJECT clock,
//             fmod(localShowSeconds * 10, 200) -- NOT capture seconds, NOT the
//             camera clock (sin(t*0.62)*63.5+64).
//
// AUTHORITY AND PINNED INPUTS
//   All fixtures below are the executable's own output at capture 54.958s
//   (= show 54.8747s = order 7, SUNF_QPC_HOLD=2.2627), read out of an apitrace
//   recording. Nothing here is fitted to a score.
//
// PAIRING AND COVERAGE
//   The three sampled vertices are matched to mesh vertices by their Z, which the
//   deform leaves untouched (0x0040e997 copies it) -- that is what makes them
//   identifiable at all. dz was 1e-5 on all three.
//
// VALIDATION
//   The un-negated field is the built-in control: it must FAIL both tests. If it
//   ever passes, this tool has stopped discriminating and its verdict is worthless.
//
// FALSE FINDING PREVENTED
//   Searching for the frame that reproduces the executable's 174 surviving triangles.
//   That search is underdetermined -- dozens of frames in [0,200) give exactly 174 --
//   and the object clock was never wrong anyway. The sign of the normal field was.
//
// LIMITATIONS
//   One mesh (shite1.exp Sphere02), one instant. Proves the normal ORIENTATION fed to
//   the modifier, not the whole modifier: the six constants (0.2, 0.32, 3.2, 1.3, 1.5,
//   1.2) were read from the executable separately and are assumed correct here.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseExp } from '../../../../../shared/sunflower/js/exp.js';
import { buildWonderVertexNormals } from '../../../../../shared/sunflower/js/mesh-geometry.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const scene = parseExp(fs.readFileSync(path.join(REPO, 'productions/wonder/web/assets/shite1.exp')),
  { variant: 'wonder', source: 'shite1.exp' });
const mesh = scene.records.find((r) => r.name === 'Sphere02');
if (!mesh) { console.error('Sphere02 missing from shite1.exp'); process.exit(1); }

// --- fixtures, all from the executable at capture 54.958 -------------------------
const EXE_VERTS = [   // [x, y, z, meshVertexIndex] as submitted by glVertex3fv
  [0.5072, 0.0068, 469.1339, 0],
  [36.1155, -240.6084, 448.2001, 10],
  [100.14, -239.9394, 442.7372, 11],
];
const EXE_SURVIVORS = 174;              // triangles in the 522-vertex draw
const CAM_OBJECT = [2742.765, 350.963, 216.738];  // inverse(modelview) applied to the eye
const FIT_LIMIT = 0.5;                  // apitrace prints 4 decimals; a true fit lands ~0.07

const deform = (vn, frame) => {
  const P = new Float32Array(mesh.positions.length);
  const xP = frame * 0.2, yP = frame * 0.32 + 1.2;
  for (let v = 0; v < mesh.vertexCount; v++) {
    const o = v * 3;
    const sn = Math.sin(vn[o] * 3.2 + xP), cs = Math.cos(vn[o + 1] * 3.2 + yP);
    P[o] = Math.fround(mesh.positions[o] * (sn * sn * sn * sn * 1.3 + 1.5));
    P[o + 1] = Math.fround(mesh.positions[o + 1] * (cs * cs * cs * cs + 1.5));
    P[o + 2] = mesh.positions[o + 2];   // 0x0040e997: Z is copied, never scaled
  }
  return P;
};

const normalsOf = (P) => {
  const sums = new Float32Array(mesh.vertexCount * 3);
  for (let f = 0; f < mesh.faceCount; f++) {
    const ia = mesh.indices[f * 3], ib = mesh.indices[f * 3 + 1], ic = mesh.indices[f * 3 + 2];
    const a = ia * 3, b = ib * 3, c = ic * 3;
    const abx = P[b] - P[a], aby = P[b + 1] - P[a + 1], abz = P[b + 2] - P[a + 2];
    const acx = P[c] - P[a], acy = P[c + 1] - P[a + 1], acz = P[c + 2] - P[a + 2];
    let nx = acy * abz - acz * aby, ny = acz * abx - acx * abz, nz = acx * aby - acy * abx;
    const L = Math.hypot(nx, ny, nz) || 1; nx /= L; ny /= L; nz /= L;
    for (const v of [ia, ib, ic]) { sums[v * 3] += nx; sums[v * 3 + 1] += ny; sums[v * 3 + 2] += nz; }
  }
  const N = new Float32Array(sums.length);
  for (let v = 0; v < mesh.vertexCount; v++) {
    const o = v * 3, L = Math.hypot(sums[o], sums[o + 1], sums[o + 2]);
    if (L) { N[o] = sums[o] / L; N[o + 1] = sums[o + 1] / L; N[o + 2] = sums[o + 2] / L; }
  }
  return N;
};

const bestFit = (vn) => {
  let best = null;
  for (let f = 0; f < 200; f += 0.002) {
    const xP = f * 0.2, yP = f * 0.32 + 1.2;
    let e = 0;
    for (const [ex, ey, , v] of EXE_VERTS) {
      const o = v * 3;
      const sn = Math.sin(vn[o] * 3.2 + xP), cs = Math.cos(vn[o + 1] * 3.2 + yP);
      e += Math.abs(mesh.positions[o] * (sn * sn * sn * sn * 1.3 + 1.5) - ex)
         + Math.abs(mesh.positions[o + 1] * (cs * cs * cs * cs + 1.5) - ey);
    }
    if (!best || e < best.e) best = { f: +f.toFixed(3), e };
  }
  return best;
};

const survivors = (vn, frame) => {
  const P = deform(vn, frame), N = normalsOf(P);
  const flags = new Uint8Array(mesh.vertexCount);
  for (let v = 0; v < mesh.vertexCount; v++) {
    const o = v * 3;
    flags[v] = ((P[o] - CAM_OBJECT[0]) * N[o] + (P[o + 1] - CAM_OBJECT[1]) * N[o + 1]
              + (P[o + 2] - CAM_OBJECT[2]) * N[o + 2]) > 0 ? 1 : 0;
  }
  let n = 0;
  for (let f = 0; f < mesh.faceCount; f++) {
    if (flags[mesh.indices[f * 3]] | flags[mesh.indices[f * 3 + 1]] | flags[mesh.indices[f * 3 + 2]]) n++;
  }
  return n;
};

const asIs = buildWonderVertexNormals(mesh);
const negated = Float32Array.from(asIs, (x) => -x);

console.log(`shite1.exp Sphere02 -- ${mesh.faceCount} faces, ${mesh.vertexCount} vertices`);
console.log(`executable at capture 54.958: ${EXE_SURVIVORS} triangles kept\n`);
console.log('  normal field                fit error   survivors');
const rows = [['buildWonderVertexNormals', asIs], ['NEGATED (engine orientation)', negated]]
  .map(([name, vn]) => {
    const fit = bestFit(vn);
    const keep = survivors(vn, fit.f);
    console.log(`  ${name.padEnd(28)} ${fit.e.toFixed(3).padStart(8)}   ${String(keep).padStart(5)}`
      + `${keep === EXE_SURVIVORS ? '  == executable' : ''}`);
    return { name, fit, keep };
  });

const [plain, neg] = rows;
const ok = neg.fit.e <= FIT_LIMIT && neg.keep === EXE_SURVIVORS
        && plain.fit.e > FIT_LIMIT && plain.keep !== EXE_SURVIVORS;
console.log(ok
  ? '\nPASS  the modifier must be fed the engine orientation, and the control fails as it should'
  : '\nFAIL  the two conventions are no longer discriminated -- do not trust this verdict');
process.exit(ok ? 0 : 1);
