/*
 * atg.js — JavaScript port of ATG ("Aardbei Texture Generator", 1999)
 *
 * Ported from:
 *   - work/re/out/sys_atg.c   (Ghidra decompilation of atglib's sys_atg.obj, full symbols)
 *   - objdump disassembly of work/re/sys_atg.obj (for FPU math Ghidra garbled)
 *   - work/re/out/ptct.c      (the intro's own build: adds opcode 0x29 "text")
 *
 * A .atg script produces ONE texture built on up to 4 internal layers;
 * layer 0 is the output. Pixels are 32-bit 0x00RRGGBB
 * (channel 0 = R = bits 16..23, 1 = G = bits 8..15, 2 = B = bits 0..7).
 *
 * export runAtg(bytes, opts) -> {width, height, rgba: Uint8ClampedArray}
 *   opts: integer scale, or { scale, textRasterizer }
 *
 * scale = 1 (default): bit-exact replica of the original 256x256 output.
 * scale = S (power of two): "remaster" supersampling. The random lattices
 * of every generator stay keyed to the ORIGINAL lattice indices (identical
 * ilerand call sequence), so the S× image contains the exact 256-reference
 * pattern at lattice positions with genuinely interpolated/rasterised
 * detail in between. Per-op scaling decisions are documented at each op
 * and in ATG_NOTES.md.
 *
 * Determinism: the original PRNG (ilerand), fade tables, fixed-point and
 * truncation (MSVC __ftol = truncate toward zero) behaviour are replicated
 * exactly. The non-MMX (FPU) code paths are ported. The only knowingly
 * approximate op is 0x29 (text), which in the original rasterised text via
 * Windows GDI/Arial (ANTIALIASED_QUALITY) — the rasteriser is pluggable
 * (opts.textRasterizer, e.g. work/js/gdi_text.mjs); the built-in default
 * is an embedded 5x7 font.
 */

/* ---- float constants exactly as in the binary (float-precision pi) ---- */
const PI_F = Math.fround(Math.PI);          // 0x40490fdb = 3.1415927410125732
const PI128 = PI_F / 128;                   // __real@8@3ff9c90fdb...
const PI256 = PI_F / 256;                   // __real@8@3ff8c90fdb...
const TWO_PI_F = PI_F * 2;                  // __real@8@4001c90fdb...
const INV127 = 1 / 127;                     // __real@8@3ff88102040810204000
const fr = Math.fround;

/* MSVC __ftol: truncation toward zero */
function ftol(v) { return Math.trunc(v) | 0; }

/* ------------------------------------------------------------------ */
/*  Generator state (fresh per runAtg call)                           */
/* ------------------------------------------------------------------ */

/* Module-level default text rasteriser (see hook contract at
 * builtinTextRasterizer). Overridable per-call via opts.textRasterizer. */
let defaultTextRasterizer = null;
export function setTextRasterizer(fn) { defaultTextRasterizer = fn; }

class AtgState {
  constructor(scale, textRasterizer) {
    this.S = scale;                          // supersampling factor
    this.D = 256 * scale;                    // texture dimension
    this.M = this.D - 1;                     // spatial wrap mask
    this.N = this.D * this.D;                // pixel count
    this.inv = 1 / scale;                    // exact for power-of-two scales
    this.layer = [new Uint32Array(this.N), new Uint32Array(this.N),
                  new Uint32Array(this.N), new Uint32Array(this.N)];
    this.templayer = new Uint32Array(this.N);
    this.tempie = 0;                         // PRNG "seed" mixed in by ilerand
    this.fadetab = buildFadetab();
    this.textRasterizer = textRasterizer || defaultTextRasterizer || builtinTextRasterizer;
  }
}

/* ads_initatg: 64k fade table (value domain — independent of scale).
 * rows f=0..127  : fadetab[i + f*256] = (i*f)/127        (integer division)
 * rows f=128..255: fadetab[i + f*256] = trunc(255 - (255-i)*(1 - (f-128)/127))
 */
function buildFadetab() {
  const t = new Uint8Array(0x10000);
  for (let f = 0; f < 0x80; f++) {
    let acc = 0;
    for (let i = 0; i < 0x100; i++) {
      t[i + f * 0x100] = Math.floor(acc / 0x7f);   // unsigned div
      acc += f;
    }
  }
  for (let f = 0; f < 0x80; f++) {
    const rowFactor = 1 - f * INV127;
    for (let i = 0; i < 0x100; i++) {
      t[i + (f + 0x80) * 0x100] = ftol(255 - (255 - i) * rowFactor) & 0xff;
    }
  }
  return t;
}

/* ilerand — the custom PRNG (exact 32-bit arithmetic incl. signed division).
 * Never scaled: lattice values must match the 256 reference. */
function ilerand(state, x) {
  x |= 0;
  const u = ((x << 13) ^ x) | 0;
  const c = (Math.imul(Math.imul(Math.imul(u, u), 0x3d73) + 0xc0ae5 | 0,
                       (state.tempie + u) | 0) + 0x5208dd0d) | 0;
  return (c / 0x3047) | 0;                  // truncation toward zero
}

const shiftOf = ch => ((2 - ch) * 8) & 0x1f;          // channel -> bit shift
const maskOf  = sh => ((0xffffff - ((0xff << sh) >>> 0)) >>> 0) >>> 0;

/* fpu_getpixel — bilinear sample with wrap-around, trunc results.
 * SCALING: operates in pixel space; wrap becomes D instead of 256. At S×
 * this interpolates between S× pixels, i.e. genuinely finer sampling.   */
function getpixel(st, L, x, y) {
  const D = st.D, M = st.M;
  x = fr(x); y = fr(y);
  while (x < 0) x = fr(x + D);
  while (x >= D) x = fr(x - D);
  while (y < 0) y = fr(y + D);
  while (y >= D) y = fr(y - D);
  const ix = Math.floor(x) | 0, iy = Math.floor(y) | 0;
  const fx = x - ix, fy = y - iy;
  const r0 = (iy & M) * D, r1 = ((iy + 1) & M) * D;
  const x0 = ix & M, x1 = (ix + 1) & M;
  const p00 = L[x0 + r0], p10 = L[x1 + r0], p01 = L[x0 + r1], p11 = L[x1 + r1];
  let out = 0;
  for (let sh = 16; sh >= 0; sh -= 8) {
    const a = (p00 >>> sh) & 0xff, b = (p10 >>> sh) & 0xff;
    const c = (p01 >>> sh) & 0xff, d = (p11 >>> sh) & 0xff;
    const top = a + (b - a) * fx;
    const bot = c + (d - c) * fx;
    out |= (ftol(top + (bot - top) * fy) & 0xff) << sh;
  }
  return out >>> 0;
}

/* ------------------------------------------------------------------ */
/*  Generators                                                        */
/* ------------------------------------------------------------------ */

/* spline_inter (Catmull-like), used by vulmapjesub */
function splineInter(p1, p2, p3, p4, t, n) {
  const f = t / n;
  const d = (p4 - p3) - (p1 - p2);
  return (p3 - p1) * f + f * f * f * d + ((p1 - p2) - d) * f * f + p2;
}

/* vulmapjesub — float grid + spline interpolation (for subplasma).
 * SCALING: lattice points sit every grid*S pixels (= original positions),
 * values keyed to the original row-major ilerand sequence; the spline is
 * evaluated at S× finer fractions (t/n is unchanged at lattice-aligned
 * pixels since both t and n scale by the power-of-two S).              */
function vulmapjesub(st, grid, maxval) {
  const D = st.D, M = st.M, G = grid * st.S;
  const map = new Float32Array(st.N);
  const scale = fr(maxval * (1 / 256));
  let k = 0;
  for (let y = 0; y < D; y += G)
    for (let x = 0; x < D; x += G)
      map[y * D + x] = fr((ilerand(st, k++) & 0xff) * scale);
  // horizontal spline pass on grid rows
  for (let row = 0; row < st.N; row += G * D) {
    for (let x = 1; x < D; x++) {
      const x0 = (D - G) & x;
      const x1 = (x0 + G) & M;
      map[row + x] = fr(splineInter(
        map[row + ((x0 - G) & M)], map[row + x0],
        map[row + x1], map[row + ((x1 + G) & M)],
        (G - 1) & x, G));
    }
  }
  // vertical spline pass on all rows
  for (let y = 1; y < D; y++) {
    const y0 = (D - G) & y;
    const y1 = (y0 + G) & M;
    const rA = ((y0 - G) & M) * D, rB = y0 * D;
    const rC = y1 * D, rD = ((y1 + G) & M) * D;
    const t = (G - 1) & y, dst = y * D;
    for (let x = 0; x < D; x++) {
      map[dst + x] = fr(splineInter(map[rA + x], map[rB + x],
                                    map[rC + x], map[rD + x], t, G));
    }
  }
  return map;
}

/* vulmapjefrac — 16.16 fixed-point grid + cosine interpolation.
 * SCALING: like vulmapjesub — original lattice values/positions, cosine
 * table stretched to grid*S entries (costab[S*j] equals the original
 * costab[j] exactly for power-of-two S). The 16.16 arithmetic keeps the
 * original value range (max 128<<16) so no widening is required — the
 * (b-a)*w product peaks below 2^31 exactly as in the x86 build.        */
function vulmapjefrac(st, out, grid, maxval) {
  const D = st.D, M = st.M, G = grid * st.S;
  out.fill(0);
  const scale = fr(maxval * (1 / 256));
  let k = 0;
  for (let y = 0; y < D; y += G)
    for (let x = 0; x < D; x += G)
      out[y * D + x] = (ftol((ilerand(st, k++) & 0xff) * scale) << 16) | 0;
  const costab = new Int32Array(G);
  for (let i = 0; i < G; i++)
    costab[i] = ftol((1 - Math.cos((i * PI_F) / G)) * 0.5 * 256);
  // horizontal (rows that are grid multiples)
  for (let row = 0; row < st.N; row += G * D) {
    for (let x = 0; x < D; x++) {
      const x0 = (D - G) & x;
      const a = out[row + x0] | 0;
      const b = out[row + ((x0 + G) & M)] | 0;
      out[row + x] = (a + (Math.imul(b - a, costab[(G - 1) & x]) >> 8)) | 0;
    }
  }
  // vertical (all rows)
  for (let y = 1; y < D; y++) {
    const y0 = (D - G) & y;
    const rB = y0 * D, rC = ((y0 + G) & M) * D;
    const w = costab[(G - 1) & y], dst = y * D;
    for (let x = 0; x < D; x++) {
      const a = out[rB + x] | 0, b = out[rC + x] | 0;
      out[dst + x] = (a + (Math.imul(b - a, w) >> 8)) | 0;
    }
  }
}

/* op 0x01 atg_fractalplasma(layer, ch, s1..s4)
 * SCALING: octave grids/amplitudes unchanged (128..1 in original units);
 * each octave interpolates S× finer. No sub-original-grid octave is added
 * (the reference is band-limited there by construction). */
function fractalplasma(st, li, ch, s1, s2, s3, s4) {
  const L = st.layer[li], sh = shiftOf(ch), keep = maskOf(sh);
  st.tempie = ((((s1 << 8 | s2) << 8) | s3) << 8 | s4) | 0;
  const acc = new Int32Array(st.N), oct = new Int32Array(st.N);
  vulmapjefrac(st, acc, 0x80, 128.0);
  let amp = fr(64.0);
  for (let grid = 0x40; grid > 0; grid = (grid / 2) | 0) {
    vulmapjefrac(st, oct, grid, amp);
    for (let i = 0; i < st.N; i++) acc[i] = (acc[i] + oct[i]) | 0;
    amp = fr(amp * 0.5);
  }
  for (let i = 0; i < st.N; i++)
    L[i] = ((L[i] & keep) | ((((acc[i] >>> 16) << sh) >>> 0))) >>> 0;
}

/* op 0x02 atg_plasma(layer, ch, xf, yf, xo, yo)   [ch comes from byte 8]
 * SCALING: pure function of position — evaluated at x/S, y/S. */
function plasma(st, li, ch, xf, yf, xo, yo) {
  const L = st.layer[li], sh = shiftOf(ch), keep = maskOf(sh);
  const T = st.templayer, D = st.D, inv = st.inv;
  let i = 0;
  for (let y = 0; y < D; y++) {
    const sy = Math.sin((y * inv + yo) * yf * PI128);
    for (let x = 0; x < D; x++) {
      const v = ftol((Math.sin((x * inv + xo) * xf * PI128) + sy) * 63.0 + 127.0);
      T[i++] = (v << sh) >>> 0;
    }
  }
  for (let j = 0; j < st.N; j++) L[j] = ((L[j] & keep) | T[j]) >>> 0;
}

/* op 0x03 atg_cells(layer, ch, count, dscale, s1..s4)
 * SCALING: random dot centres stay at original (rx,ry) lattice coords
 * (identical ilerand sequence), stamped at rx*S; the distance stamp is a
 * D×D table computed in original units (x/S). */
function cells(st, li, ch, count, dscale, s1, s2, s3, s4) {
  const L = st.layer[li], sh = shiftOf(ch), keep = maskOf(sh);
  const T = st.templayer, D = st.D, M = st.M, S = st.S, inv = st.inv;
  const scale = fr(dscale * 0.0390625);
  const dtab = new Uint32Array(st.N);
  let i = 0;
  for (let y = 0; y < D; y++) {
    const dyv = y * inv - 128;
    const dy = dyv * dyv;
    for (let x = 0; x < D; x++) {
      const dxv = x * inv - 128;
      let d = Math.sqrt(dxv * dxv + dy) * scale;
      if (!(d <= 255)) d = 255;
      dtab[i++] = ftol(d);
    }
  }
  st.tempie = ((((s1 << 8 | s2) << 8) | s3) << 8 | s4) | 0;
  T.fill(0xff);
  let k = 0;
  for (let n = 0; n < count; n++) {
    const rx = (ilerand(st, k++) & 0xff) * S;
    const ry = (ilerand(st, k++) & 0xff) * S;
    let idx = 0;
    const half = 0x80 * S;
    for (let py = ry - half; py < ry + half; py++) {
      const row = (py & M) * D;
      for (let px = rx - half; px < rx + half; px++) {
        const d = dtab[idx++];
        const at = (px & M) + row;
        if (d < T[at]) T[at] = d;
      }
    }
  }
  for (let j = 0; j < st.N; j++)
    L[j] = ((L[j] & keep) | ((T[j] << sh) >>> 0)) >>> 0;
}

/* op 0x04 atg_envmap(layer, mode, ch, K)
 * mode 0: greyscale RGB spot, f = 1.0
 * mode 1: single channel,     f = K/256 + 0.8
 * SCALING: pure gradient of position — evaluated at x/S, y/S. */
function envmap(st, li, mode, ch, K) {
  const L = st.layer[li], sh = shiftOf(ch), keep = maskOf(sh);
  const D = st.D, inv = st.inv;
  let f;
  if (mode === 0) f = 1.0;
  else if (mode === 1) f = K * (1 / 256) + 0.8;
  else f = 0;                                  // original reads garbage here
  let i = 0;
  for (let y = 0; y < D; y++) {
    const dyv = y * inv - 128;
    const dy = dyv * dyv;
    for (let x = 0; x < D; x++, i++) {
      const dxv = x * inv - 128;
      let v = ftol(255 - f * Math.sqrt(dxv * dxv + dy) * 2);
      if (v < 0) v = 0; else if (v > 0xff) v = 0xff;
      if (mode === 0) L[i] = (((v << 8 | v) << 8) | v) >>> 0;
      else if (mode === 1) L[i] = ((L[i] & keep) | ((v << sh) >>> 0)) >>> 0;
    }
  }
}

/* op 0x05 atg_subplasma(layer, ch, grid, s1..s4) — see vulmapjesub */
function subplasma(st, li, ch, grid, s1, s2, s3, s4) {
  if (!grid) return;
  const L = st.layer[li], sh = shiftOf(ch), keep = maskOf(sh);
  st.tempie = ((((s1 << 8 | s2) << 8) | s3) << 8 | s4) | 0;
  const map = vulmapjesub(st, grid, 255.0);
  for (let i = 0; i < st.N; i++) {
    let v = ftol(map[i]);
    if (v < 0x100) { if (v < 0) v = 0; } else v = 0xff;
    L[i] = ((L[i] & keep) | ((v << sh) >>> 0)) >>> 0;
  }
}

/* ------------------------------------------------------------------ */
/*  Distorters                                                        */
/* ------------------------------------------------------------------ */

/* op 0x0a atg_sinedistort(layer, yf, xf, xamp, yamp, yph, xph)
 * SCALING: sine phases evaluated at original units (x/S), displacements
 * (original units) multiplied by S before the bilinear fetch. */
function sinedistort(st, li, p2, p3, p4, p5, p6, p7) {
  const L = st.layer[li], T = st.templayer, D = st.D, S = st.S, inv = st.inv;
  const coltab = new Float32Array(D);
  for (let x = 0; x < D; x++)
    coltab[x] = fr(p5 * Math.cos(p3 * (x * inv + p7) * PI128));
  let i = 0;
  for (let y = 0; y < D; y++) {
    const rowshift = Math.sin((y * inv + p6) * p2 * PI128);
    for (let x = 0; x < D; x++)
      T[i++] = getpixel(st, L, fr(x + fr(rowshift * p4) * S), fr(y + coltab[x] * S));
  }
  L.set(T);
}

/* op 0x0b atg_offset(layer, xo, yo) — SCALING: shift by xo*S, yo*S px */
function offset(st, li, xo, yo) {
  const L = st.layer[li], T = st.templayer, D = st.D, M = st.M, S = st.S;
  let i = 0;
  for (let y = 0; y < D; y++) {
    const row = ((y + yo * S) & M) * D;
    for (let x = 0; x < D; x++)
      T[i++] = L[((x + xo * S) & M) + row];
  }
  L.set(T);
}

/* op 0x0c atg_twirl(layer, amount)
 * SCALING: geometry in original units (x/S about centre 127.5), the
 * resample coordinate scaled back to pixels. */
function twirl(st, li, amount) {
  const L = st.layer[li], T = st.templayer, D = st.D, S = st.S, inv = st.inv;
  const F = fr((amount - 127.5) * 0.03125);
  const sign = (F <= 0) ? 1.0 : -1.0;
  let i = 0;
  for (let y = 0; y < D; y++) {
    const dy = fr(y * inv - 127.5);
    for (let x = 0; x < D; x++) {
      const dx = x * inv - 127.5;
      const r = fr(Math.sqrt(dx * dx + fr(dy * dy)));
      let a = Math.atan2(dx, dy);
      let t;
      if (0 <= 128.0 - r) t = Math.cos((128.0 - r) * F * PI256) * 128.0 + 128.0;
      else t = 0.0;
      a = (t * sign + a * (128 / Math.PI)) * PI128;
      T[i++] = getpixel(st, L, fr((Math.sin(a) * r + 128.0) * S),
                                fr((Math.cos(a) * r + 128.0) * S));
    }
  }
  L.set(T);
}

/* op 0x0e atg_bump(layer, dist)
 * SCALING: the diagonal (dist,dist) probe becomes (dist*S, dist*S). */
function bump(st, li, dist) {
  const L = st.layer[li], T = st.templayer, N = st.N;
  const step = Math.imul(dist * st.S, st.D + 1);
  for (let i = 0; i < N; i++) {
    const q = L[(i + step) & (N - 1)], p = L[i];
    let r = ((q >>> 16) & 0xff) - ((p >>> 16) & 0xff);
    let g = ((q >>> 8) & 0xff) - ((p >>> 8) & 0xff);
    let b = (q & 0xff) - (p & 0xff);
    if (r < 0) r = 0; if (g < 0) g = 0; if (b < 0) b = 0;
    T[i] = (((r << 8 | g) << 8) | b) >>> 0;
  }
  L.set(T);
}

/* one 5-point blur pass with tap distance `stride` */
function blurPass(st, L, stride) {
  const T = st.templayer, D = st.D, M = st.M;
  let i = 0;
  for (let y = 0; y < D; y++) {
    const up = ((y - stride) & M) * D, dn = ((y + stride) & M) * D, row = y * D;
    for (let x = 0; x < D; x++, i++) {
      const pu = L[up + x], pd = L[dn + x];
      const pl = L[row + ((x - stride) & M)], pr = L[row + ((x + stride) & M)];
      const pc = L[i];
      const r = (((pr >>> 16) & 0xff) + ((pc >>> 16) & 0xff) * 4 + ((pu >>> 16) & 0xff)
               + ((pl >>> 16) & 0xff) + ((pd >>> 16) & 0xff)) >> 3;
      const g = (((pr >>> 8) & 0xff) + ((pc >>> 8) & 0xff) * 4 + ((pu >>> 8) & 0xff)
               + ((pl >>> 8) & 0xff) + ((pd >>> 8) & 0xff)) >> 3;
      const b = ((pr & 0xff) + (pc & 0xff) * 4 + (pu & 0xff)
               + (pl & 0xff) + (pd & 0xff)) >> 3;
      T[i] = (((r << 8 | g) << 8) | b) >>> 0;
    }
  }
  L.set(T);
}

/* op 0x0f atg_blur(layer, times) — (l+r+u+d+4c)>>3, wrapping.
 * SCALING: `times` passes with taps at ±S pixels — this keeps every
 * S-aligned pixel bit-identical to the 256 reference (the kernel only ever
 * reads S-aligned pixels there), so the macro shape is preserved exactly.
 * Then S-1 additional ±1-pixel passes couple the S² sub-lattices so the
 * fine (remastered) detail is smoothed too; this adds <1 original-pixel of
 * extra blur, invisible after downsampling.                              */
function blur(st, li, times) {
  const L = st.layer[li];
  for (let n = 0; n < times; n++) blurPass(st, L, st.S);
  if (st.S > 1 && times > 0)
    for (let n = 0; n < st.S - 1; n++) blurPass(st, L, 1);
}

/* op 0x11 atg_mapdistort(layer, mapA, chA, amtA, mapB, chB, amtB)
 * SCALING: displacement (original units) multiplied by S. */
function mapdistort(st, li, mapA, chA, amtA, mapB, chB, amtB) {
  const L = st.layer[li], T = st.templayer, D = st.D, S = st.S;
  const A = st.layer[mapA], B = st.layer[mapB];
  const shA = shiftOf(chA), shB = shiftOf(chB);
  const C = 1 / 256;                       // __real@8@3ff78...
  let i = 0;
  for (let y = 0; y < D; y++)
    for (let x = 0; x < D; x++, i++) {
      const xs = ((A[i] >>> shA) & 0xff) * amtA * C * S + x;
      const ys = ((B[i] >>> shB) & 0xff) * amtB * C * S + y;
      T[i] = getpixel(st, L, fr(xs), fr(ys));
    }
  L.set(T);
}

/* op 0x12 atg_dirblur(layer, maplayer, ch, len) — then blur(layer,2)
 * SCALING: the original averages `len` samples at j=0,2,4,.. (2px steps).
 * At S× we take len*S samples at 2-PIXEL steps (= 2/S original units):
 * the averaged segment keeps its original length (~2*len units) but is
 * sampled S× denser — a genuine quality gain over the original's
 * every-other-pixel skip; the trailing blur is the scaled blur op. */
function dirblur(st, li, mapl, ch, len) {
  const L = st.layer[li], M_ = st.layer[mapl], T = st.templayer;
  const D = st.D, M = st.M, sh = shiftOf(ch);
  const count = len * st.S;
  const n = fr(count);
  let i = 0;
  for (let y = 0; y < D; y++) {
    for (let x = 0; x < D; x++, i++) {
      const a = ((M_[i] >>> sh) & 0xff) * PI128;
      const s = Math.sin(a), c = Math.cos(a);
      let sr = 0, sg = 0, sb = 0;
      let j = 0;
      for (let q = 0; q < count; q++, j += 2) {
        const py = ftol(y + j * c) & M;
        const px = ftol(x + j * s) & M;
        const p = L[py * D + px];
        sr += (p >> 16);                    // signed >> as in original
        sg += (p >>> 8) & 0xff;
        sb += p & 0xff;
      }
      T[i] = ((((ftol(sr / n) << 8) | (ftol(sg / n) & 0xff)) << 8) | (ftol(sb / n) & 0xff)) >>> 0;
    }
  }
  L.set(T);
  blur(st, li, 2);
}

/* ------------------------------------------------------------------ */
/*  Combiners / colour ops (value domain — no spatial scaling needed) */
/* ------------------------------------------------------------------ */

/* op 0x14 atg_exchange(layerA, chA, layerB, chB) — swap channels */
function exchange(st, la, chA, lb, chB) {
  const A = st.layer[la], B = st.layer[lb];
  const shA = shiftOf(chA), shB = shiftOf(chB);
  const keepA = maskOf(shA), keepB = maskOf(shB);
  for (let i = 0; i < st.N; i++) {
    const t1 = (((B[i] >>> shB) & 0xff) << shA) >>> 0;
    const t2 = (((A[i] >>> shA) & 0xff) << shB) >>> 0;
    A[i] = ((A[i] & keepA) | t1) >>> 0;
    B[i] = ((B[i] & keepB) | t2) >>> 0;
  }
}

/* op 0x15 atg_torgb(layer, ch) */
function torgb(st, li, ch) {
  const L = st.layer[li], sh = shiftOf(ch);
  for (let i = 0; i < st.N; i++) {
    const v = (L[i] >>> sh) & 0xff;
    L[i] = (((v << 8 | v) << 8) | v) >>> 0;
  }
}

/* op 0x17 atg_copylayer(dst, dstCh, src, srcCh) */
function copylayer(st, ld, chD, ls, chS) {
  const D = st.layer[ld], S = st.layer[ls & 3];
  const shD = shiftOf(chD), shS = shiftOf(chS), keep = maskOf(shD);
  for (let i = 0; i < st.N; i++)
    D[i] = ((D[i] & keep) | ((((S[i] >>> shS) & 0xff) << shD) >>> 0)) >>> 0;
}

/* op 0x18 atg_mix(dst, src, f) — fadetab-based blend (bytes 0..2 only) */
function mix(st, ld, ls, f) {
  const D = st.layer[ld], S = st.layer[ls], FT = st.fadetab;
  const u = f & 0xfffffffe;
  const rowS = (0x7f00 - u * 0x80) | 0;     // src row offset
  const rowD = u * 0x80;                    // dst row offset
  for (let i = 0; i < st.N; i++) {
    const d = D[i], s = S[i];
    const b = (FT[(s & 0xff) + rowS] + FT[(d & 0xff) + rowD]) & 0xff;
    const g = (FT[((s >>> 8) & 0xff) + rowS] + FT[((d >>> 8) & 0xff) + rowD]) & 0xff;
    const r = (FT[((s >>> 16) & 0xff) + rowS] + FT[((d >>> 16) & 0xff) + rowD]) & 0xff;
    D[i] = ((d & 0xff000000) | (r << 16) | (g << 8) | b) >>> 0;
  }
}

/* op 0x19 atg_mul(dst, src) */
function mul(st, ld, ls) {
  const D = st.layer[ld], S = st.layer[ls];
  for (let i = 0; i < st.N; i++) {
    const p = D[i], q = S[i];
    const b = ((q & 0xff) * (p & 0xff)) >> 8;
    const g = (((q >>> 8) & 0xff) * ((p >>> 8) & 0xff)) >> 8;
    const r = (((q | 0) >> 16) * ((p | 0) >> 16)) >> 8;
    D[i] = ((((r << 8) | (g & 0xff)) << 8 | (b & 0xff))) >>> 0;
  }
}

/* op 0x1a atg_add(dst, src) — saturated */
function add(st, ld, ls) {
  const D = st.layer[ld], S = st.layer[ls];
  for (let i = 0; i < st.N; i++) {
    const p = D[i], q = S[i];
    let r = ((q | 0) >> 16) + ((p | 0) >> 16);
    let g = ((q >>> 8) & 0xff) + ((p >>> 8) & 0xff);
    let b = (q & 0xff) + (p & 0xff);
    if (r > 0xff) r = 0xff; if (g > 0xff) g = 0xff; if (b > 0xff) b = 0xff;
    D[i] = (((r << 8 | g) << 8) | b) >>> 0;
  }
}

/* op 0x1b atg_max(dst, src) */
function amax(st, ld, ls) {
  const D = st.layer[ld], S = st.layer[ls];
  for (let i = 0; i < st.N; i++) {
    const p = D[i], q = S[i];
    let r = (q >>> 16) & 0xff, g = (q >>> 8) & 0xff, b = q & 0xff;
    const pr = (p >>> 16) & 0xff, pg = (p >>> 8) & 0xff, pb = p & 0xff;
    if (r < pr) r = pr; if (g < pg) g = pg; if (b < pb) b = pb;
    D[i] = (((r << 8 | g) << 8) | b) >>> 0;
  }
}

/* op 0x1e atg_contrast(layer, amount) */
function contrast(st, li, amount) {
  const L = st.layer[li];
  const m = amount * 0.03125;               // amount/32
  for (let i = 0; i < st.N; i++) {
    const p = L[i];
    let r = ftol((((p >>> 16) & 0xff) - 0x80) * m);
    let g = ftol((((p >>> 8) & 0xff) - 0x80) * m);
    let b = ftol(((p & 0xff) - 0x80) * m);
    if (r > 0x7f) r = 0x7f; if (g > 0x7f) g = 0x7f; if (b > 0x7f) b = 0x7f;
    if (r < -0x7f) r = -0x7f; if (g < -0x7f) g = -0x7f; if (b < -0x7f) b = -0x7f;
    L[i] = (((r + 0x80) << 16) | ((g + 0x80) << 8) | (b + 0x80)) >>> 0;
  }
}

/* op 0x1f atg_invert(layer) — original quirk: only the BLUE byte is inverted */
function invert(st, li) {
  const L = st.layer[li];
  for (let i = 0; i < st.N; i++) L[i] = (L[i] ^ 0xff) >>> 0;
}

/* op 0x20 atg_shade(dst, src, ch) — fadetab[dstC + srcCh*256] */
function shade(st, ld, ls, ch) {
  const D = st.layer[ld], S = st.layer[ls], FT = st.fadetab, sh = shiftOf(ch);
  for (let i = 0; i < st.N; i++) {
    const p = D[i];
    const row = ((S[i] >>> sh) & 0xff) * 0x100;
    D[i] = ((FT[((p >>> 16) & 0xff) + row] << 16)
          | (FT[((p >>> 8) & 0xff) + row] << 8)
          | FT[(p & 0xff) + row]) >>> 0;
  }
}

/* op 0x21 atg_brightness(layer, f) — fadetab row f */
function brightness(st, li, f) {
  const L = st.layer[li], FT = st.fadetab, row = f * 0x100;
  for (let i = 0; i < st.N; i++) {
    const p = L[i];
    L[i] = ((FT[row + ((p >>> 16) & 0xff)] << 16)
          | (FT[row + ((p >>> 8) & 0xff)] << 8)
          | FT[row + (p & 0xff)]) >>> 0;
  }
}

/* op 0x22 atg_sinecolor(layer, ch, freq) */
function sinecolor(st, li, ch, freq) {
  const L = st.layer[li], sh = shiftOf(ch), keep = maskOf(sh);
  const f = freq * TWO_PI_F * (1 / 256);
  for (let i = 0; i < st.N; i++) {
    const c = (L[i] >>> sh) & 0xff;
    const v = ftol(127.0 - Math.cos(c * f) * 127.0);
    L[i] = ((L[i] & keep) | ((v << sh) >>> 0)) >>> 0;
  }
}

/* op 0x23 atg_scalecolor(layer, ch, from, to) */
function scalecolor(st, li, ch, from, to) {
  const L = st.layer[li], sh = shiftOf(ch), keep = maskOf(sh);
  let d = to - from;
  if (d === 0) d = 1;
  const scale = d * (1 / 256);
  for (let i = 0; i < st.N; i++) {
    const c = (L[i] >>> sh) & 0xff;
    const v = ftol(from + c * scale);       // NOT clamped (original quirk)
    L[i] = (((v << sh) >>> 0) | (L[i] & keep)) >>> 0;
  }
}

/* rgb_to_hsv / hsv_to_rgb — exact port (h in degrees, s 0..1, v 0..255) */
function rgbToHsv(r, g, b) {
  let max = g < r ? r : g; if (max < b) max = b;
  let min = r < g ? r : g; if (b < min) min = b;
  const v = max;
  let s = 0;
  if (max !== 0) s = (max - min) / max;
  if (s === 0) return [-1, s, v];
  const d = max - min;
  let h;
  if (r === max) h = ((max - b) - (max - g)) / d;
  else if (g === max) h = ((max - r) - (max - b)) / d + 2;
  else h = ((max - g) - (max - r)) / d + 4;
  h = fr(h * 60);
  while (h < 0) h = fr(h + 360);
  while (h >= 360) h = fr(h - 360);
  return [h, fr(s), v];
}

function hsvToRgb(h, s, v) {
  let R, G, B;
  if (s === 0) { R = G = B = v; }
  else {
    while (h >= 360) h -= 360;
    while (h < 0) h += 360;
    h *= (1 / 60);
    const i = ftol(Math.floor(h));
    const f = h - Math.floor(h);
    const p = fr((1 - s) * v);
    const q = fr((1 - s * f) * v);
    const t = fr((1 - s * (1 - f)) * v);
    switch (i) {
      case 0: R = v; G = t; B = p; break;
      case 1: R = q; G = v; B = p; break;
      case 2: R = p; G = v; B = t; break;
      case 3: R = p; G = q; B = v; break;
      case 4: R = t; G = p; B = v; break;
      case 5: R = v; G = p; B = q; break;
      default: R = v; G = v; B = v; break;
    }
  }
  let r = ftol(R), g = ftol(G), b = ftol(B);
  if (r > 0xff) r = 0xff; if (g > 0xff) g = 0xff; if (b > 0xff) b = 0xff;
  return ((((r << 8) | (g & 0xff)) << 8) | (b & 0xff)) >>> 0;
}

/* op 0x24 atg_hsv(layer, hueAdd, satSub) */
function hsvOp(st, li, hueAdd, satSub) {
  const L = st.layer[li];
  const dh = fr(hueAdd * 1.40625);          // *360/256
  const sf = fr((0xff - satSub) * (1 / 255));
  for (let i = 0; i < st.N; i++) {
    const p = L[i];
    let [h, s, v] = rgbToHsv((p >>> 16) & 0xff, (p >>> 8) & 0xff, p & 0xff);
    h = fr(h + dh);
    s = fr(s * sf);
    L[i] = hsvToRgb(h, s, v);
  }
}

/* op 0x25 atg_colorize(layer, ch, r1,r2, g1,g2, b1,b2) */
function colorize(st, li, ch, r1, r2, g1, g2, b1, b2) {
  const L = st.layer[li], sh = shiftOf(ch);
  const pal = new Uint32Array(0x100);
  const dr = r2 - r1, dg = g2 - g1, db = b2 - b1;
  for (let i = 0; i < 0x100; i++) {
    const R = ftol(i * dr * fr(1 / 256) + r1);
    const G = ftol(i * dg * fr(1 / 256) + g1);
    const B = ftol(i * db * fr(1 / 256) + b1);
    pal[i] = ((((R << 8) | (G & 0xff)) << 8) | (B & 0xff)) >>> 0;
  }
  for (let i = 0; i < st.N; i++) L[i] = pal[(L[i] >>> sh) & 0xff];
}

/* op 0x26 atg_mixmap(dst, src, maplayer, ch) */
function mixmap(st, ld, ls, lm, ch) {
  const D = st.layer[ld], S = st.layer[ls], M = st.layer[lm];
  const sh = shiftOf(ch), C = fr(1 / 256);
  for (let i = 0; i < st.N; i++) {
    const f = 0xff - ((M[i] >>> sh) & 0xff);
    const p = D[i], q = S[i];
    const r1 = (p >>> 16) & 0xff, g1 = (p >>> 8) & 0xff, b1 = p & 0xff;
    const R = ftol((((q >>> 16) & 0xff) - r1) * f * C + r1);
    const G = ftol((((q >>> 8) & 0xff) - g1) * f * C + g1);
    const B = ftol(((q & 0xff) - b1) * f * C + b1);
    D[i] = ((((R << 8) | (G & 0xff)) << 8) | (B & 0xff)) >>> 0;
  }
}

/* op 0x27 atg_emboss(layer) — horizontal [-1 0 1] x 3 rows, +128, clamp.
 * SCALING: taps at ±S pixels so the derivative amplitude (per original
 * pixel) matches the 256 reference; S-aligned pixels stay bit-exact. */
function emboss(st, li) {
  const L = st.layer[li], T = st.templayer, D = st.D, M = st.M, S = st.S;
  let i = 0;
  for (let y = 0; y < D; y++) {
    for (let x = 0; x < D; x++, i++) {
      let r = 0, g = 0, b = 0;
      for (let ry = 0; ry < 3; ry++) {
        const row = ((y - S + ry * S) & M) * D;
        const pl = L[row + ((x - S) & M)];
        const pr = L[row + ((x + S) & M)];
        r += (pr >>> 16) - (pl >>> 16);
        g += ((pr >>> 8) & 0xff) - ((pl >>> 8) & 0xff);
        b += (pr & 0xff) - (pl & 0xff);
      }
      r += 0x80; g += 0x80; b += 0x80;
      if (r > 0xff) r = 0xff; if (g > 0xff) g = 0xff; if (b > 0xff) b = 0xff;
      if (r < 0) r = 0; if (g < 0) g = 0; if (b < 0) b = 0;
      T[i] = (((r << 8 | g) << 8) | b) >>> 0;
    }
  }
  L.set(T);
}

/* op 0x28 atg_loadbitmap(layer, bits[0x2000], col0, col1) — 1bpp expand.
 * SCALING: nearest-neighbour SxS blocks — hard pixels are deliberate. */
function loadbitmap(st, li, bits, col0, col1) {
  const L = st.layer[li], S = st.S, D = st.D;
  for (let n = 0; n < 0x2000; n++) {
    let byte = bits[n];
    for (let b = 0; b < 8; b++) {
      const src = n * 8 + b;
      const sx = (src & 0xff) * S, sy = (src >> 8) * S;
      const col = ((byte & 1) ? col1 : col0) >>> 0;
      for (let dy = 0; dy < S; dy++) {
        const row = (sy + dy) * D + sx;
        for (let dx = 0; dx < S; dx++) L[row + dx] = col;
      }
      byte >>= 1;
    }
  }
}

/* ------------------------------------------------------------------ */
/*  op 0x29 — text (intro-only op; GDI in the original)               */
/* ------------------------------------------------------------------ */

/* Compact 5x7 font (built-in fallback rasteriser). Rows are 5-bit masks
 * (MSB = left). `top` is the design row (0 = cap top, baseline = row 7)
 * where the glyph's first row sits. */
const FONT = (() => {
  const g = (top, w, ...rows) => ({ top, w, rows });
  const F = {
    ' ': g(0, 3),
    '.': g(6, 1, 0b1),
    '-': g(4, 4, 0b1111),
    A: g(0, 5, 0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11),
    B: g(0, 5, 0x1e, 0x11, 0x1e, 0x11, 0x11, 0x11, 0x1e),
    C: g(0, 5, 0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e),
    D: g(0, 5, 0x1c, 0x12, 0x11, 0x11, 0x11, 0x12, 0x1c),
    E: g(0, 5, 0x1f, 0x10, 0x1e, 0x10, 0x10, 0x10, 0x1f),
    F: g(0, 5, 0x1f, 0x10, 0x1e, 0x10, 0x10, 0x10, 0x10),
    G: g(0, 5, 0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f),
    H: g(0, 5, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11, 0x11),
    I: g(0, 3, 0b111, 0b010, 0b010, 0b010, 0b010, 0b010, 0b111),
    J: g(0, 5, 0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c),
    K: g(0, 5, 0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11),
    L: g(0, 5, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f),
    M: g(0, 5, 0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11),
    N: g(0, 5, 0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11),
    O: g(0, 5, 0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e),
    P: g(0, 5, 0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10),
    Q: g(0, 5, 0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d),
    R: g(0, 5, 0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11),
    S: g(0, 5, 0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e),
    T: g(0, 5, 0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04),
    U: g(0, 5, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e),
    V: g(0, 5, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04),
    W: g(0, 5, 0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11),
    X: g(0, 5, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x0a, 0x11),
    Y: g(0, 5, 0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04),
    Z: g(0, 5, 0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f),
    a: g(2, 5, 0x0e, 0x01, 0x0f, 0x11, 0x0f),
    b: g(0, 5, 0x10, 0x10, 0x1e, 0x11, 0x11, 0x11, 0x1e),
    c: g(2, 5, 0x0e, 0x11, 0x10, 0x11, 0x0e),
    d: g(0, 5, 0x01, 0x01, 0x0f, 0x11, 0x11, 0x11, 0x0f),
    e: g(2, 5, 0x0e, 0x11, 0x1f, 0x10, 0x0e),
    f: g(0, 4, 0b0011, 0b0100, 0b1110, 0b0100, 0b0100, 0b0100, 0b0100),
    g: g(2, 5, 0x0f, 0x11, 0x11, 0x11, 0x0f, 0x01, 0x0e),
    h: g(0, 5, 0x10, 0x10, 0x1e, 0x11, 0x11, 0x11, 0x11),
    i: g(0, 1, 0b1, 0, 0b1, 0b1, 0b1, 0b1, 0b1),
    j: g(0, 3, 0b001, 0, 0b001, 0b001, 0b001, 0b001, 0b001, 0b101, 0b010),
    k: g(0, 4, 0b1000, 0b1000, 0b1001, 0b1010, 0b1100, 0b1010, 0b1001),
    l: g(0, 1, 0b1, 0b1, 0b1, 0b1, 0b1, 0b1, 0b1),
    m: g(2, 5, 0x1a, 0x15, 0x15, 0x15, 0x15),
    n: g(2, 5, 0x1e, 0x11, 0x11, 0x11, 0x11),
    o: g(2, 5, 0x0e, 0x11, 0x11, 0x11, 0x0e),
    p: g(2, 5, 0x1e, 0x11, 0x11, 0x11, 0x1e, 0x10, 0x10),
    q: g(2, 5, 0x0f, 0x11, 0x11, 0x11, 0x0f, 0x01, 0x01),
    r: g(2, 4, 0b1011, 0b1100, 0b1000, 0b1000, 0b1000),
    s: g(2, 5, 0x0f, 0x10, 0x0e, 0x01, 0x1e),
    t: g(0, 4, 0b0100, 0b0100, 0b1110, 0b0100, 0b0100, 0b0101, 0b0010),
    u: g(2, 5, 0x11, 0x11, 0x11, 0x13, 0x0d),
    v: g(2, 5, 0x11, 0x11, 0x11, 0x0a, 0x04),
    w: g(2, 5, 0x11, 0x15, 0x15, 0x15, 0x0a),
    x: g(2, 5, 0x11, 0x0a, 0x04, 0x0a, 0x11),
    y: g(2, 5, 0x11, 0x11, 0x11, 0x11, 0x0f, 0x01, 0x0e),
    z: g(2, 5, 0x1f, 0x02, 0x04, 0x08, 0x1f),
    '0': g(0, 5, 0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e),
    '1': g(0, 5, 0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e),
    '2': g(0, 5, 0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f),
    '3': g(0, 5, 0x1e, 0x01, 0x01, 0x0e, 0x01, 0x01, 0x1e),
    '4': g(0, 5, 0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02),
    '5': g(0, 5, 0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e),
    '6': g(0, 5, 0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e),
    '7': g(0, 5, 0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08),
    '8': g(0, 5, 0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e),
    '9': g(0, 5, 0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c),
  };
  return F;
})();

/* Built-in text rasteriser (fallback when no GDI-style hook is supplied).
 *
 * Rasteriser hook contract (opts.textRasterizer):
 *   fn({ tmap, dim, positions, cellH, weight, italic, fontIndex, str, scale })
 *     tmap      Uint8Array(dim*dim) — white-text intensity, merge with max()
 *     dim       texture dimension in pixels (256*scale)
 *     positions [{x, y}] pixel-space GDI TextOut top-left positions
 *               (multiple entries implement the wrap-around copies)
 *     cellH     GDI cell height in pixels (= 2*size*scale)
 *     weight    GDI lfWeight (0 or 100..1500), italic  boolean
 *     fontIndex 0 Arial, 1 Courier New, 2 Times New Roman, 3 Symbol
 */
function builtinTextRasterizer({ tmap, dim, positions, cellH, weight, italic, str }) {
  const u = cellH / 10;                // design unit (7 ascent + 2 desc + 1 lead)
  const bold = weight >= 600;
  for (const pos of positions) {
    let penX = pos.x;
    const topY = pos.y + u;            // internal leading
    for (const chRaw of str) {
      const gl = FONT[chRaw] || FONT[chRaw.toLowerCase()] || FONT[' '];
      const rows = gl.rows || [];
      for (let r = 0; r < rows.length; r++) {
        const mask = rows[r];
        if (!mask) continue;
        const yTop = topY + (gl.top + r) * u;
        const yBot = topY + (gl.top + r + 1) * u;
        const shear = italic ? (pos.y + 8 * u - yBot) * 0.21 : 0;
        for (let c = 0; c < gl.w; c++) {
          if (!(mask & (1 << (gl.w - 1 - c)))) continue;
          const xL = penX + c * u + shear;
          const xR = penX + (c + 1) * u + shear + (bold ? Math.max(1, u * 0.18) : 0);
          for (let py = Math.round(yTop); py < Math.round(yBot); py++) {
            if (py < 0 || py >= dim) continue;
            for (let px = Math.round(xL); px < Math.round(xR); px++) {
              if (px < 0 || px >= dim) continue;
              tmap[py * dim + px] = 255;
            }
          }
        }
      }
      penX += (gl.w + 0.5) * u;
    }
  }
}

/* op 0x29 — text: saturating byte-add of white text onto the layer.
 * SCALING: position and GDI cell height (2*size) multiplied by S; the
 * rasteriser (pluggable — see gdi_text.mjs) renders straight into the S×
 * map, i.e. genuinely re-rasterised at the higher resolution. */
function textOp(st, li, str, font, size, style, x, y, wrap) {
  const L = st.layer[li], D = st.D, S = st.S;
  const tmap = new Uint8Array(st.N);
  const weight = (style & 0xf) * 100;
  const italic = (style >> 4) !== 0;
  const xs = x * S, ys = y * S;
  const positions = [{ x: xs, y: ys }];
  if (wrap) positions.push({ x: xs - D, y: ys },
                           { x: xs - D, y: ys - D },
                           { x: xs, y: ys - D });
  st.textRasterizer({
    tmap, dim: D, positions, cellH: size * 2 * S,
    weight, italic, fontIndex: font & 3, str, scale: S,
  });
  for (let i = 0; i < st.N; i++) {
    const t = tmap[i];
    if (!t) continue;
    const p = L[i];
    let r = ((p >>> 16) & 0xff) + t; if (r > 0xff) r = 0xff;
    let g = ((p >>> 8) & 0xff) + t; if (g > 0xff) g = 0xff;
    let b = (p & 0xff) + t; if (b > 0xff) b = 0xff;
    L[i] = ((p & 0xff000000) | (r << 16) | (g << 8) | b) >>> 0;
  }
}

/* ------------------------------------------------------------------ */
/*  Interpreter (ads_loadatg)                                         */
/* ------------------------------------------------------------------ */

const OP_NAMES = {
  0x01: 'fractalplasma', 0x02: 'plasma', 0x03: 'cells', 0x04: 'envmap',
  0x05: 'subplasma', 0x06: 'clear', 0x0a: 'sinedistort', 0x0b: 'offset',
  0x0c: 'twirl', 0x0e: 'bump', 0x0f: 'blur', 0x11: 'mapdistort',
  0x12: 'dirblur', 0x14: 'exchange', 0x15: 'torgb', 0x17: 'copylayer',
  0x18: 'mix', 0x19: 'mul', 0x1a: 'add', 0x1b: 'max', 0x1e: 'contrast',
  0x1f: 'invert', 0x20: 'shade', 0x21: 'brightness', 0x22: 'sinecolor',
  0x23: 'scalecolor', 0x24: 'hsv', 0x25: 'colorize', 0x26: 'mixmap',
  0x27: 'emboss', 0x28: 'loadbitmap', 0x29: 'text',
};

export function runAtg(bytes, opts) {
  let scale = 1, textRasterizer = null;
  if (typeof opts === 'number') scale = opts;
  else if (opts && typeof opts === 'object') {
    scale = opts.scale || 1;
    textRasterizer = opts.textRasterizer || null;
  }
  if (!Number.isInteger(scale) || scale < 1 || (scale & (scale - 1)) !== 0)
    throw new Error(`ATG: scale must be a power-of-two integer >= 1 (got ${scale})`);

  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (b.length < 4 || b[0] !== 0x41 || b[1] !== 0x54 || b[2] !== 0x47)
    throw new Error('not an ATG file (missing "ATG" magic)');
  const count = b[3];
  const st = new AtgState(scale, textRasterizer);

  let base = 4;     // record base offset (advanced by 0x2000/0x80 for data ops)
  let rel = 0;      // 9 bytes per record
  for (let n = 0; n < count; n++) {
    const off = base + rel;
    const r = b.subarray(off, off + 9);
    const op = r[0], li = r[1];
    if (li < 4) {
      switch (op) {
        case 0x01: fractalplasma(st, li, r[2], r[4], r[5], r[6], r[7]); break;
        case 0x02: plasma(st, li, r[8], r[2], r[3], r[4], r[5]); break;
        case 0x03: cells(st, li, r[2], r[3], r[4], r[5], r[6], r[7], r[8]); break;
        case 0x04: envmap(st, li, r[2], r[3], r[4]); break;
        case 0x05: subplasma(st, li, r[2], r[3], r[4], r[5], r[6], r[7]); break;
        case 0x06: st.layer[li].fill(0); break;
        case 0x0a: sinedistort(st, li, r[2], r[3], r[4], r[5], r[6], r[7]); break;
        case 0x0b: offset(st, li, r[2], r[3]); break;
        case 0x0c: twirl(st, li, r[2]); break;
        case 0x0e: bump(st, li, r[2]); break;
        case 0x0f: blur(st, li, r[2]); break;
        case 0x11: mapdistort(st, li, r[2] & 3, r[3], r[4], r[5] & 3, r[6], r[7]); break;
        case 0x12: dirblur(st, li, r[2] & 3, r[3], r[4]); break;
        case 0x14: exchange(st, li, r[2], r[3] & 3, r[4]); break;
        case 0x15: torgb(st, li, r[2]); break;
        case 0x17: copylayer(st, li, r[2], r[3] & 3, r[4]); break;
        case 0x18: mix(st, li, r[2] & 3, r[3]); break;
        case 0x19: mul(st, li, r[2] & 3); break;
        case 0x1a: add(st, li, r[2] & 3); break;
        case 0x1b: amax(st, li, r[2] & 3); break;
        case 0x1e: contrast(st, li, r[2]); break;
        case 0x1f: invert(st, li); break;
        case 0x20: shade(st, li, r[2] & 3, r[3]); break;
        case 0x21: brightness(st, li, r[2]); break;
        case 0x22: sinecolor(st, li, r[2], r[3]); break;
        case 0x23: scalecolor(st, li, r[2], r[3], r[4]); break;
        case 0x24: hsvOp(st, li, r[2], r[3]); break;
        case 0x25: colorize(st, li, r[2], r[3], r[4], r[5], r[6], r[7], r[8]); break;
        case 0x26: mixmap(st, li, r[2] & 3, r[3] & 3, r[4]); break;
        case 0x27: emboss(st, li); break;
        case 0x28: {
          const bits = b.subarray(off + 9, off + 9 + 0x2000);
          loadbitmap(st, li, bits,
                     (r[2] << 16 | r[3] << 8 | r[4]) >>> 0,
                     (r[5] << 16 | r[6] << 8 | r[7]) >>> 0);
          base += 0x2000;
          break;
        }
        case 0x29: {
          const raw = b.subarray(off + 9, off + 9 + 0x80);
          let str = '';
          for (const c of raw) { if (!c) break; str += String.fromCharCode(c); }
          textOp(st, li, str, r[2], r[3], r[4], r[5], r[6], r[7]);
          base += 0x80;
          break;
        }
        default:
          throw new Error(`ATG: unknown/unimplemented opcode 0x${op.toString(16)}` +
                          ` (record ${n})`);
      }
    }
    // NB: like the original, records with layer >= 4 do NOT advance `base`,
    // even for 0x28/0x29 — a desync quirk faithfully preserved.
    rel += 9;
  }

  // layer 0 is the result; convert 0x00RRGGBB -> RGBA
  const rgba = new Uint8ClampedArray(st.N * 4);
  const L0 = st.layer[0];
  for (let i = 0; i < st.N; i++) {
    const p = L0[i];
    rgba[i * 4] = (p >>> 16) & 0xff;
    rgba[i * 4 + 1] = (p >>> 8) & 0xff;
    rgba[i * 4 + 2] = p & 0xff;
    rgba[i * 4 + 3] = 0xff;
  }
  return { width: st.D, height: st.D, rgba };
}

export { OP_NAMES };
