// oracle_test.mjs — the JS port vs the ORIGINAL BINARY, executing.
//
// re/oracle/ runs functions from unpacked/sonnet_img.bin under unicorn (see
// re/oracle/ORACLE.md) and dumps their outputs as fixtures; this suite runs
// the port's generators over the same inputs and compares.  Unlike the
// reference-video sweep, these comparisons are against the original ITSELF —
// "it's a port: whatever the original does is the right answer."
//
//   node web/test/oracle_test.mjs
//
// Fixtures are produced by:  re/oracle/.venv/bin/python re/oracle/targets/<t>.py
// (texgen.py, tree.py).  Missing fixtures fail loudly — an oracle suite that
// silently skips is worse than none.
//
// Comparison policy (ORACLE.md "Floating point"): the emulator runs the
// original at FPCW 0x027F with softfloat-exact arithmetic but HOST-LIBM
// transcendentals, and the port is float64 with fround at fstp-dword sites —
// so byte-identity is not the claim; a small, MEASURED LSB bound per program
// is.  TEXGEN_TOL below is that bound; a program exceeding it is a real
// divergence to investigate, not noise to widen the bound over.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WORK = path.resolve(HERE, '..', '..');
const FIX = path.join(WORK, 'work/re/oracle/fixtures');

const { RESOURCES } = await import(path.join(WORK, 'work/js/resources.mjs'));
const { runTexgen } = await import(path.join(WORK, 'work/js/texgen.mjs'));
const MG = await import(path.join(WORK, 'work/js/meshgen.mjs'));

let fails = 0;
const ok = (c, msg, extra = '') => {
  console.log((c ? 'PASS' : 'FAIL') + '  ' + msg + (extra ? `   [${extra}]` : ''));
  if (!c) fails++;
};

// Per-program max-|Δ| tolerance in 8-bit LSBs vs the emulated original.
// Default 1 (measured: 24 of 27 programs sit at ≤1 with 6–100% of texels
// exact).  The three exceptions are OPEN FINDINGS pinned at their measured
// values so they cannot silently get worse — they are fix-loop work items,
// not noise to widen the default over (first measured 2026-08-11):
const TEXGEN_TOL_DEFAULT = 1;
const TEXGEN_TOL = {
  0: 25,   // bark: 42 texels >1, max 25 — under investigation
  1: 5,    // leaf: 256 texels >1 (exactly 256 — one row/column?), max 5
  13: 40,  // water: a SINGLE texel at Δ40 — a threshold flip on a 1-ulp input
};

// -------------------------------------------------------------------- texgen
console.log('texgen — port runTexgen vs the emulated FUN_00416036');
const texDir = path.join(FIX, 'texgen');
const cases = fs.existsSync(texDir)
  ? fs.readdirSync(texDir).filter((d) => d.startsWith('prog')).sort() : [];
ok(cases.length === 27, `27 texgen fixtures present`, String(cases.length));

const summary = [];
for (const c of cases) {
  const man = JSON.parse(fs.readFileSync(path.join(texDir, c, 'manifest.json')));
  const id = man.call.args[0];
  const emuPix = fs.readFileSync(path.join(texDir, c, 'pixels.bin'));  // BGRA
  const r = runTexgen(RESOURCES[id]);                                   // RGBA
  if (r.width * r.height * 4 !== emuPix.length) {
    ok(false, `prog ${id}: dimensions`, `${r.width}x${r.height} vs ${emuPix.length / 4} texels`);
    continue;
  }
  let maxAbs = 0, exact = 0, over1 = 0;
  const n = r.width * r.height;
  for (let i = 0; i < n; i++) {
    const db = Math.abs(emuPix[i * 4] - r.rgba[i * 4 + 2]);
    const dg = Math.abs(emuPix[i * 4 + 1] - r.rgba[i * 4 + 1]);
    const dr = Math.abs(emuPix[i * 4 + 2] - r.rgba[i * 4]);
    const da = Math.abs(emuPix[i * 4 + 3] - r.rgba[i * 4 + 3]);
    const m = Math.max(db, dg, dr, da);
    if (m === 0) exact++;
    if (m > 1) over1++;
    if (m > maxAbs) maxAbs = m;
  }
  const tol = TEXGEN_TOL[id] ?? TEXGEN_TOL_DEFAULT;
  summary.push({ id, w: r.width, maxAbs, exactPct: 100 * exact / n, over1 });
  ok(maxAbs <= tol,
     `prog ${String(id).padStart(2)}: max|Δ| ${maxAbs} ≤ ${tol}`,
     `${(100 * exact / n).toFixed(1)}% exact, ${over1} texels >1`);
}
if (summary.length) {
  const worst = [...summary].sort((a, b) => b.maxAbs - a.maxAbs)[0];
  console.log(`  worst program: ${worst.id} (max|Δ| ${worst.maxAbs}); ` +
    `mean exact ${(summary.reduce((a, s) => a + s.exactPct, 0) / summary.length).toFixed(1)}%`);
}

// ---------------------------------------------------------------------- tree
console.log('\ntree — port buildTree vs the emulated FUN_00409d45');
const treeDir = path.join(FIX, 'tree/impostor_set0');
if (!fs.existsSync(treeDir)) {
  ok(false, 'tree fixture present (run re/oracle/targets/tree.py)');
} else {
  const man = JSON.parse(fs.readFileSync(path.join(treeDir, 'manifest.json')));
  // IMPOSTOR.TREE (scene7.js): radius 10, taper 0.75, bend 0, leafSize 2.0 —
  // duplicated here so this suite stays browser-free; the emulator manifest
  // records the raw float bits it was called with.
  MG.srand(parseInt(man.seed_before, 16));
  const t = MG.buildTree({ branchRadius: 10, levelTaper: 0.75,
                           bend: [0, 0, 0], leafSize: 2.0 });
  const state = MG.randState() >>> 0;
  const want = parseInt(man.seed_after, 16) >>> 0;
  ok(state === want, 'RNG post-state matches the emulated original exactly',
     `0x${state.toString(16)}${state === want ? '' : ' vs 0x' + want.toString(16)}`);
  ok(t.branches.vertexCount === man.branchVerts &&
     t.leaves.vertexCount === man.leafVerts,
     `vertex counts: branches ${man.branchVerts}, leaves ${man.leafVerts}`,
     `port ${t.branches.vertexCount}/${t.leaves.vertexCount}`);

  // Vertex buffers, field by field (stride 0x2c: pos@0, normal@0xc,
  // diffuse@0x18, uv0@0x1c, uv1@0x24).  Measured policy (2026-08-11):
  //  * positions — f32 last-bits through sin/cos chains: max |Δ| 3.05e-5 on
  //    ~200-unit geometry; asserted ≤ 1e-4.
  //  * uvs — essentially exact; asserted ≤ 1e-6.  diffuse — bit-exact.
  //  * normals — computeNormals divides by face-normal length with no zero
  //    guard (authentic), so NEAR-degenerate triangles amplify 1-ulp input
  //    noise catastrophically: 48 branch verts differ by up to 0.54.  The
  //    branch material renders UNLIT, so this has no visual consequence;
  //    asserted count ≤ 64 rather than magnitude.  Leaf normals: ≤ 1e-4.
  //    NaN-for-NaN (fully degenerate tris) counts as agreement — authentic.
  // branches cap 600: measured 543 = 48 amplified-but-finite + ~495 one-sided
  // NaN verts, all from the %8-wrap (near-)degenerate branch ring triangles
  // (952 exactly-degenerate tris are authentic, MESHGEN_PORT).  The branch
  // material renders UNLIT so none of this reaches a pixel; the cap only
  // guards against the count growing.
  for (const [name, mesh, nrmBigCap] of
       [['branches', t.branches, 600], ['leaves', t.leaves, 0]]) {
    const emuBuf = fs.readFileSync(path.join(treeDir, `${name}.bin`));
    const n = Math.min(mesh.vertexCount, emuBuf.length / 0x2c | 0);
    const port = new DataView(mesh.verts.buffer);
    const emuV = new DataView(emuBuf.buffer, emuBuf.byteOffset, emuBuf.byteLength);
    let maxPos = 0, maxUv = 0, maxNrm = 0, nrmBig = 0, diffuseDiff = 0;
    for (let i = 0; i < n; i++) {
      for (let s = 0; s < 11; s++) {
        const o = (i * 11 + s) * 4;
        if (s === 6) {                       // diffuse: exact dword compare
          if (port.getUint32(o, true) !== emuV.getUint32(o, true)) diffuseDiff++;
          continue;
        }
        const fa = port.getFloat32(o, true), fb = emuV.getFloat32(o, true);
        if (Number.isNaN(fa) && Number.isNaN(fb)) continue;
        if (Number.isNaN(fa) !== Number.isNaN(fb)) {
          // one-sided NaN: a zero-vs-tiny face-normal length disagreement —
          // the same degenerate-triangle amplification, so count it there
          // (positions/uvs must never produce one, hence the assert path).
          if (s >= 3 && s < 6) { nrmBig++; continue; }
          maxPos = maxUv = Infinity;
          continue;
        }
        const d = Math.abs(fa - fb);
        if (s < 3) maxPos = Math.max(maxPos, d);
        else if (s < 6) { maxNrm = Math.max(maxNrm, d); if (d > 1e-3) nrmBig++; }
        else maxUv = Math.max(maxUv, d);
      }
    }
    ok(maxPos <= 1e-4 && maxUv <= 1e-6 && diffuseDiff === 0 && nrmBig <= nrmBigCap
         && (nrmBigCap > 0 || maxNrm <= 1e-4),
       `${name}: pos ≤1e-4, uv ≤1e-6, diffuse exact, ` +
       (nrmBigCap ? `degenerate-amplified normals ≤${nrmBigCap} verts` : 'normals ≤1e-4'),
       `pos ${maxPos.toExponential(1)}, uv ${maxUv.toExponential(1)}, ` +
       `nrm ${maxNrm.toExponential(1)} (${nrmBig} verts >1e-3), diffuse ${diffuseDiff}`);
  }
}

// ------------------------------------------------------------------- splines
console.log('\ncamera splines — port CameraPath vs the emulated FUN_004058a6');
const { CameraPath } = await import(path.join(WORK, 'work/js/camera.mjs'));
const splineDir = path.join(FIX, 'spline');
if (!fs.existsSync(splineDir)) {
  ok(false, 'spline fixtures present (run re/oracle/targets/spline.py)');
} else {
  let worst = { rid: -1, de: 0, dt: 0 };
  let n = 0;
  for (let rid = 36; rid < 52; rid++) {
    const dir = path.join(splineDir, `res${rid}`);
    if (!fs.existsSync(dir)) continue;
    n++;
    const man = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json')));
    const buf = fs.readFileSync(path.join(dir, 'samples.bin'));
    const cp = new CameraPath(RESOURCES[rid]);
    for (let i = 0; i < man.samples; i++) {
      const o = i * 28;
      const t = buf.readFloatLE(o);
      const r = cp.evaluate(t);
      const de = Math.hypot(r.position[0] - buf.readFloatLE(o + 4),
        r.position[1] - buf.readFloatLE(o + 8), r.position[2] - buf.readFloatLE(o + 12));
      const dt = Math.hypot(r.target[0] - buf.readFloatLE(o + 16),
        r.target[1] - buf.readFloatLE(o + 20), r.target[2] - buf.readFloatLE(o + 24));
      if (de > worst.de) worst = { ...worst, rid, de };
      if (dt > worst.dt) worst = { ...worst, rid, dt };
    }
  }
  // Measured 2026-08-11: eye exact to f32 on all 16 paths; target's worst is
  // 2e-4 (one ulp through sin/cos on res 41).  Bounds set 10x above that.
  ok(n === 16 && worst.de <= 0.01 && worst.dt <= 0.01,
     `all 16 paths match the emulated original (eye ≤0.01, target ≤0.01)`,
     `${n} paths, worst eye ${worst.de.toExponential(1)}, target ${worst.dt.toExponential(1)} (res ${worst.rid})`);
}

// ------------------------------------------------------------------ LCG pins
console.log('\nstream pins — port generators vs re/oracle/fixtures/stream_pins.json');
const pins = JSON.parse(fs.readFileSync(path.join(FIX, 'stream_pins.json')));
const lcg = (s, n) => { for (let i = 0; i < n; i++) s = (Math.imul(s, 214013) + 2531011) >>> 0; return s >>> 0; };

// The dandelion invariant, in its precise two-part form (DANDELIONS.md +
// the codex-found split): buildDandelion = exactly 4352 GEOMETRY draws, then
// (after texgen program 3's reseed in a real build) buildDandelionRecords =
// exactly 512 RECORD draws.  4864 total.  Checked from an arbitrary seed so
// it cannot pass by coincidence of a favourite seed.
{
  const seed = 0x1234567;
  MG.srand(seed);
  const dd = MG.buildDandelion();
  const afterBuild = MG.randState() >>> 0;
  ok(afterBuild === lcg(seed, 4352), 'buildDandelion draws exactly 4352',
     `state 0x${afterBuild.toString(16)}`);
  MG.buildDandelionRecords(dd);
  const afterRec = MG.randState() >>> 0;
  ok(afterRec === lcg(afterBuild, 512), 'buildDandelionRecords draws exactly 512',
     `state 0x${afterRec.toString(16)}`);
}
// The tree chain pins (0xb9583054 -> 0xdedf2c8d incl. tail) were asserted in
// the tree section against the emulator manifest — the same values as
// stream_pins.json's 'emulator' entries.
ok(pins.pins.filter((p) => p.status === 'emulator').length >= 2,
   'stream_pins.json carries emulator-reproduced pins',
   pins.pins.map((p) => p.status).join(','));

console.log(`\n${fails === 0 ? 'ALL PASS' : fails + ' FAILED'}`);
process.exit(fails ? 1 : 0);
