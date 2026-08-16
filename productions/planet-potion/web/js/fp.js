// fp.js — the two PowerPC floating-point semantics this port depends on.
//
// Both of these were found the hard way, from output that was wrong by one ulp,
// and both are the difference between "byte-exact" and "looks right". They live
// here rather than inside whichever file needed them first because they are
// properties of the CPU, not of the texture VM or the animation evaluator — and
// because they were duplicated: `fma` existed verbatim in both texturevm.js and
// anim.js, which is two chances to fix a bug in one of them.
//
// work/re/fpcheck.mjs pins both against references computed a different way.

// --- what `stfs` actually does ----------------------------------------------
//
// EVERY float32 store TRUNCATES. Not rounds — truncates. PowerPC treats a value
// in an FPR as already single-representable when `stfs` writes it, so the store
// is defined as a repack of the bits rather than a rounding conversion, and
// qemu implements exactly that: keep the sign and the top exponent bit, take
// the next 30 bits, drop the low 29 mantissa bits on the floor. A JS
// `Float32Array` assignment rounds to nearest, which is the sane thing and the
// wrong one.
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

// --- the fused multiply-adds -------------------------------------------------
//
// PowerPC's multiply-adds are FUSED — `fmadd`, `fnmsub` and friends round once,
// not twice. JS has no fma, and `a * b + c` rounds the product before adding,
// which is a different number. It survives the truncation to single often
// enough to look right and not always: op2 was left with 28 float32 values one
// ulp high after every store was accounted for, all of them from `fmadd`.
//
// Dekker's twoProduct recovers the exact product as an unevaluated sum, and a
// twoSum folds the addend in, so the single rounding happens where the hardware
// puts it.
const _SPLIT = 134217729;            // 2^27 + 1

function _split(a) {
  const t = a * _SPLIT;
  const hi = t - (t - a);
  return [hi, a - hi];
}

/**
 * `fmadd`: fl(a*b + c) with ONE rounding.
 *
 * The early return covers the cases Dekker's splitting cannot: a non-finite
 * product has no exact error term, and a zero product would make `_split`
 * return zeros that lose `c`'s sign. In both, `p + c` is already the answer.
 */
export function fma(a, b, c) {
  const p = a * b;
  if (!Number.isFinite(p) || p === 0) return p + c;
  const [ah, al] = _split(a), [bh, bl] = _split(b);
  const e = ((ah * bh - p) + ah * bl + al * bh) + al * bl;   // p + e === a*b
  const s = p + c;
  const v = s - p;
  const err = (p - (s - v)) + (c - v);
  return s + (err + e);
}
