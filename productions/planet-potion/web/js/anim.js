// anim.js — the keyframe evaluator `_calc_matrix` runs, and nothing else yet.
//
// `_calc_matrix` (0x10004f0c) makes three passes over the node list: evaluate
// keyframe tracks (0x10004fdc), compose down the hierarchy (0x10005394), then
// publish (0x10005510). This file is the innermost piece of the first pass, the
// per-channel polynomial at 0x10005944 — which is where a port either matches
// the original's motion or does not, and which is small enough to get exactly
// right before the scene graph around it exists.
//
// Read from the binary rather than taken from PORT_SPEC §3a, which turned out to
// describe it correctly:
//
//   f28 = c0                       lfs f28, 0(r10)
//   f25 = c3                       lfs f25, 0xc(r10)
//   flags == 0:
//     f28 = fmadd(c1, u,   f28)    c0 + c1·u
//     f28 = fmadd(c2, u³,  f28)       + c2·u³
//     f28 = fnmsub(u², c3, f28)       − c3·u²
//   flags != 0:
//     f28 = fnmsub(u, c3, c0)      c0 − c3·u
//
// TWO THINGS THAT ARE EASY TO GET WRONG AND BOTH MATTER.
//
// `c2` multiplies the CUBED term and `c3` the squared one, and the squared term
// is SUBTRACTED — so the coefficient order is not the ascending-power order the
// block's layout suggests. Writing it as a normal cubic gives a curve that is
// plausible everywhere and right nowhere.
//
// And all three steps are FUSED. `fmadd` and `fnmsub` round once; `a*b + c`
// rounds twice. The texture VM needed exactly this distinction to become
// byte-exact (PORT_SPEC §7), and there is no reason to expect the animation to
// be more forgiving — a position that is a few ulps off feeds a reciprocal in
// the emitter, which amplifies it.

/** `fmadd`: fl(a*b + c) with ONE rounding. Dekker twoProduct + twoSum. */
const _SPLIT = 134217729;                       // 2^27 + 1

function _split(a) {
  const t = a * _SPLIT;
  const hi = t - (t - a);
  return [hi, a - hi];
}

export function fma(a, b, c) {
  const p = a * b;
  if (!Number.isFinite(p) || p === 0) return p + c;
  const [ah, al] = _split(a), [bh, bl] = _split(b);
  const e = ((ah * bh - p) + ah * bl + al * bh) + al * bl;
  const s = p + c;
  const v = s - p;
  return s + (((p - (s - v)) + (c - v)) + e);
}

/**
 * One channel of one keyframe. `k` is the 16-byte coefficient block as
 * [c0, c1, c2, c3]; `u`, `u2`, `u3` are the normalised time and its powers,
 * which the caller computes once per keyframe rather than once per channel —
 * as the original does at 0x100051d8.
 */
export function channel(k, u, u2, u3, flags) {
  if (flags) return fma(-u, k[3], k[0]);        // fnmsub f28, f24, f25, f28
  let v = fma(k[1], u, k[0]);
  v = fma(k[2], u3, v);
  return fma(-u2, k[3], v);
}

/**
 * 0x10005970 — the same polynomial, then clamped to [0, 1]. Colour and alpha
 * channels take this path; position and scale do not, so out-of-range motion is
 * NOT clamped and a port that clamps everything quietly bounds the geometry.
 */
export function channelClamped(k, u, u2, u3, flags) {
  const v = channel(k, u, u2, u3, flags);
  return v < 0 ? 0 : (v > 1 ? 1 : v);
}

/** u, u², u³ for a keyframe at `t`. `+0x04` is t₀ and `+0x08` is 1/span. */
export function normalise(t, t0, invSpan) {
  const u = (t - t0) * invSpan;
  const u2 = u * u;
  return { u, u2, u3: u2 * u };
}

/**
 * The frame's clear colour, which is not a constant and is not black.
 * `_calc_matrix` finishes by reading the first node's animation channels at
 * +0x40/+0x44/+0x48, scaling each by 255 and packing them into `r2+0x2846`
 * (0x10004f50..0x10004f90). The shim currently clears to black, so this is
 * wired up but not yet used — recorded here because it is part of the same
 * function and would otherwise be found twice.
 */
export function clearColour(ch) {
  const b = (v) => {
    const n = Math.round(v * 255);
    return n < 0 ? 0 : (n > 255 ? 255 : n);
  };
  return [b(ch[0]), b(ch[1]), b(ch[2])];
}
