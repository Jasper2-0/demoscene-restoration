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
  // No keyframe DATA — but `0x10002470` already allocated the track record, so
  // the node still owns exactly one, carrying the defaults `0x10002768` wrote.
  if (gate === 0x1f) { anim.keys.push({ empty: true }); return anim; }

  const n = c.u8();
  for (let i = 0; i <= n; i++) {
    const v = c.u16();
    const k = { hold: v >> 15, time: v & 0x7fff };
    if (!(gate & 1)) k.translate = [c.s16(), c.s16(), c.s16()];
    if (!(gate & 2)) k.rotate = [c.s16(), c.s16(), c.s16()];
    if (!(gate & 4)) {
      if (!skipAlpha) k.alpha = c.u8();
      k.rgb = [c.u8(), c.u8(), c.u8()];
    }
    if (!(gate & 0x10)) {
      // A RAW 32-BIT READ, not one of the four operand readers: one byte
      // doubled and two SIGNED twelve-bit fields.
      const w = c.u32();
      const s12 = (x) => ((x & 0xfff) >= 0x800 ? (x & 0xfff) - 0x1000 : (x & 0xfff));
      k.project = [(w >>> 24) * 2, s12(w >>> 12), s12(w)];
    }
    if (!(gate & 8)) k.pan = [c.s16(), c.s16()];
    anim.keys.push(k);
  }
  return anim;
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
      node.subs = [];
      for (let i = 0; i < SUBOBJECTS[op]; i++) node.subs.push(readAnim(c, true));
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
  return { nodes, consumed: c.at, length };
}
