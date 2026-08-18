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
const R = '/Users/scjas/Developer/01 - Jasper2-0/02 - Github Public/demoscene-restoration/productions/planet-potion';
const { decodeScene, buildMesh } = await import(`${R}/web/js/scene.js`);
const { evaluateNode, composeHierarchy, publishNode, concat } =
  await import(`${R}/web/js/anim.js`);
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

function runScene(scene, frame, activeCamera = 0) {
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
      flags2: n.anim.flags2, flags3: n.anim.flags3, mode: n.anim.mode,
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
  const meshObjects = [];      // per node, the object list a camera may borrow
  entries.forEach(({ n, w, mesh }, i) => {
    const e = composed[i];
    const out = {
      type: n.op, built: 0, vertices: [], objects: [], cameras: [],
      clip: n.clip ? 1 : 0, texture: null,
    };
    // TYPES 0 TO 3 HAVE NO GEOMETRY OF THEIR OWN: their vertices ARE the
    // sub-objects' channel blocks, offset by 0x30 — channels 12..14 the
    // position, 15 the alpha, 16..18 the colour, 19 and 20 the texture
    // coordinates. So they need no generator here, only the channels, and the
    // chain length equals node+0x20 exactly for every type.
    //
    // OP 2 STORES ITS LAST TWO THE OTHER WAY ROUND — sub-objects 1, 2, 4, 3 in
    // address order, which is a quad's fan winding.
    const subs = w?.anim?.subs ?? [];
    if (!mesh && subs.length) {
      const order = n.op === 2 ? [0, 1, 3, 2] : subs.map((_, k) => k);
      out.plainVertices = order.map((k) => {
        const c = subs[k].channels;
        return { p: [c[12], c[13], c[14]], a: c[15],
          rgb: [c[16], c[17], c[18]], uv: [c[19], c[20]] };
      });
    }
    if (mesh) {
      out.vertices = mesh.vertices.map((v) => ({
        x: v.p[0], y: v.p[1], z: v.p[2],
        c0: v.rgba[0], c1: v.rgba[1], c2: v.rgba[2], c3: v.rgba[3],
        nx: v.n[0], ny: v.n[1], nz: v.n[2],
      }));
    }
    out.built = w?.built ?? 0;
    publishNode(out, e.ch ?? new Float64Array(24), e.resolved);
    nodes.push({
      type: n.op, drawGate: out.drawGate, at0d: n.at0d ?? 2,
      cx: out.cx, cy: out.cy, scale: out.scale, clip: n.clip,
      built: out.built, ordinal: n.ordinal ?? 0,
      at68: w?.at68 ?? 0, texture: w?.texture ?? null,
      plain: out.plainVertices ?? null,
      objects: meshObjects[i] = mesh ? mesh.faces.map((f) => ({
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
  // THE CAMERA'S REFERENCE LIST, `0x1000644c`. The stream gives one byte per
  // link and the fixup at `0x100022f8` walks it down the `+0x10` chain from the
  // head — the same ONE-BASED index `resolveParents` uses, since the walk starts
  // at head->next. Each link carries a copy of the camera's own channel block
  // concatenated with the referenced node's, which is `concat` and nothing new.
  entries.forEach(({ n }, i) => {
    if (n.op !== 6 || !n.cameras?.length) return;
    const cam = nodes[i];
    cam.refs = [];
    for (const b of n.cameras) {
      const t = b + 1;
      if (!meshObjects[t] || composed[i].resolved !== 1) continue;
      const ch = Float64Array.from(composed[i].ch ?? []);
      if (!ch.length) continue;
      concat(ch, composed[t].ch ?? new Float64Array(24));
      // The link borrows the target's geometry and keeps the camera's own
      // cx/cy/scale, texture and clip — `stw r12, 0x20(r30)` copies the lists
      // INTO the camera node and draws through it.
      const fresh = { type: 5, built: 0, vertices: entries[t].mesh.vertices.map((v) => ({
        x: v.p[0], y: v.p[1], z: v.p[2],
        c0: v.rgba[0], c1: v.rgba[1], c2: v.rgba[2], c3: v.rgba[3],
        nx: v.n[0], ny: v.n[1], nz: v.n[2],
      })) };
      publishNode(fresh, ch, 1);
      cam.refs.push({
        ...cam, type: 5, built: 0, refs: null,
        objects: entries[t].mesh.faces.map((f) => ({
          faces: [{ ...f, vertices: f.vertices.map((k) => {
            const v = fresh.vertices[k];
            return { p: [v.ox, v.oy, v.oz], scaled: [v.o0, v.o1, v.o2, v.o3],
              uv: [0, 0], gouraud: 1 };
          }) }],
        })),
      });
    }
  });

  let faces = 0, meshNodes = 0;
  for (const n of nodes) {
    if (n.type === 5) { meshNodes++; faces += n.objects.length; }
  }
  const draws = showScene(nodes, activeCamera);
  // NOT ONE of them lands entirely off the 640x480 screen, which rules out the
  // trivial-reject test at 0x100062f8 as the explanation for the overdraw.
  return { draws, faces, meshNodes };
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
const key = (prim, tex, n, x, y) =>
  `${prim}|${tex}|${n}|${x.toFixed(2)}|${y.toFixed(2)}`;
const matchFrame = (got, want) => {
  const bag = new Map();
  for (const d of want) {
    const k = key(d.prim, d.texture, d.v.length / 10, d.v[0], d.v[1]);
    bag.set(k, (bag.get(k) ?? 0) + 1);
  }
  let hit = 0;
  for (const d of got) {
    const k = key(d.prim, d.texture, d.v.length, d.v[0].x, d.v[0].y);
    const c = bag.get(k);
    if (c) { hit++; bag.set(k, c - 1); }
  }
  return hit;
};

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
    let over = 0;
    if (dd.overlay && overlayScene && scene.stream !== OVERLAY) {
      const of_ = overlayScene.frames.find((f) => f.t === frame.t);
      if (of_) {
        over = runScene(overlayScene, of_).draws.length;
      }
    }
    let hit = matchFrame(r.draws, df.draws), cam = 0;
    for (let k = 1; k < 4; k++) {
      let alt; try { alt = runScene(scene, frame, k); } catch { continue; }
      const h = matchFrame(alt.draws, df.draws);
      if (h > hit) { hit = h; cam = k; r = alt; }
    }
    scenes++;
    const total = r.draws.length + over;
    if (total === df.draws.length) exact++;
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
      const m = tally(r.draws, 0);
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
  + `${totalHit} matched by primitive, texture, size and screen position`);
