// pipeline.mjs — the whole thing, end to end, for the first time.
//
//   node work/re/pipeline.mjs
//
// scene bytes -> keyframes -> coefficients -> parents -> geometry programs ->
// mesh copy -> animation passes -> node walk -> clip -> emit. Every stage has
// its own check elsewhere; this runs them as one and compares the primitive
// count against draws.json.
//
// IT IS NOT A CHECK YET and is not wired into checkall. It reports counts.
//
// WHAT IT ESTABLISHES. p1/1 at t=92 computes 1,317 primitives against 1,320
// recorded, with cx/cy/scale = 200, 160, 226.7711944580078 — the recorded
// draw's triple to the last digit, reached from raw bytecode through eleven
// ported stages. The animation drives entirely from DECODED tracks; the only
// value still taken from the dump is `origin`, the scene clock, which is
// genuinely external.
//
// JOIN ON THE STREAM POINTER, NEVER ON (part, order). The two exports number
// their scenes differently — anim_all.json counts the OVERLAY as a scene and
// draws.json does not, because the overlay is drawn INTO every part-one scene
// rather than being one. They disagree for 23 of 28 streams. Joining on the
// ordinal pairs almost every scene with its neighbour, and it cost this file a
// whole investigation: the counts looked four times too high, every recorded
// projection looked wrong, and the renderer looked broken. It was not.
//
// WHAT IS STILL MISSING is meshes only: this renders type 5 and nothing else,
// so a scene's type 0, 3 and 4 nodes contribute nothing, and neither does the
// OVERLAY that draws.json folds into every part-one scene. That is the whole of
// the remaining shortfall.
//
// p1/16 PRODUCING ZERO DRAWS IS CORRECT, not a fault, and it took a measurement
// to be sure. All four of its mesh nodes carry the built-already flag, and the
// render handler's very first instruction pair is `lbz r3, 0xf(r30); cmpwi r3,
// 1; beqlr` — such a node is skipped before anything else happens. Across the
// whole export, 78 of 78 mesh nodes with that flag set have no draw attributed
// to them and 105 of 123 without it do. Its 158 recorded primitives are the
// overlay's, projected through that scene's CAMERA — which is why they all
// carry 320/240/200, the camera node's own triple: `publishCamera` pushes its
// channel block down a chain into other nodes' animation objects.
//
// Also spent and recorded so it is not repeated: not one extra primitive is
// off-screen, so the unported trivial-reject at 0x100062f8 was never the cause.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ABSENT = 77;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const R = path.resolve(HERE, '..', '..');
// geo.json IS NO LONGER ONE OF THESE. The engine builds its geometry out of the
// segments, so the only exports this needs are the recording it compares
// against and the arena dump it takes the beat-sync origins from.
const NEED = [`${R}/web/data/anim_all.json`,
  `${R}/web/data/draws.json`, `${R}/work/re/flat/seg0_CODE_10000000.bin`];
for (const f of NEED) {
  if (!fs.existsSync(f)) {
    console.log(`pipeline: need ${f} — ./ppcbox.sh python3 animdump.py --all `
      + 'flat/ out/anim_all.json out/draws.json, and geodump. Skipping.');
    process.exit(ABSENT);
  }
}
const { decodeScene, buildMesh } = await import(`${R}/web/js/scene.js`);
const { evaluateNode, composeHierarchy, composeNode, publishNode, concat } =
  await import(`${R}/web/js/anim.js`);
const { createEngine } = await import(`${R}/web/js/engine.js`);
const { sinus } = await import(`${R}/web/js/tables.js`);
const { glyphTable, layoutText } = await import(`${R}/web/js/font.js`);

const A = JSON.parse(fs.readFileSync(`${R}/web/data/anim_all.json`, 'utf8'));
const D = JSON.parse(fs.readFileSync(`${R}/web/data/draws.json`, 'utf8'));
const seg0 = new Uint8Array(
  fs.readFileSync(`${R}/work/re/flat/seg0_CODE_10000000.bin`));
const GLYPHS = glyphTable(seg0);
const segs = [
  { base: 0x10030000, d: new Uint8Array(fs.readFileSync(`${R}/work/re/flat/seg3_DATA_10030000.bin`)) },
  { base: 0x10040000, d: new Uint8Array(fs.readFileSync(`${R}/work/re/flat/seg4_DATA_10040000.bin`)) },
];
const table = sinus();
// THE CHECK RUNS THE PAGE'S ENGINE. Two implementations of the same eleven
// stages, one checked and one shipped, is how a port acquires a difference that
// nothing measures.
const engine = createEngine({
  seg0, seg3: segs[0].d, seg4: segs[1].d, table,
  layoutText: (text) => layoutText(GLYPHS, text),
});
const NIL = 0xffffffff;

function runScene(scene, frame, activeCamera = 0) {
  const S = engine.scene(scene.part, scene.order);
  // SEED THE BEAT SYNC. `anim.origin` is not in the bytecode: in loop mode 0 a
  // match between the frame's music signal and the node's trigger resets it to
  // the current tick, so a page that plays from the start arrives at the right
  // value and a harness that JUMPS to tick 92 cannot. This is the only value
  // here taken from the dump; everything else comes out of the segments.
  S.anims.forEach((a, i) => {
    a.origin = frame.nodes[i]?.anim?.origin ?? 0;
    a.track = 0;
  });
  S.subAnims.forEach((list, i) => list.forEach((a) => {
    a.origin = frame.nodes[i]?.anim?.origin ?? 0;
    a.track = 0;
  }));
  const draws = engine.frame(scene.part, scene.order, frame.t, -1, activeCamera);
  let faces = 0, meshNodes = 0;
  S.meshes.forEach((m) => { if (m) { meshNodes++; faces += m.faces.length; } });
  return { draws, faces, meshNodes, nodes: S.nodes };
}

// THE OVERLAY IS A SCENE TO anim_all AND NOT ONE TO draws.json, which folds its
// primitives into every part-one scene. Stream 0x1003301a, named by the
// `overlay` field.
const OVERLAY = '0x1003301a';
const overlayScene = A.scenes.find((s) => s.stream === OVERLAY);

// CONTENT, NOT COUNT. Two frames can agree on how many primitives they draw and
// share not one of them, so every frame is also matched as a MULTISET keyed by
// the primitive, its texture, its vertex count and its first vertex's screen
// position to two decimals — draws.json rounds to five, so two is safe.
// MATCHING AT THE RECORDING'S OWN PRECISION. draws.json rounds every
// coordinate to five decimals, so two numbers that differ by less than 5e-6
// are the same number as far as this file can ever know. Keying on a rounded
// string instead puts a cliff at the rounding boundary: 363.4350 and 363.4351
// are 1e-4 apart and print as "363.43" and "363.44".
//
// So the match is a GREEDY one on every vertex with an explicit tolerance, and
// the tolerance is stated rather than hidden in a toFixed. Each recorded
// primitive is consumed at most once, so drawing the same thing twice cannot
// score twice.
const TOL = 1e-5;
const sizeGot = new Map(), sizeWant = new Map();
const bump = (m, k) => m.set(k, (m.get(k) ?? 0) + 1);
const kindOf = (prim, tex, n) => `${prim}|${tex}|${n}`;
let worstMatched = 0;
const matchFrame = (got, want) => {
  const by = new Map();
  want.forEach((w, i) => {
    const k = kindOf(w.prim, w.texture, w.v.length / 10);
    if (!by.has(k)) by.set(k, []);
    by.get(k).push(i);
  });
  const used = new Set();
  let hit = 0;
  const missed = [];
  for (const d of got) {
    let found = -1, worst = Infinity;
    for (const i of by.get(kindOf(d.prim, d.texture, d.v.length)) ?? []) {
      if (used.has(i)) continue;
      const w = want[i];
      let m = 0;
      for (let j = 0; j < d.v.length && m <= TOL; j++) {
        m = Math.max(m, Math.abs(w.v[j * 10] - d.v[j].x),
          Math.abs(w.v[j * 10 + 1] - d.v[j].y));
      }
      if (m <= TOL && m < worst) { worst = m; found = i; }
      if (m === 0) break;
    }
    if (found >= 0) {
      used.add(found); hit++;
      if (worst > worstMatched) worstMatched = worst;
    } else missed.push(d);
  }
  if (process.env.PIPEMISS) {
    for (const d of missed) {
      console.log(`   MISS ${d.prim}/${d.texture} n=${d.v.length} `
        + d.v.map((v) => `(${v.x.toFixed(3)},${v.y.toFixed(3)})`).join(' '));
    }
  }
  return hit;
};

// THE FRAMES THAT ARE NOT EXACT, NAMED. A count would let a new fault hide
// behind a fixed one; this fails the moment a frame joins the list, AND when a
// listed one leaves it, so the only way to move the number is to change this
// line and say why.
//
//   p1/17 x5   ONE NODE, the one joincheck names as p1:26 — node 11, an op-0
//              33x33 grid that `0x10003868` DISPLACES from a 128x128 texture
//              sampled through the UV projection. geodump's texture memory is
//              zeroes, so the grid is flat here and a landscape in the
//              original, and its 2,048 triangles are the whole disagreement.
//              Every other texture in those five frames matches exactly.
// p1/5, p1/14 and p1/15 were on this list, short by three, two and two at their
// earliest tick and at no other. They were the OVERLAY: animdump gave it only
// the default ticks, because it is not a scene to draws.json and so has none of
// its own, and its primitives were being counted but never matched. Both halves
// are fixed — it gets the union of every scene's ticks, and its draws go into
// the same set everything else is matched against.
//
// p3/3's five were here while op 3's generated sub-objects were wrong. They are
// not any more: all 10,131 of them are bit-exact, and the frames came back
// without being asked to.
const KNOWN_INEXACT = new Set([
  'p1/17@138', 'p1/17@416', 'p1/17@692', 'p1/17@970', 'p1/17@1246',
]);
const inexact = [];

let totalGot = 0, totalWant = 0, scenes = 0, exact = 0, totalHit = 0;
for (const scene of A.scenes) {
  // JOIN ON THE STREAM POINTER, NOT ON (part, order). The two exports number
  // their scenes differently — anim_all.json counts the OVERLAY as a scene and
  // draws.json does not — so the two disagree for 23 of 28 streams and joining
  // on the ordinal pairs almost every scene with its neighbour.
  const dd = D.scenes.find((s) => s.stream === scene.stream);
  if (!dd) continue;
  for (const frame of scene.frames) {
    const df = dd.frames.find((f) => f.t === frame.t);
    if (!df) continue;
    // WHICH camera the show has selected is not in this scene's bytecode — it
    // is a call `_play_scene_new_camera` makes on the show timeline — so each
    // ordinal is tried and the one that places the most primitives is named,
    // rather than one being assumed. A scene with a single camera has only
    // ordinal 0 and this collapses to one run.
    let r;
    try { r = runScene(scene, frame); } catch (e) {
      console.log(`  ${scene.part}/${scene.order} t=${frame.t} THREW ${e.message}`);
      continue;
    }
    // Draw the overlay on top, at the same tick, exactly as the show does.
    // ITS PRIMITIVES ARE PART OF THE FRAME, not an addendum to the count. They
    // have to go into the same set everything is matched against, or a frame
    // that draws all of them still reports as short.
    let over = 0, overDraws = [];
    if (dd.overlay && overlayScene && scene.stream !== OVERLAY) {
      const of_ = overlayScene.frames.find((f) => f.t === frame.t);
      if (of_) {
        overDraws = runScene(overlayScene, of_).draws;
        over = overDraws.length;
      }
    }
    const allDraws = over ? r.draws.concat(overDraws) : r.draws;
    let hit = matchFrame(allDraws, df.draws), cam = 0;
    const nCameras = r.nodes.filter((x) => x.type === 6).length;
    for (let k = 1; k < nCameras; k++) {
      let alt; try { alt = runScene(scene, frame, k); } catch { continue; }
      const h = matchFrame(alt.draws.concat(overDraws), df.draws);
      if (h > hit) { hit = h; cam = k; r = alt; }
    }
    for (const d of allDraws) bump(sizeGot, d.v.length);
    for (const d of df.draws) bump(sizeWant, d.v.length / 10);
    if (process.env.PIPEDEBUG === scene.stream) {
      r.nodes.forEach((nd, i) => { if (nd.type === 5) console.log(
        `   mesh node ${i} gate ${nd.drawGate} built ${nd.built} objects `
        + `${nd.objects.length} alpha `
        + JSON.stringify([...new Set(nd.objects.flatMap((o) => o.faces.map(
          (fc) => +(fc.alpha * (fc.vertices[0]?.scaled[0] ?? 0)).toFixed(4))))].slice(0, 5))
        + ' cull ' + JSON.stringify([...new Set(nd.objects.map((o) => o.faces[0].cull))])); });
      const per = new Map();
      for (const d of r.draws) per.set(d.src, (per.get(d.src) ?? 0) + 1);
      console.log('   draws by node ' + [...per].sort((a, b) => a[0] - b[0])
        .map(([k, v]) => `${k}:${v}`).join(' '));
    }
    scenes++;
    const total = r.draws.length + over;
    if (total === df.draws.length && hit === df.draws.length) exact++;
    else inexact.push(`${scene.part}/${scene.order}@${frame.t}`);
    totalHit += hit;
    totalGot += total; totalWant += df.draws.length;
    console.log(`  ${scene.part}/${scene.order} t=${String(frame.t).padStart(3)}  `
      + `${String(r.meshNodes)} mesh nodes, ${String(r.faces).padStart(5)} faces -> `
      + `${String(r.draws.length).padStart(5)}`
      + (over ? ` + ${String(over).padStart(4)} overlay` : '            ')
      + ` = ${String(total).padStart(5)} draws, recorded `
      + `${String(df.draws.length).padStart(5)}`
      + `  ${hit} placed${cam ? ` (camera ${cam})` : ''}`
      + (total === df.draws.length && hit === df.draws.length ? '  EXACT' : ''));
    // Where a frame disagrees, say WHICH primitives — an aggregate count hides
    // whether the port draws the wrong things or the right things twice.
    if (total !== df.draws.length) {
      const tally = (list, k) => {
        const m = new Map();
        for (const x of list) {
          const key = `${x.prim}/${x.texture}`;
          const e = m.get(key) ?? [0, 0]; e[k]++; m.set(key, e);
        }
        return m;
      };
      const m = tally(allDraws, 0);
      for (const [key, [, b]] of tally(df.draws, 1)) {
        const e = m.get(key) ?? [0, 0]; e[1] = b; m.set(key, e);
      }
      const bad = [...m].filter(([, [a, b]]) => a !== b)
        .sort((x, y) => Math.abs(y[1][0] - y[1][1]) - Math.abs(x[1][0] - x[1][1]));
      console.log('        ' + bad.slice(0, 6)
        .map(([k, [a, b]]) => `${k} ${a}v${b}`).join('  ')
        + (bad.length > 6 ? `  (+${bad.length - 6})` : ''));
    }
  }
}
console.log(`\n${scenes} frames, ${exact} exact: `
  + `${totalGot} draws computed, ${totalWant} recorded, `
  + `${totalHit} matched on primitive, texture, size and EVERY vertex, `
  + `within ${TOL} — worst matched ${worstMatched.toExponential(2)}`);
{
  const c = new Map();
  for (const [k, v] of sizeGot) { const e = c.get(k) ?? [0, 0]; e[0] = v; c.set(k, e); }
  for (const [k, v] of sizeWant) { const e = c.get(k) ?? [0, 0]; e[1] = v; c.set(k, e); }
  console.log('  vertices per primitive, computed vs recorded: '
    + [...c].sort((a, b) => a[0] - b[0]).map(([k, [a, b]]) => `${k}: ${a}v${b}`).join('  '));
}

let failed = 0;
const ok = (name, pass, detail = '') => {
  console.log(`${pass ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
  if (!pass) failed++;
};
console.log('');
const surprise = inexact.filter((k) => !KNOWN_INEXACT.has(k));
const fixed = [...KNOWN_INEXACT].filter((k) => !inexact.includes(k));
ok('no frame disagrees that is not already accounted for', surprise.length === 0,
  surprise.length ? surprise.slice(0, 12).join(' ')
    + (surprise.length > 12 ? ` (+${surprise.length - 12})` : '')
    : `${exact}/${scenes} exact`);
// The other direction, so a fix has to be WRITTEN DOWN rather than absorbed.
ok('every frame on the accounted-for list still disagrees', fixed.length === 0,
  fixed.length ? `${fixed.join(' ')} now matches — take it off the list`
    : `${KNOWN_INEXACT.size} known`);
ok('every matched primitive is inside the export\'s own rounding',
  worstMatched <= TOL, `worst ${worstMatched.toExponential(2)} of ${TOL}`);
ok('the whole set of frames is joined and compared', scenes >= 140,
  `${scenes} frames across ${A.scenes.length} scenes`);
if (failed) process.exit(1);
console.log('\nthe renderer reproduces the recording from raw bytecode: scene '
  + 'stream, keyframes, three animation passes, geometry, mesh copy, camera '
  + 'references, node walk, cull, shading, sprites, glyphs, clip and project');
