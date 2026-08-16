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

/** Cosine via the sine table's quarter-turn offset, exactly as 0x1000a18c does. */
export function cosLookup(table, x, scale) {
  const idx = (((Math.trunc(x * scale) * 4) + 0x2000) & 0x7ffc) >>> 2;
  return table[idx];
}

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
