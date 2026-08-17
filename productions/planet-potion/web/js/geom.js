// geom.js — the geometry program stream, decoded.
//
// `_generate_obj` (`0x10003018`) reads a program out of seg3 or seg4 and builds
// a linked list of geometry nodes, each carrying up to three chains: material
// records, vertices and indexed triangles. This file is the FIRST HALF of that
// — the decoder that turns the byte stream into node descriptors. The five
// generators that turn a descriptor into vertices are separate and not here.
//
// NOTES.md RECORDED THE OPERAND WIDTHS AS UNMODELLABLE. They are not, and the
// reason the earlier reading went wrong is worth keeping. The shared prologue
// does index a table that is built at runtime — but it indexes it for two
// POINTER VALUES, never for a width:
//
//     lbz   r3, 1(r31)        /* one byte, always one byte              */
//     slwi  r3, r3, 3
//     lwzx  r3, r28, r3       /* -> record+0x18                          */
//     lwzx  r25, r28, r25     /* -> record+0x14                          */
//
// `r28` is `_generate_obj`'s SECOND ARGUMENT, the texture table. Reading a
// value out of a runtime table is not the same as having a runtime-dependent
// grammar, and conflating the two is what made three attempts fail. Every
// width in the prologue and in all five handlers is gated by a bit that was
// itself read from the stream a few instructions earlier, so the whole program
// decodes from the bytes alone. `work/re/geocheck.mjs` holds this to all 39
// programs against what the running interpreter actually built.
//
// THE WALK IS BOUNDED BY A u16 BYTE COUNT, not by a terminator, and the bound
// is tested AFTER the opcode byte is consumed:
//
//     lhz   r29, 0(r31); addi r31, r31, 2; add r30, r31, r29
//     loop: lbz r29, 0(r31); addi r31, r31, 1
//           cmpw r31, r30; bgt done
//
// so an opcode at exactly `r30` is read and then discarded. Stopping one byte
// later, or testing before the increment, changes which programs terminate.
import { f32, fma } from './fp.js';
import { fctiw } from './tables.js';

// `_generate_obj`'s own constants, both read from the small data area:
// `[r2+0x2dee]` is 255.0 and `[r2+0x2dd2]` is 128.0. It then derives
// f30 = 128/128 = 1.0, f31 = 128-128 = 0.0 and f29 = 128/255 — a division it
// performs rather than a constant it loads, which is why the value here is
// written the same way instead of as a decimal.
const K255 = 255.0;
const K128 = 128.0;
const ONE = K128 / K128;
const HALFISH = K128 / K255;

/** The five build handlers at `0x1000a9b0`, and the node size each allocates. */
export const OPS = [
  { op: 0, build: 0x100048b8, size: 28 },
  { op: 1, build: 0x10004b5c, size: 64 },
  { op: 2, build: 0x10004c24, size: 32 },
  { op: 3, build: 0x10004c64, size: 76 },
  { op: 4, build: 0x10004cec, size: 32 },
];

/**
 * A cursor over the program, with the readers the handlers use.
 *
 * ALL THREE WIDTHS AND BOTH SIGNEDNESSES ARE DISTINCT AND USED. `lbz` is an
 * unsigned byte, `lhz` an unsigned halfword and `lha` a SIGNED one, and op2
 * reads its `lha` at an ODD offset — geometry operands are not aligned and a
 * reader that assumes they are will read the wrong bytes from op2 onward.
 */
class Cursor {
  constructor(bytes, at) {
    this.b = bytes;
    this.at = at;
  }

  u8() { return this.b[this.at++]; }

  u16() {
    const v = (this.b[this.at] << 8) | this.b[this.at + 1];
    this.at += 2;
    return v;
  }

  s16() {
    const v = this.u16();
    return v >= 0x8000 ? v - 0x10000 : v;
  }

  /** `lha` at a byte offset from the cursor, WITHOUT advancing it. */
  peekS16(off) {
    const v = (this.b[this.at + off] << 8) | this.b[this.at + off + 1];
    return v >= 0x8000 ? v - 0x10000 : v;
  }
}

/**
 * `FUN_100030f8` — the shared material record, 0x58 bytes, self-describing.
 *
 * Called only by op0 and op4. Returns the chain it built; `flags & 0x2000` on
 * the first halfword loops the whole routine onto a freshly allocated record,
 * so one call can produce several.
 *
 * THE COLOUR DEFAULTS TO OPAQUE WHITE, NOT TO ZERO. `fmr f19..f16, f30` runs
 * before the test, so a record whose flag bit 3 is SET keeps 1.0 in all four
 * channels. `alloc_mem` zeroes what it hands out, so reading these as zero —
 * which is what a port that only writes the taken branch would produce — is a
 * visible difference, not a harmless one.
 */
function readRecord(c, textures) {
  const out = [];
  for (;;) {
    const b0 = c.u8();
    const texIndex = c.u8();
    const p2 = c.u8();
    const p3 = c.u8();
    const fa = c.u16();
    const fb = c.u16();

    // Bit 3 CLEAR means the colour is in the stream, as four bytes over 255.
    let rgba = [ONE, ONE, ONE, ONE];
    if (!(b0 & 8)) {
      rgba = [c.u8(), c.u8(), c.u8(), c.u8()].map((v) => f32(v / K255));
    }

    // Each of the three triples is present only when its gate bit is CLEAR.
    const translate = !(fa & 0x8000)
      ? [f32(c.s16()), f32(c.s16()), f32(c.s16())] : [0, 0, 0];
    // Degrees times 91: 32768/360 is 91.02, and the sine table's 8,192 entries
    // of four bytes span exactly one turn. Kept as the INTEGER the builder
    // stores — `stw`, not `stfs` — because the rotate routine masks it.
    const rotate = !(fb & 0x8000)
      ? [c.s16() * 0x5b, c.s16() * 0x5b, c.s16() * 0x5b] : [0, 0, 0];
    const scale = !(fb & 0x2000)
      ? [f32(c.s16() / K255), f32(c.s16() / K255), f32(c.s16() / K255)]
      : [ONE, ONE, ONE];

    // `cull` is a three-way and bit 7 of the flags byte WINS over `fa`: the
    // 0x4000 test runs first and picks 1 or 2, then 0x80 overwrites with 0.
    const cull = (b0 & 0x80) ? 0 : ((fa & 0x4000) ? 2 : 1);

    // Kinds 5 and 6 both read one more halfword into the same field and differ
    // only in whether it is scaled by 128/255.
    const kind = b0 & 7;
    let at2c = 0;
    if (kind === 5) at2c = f32(c.u16() * HALFISH);
    else if (kind === 6) at2c = f32(c.u16());

    out.push({
      kind,
      sub: b0 & 0x70,
      cull,
      flag: (fb & 0x4000) ? 1 : 0,
      rgba,
      texIndex,
      texture: textures ? textures[texIndex] : null,
      size: [f32(p2), f32(p3)],
      span: [f32(fa & 0x1fff), f32(fb & 0x1fff)],
      at2c,
      translate,
      rotate,
      scale,
    });
    if (!(fa & 0x2000)) return out;
  }
}

/** op0 — `0x100048b8`. The prologue, then two or three halfwords of extent. */
function op0(c, textures) {
  const records = readRecord(c, textures);
  let a = c.u16();
  let b = c.u16();
  let d;
  let mode;
  // A two-bit case on the top bits of the two halfwords, and each arm both
  // picks the mode and REWRITES the operands — the masked-off 0x8000 becomes a
  // zero in one of the three extents rather than being dropped.
  if (!(a & 0x8000) && !(b & 0x8000)) {
    mode = 0;
    d = c.u16();
  } else if (!(a & 0x8000)) {
    mode = 2;
    d = b & 0x7fff;
    b = 0;
  } else if (!(b & 0x8000)) {
    mode = 1;
    d = b;
    b = a & 0x7fff;
    a = 0;
  } else {
    mode = 3;
    a &= 0x7fff;
    b &= 0x7fff;
    d = 0;
  }
  // Three five-bit subdivision counts packed into one halfword, each stored
  // one greater than it is written.
  const packed = c.u16();
  return {
    op: 0,
    mode,
    records,
    extent: [a, b, d],
    steps: [(packed & 0x1f) + 1, ((packed >> 5) & 0x1f) + 1,
      ((packed >> 10) & 0x1f) + 1],
  };
}

/** op1 — `0x10004b5c`. No prologue; three optional triples on a flags byte. */
function op1(c) {
  const at18 = c.u8();
  const flags = c.u8();
  // NOTE THE ORDER. Bit 1 fills +0x28 and bit 2 fills +0x1c, so the field that
  // comes SECOND in the record is read FIRST from the stream.
  const b = (flags & 1)
    ? [f32(c.s16()), f32(c.s16()), f32(c.s16())] : [0, 0, 0];
  const a = (flags & 2)
    ? [f32(c.s16()), f32(c.s16()), f32(c.s16())] : [0, 0, 0];
  const scale = (flags & 4)
    ? [f32(c.s16()), f32(c.s16()), f32(c.s16())] : [ONE, ONE, ONE];
  return { op: 1, at18, flags, a, b, scale };
}

/** op2 — `0x10004c24`. One byte, then a SIGNED halfword at an ODD offset. */
function op2(c) {
  const at18 = c.u8();
  const packed = c.peekS16(0);
  c.at += 2;
  // `srawi` — an ARITHMETIC shift, so a negative operand keeps its sign. The
  // low two bits are a selector and the rest is the value.
  return { op: 2, at18, sel: packed & 3, value: f32(packed >> 2) };
}

/** op3 — `0x10004c64`. Up to four transform triples on packed 2-bit groups. */
function op3(c) {
  const at18 = c.u8();
  const b1 = c.u8();
  const sel = c.u8();
  const triples = [];
  // The destination slot advances on EVERY iteration, read or not, so a zero
  // group leaves a hole rather than shifting the later triples down. The loop
  // shifts first and tests after, so it always runs at least once.
  let s = sel;
  for (;;) {
    triples.push((s & 3)
      ? [f32(c.s16()), f32(c.s16()), f32(c.s16())] : [0, 0, 0]);
    s >>>= 2;
    if (s === 0) break;
  }
  while (triples.length < 4) triples.push([0, 0, 0]);
  return { op: 3, at18, count: b1 & 0x7f, flag: b1 & 0x80, sel, triples };
}

/** op4 — `0x10004cec`. The prologue, then `count` twenty-byte points. */
function op4(c, textures) {
  const records = readRecord(c, textures);
  const b0 = c.u8();
  const count = c.u8();
  const points = [];
  for (let i = 0; i < count; i++) {
    const p = [f32(c.s16()), f32(c.s16()), f32(c.s16())];
    const packed = c.u16();
    // One halfword carrying a ten-bit value and a six-bit index. The value goes
    // through int2float AFTER the shift, so it is the shifted integer that is
    // converted, not the halfword.
    points.push({ p, w: f32(packed >>> 6), k: packed & 0x3f });
  }
  return { op: 4, at18: b0 & 0x7f, flag: b0 & 0x80, count, records, points };
}

const HANDLERS = [op0, op1, op2, op3, op4];

// ---------------------------------------------------------------------------
// The generators. Only op0 is here; op3 clones an earlier node and op4 sweeps a
// spline, and both are still to do.

/**
 * The sine and cosine of one of a record's rotation values.
 *
 * The stored integer is degrees times 91 — `32768 / 360` is 91.02, and the
 * table's 8,192 entries of four bytes span exactly one turn. The rotate routine
 * masks with `0x7ffc`, which both wraps and clears the low two bits, so the
 * index is a BYTE offset and the entry is that over four. Cosine is the same
 * table read `0x2000` bytes further on — 2,048 entries, a quarter turn.
 *
 * DO NOT SUBSTITUTE Math.sin. The 45-degree rotations in the shipped data land
 * on index 1023 of 8,192, which is 44.96 degrees, and the difference shows up
 * in the fourth decimal of every vertex.
 */
function sinCos(v, table) {
  const i = (v & 0x7ffc) >>> 2;
  return [table[i], table[i + 2048]];
}

/**
 * Apply a material record's scale, rotation and translation to one vertex.
 *
 * THE ROTATION SENSES ARE NOT UNIFORM. X and Y turn one way and Z the other:
 *
 *     x, y, z  <-  x*sx, y*sy, z*sz
 *     y, z     <-  y*cx - z*sx,  y*sx + z*cx
 *     x, z     <-  x*cy + z*sy, -x*sy + z*cy
 *     x, y     <-  x*cz + y*sz, -x*sz + y*cz
 *
 * Solved from the data rather than read off, by recovering the 3x3 from a
 * node's raw and built corners and then searching the six axis orders against
 * both signs per axis. Only one of the 96 combinations fits.
 *
 * THE TRANSLATION IS (+tx, -ty, -tz), which is the other half of the same
 * handedness and is why a node with no rotation at all can still come out
 * wrong: three of the failures that led here had an identity rotation and a
 * pure translation, off by exactly twice the offset in y and z.
 *
 * ONE STORE, NOT FIVE. The arithmetic runs in double and only the result is
 * rounded through `stfs`. Truncating after each stage instead — which is what
 * a pass-per-transform reading would do — leaves 74 of 76 nodes exact and two
 * out by 1.5e-5, so the wrong answer here is very nearly the right one.
 */
export function transformVertex(v, rec, table) {
  let [x, y, z] = v;
  x *= rec.scale[0]; y *= rec.scale[1]; z *= rec.scale[2];
  const [sx, cx] = sinCos(rec.rotate[0], table);
  const [sy, cy] = sinCos(rec.rotate[1], table);
  const [sz, cz] = sinCos(rec.rotate[2], table);
  if (rec.rotate[0]) { const Y = y * cx - z * sx; z = y * sx + z * cx; y = Y; }
  if (rec.rotate[1]) { const X = x * cy + z * sy; z = -x * sy + z * cy; x = X; }
  if (rec.rotate[2]) { const X = x * cz + y * sz; y = -x * sz + y * cz; x = X; }
  return [f32(x + rec.translate[0]), f32(y - rec.translate[1]),
    f32(z - rec.translate[2])];
}

/**
 * op0's generator — a subdivided box, or a plane when one extent is zero.
 *
 * THE HALF-EXTENT IS 128/255, NOT ONE HALF. `fnmadd f16, f26, f29, f31` with
 * f29 = 128.0/255.0 puts the low corner at `-(extent * 128/255)` while the step
 * is `extent / steps`, so the primitive is very slightly off centre — a 256
 * unit plane runs from -128.502 to 127.498. Using 0.5 puts every vertex within
 * half a unit of the right place, which no eyeball would catch.
 *
 * THE ACCUMULATOR STAYS DOUBLE. `stfs` rounds on the way to memory and the
 * running sum in the register does not, so `x += dx` must not be truncated per
 * step. Doing so leaves the first vertex of every node exactly right and the
 * rest one ulp out, which reads as a rounding-mode problem rather than as the
 * structural one it is.
 *
 * The box is a front plane, then one ring per interior z layer — the interior
 * of each layer is skipped, which is what makes it a surface rather than a
 * solid — and then a back plane. That gives `2(pq+qr+rp) + 2` vertices.
 */
export function buildOp0(node, table) {
  const [a, b, d] = node.extent;
  const [s0, s1, s2] = node.steps;
  const x0 = -(a * HALFISH), y0 = -(b * HALFISH), z0 = -(d * HALFISH);
  const dx = a / s0, dy = b / s1, dz = d / s2;
  const rec = node.records[0];
  const out = [];
  const V = (x, y, z) => out.push(rec
    ? transformVertex([f32(x), f32(y), f32(z)], rec, table)
    : [f32(x), f32(y), f32(z)]);
  const plane = (z) => {
    let y = y0;
    for (let j = 0; j <= s1; j++) {
      let x = x0;
      for (let i = 0; i <= s0; i++) { V(x, y, z); x += dx; }
      y += dy;
    }
  };

  if (node.mode === 1) {
    let y = y0;
    for (let j = 0; j <= s1; j++) {
      let z = z0;
      for (let k = 0; k <= s2; k++) { V(x0, y, z); z += dz; }
      y += dy;
    }
  } else if (node.mode === 2) {
    let z = z0;
    for (let k = 0; k <= s2; k++) {
      let x = x0;
      for (let i = 0; i <= s0; i++) { V(x, y0, z); x += dx; }
      z += dz;
    }
  } else {
    plane(z0);
    if (node.mode === 0) {
      let z = z0 + dz;
      for (let layer = s2 - 1; layer > 0; layer--) {
        let y = y0;
        for (let j = 0; j <= s1; j++) {
          let x = x0;
          for (let i = 0; i <= s0; i++) {
            const interior = (i !== 0 && i !== s0) && (j !== 0 && j !== s1);
            if (!interior) V(x, y, z);
            x += dx;
          }
          y += dy;
        }
        z += dz;
      }
      plane(z);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// op3's three transforms, `0x100041b0`, `0x100042cc` and `0x100041ec`.
//
// EACH ONE IS A PASS OVER THE WHOLE VERTEX CHAIN, not over one vertex, and that
// is what makes op3 an array modifier rather than a stack of identical copies.
// The eval loop clones the source, transforms EVERYTHING accumulated so far,
// and repeats — so after three rounds the first copy has been transformed three
// times, the second twice and the third once, and they lie along an arc.
//
// They also write back through `stfs` per vertex per pass, so the truncation is
// real here in a way it is not inside a single expression.

function translateAll(V, t) {
  for (const v of V) {
    v[0] = f32(v[0] + t[0]); v[1] = f32(v[1] + t[1]); v[2] = f32(v[2] + t[2]);
  }
}

/** `0x100041ec` — the operand is in 0..255 units, the same convention the
 *  texture VM uses for colour. */
function scaleAll(V, s) {
  const a = s[0] / K255, b = s[1] / K255, c = s[2] / K255;
  for (const v of V) {
    v[0] = f32(v[0] * a); v[1] = f32(v[1] * b); v[2] = f32(v[2] * c);
  }
}

/**
 * `0x100042cc` — the operand is in DEGREES, as a float.
 *
 * It goes through `float2int` before the multiply by 91, so the angle is
 * rounded to a whole degree first and only then scaled to a table index. The
 * arithmetic is `fmsub`/`fmadd` — fused — and the axis senses here are exactly
 * the ones `transformVertex` uses, which is worth knowing: that routine's
 * matrix was recovered from the geometry rather than read, and this is the
 * disassembly agreeing with it.
 */
function rotateAll(V, deg, table) {
  const at = (d) => {
    const i = ((fctiw(d) * 0x5b) & 0x7ffc) >>> 2;
    return [table[i], table[i + 2048]];
  };
  const [sx, cx] = at(deg[0]), [sy, cy] = at(deg[1]), [sz, cz] = at(deg[2]);
  for (const v of V) {
    const x = v[0], y = v[1], z = v[2];
    const y1 = fma(y, cx, -(z * sx));
    const z1 = fma(y, sx, z * cx);
    const x2 = fma(z1, sy, x * cy);
    const z2 = fma(z1, cy, -(x * sy));
    v[0] = f32(fma(y1, sz, x2 * cz));
    v[1] = f32(fma(y1, cz, -(x2 * sz)));
    v[2] = f32(z2);
  }
}

/**
 * op3's generator — `count` progressively transformed copies of an earlier node.
 *
 * `0x10003e9c` walks `at18` links from the list head, walks THIS node's chain to
 * its tail, and appends a copy of every vertex the source owns; the triangles
 * come with it, with every index rebased by the number of vertices already
 * here. Then the packed 2-bit selectors in `sel` pick up to four transforms,
 * each consuming one triple, and each running over everything built so far.
 *
 * The selector loop shifts first and tests after, so a `sel` of zero still runs
 * one round — and an empty group advances the triple slot without reading it,
 * which is the same rule the build handler used to decide how many triples to
 * take out of the stream.
 */
export function buildOp3(node, source, table) {
  const V = [];
  for (let iter = 0; iter < node.count; iter++) {
    for (const p of source) V.push([p[0], p[1], p[2]]);
    let sel = node.sel, slot = 0;
    for (;;) {
      const kind = sel & 3;
      const t = node.triples[slot];
      if (kind === 1) translateAll(V, t);
      else if (kind === 2) rotateAll(V, t, table);
      else if (kind === 3) scaleAll(V, t);
      slot++; sel >>>= 2;
      if (sel === 0) break;
    }
  }
  return V;
}

/**
 * Build every node of a decoded program, in list order.
 *
 * Order is not a convenience here: op3 reads an earlier node's FINISHED vertex
 * chain, so the list has to be built front to back and an op3 whose source is
 * unbuilt cannot be built either. `vertices` is null for those and for op4,
 * whose spline sweep is not ported — a caller must check rather than assume.
 */
export function buildProgram(decoded, table) {
  const out = [];
  for (const node of decoded.nodes) {
    if (node.op === 0) {
      out.push({ op: 0, vertices: buildOp0(node, table) });
    } else if (node.op === 3) {
      const src = out[node.at18];
      out.push({
        op: 3,
        vertices: src && src.vertices ? buildOp3(node, src.vertices, table) : null,
      });
    } else {
      out.push({ op: node.op, vertices: null });
    }
  }
  return out;
}

/**
 * Decode one geometry program.
 *
 * @param {Uint8Array} bytes the segment holding the program
 * @param {number} at offset of the u16 length word
 * @param {Array} [textures] the table `_generate_obj` is handed as `r4`
 * @returns {{nodes: Array, length: number, consumed: number}}
 *
 * `consumed` is reported rather than assumed: if the decoder's grammar is right
 * it lands within a byte or two of `length`, and a large gap says a handler's
 * operand count is wrong even when every field it produced looks plausible.
 */
export function decodeProgram(bytes, at, textures) {
  const c = new Cursor(bytes, at);
  const length = c.u16();
  const end = c.at + length;
  const nodes = [];
  while (c.at < bytes.length) {
    const op = c.u8();
    // The bound is tested AFTER the increment, so a byte at exactly `end` is
    // consumed and thrown away.
    if (c.at > end) break;
    const h = HANDLERS[op];
    if (!h) {
      return { nodes, length, consumed: c.at - at - 2, badOpcode: op };
    }
    nodes.push(h(c, textures));
  }
  return { nodes, length, consumed: c.at - at - 2 };
}
