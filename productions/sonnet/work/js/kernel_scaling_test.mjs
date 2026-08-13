// kernel_scaling_test.mjs — the experiment specified in re/REMASTER.md §3.
//
// Objective criterion: SCALE-CONSISTENCY ROUND-TRIP.
//   generate at scale S -> box-downsample by S -> compare with the authentic 1x
// A genuinely resolution-independent operator round-trips; one that is not,
// does not.  All errors are reported in 8-bit units (0..255).
//
// TWO BASES are used, because they answer different questions:
//
//   base A  "pinned noise"   — op 3 (8-octave value noise) evaluated natively at
//           each resolution.  Its lattice is pinned (1..128 regardless of canvas
//           size) so the SAMPLE POSITIONS coincide, but the 1x value is a POINT
//           sample where the downsampled Sx value is an AREA average.  That
//           mismatch is an irreducible error FLOOR, not a porting bug; it is
//           reported first so every later number can be read against it.
//
//   base B  "block"          — base A rendered at 1x and block-replicated to Sx.
//           down(B_S) == B_1 exactly, so the floor is 0 and any residual error
//           is attributable to the OPERATOR alone.  This is the isolation test.
//
//   node js/kernel_scaling_test.mjs [--full]
//
import { Img, buildKernel3, resampleKernel, boxBlur, convolve, PIXEL_OPS,
         runTexgen, parseProgram, q8 } from './texgen.mjs';
import { RESOURCES } from './resources.mjs';

const FULL = process.argv.includes('--full');
const SCALES = [2, 3, 4];
const METHODS = ['none', 'nearest', 'bilinear', 'separable', 'continuous'];
const W = 128, H = 128;

// ---------------------------------------------------------------------------
function down(img, S) {                              // box-downsample by S
  const o = new Img(img.iw / S, img.ih / S);
  const inv = 1 / (S * S);
  for (let y = 0; y < o.ih; y++) for (let x = 0; x < o.iw; x++) {
    let a = 0, b = 0, c = 0, d = 0;
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const s = ((y * S + j) * img.iw + (x * S + i)) * 4;
      a += img.p[s]; b += img.p[s + 1]; c += img.p[s + 2]; d += img.p[s + 3];
    }
    const t = (y * o.iw + x) * 4;
    o.p[t] = a * inv; o.p[t + 1] = b * inv; o.p[t + 2] = c * inv; o.p[t + 3] = d * inv;
  }
  return o;
}
function up(img, S) {                                // block-replicate by S
  const o = new Img(img.iw * S, img.ih * S);
  for (let y = 0; y < o.ih; y++) for (let x = 0; x < o.iw; x++) {
    const s = (((y / S) | 0) * img.iw + ((x / S) | 0)) * 4, t = (y * o.iw + x) * 4;
    o.p[t] = img.p[s]; o.p[t + 1] = img.p[s + 1];
    o.p[t + 2] = img.p[s + 2]; o.p[t + 3] = img.p[s + 3];
  }
  return o;
}
function diff(a, b) {
  let sum = 0, max = 0; const n = a.iw * a.ih * 4;
  for (let i = 0; i < n; i++) {
    const e = Math.abs(q8(a.p[i]) - q8(b.p[i]));
    sum += e; if (e > max) max = e;
  }
  return { mean: sum / n, max };
}
function makeNoise(w, h) {
  const img = new Img(w, h);
  const args = new Uint8Array([0x6b, 0x67, 0xcd, 0xcd, 0xff, 0xc0, 0xa0, 0x80]);
  PIXEL_OPS[3](img, null, args, new DataView(args.buffer));
  return img;
}
const f = (x) => x.toFixed(3).padStart(8);
const row = (label, per) => {
  let s = '    ' + label.padEnd(12);
  for (const S of SCALES) { const d = per(S); s += `  S=${S}: mean ${f(d.mean)} max ${String(d.max).padStart(3)}`; }
  console.log(s);
};

// cache of bases
const noiseCache = new Map();
const baseA = (w, h) => { const k = w + 'x' + h; if (!noiseCache.has(k)) noiseCache.set(k, makeNoise(w, h)); return noiseCache.get(k).clone(); };
const base1 = makeNoise(W, H);
const baseB = (S) => up(base1, S);

// ---------------------------------------------------------------------------
console.log('=== 0. ERROR FLOOR ===');
console.log('  base A (pinned noise, natively evaluated at each resolution):');
row('noise', (S) => diff(down(baseA(W * S, H * S), S), base1));
console.log('  base B (block-replicated) is exact by construction: mean 0.000 max 0');
console.log('  -> the base-A floor is the point-sample vs area-average mismatch,');
console.log('     NOT a porting defect.  Read every base-A number against it.');

// ---------------------------------------------------------------------------
console.log('\n=== 1. BOX BLUR  FUN_00413ed9  (radius N texels -> N*S) ===');
console.log('  base B (operator isolated). If this is not ~0 there is a porting bug.');
for (const N of [1, 2, 3, 5, 9, 19]) {
  row(`N=${N} scaled`, (S) => {
    const t = baseB(S); boxBlur(t, N * S, 0); boxBlur(t, N * S, 1);
    const r = base1.clone(); boxBlur(r, N, 0); boxBlur(r, N, 1);
    return diff(down(t, S), r);
  });
}
console.log('  base B, radius LEFT UNSCALED (the "do nothing" control):');
for (const N of [2, 5, 9]) {
  row(`N=${N} fixed`, (S) => {
    const t = baseB(S); boxBlur(t, N, 0); boxBlur(t, N, 1);
    const r = base1.clone(); boxBlur(r, N, 0); boxBlur(r, N, 1);
    return diff(down(t, S), r);
  });
}
console.log('  base A (realistic; compare against the floor above):');
for (const N of [2, 5, 9]) {
  row(`N=${N} scaled`, (S) => {
    const t = baseA(W * S, H * S); boxBlur(t, N * S, 0); boxBlur(t, N * S, 1);
    const r = base1.clone(); boxBlur(r, N, 0); boxBlur(r, N, 1);
    return diff(down(t, S), r);
  });
}

// ---------------------------------------------------------------------------
console.log('\n=== 2. op 28 — 3x3 CONVOLUTION, per kernel mode, per method ===');
console.log('  modes actually used by the 28 programs: 0 (tex 13), 3 (tex 0),');
console.log('  4 (tex 9,18), 5 (tex 17,19,20).  Modes 1,2,6,7 build an all-zero');
console.log('  kernel and therefore emit a flat 0.5 field at every scale.');
const summary = {};
for (const [mode, strength] of [[0, 2], [3, 6], [4, 1], [5, 1]]) {
  const k1 = buildKernel3(mode, strength);
  const ref = base1.clone(); convolve(ref, k1);
  console.log(`  mode ${mode}  strength ${strength}   [base B — operator isolated]`);
  for (const m of METHODS) {
    row(m, (S) => { const t = baseB(S); convolve(t, resampleKernel(k1, S, m)); return diff(down(t, S), ref); });
  }
  console.log(`  mode ${mode}  strength ${strength}   [base A — realistic]`);
  for (const m of METHODS) {
    row(m, (S) => {
      const t = baseA(W * S, H * S); convolve(t, resampleKernel(k1, S, m));
      const d = diff(down(t, S), ref);
      (summary[m] ??= []).push(d.mean);
      return d;
    });
  }
}

// ---------------------------------------------------------------------------
console.log('\n=== 3. REAL PROGRAMS (full VM round-trip) ===');
const K28 = [], KBOX = [];
for (let id = 0; id < 28; id++) {
  const p = parseProgram(RESOURCES[id]);
  if (p.ops.some(o => o.opcode === 28)) K28.push(id);
  else if (p.ops.some(o => o.opcode === 25 || o.opcode === 26)) KBOX.push(id);
}
console.log('  op-28 programs (kernel method matters): ' + K28.join(', '));
console.log('  box-only programs (kernel method is irrelevant): ' + KBOX.join(', '));
const agg = {};
const scalesFor = (id) => FULL ? SCALES : SCALES.filter(S => S <= 2);
for (const id of K28) {
  const ref = toImg(runTexgen(RESOURCES[id], { scale: 1 }));
  for (const m of METHODS) {
    let s = '    ' + `tex ${id} ${m}`.padEnd(20);
    for (const S of scalesFor(id)) {
      const d = diff(down(toImg(runTexgen(RESOURCES[id], { scale: S, kernel: m })), S), ref);
      (agg[m] ??= []).push(d.mean);
      s += `  S=${S}: mean ${f(d.mean)} max ${String(d.max).padStart(3)}`;
    }
    console.log(s);
  }
}
console.log('  box-only programs, single method (scale-consistency of the box path):');
for (const id of KBOX) {
  const ref = toImg(runTexgen(RESOURCES[id], { scale: 1 }));
  if (ref.iw > 256) continue;
  row(`tex ${id}`, (S) =>
    diff(down(toImg(runTexgen(RESOURCES[id], { scale: S, kernel: 'continuous' })), S), ref));
}
function toImg(r) {
  const im = new Img(r.width, r.height);
  for (let i = 0; i < r.width * r.height; i++) {
    im.p[i * 4] = r.rgba[i * 4 + 3] / 255;
    im.p[i * 4 + 1] = r.rgba[i * 4] / 255;
    im.p[i * 4 + 2] = r.rgba[i * 4 + 1] / 255;
    im.p[i * 4 + 3] = r.rgba[i * 4 + 2] / 255;
  }
  return im;
}

// ---------------------------------------------------------------------------
console.log('\n=== SUMMARY (mean of means, lower is better) ===');
console.log('  op-28 sweep, base A (realistic):');
for (const m of METHODS) { const a = summary[m]; console.log(`    ${m.padEnd(12)} ${f(a.reduce((x, y) => x + y, 0) / a.length)}`); }
console.log('  real programs:');
for (const m of METHODS) { const a = agg[m] ?? []; if (a.length) console.log(`    ${m.padEnd(12)} ${f(a.reduce((x, y) => x + y, 0) / a.length)}`); }
