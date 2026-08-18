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
// so a scene's type 0, 3 and 4 nodes contribute nothing here. That is most of
// the remaining shortfall — and p1/16 producing zero from four mesh nodes is a
// real fault worth chasing on its own.
//
// Also spent and recorded so it is not repeated: not one extra primitive is
// off-screen, so the unported trivial-reject at 0x100062f8 was never the cause.

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
  // JOIN ON THE STREAM POINTER, NOT ON (part, order). The two exports number
  // their scenes differently — anim_all.json counts the OVERLAY as a scene and
  // draws.json does not — so the two disagree for 23 of 28 streams and joining
  // on the ordinal pairs almost every scene with its neighbour.
  const dd = D.scenes.find((s) => s.stream === scene.stream);
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
