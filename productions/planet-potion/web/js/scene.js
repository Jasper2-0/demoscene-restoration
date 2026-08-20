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

import { f32, fma } from './fp.js';

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
  let cameraCount = 0;   // reset per stream, `0x100021cc`
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
      // WHICH MATRIX BUILDERS PASS 1 RUNS IS DECIDED BY THE NODE TYPE, not by
      // anything in the animation record: 6 -> 2 (the rotations only, left
      // multiplied, no translate matrix), 7 -> 4, everything else -> 0. The
      // arena agrees on all 1,185 node-frames across the 29 scenes, and getting
      // this wrong is invisible until a camera: every other type is mode 0, so
      // hardcoding zero reproduces 1,073 of 1,118 channel blocks exactly and
      // misses the 45 that decide where the whole scene is looked at from.
      node.anim.mode = op === 6 ? 2 : op === 7 ? 4 : 0;
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
        // EVERY CAMERA GETS AN ORDINAL, from a counter the scene builder
        // resets per stream (`0x100021cc`) and bumps here (`0x10002f28`). The
        // renderer draws a camera's references only when this equals the show's
        // active-camera global, which `_play_scene_new_camera` sets — so a
        // scene with four cameras renders one of them at a time.
        node.ordinal = cameraCount++;
        node.at30 = node.anim.flags2 & 1;   // `node[4] & 1`, 0x10002f38
        const n = c.u8();
        node.cameras = [];
        for (let i = 0; i < n; i++) node.cameras.push(c.u8());
      }
      // OP 3'S TEN TRAILING BYTES ARE SIX OPERANDS, not padding: `0x10002b08`
      // reads u16, u16, u8, u8, u16, u16 through the readers at `0x1000274c`
      // and `0x10002738`, and each one goes straight through `int2float`. The
      // first two carry a flag in 0x4000 and another in 0x8000 and keep 14 bits
      // of value; the FIFTH carries the fan-or-strip selector in its top bit and
      // keeps 15.
      //
      // That selector is the whole difference between two primitives. The type-3
      // render handler at `0x10005ddc` reads it as a halfword from node+0x68 and
      // falls through into the TYPE 0 handler when it is zero — a line strip
      // with a minimum of two vertices — or branches to the type 1 and 2 handler
      // when it is set, a triangle fan with a minimum of three.
      if (op === 3) {
        const a0 = c.u16(), a1 = c.u16(), a2 = c.u8(), a3 = c.u8();
        const a4 = c.u16(), a5 = c.u16();
        node.at68 = a4 >>> 15;
        node.operands = [a0 & 0x3fff, a1 & 0x3fff, a2, a3, a4 & 0x7fff, a5];
        node.opFlags = [(a0 >>> 14) & 1, (a0 >>> 15) & 1,
          (a1 >>> 14) & 1, (a1 >>> 15) & 1];
        // The sub-objects op 3 makes for itself, and the count it stores.
        node.subs = generateOp3(node.operands, node.opFlags);
        for (const sub of node.subs) prepareTrack(sub.keys);
        node.at20 = node.subs.length;
      } else {
        for (let i = 0; i < HANDLER[op]; i++) c.u8();
      }
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

// ---------------------------------------------------------------------------
// `0x100027b8` — scene op 5's handler, and the seam between the intro's two
// largest data structures.
//
// It COPIES rather than references: a geometry program is a template and every
// scene using one gets its own vertices and faces, which is why the same mesh
// can be animated differently in two places.

/**
 * Build a scene mesh node's vertex and face chains from a geometry program.
 *
 * A GEOMETRY NODE WITH ITS VISIBLE FLAG CLEAR IS SKIPPED. Every build handler
 * sets `+0x12` to 1, and op3's eval then clears it on whatever node it CLONED —
 * so a source that has been copied is hidden and only the copy is drawn.
 *
 * THE VERTEX INDICES ARE PER SOURCE NODE, NOT GLOBAL. `0x1000277c` resolves an
 * index by walking `+0x68` from the first vertex THIS geometry node
 * contributed, so a program with several nodes needs a fresh base for each.
 * Indexing the whole list works perfectly for single-node programs and gets
 * every multi-node mesh wrong.
 *
 * THE COLOUR CHANGES ADDRESS ON THE WAY ACROSS: geometry `+0x0c` becomes scene
 * `+0x30`. That is why the geometry builder's own `+0x30` is zero everywhere —
 * it writes its colours somewhere else and this routine moves them.
 */
// --- op 3's generated sub-objects ------------------------------------------
//
// `0x10002b08`. Every other type reads its sub-objects out of the stream; op 3
// SYNTHESISES them, which is why SUBOBJECTS says zero for it and why the type
// that accounts for 194 of the 395 nodes had none until now.
//
// It is a rounded rectangle. Six operands — width, height, a u and v origin, a
// u and v span — and four flag bits, one per corner, each CLEARING to round
// that corner rather than setting to. A corner costs three extra vertices, so
// the count comes out at 5, 17 or 8, and `0x10002e08` stores it at node+0x20.
//
// The arcs are three constants from the float pool: 0.032, 0.016 and 0.008 at
// `r2+0x2e46`, `+0x2e4a` and `+0x2e4e`, used as fractions of the width and
// height. Every coordinate is one FUSED operation on top of a rounded product —
// `fmul` then `fmsub` — so the pairs below are not algebraically simplified.
//
// `0x100023a8` turns each into a 0x78 animation object with one keyframe:
// blocks 0, 1 and 2 are the position, blocks 10 and 11 the texture pair, and
// `0x10002768` presets blocks 6 to 9 to 1.0 — which is the alpha and the three
// colours. Those blocks land on channels 12-14, 19-20 and 15-18 through the
// same GROUPS table every other track uses, so a generated sub-object IS a
// vertex record, exactly like a decoded one.
//
// It also writes 320, 240 and 320 into the channel block's cx, cy and scale.
// That never survives: the first evaluation rebuilds the block from the
// keyframe, whose blocks 12-14 are zero, and the arena agrees — every op-3
// sub-object reads 0, 0, 0 there.
// THE ARC CONSTANTS ARE FLOAT32 VALUES OUT OF THE EXECUTABLE'S OWN POOL, not
// decimal literals. `r2+0x2e46`, `+0x2e4a` and `+0x2e4e` are 0x3d03126f,
// 0x3c83126f and 0x3c03126f, which are 0.032000001519918442,
// 0.016000000759959221 and 0.0080000003799796104 — and writing 0.016 instead
// puts every rounded corner's texture coordinate one ulp low. 280 * 0.016 comes
// out as 4.4799995 rather than the 4.4800000 the arena holds, which is exactly
// the difference between the two spellings and nothing else. Same trap as
// tables.js's pi and 1e-4.
const poolF32 = (bits) => new Float32Array(new Uint32Array([bits]).buffer)[0];
const K5 = 0.5;
const K4 = poolF32(0x3d03126f);
const K3 = poolF32(0x3c83126f);
const K2 = poolF32(0x3c03126f);

// capstone's operand order is `op frD, frA, frC, frB`, so the addend is last.
const madd = (a, c, b) => fma(a, c, b);
const msub = (a, c, b) => fma(a, c, -b);
const nmadd = (a, c, b) => -fma(a, c, b);
const nmsub = (a, c, b) => -fma(a, c, -b);

/** One synthesised sub-object: an animation record with a single keyframe. */
function pointSub(x, y, z, u, v) {
  // FIFTEEN blocks, the same as any decoded keyframe — GROUPS indexes 0 to 14.
  const blocks = new Array(15).fill(0);
  blocks[0] = x; blocks[1] = y; blocks[2] = z;
  for (const b of [6, 7, 8, 9]) blocks[b] = 1.0;   // 0x10002768
  blocks[10] = u; blocks[11] = v;
  // ONE keyframe, so prepareTrack's neighbours are all itself and every cubic
  // coefficient falls out to zero: the block evaluates to its constant at any
  // tick, which is what a generated vertex wants.
  return {
    flags2: 0x40, flags3: 0, loopMode: 2, trigger: 0, parent: null,
    generated: true,
    keys: [{ time: 0, t0: 0, hold: 0, blocks }],
  };
}

/**
 * The fourteen emit sites of `0x10002b08`, in order, with their four gates.
 *
 * `flags` is [cr4, cr5, cr6, cr7] — 0x4000 and 0x8000 of the first operand word
 * then of the second. A bit SET skips its corner's extra vertices.
 */
export function generateOp3(operands, flags) {
  const [A, B, C, D, E, F] = operands;
  const [g4, g5, g6, g7] = flags;
  const U = madd(E, K5, C);           // fmadd f22, f20, f5, f22
  const V = madd(F, K5, D);
  const z = 0;
  const out = [];
  let x, y, u, v;
  const emit = () => out.push(pointSub(x, y, z, u, v));

  x = nmadd(A, K5, 0); y = nmadd(B, K5, 0);
  u = nmsub(E, K5, U); v = nmsub(F, K5, V);
  if (!g4) {
    x = nmsub(A, K5, A * K3); y = nmsub(B, K5, B * K2);
    u = nmsub(E, K5, madd(E, K3, U)); v = nmsub(F, K5, madd(F, K2, V));
    emit();
    x = nmsub(A, K5, A * K4); y = nmadd(B, K5, 0);
    u = nmsub(E, K5, madd(E, K4, U)); v = nmsub(F, K5, V);
  }
  emit();                                                    // 0x10002bf0

  x = A * K5; y = nmadd(B, K5, 0);
  u = madd(E, K5, U); v = nmsub(F, K5, V);
  if (!g5) {
    x = msub(A, K5, A * K4);
    u = msub(E, K5, msub(E, K4, U));
    emit();
    x = msub(A, K5, A * K3); y = nmsub(B, K5, B * K2);
    u = msub(E, K5, msub(E, K3, U)); v = nmsub(F, K5, madd(F, K2, V));
    emit();
    x = msub(A, K5, A * K2); y = nmsub(B, K5, B * K3);
    u = msub(E, K5, msub(E, K2, U)); v = nmsub(F, K5, madd(F, K3, V));
    emit();
    y = nmsub(B, K5, B * K4); x = A * K5;
    v = nmsub(F, K5, madd(F, K4, V)); u = madd(E, K5, U);
  }
  emit();                                                    // 0x10002c7c

  x = A * K5; y = B * K5;
  u = madd(E, K5, U); v = madd(F, K5, V);
  if (!g7) {
    y = msub(B, K5, B * K4);
    v = msub(F, K5, msub(F, K4, V));
    emit();
    x = msub(A, K5, A * K2); y = msub(B, K5, B * K3);
    u = msub(E, K5, msub(E, K2, U)); v = msub(F, K5, msub(F, K3, V));
    emit();
    x = msub(A, K5, A * K3); y = msub(B, K5, B * K2);
    u = msub(E, K5, msub(E, K3, U)); v = msub(F, K5, msub(F, K2, V));
    emit();
    x = msub(A, K5, A * K4); y = B * K5;
    u = msub(E, K5, msub(E, K4, U)); v = madd(F, K5, V);
  }
  emit();                                                    // 0x10002d08

  x = nmadd(A, K5, 0); y = B * K5;
  u = nmsub(E, K5, U); v = madd(F, K5, V);
  if (!g6) {
    x = nmsub(A, K5, A * K4);
    u = nmsub(E, K5, madd(E, K4, U));
    emit();
    x = nmsub(A, K5, A * K3); y = msub(B, K5, B * K2);
    u = nmsub(E, K5, madd(E, K3, U)); v = msub(F, K5, msub(F, K2, V));
    emit();
    x = nmsub(A, K5, A * K2); y = msub(B, K5, B * K3);
    u = nmsub(E, K5, madd(E, K2, U)); v = msub(F, K5, msub(F, K3, V));
    emit();
    y = msub(B, K5, B * K4); x = nmadd(A, K5, 0);
    v = msub(F, K5, msub(F, K4, V)); u = nmsub(E, K5, U);
  }
  emit();                                                    // 0x10002d94

  x = nmadd(A, K5, 0); y = nmadd(B, K5, 0);
  u = nmsub(E, K5, U); v = nmsub(F, K5, V);
  if (!g4) {
    y = nmsub(B, K5, B * K4);
    v = nmsub(F, K5, madd(F, K4, V));
    emit();
    x = nmsub(A, K5, A * K2); y = nmsub(B, K5, B * K3);
    u = nmsub(E, K5, madd(E, K2, U)); v = nmsub(F, K5, madd(F, K3, V));
    emit();
    x = nmsub(A, K5, A * K3); y = nmsub(B, K5, B * K2);
    u = nmsub(E, K5, madd(E, K3, U)); v = nmsub(F, K5, madd(F, K2, V));
  }
  emit();                                                    // 0x10002e04
  return out;
}

export function buildMesh(program) {
  const vertices = [];
  const faces = [];
  // POINT SPRITES. A geometry node carries a FOURTH chain at +0x0c that nothing
  // used to export, and `0x1000298c` copies it into the scene node's +0x28 list.
  // A node with no triangles at all is not empty: part one's program 12 is 81
  // points and nothing else, and the two scene nodes that use it drew nothing
  // until this existed.
  const sprites = [];
  for (const node of program.nodes) {
    if (!node.visible) continue;
    const base = vertices.length;
    for (const v of node.vertices) {
      vertices.push({
        p: [...v.p],
        n: [...v.n],
        // The four the geometry vertex allocator preset to 1.0, landing in the
        // slot everything downstream reads as the source colour.
        rgba: [1, 1, 1, 1],
      });
    }
    for (const q of node.sprites ?? []) {
      // The vertex is an INDEX, walked down the +0x68 chain by `0x1000277c`,
      // and rebased here the same way a triangle's indices are.
      sprites.push({
        vertex: base + q.vertex,
        size: q.size,
        textureIndex: q.texIndex,
        // Four corners share one colour and take opposite ends of the UV rect:
        // (u0,v0), (u1,v0), (u1,v1), (u0,v1) — `0x10002a00` onward.
        uv: [[q.uv[0], q.uv[1]], [q.uv[2], q.uv[1]],
          [q.uv[2], q.uv[3]], [q.uv[0], q.uv[3]]],
        // Positional again: alpha first, then the three colours.
        rgba: [...q.rgba],
      });
    }
    for (const t of node.triangles) {
      // ONE SCENE FACE PER LAYER, NOT PER TRIANGLE. `0x10002964` follows the
      // geometry triangle's +0x4a and gives each layer its own 0x64 record on
      // the scene face's +0x5c chain, and the render walk draws every one. The
      // layers share the triangle's vertex INDICES and carry their own
      // material, so they are extra primitives over the same geometry — 1,616
      // of them across the 39 programs.
      for (const t2 of [t, ...(t.layers ?? [])]) faces.push({
        // A LAYER IS NOT ON THE OBJECT CHAIN. Pass 3 refreshes the face
        // intensity by walking `+0x60`, which threads the BASE triangles; a
        // layer hangs off its triangle's `+0x5c` and is never visited, so its
        // `+0x50` keeps whatever the builder left there. Flagged here because
        // by the time the renderer sees a face the two are indistinguishable.
        layer: t2 !== t,
        count: t2.count,
        vertices: t2.idx.map((i) => base + i),
        cull: t2.cull,
        // The material quad is positional, not named: slot 0 is the ALPHA and
        // 1..3 are the colours, which is the order the shading step reads.
        alpha: t2.rgba[0],
        rgb: [t2.rgba[1], t2.rgba[2], t2.rgba[3]],
        normal: t2.normal,
        uv: t2.uv,
        texture: t2.texture,
        textureIndex: t2.texIndex,
        prim: t2.prim,
        shading: t2.kind,
      });
    }
  }
  return { vertices, faces, sprites };
}
