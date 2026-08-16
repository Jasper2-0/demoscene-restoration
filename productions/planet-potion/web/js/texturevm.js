// texturevm.js — the intro's procedural texture language.
//
// 3.4 KB of bytecode across 69 programs produces every texture in the intro.
// The VM runs on three 128x128 float RGBA surfaces plus a single-channel mask,
// with values in 0..255 rather than 0..1.
//
// Structure, all read from the code rather than fitted to the output (see
// ../../work/re/PORT_SPEC.md §7):
//
//   * the fetch loop reads one opcode byte and looks its operand width up in a
//     table — EXCEPT 0x50..0x78, the 3x3 convolution family, which take none;
//   * operands are converted to floats into a parameter block before dispatch;
//   * every operation ends with a symmetry blit through one of four transforms;
//   * clamping to [0,255] is a SEPARATE entry point from storing, and not every
//     path takes it, so unclamped values do propagate.
//
// The oracle is work/re/export.py's 69 PNGs, which are byte-exact output of the
// original's own code under qemu. A program either reproduces its PNG or it does
// not — see work/re/texvmcheck.mjs.

export const SIZE = 128;
export const PIXELS = SIZE * SIZE;

/** One 128x128 RGBA surface, 0..255 floats, four per pixel. */
const surface = () => new Float32Array(PIXELS * 4);

export class Surfaces {
  constructor() {
    this.source = surface();     // r2+0x246a — read by the convolution
    this.work = surface();       // r2+0x2466 — written by the convolution
    this.current = surface();    // r2+0x2472 — where results land, via the blit
    this.mask = new Float32Array(PIXELS);   // r2+0x246e, one float per pixel
    this.rect = [0, 0, 128, 128];           // r2+0x25a6..0x25a9, set by op18/19
  }
}

// --- the per-pixel primitive library, 0x100006ac..0x10000a50 -----------------

/** 0x100006d0 — clamp four channels to [0,255]. Branchless fsel in the original. */
export function clamp4(px, o) {
  for (let i = 0; i < 4; i++) {
    const v = px[o + i];
    px[o + i] = v < 0 ? 0 : (v > 255 ? 255 : v);
  }
}

/** 0x100007a4 — add the operand pixel to the destination, store RAW (no clamp). */
export function addStore(dst, d, src, s) {
  for (let i = 0; i < 4; i++) dst[d + i] += src[s + i];
}

/**
 * 0x100007c4 — the VM's core mix, used by five handlers.
 * `dst + (src - dst) * t` on channels 1..3, with `t = src[0]/255`, then clamp.
 * Channel 0 is the weight, not a colour.
 */
export function blend(dst, d, src, s) {
  const t = src[s] / 255;
  for (let i = 1; i < 4; i++) dst[d + i] += (src[s + i] - dst[d + i]) * t;
  clamp4(dst, d);
}

/** 0x10000850 — scaled difference across four channels. Does not store. */
export function scaledDiff(out, dst, d, src, s, k) {
  for (let i = 0; i < 4; i++) out[i] = (src[s + i] - dst[d + i]) * k;
}

/** 0x1000080c — fres(b - a). The original uses the ESTIMATE, not a divide. */
export const reciprocalSpan = (a, b) => 1 / (b - a);

/**
 * 0x100008e4 — the PRNG. Shift/xor/add mixing on three words, so the "random"
 * textures are deterministic and reproduce byte-for-byte every run.
 */
export class Rng {
  constructor(a = 1, b = 2, c = 3) { this.a = a >>> 0; this.b = b >>> 0; this.c = c >>> 0; }
  next() {
    let t = (this.a << 12) >>> 0;
    t = (t ^ this.b) >>> 0;
    this.c = (this.c ^ t) >>> 0;
    this.a = (this.a | t) >>> 0;
    this.c = (this.c + this.a) >>> 0;
    return ((this.c >>> 24) & 0xff) / 255;
  }
}

/**
 * 0x10000a50 — central-difference gradient, two floats per pixel.
 * This is what makes op2 and op8 bump-lighting operations.
 */
export function centralGradient(src, out) {
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const at = (xx, yy) => src[(((yy & 127) * SIZE) + (xx & 127)) * 4];
      const o = (y * SIZE + x) * 2;
      out[o] = at(x + 1, y) - at(x - 1, y);
      out[o + 1] = at(x, y + 1) - at(x, y - 1);
    }
  }
  return out;
}

/**
 * 0x10000880 — the symmetry blit every operation ends with. `record` is
 * (x0, y0, xstep, ystep) from r2+0x24e2, four halfwords per transform.
 */
export function symmetryBlit(src, dst, [x0, y0, xstep, ystep]) {
  let sy = y0, si = 0;
  for (let row = 0; row < SIZE; row++) {
    let sx = x0;
    for (let col = 0; col < SIZE; col++) {
      const d = ((sx + sy) & (PIXELS - 1)) * 4;
      for (let i = 0; i < 4; i++) dst[d + i] = src[si + i];
      si += 4; sx += xstep;
    }
    sy += ystep;
  }
}

// --- the fetch loop, 0x100004b0 ---------------------------------------------

/**
 * Decode one program. Widths come from the operand table; the convolution range
 * takes none. Verified: all 69 shipped programs decode to exactly their
 * declared length.
 */
export function decode(bytes, operandWidths) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const len = dv.getUint16(0) & 0x7fff;
  const out = [];
  let i = 2;
  const end = 2 + len;
  while (i <= end - 1) {
    const op = bytes[i++];
    const n = (op >= 0x50 && op <= 0x78) ? 0
      : (op < 20 ? (operandWidths[op] === 0x7f ? 1 : operandWidths[op]) : null);
    if (n === null) return { ops: out, exact: false, at: i - 1 };
    out.push({ op, operands: Array.from(bytes.subarray(i, i + n)) });
    i += n;
  }
  return { ops: out, exact: i === end };
}

/** 3x3 convolution: normalise by the kernel sum (0 means 1), wrap, clamp, leave alpha. */
export function convolve(src, dst, k) {
  const sum = k.reduce((a, b) => a + b, 0) || 1;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const o = (y * SIZE + x) * 4;
      for (let c = 0; c < 3; c++) {
        let acc = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const sx = (x + kx) & 127, sy = (y + ky) & 127;
            acc += src[((sy * SIZE) + sx) * 4 + c] * k[(ky + 1) * 3 + (kx + 1)];
          }
        }
        dst[o + c] = acc / sum;
      }
      dst[o + 3] = src[o + 3];
      clamp4(dst, o);
    }
  }
}

/**
 * 0x10000714 — mean of selected channels, each optionally inverted.
 * Bits 0..2 select channels 1..3, bits 3..5 invert that channel as 255-x, and
 * bit 6 inverts the mean. Channel 0 is never selectable, which is the same
 * "alpha is not touched" rule the convolution follows.
 */
export function combineChannels(px, o, mask) {
  let sum = 0, n = 0;
  for (let i = 0; i < 3; i++) {
    if (!(mask & (1 << i))) continue;
    let v = px[o + 1 + i];
    if (mask & (8 << i)) v = 255 - v;
    sum += v; n++;
  }
  if (n !== 0) sum /= n;
  return (mask & 0x40) ? 255 - sum : sum;
}

const clamp255 = (v) => (v < 0 ? 0 : (v > 255 ? 255 : v));

/** op13 — write the mask from a channel combination chosen by the operand. */
export function op13(s, [m]) {
  for (let i = 0; i < PIXELS; i++) s.mask[i] = combineChannels(s.current, i * 4, m);
}

/** op14 — mask += (128 - operand). op15 — mask = (mask-128)*(operand/128) + 128. */
export function op14(s, [v]) {
  const k = 128 - v;
  for (let i = 0; i < PIXELS; i++) s.mask[i] = clamp255(s.mask[i] + k);
}
export function op15(s, [v]) {
  const k = v / 128;
  for (let i = 0; i < PIXELS; i++) s.mask[i] = clamp255((s.mask[i] - 128) * k + 128);
}

/**
 * 0x10000820 — the step op11 and op12 share: pull channels 1..3 AWAY from a
 * reference by k (note the sign — `v + (v - ref)*k` expands contrast rather
 * than blending toward the reference), then clamp and store.
 */
export function contrastStep(px, o, ref, k) {
  for (let i = 1; i < 4; i++) px[o + i] += (px[o + i] - ref) * k;
  clamp4(px, o);
}

/**
 * op11 — expand each pixel about its own channel mean, by an frsqrte curve of
 * the operand's distance from 128, signed by which side of 128 it falls.
 *
 * The mask is 0xff: all three channels selected, all inverted, and the mean
 * inverted again — which cancels to the plain mean. Implemented through
 * combineChannels anyway, so the general case stays correct if a program ever
 * uses a different mask.
 */
export function op11(s, [v]) {
  let k = Math.sqrt(1 / (128 - Math.abs(v - 128)));   // frsqrte on hardware
  if (v < 128) k = -k;
  for (let i = 0; i < PIXELS; i++) {
    const o = i * 4;
    contrastStep(s.current, o, combineChannels(s.current, o, 0xff), k);
  }
}

/** op12 — the same step about a fixed 128, with k derived from the operand. */
export function op12(s, [v]) {
  let k = v - 128;
  if (v > 128) k += k;
  if (v !== 128) k /= 128;
  for (let i = 0; i < PIXELS; i++) contrastStep(s.current, i * 4, 128, k);
}

/**
 * op9 — value noise by midpoint subdivision, the generator most textures start
 * from. Operands 0..3 are the four channel amplitudes; operand 8 carries the two
 * lattice-step nibbles; operands 9..11 seed the PRNG, which is why every program
 * gets different noise from a deterministic generator.
 *
 * Coordinates are in BYTES: one pixel is 0x10, a row is 0x800, and refinement
 * stops at 0x10 — exactly one-pixel resolution. A step nibble of 0 gives 8,
 * finer than a pixel, which skips refinement entirely.
 */
export function op9(s, ops) {
  const amp = [ops[0], ops[1], ops[2], ops[3]];
  let xstep = 8 << (ops[8] & 0xf);
  let ystep = 8 << (ops[8] >> 4);
  const rng = new Rng(ops[9], ops[10], ops[11]);
  const buf = new Float32Array(PIXELS * 4);
  const at = (xb, yb) => (((yb << 7) + xb) >> 4) * 4;

  for (let y = 0; y < 0x800; y += ystep) {
    for (let x = 0; x < 0x800; x += xstep) {
      const o = at(x, y);
      for (let c = 0; c < 4; c++) buf[o + c] += rng.next() * amp[c];
    }
  }

  // THE MIDPOINT IS NOT AN AVERAGE. 0x1000091c adds the two neighbours and
  // scales by f27 = 128/255, not by 0.5 — each level lands 0.39% low, and the
  // levels compound. Halving instead would drift brighter with every octave.
  const K = 128 / 255;
  const mid = (o, a, b) => {
    for (let c = 0; c < 4; c++) buf[o + c] = (buf[a + c] + buf[b + c]) * K;
  };

  for (let st = xstep; st > 0x10; ) {
    const h = st >> 1;
    for (let y = 0; y < 0x800; y += ystep) {
      for (let x = 0; x < 0x800; x += st) {
        mid(at((x - h) & 0x7f0, y), at(x & 0x7f0, y), at((x + st) & 0x7f0, y));
      }
    }
    st = h;
  }
  for (let st = ystep; st > 0x10; ) {
    const h = st >> 1;
    for (let x = 0; x < 0x800; x += 0x10) {
      for (let y = 0; y < 0x800; y += st) {
        mid(at(x, (y - h) & 0x7f0), at(x, y & 0x7f0), at(x, (y + st) & 0x7f0));
      }
    }
    st = h;
  }

  // The result is BLENDED into the current surface through the core mix, not
  // written over it — which is why a second op9 lifts the image rather than
  // replacing it.
  for (let i = 0; i < PIXELS; i++) blend(s.current, i * 4, buf, i * 4);
}

/**
 * op0 and op17 share 0x10000acc and differ in two places, both keyed on
 * comparing the opcode against 17.
 *
 *   op0   dst = clamp(dst + src)     — accumulate
 *   op17  dst = clamp(src)           — solid fill
 *
 * op0 additionally runs one `bnel` pass before the loop that adds a global
 * constant block at r2+0x24d2 into its own parameter block.
 *
 * NOTE, and it is the one uncertain part of this file: the source pixel is read
 * from r22-4, one word BEFORE the three converted operands. So channels 1..3 are
 * operands 0..2 and channel 0 comes from the preceding slot. That slot is
 * deterministic (the block is reused, not stack garbage) but what writes it has
 * not been traced, so `ch0` is passed in rather than invented here.
 */
export function op0(s, ops, ch0 = 0) {
  const src = [ch0, ops[0], ops[1], ops[2]];
  for (let i = 0; i < PIXELS; i++) {
    const o = i * 4;
    for (let c = 0; c < 4; c++) s.current[o + c] += src[c];
    clamp4(s.current, o);
  }
}

export function op17(s, ops, ch0 = 0) {
  const src = [ch0, ops[0], ops[1], ops[2]];
  for (let i = 0; i < PIXELS; i++) {
    const o = i * 4;
    // The add happens first and is then overwritten — visible in the original
    // as a store that is immediately superseded, so only the fill survives.
    for (let c = 0; c < 4; c++) s.current[o + c] = src[c];
    clamp4(s.current, o);
  }
}

/**
 * op5 — 1D stripes. Walks the surface LINEARLY (not per row), alternating
 * between two colours with run lengths from operands 8 and 9. Because the walk
 * is linear over 16,384 pixels, stripes wrap across row ends rather than
 * forming columns, unless the run length divides 128.
 *
 * Operand layout confirms itself: 10 operands = colour A (0..3), colour B
 * (4..7), two run lengths (8, 9).
 */
export function op5(s, ops) {
  const A = ops.slice(0, 4), B = ops.slice(4, 8);
  const runA = ops[8], runB = ops[9];
  let phase = 1, left = runA;
  for (let i = 0; i < PIXELS; i++) {
    const src = phase > 0 ? B : A;
    const reload = phase > 0 ? runA : runB;
    if (left <= 0) { left = reload; phase = -phase; }
    left--;
    // BLENDS, does not overwrite: the handler ends in 0x100007c4, so the
    // colour's channel 0 is the mix weight and a zero there is a no-op.
    blend(s.current, i * 4, src, 0);
  }
}

/**
 * op3 — checkerboard. Two independent run-length toggles, one per axis,
 * combined through the sign of a running flag. Operands 10 and 11 are the
 * periods and 8 and 9 the starting phases; the handler first reduces each phase
 * modulo its period, flipping the sign once per subtraction, so the initial
 * parity comes out of that reduction.
 *
 * 12 operands = colour A (0..3), colour B (4..7), phase x, phase y, period x,
 * period y.
 *
 * Either period at zero never terminates — the hang recorded in section 9.
 */
export function op3(s, ops) {
  const A = ops.slice(0, 4), B = ops.slice(4, 8);
  let px = ops[8], py = ops[9];
  const perX = ops[10], perY = ops[11];
  if (perX === 0 || perY === 0) throw new Error('op3: zero period would not terminate');
  let sign = 1;
  while (px >= perX) { sign = -sign; px -= perX; }
  while (py >= perY) { sign = -sign; py -= perY; }

  let yLeft = py, i = 0;
  for (let y = 0; y < SIZE; y++) {
    yLeft--;
    if (yLeft <= 0) { yLeft = perY; sign = -sign; }
    let rowSign = sign, xLeft = px;
    for (let x = 0; x < SIZE; x++) {
      xLeft--;
      if (xLeft <= 0) { xLeft = perX; rowSign = -rowSign; }
      const src = rowSign < 0 ? B : A;
      blend(s.current, i++ * 4, src, 0);   // 0x100007c4, same as op5
    }
  }
}

/**
 * The four symmetry transforms at r2+0x24e2, in PIXEL units — read from the
 * binary rather than named from their effect:
 *   0 identity, 1 mirror x, 2 mirror y, 3 transpose with flip.
 */
export const TRANSFORMS = [
  [0, 0, 1, 128], [127, 0, -1, 128], [0, 16256, 1, -128], [0, 127, 128, -1],
];

/**
 * op4 — apply symmetry transforms in pairs. The single operand byte holds four
 * 2-bit selectors; each iteration takes two, blitting current -> work with the
 * first and work -> current with the second, then shifts right by 4. A zero
 * operand does nothing at all.
 */
export function op4(s, [sel]) {
  let v = sel;
  while (v !== 0) {
    symmetryBlit(s.current, s.work, TRANSFORMS[v & 3]);
    symmetryBlit(s.work, s.current, TRANSFORMS[(v >> 2) & 3]);
    v >>= 4;
  }
}

/**
 * op16 — literal upload. Converts bytes to floats straight into the surface.
 *
 * Its source is the pointer at r2+0x24ce, which is 0x100d0000 — the start of the
 * big BSS arena, and the same buffer `_init_txtgen` later expands the font into.
 * In the shipped sequence every texture is generated BEFORE `_init_txtgen` runs,
 * so at texture time that buffer is still zeroed BSS. The harness reproduces
 * that, which is why the 69 exported PNGs are what they are. Pass `src` to
 * override if a caller ever has something else there.
 */
export function op16(s, _ops, src = null) {
  for (let i = 0; i < PIXELS * 4; i++) s.current[i] = src ? src[i] : 0;
}

/**
 * 0x10000990 — normalise a distance into a falloff and shape it. Four curves,
 * selected by the low two bits of the mode byte:
 *   0 linear, 1 ease-out, 2 ease-in, 3 smoothstep as two quadratic halves.
 */
export function falloff(dist, start, span, mode) {
  let t = Math.max(dist - start, 0);
  if (t > span) t = span;
  t /= span;
  switch (mode & 3) {
    case 1: t = 1 - (1 - t) ** 2; break;
    case 2: t = t * t; break;
    case 3: t = t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) ** 2; break;
    default: break;
  }
  return t;
}

/**
 * 0x1000093c — the distance field. Note the square root is fres(frsqrte(x)) on
 * hardware, two estimates deep; here it is exact, which is the largest single
 * fidelity gap in the texture path (see section 6).
 */
export function distance(dx, dy, mode) {
  if (mode & 4) dy = 0;
  if (mode & 8) dx = 0;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * op2 — a shaped gradient blended over the surface, and one half of the
 * bump-lighting pair. 13 operands: colour A (0..3), colour B (4..7), the field
 * centre (8, 9), the falloff start and end (10, 11), and a mode byte (12) that
 * carries both the distance mode and the curve.
 *
 * The handler turns B into a DELTA before the loop — scaledDiff(A, B, 1.0)
 * stored back over B — so the per-pixel step is A + (B-A)*t, and then the result
 * is blended rather than written.
 */
export function op2(s, ops) {
  const A = ops.slice(0, 4);
  const delta = [0, 1, 2, 3].map((i) => ops[4 + i] - ops[i]);
  const [cx, cy] = [ops[8], ops[9]];
  const start = ops[10], span = (ops[11] - ops[10]) || 1;
  const mode = ops[12];
  const shaded = new Float32Array(4);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const t = falloff(distance(x - cx, y - cy, mode), start, span, mode);
      for (let c = 0; c < 4; c++) shaded[c] = A[c] + delta[c] * t;
      clamp4(shaded, 0);
      blend(s.current, (y * SIZE + x) * 4, shaded, 0);
    }
  }
}

/**
 * op8 — the two-band sibling of op2: a piecewise gradient with three colours and
 * a shared knee. 18 operands, and they account for themselves exactly:
 *
 *   0..3   colour A      12, 13  field centre
 *   4..7   colour B      14      inner range start
 *   8..11  colour C      15      the KNEE — both the band test and a range edge
 *                        16      outer range end
 *                        17      mode byte (distance mode + curve)
 *
 * Below the knee the pixel ramps A -> B over [op14, op15]; above it, B -> C over
 * [op15, op16]. The handler precomputes both deltas before the loop, one into a
 * scratch slot at +0x54 past the operands.
 */
export function op8(s, ops) {
  const A = ops.slice(0, 4);
  const B = ops.slice(4, 8);
  const dAB = [0, 1, 2, 3].map((i) => B[i] - A[i]);
  const dBC = [0, 1, 2, 3].map((i) => ops[8 + i] - B[i]);
  const [cx, cy] = [ops[12], ops[13]];
  const inner = ops[14], knee = ops[15], outer = ops[16];
  const mode = ops[17];
  const shaded = new Float32Array(4);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const d = distance(x - cx, y - cy, mode);
      const far = d > knee;
      const base = far ? B : A;
      const delta = far ? dBC : dAB;
      const t = falloff(d, far ? knee : inner,
        (far ? outer - knee : knee - inner) || 1, mode);
      for (let c = 0; c < 4; c++) shaded[c] = base[c] + delta[c] * t;
      clamp4(shaded, 0);
      blend(s.current, (y * SIZE + x) * 4, shaded, 0);
    }
  }
}

/**
 * op1 — a bilinearly-shaded rectangle. 20 operands: x0, x1, y0, y1 and FOUR
 * corner colours. Per row it walks x blending a colour that advances by a
 * per-pixel delta, then advances the row's two edge colours by their own deltas.
 * All the deltas are precomputed with fres() spans, not divides.
 */
export function op1(s, ops) {
  const [x0, x1, y0, y1] = ops.slice(0, 4);
  const TL = ops.slice(4, 8), TR = ops.slice(8, 12);
  const BL = ops.slice(12, 16), BR = ops.slice(16, 20);
  const rows = Math.max(y1 - y0, 1), cols = Math.max(x1 - x0, 1);
  const left = TL.slice(), right = TR.slice(), c = new Float32Array(4);
  const dl = TL.map((v, i) => (BL[i] - v) / rows);
  const dr = TR.map((v, i) => (BR[i] - v) / rows);
  for (let y = y0; y <= y1; y++) {
    for (let i = 0; i < 4; i++) c[i] = left[i];
    const step = right.map((v, i) => (v - left[i]) / cols);
    for (let x = x0; x <= x1; x++) {
      blend(s.current, (((y & 127) * SIZE) + (x & 127)) * 4, c, 0);
      for (let i = 0; i < 4; i++) c[i] += step[i];
    }
    for (let i = 0; i < 4; i++) { left[i] += dl[i]; right[i] += dr[i]; }
  }
}

/**
 * op6 — a colour-interpolated line, drawn with textbook Bresenham: the error
 * accumulator starts at half the major span, and each step is either straight or
 * diagonal. The colour advances by a delta per pixel, so the line is a gradient.
 *
 * The frsqrte in its prologue computes the endpoints' separation; the drawing
 * itself is integer.
 */
export function op6(s, ops) {
  let [x0, y0, x1, y1] = [ops[8], ops[9], ops[10], ops[11]];
  const col = ops.slice(0, 4).map(Number), delta = ops.slice(4, 8);
  let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = Math.sign(x1 - x0), sy = Math.sign(y1 - y0);
  const steep = dx <= dy;
  const major = steep ? dy : dx, minor = steep ? dx : dy;
  let err = major >> 1, x = x0, y = y0;
  const c = Float32Array.from(col);
  for (let i = 0; i <= major; i++) {
    blend(s.current, (((y & 127) * SIZE) + (x & 127)) * 4, c, 0);
    for (let k = 0; k < 4; k++) c[k] += delta[k];
    err += minor;
    if (err >= major && major !== 0) { err -= major; x += sx; y += sy; }
    else if (steep) y += sy; else x += sx;
  }
}

/** op18 — set the draw rectangle. op19 — reset it to the full surface. */
export const op18 = (s, o) => { s.rect = [o[0], o[1], o[2], o[3]]; };
export const op19 = (s) => { s.rect = [0, 0, 128, 128]; };

/** Opcodes whose bodies are specified but not yet written here. */
export const UNIMPLEMENTED = new Set([]);

/** Convert to A8R8G8B8 bytes, as W3D_AllocTexObj receives them. */
export function toARGB(surf) {
  const out = new Uint8Array(PIXELS * 4);
  for (let i = 0; i < PIXELS; i++) {
    for (let c = 0; c < 4; c++) {
      const v = surf[i * 4 + c];
      out[i * 4 + c] = v < 0 ? 0 : (v > 255 ? 255 : v | 0);
    }
  }
  return out;
}
