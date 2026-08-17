// geovertcheck.mjs — the geometry generators' vertex POSITIONS.
//
//   node work/re/geovertcheck.mjs flat/ out/geo.json
//
// `geocheck.mjs` covers the stream grammar and the shape of what gets built —
// how many vertices each node ends up with and where they came from. This is
// the other half: the float maths that decides WHERE each one is, compared
// against the arena bit for bit.
//
// EQUALITY, NOT TOLERANCE. Every position is written through a truncating
// `stfs`, so a correct port reproduces the bits. That matters more here than it
// sounds: the model was structurally right and within 1e-3 for 41 of 76 nodes
// several revisions before it was right at all, and a tolerance anywhere in the
// 1e-3 to 1e-5 range would have called each of those wrong versions a pass.
//
// ALL THREE LIVE GENERATORS ARE PORTED and every vertex in the intro is
// covered. Nothing here reads a position out of the oracle: `buildProgram`
// walks the node list front to back, op3 clones what the port itself built, and
// an op0 error propagates into the 7,502 op3 vertices downstream instead of
// being masked. An earlier version fed op3 from `geo.json` to isolate its
// logic, which was the right way to FIND the model and the wrong way to keep
// testing it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeProgram, buildProgram } from '../../web/js/geom.js';
import { sinus } from '../../web/js/tables.js';

const ABSENT = 77;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const flat = process.argv[2] ?? path.join(HERE, 'flat');
const file = process.argv[3] ?? path.join(HERE, 'out', 'geo.json');

const SEGMENTS = [
  { base: 0x10030000, name: 'seg3_DATA_10030000.bin' },
  { base: 0x10040000, name: 'seg4_DATA_10040000.bin' },
];

if (!fs.existsSync(file) || !fs.existsSync(path.join(flat, SEGMENTS[0].name))) {
  console.log(`geovertcheck: need ${file} and ${flat}/seg3 — `
    + './ppcbox.sh python3 geodump.py flat/ out/geo.json. Skipping.');
  process.exit(ABSENT);
}

const segs = SEGMENTS.map((s) => ({
  ...s, data: new Uint8Array(fs.readFileSync(path.join(flat, s.name))),
}));
const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
const table = sinus();

let nodesOK = 0, nodesBad = 0, vOK = 0, vBad = 0, countBad = 0;
let worst = 0, worstAt = null;
const unported = new Map();
const failures = [];
// Which record features the passing nodes actually exercised. A transform
// pipeline checked only against identity records would prove very little, and
// the first version of this model DID pass every identity node while getting
// both the rotation order and the translation signs wrong.
const seen = { rotate: 0, scale: 0, translate: 0, plain: 0 };

for (const p of doc.programs) {
  const addr = parseInt(p.program, 16);
  const seg = segs.find((s) => addr >= s.base && addr < s.base + s.data.length);
  if (!seg) continue;
  const got = decodeProgram(seg.data, addr - seg.base, null);
  // Built front to back: op3 clones an EARLIER node's finished chain, so
  // nothing here reads a vertex out of the oracle.
  const program = buildProgram(got, table);

  p.nodes.forEach((want, i) => {
    const b = program[i];
    if (!b.vertices) {
      unported.set(want.op, (unported.get(want.op) ?? 0) + want.vertices.length);
      return;
    }
    const built = b.vertices;
    if (built.length !== want.vertices.length) {
      countBad++; nodesBad++;
      failures.push(`${p.part}[${p.index}] node ${i}: built ${built.length} `
        + `vertices, arena has ${want.vertices.length}`);
      return;
    }
    const rec = want.records[0];
    if (rec?.rotate.some((v) => v)) seen.rotate++;
    else if (rec?.scale.some((v) => v !== 1)) seen.scale++;
    else if (rec?.translate.some((v) => v)) seen.translate++;
    else seen.plain++;

    let bad = 0;
    for (let k = 0; k < built.length; k++) {
      const w = want.vertices[k].p;
      // A non-finite field is written as null by geodump and is not comparable.
      if (w.some((c) => c === null)) continue;
      if (built[k].every((v, c) => v === w[c])) { vOK++; continue; }
      vBad++; bad++;
      for (let c = 0; c < 3; c++) {
        const d = Math.abs(built[k][c] - w[c]);
        if (d > worst) { worst = d; worstAt = `${p.part}[${p.index}] node ${i}`; }
      }
    }
    if (bad) {
      nodesBad++;
      if (failures.length < 8) {
        failures.push(`${p.part}[${p.index}] node ${i} mode ${got.nodes[i].mode}: `
          + `${bad}/${built.length} vertices differ`);
      }
    } else nodesOK++;
  });
}

let failed = 0;
const ok = (name, pass, detail = '') => {
  console.log(`${pass ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
  if (!pass) failed++;
};

console.log(`${nodesOK + nodesBad} nodes built, ${vOK + vBad} vertices\n`);

ok('every built node has the same vertex count as the original', countBad === 0,
  `${nodesOK + nodesBad} nodes`);
ok('every built vertex position is bit-exact', vBad === 0,
  `${vOK}/${vOK + vBad}`
  + (worst ? `, worst |diff| ${worst.toExponential(2)} at ${worstAt}` : ''));
ok('every built node matches in full', nodesBad === 0,
  `${nodesOK}/${nodesOK + nodesBad}`);
// The transform pipeline is the part that was hardest to get right, so the
// check states how much of it the data actually reached.
ok('the record transform is exercised, not just identity records',
  seen.rotate > 0 && seen.translate > 0 && seen.scale > 0,
  `${seen.rotate} rotate, ${seen.scale} scale, ${seen.translate} translate, `
  + `${seen.plain} plain`);

// Anything the port declined to build at all, by opcode. Empty is the goal and
// the line stays so that a future regression to null shows up as a number
// rather than as a quietly smaller denominator.
let skipped = 0;
for (const [op, n] of [...unported].sort()) {
  skipped += n;
  console.log(`     op${op} produced no vertices: ${n} not checked`);
}
ok('every vertex in the intro is covered', skipped === 0,
  `${vOK} of ${vOK + vBad + skipped}`);
for (const f of failures) console.log(`     ${f}`);

if (failed) process.exit(1);
console.log('\nall three geometry generators reproduce the original exactly');
