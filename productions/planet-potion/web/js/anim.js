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

// `fmadd`: fl(a*b + c) with ONE rounding. This file carried its own copy of the
// Dekker implementation, identical to the texture VM's — two copies of the one
// primitive the whole port's exactness rests on, and two places to fix a bug in
// one of them. One definition now, in fp.js, pinned by work/re/fpcheck.mjs.
import { f32, fma } from './fp.js';
import { fctiw } from './tables.js';

// The two constants the text tail loads, `r2+0x2bd6` and `r2+0x2da6`. The first
// is the same 0.5 the geometry builder uses for half-extents; the second is the
// italic shear, in the same units as a glyph's width.
const HALF = 0.5;
const SLANT = 48.0;

export { fma };

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
 * The track search for loop mode 0, from 0x10005054.
 *
 * Walk `+0xfc` while the NEXT keyframe's tick is below the local time — so the
 * chosen keyframe is the last one whose tick is at or before it, which is what
 * animcheck.mjs confirms against the running program.
 *
 * AND THE END OF A TRACK CLAMPS. When `next` is zero the original does not keep
 * evaluating the final keyframe with a growing `u`: it loads `key+0x04` into the
 * time itself (`lfs f15, 4(r21)`), so `t − t0` is zero and the value freezes at
 * `c0`. Letting `u` run on past the end instead is the obvious implementation
 * and it makes every finished track keep accelerating away — cubically, since
 * `c2` is on `u³`.
 */
export function search(track, localTime) {
  let k = track[0];
  if (!k) return null;
  for (;;) {
    const next = track.find((x) => x.addr === k.nextAddr)
      ?? track[track.indexOf(k) + 1];
    if (!next) return { key: k, t: k.t0 };       // clamped: u = 0
    if (next.tick >= localTime) return { key: k, t: localTime };
    k = next;
  }
}

/**
 * Local time, and the beat sync. `t − anim[+0x6c]`, EXCEPT that in loop mode 0
 * the frame's music signal is compared against the trigger byte at `anim+0x70`
 * first (`0x10005034`): on a match the origin is reset to the current tick and
 * local time restarts at zero. That is the whole mechanism by which the visuals
 * lock to the music, and it is gated on the loop mode — a looping track does not
 * check the trigger at all.
 */
export function localTime(t, anim, musicSignal) {
  const mode = (anim.flags2 & 0xe0) >> 5;
  if (mode === 0 && musicSignal === anim.trigger) return { t: 0, reset: true };
  return { t: t - anim.origin, reset: false };
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

// --- pass 1, in full ---------------------------------------------------------
//
// `0x10004fdc`. Everything above this line was the innermost arithmetic; this is
// the pass around it — the loop modes, the fifteen coefficient blocks, and the
// four matrix builders they feed.
//
// TWO THINGS THE FLAGS BYTE DOES NOT DO, both of which a reader reconstructs
// from the branch structure and both of which are wrong.
//
// `flags2` LOOKS like a loop mode in the top three bits and five per-group skip
// flags in the bottom five: the pass tests bit 0 before the translation group,
// bit 1 before the rotations, bit 2 before the colours, bit 3 and bit 4 before
// the last two. But `0x10004ff8` is `andi. r20, r20, 0xe0` — the low bits are
// masked off four instructions after the byte is loaded and before any of those
// tests run. All five are testing bits that are always zero, so EVERY GROUP
// ALWAYS RUNS and the two condition registers derived from them (`cr5`, `cr6`)
// are always false, which makes the matrix composition unconditional too.
//
// The sampled scene confirms it from the data side: `flags2 = 0xa8` has bit 3
// set, which would skip channels 19 and 20 — and those channels hold -0.0 in
// the dump, not the +0.0 the identity builder would have left. They were
// written by the evaluator.
//
// So the five tests are dead, and they are transcribed as unconditional rather
// than reproduced as branches on a constant.

/** `flags2 & 0xe0`. Eight modes; they differ only at the end of a track. */
export const LOOP = {
  CLAMP: 0x00, RESTART: 0x20, CLAMP_ALT: 0x40, MOD_TRACK: 0x60,
  MOD_SPAN: 0x80, MOD_TWO_SPANS: 0xa0, SKIP: 0xc0, PINGPONG: 0xe0,
};

/**
 * The fifteen coefficient blocks, grouped as the pass consumes them.
 *
 * `dst` is the byte offset into the channel block, so `dst/4` is the channel
 * index. That numbering puts the ROTATION ANGLES at channels 9-11 and the
 * TRANSLATION at 12-14 — PORT_SPEC §3b's table has those two swapped, giving
 * "+0x30 … +0x38 | channels 9–11" where +0x30/4 is 12.
 *
 * Only the colour group clamps (`0x10005970` rather than `0x10005944`), which
 * is why position and scale are free to leave [0,1].
 */
const GROUPS = [
  { blocks: [0, 1, 2], dst: [0x30, 0x34, 0x38], clamp: false },   // translation
  { blocks: [3, 4, 5], dst: [0x24, 0x28, 0x2c], clamp: false },   // Euler angles
  { blocks: [6, 7, 8, 9], dst: [0x3c, 0x40, 0x44, 0x48], clamp: true },
  { blocks: [10, 11], dst: [0x4c, 0x50], clamp: false },
  { blocks: [12, 13, 14], dst: [0x54, 0x58, 0x5c], clamp: false }, // cx, cy, scale
];

/**
 * The sine table as the builders index it: `fctiw(angle) & 0x7ffc` is a BYTE
 * offset, and cosine is the same table read from `r28 + 0x2000`.
 *
 * Note there is no `slwi` here, unlike the synth's accessors in §8f — the angle
 * value IS the byte offset, so a full turn is 0x8000 of whatever unit the
 * keyframes are in rather than 2*pi.
 */
const angleIndex = (a) => (fctiw(a) & 0x7ffc) >>> 2;
const sinOf = (sinus, a) => sinus[angleIndex(a)];
const cosOf = (sinus, a) => sinus[angleIndex(a) + 0x800];

/**
 * A 3x4 laid out THE WAY THE CHANNEL BLOCK LAYS IT OUT — and the gap matters.
 *
 * The 3x3 is channels 0-8 (byte offsets +0x00, +0x0c, +0x18 by row) and the
 * translation is channels 12-14 (+0x30). Channels 9-11 sit between them and are
 * the EULER ANGLES, not part of the matrix at all.
 *
 * Packing the translation into 9-11 instead is the obvious thing to do and it
 * survives the whole of pass 1, because the builders and the concatenation then
 * agree with each other about a layout neither of them shares with anything
 * else. It fails the moment pass 2 composes a node against a real parent
 * CHANNEL BLOCK, where slots 9-11 hold an angle: the child inherited its
 * parent's rotation angle as a Y translation, which is a number about 3,000
 * where the right answer was 13.5.
 */
const mat = (m00, m01, m02, m10, m11, m12, m20, m21, m22, tx, ty, tz) => {
  const m = new Float64Array(15);
  m[0] = m00; m[1] = m01; m[2] = m02;
  m[3] = m10; m[4] = m11; m[5] = m12;
  m[6] = m20; m[7] = m21; m[8] = m22;
  m[12] = tx; m[13] = ty; m[14] = tz;
  return m;
};

/** `0x100059b4`, `0x10005a08`, `0x10005a5c`, `0x10005ab0` — the four builders. */
const rotY = (s, a) => mat(cosOf(s, a), 0, -sinOf(s, a), 0, 1, 0,
  sinOf(s, a), 0, cosOf(s, a), 0, 0, 0);
const rotX = (s, a) => mat(1, 0, 0, 0, cosOf(s, a), sinOf(s, a),
  0, -sinOf(s, a), cosOf(s, a), 0, 0, 0);
const rotZ = (s, a) => mat(cosOf(s, a), sinOf(s, a), 0, -sinOf(s, a), cosOf(s, a), 0,
  0, 0, 1, 0, 0, 0);
const translate = (x, y, z) => mat(1, 0, 0, 0, 1, 0, 0, 0, 1, x, y, z);

/**
 * `0x10005b34` — concatenate, `node = node x M`, row-vector convention.
 *
 * Each of the three rows is multiplied through M's 3x3 and its own translation
 * component accumulates `row . M.t`. The first product of each column is a bare
 * `fmul` and the next two are `fmadd`, so the rounding pattern is
 * `fma(c, m, fma(b, m, a*m))` and not a sum of three products.
 *
 * Every result goes back through a `stfs`, so it truncates.
 */
export function concat(ch, m) {
  for (let r = 0; r < 3; r++) {
    const a = ch[r * 3], b = ch[r * 3 + 1], c = ch[r * 3 + 2], tw = ch[12 + r];
    const c0 = fma(c, m[6], fma(b, m[3], a * m[0]));
    const c1 = fma(c, m[7], fma(b, m[4], a * m[1]));
    const c2 = fma(c, m[8], fma(b, m[5], a * m[2]));
    const t = fma(c, m[14], fma(b, m[13], fma(a, m[12], tw)));
    ch[r * 3] = f32(c0); ch[r * 3 + 1] = f32(c1); ch[r * 3 + 2] = f32(c2);
    ch[12 + r] = f32(t);
  }
}

/**
 * `0x10005c10` — the other one: LEFT-multiply, `node = M x node`.
 *
 * Where `0x10005b34` takes the node's ROWS through M, this takes its COLUMNS —
 * `node[0x00]`, `node[0x0c]` and `node[0x18]` are loaded together, which is
 * column zero — and the translation becomes `M.R . t + M.t` rather than
 * `t . M`. The two routines are transposes of each other and compose on
 * opposite sides.
 *
 * PORT_SPEC says this transform "has no example yet". It has one: transform
 * mode 2 uses it, and part one's scene 14 has a camera node running it.
 * Stubbing it out left that node with an unrotated matrix and eleven wrong
 * channels at every sampled time while its raw evaluated channels were all
 * correct — which is what a composition fault looks like as distinct from an
 * evaluation one.
 */
function leftConcat(ch, m) {
  for (let j = 0; j < 3; j++) {
    const a = ch[j], b = ch[3 + j], c = ch[6 + j];
    const r0 = fma(c, m[2], fma(b, m[1], a * m[0]));
    const r1 = fma(c, m[5], fma(b, m[4], a * m[3]));
    const r2 = fma(c, m[8], fma(b, m[7], a * m[6]));
    ch[j] = f32(r0); ch[3 + j] = f32(r1); ch[6 + j] = f32(r2);
  }
  const a = ch[12], b = ch[13], c = ch[14];
  const t0 = fma(c, m[2], fma(b, m[1], fma(a, m[0], m[12])));
  const t1 = fma(c, m[5], fma(b, m[4], fma(a, m[3], m[13])));
  const t2 = fma(c, m[8], fma(b, m[7], fma(a, m[6], m[14])));
  ch[12] = f32(t0); ch[13] = f32(t1); ch[14] = f32(t2);
}

/** `0x10005ae8` — identity into the node, with the compose groups reset. */
function identity(ch) {
  ch.fill(0);
  ch[0] = 1; ch[4] = 1; ch[8] = 1;
  // +0x3c..+0x48: the multiply group's unit. +0x4c/+0x50: the add group's.
  ch[15] = 1; ch[16] = 1; ch[17] = 1; ch[18] = 1;
}

/**
 * The track walk, all eight loop modes. Returns the chosen keyframe and the
 * local time to evaluate it at, or null when the node is not evaluated at all.
 *
 * `ticks` and `time` are the SAME quantity carried twice — the original keeps an
 * integer copy in r11 for the tick comparisons and a float copy in f15 for the
 * arithmetic, and every mode adjusts both. Keeping only one and converting
 * works until a mode subtracts a span, after which the two drift.
 */
export function walkTrack(anim, keys, byAddr, ticks, time, musicSignal, now) {
  const mode = anim.flags2 & 0xe0;
  const head = byAddr.get(anim.track) ?? keys[0];
  let key = head, r11 = ticks, f15 = time;
  if (!key) return null;

  for (;;) {
    if (mode === LOOP.CLAMP) {
      // THE TRIGGER IS CHECKED ONLY HERE, in mode 0 — beat sync and looping are
      // alternatives, not layers.
      if (musicSignal === anim.trigger) {
        anim.origin = now;
        r11 = 0; f15 = 0;
      }
      for (;;) {
        const next = byAddr.get(key.next);
        if (!next) return { key, time: key.t0 };          // clamp: u = 0
        if (next.tick >= r11) return { key, time: f15 };
        key = next;
      }
    }

    // The track has not started: publish nothing and leave the children alone.
    if (key.tick > r11) return null;
    if (!byAddr.get(key.next)) return { key, time: f15 };

    let atEnd = false;
    for (;;) {
      const next = byAddr.get(key.next);
      if (!next) { atEnd = true; break; }
      if (next.tick >= r11) return { key, time: f15 };
      key = next;
    }
    if (!atEnd) continue;

    if (mode === LOOP.RESTART) return { key: head, time: 0 };
    if (mode === LOOP.CLAMP_ALT) return { key, time: key.t0 };
    if (mode === LOOP.MOD_TRACK) {
      r11 -= key.tick; f15 -= key.t0; key = head; continue;
    }
    if (mode === LOOP.MOD_SPAN || mode === LOOP.MOD_TWO_SPANS) {
      const tick = key.tick, t0 = key.t0;
      let back = byAddr.get(key.prev);
      if (mode === LOOP.MOD_TWO_SPANS) back = byAddr.get(back?.prev);
      if (!back) return null;
      r11 -= tick - back.tick; f15 -= t0 - back.t0; key = back; continue;
    }
    if (mode === LOOP.PINGPONG) {
      let tick = key.tick, t0 = key.t0;
      r11 -= tick; f15 -= t0;
      let k = byAddr.get(key.prev);
      for (;;) {
        if (!k) { key = head; break; }
        const span = tick - k.tick, dspan = t0 - k.t0;
        if (span >= r11) {
          // REFLECT within this span (0x100051b8): the remaining time is
          // measured backwards from the far end and added to this keyframe's
          // origin, which is what turns the walk around instead of wrapping it.
          return { key: k, time: k.t0 + (dspan - f15) };
        }
        r11 -= span; f15 -= dspan;
        tick = k.tick; t0 = k.t0;
        k = byAddr.get(k.prev);
      }
      continue;
    }
    return null;                                          // 0xc0 — skip
  }
}

/**
 * Pass 1 for one node. Returns the 24 evaluated channels, or null if the node
 * was skipped — which is the `r26 = 0` the compose pass then reads back out of
 * `anim+0x00`.
 */
export function evaluateNode(anim, keys, tick, musicSignal, sinus) {
  const byAddr = new Map(keys.map((k) => [k.addr, k]));
  const found = walkTrack(anim, keys, byAddr, tick - anim.origin,
    tick - anim.origin, musicSignal, tick);
  if (!found) return null;

  const ch = new Float64Array(24);
  identity(ch);

  const { key } = found;
  // NO TRUNCATION HERE. `f15 - t0` and `* invSpan` are register operations —
  // there is no `stfs` between them, so they stay double. Rounding u to single
  // left channel 10 two ulps out at two of three sampled times while every
  // other channel was exact, which is what a too-early truncation looks like:
  // it only shows on the one value large enough for the lost bits to matter.
  const u = (found.time - key.t0) * key.invSpan;
  const u2 = u * u, u3 = u2 * u;
  const evalBlock = key.flags
    ? (k) => fma(-u, k[3], k[0])
    : (k) => fma(-u2, k[3], fma(k[2], u3, fma(k[1], u, k[0])));
  const clampTo01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

  for (const g of GROUPS) {
    g.blocks.forEach((b, i) => {
      const v = evalBlock(key.blocks[b]);
      ch[g.dst[i] >> 2] = f32(g.clamp ? clampTo01(v) : v);
    });
  }

  // The builders read the channels back out, so they see the truncated values.
  const T = translate(ch[12], ch[13], ch[14]);
  const RX = rotX(sinus, ch[9]), RY = rotY(sinus, ch[10]), RZ = rotZ(sinus, ch[11]);
  switch (anim.mode) {
    case 1:                       // translate only
      concat(ch, T);
      break;
    case 2:
      // The rotations only, LEFT-multiplied, and no translation matrix: the
      // `lwz r4, 0x29ee` at 0x10005354 loads the translate matrix and the very
      // next instruction overwrites r4 with the rotY one, so it is dead. The
      // translation still moves, because leftConcat rotates the triple in place.
      leftConcat(ch, RY); leftConcat(ch, RX); leftConcat(ch, RZ);
      break;
    default:                      // 0 — translate, then Y, X, Z in that order
      concat(ch, T);
      concat(ch, RY); concat(ch, RX); concat(ch, RZ);
  }
  return ch;
}

// --- pass 2, compose down the hierarchy --------------------------------------
//
// `0x10005394`. A fixed-point iteration rather than a sweep: bit 0 of
// `anim+0x03` is a dirty flag, a node waits while its PARENT is still dirty, and
// the whole pass repeats until a sweep finds nothing dirty. So parents need not
// precede children in the list.
//
// `flags3` IS MASKED HERE TOO — `andi. r25, r25, 0xf0` at `0x100053c8` — but
// unlike pass 1 the mask keeps every bit the gates test, because all four live
// in the high nibble. The masking is what marks the node resolved; it is not
// the accident it is in pass 1.

/** The four gates, by bit of `anim+0x03`. */
export const GATE = { MULTIPLY: 0x40, ADD_PAIR: 0x80, PROJECT: 0x20, TRANSLATE: 0x10 };

/**
 * One node's compose step, given its parent's channel block.
 *
 * `0x20` AND `0x10` COPY the projection triple and then LEFT-multiply the whole
 * matrix by the parent's — which is why a child inherits its parent's cx, cy
 * and scale outright instead of scaling them.
 *
 * `0x20` WITHOUT `0x10` composes the matrix and then PUTS THE TRANSLATION BACK.
 * The three `lfs` before the call and the three `stfs` after it bracket
 * `0x10005b34`, which writes `+0x30…+0x38` itself — so the effect is to
 * concatenate the rotation and keep the node's own translation, the opposite of
 * PORT_SPEC §3b's "transform the triple". No shipped scene reaches it: every
 * `0x20` in the 29 scenes also has `0x10`.
 */
export function composeNode(ch, parentCh, gates) {
  if (gates & GATE.MULTIPLY) {
    for (let i = 15; i <= 18; i++) ch[i] = f32(ch[i] * parentCh[i]);
  }
  if (gates & GATE.ADD_PAIR) {
    for (let i = 19; i <= 20; i++) ch[i] = f32(ch[i] + parentCh[i]);
  }
  if (gates & GATE.PROJECT) {
    if (gates & GATE.TRANSLATE) {
      for (let i = 21; i <= 23; i++) ch[i] = parentCh[i];
      leftConcat(ch, parentCh);
    } else {
      const t = [ch[12], ch[13], ch[14]];
      concat(ch, parentCh);
      ch[12] = t[0]; ch[13] = t[1]; ch[14] = t[2];
    }
    return;
  }
  if (gates & GATE.TRANSLATE) {
    // Three plain `fadd`s at 0x100054b8. PORT_SPEC calls this undecidable from
    // shipped data because every example had child, parent and result all zero;
    // with all 29 scenes dumped there are 18 nodes on this gate alone and 60
    // more that combine it, so it is now exercised.
    for (let i = 12; i <= 14; i++) ch[i] = f32(ch[i] + parentCh[i]);
  }
}

/**
 * The whole of pass 2 over one frame's nodes.
 *
 * `entries` are `{addr, parent, flags3, resolved, ch}` — the state pass 1 left,
 * mutated in place. `ch` is null for a node pass 1 skipped, which is also the
 * case where `resolved` is 0 and the parent's byte gets copied down instead of
 * anything being composed.
 *
 * Returns the number of sweeps, and how many nodes could not be resolved
 * because their parent was not in the list — which is a property of the DUMP
 * rather than of the pass, since sub-objects on `+0x74` are not exported.
 */
export function composeHierarchy(entries, maxSweeps = 64) {
  const byAddr = new Map(entries.map((e) => [e.addr, e]));
  let sweeps = 0, stuck = 0;
  for (;;) {
    let anyDirty = false;
    sweeps++;
    for (const e of entries) {
      if (!(e.flags3 & 1)) continue;
      anyDirty = true;
      const p = byAddr.get(e.parent);
      if (!p) { stuck++; e.flags3 &= 0xf0; continue; }
      if (p.flags3 & 1) continue;                 // parent not resolved yet
      const gates = e.flags3 & 0xf0;              // read BEFORE clearing
      e.flags3 = gates;
      if (p.resolved !== 1) { e.resolved = p.resolved; continue; }
      if (e.ch && p.ch) composeNode(e.ch, p.ch, gates);
    }
    if (!anyDirty || sweeps >= maxSweeps) break;
  }
  return { sweeps, stuck };
}

// --- pass 3, publish ---------------------------------------------------------
//
// `0x10005510`. Three things in order: copy the resolved byte onto the render
// node, publish the projection triple, then a tail per node type.
//
// All four tails are here. The text one (`0x1000570c`) needed two things the
// dump did not carry — the glyph array on the render node and the channels of
// the animation object's +0x74 SUB-OBJECT — so `animdump` grew both before any
// of it could be checked.

/**
 * `0x10005510` for one node.
 *
 * PUBLISHES NOTHING UNLESS THE RESOLVED BYTE IS 1 — a node whose track has not
 * started leaves last frame's values on the render node rather than writing
 * zeros, which is why the render node keeps `+0x0c` at all.
 *
 * @param node  the render node's mutable fields: {type, built, drawGate, cx,
 *              cy, scale, vertices, objects, cameras}
 * @param ch    the node's evaluated channel block, after pass 2
 * @param resolved  `anim+0x00`
 */
export function publishNode(node, ch, resolved) {
  node.drawGate = resolved;
  if (resolved !== 1) return 'not-resolved';

  // Channels 21, 22 and 23 -> cx, cy, scale. The same three the compose pass
  // copies down a hierarchy and the same three animcheck verifies against the
  // emitter's own numbers.
  node.cx = ch[21]; node.cy = ch[22]; node.scale = ch[23];

  switch (node.type) {
    case 7: return 'root';
    case 6: return publishCamera(node, ch);
    case 5: return publishMesh(node, ch);
    case 4: return publishText(node, ch);
    default: return 'other-unported';
  }
}

/**
 * Type 4 — text. `0x1000570c`, one quad per glyph.
 *
 * THE GLYPH SCALE COMES FROM THE ANIMATION OBJECT'S SUB-OBJECT, not from this
 * node: `lwz r22, 0x74(r22)` steps to it and reads its channels at +0x30/+0x34,
 * each divided by 255 — but ONLY IF NON-ZERO, so a zero stays a zero rather
 * than becoming one. Those two are the glyph width and height in units of the
 * texture's own pixels.
 *
 * THE PEN ADVANCE IS A RATIO, NOT A CONSTANT. `f18 = node.at2c * sub.z +
 * node.at30` and then `f17 = f18 / node.at2c` — the total run divided by the
 * per-character width — so the string is laid out to fit rather than at a fixed
 * pitch, and the cursor starts at `ch[12] - f18/2`.
 *
 * A GLYPH POINTER OF -1 IS A SPACE. The quad is skipped and the pen still
 * advances; `cmpwi` sign-extends, so the sentinel is -1 and not 0xffff.
 *
 * MODE 1 IS AN ITALIC AND IT IS APPLIED TWICE. `f5 * 0.5` is added to both x
 * coordinates before the bottom two corners are written, then the full `f5` is
 * subtracted before the top two — so the bottom edge shifts +24 and the top
 * -24, about a centre that does not move. Applying it once, or to all four
 * corners, gives a sheared quad that still looks like text.
 */
function publishText(node, ch) {
  const sub = node.subChannels;
  if (!sub || !node.glyphs) return 'text-no-suboject';
  let gx = sub[12], gy = sub[13];
  if (gx !== 0) gx /= 255.0;
  if (gy !== 0) gy /= 255.0;

  const at2c = node.at2c, at30 = node.at30;
  let pen = fma(at2c, sub[14], at30);
  const step = pen / at2c;
  pen = -(fma(pen, HALF, -ch[12]));       // ch[12] - pen*0.5
  gx *= HALF;
  gy *= HALF;

  const cy = ch[13], cz = ch[14];
  const c0 = ch[15], c1 = ch[16], c2 = ch[17], c3 = ch[18];
  const du = ch[19], dv = ch[20];

  let drawn = 0;
  for (const g of node.glyphs) {
    if (!g || g.space) { pen += step; continue; }
    const [ru, rv, rw, rh] = g.rect;
    let x0 = -(fma(rw, gx, -pen));        // pen - rw*gx
    const y0 = -(fma(rh, gy, -cy));       // cy - rh*gy
    let x1 = fma(rw, gx, pen);
    const y1 = fma(rh, gy, cy);
    // The four texture coordinates, and note the far pair picks up the channel
    // offset TWICE — once on its own and once through the near pair it is added
    // to. That is what the instruction stream does; it is not a transcription
    // slip.
    const u0 = ru + du, v0 = rv + dv;
    const u1 = (rw + du) + u0, v1 = (rh + dv) + v0;
    if (g.mode === 1) { x0 = fma(SLANT, HALF, x0); x1 = fma(SLANT, HALF, x1); }
    g.quad[0] = [f32(x0), f32(y0), f32(cz), f32(c0), f32(c1), f32(c2), f32(c3),
      f32(u0), f32(v0)];
    g.quad[1] = [f32(x1), f32(y0), f32(cz), f32(c0), f32(c1), f32(c2), f32(c3),
      f32(u1), f32(v0)];
    if (g.mode === 1) { x0 -= SLANT; x1 -= SLANT; }
    g.quad[2] = [f32(x1), f32(y1), f32(cz), f32(c0), f32(c1), f32(c2), f32(c3),
      f32(u1), f32(v1)];
    g.quad[3] = [f32(x0), f32(y1), f32(cz), f32(c0), f32(c1), f32(c2), f32(c3),
      f32(u0), f32(v1)];
    pen += step;
    drawn++;
  }
  return `text:${drawn}`;
}

/**
 * Type 6 — the camera. `0x1000555c`.
 *
 * Copies the WHOLE 24-float channel block into each sub-structure on the chain
 * at `node+0x2c`, then concatenates that copy with the channel block of the
 * node the sub-structure points at (`*(*(sub)) + 0xc` — two dereferences, sub
 * to node to animation object). So a camera pushes its full state down a chain
 * rather than publishing three numbers.
 */
function publishCamera(node, ch) {
  let n = 0;
  for (const sub of node.cameras ?? []) {
    sub.channels = Float64Array.from(ch);
    if (sub.targetChannels) concat(sub.channels, sub.targetChannels);
    n++;
  }
  return `camera:${n}`;
}

/**
 * Type 5 — the mesh. `0x100055b0`.
 *
 * SKIPS ENTIRELY when `node+0x0f` is 1, a built-already flag.
 *
 * Otherwise it transforms every vertex on the list at `node+0x20`, and the
 * split between source and destination fields is the whole of it: position
 * `+0x24` -> `+0x00`, colour `+0x30` -> `+0x40`, normal `+0x50` -> `+0x5c`.
 * The position is the full affine transform, the normal is the 3x3 only, and
 * the colour is four independent scalings by channels 15-18.
 *
 * Then the OBJECT chain at `node+0x24` on `+0x60`: each object's `+0x3c` triple
 * goes through the same 3x3 into `+0x48`. That third component at `+0x50` is
 * what §4c calls the face intensity and mode 2 uses for flat shading — it is
 * the transformed normal's z, which is why the two descriptions are the same
 * thing.
 */
function publishMesh(node, ch) {
  if (node.built === 1) return 'built-already';
  const m = ch;                       // 3x3 at 0-8, translation at 12-14

  // M . v, NOT v . M. `0x10005614` is `fmadd f21, f24, f13, f5` where f13 is
  // ch[0x00] and f5 the translation — so the first output component takes m00,
  // m01, m02, which is ROW zero dotted with the vertex. The compose pass's
  // 0x10005b34 goes the other way round (rows of the node through M), so the
  // two conventions sit four hundred bytes apart in the same function and the
  // wrong one still leaves the middle component exactly right whenever the
  // matrix is a Y rotation, because that row is (0, 1, 0) either way.
  const xf = (x, y, z, t0, t1, t2) => [
    f32(fma(z, m[2], fma(y, m[1], fma(x, m[0], t0)))),
    f32(fma(z, m[5], fma(y, m[4], fma(x, m[3], t1)))),
    f32(fma(z, m[8], fma(y, m[7], fma(x, m[6], t2)))),
  ];
  let n = 0;
  for (const v of node.vertices ?? []) {
    [v.ox, v.oy, v.oz] = xf(v.x, v.y, v.z, m[12], m[13], m[14]);
    // POSITIONAL, one scalar each: +0x30 x ch15 -> +0x40 and so on down. Not a
    // colour-channel pairing — the record's four floats are scaled by channels
    // 15 to 18 in order, whatever they mean.
    v.o0 = f32(v.c0 * ch[15]); v.o1 = f32(v.c1 * ch[16]);
    v.o2 = f32(v.c2 * ch[17]); v.o3 = f32(v.c3 * ch[18]);
    [v.onx, v.ony, v.onz] = xf(v.nx, v.ny, v.nz, 0, 0, 0);
    n++;
  }
  // The object chain's own vector: the 3x3 with no translation, and its third
  // component is what §4c calls the face intensity.
  for (const o of node.objects ?? []) {
    [o.onx, o.ony, o.onz] = xf(o.nx, o.ny, o.nz, 0, 0, 0);
  }
  return `mesh:${n}`;
}
