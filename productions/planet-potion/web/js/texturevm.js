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

/** Opcodes whose bodies are specified but not yet written here. */
export const UNIMPLEMENTED = new Set([0, 1, 2, 3, 4, 5, 6, 8, 9, 11, 12, 13, 14, 15, 16, 17]);

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
