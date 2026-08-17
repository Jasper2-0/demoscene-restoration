// tables.js — the four lookup tables the 68K bootstrap builds before anything runs.
//
// Both the geometry transforms and the whole softsynth read these, so they are a
// dependency of nearly everything else and worth getting exactly right first.
//
// The bootstrap builds them with the FPU; the constants it steps by are float32
// values taken from the executable's own float pool, NOT decimal literals — pi is
// 0x40490FDA, 1e-4 is 0x38D1B717 and 1e-3 is 0x3A83126E, each of which differs
// from the mathematical value in the last bits. Stepping by a decimal 0.0001
// would drift measurably over 100,000 entries, so the fround'd constants matter.
//
// Verified byte-for-byte against work/re/ppcrun.py's build_tables() by
// work/re/tablecheck.mjs. See PORT_SPEC.md §8f for how the accessors index them.

import { fma } from './fp.js';

// Reinterpret a bit pattern as float32 — NOT fp.js's `f32`, which is the
// truncating `stfs` conversion. Same name, different job; this one only spells
// the float pool's constants.
const f32 = (bits) => new Float32Array(new Uint32Array([bits]).buffer)[0];

export const PI_F32 = f32(0x40490FDA);
export const E4_F32 = f32(0x38D1B717);
export const E3_F32 = f32(0x3A83126E);

/** A ramp of `n` float32 samples of `fn`, stepping from `start` by `step`. */
function ramp(start, step, n, fn) {
  const out = new Float32Array(n);
  let x = start;
  for (let i = 0; i < n; i++) { out[i] = fn(x); x += step; }
  return out;
}

/**
 * `_sinus` — 10,240 entries stepping by float32(pi)/4096.
 *
 * 8,192 entries is a full turn, which is why the accessors mask with 0x7ffc and
 * why cosine is the same table read 0x2000 bytes (2,048 entries, a quarter turn)
 * further along. The extra 2,048 entries exist precisely so that offset never
 * runs off the end.
 */
export const sinus = () => ramp(0, PI_F32 / 4096, 10240, Math.sin);

/** `_atan` — 1,024 entries of atan(i/1024). */
export const atan = () => {
  const out = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) out[i] = Math.atan(i / 1024);
  return out;
};

/** `_power` — 2^x over 100,000 entries from -1.0. Note to frequency, §8f. */
export const power = () => ramp(-1, E4_F32, 100000, (x) => 2 ** x);

/** `_mexp` — e^x over 15,000 entries from 0.0. */
export const mexp = () => ramp(0, E3_F32, 15000, Math.exp);

/**
 * `fctiw` — float to int32, ROUND TO NEAREST, TIES TO EVEN.
 *
 * Every table accessor below indexes through this, so it decides which entry
 * gets read and it is not `Math.trunc`. `fctiw` rounds under the current FPSCR
 * mode, and this program never touches FPSCR — there is no `mtfs` instruction
 * anywhere in the 46,960 bytes of seg0 — so the mode is the power-on default,
 * round-to-nearest-even. Nor is the truncating form used: both of the two
 * `fctiw`s in the binary are the rounding one, and `fctiwz` appears zero times.
 *
 * The routine it lives in is `float2int` at `0x10006a6c`, four instructions
 * that round, `stfd`, and reload the low word.
 *
 * `Math.round` is the wrong primitive here in two ways: it breaks ties upward
 * rather than to even, and it breaks them toward +Infinity rather than away
 * from zero, so it disagrees with the hardware at every exact .5 — which, on a
 * table index derived from a phase ramp, is not a rare input.
 */
export function fctiw(x) {
  if (!(x > -2147483649 && x < 2147483648)) return x < 0 ? -2147483648 : 2147483647;
  const f = Math.floor(x), d = x - f;
  if (d < 0.5) return f;
  if (d > 0.5) return f + 1;
  return f % 2 === 0 ? f : f + 1;
}

/**
 * The four table accessors, `0x1000a168`–`0x1000a1d4`, four instructions each.
 *
 * PORT_SPEC §8f documents three; there are four. `0x1000a168` is sine WITHOUT
 * the quarter-turn bias, and it is a separate entry point from the cosine at
 * `0x1000a18c` rather than the same code — so a port that has only "cos" is
 * missing a function the voices call.
 *
 * SINE AND COSINE MASK, 2^x AND e^x DO NOT. `andi. r3, r3, 0x7ffc` wraps the
 * trig pair into 8,192 entries, which is what makes them periodic; the other
 * two index straight off `fctiw` with nothing bounding them, so an argument
 * outside their range reads past the end of the table in the original too.
 * That is the hardware's behaviour and a port should not quietly clamp it —
 * `undefined` surfacing here is a real out-of-range argument, not a bug in the
 * accessor.
 */
export const sinLookup = (sinus, x, k) =>
  sinus[((fctiw(x * k) * 4) & 0x7ffc) >>> 2];

export const cosLookup = (sinus, x, k) =>
  sinus[(((fctiw(x * k) * 4) + 0x2000) & 0x7ffc) >>> 2];

/**
 * `0x1000a1b4`, note to frequency.
 *
 * The argument is `fmadd f0, f0, f1, f1` — FUSED, and multiplying and adding by
 * the SAME constant, i.e. `k * (x + 1)` computed with one rounding rather than
 * two. Writing it as `x * k + k` in JS is a different number.
 */
export const powLookup = (power, x, k) => power[fctiw(fma(x, k, k))];

export const expLookup = (mexp, x, k) => mexp[fctiw(x * k)];

/** Big-endian float32 bytes, for comparing against the harness's tables. */
export function toBigEndianBytes(arr) {
  const out = new Uint8Array(arr.length * 4);
  const dv = new DataView(out.buffer);
  for (let i = 0; i < arr.length; i++) dv.setFloat32(i * 4, arr[i], false);
  return out;
}

export const buildAll = () => ({
  sinus: sinus(), atan: atan(), power: power(), mexp: mexp(),
});
