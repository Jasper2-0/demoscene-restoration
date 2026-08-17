// geocheck.mjs — the geometry stream decoder, against the interpreter.
//
//   node work/re/geocheck.mjs flat/ out/geo.json
//
// NOTES.md RECORDED THE BUILD-TIME OPERAND WIDTHS AS "STRUCTURALLY
// UNMODELLABLE FROM THE STREAM", after three attempts to model them failed, on
// the grounds that the shared prologue indexes a table built in BSS at runtime
// so the same flags byte consumes different byte counts in different programs.
// This check exists to settle that by measurement rather than by argument, and
// it is written so that it can fail: every field of every record and every node
// is compared against what the running program actually built, and the number
// of bytes the decoder consumed is compared against the stream's own u16 length
// so that a grammar which produces plausible fields while drifting through the
// stream is still caught.
//
// The reading that reverses it: `r28` is `_generate_obj`'s second argument, the
// TEXTURE TABLE, and the prologue reads it for two pointer values that land at
// record+0x14 and +0x18. It is never consulted for a length. Every width in the
// prologue and in all five handlers is gated by a bit read from the stream a
// few instructions earlier.
//
// WHAT IS NOT CHECKED HERE, because the decoder does not claim it: the vertex
// and triangle DATA the generators produce. `out/geo.json` carries 11,723 and
// 19,074 of them and they are the oracle for that separate port. What this file
// does cover beyond the grammar is the SHAPE of the built structure — how many
// vertices each node ends up owning and where they came from — because that is
// what decides how much of a generator port is left, and it turned out to be a
// good deal less than the vertex count suggested.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeProgram } from '../../web/js/geom.js';

const ABSENT = 77;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const flat = process.argv[2] ?? path.join(HERE, 'flat');
const file = process.argv[3] ?? path.join(HERE, 'out', 'geo.json');

const SEGMENTS = [
  { base: 0x10030000, name: 'seg3_DATA_10030000.bin' },
  { base: 0x10040000, name: 'seg4_DATA_10040000.bin' },
];

if (!fs.existsSync(file) || !fs.existsSync(path.join(flat, SEGMENTS[0].name))) {
  console.log(`geocheck: need ${file} and ${flat}/seg3 — `
    + './ppcbox.sh python3 geodump.py flat/ out/geo.json. Skipping.');
  process.exit(ABSENT);
}

const segs = SEGMENTS.map((s) => ({
  ...s, data: new Uint8Array(fs.readFileSync(path.join(flat, s.name))),
}));
const segFor = (addr) => segs.find((s) => addr >= s.base
  && addr < s.base + s.data.length);

const doc = JSON.parse(fs.readFileSync(file, 'utf8'));

let progOK = 0, progBad = 0;
let recOK = 0, recBad = 0, nodeOK = 0, nodeBad = 0, fieldOK = 0, fieldBad = 0;
let seqOK = 0, seqBad = 0, spanOK = 0, spanBad = 0;
const failures = [];
const note = (s) => { if (failures.length < 10) failures.push(s); };
// op0's law needs the subdivision counts, and those go straight into the
// generator's registers without ever being written to the node — so they exist
// only in the decoder's output and the structural pass below needs it kept.
const decoded = new Map();

// Comparing NUMBERS, not JSON text: geodump writes non-finite floats as null,
// and a decoded 0 must not silently match one.
const same = (a, b) => {
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length
      && a.every((v, i) => same(v, b[i]));
  }
  if (a === null || b === null) return a === b;
  return Object.is(a, b) || a === b;
};

for (const p of doc.programs) {
  const addr = parseInt(p.program, 16);
  const seg = segFor(addr);
  if (!seg) { progBad++; note(`${p.part}[${p.index}] ${p.program} outside seg3/seg4`); continue; }

  const got = decodeProgram(seg.data, addr - seg.base, null);
  decoded.set(p, got.nodes);
  let bad = 0;

  // The stream's own u16 length is an independent witness, and the comparison
  // is EXACT rather than tolerant. All 39 programs land on `length + 1`, and
  // that one byte is not slop: the walk reads an opcode and only then tests
  // `cmpw r31, r30`, so the byte sitting at the bound is always consumed and
  // discarded. Allowing a window here would let a decoder that is wrong about
  // one width by one byte pass, which is the failure this check exists to
  // catch, so the off-by-one is asserted rather than tolerated.
  if (got.consumed === got.length + 1) spanOK++;
  else {
    spanBad++; bad++;
    note(`${p.part}[${p.index}] consumed ${got.consumed}, `
      + `expected ${got.length + 1}`);
  }

  const wantOps = p.nodes.map((n) => n.op).join(',');
  const gotOps = got.nodes.map((n) => n.op).join(',');
  if (wantOps === gotOps) seqOK++;
  else {
    seqBad++; bad++;
    note(`${p.part}[${p.index}] ops ${gotOps || '(none)'} vs ${wantOps}`);
  }

  for (let i = 0; i < Math.min(p.nodes.length, got.nodes.length); i++) {
    const w = p.nodes[i], g = got.nodes[i];
    if (w.op !== g.op) continue;

    // The material records, field by field.
    const wr = w.records ?? [], gr = g.records ?? [];
    if (wr.length !== gr.length) {
      recBad++; bad++;
      note(`${p.part}[${p.index}] node ${i} op${w.op}: `
        + `${gr.length} records vs ${wr.length}`);
    }
    for (let k = 0; k < Math.min(wr.length, gr.length); k++) {
      const a = wr[k], b = gr[k];
      const diff = ['kind', 'sub', 'cull', 'flag', 'rgba', 'texIndex', 'size',
        'span', 'at2c', 'translate', 'rotate', 'scale']
        .filter((f) => !same(a[f], b[f]));
      if (!diff.length) recOK++;
      else {
        recBad++; bad++;
        note(`${p.part}[${p.index}] node ${i} rec ${k}: ${diff.map((f) =>
          `${f} ${JSON.stringify(b[f])} vs ${JSON.stringify(a[f])}`).join('; ')}`);
      }
    }

    // The per-opcode node fields. Only the ones the handler STORES in the node
    // are listed: op0's extents and subdivision counts go straight into its
    // generator's registers and are never written down, so they are decoded
    // here but cannot be checked against the arena.
    const FIELDS = {
      0: ['mode'],
      1: ['at18', 'a', 'b', 'scale'],
      2: ['at18', 'sel', 'value'],
      3: ['at18', 'count', 'flag', 'sel', 'triples'],
      4: ['at18', 'flag', 'count'],
    }[w.op] ?? [];
    const diff = FIELDS.filter((f) => !same(w[f], g[f]));
    if (!diff.length) fieldOK++;
    else {
      fieldBad++; bad++;
      note(`${p.part}[${p.index}] node ${i} op${w.op}: ${diff.map((f) =>
        `${f} ${JSON.stringify(g[f])} vs ${JSON.stringify(w[f])}`).join('; ')}`);
    }

    // op4's point array is the one place the decoder produces bulk geometry
    // the arena also holds, so it is compared element by element.
    if (w.op === 4) {
      const wp = w.points ?? [], gp = g.points ?? [];
      const n = Math.min(wp.length, gp.length);
      let pb = wp.length !== gp.length ? 1 : 0;
      for (let k = 0; k < n; k++) {
        if (!same(wp[k].p, gp[k].p) || !same(wp[k].w, gp[k].w)
          || !same(wp[k].k, gp[k].k)) pb++;
      }
      if (!pb) nodeOK++;
      else {
        nodeBad += pb; bad++;
        note(`${p.part}[${p.index}] node ${i}: ${pb} of ${wp.length} points differ`);
      }
    }
  }
  if (bad) progBad++; else progOK++;
}

// ---------------------------------------------------------------------------
// The built structure, which is a different claim from the grammar.
//
// OP3 GENERATES NOTHING. Its build handler allocates nothing at all, and yet
// its 72 nodes own 7,502 of the 11,723 vertices — 64% of the geometry. The
// answer is in its EVAL handler `0x10004e64`, which is where the work happens
// for the one opcode PORT_SPEC 4b says does per-frame work:
//
//     lbz r9, 0x19(r27)     /* an outer repeat count            */
//     lbz r3, 0x18(r27)     /* an index into the node list      */
//     bl  0x10003e9c        /* walk to that node and CLONE it   */
//     ... up to four transforms from the packed selectors ...
//     addic. r9, r9, -1; bgt
//
// `0x10003e9c` walks `r3` links from the list head, then walks THIS node's
// vertex chain to its tail and appends a fresh 0x6c copy of every vertex of the
// source. So op3 is an ARRAY MODIFIER: N progressively transformed copies of an
// earlier node. That leaves only op0 and op4 as real generators — 2,033 and
// 2,188 vertices between them — which is a much smaller port than 11,723
// vertices across three opcodes suggested.
//
// Checked rather than asserted from the disassembly, because "op3 copies
// something" and "op3 copies node[at18] exactly count times" are different
// claims and only the second one is worth building on.
let repOK = 0, repBad = 0, backOK = 0, backBad = 0, genBad = 0, rootOK = 0;
let tubeOK = 0, tubeBad = 0, boxOK = 0, boxBad = 0;
for (const p of doc.programs) {
  const ns = p.nodes;
  for (let i = 0; i < ns.length; i++) {
    const n = ns[i];
    if (n.op === 3) {
      const k = n.at18;
      // The source must already exist when the clone runs, so the reference is
      // always backwards. A forward one would read a node the eval pass has not
      // filled in yet and the geometry would depend on evaluation order.
      if (k < i) backOK++;
      else { backBad++; note(`${p.part}[${p.index}] node ${i} op3 at18=${k} is not backward`); }
      const s = ns[k];
      if (s && n.vertices.length === n.count * s.vertices.length
        && n.triangles.length === n.count * s.triangles.length) repOK++;
      else {
        repBad++;
        note(`${p.part}[${p.index}] node ${i} op3 at18=${k} count=${n.count}: `
          + `${n.vertices.length} verts, expected ${n.count} x ${s?.vertices.length}`);
      }
    }
    // OP0 IS FOUR PRIMITIVES, and which one is decided by WHICH EXTENT IS ZERO
    // rather than by an opcode of its own. The handler reads two halfwords and
    // branches on their top bits, and each arm both picks a mode and rewrites
    // the operands so that the masked-off bit becomes a zero extent:
    //
    //     mode 0  all three extents live   a subdivided BOX
    //     mode 1  extent a is zero         a PLANE on steps 1 and 2
    //     mode 2  extent b is zero         a PLANE on steps 0 and 2
    //     mode 3  extent d is zero         a PLANE on steps 0 and 1
    //
    // A box grid's surface has 2(pq + qr + rp) + 2 vertices and twice that many
    // triangles — the +2 being the two corners no face-pair shares — and a
    // plane has the ordinary (u+1)(v+1) and 2uv.
    //
    // EXCEPT WHEN THE MATERIAL RECORD'S KIND IS 5, which produces no faces at
    // all: `lbz r3, 0(r20); cmpwi r3, 5; beq` jumps clean over face generation.
    // Those nodes are point clouds, and without that clause an 8x8 grid of 81
    // vertices carrying 0 triangles looks like a broken model rather than a
    // deliberate one.
    if (n.op === 0) {
      const g = decoded.get(p)?.[i];
      const [x, y, z] = g?.steps ?? [0, 0, 0];
      const PAIR = { 1: [1, 2], 2: [0, 2], 3: [0, 1] }[g?.mode];
      let wantV, wantT;
      if (g?.mode === 0) {
        const f = x * y + y * z + z * x;
        wantV = 2 * f + 2; wantT = 4 * f;
      } else if (PAIR) {
        const u = g.steps[PAIR[0]], v = g.steps[PAIR[1]];
        wantV = (u + 1) * (v + 1); wantT = 2 * u * v;
      }
      if (n.records[0]?.kind === 5) wantT = 0;
      if (n.vertices.length === wantV && n.triangles.length === wantT) boxOK++;
      else {
        boxBad++;
        note(`${p.part}[${p.index}] node ${i} op0 mode=${g?.mode} `
          + `steps=${JSON.stringify(g?.steps)} kind=${n.records[0]?.kind}: `
          + `${n.vertices.length}v ${n.triangles.length}t, `
          + `expected ${wantV}v ${wantT}t`);
      }
    }
    // OP4 IS A TUBE, and its two counts are exactly predictable from the
    // decoded operands — which is what says the reading of its generator is
    // right before a line of it is ported. `at18` is the number of sides in the
    // swept ring; each control point carries a subdivision count `k` in the top
    // ten bits of its last halfword; the spline is evaluated at the sum of
    // those, giving one ring of `sides` vertices each. Consecutive rings are
    // joined by a quad strip that always wraps around the sides.
    //
    // WHETHER IT ALSO JOINS THE LAST RING BACK TO THE FIRST is `flag`, bit 7 of
    // the operand byte, stored at node+0x19 — the same bit the generator tests
    // when it picks each control point's two neighbours for the spline, so an
    // open tube's end segments use a clamped neighbour and a closed one wraps.
    // Written first without it, this assertion read 30/33: vertices matched
    // everywhere and only the three flagged nodes had one extra ring of
    // triangles, which is what a missing wrap looks like and nothing else.
    if (n.op === 4) {
      const rings = n.points.reduce((a, q) => a + q.k, 0);
      const wantV = n.at18 * rings;
      const wantT = Math.max(0, n.flag ? rings : rings - 1) * n.at18 * 2;
      if (n.vertices.length === wantV && n.triangles.length === wantT) tubeOK++;
      else {
        tubeBad++;
        note(`${p.part}[${p.index}] node ${i} op4 sides=${n.at18} rings=${rings}: `
          + `${n.vertices.length}v ${n.triangles.length}t, `
          + `expected ${wantV}v ${wantT}t`);
      }
    }
    // Follow the clone chain down. An op3 whose source is another op3 is
    // common — 40 vertices become 80 become 160 — so the question that
    // actually has content is whether every chain BOTTOMS OUT at a generator.
    // "Only op0 and op4 generate geometry" would be vacuous here: no shipped
    // program contains an op1 or op2, so there is nothing else it could rule
    // out. This can fail.
    if (n.op === 3) {
      let j = i, hops = 0;
      while (ns[j] && ns[j].op === 3 && hops++ < ns.length) j = ns[j].at18;
      if (ns[j] && (ns[j].op === 0 || ns[j].op === 4)) rootOK++;
      else {
        genBad++;
        note(`${p.part}[${p.index}] node ${i} op3 chain ends at `
          + `${ns[j] ? `op${ns[j].op}` : 'nothing'} after ${hops} hops`);
      }
    }
  }
}

let failed = 0;
const ok = (name, pass, detail = '') => {
  console.log(`${pass ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
  if (!pass) failed++;
};

const progs = doc.programs.length;
console.log(`${progs} programs, `
  + `${doc.programs.reduce((a, p) => a + p.nodes.length, 0)} nodes\n`);

ok('every program decodes to the same opcode sequence', seqBad === 0,
  `${seqOK}/${progs}`);
ok('the decoder lands on exactly the stream\'s own u16 length + 1', spanBad === 0,
  `${spanOK}/${progs}`);
ok('every material record matches field for field', recBad === 0,
  `${recOK}/${recOK + recBad}`);
ok('every node\'s stored operands match', fieldBad === 0,
  `${fieldOK}/${fieldOK + fieldBad}`);
ok('op4\'s point arrays match', nodeBad === 0, `${nodeOK} nodes`);
ok('the whole program set decodes', progBad === 0, `${progOK}/${progs}`);

// A decoder that found no records would pass every check above by vacuum.
const recs = doc.programs.reduce((a, p) =>
  a + p.nodes.reduce((b, n) => b + n.records.length, 0), 0);
ok('the record check has real coverage', recOK > 100, `${recOK} of ${recs} records`);

// WHICH OPCODES THIS ACTUALLY EXERCISED, because three of the five carry the
// whole result and two carry none of it. Mutating op2's operand width by a byte
// changes nothing any check here can see — not because the check is weak but
// because no shipped program contains an op2. Saying so turns a green run from
// "the grammar is right" into "the grammar is right where the data reaches",
// which is the true claim.
const used = new Map();
for (const p of doc.programs) {
  for (const n of p.nodes) used.set(n.op, (used.get(n.op) ?? 0) + 1);
}
const covered = [0, 1, 2, 3, 4].filter((o) => used.has(o));
const dead = [0, 1, 2, 3, 4].filter((o) => !used.has(o));
ok('the opcodes the shipped data uses are all covered', covered.length >= 3,
  covered.map((o) => `op${o} x${used.get(o)}`).join(', '));
if (dead.length) {
  console.log(`     op${dead.join(' and op')} appear in NO shipped program, so `
    + 'they are decoded from the instructions and unverified — a wrong operand '
    + 'width there would not fail this check');
}
ok('op0 builds the box or plane its zero extent selects', boxBad === 0,
  `${boxOK}/${boxOK + boxBad} nodes, vertices and triangles both`);
ok('op3 repeats node[at18] exactly count times', repBad === 0,
  `${repOK}/${repOK + repBad} nodes, vertices and triangles both`);
ok('op3\'s source reference is always backward', backBad === 0,
  `${backOK}/${backOK + backBad}`);
ok('every op3 clone chain bottoms out at an op0 or op4 generator',
  genBad === 0, `${rootOK}/${rootOK + genBad} chains`);
ok('op4 builds sides x rings vertices, and closes the tube iff flag is set',
  tubeBad === 0, `${tubeOK}/${tubeOK + tubeBad} nodes`);

console.log('     the generators themselves are not ported: geo.json\'s '
  + '11,723 vertices and 19,074 triangles are their oracle, and only op0 '
  + '(2,033) and op4 (2,188) actually make any — op3 copies');

for (const f of failures) console.log(`     ${f}`);

if (failed) process.exit(1);
console.log('\nthe geometry stream decodes statically — the widths are not '
  + 'runtime-dependent');
