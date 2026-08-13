// texgen.mjs — JS port of the "Sonnet" (threestate, Assembly 2001 64k) procedural
// texture generator VM.
//
// Reverse-engineered from work/re/out/sonnet.c + ndisasm of unpacked/sonnet_u.exe.
// See re/gen/TEXGEN.md (spec) and re/gen/TEXGEN_PORT.md (what this port confirmed /
// corrected, and per-handler confidence).
//
// ---------------------------------------------------------------------------
// ARCHITECTURE (verified)
// ---------------------------------------------------------------------------
// Program header (FUN_00412662):
//     u8  version (always 1)
//     u16 A        -> ctx.A  (ends up as the image HEIGHT for the root layer)
//     u16 B        -> ctx.B  (ends up as the image WIDTH  for the root layer)
//     u8  opCount  ; if 0 -> u16 extended count at +6, ops start at +8
// Instruction:
//     u16 opcode ; u16 flags ; u8 argLen ; u8 args[argLen]
//     argLen == 0xff  -> real length = u16 @ +5 ; if that == 0xffff -> u32 @ +7,
//                        args start at +0x0b.
//     flags & 0x0f  = channel write mask nibble  (bit3=A bit2=R bit1=G bit0=B)
//     flags >> 8    = LAYER (slot) INDEX the op applies to
//     (opcode & 0xff00) == 0xff00  -> CONTROL op, sub = opcode & 0xff
//
// Pixel values are float4 [A, R, G, B]; a packed colour dword is
//     A = v>>>24, R = (v>>>16)&255, G = (v>>>8)&255, B = v&255   (FUN_00412cde)
// and the same layout comes back out at quantisation time (FUN_00414cf7).
//
// Layer model: ctx holds an array of slots; each slot = { img, opacity(u8,
// default 100), colour(u32, default 0xffffff), blend(u8, default 0) }.
// ctx.view is a scratch layer that pixel ops actually run on:
//     bind(view, slot) -> copy slot.img into view.img, inherit filter
//     handler(view.img, 0, ctx, args)
//     maskedCopy(slot.img <- view.img, mask)
// Flatten (FUN_00412305): clear a composite image to (1,1,1,1), blend every slot
// onto it in order using its own blend mode/opacity/colour-mask, copy to output.
//
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Constants read out of the binary (never from the decompile)
// ---------------------------------------------------------------------------
const INV255 = 0.003921568859368563;   // [0x418298]
const F255 = 255.0;                    // [0x418268]
const PI_F = 3.1415927;                // qword [0x419018]
const TWOPI_F = 6.283184;              // qword [0x419028]
const DEG2RAD = 0.017444444820284843;  // [0x419044]  (note: uses pi=3.14)
const K_TEN_255 = 0.03921568766236305; // [0x419030] = 10/255
const K_THIRD = 0.3333333432674408;    // [0x418f78]
const HUE_NONE = 600.0;                // [0x418e88]
const NOISE_K = 5.086418241262436e-06; // [0x419020]  rand()*K -> [0, 1/6]
const EPS_DIV = 0.0010000000474974513; // [0x418e28]
const BIG = 1000000.0;                 // [0x41904c]

// ---------------------------------------------------------------------------
// PRNG — the demo's ONE global stream, shared with the mesh generators.
//
// `FUN_00416036`'s programs call the SAME `rand` as everything else (op33 at
// 0x414e71/0x414e8d -> 0x404258 over the global seed [0x41a9b8]), so texture
// generation both CONSUMES from and RESEEDS the stream every other generator
// draws on.  This module used to own a private copy; see js/rng.mjs for why
// that mattered.
// ---------------------------------------------------------------------------
import { srand, rand, randState } from './rng.mjs';
export { srand, rand, randState };

// ---------------------------------------------------------------------------
// float4 helpers (the VM's "CRect" is really a float[4])
// ---------------------------------------------------------------------------
const t0 = new Float64Array(4), t1 = new Float64Array(4);

function ftol(x) { return Math.trunc(x); }            // FUN_00404224 (truncate)
function ffloor(x) { return Math.floor(x); }          // FUN_004041ab

// ---------------------------------------------------------------------------
// Img — the VM's image class (0x5c bytes in the original)
//   +0 pixels, +4 filter (0 = nearest, 1 = bilinear-cosine), +6 iw, +8 ih
//   index = (y % ih) * iw + (x % iw)
// ---------------------------------------------------------------------------
export class Img {
  constructor(iw, ih) {
    this.iw = iw | 0;
    this.ih = ih | 0;
    this.filter = 1;                            // FUN_004159e4 sets +4 = 1
    this.p = new Float32Array(iw * ih * 4);
    // _vector_constructor_iterator_(.., FUN_004139eb) -> each texel = (1,0,0,0)
    for (let i = 0; i < iw * ih; i++) this.p[i * 4] = 1.0;
  }
  clone() {
    const o = new Img(this.iw, this.ih);
    o.filter = this.filter;
    o.p.set(this.p);
    return o;
  }
  zero() { this.p.fill(0); }
}

// FUN_00415cf8 — wrap a float coordinate into [0, n)
function wrapc(x, n) {
  if (n < 2) return x;
  if (x < 0) { do { x += 65536.0; } while (x < 0); }
  else if (x < n) return x;
  const i = ftol(ffloor(x));
  return (x - i) + (i % n);
}

// FUN_00415a71 — the sampler. Writes 4 floats into `out`.
// filter 0 = nearest (integer wrap), 1 = bilinear with COSINE-smoothed,
// 8-bit-quantised weights.
export function sampleImg(img, out, x, y) {
  const iw = img.iw, ih = img.ih, p = img.p;
  x = wrapc(x, iw);
  y = wrapc(y, ih);
  if (img.filter === 0) {
    let ix = ftol(x), iy = ftol(y);
    while (iy < 0) iy += ih;
    while (ix < 0) ix += iw;
    const b = ((iy % ih) * iw + (ix % iw)) * 4;
    out[0] = p[b]; out[1] = p[b + 1]; out[2] = p[b + 2]; out[3] = p[b + 3];
    return out;
  }
  if (img.filter !== 1) { out[0] = out[1] = out[2] = out[3] = 0; return out; }
  const ix = ftol(x), iy = ftol(y);
  const tx = ftol(x * 256) & 0xff;
  const fx = ftol((1.0 - Math.cos((tx * (1 / 256)) * PI_F)) * 128.0) & 0xff;
  const ty = ftol(y * 256) & 0xff;
  const fy = ftol((1.0 - Math.cos((ty * (1 / 256)) * PI_F)) * 128.0) & 0xff;
  const x1 = (ix + 1) % iw, y1 = (iy + 1) % ih;
  const wx0 = (255 - fx) * INV255, wx1 = fx * INV255;
  const wy0 = (255 - fy) * INV255, wy1 = fy * INV255;
  const a = (iy * iw + ix) * 4, b = (iy * iw + x1) * 4;
  const c = (y1 * iw + x1) * 4, d = (y1 * iw + ix) * 4;
  const w00 = wx0 * wy0, w10 = wx1 * wy0, w11 = wx1 * wy1, w01 = wx0 * wy1;
  for (let k = 0; k < 4; k++) {
    out[k] = p[a + k] * w00 + p[b + k] * w10 + p[c + k] * w11 + p[d + k] * w01;
  }
  return out;
}

// FUN_00412abd — the noise-lattice sampler: same cosine-bilinear but scalar
// (channel 0 only) and without a filter-mode switch.
function sampleLatticeScalar(img, x, y) {
  const iw = img.iw, ih = img.ih, p = img.p;
  x = wrapc(x, iw);
  y = wrapc(y, ih);
  const ix = ftol(x), iy = ftol(y);
  const tx = ftol(x * 256) & 0xff;
  const fx = ftol((1.0 - Math.cos((tx * (1 / 256)) * PI_F)) * 128.0) & 0xff;
  const ty = ftol(y * 256) & 0xff;
  const fy = ftol((1.0 - Math.cos((ty * (1 / 256)) * PI_F)) * 128.0) & 0xff;
  const x1 = (ix + 1) % iw, y1 = (iy + 1) % ih;
  const wx0 = (255 - fx) * INV255, wx1 = fx * INV255;
  const wy0 = (255 - fy) * INV255, wy1 = fy * INV255;
  return p[(iy * iw + x1) * 4] * wx1 * wy0
       + p[(iy * iw + ix) * 4] * wx0 * wy0
       + p[(y1 * iw + x1) * 4] * wy1 * wx1
       + p[(y1 * iw + ix) * 4] * wy1 * wx0;
}

// FUN_00415d61 — copy src image into dst (resampling through the sampler when
// the dimensions differ).
function copyImg(dst, src) {
  if (src.iw === dst.iw && src.ih === dst.ih) { dst.p.set(src.p); return; }
  const o = t0;
  let w = 0;
  for (let y = 0; y < dst.ih; y++) {
    for (let x = 0; x < dst.iw; x++) {
      sampleImg(src, o, (x / dst.iw) * src.iw, (y / dst.ih) * src.ih);
      dst.p[w] = o[0]; dst.p[w + 1] = o[1]; dst.p[w + 2] = o[2]; dst.p[w + 3] = o[3];
      w += 4;
    }
  }
}

// FUN_00415e32 — masked copy src -> dst; mask nibble bit3=comp0 .. bit0=comp3.
function maskedCopy(dst, src, nib) {
  if (src.iw === dst.iw && src.ih === dst.ih) {
    const n = dst.iw * dst.ih;
    const dp = dst.p, sp = src.p;
    const m0 = (nib & 8) !== 0, m1 = (nib & 4) !== 0,
          m2 = (nib & 2) !== 0, m3 = (nib & 1) !== 0;
    for (let i = 0, b = 0; i < n; i++, b += 4) {
      if (m0) dp[b] = sp[b];
      if (m1) dp[b + 1] = sp[b + 1];
      if (m2) dp[b + 2] = sp[b + 2];
      if (m3) dp[b + 3] = sp[b + 3];
    }
  } else {
    copyImg(dst, src);   // the original ignores the mask on the resample path
  }
}

// FUN_00412cde
function decodeColour(v) {
  return [ (v >>> 24) * INV255, ((v >>> 16) & 0xff) * INV255,
           ((v >>> 8) & 0xff) * INV255, (v & 0xff) * INV255 ];
}

function clamp01(a) {
  for (let i = 0; i < 4; i++) { if (a[i] > 1) a[i] = 1; else if (a[i] < 0) a[i] = 0; }
}

// ---------------------------------------------------------------------------
// FUN_00413ed9 — separable BOX BLUR of width N texels along one axis.
//   running sum of N samples starting AT the texel (not centred)
// ---------------------------------------------------------------------------
function boxBlur(img, N, axis) {
  if (N <= 0) return;
  const savedFilter = img.filter;
  const tmp = new Img(img.iw, img.ih);
  tmp.filter = 0;
  img.filter = 0;
  const iw = img.iw, ih = img.ih;
  const invN = 1.0 / N;
  const dx = axis ? 0 : 1, dy = axis ? 1 : 0;
  const outer = axis ? iw : ih;      // lines
  const inner = axis ? ih : iw;      // along the axis
  const s = t0, acc = new Float64Array(4);
  for (let l = 0; l < outer; l++) {
    acc[0] = acc[1] = acc[2] = acc[3] = 0;
    // prime the running sum with the first N samples
    let px = axis ? l : 0, py = axis ? 0 : l;
    for (let i = 0; i < N; i++) {
      sampleImg(img, s, px + i * dx, py + i * dy);
      acc[0] += s[0]; acc[1] += s[1]; acc[2] += s[2]; acc[3] += s[3];
    }
    for (let i = 0; i < inner; i++) {
      const x = axis ? l : i, y = axis ? i : l;
      const b = (y * iw + x) * 4;
      tmp.p[b] = acc[0] * invN; tmp.p[b + 1] = acc[1] * invN;
      tmp.p[b + 2] = acc[2] * invN; tmp.p[b + 3] = acc[3] * invN;
      // slide: subtract the head, add the sample N ahead
      sampleImg(img, s, x, y);
      acc[0] -= s[0]; acc[1] -= s[1]; acc[2] -= s[2]; acc[3] -= s[3];
      sampleImg(img, s, x + N * dx, y + N * dy);
      acc[0] += s[0]; acc[1] += s[1]; acc[2] += s[2]; acc[3] += s[3];
    }
  }
  img.p.set(tmp.p);
  img.filter = savedFilter;
}

// ---------------------------------------------------------------------------
// FUN_004141b9 — rotate+scale resample about the canvas centre.
//   scale is a multiplier on the sampling step (scale > 1 shrinks the image)
// ---------------------------------------------------------------------------
function rotZoom(img, scale, angleDeg) {
  const src = img.clone();
  const rad = angleDeg * DEG2RAD;
  const C = Math.cos(rad) * scale;
  const S = Math.sin(rad) * scale;
  const hw = img.iw >> 1, hh = img.ih >> 1;
  const o = t0;
  let w = 0;
  for (let y = 0; y < img.ih; y++) {
    const ryC = (y - hh) * C, ryS = (y - hh) * S;
    for (let x = 0; x < img.iw; x++) {
      const u = (x - hw) * C + ryS + hw;
      const v = (ryC - (x - hw) * S) + hh;
      sampleImg(src, o, u, v);
      img.p[w] = o[0]; img.p[w + 1] = o[1]; img.p[w + 2] = o[2]; img.p[w + 3] = o[3];
      w += 4;
    }
  }
}

// ---------------------------------------------------------------------------
// FUN_004151a2 — generic kernel convolution (kernel = {data, div, bias, kw, kh})
// ---------------------------------------------------------------------------
function convolve(img, k) {
  const src = img.clone();
  src.filter = 0;                       // FUN_00412d4b(copy, 0) in FUN_0041435f
  const inv = 1.0 / k.div;
  const kw = k.kw, kh = k.kh;
  const xlo = -(((kw - 1) / 2) | 0), xhi = ((kw - 1) / 2) | 0;
  const ylo = -(((kh - 1) / 2) | 0), yhi = ((kh - 1) / 2) | 0;
  const iw = img.iw, ih = img.ih, sp = src.p;
  // Non-zero taps only (these kernels are extremely sparse for 'continuous').
  const taps = [];
  { let ki = 0;
    for (let ky = ylo; ky <= yhi; ky++)
      for (let kx = xlo; kx <= xhi; kx++) { const v = k.data[ki++]; if (v !== 0) taps.push([kx, ky, v]); } }
  // Precomputed wrapped index tables (the sampler runs with filter 0 here, so
  // this is exactly integer modulo addressing).
  const wrapX = [], wrapY = [];
  for (const [kx, ky] of taps) {
    if (wrapX[kx + kw] === undefined) {
      const tx = new Int32Array(iw);
      for (let x = 0; x < iw; x++) { let v = (x + kx) % iw; if (v < 0) v += iw; tx[x] = v; }
      wrapX[kx + kw] = tx;
    }
    if (wrapY[ky + kh] === undefined) {
      const ty = new Int32Array(ih);
      for (let y = 0; y < ih; y++) { let v = (y + ky) % ih; if (v < 0) v += ih; ty[y] = v; }
      wrapY[ky + kh] = ty;
    }
  }
  let w = 0;
  for (let y = 0; y < ih; y++) {
    for (let x = 0; x < iw; x++) {
      let a0 = 0, a1 = 0, a2 = 0, a3 = 0;
      for (let t = 0; t < taps.length; t++) {
        const kx = taps[t][0], ky = taps[t][1], kv = taps[t][2];
        const b = (wrapY[ky + kh][y] * iw + wrapX[kx + kw][x]) * 4;
        a0 += sp[b] * kv; a1 += sp[b + 1] * kv; a2 += sp[b + 2] * kv; a3 += sp[b + 3] * kv;
      }
      a0 = a0 * inv + k.bias; a1 = a1 * inv + k.bias;
      a2 = a2 * inv + k.bias; a3 = a3 * inv + k.bias;
      img.p[w] = a0 < 0 ? 0 : a0 > 1 ? 1 : a0;
      img.p[w + 1] = a1 < 0 ? 0 : a1 > 1 ? 1 : a1;
      img.p[w + 2] = a2 < 0 ? 0 : a2 > 1 ? 1 : a2;
      img.p[w + 3] = a3 < 0 ? 0 : a3 > 1 ? 1 : a3;
      w += 4;
    }
  }
}

// rank of a 3x3 matrix (used to decide whether a separable factorisation is valid)
function rank3(m) {
  const a = [[m[0], m[1], m[2]], [m[3], m[4], m[5]], [m[6], m[7], m[8]]];
  let r = 0;
  for (let c = 0, row = 0; c < 3 && row < 3; c++) {
    let piv = row;
    for (let i = row; i < 3; i++) if (Math.abs(a[i][c]) > Math.abs(a[piv][c])) piv = i;
    if (Math.abs(a[piv][c]) < 1e-9) continue;
    [a[row], a[piv]] = [a[piv], a[row]];
    for (let i = row + 1; i < 3; i++) {
      const f = a[i][c] / a[row][c];
      for (let j = c; j < 3; j++) a[i][j] -= f * a[row][j];
    }
    row++; r++;
  }
  return r;
}

// ---------------------------------------------------------------------------
// FUN_00413a01 / FUN_00413b24 — RGB<->HSV used by op 21.
//   in/out float4 keeps comp0 (alpha) untouched; comps 1..3 = R,G,B or H,S,V
// ---------------------------------------------------------------------------
function rgb2hsv(o, p) {
  const r = p[1], g = p[2], b = p[3];
  let mx = r; if (mx < g) mx = g; if (mx < b) mx = b;
  let mn = r; if (g < mn) mn = g; if (b < mn) mn = b;
  const v = mx;
  const s = (mx === 0) ? 0 : (mx - mn) / mx;
  let h = HUE_NONE;
  if (s !== 0) {
    const d = mx - mn;
    let f = b;                       // decompile: fVar5 starts at param_2[3]
    if (r === mx) f = (g - b) / d;
    else if (g === mx) f = (b - r) / d + 2.0;
    else if (b === mx) f = (r - g) / d + 4.0;
    h = f * 60.0;
    if (h < 0) h += 360.0;
  }
  o[0] = p[0]; o[1] = h; o[2] = s; o[3] = v;
}
function hsv2rgb(o, p) {
  const h = p[1], s = p[2], v = p[3];
  o[0] = p[0];
  if (s === 0) {
    if (h === HUE_NONE) { o[1] = v; o[2] = v; o[3] = v; }
    else {
      // FUN_00413b24 @ 0x413b53: this branch builds the result from FOUR `fldz`,
      // so it zeroes component 0 (ALPHA) as well, unlike every other path which
      // forwards `fld [esi]`.  Reached only when a colour that HAD a hue has its
      // saturation clamped to exactly 0 by op 21's `sat +=` — i.e. only for a
      // negative saturation delta.  Reproduced literally.
      o[0] = 0; o[1] = 0; o[2] = 0; o[3] = 0;
    }
    return;
  }
  let hh = (h === 360.0) ? 0 : h;
  hh = hh * (1 / 60);
  const i = ftol(ffloor(hh));
  const f = hh - i;
  const p1 = (1.0 - s) * v;
  const q = (1.0 - f * s) * v;
  const t = (1.0 - (1.0 - f) * s) * v;
  switch (i) {
    case 0: o[1] = v;  o[2] = t;  o[3] = p1; break;
    case 1: o[1] = q;  o[2] = v;  o[3] = p1; break;
    case 2: o[1] = p1; o[2] = v;  o[3] = t;  break;
    case 3: o[1] = p1; o[2] = q;  o[3] = v;  break;
    case 4: o[1] = t;  o[2] = p1; o[3] = v;  break;
    default: o[1] = v; o[2] = p1; o[3] = q;  break;
  }
}

// ---------------------------------------------------------------------------
// PIXEL OP HANDLERS.  signature: (img, ctx, args:Uint8Array, dv:DataView)
// ---------------------------------------------------------------------------
const PIXEL_OPS = {};

// op 2 — FUN_00412a71: ROTATE + ZOOM.  arg: u16 zoom, u16 angle(deg)
PIXEL_OPS[2] = (img, ctx, a, dv) => {
  let f = dv.getUint16(0, true) * INV255;
  if (f === 0) f = EPS_DIV;
  rotZoom(img, 1.0 / f, dv.getUint16(2, true));
};

// op 3 — FUN_00412c59: 8-octave value NOISE, then multiplied by a colour.
// arg: u16 seed, (2 pad), u32 colour
PIXEL_OPS[3] = (img, ctx, a, dv) => {
  srand(dv.getUint16(0, true));
  img.zero();
  // The octave lattices are ABSOLUTE in the original: 1, 2, 4 … 128, whatever the
  // canvas size. On the authentic 256-wide canvas the finest octave is 128 cells —
  // two texels per cell. Left alone at scale S the lattice stays 128 while the canvas
  // grows, so each cell covers 2S texels and the noise gets BLOCKIER the more we
  // "improve" it. That is the same defect the project owner spotted in op 16's white
  // noise (baked/tex_2x/2.png, "more like a mosaik"), and it is the reason a remaster
  // has to be looked at, not just classified: op 3 passed its unit classification
  // (TEXGEN_PORT §16) and still produced visibly wrong pixels.
  //
  // Starting at S instead of 1 keeps every octave at the ORIGINAL fraction of the
  // canvas (S…128S over an S·256 canvas ≡ 1…128 over 256), which is what "the same
  // generator at a finer sampling" means. Deliberately NOT done by adding octaves:
  // the octaves here carry equal amplitude, so a ninth would brighten the field.
  //
  // ⚠ THE OLD NOTE HERE SAID "this op seeds itself ... so a changed draw count
  // cannot desync anything". THAT IS FALSE, and it cost the forest.
  //
  // Self-seeding makes the op's ENTRY state irrelevant. It does nothing about
  // its EXIT state, which anchors every draw that follows — and for texture 3
  // that includes `FUN_0040b0b0`'s per-instance BILLBOARD YAWS. The exit state
  // is `srand(seed)` advanced by D(S) = S^2 * 21845 draws, so:
  //
  //     S = 1  ->  21845 draws  ->  0xb67fd936
  //     S = 2  ->  87380 draws  ->  0xed8e6b2f
  //     S = 4  -> 349520 draws  ->  0x1a411bfb
  //
  // i.e. **every texture scale rotated every tree in the forest to a different
  // angle.** Jasper found it from the other end: "the pulses of the sun coincide
  // with leaves moving in front of it; our impostor has leaves in other places".
  //
  // Fix: restore the stream to the SCALE-1 exit state on the way out, so the
  // remaster path is stream-identical to the authentic one. At S = 1 this is a
  // no-op and the loop below is literally the original's.
  //
  // GENERAL RULE: an op may change its own draw count freely ONLY if it also
  // restores the exit state. "It reseeds itself" is not sufficient.
  const S = Math.max(1, (ctx && ctx.kscale) | 0);
  const _seed = dv.getUint16(0, true);
  let n = S;
  for (let oct = 0; oct < 8; oct++) {
    const lat = new Img(n, n);
    lat.filter = 0;
    for (let i = 0; i < n * n; i++) {
      const v = rand() * NOISE_K;
      lat.p[i * 4] = v; lat.p[i * 4 + 1] = v; lat.p[i * 4 + 2] = v; lat.p[i * 4 + 3] = v;
    }
    // FUN_00412d55: add the lattice (scalar, channel 0) to every texel
    const sx = lat.iw / img.iw, sy = lat.ih / img.ih;
    let w = 0, ly = 0;
    for (let y = 0; y < img.ih; y++) {
      let lx = 0;
      for (let x = 0; x < img.iw; x++) {
        const v = sampleLatticeScalar(lat, lx, ly);
        img.p[w] += v; img.p[w + 1] += v; img.p[w + 2] += v; img.p[w + 3] += v;
        lx += sx; w += 4;
      }
      ly += sy;
    }
    n *= 2;
  }
  // Leave the shared stream where the ORIGINAL's 8 octaves would have left it:
  // sum over oct of (2^oct)^2 = 21845 draws from the same seed. See the note above.
  if (S !== 1) {
    srand(_seed);
    for (let i = 0; i < 21845; i++) rand();
  }
  const col = decodeColour(dv.getUint32(4, true));
  const n4 = img.iw * img.ih;
  for (let i = 0, b = 0; i < n4; i++, b += 4) {
    img.p[b] *= col[0]; img.p[b + 1] *= col[1];
    img.p[b + 2] *= col[2]; img.p[b + 3] *= col[3];
  }
};

// op 7 — LAB_00412f37: LOAD LAYER.  arg[0] = slot index, 0xff = none
PIXEL_OPS[7] = (img, ctx, a) => {
  if (a[0] === 0xff) return;
  const slot = ctx.slots[a[0]];
  if (slot) copyImg(img, slot.img);
};

// op 9 — FUN_00412f5c: VERTICAL BARS.
// arg: u8 barWidth (texels, half each side), u8 barCount, (2 pad), u32 colour
PIXEL_OPS[9] = (img, ctx, a, dv) => {
  const half = Math.max(1, Math.round((a[0] >> 1) * ctx.kscale));
  const col = decodeColour(dv.getUint32(4, true));
  const count = a[1];
  const iw = img.iw, ih = img.ih;
  const step = iw / count;
  const p = img.p;
  for (let pos = 0; pos < iw; pos += step) {
    for (let y = 0; y < ih; y++) {
      for (let k = -half; k < half; k++) {
        let px = ftol(k + pos);
        while (px < 0) px += iw;
        let idx = iw * (y % ih) + (px % iw);
        if (idx < 0) idx = 0;
        const b = idx * 4;
        p[b] = col[0]; p[b + 1] = col[1]; p[b + 2] = col[2]; p[b + 3] = col[3];
      }
    }
  }
};

// op 10 — FUN_004130b0: INVERT all four channels
PIXEL_OPS[10] = (img) => {
  const n = img.iw * img.ih * 4;
  for (let i = 0; i < n; i++) img.p[i] = 1.0 - img.p[i];
};

// op 12 — FUN_0041310c: 2D GAUSSIAN BLOB.
// arg: u8 spread, u8 sigma, (2 pad), u32 colour
PIXEL_OPS[12] = (img, ctx, a, dv) => {
  const sigma = a[1] * INV255;
  const spread = a[0] * K_TEN_255;
  const col = decodeColour(dv.getUint32(4, true));
  const hw = img.iw * 0.5, hh = img.ih * 0.5;
  const norm = Math.sqrt(sigma * TWOPI_F);
  const denom = sigma * sigma + sigma * sigma;
  const amp = 1.0 / (norm * norm);
  let w = 0;
  for (let xi = -hw; xi < hw; xi += 1.0) {
    const ax = (xi * spread) / hw;
    const ax2 = ax * ax;
    for (let yi = -hh; yi < hh; yi += 1.0) {
      const ay = (yi * spread) / hh;
      const e = Math.exp(-((ay * ay + ax2) / denom));
      const g = amp * e;
      for (let k = 0; k < 4; k++) {
        let v = col[k] * g;
        img.p[w + k] = v < 0 ? 0 : v > 1 ? 1 : v;
      }
      w += 4;
    }
  }
};

// op 14 — FUN_00413330: FILL with a colour
PIXEL_OPS[14] = (img, ctx, a, dv) => {
  const c = decodeColour(dv.getUint32(0, true));
  const n = img.iw * img.ih;
  for (let i = 0, b = 0; i < n; i++, b += 4) {
    img.p[b] = c[0]; img.p[b + 1] = c[1]; img.p[b + 2] = c[2]; img.p[b + 3] = c[3];
  }
};

// op 16 — FUN_0041337e: additive white NOISE (per texel).
// arg: u8 amplitude, u8 seed
//
// This is the ONLY op whose PRNG draw COUNT depends on the canvas size (one draw per
// texel), so it is the only one that violates re/REMASTER.md's "keep random draws on
// the COARSE grid" rule.  Evaluated natively at scale S it produces S-times-finer
// grain, which box-downsamples to a DIFFERENT (lower-variance) field — an irreducible
// round-trip error of ~16 8-bit units at the amplitude the programs actually use.
//   ctx.noisePin (default on for scale > 1) draws the field on the ORIGINAL grid, in
// the original order, and block-replicates it, which makes the op exactly
// resolution-independent.  At scale 1 both paths are identical.
PIXEL_OPS[16] = (img, ctx, a) => {
  const amp = a[0] * INV255;
  srand(a[1]);
  // Same exit-state contract as op 3 (see the long note there): this op seeds
  // itself, so its ENTRY state does not matter — but its draw count is w*h and
  // therefore scale-dependent, and its EXIT state anchors everything drawn
  // after it. Six programs (0, 2, 9, 10, 16, 17) were leaving the shared stream
  // in a different place at every texture scale because of this.
  //
  // The original draws exactly `(iw/S) * (ih/S)` values — the scale-1 count.
  // Restoring that on the way out keeps the NATIVE fine noise Jasper asked for
  // (`baked/tex_2x/2.png` "more like a mosaik" — pinning was the wrong fix)
  // while making the stream identical at every scale. Both, not either.
  const _seed = a[1];
  const _kscale = Math.max(1, (ctx && ctx.kscale) | 0);
  const _restore = () => {
    if (_kscale === 1) return;
    const want = ((img.iw / _kscale) | 0) * ((img.ih / _kscale) | 0);
    srand(_seed);
    for (let i = 0; i < want; i++) rand();
  };
  const k = Math.sqrt(amp);
  const S = (ctx && ctx.noisePin) ? Math.max(1, ctx.kscale | 0) : 1;
  if (S > 1 && img.iw % S === 0 && img.ih % S === 0) {
    const bw = img.iw / S, bh = img.ih / S;
    const buf = new Float64Array(bw * bh);
    for (let i = 0; i < bw * bh; i++) buf[i] = rand() * (1 / 32767) * k;
    for (let y = 0, b = 0; y < img.ih; y++) {
      const row = ((y / S) | 0) * bw;
      for (let x = 0; x < img.iw; x++, b += 4) {
        const v = buf[row + ((x / S) | 0)];
        img.p[b] += v; img.p[b + 1] += v; img.p[b + 2] += v; img.p[b + 3] += v;
      }
    }
    _restore();
    return;
  }
  const n = img.iw * img.ih;
  for (let i = 0, b = 0; i < n; i++, b += 4) {
    const v = rand() * (1 / 32767) * k;
    img.p[b] += v; img.p[b + 1] += v; img.p[b + 2] += v; img.p[b + 3] += v;
  }
  _restore();
};

// op 17 — FUN_004136a2 / FUN_00413479: WIN32 GDI FONT ATLAS.  The handler dumps
// the canvas to an 8-bit buffer, calls CreateFontA("times new roman") +
// TextOutA("a b c d ...") through a memory DC, and reads the DIB back into
// channels 1..3.  There is nothing to port here — the glyph raster has to come
// from the text pipeline (re/text/, owned elsewhere).  Leaves the layer as-is
// and reports itself as unimplemented.
PIXEL_OPS[17] = (img, ctx) => { if (ctx) ctx.unimplemented.add('17 (GDI font atlas)'); };

// op 18 — FUN_0041378d: CHANNEL SWAP / COPY / AVERAGE
// arg[0]: src = a&3, dst = (a&0xf)>>2, mode = a>>4
PIXEL_OPS[18] = (img, ctx, a) => {
  const v = a[0];
  const src = v & 3, dst = (v & 0xf) >> 2, mode = v >> 4;
  const n = img.iw * img.ih;
  const p = img.p;
  for (let i = 0, b = 0; i < n; i++, b += 4) {
    if (mode === 0) {                       // swap
      const t = p[b + dst]; p[b + dst] = p[b + src]; p[b + src] = t;
    } else if (mode === 1) {                // copy dst -> src
      p[b + src] = p[b + dst];
    } else {                                // dst = mean of the other three
      let s = 0;
      for (let c = 0; c < 4; c++) if (c !== dst) s += p[b + c];
      p[b + dst] = s * K_THIRD;
      for (let c = 0; c < 4; c++) {
        if (p[b + c] > 1) p[b + c] = 1; else if (p[b + c] < 0) p[b + c] = 0;
      }
    }
  }
};

// op 19 — FUN_004138f9: BRIGHTNESS + CONTRAST.
// arg: u16 brightness (255 = neutral), u8 contrast (127/128 = neutral)
PIXEL_OPS[19] = (img, ctx, a, dv) => {
  const bright = dv.getUint16(0, true) * INV255 - 1.0;
  const contrast = a[2] * INV255 - 0.5;
  const n = img.iw * img.ih * 4;
  const p = img.p;
  for (let i = 0; i < n; i++) {
    let x = p[i] + bright;
    x = (x >= 0.5) ? x + contrast : x - contrast;
    p[i] = x > 1 ? 1 : x < 0 ? 0 : x;
  }
};

// op 21 — FUN_00413c76: HSV ADJUST.
// arg: u16 hueShift(deg), u8 sat, u8 val   (sat/val: 2*x/255 - 1)
PIXEL_OPS[21] = (img, ctx, a, dv) => {
  const dh = dv.getUint16(0, true);
  const ds = (a[2] * INV255) * 2 - 1.0;
  const dvv = (a[3] * INV255) * 2 - 1.0;
  const n = img.iw * img.ih;
  const p = img.p;
  const hsv = t0, out = t1, px = new Float64Array(4);
  for (let i = 0, b = 0; i < n; i++, b += 4) {
    px[0] = p[b]; px[1] = p[b + 1]; px[2] = p[b + 2]; px[3] = p[b + 3];
    rgb2hsv(hsv, px);
    if (hsv[1] !== HUE_NONE) {
      hsv[1] = (hsv[1] + dh) % 360.0;
      hsv[2] += ds;
      if (hsv[2] < 0) hsv[2] = 0; if (hsv[2] > 1) hsv[2] = 1;
    }
    hsv[3] += dvv;
    if (hsv[3] < 0) hsv[3] = 0; if (hsv[3] > 1) hsv[3] = 1;
    hsv2rgb(out, hsv);
    p[b] = out[0]; p[b + 1] = out[1]; p[b + 2] = out[2]; p[b + 3] = out[3];
  }
};

// op 22 — FUN_00413db6: SCROLL / OFFSET (normalised: arg/255 * size)
PIXEL_OPS[22] = (img, ctx, a) => {
  const dx = a[0] * INV255 * img.iw;
  const dy = a[1] * INV255 * img.ih;
  const src = img.clone();
  const o = t0;
  let w = 0;
  // NOTE: the original uses the WIDTH accessor for both loops (a bug that only
  // shows on non-square canvases). Reproduced.
  for (let y = 0; y < img.iw; y++) {
    for (let x = 0; x < img.iw; x++) {
      sampleImg(src, o, x + dx, y + dy);
      img.p[w] = o[0]; img.p[w + 1] = o[1]; img.p[w + 2] = o[2]; img.p[w + 3] = o[3];
      w += 4;
    }
  }
};

// op 25 — LAB_00414195: BOX BLUR both axes, width arg[0] texels
PIXEL_OPS[25] = (img, ctx, a) => {
  const N = Math.max(1, Math.round(a[0] * ctx.kscale));
  boxBlur(img, N, 0);
  boxBlur(img, N, 1);
};

// op 26 — FUN_004142eb: DIRECTIONAL BLUR (rotate, blur X, rotate back)
PIXEL_OPS[26] = (img, ctx, a) => {
  const ang = a[1] * INV255 * 360.0;
  rotZoom(img, 2.0, ang);
  boxBlur(img, Math.max(1, Math.round(a[0] * ctx.kscale)), 0);
  rotZoom(img, 0.5, a[1] * INV255 * -360.0);
};

// op 28 — FUN_0041435f: 3x3 CONVOLUTION, mode = arg&7, strength = (arg>>3)*0.5
PIXEL_OPS[28] = (img, ctx, a) => {
  const v = a[0];
  const mode = v & 7;
  const strength = (v >> 3) * 0.5;
  const k = buildKernel3(mode, strength);
  const kk = ctx.kscale > 1 ? resampleKernel(k, ctx.kscale, ctx.kmethod) : k;
  convolve(img, kk);
};

// op 30 — FUN_0041446a: ROTATE 90 (square canvases only)
PIXEL_OPS[30] = (img) => {
  if (img.iw !== img.ih) return;
  const src = img.clone();
  const o = t0;
  let w = 0;
  for (let y = 0; y < img.ih; y++) {
    let c = img.ih;
    for (let x = 0; x < img.iw; x++) {
      sampleImg(src, o, y, c);
      img.p[w] = o[0]; img.p[w + 1] = o[1]; img.p[w + 2] = o[2]; img.p[w + 3] = o[3];
      w += 4; c--;
    }
  }
};

// --- op 31 support: cubic-Hermite spline stroke -----------------------------
// FUN_004148ba — Hermite basis; p = [v0, v1, m0, m1]
function hermite(p, num, den) {
  const t = num / den;
  const t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * p[0]
       + (-2 * t3 + 3 * t2) * p[1]
       + (t3 - 2 * t2 + t) * p[2]
       + (t3 - t2) * p[3];
}

// FUN_0041499e — evaluate the spline at integer parameter k
function splineAt(k, tension, pts) {
  let p1 = pts[0];
  for (const q of pts) if (q.t <= k && p1.t < q.t) p1 = q;
  let p0 = pts[0];
  for (const q of pts) if (q.t < p1.t && p0.t <= q.t) p0 = q;
  let p2 = pts[0];
  for (const q of pts) if (p2.t < q.t) p2 = q;
  for (const q of pts) if (p1.t < q.t && q.t < p2.t) p2 = q;
  let p3 = pts[0];
  for (const q of pts) if (p3.t < q.t) p3 = q;
  for (const q of pts) if (p2.t < q.t && q.t < p3.t) p3 = q;
  const den = p2.t - p1.t;
  if (den === 0) return { x: p1.x, y: p1.y };
  const num = k - p1.t;
  return {
    x: hermite([p1.x, p2.x, (p2.x - p0.x) * tension, (p3.x - p1.x) * tension], num, den),
    y: hermite([p1.y, p2.y, (p2.y - p0.y) * tension, (p3.y - p1.y) * tension], num, den),
  };
}

// FUN_004147ab — plot a (2r-1)^2 square blob, r = thickness
//
// The original's clip is a hard `x < 0 || x >= w || y < 0 || y >= h` return (verified
// by disassembly at 0x4147ca..0x4147f0), and the coordinate reaching it has been
// truncated TOWARD ZERO.  That gives the negative side a one-texel "grace band": a
// spline sample at x = -0.6 truncates to 0 and is drawn, at x = -1.2 it is dropped.
// The band is one ORIGINAL texel wide, so at scale S the same normalised overshoot
// crosses it and the stroke develops holes (see TEXGEN_PORT.md §13).  `gs` = S is the
// scale-consistent grace band; at S = 1 the extra test is vacuous for integers, so the
// authentic path is unchanged.
function plotThick(img, col, x, y, thick, gs = 1) {
  const iw = img.iw, ih = img.ih, p = img.p;
  if (x < 0) { if (x <= -gs) return; x = 0; }
  if (y < 0) { if (y <= -gs) return; y = 0; }
  if (x >= iw || y >= ih) return;
  let b = (y * iw + x) * 4;
  p[b] = col[0]; p[b + 1] = col[1]; p[b + 2] = col[2]; p[b + 3] = col[3];
  const r = thick - 1;
  for (let dy = -r; dy <= r; dy++) {
    let px = x - r;
    for (let n = 2 * r + 1; n > 0; n--) {
      let qx = px, qy = dy + y;
      while (qx < 0) qx += iw;
      while (qy < 0) qy += ih;
      b = ((qy % ih) * iw + (qx % iw)) * 4;
      p[b] = col[0]; p[b + 1] = col[1]; p[b + 2] = col[2]; p[b + 3] = col[3];
      px++;
    }
  }
}

// FUN_004146bd — Bresenham
function drawLine(img, col, x0, y0, x1, y1, thick, gs = 1) {
  let dx = x1 - x0, dy = y1 - y0, sx = 1, sy = 1;
  if (dx < 0) { dx = -dx; sx = -1; }
  if (dy < 0) { dy = -dy; sy = -1; }
  if (dy < dx) {
    let e = dy * 2 - dx, e2 = e - dx;
    plotThick(img, col, x0, y0, thick, gs);
    for (; dx !== 0; dx--) {
      let inc = dy * 2;
      if (e >= 0) { y0 += sy; inc = e2; }
      e += inc; x0 += sx;
      plotThick(img, col, x0, y0, thick, gs);
    }
  } else {
    let e = dx * 2 - dy, e2 = e - dy;
    plotThick(img, col, x0, y0, thick, gs);
    for (; dy !== 0; dy--) {
      let inc = dx * 2;
      if (e >= 0) { x0 += sx; inc = e2; }
      e += inc; y0 += sy;
      plotThick(img, col, x0, y0, thick, gs);
    }
  }
}

// op 31 — FUN_00414535: SPLINE STROKE ("cracks").
// arg: u8 nPoints, u8 tension, (2 pad), u32 colour, u8 thickness @8,
//      then nPoints pairs of u8 (x,y) from offset 0x0c, normalised /255.
PIXEL_OPS[31] = (img, ctx, a, dv) => {
  const n = a[0];
  if (n < 2) return;
  const col = decodeColour(dv.getUint32(4, true));
  const tension = a[1] * INV255;
  const pts = [];
  for (let i = 0; i < n; i++) {
    pts.push({
      t: i * 10,
      x: img.iw * (a[0x0c + 2 * i] * INV255),
      y: img.ih * (a[0x0c + 2 * i + 1] * INV255),
    });
  }
  // Original: thickness = arg[8] / (256 / iw), an INTEGER division that divides
  // by zero once iw > 256 (i.e. the original would fault at any remaster scale
  // above 1x on a 256-wide canvas).  The algebraically identical multiplicative
  // form agrees exactly at every size op 31 is actually used on (128 and 256)
  // and keeps the stroke width proportional at higher resolutions.
  const thick = Math.max(1, Math.trunc(a[8] * img.iw / 256));
  const gs = ctx ? Math.max(1, ctx.kscale | 0) : 1;   // clip grace band, in texels
  const last = n * 10;
  for (let k = 0; k < last; k++) {
    const p0 = splineAt(k, tension, pts);
    const p1 = splineAt(k + 1, tension, pts);
    drawLine(img, col, ftol(p0.x), ftol(p0.y), ftol(p1.x), ftol(p1.y), thick, gs);
  }
};

// op 32 — FUN_00414b1e: FLOOD FILL from a normalised seed.
// arg: u8 seedX/255, u8 seedY/255, (2 pad), u32 colour
PIXEL_OPS[32] = (img, ctx, a, dv) => {
  const iw = img.iw, ih = img.ih, n = iw * ih, p = img.p;
  const visit = new Uint8Array(n).fill(4);
  const st = new Uint16Array(n * 8);
  let sx = ftol(iw * (a[0] * INV255));
  let sy = ftol(ih * (a[1] * INV255));
  const tb = ((sy % ih) * iw + (sx % iw)) * 4;
  const target = pack4(p, tb);
  const col = decodeColour(dv.getUint32(4, true));
  let ptr = 0, depth = 0;
  // The original keeps the walker's coordinates in WORDS and indexes with
  // `(u16 y) % ih * iw + (u16 x) % iw` (FUN_00414b1e: `dec word [ebp+0x14]`,
  // `movzx eax, word [ebp+0x16]; cdq; idiv`).  Stepping left from x = 0 yields
  // 0xffff, and `0xffff % iw == iw - 1` ONLY when iw divides 65536.  Every
  // authentic canvas is a power of two so that always held; at a non-power-of-two
  // remaster size (e.g. 768 at S = 3) the walker teleports to column 255.
  // Reducing into [0, iw) at each step gives the SAME residue for every
  // power-of-two canvas (so scale = 1 is bit-identical) and is correct otherwise.
  let x = ((sx % iw) + iw) % iw, y = ((sy % ih) + ih) % ih;
  let guard = 0;
  for (;;) {
    if (++guard > 40 * n + 1000) break;   // safety; the original relies on the
                                          // visit counter to terminate
    const idx = y * iw + x;
    const b = idx * 4;
    if (pack4(p, b) === target || visit[idx] !== 4) {
      p[b] = col[0]; p[b + 1] = col[1]; p[b + 2] = col[2]; p[b + 3] = col[3];
      const cv = visit[idx];
      if (cv === 0) {
        depth--; ptr -= 2;
        if (depth === 0) break;
        x = st[ptr]; y = st[ptr + 1];
      } else {
        depth++;
        visit[idx] = cv - 1;
        st[ptr + 2] = x; st[ptr + 3] = y;
        ptr += 2;
        if (cv === 1) x = x === 0 ? iw - 1 : x - 1;
        else if (cv === 2) x = x === iw - 1 ? 0 : x + 1;
        else if (cv === 3) y = y === 0 ? ih - 1 : y - 1;
        else if (cv === 4) y = y === ih - 1 ? 0 : y + 1;
      }
    } else {
      visit[idx] = 0;
      depth--; ptr -= 2;
      if (depth === 0) break;
      x = st[ptr]; y = st[ptr + 1];
    }
    if (depth === -1) break;
  }
};
function pack4(p, b) {
  return ((q8(p[b]) << 24) | (q8(p[b + 1]) << 16) | (q8(p[b + 2]) << 8) | q8(p[b + 3])) >>> 0;
}

// op 33 — FUN_00414dcf: SPOTS.  `count` random distance-shaded discs,
// min-composited into an 8-bit buffer, then lerped between two colours.
// arg: u8 radius/255*w, u8 count, (2 pad), u32 colA, u32 colB, u8 seed @0x0c
PIXEL_OPS[33] = (img, ctx, a, dv) => {
  const iw = img.iw, ih = img.ih, n = iw * ih;
  const r = ftol((a[0] * INV255) * iw);
  let count = a[1];
  srand(a[0x0c]);
  const buf = new Uint8Array(n).fill(0xff);
  if (r > 0) {
    for (; count > 0; count--) {
      const cx = ftol(rand() * (1 / 32767) * iw);
      const cy = ftol(rand() * (1 / 32767) * ih);
      for (let dy = -r; dy < r; dy++) {
        for (let dxi = -r; dxi < r; dxi++) {
          const d = Math.sqrt(dxi * dxi + dy * dy);
          if (d > r) continue;
          let px = dxi + cx; while (px < 0) px += iw;
          let py = dy + cy; while (py < 0) py += ih;
          const idx = (py % ih) * iw + (px % iw);
          const v = ftol((255.0 / r) * d) & 0xff;
          if (v < buf[idx]) buf[idx] = v;
        }
      }
    }
  }
  const c0 = decodeColour(dv.getUint32(4, true));
  const c1 = decodeColour(dv.getUint32(8, true));
  for (let i = 0, b = 0; i < n; i++, b += 4) {
    const f = buf[i] * INV255;
    for (let k = 0; k < 4; k++) img.p[b + k] = c1[k] * f + c0[k] * (1 - f);
  }
};

// op 34 — FUN_00415012: horizontal LINEAR GRADIENT between two colours,
// ramping from column arg[0] to column arg[2].
// arg: u8 x0, (unused), u8 x1, (unused), u32 colA @8, u32 colB @0x0c
// arg[0]/arg[2] are TEXEL COLUMNS (verified by disassembly, TEXGEN_PORT §11), so
// they are texel-denominated and scale by S.  arg[1]/arg[3] are unread.
PIXEL_OPS[34] = (img, ctx, a, dv) => {
  const iw = img.iw, ih = img.ih;
  const S = ctx ? ctx.kscale : 1;
  const c0 = decodeColour(dv.getUint32(8, true));
  const c1 = decodeColour(dv.getUint32(12, true));
  const x0 = a[0] * S, x1 = a[2] * S;
  const k = 1.0 / (x1 - x0);
  const d = [ (c1[0] - c0[0]) * k, (c1[1] - c0[1]) * k,
              (c1[2] - c0[2]) * k, (c1[3] - c0[3]) * k ];
  for (let x = 0; x < iw; x++) {
    let t;
    if (x < x0) t = 0;
    else { t = x1; if (x <= t) t = x - x0; }
    for (let y = 0; y < ih; y++) {
      const b = (y * iw + x) * 4;
      for (let c = 0; c < 4; c++) img.p[b + c] = c0[c] + d[c] * t;
    }
  }
};

// ---------------------------------------------------------------------------
// op 28's kernel table + the remaster's kernel-scaling candidates
// ---------------------------------------------------------------------------
export function buildKernel3(mode, strength) {
  const d = new Float64Array(9);
  if (mode === 3 || mode === 4) {
    let l = (mode === 3) ? 1 : -1;
    let r = (mode === 3) ? 1 : -1;
    l = -l;
    d[0] = d[3] = d[6] = l * strength;
    d[2] = d[5] = d[8] = r * strength;
  }
  if (mode === 0) { d[0] = strength; d[8] = -strength; }
  if (mode === 5) { d[2] = strength; d[8] = -strength; }
  return { data: d, div: 1.0, bias: 0.5, kw: 3, kh: 3 };
}

// Candidate resamplings of the 3x3 operator onto an S-times finer grid.
// All produce an odd (2S+1)^2 kernel so the centre still lands on a texel.
//
//   'none'       keep the literal 3x3  (authentic arithmetic, wrong extent)
//   'continuous' DILATE: keep the three tap WEIGHTS, move them to +/-S texels.
//                This treats the taps as impulses, which is what the original
//                operator literally is, so it is the exact same continuous
//                operator evaluated at finer sampling.
//   'nearest'    treat the taps as samples of a kernel DENSITY and reconstruct
//                with nearest-neighbour: each tap becomes an SxS block / S^2
//   'bilinear'   same density view, tent (bilinear) reconstruction / S^2
//   'separable'  same, but the 2-D kernel is factorised into a row profile and
//                a column profile and each is tent-resampled independently
//                (exact for the rank-1 kernels op 28 actually builds)
export function resampleKernel(k, S, method = 'bilinear') {
  if (method === 'none' || S === 1) return k;
  const n = 2 * S + 1;
  const d = new Float64Array(n * n);
  const src = k.data;
  const get = (x, y) => (x < -1 || x > 1 || y < -1 || y > 1) ? 0 : src[(y + 1) * 3 + (x + 1)];

  if (method === 'continuous') {
    for (let y = -1; y <= 1; y++) {
      for (let x = -1; x <= 1; x++) {
        d[(y * S + S) * n + (x * S + S)] = get(x, y);
      }
    }
    return { data: d, div: k.div, bias: k.bias, kw: n, kh: n };
  }

  if (method === 'nearest') {
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const sx = Math.max(-1, Math.min(1, Math.round((x - S) / S)));
        const sy = Math.max(-1, Math.min(1, Math.round((y - S) / S)));
        d[y * n + x] = get(sx, sy) / (S * S);
      }
    }
    return { data: d, div: k.div, bias: k.bias, kw: n, kh: n };
  }

  if (method === 'separable' && rank3(src) <= 1) {
    // factorise: find the row with the largest norm, use it as the column
    // profile and the matching column as the row profile (exact for rank 1)
    let bestR = 0, bestN = -1;
    for (let y = 0; y < 3; y++) {
      let s = 0; for (let x = 0; x < 3; x++) s += Math.abs(src[y * 3 + x]);
      if (s > bestN) { bestN = s; bestR = y; }
    }
    let bestC = 0; bestN = -1;
    for (let x = 0; x < 3; x++) {
      let s = 0; for (let y = 0; y < 3; y++) s += Math.abs(src[y * 3 + x]);
      if (s > bestN) { bestN = s; bestC = x; }
    }
    const piv = src[bestR * 3 + bestC];
    if (Math.abs(piv) > 1e-12) {
      const rowP = [src[bestR * 3 + 0], src[bestR * 3 + 1], src[bestR * 3 + 2]];
      const colP = [src[0 * 3 + bestC] / piv, src[1 * 3 + bestC] / piv, src[2 * 3 + bestC] / piv];
      const tent1 = (prof, t) => {                 // t in [-1,1]
        const i0 = Math.floor(t), f = t - i0;
        const g = (i) => (i < -1 || i > 1) ? 0 : prof[i + 1];
        return g(i0) * (1 - f) + g(i0 + 1) * f;
      };
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          d[y * n + x] = tent1(rowP, (x - S) / S) * tent1(colP, (y - S) / S) / (S * S);
        }
      }
      return { data: d, div: k.div, bias: k.bias, kw: n, kh: n };
    }
    // fall through to bilinear for a degenerate (all-zero) kernel
  }

  for (let y = 0; y < n; y++) {                    // 'bilinear'
    for (let x = 0; x < n; x++) {
      const u = (x - S) / S, v = (y - S) / S;
      const x0 = Math.floor(u), y0 = Math.floor(v);
      const fx = u - x0, fy = v - y0;
      d[y * n + x] = (get(x0, y0) * (1 - fx) * (1 - fy)
                    + get(x0 + 1, y0) * fx * (1 - fy)
                    + get(x0, y0 + 1) * (1 - fx) * fy
                    + get(x0 + 1, y0 + 1) * fx * fy) / (S * S);
    }
  }
  return { data: d, div: k.div, bias: k.bias, kw: n, kh: n };
}

// ---------------------------------------------------------------------------
// THE VM
// ---------------------------------------------------------------------------
function parseProgram(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const version = bytes[0];
  const A = dv.getUint16(1, true);
  const B = dv.getUint16(3, true);
  let count = bytes[5];
  let o = 6;
  if (count === 0) {
    count = dv.getUint16(6, true);
    o = 8;
    if (count === 0) return { version, A, B, ops: [] };
  }
  const ops = [];
  for (let i = 0; i < count; i++) {
    const opcode = dv.getUint16(o, true);
    const flags = dv.getUint16(o + 2, true);
    let argLen = bytes[o + 4];
    let argStart = o + 5;
    if (argLen === 0xff) {
      argLen = dv.getUint16(o + 5, true);
      if (argLen === 0xffff) argLen = dv.getUint32(o + 7, true);
      argStart = o + 11;
    }
    ops.push({
      opcode,
      mask: flags & 0x0f,
      slot: flags >> 8,
      args: bytes.subarray(argStart, argStart + argLen),
    });
    o = argStart + argLen;
  }
  return { version, A, B, ops };
}
export { parseProgram };

function newSlot(iw, ih) {
  return { img: new Img(iw, ih), opacity: 100, colour: 0xffffff, blend: 0 };
}

// FUN_00412413 — remove slot[sp]; if sp was the last index, sp--
function delSlot(ctx) {
  ctx.slots.splice(ctx.sp, 1);
  if (ctx.sp === ctx.slots.length) ctx.sp--;
}

// FUN_004154e5 — blend one layer onto the composite.
function blendLayer(dst, slot) {
  const alpha = slot.opacity * 0.01;
  const m = slot.colour >>> 0;
  const m0 = (m & 0xff000000) !== 0, m1 = (m & 0x00ff0000) !== 0,
        m2 = (m & 0x0000ff00) !== 0, m3 = (m & 0x000000ff) !== 0;
  const mode = slot.blend;
  const n = Math.min(dst.iw * dst.ih, slot.img.iw * slot.img.ih);
  const dp = dst.p, sp = slot.img.p;
  for (let i = 0, b = 0; i < n; i++, b += 4) {
    let f = alpha;
    switch (mode) {
      case 0:  // over
        if (m0) { f = alpha * sp[b]; dp[b] = (1 - alpha) * dp[b] + f; }
        if (m1) dp[b + 1] = f * sp[b + 1] + (1 - f) * dp[b + 1];
        if (m2) dp[b + 2] = f * sp[b + 2] + (1 - f) * dp[b + 2];
        if (m3) dp[b + 3] = f * sp[b + 3] + (1 - f) * dp[b + 3];
        break;
      case 1:  // add
        if (m0) { f = alpha * sp[b]; dp[b] += f; }
        if (m1) dp[b + 1] += f * sp[b + 1];
        if (m2) dp[b + 2] += f * sp[b + 2];
        if (m3) dp[b + 3] += f * sp[b + 3];
        break;
      case 2:  // subtract
        if (m0) { f = alpha * sp[b]; dp[b] -= f; }
        if (m1) dp[b + 1] -= f * sp[b + 1];
        if (m2) dp[b + 2] -= f * sp[b + 2];
        if (m3) dp[b + 3] -= f * sp[b + 3];
        break;
      case 3:  // multiply
        if (m0) { f = alpha * sp[b]; dp[b] = dp[b] * sp[b] * alpha; }
        if (m1) dp[b + 1] = dp[b + 1] * f * sp[b + 1];
        if (m2) dp[b + 2] = dp[b + 2] * f * sp[b + 2];
        if (m3) dp[b + 3] = dp[b + 3] * f * sp[b + 3];
        break;
      case 4:  // divide
        if (m0) { f = alpha * sp[b]; dp[b] = (dp[b] / sp[b]) * alpha; }
        if (m1) dp[b + 1] = (f * sp[b + 1] > 0) ? dp[b + 1] / (f * sp[b + 1]) : dp[b + 1] * BIG;
        if (m2) dp[b + 2] = (f * sp[b + 2] > 0) ? dp[b + 2] / (f * sp[b + 2]) : dp[b + 2] * BIG;
        if (m3) dp[b + 3] = (f * sp[b + 3] > 0) ? dp[b + 3] / (f * sp[b + 3]) : dp[b + 3] * BIG;
        break;
    }
  }
}

// FUN_00412305 — flatten the stack into ctx.out
function flatten(ctx) {
  const c = ctx.view.img;
  const n = c.iw * c.ih;
  for (let i = 0, b = 0; i < n; i++, b += 4) {
    c.p[b] = 1; c.p[b + 1] = 1; c.p[b + 2] = 1; c.p[b + 3] = 1;
  }
  for (const s of ctx.slots) blendLayer(c, s);
  copyImg(ctx.out, c);
}

export function runTexgen(programBytes, opts = {}) {
  const scale = opts.scale ?? 1;
  const prog = parseProgram(programBytes);
  const A = prog.A * scale, B = prog.B * scale;

  // FUN_0041224d: root slot / view / output are built as (iw = B, ih = A).
  const ctx = {
    A, B,
    broadcast: 0,
    sp: 0,
    slots: [newSlot(B, A)],
    view: { img: new Img(B, A), opacity: 100, colour: 0xffffff, blend: 0 },
    out: new Img(B, A),
    kscale: scale,
    kmethod: opts.kernel ?? 'continuous',
    // op 16, the white-noise field. DEFAULT CHANGED 2026-08-05 — now NATIVE at
    // scale > 1; `noise: 'pinned'` restores the block-replicated field.
    //
    // Pinning draws the field on the ORIGINAL grid and replicates it, which makes the
    // op exactly resolution-independent and round-trips perfectly. That is why it was
    // the default: it satisfies re/REMASTER.md §3's scale-consistency criterion.
    //
    // But it is visibly WRONG. At scale S each noise cell becomes an S x S block, so
    // 2x looks like a mosaic and 4x like tiles — the project owner spotted it in
    // baked/tex_2x/2.png. The remaster exists to add real detail, and a coarser-
    // looking texture is a failure of the remaster no matter what the metric says.
    //
    // The round-trip test is simply the wrong instrument HERE: noise at a finer grid
    // genuinely should be finer, and finer noise box-downsampled genuinely has lower
    // variance (~16 8-bit units at the amplitudes these programs use). That is correct
    // behaviour being scored as error. Every other op still obeys the pinning rule.
    //
    // Safe because op 16 SEEDS ITSELF (`srand(a[1])` from its own bytecode) and every
    // other random op does likewise — there is no ambient stream for a changed draw
    // count to desync. See re/gen/TEXGEN_PORT.md.
    //
    // scale === 1 is unaffected: both paths are identical there, so the authentic
    // path is untouched.
    noisePin: (opts.noise ?? 'native') === 'pinned',
    opsUsed: new Set(),
    unimplemented: new Set(),
  };
  if (scale === 1) ctx.kmethod = 'none';

  // opts.stopAfter: execute only the first N ops (a diagnostic knob — lets the
  // round-trip test attribute error growth to a single instruction).
  const stopAfter = opts.stopAfter ?? prog.ops.length;
  for (const op of prog.ops.slice(0, stopAfter)) {
    if ((op.opcode & 0xff00) === 0xff00) {
      const sub = op.opcode & 0xff;
      ctx.sp = op.slot;
      ctx.opsUsed.add('c' + sub);
      switch (sub) {
        case 3: {                                   // SWAP with the one below, pop
          const t = ctx.slots[ctx.sp];
          ctx.slots[ctx.sp] = ctx.slots[ctx.sp - 1];
          ctx.slots[ctx.sp - 1] = t;
          ctx.sp--;
          break;
        }
        case 4:
          if (op.args[0] === 0) {                   // COMPOSITE the visible layers
            flatten(ctx);                           // FUN_004124a5
            let i = 0;
            for (; i < ctx.slots.length; i++) if (ctx.slots[i].colour !== 0) break;
            if (i === ctx.slots.length) break;
            copyImg(ctx.slots[i].img, ctx.out);
            let j = i + 1;
            for (;;) {
              if (j >= ctx.slots.length) { ctx.sp = i; break; }
              if (ctx.slots[j].colour === 0) { j++; continue; }
              ctx.sp = j; delSlot(ctx);
            }
          } else {                                  // RESET to a single layer
            flatten(ctx);                           // FUN_00412506
            copyImg(ctx.slots[0].img, ctx.out);
            while (ctx.slots.length !== 1) { ctx.sp = 1; delSlot(ctx); }
            ctx.sp = 0;
          }
          break;
        case 6:                                     // POP / delete layer
          delSlot(ctx);
          break;
        case 7:                                     // PUSH a new layer above sp
          ctx.sp++;
          ctx.slots.splice(ctx.sp, 0, newSlot(A, B));   // (note: A/B swapped, as in the original)
          break;
        case 8: ctx.slots[ctx.sp].opacity = op.args[0]; break;
        case 9: ctx.slots[ctx.sp].blend = op.args[0]; break;
        case 10: {
          const d = new DataView(op.args.buffer, op.args.byteOffset, op.args.byteLength);
          ctx.slots[ctx.sp].colour = d.getUint32(0, true) >>> 0;
          break;
        }
        case 12: ctx.broadcast = op.args[0]; break;
      }
      flatten(ctx);
    } else {
      ctx.opsUsed.add(op.opcode);
      const targets = ctx.broadcast ? ctx.slots.map((_, i) => i) : [op.slot];
      for (const si of targets) {
        const slot = ctx.slots[si];
        if (!slot) continue;
        // FUN_0041545c — bind the layer to the working view
        ctx.view.colour = slot.colour;
        ctx.view.blend = slot.blend;
        ctx.view.opacity = slot.opacity;
        copyImg(ctx.view.img, slot.img);
        ctx.view.img.filter = slot.img.filter;
        const h = PIXEL_OPS[op.opcode];
        if (h) {
          const dvv = new DataView(op.args.buffer, op.args.byteOffset, op.args.byteLength);
          h(ctx.view.img, ctx, op.args, dvv);
        } else {
          ctx.unimplemented.add(op.opcode);
        }
        maskedCopy(slot.img, ctx.view.img, op.mask);
      }
    }
  }

  flatten(ctx);

  // FUN_00415f44 — quantise once, on output
  const n = ctx.out.iw * ctx.out.ih;
  const rgba = new Uint8ClampedArray(n * 4);
  for (let i = 0, b = 0; i < n; i++, b += 4) {
    const a = q8(ctx.out.p[b]), r = q8(ctx.out.p[b + 1]);
    const g = q8(ctx.out.p[b + 2]), bl = q8(ctx.out.p[b + 3]);
    rgba[b] = r; rgba[b + 1] = g; rgba[b + 2] = bl; rgba[b + 3] = a;
  }
  return {
    width: ctx.out.iw, height: ctx.out.ih, rgba,
    opsUsed: [...ctx.opsUsed], unimplemented: [...ctx.unimplemented],
    opcount: prog.ops.length,
  };
}

function q8(f) { const v = ftol(f * F255); return v < 0 ? 0 : v > 255 ? 255 : v; }

export { PIXEL_OPS, q8, boxBlur, convolve, rotZoom, copyImg, srand as _srand };
