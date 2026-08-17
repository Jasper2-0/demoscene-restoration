// arenacheck.mjs — the structural export, as assertions.
//
//   node work/re/arenacheck.mjs out/arena.json out/scenes.json
//
// `arenadump.py` walks four chains through an arena it did not build, using
// offsets read out of the handlers. That is exactly the kind of tool that
// produces a large, plausible, wrong file — a walk that stops one link early,
// or reads a byte as a halfword, still writes 5 MB of JSON and still prints a
// reassuring summary. This is what says it did not.
//
// WHAT IS ACTUALLY CHECKABLE HERE, and it is more than it looks:
//
//   * the node type lists must equal `scenes.json`'s, which a DIFFERENT tool
//     produced by a different walk. 29 scenes agreeing node for node is a real
//     cross-check on the list traversal;
//   * shading modes and cull flags must land in the sets PORT_SPEC §4c
//     documents. Reading those two as halfwords rather than bytes — which is
//     what the first version did — turns modes 1, 2, 4 into 256, 512, 1024 and
//     shows up here immediately;
//   * every vertex pointer in every face record must resolve to a vertex the
//     walk actually captured;
//   * every source normal must be unit length. The builder normalises with
//     `frsqrte` and no Newton step, so the tolerance is loose — but a wrong
//     offset gives lengths nowhere near 1, which is the point;
//   * exactly the type-5 nodes have a vertex list, because `node+0x20` is the
//     vertex head only for meshes and a count for everything else.
//
// WHAT IS DELIBERATELY NOT CHECKED. `meshes.json`'s 112 op4 vertices do NOT
// appear among these positions — 7 of 112 do, which is coincidence. That is not
// a defect in either file: `meshes.json` records what the geometry BUILDER
// emitted, and the arena holds it after the EVALUATE pass at `0x10004e64` has
// applied each node's translate, rotate and scale (PORT_SPEC §4b). So the two
// are oracles for different halves of the same stage, and asserting they agree
// would be asserting the eval pass does nothing.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ABSENT = 77;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const arenaFile = process.argv[2] ?? path.join(HERE, 'out', 'arena.json');
const scenesFile = process.argv[3] ?? path.join(HERE, 'out', 'scenes.json');

for (const f of [arenaFile, scenesFile]) {
  if (!fs.existsSync(f)) {
    console.log(`arenacheck: ${f} not here — ./ppcbox.sh python3 arenadump.py flat/ out/arena.json. Skipping.`);
    process.exit(ABSENT);
  }
}

const arena = JSON.parse(fs.readFileSync(arenaFile, 'utf8'));
const scenes = JSON.parse(fs.readFileSync(scenesFile, 'utf8'));

let bad = 0;
const ok = (name, pass, detail = '') => {
  console.log(`${pass ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
  if (!pass) bad++;
};

const nodesOf = (s) => s.nodes ?? [];
const allNodes = arena.scenes.flatMap(nodesOf);
const allFaces = allNodes.flatMap((n) => n.objects.flatMap((o) => o.faces));

// --- the walk reached everything -------------------------------------------

ok('every scene decoded', arena.scenes.every((s) => Array.isArray(s.nodes)),
  `${arena.scenes.filter((s) => s.nodes).length}/${arena.scenes.length}`);

ok('29 scenes, as scenes.json has', arena.scenes.length === 29,
  `${arena.scenes.length}`);

// --- against a tool that walked the list a different way --------------------

const want = new Map(scenes.scenes.map((s) => [`${s.part}${s.order}`, s.nodes]));
let same = 0;
for (const s of arena.scenes) {
  const got = nodesOf(s).map((n) => n.type);
  const w = want.get(`${s.part}${s.order}`);
  if (w && w.length === got.length && w.every((t, i) => t === got[i])) same++;
}
ok('node type lists match scenes.json', same === arena.scenes.length,
  `${same}/${arena.scenes.length} scenes`);

// The scene VM synthesises a type-7 root per scene and never dispatches it, so
// there is exactly one and it is where the walk starts.
const roots = arena.scenes.filter((s) => nodesOf(s).filter((n) => n.type === 7).length === 1);
ok('one type-7 root per scene', roots.length === arena.scenes.length,
  `${roots.length}/${arena.scenes.length}`);

// --- the field widths -------------------------------------------------------

const shading = new Set(allFaces.map((f) => f.shading));
ok('shading modes are the five §4c documents',
  [...shading].every((m) => m >= 0 && m <= 4),
  `{${[...shading].sort((a, b) => a - b).join(', ')}}`);

const cull = new Set(allFaces.map((f) => f.cull));
ok('cull flags are 0, 1 or 2', [...cull].every((c) => c >= 0 && c <= 2),
  `{${[...cull].sort((a, b) => a - b).join(', ')}}`);

// --- the chains are consistent with each other ------------------------------

let unresolved = 0, refs = 0;
for (const s of arena.scenes) {
  const vs = s.vertices ?? {};
  for (const n of nodesOf(s)) {
    for (const o of n.objects) {
      for (const f of o.faces) {
        for (const p of f.vertices) { refs++; if (!(p in vs)) unresolved++; }
      }
    }
  }
}
ok('every face vertex pointer resolves', unresolved === 0,
  `${refs - unresolved}/${refs}`);

let countMismatch = 0;
for (const f of allFaces) {
  if (f.vertexCount > 0 && f.vertexCount <= 64 && f.vertices.length !== f.vertexCount) {
    countMismatch++;
  }
}
ok('each face lists as many vertices as it declares', countMismatch === 0,
  `${allFaces.length} faces`);

// `node+0x20` is the vertex head for type 5 and a count for everything else, so
// this is the assertion that the overload was read the right way round.
const meshNodes = allNodes.filter((n) => n.type === 5);
const listed = allNodes.filter((n) => (n.vertexList ?? []).length);
ok('exactly the mesh nodes have a vertex list',
  listed.length === meshNodes.length && listed.every((n) => n.type === 5),
  `${listed.length} lists, ${meshNodes.length} type-5 nodes`);

// --- the geometry is geometry ----------------------------------------------

let worst = 0, counted = 0;
for (const s of arena.scenes) {
  for (const v of Object.values(s.vertices ?? {})) {
    if (v.n.some((c) => c === null)) continue;
    const len = Math.hypot(...v.n);
    if (len === 0) continue;
    counted++;
    worst = Math.max(worst, Math.abs(len - 1));
  }
}
ok('every source normal is unit length', worst < 1e-4,
  `${counted} normals, worst deviation ${worst.toExponential(2)}`);

let moved = 0, positions = 0;
for (const s of arena.scenes) {
  for (const v of Object.values(s.vertices ?? {})) {
    positions++;
    if (v.p.some((c) => c !== null && c !== 0)) moved++;
  }
}
// A freshly built arena has +0x00 still zero and +0x24 already filled. If this
// ever reads zero the dumper is back on the transformed side of the record.
ok('source positions are populated', moved === positions,
  `${moved}/${positions}`);

console.log(`\n${allNodes.length} nodes, ${allFaces.length} faces, ` +
  `${positions} vertices across ${arena.scenes.length} scenes`);
if (bad) {
  console.log(`${bad} assertion(s) failed`);
  process.exit(1);
}
console.log('the structural export is self-consistent and agrees with scenes.json');
