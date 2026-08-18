// scene.js — the scene stream, decoded.
//
// `_generate_scene` (`0x100021bc`) reads a scene out of seg3 or seg4 and builds
// the node list `_show_scene` then walks. This is that walk, and it is the last
// of the intro's four bytecode formats to give way.
//
// IT RESISTED THREE ATTEMPTS AND THE REASON IS WORTH KEEPING. Every one of them
// built a grammar out of the seven scene handlers, which is where the operand
// readers are — and the handlers account for at most ten bytes of a forty-one
// byte node. Most of a node is an ANIMATION OBJECT that a shared routine reads
// before the handler is even called, and no amount of reading the handlers
// harder was going to reveal it.
//
// What did reveal it was measurement. `work/re/scenewalk.py` patches the
// stream's own u16 length and watches the node count: the walk is bounded by
// that length, so the count is a step function whose steps sit exactly on the
// opcode boundaries. The first run said the root consumes nine bytes and a
// typical op-3 node forty-one, and the twenty-seven-byte gap between forty-one
// and the eleven the old grammar predicted is what pointed at the animation
// object.
//
// THE BOUND IS `bge`, NOT `bgt`. `0x10002200` stops when the cursor REACHES the
// declared end rather than passing it, so the byte sitting at `length - 1` is
// read as an opcode and thrown away.

import { f32 } from './fp.js';

// `[r2+0x2e5e]` — degrees to sine-table units, 32768/360. The rotate group is
// stored already scaled, which is why the animation pass can index the table
// directly.
const DEG = 91.02222442626953;
// The projection defaults `0x1000259c` writes before the group is read:
// half of 640 and half of 480, so an absent group centres the node.
const CX0 = 320.0, CY0 = 240.0;

/** Node sizes from `r2+0x28ca`. Opcode 7 is the synthesised root. */
export const SIZES = [44, 48, 52, 108, 212, 44, 56, 60];

/**
 * How many extra animation objects each handler allocates for the sub-object
 * chain on `+0x74`, by calling `0x1000243c` again. Each one reads a whole
 * animation block out of the stream.
 */
const SUBOBJECTS = [2, 3, 4, 0, 1, 0, 0, 0];

/** Bytes each handler reads directly. Ops 4 and 6 are variable, below. */
const HANDLER = [0, 0, 0, 10, 0, 0, 0, 0];

class Cursor {
  constructor(b, at) { this.b = b; this.at = at; this.end = b.length; }

  u8() {
    if (this.at >= this.end) throw new RangeError(`u8 at ${this.at}`);
    return this.b[this.at++];
  }

  u16() {
    const v = (this.u8() << 8);
    return v | this.u8();
  }

  s16() {
    const v = this.u16();
    return v >= 0x8000 ? v - 0x10000 : v;
  }

  u32() {
    return ((this.u16() << 16) >>> 0) + this.u16();
  }
}

/**
 * `0x1000243c` — a node's animation object and its keyframe chain.
 *
 * THE GATE BITS ARE ACTIVE LOW. `andi.` then `bne` SKIPS the group when the bit
 * is set, so a clear bit means the field is present — the same polarity the
 * geometry builder's prologue uses, and the opposite of what reads naturally.
 *
 * `skipAlpha` is the one thing here that is not in the stream. The alpha byte
 * in group 2 is read only when `r20` is neither 1 nor 4; `r20` is 4 for the
 * synthesised root and is set to 1 immediately before a handler runs, so a
 * node's own block reads it and every sub-object a handler allocates does not.
 */
function readAnim(c, skipAlpha) {
  const flags2 = c.u8();
  const parentHi = c.u8();
  const parentLo = c.u8();
  const gate = flags2 & 0x1f;
  const loop = flags2 & 0xe0;
  const anim = {
    flags2,
    flags3: parentLo & 0xf0,
    // An ENCODED reference, not a pointer: a post-pass at `0x100022d0` walks the
    // finished list and turns it into one, or into -1 for a root.
    parentRef: ((parentHi << 16) >>> 0) | (parentLo & 0x0f),
    loopMode: loop >> 5,
    gate,
    keys: [],
  };
  if (loop === 0) {
    const t = c.u8();
    anim.trigger = t & 0x0f;
    anim.at72 = (t >> 4) & 7;
    anim.at71 = t >> 7;
  }
  // No keyframe DATA — but `0x10002470` already allocated the track record and
  // `0x10002768` preset it, so the node owns exactly one keyframe carrying
  // those defaults. It has to be a REAL keyframe and not a marker: the
  // coefficient pass runs over the chain regardless, and giving it no blocks
  // makes that pass throw, which the decoder's own catch then turns into a
  // silently truncated node list rather than an error.
  if (gate === 0x1f) {
    const b = new Array(15).fill(0);
    b[6] = 1.0; b[7] = 1.0; b[8] = 1.0; b[9] = 1.0;
    anim.keys.push({ empty: true, hold: 0, time: 0, t0: 0, blocks: b });
    return anim;
  }

  const n = c.u8();
  for (let i = 0; i <= n; i++) {
    const v = c.u16();
    // Each group writes the FIRST float of one 16-byte block; the other three
    // are polynomial coefficients a later pass fills in. `0x10002768` presets
    // the alpha and colour blocks to 1.0 before every keyframe, so an absent
    // colour group is opaque white rather than black.
    // ZERO, NOT NULL. `alloc_mem` zeroes the 0x104 track record it hands out,
    // so a block whose group is absent really is 0.0 rather than absent — and
    // the coefficient pass reads all fifteen either way. Leaving them null
    // makes them look unknown when the original knows exactly what they are.
    const k = { hold: v >> 15, time: v & 0x7fff, t0: f32(v & 0x7fff),
      blocks: new Array(15).fill(0) };
    k.blocks[6] = 1.0; k.blocks[7] = 1.0; k.blocks[8] = 1.0; k.blocks[9] = 1.0;
    if (!(gate & 1)) {
      k.blocks[0] = f32(c.s16()); k.blocks[1] = f32(c.s16());
      k.blocks[2] = f32(c.s16());
    }
    if (!(gate & 2)) {
      // THE MIDDLE ANGLE IS NEGATED. `fmul`, then `fnmadd f0, f0, f14, f31`
      // with f31 zero — so the y rotation comes out with the opposite sign from
      // its neighbours, and reading all three as `fmul` mirrors every scene.
      k.blocks[3] = f32(c.s16() * DEG);
      k.blocks[4] = f32(-(c.s16() * DEG));
      k.blocks[5] = f32(c.s16() * DEG);
    }
    if (!(gate & 4)) {
      if (!skipAlpha) k.blocks[6] = f32(c.u8() / 255.0);
      k.blocks[7] = f32(c.u8() / 255.0);
      k.blocks[8] = f32(c.u8() / 255.0);
      k.blocks[9] = f32(c.u8() / 255.0);
    }
    k.blocks[14] = CX0; k.blocks[12] = CX0; k.blocks[13] = CY0;
    if (!(gate & 0x10)) {
      // A RAW 32-BIT READ, not one of the four operand readers: one byte
      // doubled and two SIGNED twelve-bit fields, and they land in blocks
      // 14, 13, 12 in that order — cx, cy, scale, stored backwards.
      const w = c.u32();
      const s12 = (x) => ((x & 0xfff) >= 0x800 ? (x & 0xfff) - 0x1000 : (x & 0xfff));
      k.blocks[14] = f32((w >>> 24) * 2);
      k.blocks[13] = f32(s12(w >>> 12));
      k.blocks[12] = f32(s12(w));
    }
    if (!(gate & 8)) { k.blocks[10] = f32(c.s16()); k.blocks[11] = f32(c.s16()); }
    anim.keys.push(k);
  }
  return anim;
}

/**
 * `0x10002658` — turn the keyframe VALUES into the cubic each channel is
 * evaluated with. Runs once over the chain, right after it is read.
 *
 * Every keyframe holds fifteen 16-byte blocks and the reader fills only the
 * first float of each. This fills the other three from the neighbouring
 * keyframes, which is why `anim.js` can read `k[1]`, `k[2]` and `k[3]` straight
 * out of the track: they were computed here, not at evaluation time.
 *
 * THE NEIGHBOURS CLAMP AT BOTH ENDS AND THE PREVIOUS ONE LAGS. `prev` starts
 * pointing AT the head, so the first keyframe is its own predecessor, and it
 * only begins advancing after the first iteration; `next` and `next2` fall back
 * to themselves at the tail. So a two-keyframe track has every neighbour
 * collapsed onto one of the two, which is most of the tracks in the intro.
 *
 * THE HOLD FLAG SKIPS THE ACCUMULATION ENTIRELY. With `flags` set, the three
 * coefficients stay as the raw differences and `anim.js` takes its `fnmsub`
 * branch — a step rather than a curve. Running the accumulation anyway turns
 * every hold in the intro into a slide.
 *
 * `invSpan` is `fres` of the gap to the next keyframe, and a zero gap leaves it
 * zero rather than infinite: `fcmpu` then `beq` skips the reciprocal.
 */
export function prepareTrack(keys) {
  const fres = (x) => Math.fround(1 / x);
  for (let i = 0; i < keys.length; i++) {
    const cur = keys[i];
    const prev = keys[i === 0 ? 0 : i - 1];
    const next = keys[i + 1] ?? cur;
    const next2 = keys[i + 2] ?? next;
    const span = next.t0 - cur.t0;
    cur.invSpan = span === 0 ? span : fres(span);
    cur.coeff = [];
    for (let b = 0; b < 15; b++) {
      const p = prev.blocks[b], t = cur.blocks[b];
      const n = next.blocks[b], nn = next2.blocks[b];
      let c1 = n - p;
      let c2 = nn - t;
      let c3 = t - n;
      if (!cur.hold) {
        c2 = c2 + c3;
        c2 = c2 + c3;
        c2 = c2 + c1;
        c3 = c2 + c3;
        c3 = c3 + c1;
      }
      cur.coeff.push([t, f32(c1), f32(c2), f32(c3)]);
    }
  }
  return keys;
}

/**
 * `0x10002320` — resolve every encoded parent reference into the animation
 * object it names. Runs after the whole list is built, because a node may name
 * one that does not exist yet.
 *
 * The reference packs a NODE INDEX in its top sixteen bits and a SUB-OBJECT
 * index in its low four. `0xff` in the node field means no parent; `0xf` in the
 * sub-object field means the node's own animation object rather than one of the
 * chain on `+0x74`. The two sentinels are different widths and different
 * values, which is easy to get symmetrical and wrong.
 *
 * THE NODE INDEX IS ONE-BASED, and not because anything says so: the walk
 * starts at `head->next` and only THEN steps the counter, so a stored zero
 * means the second node in the list. Reading it as zero-based resolves every
 * parent to the node before the right one — which still produces a valid
 * hierarchy, just the wrong one.
 */
export function resolveParents(nodes) {
  for (const node of nodes) {
    for (const anim of [node.anim, ...node.subs]) {
      const ref = anim.parentRef;
      const ni = ref >>> 16, si = ref & 0x0f;
      if (ni === 0xff) { anim.parent = null; continue; }
      const target = nodes[ni + 1];
      if (!target) { anim.parent = null; continue; }
      anim.parent = si === 0x0f ? target.anim : (target.subs[si] ?? target.anim);
    }
  }
  return nodes;
}

/**
 * Decode one scene stream.
 *
 * @param {Uint8Array} bytes the segment holding it
 * @param {number} at offset of the u16 length word
 */
export function decodeScene(bytes, at) {
  const length = ((bytes[at] << 8) | bytes[at + 1]);
  const body = bytes.subarray(at + 2, at + 2 + length);
  const c = new Cursor(body, 0);
  const nodes = [];
  let op = 7, clip = 0;
  try {
    for (;;) {
      const node = { op, clip, size: SIZES[op], at: c.at };
      // Everything but the root carries a RESOURCE byte: low seven bits index
      // the text table, or the object table for op 5, or stand for themselves
      // for op 6; the top bit becomes `2 - bit` at node+0x0d.
      if (op !== 7) {
        const r = c.u8();
        node.resource = r & 0x7f;
        node.at0d = 2 - (r >> 7);
      }
      node.anim = readAnim(c, op === 7);
      prepareTrack(node.anim.keys);
      node.subs = [];
      for (let i = 0; i < SUBOBJECTS[op]; i++) {
        const sub = readAnim(c, true);
        prepareTrack(sub.keys);
        node.subs.push(sub);
      }
      if (op === 4) {
        const n = c.u8();
        let s = '';
        for (let i = 0; i < n; i++) s += String.fromCharCode(c.u8());
        node.text = s;
      } else if (op === 6) {
        // A count, then one byte per camera sub-structure — the chain on
        // +0x2c/+0x64 that pass 3's camera tail pushes its block down.
        const n = c.u8();
        node.cameras = [];
        for (let i = 0; i < n; i++) node.cameras.push(c.u8());
      }
      for (let i = 0; i < HANDLER[op]; i++) c.u8();
      nodes.push(node);

      if (c.at >= body.length) break;
      const raw = c.u8();
      if (c.at >= length) break;          // `bge`, not `bgt`
      op = raw & 0x7f;
      clip = raw & 0x80;
      if (op > 7) return { nodes, consumed: c.at, length, badOpcode: op };
    }
  } catch (e) {
    return { nodes, consumed: c.at, length, overrun: String(e.message) };
  }
  resolveParents(nodes);
  return { nodes, consumed: c.at, length };
}
