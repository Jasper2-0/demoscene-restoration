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
import { decodeScene, buildMesh } from '../../web/js/scene.js';

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
// The copied VALUES, not just the counts.
let posOK = 0, posBad = 0, colOK = 0, colBad = 0, idxOK = 0, idxBad = 0;
let fieldOK = 0, fieldBad = 0, texDep = 0;
// PROGRAM 26 OF PART ONE READS TEXTURE MEMORY. It is the one that segfaulted
// under rungeo's single shared no-op vector, and it only runs at all once the
// texture table holds dereferenceable pointers — because something in it
// FOLLOWS one. So its geometry depends on what those objects contain, geodump
// fills them with zeroes, and the vertices it produces are not the ones the
// real boot produces. Its 1,044 positions are counted separately and named
// rather than lost in a tolerance.
const TEXTURE_DEPENDENT = new Set(['p1:26']);
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
    const wantF = visible.reduce((t, n) =>
      t + n.triangles.reduce((u, x) => u + 1 + (x.layers?.length ?? 0), 0), 0);
    const haveV = (scene.nodes[i].vertexList ?? []).length;
    const objs = scene.nodes[i].objects ?? [];
    for (const o of objs) {
      const n = (o.faces ?? []).length;
      layers.set(n, (layers.get(n) ?? 0) + 1);
    }

    // The copy itself: positions, colours and the index resolution.
    const mesh = buildMesh(prog);
    if (mesh.faces.length !== wantF && failures.length < 8) {
      failures.push(`${scene.part}/${scene.order} node ${i}: buildMesh made `
        + `${mesh.faces.length} faces, program implies ${wantF}`);
    }
    const vmap = scene.vertices ?? {};
    const list = scene.nodes[i].vertexList ?? [];
    const skip = TEXTURE_DEPENDENT.has(`${scene.part}:${got[i].resource}`);
    if (list.length === mesh.vertices.length) {
      for (let k = 0; k < list.length; k++) {
        const w = vmap[list[k]];
        if (!w) continue;
        const g = mesh.vertices[k];
        if (skip) { texDep++; } else if (
          JSON.stringify(g.p) === JSON.stringify(w.p)) posOK++;
        else {
          posBad++;
          if (failures.length < 8) {
            failures.push(`${scene.part}/${scene.order} vertex ${k}: `
              + `${JSON.stringify(g.p)} vs ${JSON.stringify(w.p)}`);
          }
        }
        if (JSON.stringify(g.rgba) === JSON.stringify(w.rgba)) colOK++; else colBad++;
      }
    }
    const idxOf = new Map(list.map((h, n) => [h, n]));
    // FLATTENED, because a scene face and its LAYERS are separate primitives.
    // arenadump walks the +0x60 chain as "objects" and the +0x5c chain inside
    // each as "faces"; the render walk draws every one of both, and buildMesh
    // emits them in the same order — primary, then its layers.
    const flat = objs.flatMap((o) => o.faces ?? []);
    for (let k = 0; k < Math.min(flat.length, mesh.faces.length); k++) {
      const w = flat[k], g = mesh.faces[k];
      const wi = (w.vertices ?? []).map((h) => idxOf.get(h));
      if (JSON.stringify(wi) === JSON.stringify(g.vertices)) idxOK++; else idxBad++;
      for (const [gv, wv] of [[g.cull, w.cull], [g.alpha, w.alpha],
        [JSON.stringify(g.rgb), JSON.stringify(w.rgb)],
        [g.textureIndex, w.textureIndex], [g.prim, w.prim]]) {
        if (gv === wv) fieldOK++; else fieldBad++;
      }
    }

    if (haveV === wantV) vOK++;
    else {
      vBad++;
      if (failures.length < 8) {
        failures.push(`${scene.part}/${scene.order} node ${i} `
          + `(program ${got[i].resource}): ${haveV} vertices vs ${wantV}`);
      }
    }
    // ONE 0x64 RECORD PER GEOMETRY TRIANGLE on the +0x60 chain — which is the
    // chain arenadump calls "objects" — plus one more per LAYER on +0x5c.
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
ok('every copied vertex position is bit-exact', posBad === 0,
  `${posOK}/${posOK + posBad}`);
ok('every copied vertex colour is the 1.0 the geometry allocator preset',
  colBad === 0, `${colOK}/${colOK + colBad} — geometry +0x0c becomes scene +0x30`);
ok('every face index resolves to the right vertex', idxBad === 0,
  `${idxOK}/${idxOK + idxBad} faces, indices rebased per source node`);
ok('every copied face field matches', fieldBad === 0,
  `${fieldOK}/${fieldOK + fieldBad} — cull, alpha, colour, texture, primitive`);
console.log(`     ${texDep} vertices skipped: p1 program 26 READS TEXTURE MEMORY, `
  + 'so geodump\'s zero-filled texture objects give it different geometry from '
  + 'the real boot — it is the program that segfaulted under a shared no-op '
  + 'vector, for the same reason');
console.log(`     ${hidden} geometry nodes are hidden by an op3 clone across `
  + 'all uses — their +0x12 was cleared by the copy that replaced them');
console.log(`     records by layer-chain length: `
  + [...layers].sort().map(([n, c]) => `${n} face${n > 1 ? 's' : ''} x${c}`).join(', '));
for (const f of failures) console.log(`     ${f}`);

if (failed) process.exit(1);
console.log('\nthe geometry programs and the scenes are wired to each other');
