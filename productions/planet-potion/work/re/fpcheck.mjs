// fpcheck.mjs — pin the two floating-point primitives the whole port rests on.
//
//   node work/re/fpcheck.mjs
//
// Needs no dataset and no original binary: both references are computed here, a
// different way from the implementations they check.
//
// WHY THIS EXISTS. `fma` and `f32` are tested today only transitively, through
// 69 texture programs that come out byte-exact — which is strong evidence but
// blind in one direction: it covers the values those programs happen to
// produce. `anim.js` uses `fma` on keyframe coefficients, which are entirely
// different numbers, and the softsynth will use both on a third set. A primitive
// that is right on the texture VM's inputs and wrong on a subnormal is exactly
// the bug that would be found six subsystems later, from a symptom that looks
// nothing like arithmetic.
//
// THE REFERENCES ARE INDEPENDENT, which is the only thing that makes this worth
// running. Re-implementing `f32` the same way and diffing proves nothing.
//
//   * `fma` is checked against exact BigInt arithmetic: decompose both operands
//     into integer significand and exponent, multiply exactly, add `c` exactly,
//     then round the exact result to nearest-even. No floating point in the
//     reference path at all.
//   * `f32` is checked against a characterisation rather than a transcription:
//     it must be the float32 neighbour TOWARD ZERO, which is derivable from
//     `Math.fround` plus a one-ulp step, and it must be the identity on values
//     that are already float32.
import { f32, fma } from '../../web/js/fp.js';

let bad = 0;
const say = (ok, what, detail = '') => {
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${what}${detail ? `  ${detail}` : ''}`);
};

// --- exact arithmetic on doubles, for the fma reference ----------------------

const dv = new DataView(new ArrayBuffer(8));

/** -> {m, e} with value === m * 2^e exactly, m a signed BigInt. Finite only. */
function decompose(x) {
  dv.setFloat64(0, x);
  const hi = dv.getUint32(0), lo = dv.getUint32(4);
  const sign = hi >>> 31 ? -1n : 1n;
  const exp = (hi >>> 20) & 0x7ff;
  const frac = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo);
  if (exp === 0) return { m: sign * frac, e: -1074 };             // subnormal / zero
  return { m: sign * ((1n << 52n) | frac), e: exp - 1075 };
}

/** Round the exact value m * 2^e to the nearest double, ties to even. */
function roundToDouble(m, e) {
  if (m === 0n) return 0;
  const neg = m < 0n;
  let mag = neg ? -m : m;

  // Normalise to exactly 53 significant bits, remembering what we shifted out.
  let bits = mag.toString(2).length;
  let shift = bits - 53;
  if (shift > 0) {
    const dropped = mag & ((1n << BigInt(shift)) - 1n);
    const half = 1n << BigInt(shift - 1);
    mag >>= BigInt(shift);
    e += shift;
    if (dropped > half || (dropped === half && (mag & 1n) === 1n)) {
      mag += 1n;
      if (mag.toString(2).length > 53) { mag >>= 1n; e += 1; }     // carried out
    }
  } else if (shift < 0) {
    mag <<= BigInt(-shift);
    e += shift;
  }

  // Subnormal range: re-round with the exponent pinned at the minimum.
  if (e < -1074) {
    const extra = -1074 - e;
    if (extra >= 54) return neg ? -0 : 0;
    const dropped = mag & ((1n << BigInt(extra)) - 1n);
    const half = 1n << BigInt(extra - 1);
    mag >>= BigInt(extra);
    e = -1074;
    if (dropped > half || (dropped === half && (mag & 1n) === 1n)) mag += 1n;
  }

  const v = Number(mag) * 2 ** e;
  return neg ? -v : v;
}

/** fl(a*b + c), computed with no rounding until the very end. */
function exactFma(a, b, c) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c)) {
    return a * b + c;                       // non-finite: the reference is the same
  }
  const A = decompose(a), B = decompose(b), C = decompose(c);
  const pm = A.m * B.m, pe = A.e + B.e;
  // Align the addend with the product and add exactly.
  let m, e;
  if (pe <= C.e) { m = pm + (C.m << BigInt(C.e - pe)); e = pe; }
  else { m = (pm << BigInt(pe - C.e)) + C.m; e = C.e; }
  if (m === 0n) {
    // Exact zero: the sign is the sign of the true sum, which IEEE gives as
    // +0 in round-to-nearest unless both addends were -0.
    return (Object.is(a * b, -0) && Object.is(c, -0)) ? -0 : 0;
  }
  return roundToDouble(m, e);
}

// --- a deterministic supply of awkward doubles -------------------------------

let seed = 0x2f6e2b1;
const rnd = () => {
  seed ^= seed << 13; seed >>>= 0;
  seed ^= seed >>> 17;
  seed ^= seed << 5; seed >>>= 0;
  return seed / 4294967296;
};

/** Random doubles across a wide exponent range, signs included. */
function randomDouble() {
  const mant = 1 + rnd();
  const exp = Math.floor(rnd() * 120) - 60;
  return (rnd() < 0.5 ? -1 : 1) * mant * 2 ** exp;
}

// --- fma --------------------------------------------------------------------

{
  const N = 20000;
  let wrong = 0, differedFromNaive = 0, firstBad = null;
  for (let i = 0; i < N; i++) {
    const a = randomDouble(), b = randomDouble(), c = randomDouble();
    const got = fma(a, b, c), want = exactFma(a, b, c);
    if (!Object.is(got, want)) { wrong++; if (!firstBad) firstBad = { a, b, c, got, want }; }
    if (!Object.is(a * b + c, want)) differedFromNaive++;
  }
  say(wrong === 0, `fma matches exact arithmetic over ${N} random triples`,
    wrong ? `first: fma(${firstBad.a},${firstBad.b},${firstBad.c}) = ${firstBad.got} want ${firstBad.want}`
      : `${differedFromNaive} of them differ from a*b+c`);

  // THE POINT OF THE WHOLE EXERCISE, asserted rather than assumed: if the naive
  // expression never differed, `fma` would be untested by the above and the
  // texture VM would not have needed it.
  say(differedFromNaive > N / 100,
    'the fused and unfused results genuinely differ on this sample',
    `${differedFromNaive}/${N}`);
}

{
  // Cases Dekker's splitting cannot handle, where the early return has to carry
  // the result. `_split` on a huge operand overflows to Infinity and would
  // return NaN; on zero it loses the addend's signed zero.
  const cases = [
    [0, 5, 3], [5, 0, 3], [0, 0, -0], [-0, 0, 0],
    [Infinity, 2, 1], [2, Infinity, -Infinity], [NaN, 1, 1],
    [1e308, 10, 1], [5e-324, 0.5, 0], [1, 1, 5e-324],
  ];
  let wrong = 0;
  const detail = [];
  for (const [a, b, c] of cases) {
    const got = fma(a, b, c), want = exactFma(a, b, c);
    const ok = Object.is(got, want) || (Number.isNaN(got) && Number.isNaN(want));
    if (!ok) { wrong++; detail.push(`fma(${a},${b},${c}) = ${got} want ${want}`); }
  }
  say(wrong === 0, `fma handles ${cases.length} degenerate cases`, detail.join('; '));
}

{
  // Signed zero specifically: `p === 0` takes the early return, and `p + c` has
  // to give the sign IEEE gives. Invisible until a value is compared against
  // zero or divided into, so it is worth its own check.
  //
  // TWO OF THESE EIGHT ARE NEGATIVE, and the rule is not the intuitive one. A
  // sum of two zeros is +0 in round-to-nearest unless BOTH are negative, so the
  // result is -0 exactly when the product is -0 and the addend is -0 — i.e.
  // when exactly one of `a`, `b` is negative and `c` is negative. `fma(0,0,-0)`
  // is +0 (the addend's sign loses) and `fma(-0,-0,-0)` is +0 too (the product
  // is +0). Hand-written expectations got this wrong twice in a row and failed
  // against correct code both times, which is the argument for deriving them.
  const zeros = [0, -0];
  const rows = [];
  for (const a of zeros) for (const b of zeros) for (const c of zeros) {
    const got = fma(a, b, c), want = exactFma(a, b, c);
    rows.push({ a, b, c, got, want, ok: Object.is(got, want) });
  }
  const negatives = rows.filter((r) => Object.is(r.got, -0));
  say(rows.every((r) => r.ok), 'fma gives IEEE signed zero on all eight zero triples',
    rows.filter((r) => !r.ok).map((r) => `fma(${r.a},${r.b},${r.c})=${r.got} want ${r.want}`).join('; '));
  // Stated as the RULE rather than as a count, so it says something if it fires.
  const expectNeg = rows.filter((r) => Object.is(r.a * r.b, -0) && Object.is(r.c, -0));
  say(negatives.length === expectNeg.length && negatives.length === 2,
    'exactly the two with a -0 product and a -0 addend come out -0',
    `${negatives.length} negative`);
}

// --- f32, the truncating store ----------------------------------------------

const f32bits = new DataView(new ArrayBuffer(4));
/** One ulp toward zero in float32, for a finite non-zero float32 value. */
function stepTowardZero(x) {
  f32bits.setFloat32(0, x);
  const u = f32bits.getUint32(0);
  f32bits.setUint32(0, u - 1);              // magnitude decreases in both signs
  return f32bits.getFloat32(0);
}

{
  // 1. IDENTITY ON FLOAT32 VALUES. `stfs` is defined as a repack of a value the
  //    FPR already holds at single precision, so anything already single must
  //    come back unchanged — including zero and the extremes.
  let wrong = 0;
  for (let i = 0; i < 5000; i++) {
    const v = Math.fround(randomDouble());
    if (!Number.isFinite(v) || v === 0) continue;
    if (!Object.is(f32(v), v)) wrong++;
  }
  say(wrong === 0, 'f32 is the identity on values that are already float32',
    `${wrong} differed`);
}

{
  // 2. TRUNCATION TOWARD ZERO on values that are not. Derived independently:
  //    round to nearest with Math.fround, and if that landed further from zero
  //    than the input, step back one ulp. Restricted to the float32 NORMAL
  //    range — the qemu repack this transcribes keeps only the top exponent bit
  //    and is not defined outside it, which is a real limit of the port and is
  //    stated here rather than hidden by picking friendly inputs.
  let wrong = 0, checked = 0, differedFromFround = 0, firstBad = null;
  for (let i = 0; i < 20000; i++) {
    const mant = 1 + rnd();
    const exp = Math.floor(rnd() * 200) - 100;             // 2^-100 .. 2^100
    const v = (rnd() < 0.5 ? -1 : 1) * mant * 2 ** exp;
    const near = Math.fround(v);
    if (!Number.isFinite(near) || near === 0) continue;
    if (Math.abs(near) < 2 ** -126 || Math.abs(near) > 3.4e38) continue;
    checked++;
    const want = Math.abs(near) > Math.abs(v) ? stepTowardZero(near) : near;
    const got = f32(v);
    if (!Object.is(got, want)) { wrong++; if (!firstBad) firstBad = { v, got, want }; }
    if (!Object.is(near, want)) differedFromFround++;
  }
  say(wrong === 0, `f32 truncates toward zero over ${checked} normal-range values`,
    wrong ? `first: f32(${firstBad.v}) = ${firstBad.got} want ${firstBad.want}`
      : `${differedFromFround} where round-to-nearest would differ`);

  // Again: if these never differed, the whole distinction would be untested —
  // and it is the distinction that cost twelve wrong pixels in op1's ramp.
  say(differedFromFround > checked / 100,
    'truncation and round-to-nearest genuinely differ on this sample',
    `${differedFromFround}/${checked}`);
}

{
  // 3. THE TWO MEASURED VALUES from PORT_SPEC §7, which are the whole reason
  //    this function is not `Math.fround`. Both came off the original: the ramp
  //    step read out of its float surface, and a PPC probe storing one double
  //    with `stfd` and `stfs` side by side.
  say(f32(4.047619281336665) !== Math.fround(4.047619281336665),
    'the probed value 4.047619281336665 truncates below its rounded neighbour');
  f32bits.setFloat32(0, f32(4.047619281336665));
  say(f32bits.getUint32(0) === 0x40818618,
    'and it lands on 0x40818618, the bits the original stored',
    `got 0x${f32bits.getUint32(0).toString(16)}`);
}

console.log(bad === 0 ? '\nall checks passed' : `\n${bad} checks FAILED`);
process.exit(bad ? 1 : 0);
