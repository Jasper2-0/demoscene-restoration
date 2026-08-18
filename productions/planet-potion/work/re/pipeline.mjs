// pipeline.mjs — the whole thing, end to end, for the first time.
//
//   node work/re/pipeline.mjs
//
// scene bytes -> keyframes -> coefficients -> parents -> geometry programs ->
// mesh copy -> animation passes -> node walk -> clip -> emit. Every stage has
// its own check elsewhere; this runs them as one and compares the primitive
// count against draws.json.
//
// IT IS NOT A CHECK YET AND DOES NOT PRETEND TO BE. It reports the counts and
// exits zero. What it has established:
//
//   * the projection agrees exactly. p1/1's meshes come out with
//     cx/cy/scale = 200, 160, 226.7711944580078, which is the recorded draw's
//     triple to the last digit;
//   * the animation drives from DECODED tracks — no arena in the loop except
//     `origin`, which is the scene clock and genuinely external;
//   * and the primitive count is about four times too high: 1,317 against 337
//     for p1/1 at t=92.
//
// NOT ONE of the extra primitives is off-screen, so the unported trivial-reject
// at `0x100062f8` does not explain it. That measurement is spent; do not repeat
// it.
//
// THE COUNTS ARE WRONG IN BOTH DIRECTIONS and the two causes are now separated.
//
// UNDER-COUNTING IS EXPECTED AND UNINTERESTING: this only renders MESHES. p1/10
// computes 185 against 586 recorded because its type 0, 3 and 4 nodes are not
// fed any vertices here — the scene VM handlers that allocate them
// (`0x10002a54` and friends) are not ported.
//
// OVER-COUNTING IS THE REAL ONE, AND THE FRAME ALIGNMENT IS SUSPECT BEFORE THE
// RENDERER IS. p1/1 at t=92 computes 1,317 mesh primitives against 337
// recorded — but the recorded draws carry cx/cy/scale of 320/240/320 and
// 640/180/120, and the three mesh nodes anim_all.json reports for that same
// scene and tick all carry 200/160/226.7711944580078. That projection appears
// in NONE of the recorded draws.
//
// So before blaming the cull or the alpha gate, settle whether draws.json's
// `t` and anim_all.json's `t` name the same instant, and whether draws.json's
// per-scene frames include the OVERLAY's primitives — 640/180/120 matches no
// node in that frame's list at all. Comparing two exports that disagree about
// when they were taken would make any renderer look wrong.
import fs from 'node:fs';
const R = '/Users/scjas/Developer/01 - Jasper2-0/02 - Github Public/demoscene-restoration/productions/planet-potion';
const { decodeScene, buildMesh } = await import(`${R}/web/js/scene.js`);
const { evaluateNode, composeHierarchy, publishNode } = await import(`${R}/web/js/anim.js`);
const { showScene } = await import(`${R}/web/js/render.js`);
const { sinus } = await import(`${R}/web/js/tables.js`);

const A = JSON.parse(fs.readFileSync(`${R}/web/data/anim_all.json`, 'utf8'));
const G = JSON.parse(fs.readFileSync(`${R}/web/data/geo.json`, 'utf8'));
const D = JSON.parse(fs.readFileSync(`${R}/web/data/draws.json`, 'utf8'));
const segs = [
  { base: 0x10030000, d: new Uint8Array(fs.readFileSync(`${R}/work/re/flat/seg3_DATA_10030000.bin`)) },
  { base: 0x10040000, d: new Uint8Array(fs.readFileSync(`${R}/work/re/flat/seg4_DATA_10040000.bin`)) },
];
const prog = { p1: [], p3: [] };
for (const p of G.programs) prog[p.part][p.index] = p;
const table = sinus();
const NIL = 0xffffffff;

function runScene(scene, frame) {
  const addr = parseInt(scene.stream, 16);
  const seg = segs.find((s) => addr >= s.base && addr < s.base + s.d.length);
  const decoded = decodeScene(seg.d, addr - seg.base).nodes;
  const dumped = frame.nodes;

  // Build each node's runtime state.
  const entries = decoded.map((n, i) => {
    const w = dumped[i];
    const mesh = n.op === 5 && prog[scene.part][n.resource]
      ? buildMesh(prog[scene.part][n.resource]) : null;
    return { n, i, w, mesh };
  });

  // Pass 1 and 2, from the DECODED tracks.
  const anims = entries.map(({ n, w }) => {
    // The chain is by ADDRESS in the original, so give each keyframe a
    // synthetic one: 1-based, because 0 means "no link".
    const keys = n.anim.keys.map((k, j) => ({
      tick: k.time, t0: k.t0, flags: k.hold, blocks: k.coeff,
      invSpan: k.invSpan,
      addr: j + 1,
      next: j + 1 < n.anim.keys.length ? j + 2 : 0,
      prev: j > 0 ? j : 0,
    }));
    const anim = {
      flags2: n.anim.flags2, flags3: n.anim.flags3, mode: 0,
      parent: n.anim.parent ? 1 : NIL,
      origin: w?.anim ? w.anim.origin : 0,
      trigger: n.anim.trigger ?? 0,
      loopMode: n.anim.loopMode,
    };
    return { anim, keys };
  });

  const composed = entries.map(({ n }, i) => {
    const { anim, keys } = anims[i];
    const ch = keys.length ? evaluateNode({ ...anim }, keys, frame.t, -1, table) : null;
    return {
      addr: i, parent: n.anim.parent ? decoded.indexOf(
        decoded.find((x) => x.anim === n.anim.parent || x.subs.includes(n.anim.parent))) : NIL,
      flags3: (n.anim.flags3 & 0xf0) | (n.anim.parent ? 1 : 0),
      resolved: ch ? 1 : 0, ch,
    };
  });
  composeHierarchy(composed);

  // Pass 3 and the render walk.
  const nodes = [];
  entries.forEach(({ n, w, mesh }, i) => {
    const e = composed[i];
    const out = {
      type: n.op, built: 0, vertices: [], objects: [], cameras: [],
      clip: n.clip ? 1 : 0, texture: null,
    };
    if (mesh) {
      out.vertices = mesh.vertices.map((v) => ({
        x: v.p[0], y: v.p[1], z: v.p[2],
        c0: v.rgba[0], c1: v.rgba[1], c2: v.rgba[2], c3: v.rgba[3],
        nx: v.n[0], ny: v.n[1], nz: v.n[2],
      }));
    }
    publishNode(out, e.ch ?? new Float64Array(24), e.resolved);
    nodes.push({
      type: n.op, drawGate: out.drawGate, at0d: n.at0d ?? 2,
      cx: out.cx, cy: out.cy, scale: out.scale, clip: n.clip,
      built: 0, at68: 0, texture: null,
      objects: mesh ? mesh.faces.map((f) => ({
        faces: [{
          ...f,
          vertices: f.vertices.map((k) => {
            const v = out.vertices[k];
            return { p: [v.ox, v.oy, v.oz], scaled: [v.o0, v.o1, v.o2, v.o3],
              uv: [0, 0], gouraud: 1 };
          }),
        }],
      })) : [],
      vertices: [], glyphs: null,
    });
  });
  let faces = 0, meshNodes = 0;
  for (const n of nodes) {
    if (n.type === 5) { meshNodes++; faces += n.objects.length; }
  }
  const draws = showScene(nodes);
  // NOT ONE of them lands entirely off the 640x480 screen, which rules out the
  // trivial-reject test at 0x100062f8 as the explanation for the overdraw.
  return { draws, faces, meshNodes };
}

let totalGot = 0, totalWant = 0, scenes = 0;
for (const scene of A.scenes) {
  const dd = D.scenes.find((s) => s.part === scene.part && s.order === scene.order);
  if (!dd) continue;
  for (const frame of scene.frames) {
    const df = dd.frames.find((f) => f.t === frame.t);
    if (!df) continue;
    let r;
    try { r = runScene(scene, frame); } catch (e) {
      console.log(`  ${scene.part}/${scene.order} t=${frame.t} THREW ${e.message}`);
      continue;
    }
    scenes++;
    totalGot += r.draws.length; totalWant += df.draws.length;
    console.log(`  ${scene.part}/${scene.order} t=${String(frame.t).padStart(3)}  `
      + `${String(r.meshNodes)} mesh nodes, ${String(r.faces).padStart(5)} faces -> `
      + `${String(r.draws.length).padStart(5)} draws, recorded `
      + `${String(df.draws.length).padStart(5)}`);
  }
}
console.log(`\n${scenes} frames: ${totalGot} draws computed, ${totalWant} recorded`);
