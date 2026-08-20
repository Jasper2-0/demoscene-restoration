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
import { fctiw, atan as atanTable } from './tables.js';

// `_generate_obj`'s own constants, both read from the small data area:
// `[r2+0x2dee]` is 255.0 and `[r2+0x2dd2]` is 128.0. It then derives
// f30 = 128/128 = 1.0, f31 = 128-128 = 0.0 and f29 = 128/255 — a division it
// performs rather than a constant it loads, which is why the value here is
// written the same way instead of as a decimal.
const K255 = 255.0;
const K128 = 128.0;
const ONE = K128 / K128;
const HALFISH = K128 / K255;
// `fres` rounds its result to single precision and `frsqrte` does not — settled
// by fpest.py against the harness that produced every reference in this repo.
const fres = (x) => Math.fround(1 / x);
// The two constants the arctangent routine loads, both float32 approximations
// rather than the real thing, and both used as written.
const PI_C = 3.1415939331054688;
const HALF_PI = 1.5707969665527344;

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
export function transformVertex(v, rec, table, keepDouble) {
  let [x, y, z] = v;
  x *= rec.scale[0]; y *= rec.scale[1]; z *= rec.scale[2];
  const [sx, cx] = sinCos(rec.rotate[0], table);
  const [sy, cy] = sinCos(rec.rotate[1], table);
  const [sz, cz] = sinCos(rec.rotate[2], table);
  if (rec.rotate[0]) { const Y = y * cx - z * sx; z = y * sx + z * cx; y = Y; }
  if (rec.rotate[1]) { const X = x * cy + z * sy; z = -x * sy + z * cy; x = X; }
  if (rec.rotate[2]) { const X = x * cz + y * sz; y = -x * sz + y * cz; x = X; }
  const out = [x + rec.translate[0], y - rec.translate[1], z - rec.translate[2]];
  // THE BOUNDING BOX SEES THE UNTRUNCATED VALUE. `0x10003b48` folds each
  // transformed vertex into the running min and max straight out of the
  // registers, and only `0x10003b78` stores it through `stfs`. So the box is
  // built from doubles while everything that later reads +0x00 gets the
  // rounded ones — a one-ulp difference that reaches a few hundred UVs.
  return keepDouble ? out : out.map(f32);
}

// ---------------------------------------------------------------------------
// Texture coordinates, `0x100036e8`. Seven projection modes on the record's
// `sub` byte, and every one of them appears in the shipped data.

/** min and max of a set of points, componentwise. */
function bounds(points) {
  const lo = [...points[0]], hi = [...points[0]];
  for (const p of points) {
    for (let c = 0; c < 3; c++) {
      if (p[c] < lo[c]) lo[c] = p[c];
      if (p[c] > hi[c]) hi[c] = p[c];
    }
  }
  return { lo, ext: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]] };
}

/**
 * One vertex's (u, v).
 *
 * THE FLAG SWITCHES BOTH THE POINT AND THE BOX, TOGETHER. By default the
 * routine reads the vertex at +0x24 — the SOURCE position — and divides by the
 * box of the source positions. When the record's +0x03 flag is set it reloads
 * from +0x00, the transformed position, and divides by the transformed box.
 * Both boxes are built in the same pass, one before the transform and one
 * after, so taking the transformed point against the source box is a single
 * plausible-looking mistake that leaves the coordinates off by a whole tile.
 *
 * `state` carries the previous vertex's value so a face that straddles a
 * texture seam can be unwrapped — the +-1 nudge when two coordinates differ by
 * more than half a turn. It is reset per TRIANGLE, not per node, so the first
 * corner of every face is always taken as written.
 *
 * THE HALF IT COMPARES AGAINST IS 128/255, not 0.5: `f29` still holds what
 * `_generate_obj` divided at entry and nothing since has touched it.
 */
function projectUV(pSrc, pOut, gen, rec, b1, b2, state, atanTable) {
  const HALF = HALFISH;
  // THE FLAG IS `state.r3`, NOT `rec.flag`, AND THAT IS A BUG IN THE ORIGINAL.
  // `lbz r3, 3(r20)` reads it ONCE per triangle, before the three corners are
  // projected — and `atan` returns its table index in r3. So the moment one
  // corner takes an angular mode, every later corner of that face sees a
  // non-zero flag and silently switches to the transformed frame.
  //
  // It is exactly visible in the data: in p1[15]n1 the first corner's u comes
  // out of the SOURCE position and the second and third out of the TRANSFORMED
  // one, same record, same triangle. Reproducing it means carrying r3 rather
  // than re-reading the flag, and modelling atan's return value, since an index
  // that happens to be zero leaves the flag clear.
  const flag = state.r3;
  const box = flag ? b2 : b1;
  const p = flag ? pOut : pSrc;
  let n = [(p[0] - box.lo[0]) / box.ext[0], (p[1] - box.lo[1]) / box.ext[1],
    (p[2] - box.lo[2]) / box.ext[2]];
  let u = fma(n[0], rec.span[0], rec.size[0]);
  let v = fma(n[1], rec.span[1], rec.size[1]);
  const sub = rec.sub;

  if (sub === 0x20) return [u, v];

  if (sub === 0x60) {
    // The generator already wrote a coordinate per vertex — op4's ring u and
    // its arc-length v — and this mode uses those rather than a projection.
    let gu = gen ? gen[0] : 0, gv = gen ? gen[1] : 0;
    if (state.seen) {
      let d = gu - state.u;
      if (d > HALF) gu -= 1.0; else if (-d > HALF) gu += 1.0;
      d = gv - state.v;
      if (d > HALF) gv -= 1.0; else if (-d > HALF) gv += 1.0;
    }
    state.seen = true; state.u = gu; state.v = gv;
    return [fma(gu, rec.span[0], rec.size[0]), fma(gv, rec.span[1], rec.size[1])];
  }

  // The remaining modes all replace one of the two coordinates, and four of
  // them take u from an ANGLE rather than from a box coordinate.
  let ang = p[0];
  let angled = false;
  if (sub === 0x00) return [fma(n[2], rec.span[0], rec.size[0]), v];
  if (sub === 0x10) return [u, fma(n[2], rec.span[1], rec.size[1])];
  if (sub === 0x30) {
    v = fma(n[0], rec.span[1], rec.size[1]);
    ({ turns: ang, r3: state.r3 } = atanTurns(p[2], p[1], atanTable));
    angled = true;
  } else if (sub === 0x40) {
    v = fma(n[1], rec.span[1], rec.size[1]);
    ({ turns: ang, r3: state.r3 } = atanTurns(p[0], p[2], atanTable));
    angled = true;
  } else if (sub === 0x50) {
    v = fma(n[2], rec.span[1], rec.size[1]);
    ({ turns: ang, r3: state.r3 } = atanTurns(p[0], p[1], atanTable));
    angled = true;
  }
  void angled;
  if (state.seen) {
    const d = Math.abs(state.u - ang);
    if (d > HALF) ang = state.u <= HALF ? ang - 1.0 : ang + 1.0;
  }
  state.seen = true; state.u = ang;
  return [fma(ang, rec.span[0], rec.size[0]), v];
}

/**
 * Fill every triangle's three (u, v) pairs. `0x10003be0`.
 *
 * KIND 4 THEN OVERWRITES TWO OF THE THREE. After the projection has run, a
 * record of kind 4 replaces the first pair with `span * 128/255 + size` and the
 * second with `span * 128/255`, leaving only the third as projected — so a
 * third of that node's coordinates come from the projection and two thirds do
 * not.
 */
function applyUVs(triangles, positions, gen, records, atanTable) {
  const rec = records[0];
  if (!rec || !positions.built.length) return;
  // A LAYER IS PROJECTED WITH ITS OWN RECORD. The scene builder turns the
  // second material record into a face of its own on the same three vertices,
  // and that face carries its own texture coordinates — a different `kind` and
  // `sub` mean a different projection, so copying the primary's is wrong on
  // every one of the 2,466 triangles that have a layer. Computed here, where
  // the positions and the boxes already are, and hung on the triangle as
  // `layerUV` for the scene builder to pick up.
  const layerRec = records[1] && records[1].kind !== 5 && records[1].kind !== 6
    ? records[1] : null;
  const b1 = bounds(positions.source);
  // THE TRANSFORMED BOX IS SEEDED FROM AN UNTRANSFORMED POINT. `0x10003a98`
  // copies the first vertex's SOURCE position into both the min and the max of
  // the second box, and the loop that follows only ever folds in transformed
  // ones — so the box spans the union of one source corner and the whole
  // transformed set, and is wildly bigger than the geometry it bounds whenever
  // the record translates.
  //
  // Recovered by inverting two corners rather than by reading it: a node whose
  // transformed y ran 604.412 to 904.412 produced coordinates implying a box of
  // lo = -150.588 and extent 1055, and -150.588 is exactly that node's SOURCE
  // minimum. Six instructions later the disassembly says the same thing.
  const b2 = bounds([positions.source[0], ...(positions.box ?? positions.built)]);
  const project = (t, r) => {
    // r3 starts as the record's flag and is clobbered by any atan call.
    const state = { seen: false, u: 0, v: 0, r3: r.flag };
    const uv = t.idx.map((i) => projectUV(positions.source[i],
      positions.built[i], gen ? gen[i] : null, r, b1, b2, state,
      atanTable).map(f32));
    if (r.kind === 4) {
      uv[0] = [f32(fma(r.span[0], HALFISH, r.size[0])),
        f32(fma(r.span[1], HALFISH, r.size[1]))];
      uv[1] = [f32(r.span[0] * HALFISH), f32(r.span[1] * HALFISH)];
    }
    return uv;
  };
  for (const t of triangles) {
    t.uv = project(t, rec);
    if (layerRec) t.layerUV = project(t, layerRec);
  }
}

// ---------------------------------------------------------------------------
// The material fields, `0x10003b8c`. Each triangle is filled in from the node's
// FIRST material record — `lwz r20, 0(r27)` is reloaded per triangle, so the
// chain is walked from the top every time rather than carried along.
//
// The 0x52 record has TWO forward pointers and they mean different things:
// +0x4e is the next triangle and +0x4a is another LAYER on the same three
// vertices, allocated while the record chain continues and the next record's
// kind is neither 5 nor 6. 1,616 of the 19,074 triangles carry one.

/**
 * `kind` picks the primitive, and it is the only thing that does: `cmpwi r3, 1`
 * keeps `W3D_DrawLineStrip` and everything else falls through to
 * `W3D_DrawTriFan`. The vector is baked into the record as a discriminator and
 * never called from here.
 */
function materialise(indices, records) {
  const r = records[0];
  if (!r) return indices.map((idx) => ({ idx }));
  // A record of kind 5 or 6 ends the layer chain rather than starting one.
  const next = records[1];
  const hasLayer = !!next && next.kind !== 5 && next.kind !== 6;
  return indices.map((idx) => ({
    idx,
    kind: r.kind,
    sub: r.sub,
    cull: r.cull,
    prim: r.kind === 1 ? 'linestrip' : 'trifan',
    rgba: r.rgba,
    texIndex: r.texIndex,
    hasLayer,
  }));
}

// ---------------------------------------------------------------------------
// Normals, from the tail of `0x10003868`.

/** `0x10003674` — normalise in place. `frsqrte` and NOTHING ELSE: no Newton
 *  refinement, no `fres` afterwards. On hardware that is a low-precision
 *  estimate; under the harness that produced every reference here it is a full
 *  double reciprocal square root, which is what `fpest.py` settled. */
function normalise(v) {
  let s = v[0] * v[0];
  s = fma(v[1], v[1], s);
  s = fma(v[2], v[2], s);
  const k = 1 / Math.sqrt(s);
  return [v[0] * k, v[1] * k, v[2] * k];
}

/**
 * Per-vertex normals: accumulate each face's normal into its three corners,
 * then normalise. `0x10003ce0`.
 *
 * THE FACE NORMAL IS `e2 x e1`, NOT `e1 x e2`. Both edges are taken from the
 * FIRST index — `e1 = p[c] - p[a]` and `e2 = p[b] - p[a]` — and the cross
 * product is then written out with its terms in the order that negates it, so
 * the result points the other way from the obvious reading. Every face is
 * normalised before it is accumulated, so a large triangle counts for no more
 * than a small one.
 *
 * IT READS +0x00, NOT +0x24 — the positions AFTER the record transform. The
 * routine's very last loop then copies +0x00 back down to +0x24, which is how
 * the transform reaches the field everything else reads, and is why normals
 * turn with their geometry instead of staying in model space.
 */
function faceNormal(positions, t) {
  const B = positions[t[0]], A = positions[t[1]], C = positions[t[2]];
  if (!A || !B || !C) return null;
  const e1 = [C[0] - B[0], C[1] - B[1], C[2] - B[2]];
  const e2 = [A[0] - B[0], A[1] - B[1], A[2] - B[2]];
  return normalise([
    -(fma(e2[2], e1[1], -(e1[2] * e2[1]))),
    -(fma(e2[0], e1[2], -(e1[0] * e2[2]))),
    -(fma(e2[1], e1[0], -(e1[1] * e2[0]))),
  ]);
}

/**
 * The TRIANGLE's own normal, at `+0x3a/+0x3e/+0x42`.
 *
 * `0x10003d18` computes it from the same two edges and normalises it through
 * the same `frsqrte` at `0x10003674` as the per-vertex accumulation; the scene
 * builder then copies it into the scene face at `+0x3c` (`0x10002908`), and
 * pass 3 rotates THAT through the node's 3x3 into `+0x48/+0x4c/+0x50`. The
 * third component is the face intensity shading mode 2 multiplies by.
 *
 * Nothing had it: `geo.json` does not export the field, so `geovertcheck` could
 * not miss it, and mode-2 faces were multiplying their colour by an undefined
 * that became NaN and then, once the chain existed but was empty, by zero.
 * Part one's crates are mode 2 and they rendered black.
 */
export function attachFaceNormals(positions, triangles) {
  for (const raw of triangles) {
    const n = faceNormal(positions, raw.idx ?? raw);
    if (n) raw.normal = n.map(f32);
  }
  return triangles;
}

function computeNormals(positions, triangles) {
  const N = positions.map(() => [0, 0, 0]);
  for (const raw of triangles) {
    const t = raw.idx ?? raw;
    const n = faceNormal(positions, t);
    if (!n) continue;
    for (const i of t) {
      N[i][0] = f32(N[i][0] + n[0]);
      N[i][1] = f32(N[i][1] + n[1]);
      N[i][2] = f32(N[i][2] + n[2]);
    }
  }
  return N.map((v) => normalise(v).map(f32));
}

// ---------------------------------------------------------------------------
// Triangles. Every one of them is emitted by `0x1000335c`, which takes FOUR
// vertex indices and lays down two triangles — (a,b,c) and (c,d,a) — with the
// count hardcoded to 3 at both of its emit sites. So a quad arrives as two
// records rather than as one with four indices, and the winding is decided by
// which of the four corners the caller loads into which register.

const quad = (out, a, b, c, d) => { out.push([a, b, c]); out.push([c, d, a]); };

/** The grid loop at `0x10004a78`: one quad per cell of an (inner+1)x(outer+1)
 *  lattice of contiguous indices. `flip` is the reversed winding the box's back
 *  face uses. */
function gridFaces(out, base, inner, outer, flip) {
  let b = base;
  for (let j = 0; j < outer; j++) {
    let a = b, b1 = b + 1, c = b + inner + 1, d = c + 1;
    for (let i = 0; i < inner; i++) {
      if (flip) quad(out, d, c, a, b1); else quad(out, b1, a, c, d);
      a++; b1++; c++; d++;
    }
    b += inner + 1;
  }
}

/**
 * `0x100035c8` — the ordinal of grid point (x, y, z) among the ones the box
 * emission kept.
 *
 * In the original this is a literal SEARCH: it re-walks the entire lattice from
 * (0,0,0) on every call, counting non-interior points until it reaches the one
 * asked for, which makes building a subdivided box quadratic in its own vertex
 * count. Enumerating once into a lookup computes the same function — the
 * interior predicate here is character for character the one the emission uses,
 * which is what makes the two orders agree.
 */
function boxIndex(s0, s1, s2) {
  const m = new Map();
  let n = 0;
  for (let z = 0; z <= s2; z++) {
    for (let y = 0; y <= s1; y++) {
      for (let x = 0; x <= s0; x++) {
        m.set(`${x},${y},${z}`, n);
        const interior = (x !== 0 && x !== s0) && (y !== 0 && y !== s1)
          && (z !== 0 && z !== s2);
        if (!interior) n++;
      }
    }
  }
  return (x, y, z) => m.get(`${x},${y},${z}`);
}

/**
 * The box's six faces.
 *
 * The two z faces go through `gridFaces` on contiguous indices — the front
 * plane starts at 0 and the back at `idx(0, 0, s2)`, which op0 obtains by
 * calling the search rather than by arithmetic. The other four go through
 * `0x100033d8` (x = 0 and x = s0) and `0x1000346c` (y = 0 and y = s1), each
 * corner resolved by the same search.
 *
 * EACH PAIR FLIPS ON THE OPPOSITE SIDE. `0x100033d8` swaps its corners when its
 * fixed coordinate is ZERO and `0x1000346c` swaps when it is NOT — `bne` in one
 * and `beq` in the other — so the two routines are not the same code with a
 * different axis, and copying one into the other inverts two of the six faces.
 */
function boxFaces(s0, s1, s2) {
  const out = [];
  const idx = boxIndex(s0, s1, s2);
  gridFaces(out, 0, s0, s1, false);
  gridFaces(out, idx(0, 0, s2), s0, s1, true);
  for (const xv of [0, s0]) {
    for (let y = 0; y < s1; y++) {
      for (let z = 0; z < s2; z++) {
        let p1 = idx(xv, y, z + 1), p2 = idx(xv, y, z);
        let p3 = idx(xv, y + 1, z), p4 = idx(xv, y + 1, z + 1);
        if (xv === 0) { [p1, p4] = [p4, p1]; [p2, p3] = [p3, p2]; }
        quad(out, p1, p2, p3, p4);
      }
    }
  }
  for (const yv of [0, s1]) {
    for (let x = 0; x < s0; x++) {
      for (let z = 0; z < s2; z++) {
        let p1 = idx(x, yv, z + 1), p2 = idx(x, yv, z);
        let p3 = idx(x + 1, yv, z), p4 = idx(x + 1, yv, z + 1);
        if (yv !== 0) { [p1, p4] = [p4, p1]; [p2, p3] = [p3, p2]; }
        quad(out, p1, p2, p3, p4);
      }
    }
  }
  return out;
}

/** op4's tube skin, `0x100047ec` — a quad strip that always wraps around the
 *  sides, and joins the last ring back to the first only when `closed`. */
function tubeFaces(sides, rings, closed) {
  const out = [];
  let r0 = 0, r1 = sides;
  for (let s = 0; s < rings - 1; s++) {
    let a = r0, b = r1;
    for (let e = 0; e < sides; e++) {
      let a2 = a + 1, b2 = b + 1;
      if (r0 + sides === a2) a2 = r0;
      if (r1 + sides === b2) b2 = r1;
      quad(out, a, a2, b2, b);
      a++; b++;
    }
    r0 += sides; r1 += sides;
  }
  if (closed) {
    let a = r0, b = 0;
    for (let e = 0; e < sides; e++) {
      if (a === r1) a = r0;
      let a2 = a + 1;
      if (a2 === r1) a2 = r0;
      let b2 = b + 1;
      if (b2 === sides) b2 = 0;
      quad(out, a, a2, b2, b);
      a++; b++;
    }
  }
  return out;
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
  // Both frames are kept: the UV projection divides by a box built from the
  // SOURCE positions and, when the record's flag is set, by one built from the
  // transformed ones.
  const src = [];
  const V = (x, y, z) => {
    const p = [f32(x), f32(y), f32(z)];
    src.push(p);
    out.push(rec ? transformVertex(p, rec, table) : p);
  };
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
  // A material record of kind 5 makes NO faces at all: `cmpwi r3, 5; beq` jumps
  // clean over the whole face pass, so those nodes are point clouds.
  const PAIR = { 0: [0, 1], 1: [2, 1], 2: [0, 2], 3: [0, 1] }[node.mode];
  const triangles = rec?.kind === 5 ? []
    : (node.mode === 0 ? boxFaces(s0, s1, s2)
      : (() => {
        const t = [];
        gridFaces(t, 0, node.steps[PAIR[0]], node.steps[PAIR[1]], false);
        return t;
      })());
  const tris = materialise(triangles, node.records);
  const raw = rec ? src.map((v) => transformVertex(v, rec, table, true)) : src;
  applyUVs(tris, { source: src, built: out, box: raw }, null, node.records,
    atanTable());
  // The triangle's own normal, which the scene builder copies to the face and
  // pass 3 rotates into the intensity. See attachFaceNormals.
  attachFaceNormals(out, tris);
  return { vertices: out, triangles: tris, normals: computeNormals(out, triangles) };
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
function scaleAll(V, N, s) {
  const a = s[0] / K255, b = s[1] / K255, c = s[2] / K255;
  for (const v of V) {
    v[0] = f32(v[0] * a); v[1] = f32(v[1] * b); v[2] = f32(v[2] * c);
  }
  // Scaling a normal is not scaling a position: the routine multiplies and then
  // RENORMALISES, so a non-uniform scale bends the normal rather than stretching
  // it. Translation leaves normals alone entirely.
  for (let i = 0; i < N.length; i++) {
    const n = normalise([N[i][0] * a, N[i][1] * b, N[i][2] * c]);
    N[i] = [f32(n[0]), f32(n[1]), f32(n[2])];
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
function rotateAll(V, N, deg, table) {
  const at = (d) => {
    const i = ((fctiw(d) * 0x5b) & 0x7ffc) >>> 2;
    return [table[i], table[i + 2048]];
  };
  const [sx, cx] = at(deg[0]), [sy, cy] = at(deg[1]), [sz, cz] = at(deg[2]);
  const turn = (v) => {
    const x = v[0], y = v[1], z = v[2];
    const y1 = fma(y, cx, -(z * sx));
    const z1 = fma(y, sx, z * cx);
    const x2 = fma(z1, sy, x * cy);
    const z2 = fma(z1, cy, -(x * sy));
    v[0] = f32(fma(y1, sz, x2 * cz));
    v[1] = f32(fma(y1, cz, -(x2 * sz)));
    v[2] = f32(z2);
  };
  for (const v of V) turn(v);
  for (const n of N) turn(n);
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
  const T = [];
  const N = [];
  const n = source.vertices.length;
  for (let iter = 0; iter < node.count; iter++) {
    // `0x10003fe4` adds the destination's CURRENT vertex count to every index,
    // so each copy references its own vertices rather than the first copy's.
    for (const t of source.triangles) {
      T.push({ ...t, idx: t.idx.map((v) => v + iter * n) });
    }
    for (const p of source.vertices) V.push([p[0], p[1], p[2]]);
    for (const q of source.normals) N.push([q[0], q[1], q[2]]);
    let sel = node.sel, slot = 0;
    for (;;) {
      const kind = sel & 3;
      const t = node.triples[slot];
      if (kind === 1) translateAll(V, t);
      else if (kind === 2) rotateAll(V, N, t, table);
      else if (kind === 3) scaleAll(V, N, t);
      slot++; sel >>>= 2;
      if (sel === 0) break;
    }
  }
  attachFaceNormals(V, T);
  return { vertices: V, triangles: T, normals: N };
}

// ---------------------------------------------------------------------------
// op4 — a tube swept along a spline. `0x10004428`, and the longest of the three.

/** `0x10004180` — the spline basis, four calls per sample (x, y, z, radius).
 *
 * NOT CATMULL-ROM. It builds its coefficients by repeated addition rather than
 * from a matrix, and the result has no halves in it:
 *
 *     P(t) = c + (n-p)t - (q + 2c - n - 2p)t^2 + (q + c - n - p)t^3
 *
 * It does interpolate — P(0) = c and P(1) = n — so it looks like a cardinal
 * spline and is not one; substituting the real thing moves every intermediate
 * sample.
 */
function splineAt(p, c, n, q, t, t2, t3) {
  let f17 = q - c;
  let f16 = c - n;
  const f18 = n - p;
  f17 = f17 + f16;
  f17 = f17 + f16;
  f17 = f17 + f18;
  f16 = f16 + f17;
  f16 = f16 + f18;
  let r = fma(f18, t, c);
  r = fma(f17, t3, r);
  return -(fma(f16, t2, -r));
}

/**
 * `0x10006a7c` — arctangent, returning TURNS rather than radians.
 *
 * A 1,024-entry table of `atan(i/1024)` covering the first eighth of a turn,
 * reflected into the other seven by the sign tests at the end. The result is
 * divided by 2*pi at the very end, so what comes back is 0..1 and the caller
 * multiplies by 32768 to get a byte offset into the sine table.
 *
 * IT IS CALLED WITH (0, 0) BY EVERY STRAIGHT SEGMENT, and the NaN that follows
 * is load-bearing. The divide gives NaN; the `> 1.0` test is a `ble` on an
 * unordered compare and so is NOT taken; `fctiw` of a NaN is 0x80000000; and
 * `slwi r3, r3, 2` then truncates that to exactly zero. So the original reads
 * entry 0, gets 0.0, and a straight tube ends up with an identity yaw. Any step
 * of that chain implemented differently sends the lookup off the table.
 */
function atanTurns(y, x, atanTable) {
  let r = Math.abs(y / x);
  let sgn = 1.0, off = 0.0;
  if (r > 1.0) { sgn = -1.0; off = HALF_PI; r = fres(r); }
  let i = fctiw(r * 1024.0);
  if (i >= 0x3ff) i = 0x3ff;
  const entry = ((i << 2) >>> 0) >>> 2;
  let v = fma(atanTable[entry] ?? 0, sgn, off);
  if (x >= 0) { if (!(y >= 0)) v = (PI_C + PI_C) - v; }
  else if (y >= 0) v = PI_C - v;
  else v = v + PI_C;
  // THE INDEX COMES BACK TOO, and it is not a diagnostic. The routine leaves it
  // in r3, which is the same register the caller is holding the record's flag
  // in — see `projectUV`.
  return { turns: v / (PI_C + PI_C), r3: i };
}

/**
 * op4's generator — `sides` points swept along the spline through the control
 * points, one ring per subdivision.
 *
 * TWO OUT-OF-BOUNDS READS, BOTH DETERMINISTIC AND BOTH REPRODUCED. The spline
 * needs four control points and the loop does not special-case the ends the way
 * you would expect: `cmpwi r14, 1` fixes up the SECOND point, not the first, so
 * the first segment reads `array - 0x14` and walks off the front of the array.
 * `alloc_mem` is a bump allocator and the point array is handed out immediately
 * after the last 0x58 material record, so those twenty bytes are that record's
 * tail: its rotate-z word at +0x44 read as a float, and its scale triple at
 * +0x48/4c/50. A default record therefore contributes `prev = (0, 1, 1)` with a
 * radius of 1 — small, structured, and nothing like zero. Assuming zeros gets
 * every node with four or more control points wrong in the second decimal.
 *
 * The second is the closed case's fixup for point 1: `add r25, r24, r25` adds
 * `(count-1) * 0x14` to the CURRENT point rather than to the base, landing one
 * record past the END of the array — which is where the circle table gets
 * allocated a moment later, so `prev` becomes `(0, 1, 0)` with radius
 * `circle[1].x`.
 *
 * THE SWEEP ANGLE IS NEGATIVE because `li r4, 0x8000` sign-extends: the divisor
 * is -32768, not 32768, so the ring is generated clockwise. That cancels
 * against the `neg` on the pitch index, and getting only one of the two right
 * leaves the tube inside out.
 */
export function buildOp4(node, table, atanTab) {
  const sides = node.at18, closed = node.flag, pts = node.points;
  const count = node.count;
  if (!sides || !count) return [];

  // The swept ring: a unit circle plus a u ramp, by incremental rotation.
  const step = Math.trunc((-0x8000) / sides) & 0x7ffc;
  const cs = table[step >>> 2], cc = table[(step >>> 2) + 2048];
  const du = fres(sides + 1);
  const circle = [];
  let rx = 0.0, ry = 1.0, ru = 0.0;
  for (let i = 0; i < sides; i++) {
    circle.push([f32(rx), f32(ry), f32(ru)]);
    const a = ry * cs, b = rx * cs;
    const nx = fma(rx, cc, a), ny = fma(ry, cc, -b);
    rx = nx; ry = ny; ru += du;
  }

  const last = node.records[node.records.length - 1];
  const bits = new DataView(new ArrayBuffer(4));
  bits.setInt32(0, last ? (last.rotate[2] | 0) : 0);
  const BEFORE = last
    ? { p: [bits.getFloat32(0), last.scale[0], last.scale[1]], w: last.scale[2] }
    : { p: [0, 0, 0], w: 0 };
  const AFTER = { p: [circle[0][0], circle[0][1], circle[0][2]],
    w: circle[1] ? circle[1][0] : 0 };

  // Pass one: sample the spline, and lay down a ring of `sides` vertices at
  // each sample, all sharing that sample's position and radius.
  const V = [];
  // The v coordinate the generator writes is arc length along the spline,
  // accumulated as sqrt of the squared step — `frsqrte` then `fres`, which is
  // a reciprocal of a reciprocal square root rather than a square root.
  let arc = 0.0;
  let lx = pts[0].p[0], ly = pts[0].p[1], lz = pts[0].p[2];
  for (let i = 0; i < count; i++) {
    const cur = pts[i];
    let pi = i - 1, ni = i + 1, qi = i + 2;
    if (i === 0) pi = -1;
    else if (i === 1) pi = closed ? -2 : i;
    if (ni > count - 1) ni = closed ? 0 : count - 1;
    if (qi > count - 1) {
      qi = count - 1;
      // Only the CLOSED path wraps and then steps past a collision with `next`;
      // `beq cr2` skips both for an open tube.
      if (closed) { qi = 0; if (qi === ni) qi += 1; }
    }
    const P = pi === -1 ? BEFORE : (pi === -2 ? AFTER : (pts[pi] ?? BEFORE));
    const N = pts[ni] ?? BEFORE, Q = pts[qi] ?? BEFORE;
    const dt = fres(cur.k);
    let t = 0.0;
    for (let j = 0; j < cur.k; j++) {
      const t2 = t * t, t3 = t2 * t;
      const x = splineAt(P.p[0], cur.p[0], N.p[0], Q.p[0], t, t2, t3);
      const y = splineAt(P.p[1], cur.p[1], N.p[1], Q.p[1], t, t2, t3);
      const z = splineAt(P.p[2], cur.p[2], N.p[2], Q.p[2], t, t2, t3);
      const w = splineAt(P.w, cur.w, N.w, Q.w, t, t2, t3);
      const dx = x - lx, dy = y - ly, dz = z - lz;
      let sq = dx * dx;
      sq = fma(dy, dy, sq);
      sq = fma(dz, dz, sq);
      arc += fres(1 / Math.sqrt(sq));
      for (let e = 0; e < sides; e++) {
        V.push({ sp: [f32(x), f32(y), f32(z)], w: f32(w), p: null,
          u: circle[e][2], arc: f32(arc) });
      }
      lx = x; ly = y; lz = z;
      t += dt;
    }
  }

  // Pass two: a frame per ring from the local tangent, then place the circle.
  const invArc = fres(arc);
  const rings = V.length / sides;
  for (let r = 0; r < rings; r++) {
    const pr = r === 0 ? (closed ? rings - 1 : 0) : r - 1;
    let nr = r + 1;
    if (nr > rings - 1) nr = closed ? 0 : rings - 1;
    const A = V[nr * sides].sp, B = V[pr * sides].sp;
    const dx = A[0] - B[0], dy = A[1] - B[1], dz = A[2] - B[2];

    const a = fctiw(atanTurns(dz, dx, atanTab).turns * 32768.0);
    const yaw = (-a) & 0x7ffc, flat = a & 0x7ffc;
    const s1 = table[flat >>> 2], c1 = table[(flat >>> 2) + 2048];
    const horiz = fma(dx, c1, dz * s1);
    const b = fctiw(atanTurns(dy, horiz, atanTab).turns * 32768.0);
    const pitch = (-b) & 0x7ffc;
    const s2 = table[pitch >>> 2], c2 = table[(pitch >>> 2) + 2048];
    const s3 = table[yaw >>> 2], c3 = table[(yaw >>> 2) + 2048];

    for (let e = 0; e < sides; e++) {
      const v = V[r * sides + e];
      const q1 = circle[e][0] * v.w, q2 = circle[e][1] * v.w;
      const h = fma(q1, s2, 0);
      const m = q1 * c2;
      const nx = fma(q2, s3, h * c3);
      const nz = -(fma(h, s3, -(q2 * c3)));
      v.p = [f32(v.sp[0] + nx), f32(v.sp[1] + m), f32(v.sp[2] + nz)];
    }
  }

  const rec = node.records[0];
  const src = V.map((v) => v.p);
  const vertices = V.map((v) => (rec ? transformVertex(v.p, rec, table) : v.p));
  const triangles = tubeFaces(sides, rings, closed);
  const tris = materialise(triangles, node.records);
  const raw = rec ? src.map((v) => transformVertex(v, rec, table, true)) : src;
  applyUVs(tris, { source: src, built: vertices, box: raw },
    V.map((v) => [v.u, f32(v.arc * invArc)]), node.records, atanTab);
  attachFaceNormals(vertices, tris);
  return {
    vertices,
    triangles: tris,
    normals: computeNormals(vertices, triangles),
  };
}

/**
 * Build every node of a decoded program, in list order.
 *
 * Order is not a convenience here: op3 reads an earlier node's FINISHED vertex
 * chain, so the list has to be built front to back and an op3 whose source is
 * unbuilt cannot be built either. `vertices` is null for those and for op4,
 * whose spline sweep is not ported — a caller must check rather than assume.
 */
/**
 * A program in the shape the SCENE builder wants — what geodump exports, built
 * out of the segment instead of read out of an arena.
 *
 * `buildProgram` gives the three things that were hard: positions, indexed
 * triangles and normals. Two more are needed before `buildMesh` can be handed
 * this instead of geo.json, and both are small:
 *
 *   * LAYERS. A material record whose successor is neither kind 5 nor kind 6
 *     starts a chain, and the scene builder turns every link into its OWN face
 *     on the same three vertices (`0x10002964`). 2,466 triangles carry one, so
 *     a consumer that reads only the primary under-counts the primitives.
 *   * SPRITES. A kind-5 record turns EVERY vertex of the node into a screen
 *     -aligned quad: `0x10003dd4` walks the vertex chain and allocates one 0x30
 *     record each, taking the size from the record's +0x2c, the texture from
 *     +0x14, the rectangle from +0x1c..+0x28 with the second pair ADDED to the
 *     first, and the colour from +0x04..+0x10.
 *
 * VISIBILITY is the other thing the arena has and the bytecode does not say
 * outright: every build handler sets +0x12 on its way out and op 3's eval then
 * CLEARS it on whatever node it cloned, so a source that has been copied is
 * hidden and only the copy draws.
 */
export function buildGeometry(decoded, table) {
  const built = buildProgram(decoded, table);
  // A CLONE HIDES ITS SOURCE ONLY IF ITS 0x80 FLAG IS CLEAR. op 3 stores byte 1
  // of its operands split in two — the low seven bits are the repeat count at
  // +0x19 and the top bit goes to +0x1a — and that top bit is "keep the
  // original as well". Marking every source hidden gets 125 of 181 nodes;
  // honouring the bit gets all 181, and the thirteen that ARE hidden are each
  // cloned by the node immediately after them.
  const cloned = new Set();
  decoded.nodes.forEach((n) => {
    if (n.op === 3 && !n.flag) cloned.add(n.at18);
  });

  return {
    nodes: decoded.nodes.map((n, i) => {
      const b = built[i];
      // A CLONE CARRIES NO MATERIAL RECORDS OF ITS OWN and inherits its
      // source's, which is how eleven op-3 nodes end up with layers and one
      // with 56 sprites while their own record list is empty. Followed rather
      // than assumed one deep: op 3 can clone an op 3.
      let recs = n.records ?? [];
      for (let src = n, guard = 0; !recs.length && src.op === 3 && guard < 8;
        guard++) {
        src = decoded.nodes[src.at18] ?? {};
        recs = src.records ?? [];
      }
      // ONE LAYER, not one per remaining record. `materialise` already reads
      // it that way — `hasLayer` is a single boolean off records[1] — and the
      // arena agrees: a triangle's +0x4a chain is one deep in the shipped data.
      // Emitting a face per extra material record built 1,976 faces where the
      // original has 1,244, and every face after the first divergence then
      // carried the wrong texture coordinates.
      const next = recs[1];
      const layerRecs = next && next.kind !== 5 && next.kind !== 6 ? [next] : [];
      const triangles = (b.triangles ?? []).map((t) => ({
        ...t,
        count: 3,
        layers: layerRecs.map((r) => ({
          ...t, count: 3, kind: r.kind, sub: r.sub, cull: r.cull,
          prim: r.kind === 1 ? 'linestrip' : 'trifan',
          rgba: r.rgba, texIndex: r.texIndex,
          uv: t.layerUV ?? t.uv,
        })),
      }));
      // One sprite per vertex, off the first kind-5 record.
      const five = recs.find((r) => r.kind === 5);
      const sprites = five && b.vertices
        ? b.vertices.map((_, k) => ({
          vertex: k,
          texIndex: five.texIndex,
          size: five.at2c,
          uv: [five.size[0], five.size[1],
            five.size[0] + five.span[0], five.size[1] + five.span[1]],
          rgba: [...five.rgba],
        }))
        : [];
      return {
        op: n.op,
        visible: cloned.has(i) ? 0 : 1,
        vertices: (b.vertices ?? []).map((p, k) => ({
          p, n: b.normals?.[k] ?? [0, 0, 0], rgba: [1, 1, 1, 1],
        })),
        triangles,
        sprites,
      };
    }),
  };
}

export function buildProgram(decoded, table) {
  const out = [];
  for (const node of decoded.nodes) {
    if (node.op === 0) {
      out.push({ op: 0, ...buildOp0(node, table) });
    } else if (node.op === 3) {
      const src = out[node.at18];
      out.push(src && src.vertices
        ? { op: 3, ...buildOp3(node, src, table) }
        : { op: 3, vertices: null, triangles: null, normals: null });
    } else if (node.op === 4) {
      out.push({ op: 4, ...buildOp4(node, table, atanTable()) });
    } else {
      out.push({ op: node.op, vertices: null, triangles: null, normals: null });
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
