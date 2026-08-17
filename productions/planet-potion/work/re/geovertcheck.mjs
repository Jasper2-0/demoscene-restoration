// geovertcheck.mjs — the geometry generators: positions, triangles, normals.
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
let tOK = 0, tBad = 0, tCountBad = 0;
let nOK = 0, nBad = 0, nNonFinite = 0, colourBad = 0;
let mOK = 0, mBad = 0;
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

    // The indexed triangles. Integers, so there is nothing to round and no
    // reason for anything but exact equality — and the winding matters, so the
    // three indices are compared in order rather than as a set.
    const wt = want.triangles, gt = b.triangles ?? [];
    if (wt.length !== gt.length) {
      tCountBad++;
      if (failures.length < 8) {
        failures.push(`${p.part}[${p.index}] node ${i} op${want.op}: `
          + `${gt.length} triangles, arena has ${wt.length}`);
      }
    } else {
      for (let k = 0; k < wt.length; k++) {
        if (gt[k].idx.every((v, c) => v === wt[k].idx[c])) tOK++;
        else {
          tBad++;
          if (failures.length < 8) {
            failures.push(`${p.part}[${p.index}] node ${i} triangle ${k}: `
              + `${JSON.stringify(gt[k].idx)} vs ${JSON.stringify(wt[k].idx)}`);
          }
        }
      }
    }

    // Normals. A vertex whose accumulated normal came out as the zero vector
    // normalises to infinities in the original too; geodump writes those as
    // null and they are counted rather than compared.
    for (let k = 0; k < built.length; k++) {
      const wn = want.vertices[k].n;
      if (wn.some((c) => c === null)) { nNonFinite++; continue; }
      if (b.normals[k].every((v, c) => v === wn[c])) nOK++;
      else {
        nBad++;
        if (failures.length < 8) {
          failures.push(`${p.part}[${p.index}] node ${i} normal ${k}: `
            + `${JSON.stringify(b.normals[k])} vs ${JSON.stringify(wn)}`);
        }
      }
      // The builder never writes a vertex colour. `alloc_mem` zeroes what it
      // hands out and nothing in _generate_obj touches +0x30, so the source
      // colour is somebody else's job — asserted rather than assumed, because
      // "we did not port it" and "there is nothing there to port" are different
      // states and only measuring tells them apart.
      if (want.vertices[k].rgba.some((c) => c !== 0)) colourBad++;
    }

    // The material fields the builder copies out of the record onto every
    // triangle. UVs are NOT here: they come from a projection routine that is
    // not ported, and are reported below rather than quietly compared.
    for (let k = 0; k < Math.min(wt.length, gt.length); k++) {
      const diff = ['kind', 'sub', 'cull', 'prim', 'texIndex']
        .filter((f) => gt[k][f] !== wt[k][f])
        .concat(gt[k].rgba?.some((v, c) => v !== wt[k].rgba[c]) ? ['rgba'] : [])
        .concat(gt[k].hasLayer !== (parseInt(wt[k].layer, 16) !== 0) ? ['layer'] : []);
      if (!diff.length) mOK++;
      else {
        mBad++;
        if (failures.length < 8) {
          failures.push(`${p.part}[${p.index}] node ${i} tri ${k}: ${diff.map((f) =>
            `${f} ${JSON.stringify(gt[k][f])} vs ${JSON.stringify(wt[k][f])}`).join('; ')}`);
        }
      }
    }

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
ok('every triangle has the same three indices, in order', tBad === 0
  && tCountBad === 0, `${tOK}/${tOK + tBad}`
  + (tCountBad ? `, ${tCountBad} nodes differ in count` : ''));
ok('every triangle carries the right material', mBad === 0,
  `${mOK}/${mOK + mBad} — kind, sub, cull, primitive, texture, colour, layer`);
ok('every vertex normal is bit-exact', nBad === 0, `${nOK}/${nOK + nBad}`
  + (nNonFinite ? `, ${nNonFinite} non-finite in the original and not comparable` : ''));
ok('the builder leaves every source colour at zero', colourBad === 0,
  `${vOK + vBad} vertices, none carries one`);
// The one field of the record that is NOT ported. `0x100036e8` projects each
// vertex into texture space through one of several modes selected by `sub`,
// with the node's bounding box as the divisor — and kind 4 then overwrites two
// of the three pairs with a different formula. Named here with a count so that
// "the material is exact" is not read as covering the texture coordinates.
console.log(`     UVs are NOT ported: ${(tOK + tBad) * 2} coordinate pairs `
  + 'from the projection routine at 0x100036e8 are not compared');
ok('every vertex in the intro is covered', skipped === 0,
  `${vOK} of ${vOK + vBad + skipped}`);
for (const f of failures) console.log(`     ${f}`);

if (failed) process.exit(1);
console.log('\nall three geometry generators reproduce the original exactly, '
  + 'vertices, triangles and normals');
