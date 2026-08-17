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
// ONLY op0 IS PORTED. op3 clones an earlier node's chain and op4 sweeps a
// Catmull-Rom spline; both are counted and named below rather than skipped
// silently, because between them they hold 9,690 of the 11,723 vertices and a
// green line covering 2,033 of them should not be mistaken for the set.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeProgram, buildOp0 } from '../../web/js/geom.js';
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

  p.nodes.forEach((want, i) => {
    if (want.op !== 0) {
      unported.set(want.op, (unported.get(want.op) ?? 0) + want.vertices.length);
      return;
    }
    const built = buildOp0(got.nodes[i], table);
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

console.log(`op0: ${nodesOK + nodesBad} nodes, ${vOK + vBad} vertices\n`);

ok('op0 builds the same number of vertices as the original', countBad === 0,
  `${nodesOK + nodesBad} nodes`);
ok('every op0 vertex position is bit-exact', vBad === 0,
  `${vOK}/${vOK + vBad}`
  + (worst ? `, worst |diff| ${worst.toExponential(2)} at ${worstAt}` : ''));
ok('every op0 node matches in full', nodesBad === 0,
  `${nodesOK}/${nodesOK + nodesBad}`);
// The transform pipeline is the part that was hardest to get right, so the
// check states how much of it the data actually reached.
ok('the record transform is exercised, not just identity records',
  seen.rotate > 0 && seen.translate > 0 && seen.scale > 0,
  `${seen.rotate} rotate, ${seen.scale} scale, ${seen.translate} translate, `
  + `${seen.plain} plain`);

for (const [op, n] of [...unported].sort()) {
  console.log(`     op${op} is not ported: ${n} vertices not checked here`);
}
for (const f of failures) console.log(`     ${f}`);

if (failed) process.exit(1);
console.log('\nop0\'s box and plane generator reproduces the original exactly');
