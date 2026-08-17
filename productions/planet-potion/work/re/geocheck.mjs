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
// WHAT IS NOT CHECKED HERE, because the decoder does not claim it: the vertices
// and triangles the five generators produce. `out/geo.json` carries 11,723 and
// 19,074 of them and they are the oracle for the generators, which are a
// separate port. This check covers the stream grammar only, and says so in its
// output rather than letting a green line imply more than it tested.
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
console.log('     the stream grammar only: the vertices and triangles in '
  + 'geo.json are the oracle for the five generators, which are not ported');

for (const f of failures) console.log(`     ${f}`);

if (failed) process.exit(1);
console.log('\nthe geometry stream decodes statically — the widths are not '
  + 'runtime-dependent');
