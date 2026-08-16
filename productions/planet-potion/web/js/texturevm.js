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

// --- what `stfs` actually does here ------------------------------------------
//
// EVERY float32 store in this VM TRUNCATES. Not rounds — truncates. PowerPC
// treats a value in an FPR as already single-representable when `stfs` writes
// it, so the store is defined as a repack of the bits rather than a rounding
// conversion, and qemu implements exactly that: keep the sign and the top
// exponent bit, take the next 30 bits, drop the low 29 mantissa bits on the
// floor. A JS `Float32Array` assignment rounds to nearest, which is the sane
// thing and the wrong one.
//
// This was found from the other end. `op1`'s ramp was one level high at exactly
// the twelve pixels where the ideal value lands on `.5`, and reading the float
// surface out of the original (work/re/texfloat.py) gave a step of
// 3.363095283508301 where multiplying in JS gives 3.36309552192688 — one ulp
// apart, and the truncated one is the original's. A PPC probe storing the same
// product twice, once with `stfd` and once with `stfs`, showed the double
// 4.047619281336665 landing as 0x40818618 when correct rounding gives
// 0x40818619.
//
// The conversion is qemu's `helper_tosingle`, transcribed.
const _bits = new DataView(new ArrayBuffer(8));

/** PowerPC `stfs`: double -> single by truncation, not by rounding. */
export function f32(v) {
  _bits.setFloat64(0, v);
  const hi = _bits.getUint32(0), lo = _bits.getUint32(4);
  const s = ((hi & 0xc0000000) | ((((hi << 3) | (lo >>> 29)) >>> 0) & 0x3fffffff)) >>> 0;
  _bits.setUint32(0, s);
  return _bits.getFloat32(0);
}

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

const clamp1 = (v) => (v < 0 ? 0 : (v > 255 ? 255 : v));

/**
 * 0x100006d0 -> 0x10000700 — clamp four channels with `fsel`, then store.
 *
 * `vals` are the values as they sit in the FPRs, i.e. doubles; the store
 * truncates them. Callers must NOT write to the surface first and clamp
 * afterwards, because that would round on the way in and truncate a
 * already-rounded value on the way out.
 */
export function clampStore(px, o, vals) {
  for (let i = 0; i < 4; i++) px[o + i] = f32(clamp1(vals[i]));
}

/** 0x100006d0 in place, for the callers whose values are already in memory. */
export function clamp4(px, o) {
  for (let i = 0; i < 4; i++) px[o + i] = f32(clamp1(px[o + i]));
}

/** 0x100007a4 — add the operand pixel to the destination, store RAW (no clamp). */
export function addStore(dst, d, src, s) {
  for (let i = 0; i < 4; i++) dst[d + i] = f32(dst[d + i] + src[s + i]);
}

/**
 * 0x100007c4 — the VM's core mix, used by five handlers and by op2, op3, op5,
 * op8 and op9.
 *
 * THE DIRECTION IS THE OPPOSITE OF THE OBVIOUS ONE. The instruction is
 * `fnmsub f25, f25, f22, f21` = `f21 - f25*f22`, where f21 is the SOURCE
 * channel and f25 is `(src - dst)`. So:
 *
 *     out = src - (src - dst) * t          t = src[0]/255
 *
 * which gives the SOURCE at t = 0 and the DESTINATION at t = 1 — the weight runs
 * backwards from every convention. The guard is `fcmpo f22, f31`: when src[0] is
 * zero the differences are never computed, so the result is the source exactly.
 *
 * Writing this the intuitive way round produced black where the original writes
 * white, and cost exactly half the pixels of every checkerboard.
 *
 * Channel 0 of the destination is preserved: the three fnmsubs cover 1..3 only.
 */
const _mix = [0, 0, 0, 0];

export function blend(dst, d, src, s) {
  const t = src[s] / 255;
  _mix[0] = dst[d];                      // f26 is never touched, only re-stored
  for (let i = 1; i < 4; i++) _mix[i] = src[s + i] - (src[s + i] - dst[d + i]) * t;
  clampStore(dst, d, _mix);
}

/** 0x10000850 — scaled difference across four channels. Does not store. */
export function scaledDiff(out, dst, d, src, s, k) {
  for (let i = 0; i < 4; i++) out[i] = (src[s + i] - dst[d + i]) * k;
}

/**
 * 0x1000080c — fres(b - a). The original uses the ESTIMATE, not a divide, and
 * `fpest.py` settles what the estimate actually is under the harness that
 * produced the references: `fres` rounds its result to single precision,
 * `frsqrte` does not. So this is a float32 reciprocal, and computing it in
 * double costs exactly the delta-1 residue op1 was carrying.
 */
export const reciprocalSpan = (a, b) => Math.fround(1 / (b - a));

/**
 * 0x100008e4 — the PRNG. Shift/xor/add mixing on three words, so the "random"
 * textures are deterministic and reproduce byte-for-byte every run.
 */
export class Rng {
  /** State is (r12, r11, r14) — op9 seeds them from operands 10, 11 and 9. */
  constructor(r12, r11, r14) {
    this.r12 = r12 >>> 0; this.r11 = r11 >>> 0; this.r14 = r14 >>> 0;
  }

  next() {
    let t = (this.r12 << 12) >>> 0;
    t = (t ^ this.r11) >>> 0;
    this.r14 = (this.r14 ^ t) >>> 0;
    this.r12 = (this.r12 | t) >>> 0;
    this.r14 = (this.r14 + this.r12) >>> 0;
    const u = (this.r11 << 2) >>> 0;
    this.r11 = (this.r11 - this.r14) >>> 0;
    this.r14 = (this.r14 - u) >>> 0;
    // rlwinm r3, r14, 24, 24, 31 — byte 2, not the top byte.
    return (((this.r14 >>> 8) & 0xff) | 0) / 255;
  }
}

/**
 * 0x10000a50 — central-difference gradient, two floats per pixel.
 * This is what makes op2 and op8 bump-lighting operations.
 */
export function centralGradient(src, out, mask = 7) {
  // It samples a CHANNEL COMBINATION, not one channel: 0x10000a50 tails into
  // 0x10000714 through 0x10000a38, with the mask taken from the mode byte as
  // `rlwinm r14, r12, 28, 29, 31` = (mode >> 4) & 7.
  const at = (xx, yy) =>
    combineChannels(src, (((yy & 127) * SIZE) + (xx & 127)) * 4, mask);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
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

/**
 * 3x3 convolution: normalise by the kernel sum (0 means 1), wrap, clamp, leave
 * alpha.
 *
 * NOT a divide. `0x10000ff0` is `fres f18, f18` — the handler takes the
 * reciprocal ESTIMATE of the kernel sum and multiplies by it, which is exact
 * only when the sum is a power of two. That is why 0x50 (sum 8) and 0x5b
 * (sum -2) matched while 0x51 and 0x59 (sum 6) were one level off at two
 * subpixels each.
 */
export function convolve(src, dst, k) {
  const sum = k.reduce((a, b) => a + b, 0) || 1;
  const inv = Math.fround(1 / sum);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const o = (y * SIZE + x) * 4;
      // Channels 1..3 only. The handler accumulates f21, f20, f19 and stores
      // f25, f24, f23, leaving f26 — channel 0 — exactly as loaded. Channel 0
      // is the untouched one, not channel 3.
      _mix[0] = src[o];
      for (let c = 1; c < 4; c++) {
        let acc = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const sx = (x + kx) & 127, sy = (y + ky) & 127;
            acc += src[((sy * SIZE) + sx) * 4 + c] * k[(ky + 1) * 3 + (kx + 1)];
          }
        }
        _mix[c] = acc * inv;
      }
      clampStore(dst, o, _mix);
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
  for (let i = 0; i < PIXELS; i++) s.mask[i] = f32(combineChannels(s.current, i * 4, m));
}

/** op14 — mask += (128 - operand). op15 — mask = (mask-128)*(operand/128) + 128. */
export function op14(s, [v]) {
  const k = 128 - v;
  for (let i = 0; i < PIXELS; i++) s.mask[i] = f32(clamp255(s.mask[i] + k));
}
export function op15(s, [v]) {
  const k = v / 128;
  for (let i = 0; i < PIXELS; i++) s.mask[i] = f32(clamp255((s.mask[i] - 128) * k + 128));
}

/**
 * 0x10000820 — the step op11 and op12 share: pull channels 1..3 AWAY from a
 * reference by k (note the sign — `v + (v - ref)*k` expands contrast rather
 * than blending toward the reference), then clamp and store.
 */
export function contrastStep(px, o, ref, k) {
  _mix[0] = px[o];
  for (let i = 1; i < 4; i++) _mix[i] = px[o + i] + (px[o + i] - ref) * k;
  clampStore(px, o, _mix);
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
  // frsqrte, which is 1/sqrt in full double under the harness — not sqrt(1/x),
  // which rounds differently on the way through.
  let k = 1 / Math.sqrt(128 - Math.abs(v - 128));
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
  // The handler loads r16 = r22+0 and r15 = r22+0x10, then `fmadd f26, f18,
  // f22, f26` = rng*amp + base. So operands 0..3 are the BASE colour and 4..7
  // the amplitudes — not the other way round.
  const base = [ops[0], ops[1], ops[2], ops[3]];
  const amp = [ops[4], ops[5], ops[6], ops[7]];
  // `li r9, 8` then `mulli r9, r9, 2; addic. r14, r14, -1; bge` is a DO-while:
  // it doubles once even when the nibble is zero. So the step is 16 << n, and
  // the minimum is exactly one pixel — never sub-pixel.
  let xstep = 16 << (ops[8] & 0xf);
  let ystep = 16 << (ops[8] >> 4);
  const rng = new Rng(ops[10], ops[11], ops[9]);   // r12, r11, r14
  // +4 because the last lattice point can start three floats from the end.
  const buf = new Float32Array(PIXELS * 4 + 4);
  // `slwi r16, r24, 7; add r16, r16, r25` — a BYTE offset, and with a step of 8
  // (nibble 0) the lattice lands mid-pixel, so consecutive points overlap by two
  // channels. Snapping to pixel boundaries loses that aliasing, which is part of
  // the noise's character rather than an artefact to clean up.
  const at = (xb, yb) => ((yb << 7) + xb) >> 2;

  for (let y = 0; y < 0x800; y += ystep) {
    for (let x = 0; x < 0x800; x += xstep) {
      const o = at(x, y);
      for (let c = 0; c < 4; c++) buf[o + c] = base[c] + rng.next() * amp[c];
      // (clamp4 below is the store, so the values land truncated there)
      // The seed store is `bl 0x100006d0` — the CLAMP entry, which falls into
      // the store. The refinement store below is `bl 0x10000700`, the raw one.
      // With base 36 and amplitude 255 the seed reaches 291, so the difference
      // is visible: unclamped seeds feed high midpoints one octave later.
      clamp4(buf, o);
    }
    // One extra draw per ROW — the `bl 0x100008e4` at 0x100011d8, between the x
    // loop ending and y advancing. Without it row 0 matches and everything after
    // is desynchronised by one value, which is exactly how this was found.
    rng.next();
  }

  // THE MIDPOINT IS NOT AN AVERAGE. 0x1000091c adds the two neighbours and
  // scales by f27 = 128/255, not by 0.5 — each level lands 0.39% low, and the
  // levels compound. Halving instead would drift brighter with every octave.
  const K = 128 / 255;
  const mid = (o, a, b) => {
    for (let c = 0; c < 4; c++) buf[o + c] = f32((buf[a + c] + buf[b + c]) * K);
  };

  for (let st = xstep; st > 0x10; ) {
    const h = st >> 1;
    for (let y = 0; y < 0x800; y += ystep) {
      for (let x = 0; x < 0x800; x += st) {
        // The original advances x BEFORE computing the destination:
        // `add r25, r25, r9` then `subf r16, r11, r25` = (x + step) − half.
        // So the midpoint sits at x + half, between x and x + step — writing it
        // at x − half puts every interpolated value one step early.
        mid(at((x + h) & 0x7f0, y), at(x & 0x7f0, y), at((x + st) & 0x7f0, y));
      }
    }
    st = h;
  }
  for (let st = ystep; st > 0x10; ) {
    const h = st >> 1;
    for (let x = 0; x < 0x800; x += 0x10) {
      for (let y = 0; y < 0x800; y += st) {
        mid(at(x, (y + h) & 0x7f0), at(x, y & 0x7f0), at(x, (y + st) & 0x7f0));
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
  // The pre-loop `bnel` adds the constant block at r2+0x24d2 — four −128.0
  // floats — into op0's own parameter block before the loop. So op0 adds a
  // SIGNED offset, `operand − 128`, which is why it can darken as well as
  // brighten. op17 skips that call and fills with the raw operands.
  const src = [ch0 - 128, ops[0] - 128, ops[1] - 128, ops[2] - 128];
  for (let i = 0; i < PIXELS; i++) {
    const o = i * 4;
    for (let c = 0; c < 4; c++) _mix[c] = s.current[o + c] + src[c];
    clampStore(s.current, o, _mix);
  }
}

export function op17(s, ops, ch0 = 0) {
  const src = [ch0, ops[0], ops[1], ops[2]];
  for (let i = 0; i < PIXELS; i++) {
    const o = i * 4;
    // The add happens first and is then overwritten — visible in the original
    // as a store that is immediately superseded, so only the fill survives.
    clampStore(s.current, o, src);
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
  const sq = dx * dx + dy * dy;
  if (sq === 0) return 0;
  // fres(frsqrte(x)) — and the two instructions do NOT round alike. `fpest.py`
  // ran both on known inputs and read the result bits back: `frsqrte` returns
  // the full double reciprocal square root, `fres` rounds to single. So exactly
  // ONE rounding falls here, on the outer reciprocal.
  const r = 1 / Math.sqrt(sq);
  return Math.fround(1 / r);
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
  // THE SPAN IS SUBTRACTED TWICE. op2's own body does `fsub f22, f22, f26`
  // before calling 0x10000990, which opens with the same instruction — so the
  // span is end - 2*start, not end - start. op8 does not pre-subtract, which is
  // why its span is the plain difference.
  const start = ops[10], span = (ops[11] - 2 * ops[10]) || 1;
  const mode = ops[12];
  // The distance is perturbed by the surface's own gradient — this is what makes
  // op2 bump LIGHTING rather than a plain radial gradient. On a flat surface the
  // term vanishes, which is why a single op2 on a blank canvas nearly matched
  // without it and every composed program did not.
  const g = centralGradient(s.current, new Float32Array(PIXELS * 2), (mode >> 4) & 7);
  const shaded = new Float32Array(4);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const gi = (y * SIZE + x) * 2;
      const t = falloff(distance(x - cx + g[gi], y - cy + g[gi + 1], mode),
        start, span, mode);
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
  const g = centralGradient(s.current, new Float32Array(PIXELS * 2), (mode >> 4) & 7);
  const shaded = new Float32Array(4);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const gi = (y * SIZE + x) * 2;
      const d = distance(x - cx + g[gi], y - cy + g[gi + 1], mode);
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
  // Written as the handler is, not as the shape it draws. The difference is not
  // cosmetic: every running value lives in the float32 parameter block, so each
  // accumulation rounds to single, and both steps come from `fres` rather than a
  // divide. A double-precision paraphrase of the same quad drew 36 subpixels one
  // level off — small enough to look like nothing, and not nothing.
  //
  //   P[0..3]   x0, x1, y0, y1
  //   P[4..11]  the top edge, left then right
  //   P[12..19] the bottom edge — but P[12..15] is REUSED as the running colour
  //             once the vertical deltas are out of it
  //   P[20..27] scratch: the per-row deltas   (r22+0x50)
  //   P[28..31] scratch: the per-pixel delta  (r22+0x70)
  const P = new Float32Array(32);
  for (let i = 0; i < ops.length; i++) P[i] = ops[i];
  const kv = reciprocalSpan(P[2], P[3]);          // 0x1000080c on r22+8
  for (let i = 0; i < 8; i++) P[20 + i] = f32((P[12 + i] - P[4 + i]) * kv);
  const kh = reciprocalSpan(P[0], P[1]);          // 0x1000080c on r22+0
  for (let y = ops[2]; y <= ops[3]; y++) {
    for (let i = 0; i < 4; i++) P[12 + i] = P[4 + i];
    for (let i = 0; i < 4; i++) P[28 + i] = f32((P[8 + i] - P[4 + i]) * kh);
    for (let x = ops[0]; x <= ops[1]; x++) {
      // `add r16, r25, r24; slwi r16, r16, 4` — no wrap. The handler trusts its
      // operands and would write past the surface if they left the square.
      blend(s.current, (y * SIZE + x) * 4, P, 12);
      for (let i = 0; i < 4; i++) P[12 + i] = f32(P[12 + i] + P[28 + i]);
    }
    for (let i = 0; i < 8; i++) P[4 + i] = f32(P[4 + i] + P[20 + i]);
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
  // EXCLUSIVE of the endpoint. The original's loop is `cmpw r8, r25; blt` with
  // r8 from 0, so it runs `major` times and never plots the final point —
  // visible as exactly one wrong pixel at (127,64) in p3_8.
  for (let i = 0; i < major; i++) {
    blend(s.current, (((y & 127) * SIZE) + (x & 127)) * 4, c, 0);
    for (let k = 0; k < 4; k++) c[k] = f32(c[k] + delta[k]);
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

/**
 * Convert to A8R8G8B8 bytes, as W3D_AllocTexObj receives them — the epilogue at
 * `0x10000618`, which is not the loop it looks like from the outside.
 *
 * THE ALPHA BYTE DOES NOT COME FROM THE SURFACE. The loop walks 65,536 bytes
 * and converts the surface float for every one of them, but on each iteration
 * where the counter is divisible by four it throws that result away and stores
 * `255 - mask` instead. So channel 0 of the current surface never reaches the
 * texture: the alpha is the mask, inverted, one float per pixel. The 69 PNG
 * references are RGB, so nothing in the whole-program diff could see this — it
 * showed up as a reference alpha of 255 everywhere against a computed 0.
 *
 * AND THE STORE IS `stbu`, NOT A CLAMP. `float2int` is a bare `fctiw`, and only
 * the low byte of the result is kept, so a surface value of 300 lands as 44 and
 * -5 lands as 251. Clamping here would be the sane choice and the wrong one.
 *
 * Takes the Surfaces object, because it needs both the colour and the mask.
 * Passing a bare Float32Array used to be the correct call and is now a bug, so
 * it throws rather than quietly emitting alpha from the wrong place.
 */
export function toARGB(s) {
  if (s instanceof Float32Array) {
    throw new TypeError('toARGB now needs the mask too — pass the Surfaces object');
  }
  if (!(s && s.current instanceof Float32Array && s.mask instanceof Float32Array)) {
    throw new TypeError('toARGB expects a Surfaces object');
  }
  // ROUND TO NEAREST, TIES TO EVEN — PowerPC's default fctiw mode, not
  // truncation. Measured across all 69 programs: truncating gives 29 exact and
  // 1,496,133 differing subpixels; nearest-even gives 30 and 1,460,146. The
  // giveaway was a ramp reading 87.83, 77.5 and 56.83 against a reference of
  // 88, 78 and 57 — every one rounded, none truncated.
  const fctiw = (v) => {
    if (!(v > -2147483648)) return -2147483648;    // NaN included
    if (v > 2147483647) return 2147483647;
    const f = Math.floor(v), d = v - f;
    return d > 0.5 ? f + 1 : (d < 0.5 ? f : (f % 2 === 0 ? f : f + 1));
  };
  const out = new Uint8Array(PIXELS * 4);
  for (let i = 0; i < PIXELS; i++) {
    out[i * 4] = fctiw(255 - s.mask[i]) & 0xff;
    for (let c = 1; c < 4; c++) {
      out[i * 4 + c] = fctiw(s.current[i * 4 + c]) & 0xff;
    }
  }
  return out;
}


/**
 * Run a decoded program. `kernels` maps 0x50..0x78 to nine weights.
 *
 * Convolutions read `source` and write `work`, everything else works on
 * `current`, and each operation ends with the symmetry blit — which is why the
 * blit is here rather than inside each opcode.
 */
export function run(ops, kernels, opts = {}) {
  const s = new Surfaces();
  const saved = new Float32Array(PIXELS * 4);
  // The mask is double-buffered the same way: _generate copies mask -> extra
  // before each opcode and extra -> mask afterwards, through the SAME clipped
  // path, so op13/14/15 are rectangle-bounded exactly like the colour ops.
  const savedMask = new Float32Array(PIXELS);
  for (const { op, operands } of ops) {
    // THE DRAW RECTANGLE CLIPS EVERY OPERATION. _generate reads r2+0x25a6..9
    // after each handler returns and uses it to bound the copy, so an opcode's
    // writes outside the rectangle never reach the surface. op18 sets it, op19
    // resets it to the full 0,0,128,128 — and p1_10 is op18(1,1,127,127) then a
    // solid fill, whose reference has an untouched one-pixel border.
    const clip = s.rect[0] !== 0 || s.rect[1] !== 0
      || s.rect[2] !== 128 || s.rect[3] !== 128;
    if (clip) { saved.set(s.current); savedMask.set(s.mask); }
    // The copy-back at 0x10000568 runs after EVERY opcode, the convolution
    // family included — it is in _generate's loop, not in any handler. Letting
    // the convolutions skip it blurred the whole surface where the original
    // blurs fifteen rows: p1_23 and p1_33 both end `op18(0,15,128,30)` then
    // 0x57, and both were wrong by ~32,000 subpixels for exactly this reason.
    if (op === 0x55) {
      // NOT a convolution: 0x55 sits inside the range but is an inversion,
      // max(255 - x, 0), per section 7. p3_17 is the only program that uses it.
      for (let i = 0; i < PIXELS; i++) {
        for (let c = 1; c < 4; c++) {
          const v = 255 - s.current[i * 4 + c];
          s.current[i * 4 + c] = f32(v < 0 ? 0 : v);
        }
      }
    } else if (op >= 0x50 && op <= 0x78) {
      const k = kernels[op];
      if (!k) throw new Error(`no kernel for ${op.toString(16)}`);
      s.source.set(s.current);
      convolve(s.source, s.work, k);
      s.current.set(s.work);
    } else switch (op) {
      case 0:  op0(s, operands, opts.ch0 ?? 0); break;
      case 1:  op1(s, operands); break;
      case 2:  op2(s, operands); break;
      case 3:  op3(s, operands); break;
      case 4:  op4(s, operands); break;
      case 5:  op5(s, operands); break;
      case 6:  op6(s, operands); break;
      case 8:  op8(s, operands); break;
      case 9:  op9(s, operands); break;
      case 11: op11(s, operands); break;
      case 12: op12(s, operands); break;
      case 13: op13(s, operands); break;
      case 14: op14(s, operands); break;
      case 15: op15(s, operands); break;
      case 16: op16(s, operands, opts.literal ?? null); break;
      case 17: op17(s, operands, opts.ch0 ?? 0); break;
      case 18: op18(s, operands); break;
      case 19: op19(s); break;
      default: throw new Error(`unhandled opcode ${op}`);
    }
    if (clip && op !== 18 && op !== 19) {
      const [x0, y0, x1, y1] = s.rect;
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          if (x >= x0 && x < x1 && y >= y0 && y < y1) continue;
          const o = (y * SIZE + x) * 4;
          for (let c = 0; c < 4; c++) s.current[o + c] = saved[o + c];
          s.mask[y * SIZE + x] = savedMask[y * SIZE + x];
        }
      }
    }
  }
  return s;
}
