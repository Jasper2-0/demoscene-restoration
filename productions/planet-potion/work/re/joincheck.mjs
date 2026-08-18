// joincheck.mjs — the join between the geometry programs and the scenes.
//
//   node work/re/joincheck.mjs flat/ out/geo.json out/arena.json
//
// `0x100027b8` is scene op 5's handler and the seam between the intro's two
// largest data structures: it takes the node list a geometry program built and
// COPIES it into the scene's own render node. A template and its instances,
// not a reference — every scene using a program gets its own vertices.
//
// This checks the seam by counting. For every type-5 node in every scene, the
// vertices it owns and the length of its object chain must equal what its
// geometry program produced. Nothing here needs the copy's float values to be
// right; it establishes that the two halves are wired to each other at all,
// which nothing before it did — geo.json and arena.json were separate exports
// with no assertion connecting them.
//
// THE PROGRAM IS CHOSEN BY THE RESOURCE BYTE, and which TABLE it indexes
// depends on the part: `_generate_scene` is handed one object table for part
// one and another for part three, so the same index means different geometry in
// each. Using one table for both silently pairs the wrong meshes with the wrong
// scenes and still produces plausible counts for a while.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeScene } from '../../web/js/scene.js';

const ABSENT = 77;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const flat = process.argv[2] ?? path.join(HERE, 'flat');
const geoFile = process.argv[3] ?? path.join(HERE, 'out', 'geo.json');
const arenaFile = process.argv[4] ?? path.join(HERE, 'out', 'arena.json');

const SEGMENTS = [
  { base: 0x10030000, name: 'seg3_DATA_10030000.bin' },
  { base: 0x10040000, name: 'seg4_DATA_10040000.bin' },
];

if (![geoFile, arenaFile, path.join(flat, SEGMENTS[0].name)].every(fs.existsSync)) {
  console.log('joincheck: need geo.json, arena.json and flat/seg3. Skipping.');
  process.exit(ABSENT);
}

const segs = SEGMENTS.map((s) => ({
  ...s, data: new Uint8Array(fs.readFileSync(path.join(flat, s.name))),
}));
const geo = JSON.parse(fs.readFileSync(geoFile, 'utf8'));
const arena = JSON.parse(fs.readFileSync(arenaFile, 'utf8'));

const programs = { p1: [], p3: [] };
for (const p of geo.programs) programs[p.part][p.index] = p;

let vOK = 0, vBad = 0, oOK = 0, oBad = 0, nodes = 0, noProgram = 0, hidden = 0;
const layers = new Map();
const failures = [];

for (const scene of arena.scenes) {
  const addr = parseInt(scene.stream, 16);
  const seg = segs.find((s) => addr >= s.base && addr < s.base + s.data.length);
  if (!seg) continue;
  const got = decodeScene(seg.data, addr - seg.base).nodes;
  for (let i = 0; i < Math.min(got.length, scene.nodes.length); i++) {
    if (got[i].op !== 5) continue;
    nodes++;
    const prog = programs[scene.part][got[i].resource];
    if (!prog) {
      noProgram++;
      failures.push(`${scene.part}/${scene.order} node ${i}: `
        + `resource ${got[i].resource} names no program`);
      continue;
    }
    // A GEOMETRY NODE WITH +0x12 CLEAR IS SKIPPED. Every build handler sets it
    // to 1, and op3's EVAL then clears it on whatever node it CLONED — so a
    // source that has been copied is hidden and only the copy is drawn.
    // Counting all of them instead leaves eleven meshes with too many vertices.
    const visible = prog.nodes.filter((n) => n.visible);
    hidden += prog.nodes.length - visible.length;
    const wantV = visible.reduce((t, n) => t + n.vertices.length, 0);
    const wantT = visible.reduce((t, n) => t + n.triangles.length, 0);
    const haveV = (scene.nodes[i].vertexList ?? []).length;
    const objs = scene.nodes[i].objects ?? [];
    for (const o of objs) {
      const n = (o.faces ?? []).length;
      layers.set(n, (layers.get(n) ?? 0) + 1);
    }

    if (haveV === wantV) vOK++;
    else {
      vBad++;
      if (failures.length < 8) {
        failures.push(`${scene.part}/${scene.order} node ${i} `
          + `(program ${got[i].resource}): ${haveV} vertices vs ${wantV}`);
      }
    }
    // ONE 0x64 RECORD PER GEOMETRY TRIANGLE, chained on +0x60 — which is the
    // chain arenadump calls "objects". Its "faces", on +0x5c, are the LAYER
    // chain instead, which is why almost every object carries exactly one.
    if (objs.length === wantT) oOK++;
    else {
      oBad++;
      if (failures.length < 8) {
        failures.push(`${scene.part}/${scene.order} node ${i}: `
          + `${objs.length} records vs ${wantT} triangles`);
      }
    }
  }
}

let failed = 0;
const ok = (name, pass, detail = '') => {
  console.log(`${pass ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
  if (!pass) failed++;
};

console.log(`${nodes} mesh nodes across ${arena.scenes.length} scenes\n`);
ok('every resource byte names a real geometry program', noProgram === 0,
  `${nodes - noProgram}/${nodes}`);
ok('every mesh owns exactly its program\'s visible vertices', vBad === 0,
  `${vOK}/${vOK + vBad}`);
ok('every mesh owns one record per visible triangle', oBad === 0,
  `${oOK}/${oOK + oBad}`);
console.log(`     ${hidden} geometry nodes are hidden by an op3 clone across `
  + 'all uses — their +0x12 was cleared by the copy that replaced them');
console.log(`     records by layer-chain length: `
  + [...layers].sort().map(([n, c]) => `${n} face${n > 1 ? 's' : ''} x${c}`).join(', '));
for (const f of failures) console.log(`     ${f}`);

if (failed) process.exit(1);
console.log('\nthe geometry programs and the scenes are wired to each other');
