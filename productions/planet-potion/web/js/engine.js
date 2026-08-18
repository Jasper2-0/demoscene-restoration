// engine.js — the intro's own engine, running in the browser.
//
// Everything the page used to read out of `data/draws.json` is computed here
// instead: the scene graph out of its bytecode, the meshes out of theirs, the
// three animation passes, and the node walk that clips and projects. The
// recorded stream stays as an oracle and stops being the source.
//
// WHAT MAKES THIS DIFFERENT FROM work/re/pipeline.mjs, which does the same
// arithmetic against the recording, is that this one is STATEFUL. `anim.origin`
// is not an input: it is the beat sync. In loop mode 0 the frame's music signal
// is compared against each node's trigger byte and a match resets that node's
// origin to the current tick (`0x10005034`), which is the whole mechanism by
// which the visuals lock to the track. A harness that jumps to tick 92 has to
// be TOLD what the origins were; a page that plays from the beginning arrives
// at them, because it ran every tick in between with the replayer's signal in
// hand.
//
// So the engine holds one mutable animation object per node per scene and steps
// it. Nothing else here is stateful — the geometry is built once and the three
// passes are pure functions of the channel blocks.
//
// THE SEGMENTS IT NEEDS are seg0 for the tables that name everything, seg3 for
// part one's programs and scenes, and seg4 for part three's. Shipping only the
// synth's seg0 and seg4 leaves eighteen of the twenty-nine scenes undecodable.
//
// NOT WIRED INTO THE PAGE YET, and two things are why:
//
//   * OP 3's SUB-OBJECTS ARE GENERATED, not decoded. `0x10002b08` reads ten
//     operand bytes and synthesises five, seventeen or eight of them through
//     `0x100023a8`, and that generator is not ported. op 3 is the commonest
//     node type — 194 of the 395 — so without it the type 0-3 draws are mostly
//     missing.
//   * geom.js does not build the geometry node's SPRITE chain, so `programOf`
//     has to hand this geo.json until it does.
//
// Landed now rather than after, because both gaps are named and the structure
// around them is what work/re/pipeline.mjs already proves against 45,327
// recorded primitives. The alternative is a second implementation of eleven
// stages living only inside a check.

import { decodeScene, buildMesh } from './scene.js';
import { decodeProgram } from './geom.js';
import { evaluateNode, composeHierarchy, composeNode, publishNode, concat }
  from './anim.js';
import { showScene } from './render.js';

const SEG0 = 0x10000000;
// r2 is the small-data base, biased by -2 (`LEA $7FFE,A4`).
const R2 = 0x7ffe;
const NIL = 0xffffffff;

// The tables the 68K bootstrap leaves in seg0's small-data area: one pointer
// per scene and one per geometry program, per part. Same displacements
// arenadump, animdump and geodump walk, in the same order.
const SCENES = {
  p1: [0x25d2, 0x25aa, 0x25ba, 0x25ce, 0x25ae, 0x25b2, 0x25b6, 0x25ca,
    0x25be, 0x25c2, 0x25c6, 0x25da, 0x25d6, 0x25de, 0x25e2, 0x25ea,
    0x25e6, 0x25ee],
  p3: Array.from({ length: 11 }, (_, i) => 0x277a + i * 4),
};
const PROGRAMS = { p1: [0x2706, 28], p3: [0x27fe, 11] };

const u32 = (d, o) => (d[o] << 24 | d[o + 1] << 16 | d[o + 2] << 8 | d[o + 3]) >>> 0;

/**
 * One scene, decoded and ready to step.
 *
 * The animation objects are built ONCE and mutated per tick. Rebuilding them
 * each frame would silently disable every loop mode and the beat sync with
 * them, and the picture would still look plausible.
 */
function prepareScene(nodes, meshOf) {
  const anims = nodes.map((n) => ({
    flags2: n.anim.flags2, flags3: n.anim.flags3, mode: n.anim.mode,
    parent: n.anim.parent ? 1 : NIL, trigger: n.anim.trigger ?? 0,
    loopMode: n.anim.loopMode, origin: 0, track: 0,
  }));
  // 1-BASED synthetic keyframe addresses: the original chains them by address
  // and zero means "no link", so index 0 cannot be a valid one.
  const keysOf = (rec) => rec.keys.map((k, j) => ({
    tick: k.time, t0: k.t0, flags: k.hold, blocks: k.coeff, invSpan: k.invSpan,
    addr: j + 1,
    next: j + 1 < rec.keys.length ? j + 2 : 0,
    prev: j > 0 ? j : 0,
  }));
  const keys = nodes.map((n) => keysOf(n.anim));
  const subAnims = nodes.map((n) => n.subs.map((s) => ({
    flags2: s.flags2, flags3: s.flags3, mode: 0, parent: NIL,
    trigger: s.trigger ?? 0, loopMode: s.loopMode, origin: 0, track: 0,
  })));
  const subKeys = nodes.map((n) => n.subs.map(keysOf));

  // A node the scene builder marked built-already is exactly one a CAMERA
  // references: `0x100022f8` walks the camera's list and stamps +0x0f on each.
  // Derived rather than dumped, and it agrees with the arena on all 395.
  const built = new Set();
  for (const n of nodes) {
    if (n.op === 6) for (const b of n.cameras ?? []) built.add(b + 1);
  }
  const parentOf = nodes.map((n) => (n.anim.parent
    ? nodes.findIndex((x) => x.anim === n.anim.parent
      || x.subs.includes(n.anim.parent))
    : NIL));
  return { nodes, anims, keys, subAnims, subKeys, built, parentOf,
    meshes: nodes.map((n) => (n.op === 5 ? meshOf(n.resource) : null)) };
}

/** One tick of one scene: the three passes and the node walk. */
function stepScene(S, table, tick, musicSignal, activeCamera) {
  const { nodes, anims, keys, subAnims, subKeys, built, parentOf } = S;

  const composed = nodes.map((n, i) => {
    const ch = keys[i].length
      ? evaluateNode(anims[i], keys[i], tick, musicSignal, table) : null;
    return {
      addr: i, parent: parentOf[i],
      flags3: (n.anim.flags3 & 0xf0) | (n.anim.parent ? 1 : 0),
      resolved: ch ? 1 : 0, ch,
    };
  });
  composeHierarchy(composed);

  // The sub-objects, under the fixed 0xd0 gate set — multiply, add-pair,
  // translate — except op 4's, which carries the glyph scale and is not
  // composed at all.
  const subs = nodes.map((n, i) => subAnims[i].map((a, j) => {
    if (!subKeys[i][j].length) return null;
    const ch = evaluateNode(a, subKeys[i][j], tick, musicSignal, table);
    if (n.op !== 4 && composed[i].ch) composeNode(ch, composed[i].ch, 0xd0);
    return ch;
  }));

  const meshObjects = [];
  const out = nodes.map((n, i) => {
    const mesh = S.meshes[i];
    const o = {
      type: n.op, built: built.has(i) ? 1 : 0, vertices: [], objects: [],
      cameras: [], clip: n.clip ? 1 : 0, texture: null,
    };
    if (!mesh && subs[i].length && n.op < 4) {
      // A type 0 to 3 node's vertices ARE its sub-objects' channel blocks:
      // 12..14 position, 15 alpha, 16..18 colour, 19..20 texture. op 2 stores
      // its last two the other way round, which is a quad's fan winding.
      const order = n.op === 2 ? [0, 1, 3, 2] : subs[i].map((_, k) => k);
      o.plainVertices = order.map((k) => {
        const c = subs[i][k] ?? new Float64Array(24);
        return { p: [c[12], c[13], c[14]], a: c[15],
          rgb: [c[16], c[17], c[18]], uv: [c[19], c[20]] };
      });
    }
    if (n.op === 4 && n.text && n.layout) {
      o.glyphs = n.layout.glyphs; o.at2c = n.layout.at2c; o.at30 = n.layout.at30;
      o.subChannels = subs[i][0];
    }
    if (mesh) {
      o.vertices = mesh.vertices.map((v) => ({
        x: v.p[0], y: v.p[1], z: v.p[2],
        c0: v.rgba[0], c1: v.rgba[1], c2: v.rgba[2], c3: v.rgba[3],
        nx: v.n[0], ny: v.n[1], nz: v.n[2],
      }));
    }
    publishNode(o, composed[i].ch ?? new Float64Array(24), composed[i].resolved);
    const faces = mesh ? mesh.faces.map((f) => ({
      faces: [{ ...f,
        vertices: f.vertices.map((k) => {
          const v = o.vertices[k];
          return { p: [v.ox, v.oy, v.oz], scaled: [v.o0, v.o1, v.o2, v.o3],
            uv: [0, 0], gouraud: v.onz };
        }) }],
    })) : [];
    meshObjects[i] = faces;
    return {
      type: n.op, drawGate: o.drawGate, at0d: n.at0d ?? 2,
      cx: o.cx, cy: o.cy, scale: o.scale, clip: n.clip,
      built: o.built, ordinal: n.ordinal ?? 0, at68: n.at68 ?? 0,
      texture: n.op < 5 ? (n.resource ?? null) : null,
      plain: o.plainVertices ?? null, glyphs: o.glyphs ?? null,
      objects: faces, vertices: [],
      sprites: mesh ? mesh.sprites.map((q) => {
        const v = o.vertices[q.vertex];
        return { ...q, v: { p: [v.ox, v.oy, v.oz],
          scaled: [v.o0, v.o1, v.o2, v.o3], nz: v.onz } };
      }) : [],
    };
  });

  // The camera's reference list: one stream byte per link, resolved ONE-BASED
  // down the node list, each carrying the camera's channel block concatenated
  // with the referenced node's.
  nodes.forEach((n, i) => {
    if (n.op !== 6 || !n.cameras?.length || composed[i].resolved !== 1) return;
    out[i].refs = [];
    for (const b of n.cameras) {
      const t = b + 1;
      if (!S.meshes[t] || !composed[i].ch) continue;
      const ch = Float64Array.from(composed[i].ch);
      concat(ch, composed[t].ch ?? new Float64Array(24));
      const fresh = { type: 5, built: 0,
        vertices: S.meshes[t].vertices.map((v) => ({
          x: v.p[0], y: v.p[1], z: v.p[2],
          c0: v.rgba[0], c1: v.rgba[1], c2: v.rgba[2], c3: v.rgba[3],
          nx: v.n[0], ny: v.n[1], nz: v.n[2],
        })) };
      publishNode(fresh, ch, 1);
      out[i].refs.push({
        ...out[i], type: 5, built: 0, refs: null, sprites: [],
        objects: S.meshes[t].faces.map((f) => ({
          faces: [{ ...f, vertices: f.vertices.map((k) => {
            const v = fresh.vertices[k];
            return { p: [v.ox, v.oy, v.oz], scaled: [v.o0, v.o1, v.o2, v.o3],
              uv: [0, 0], gouraud: v.onz };
          }) }],
        })),
      });
    }
  });

  return showScene(out, activeCamera);
}

/**
 * Build the engine over the three segments.
 *
 * Scenes and meshes are built LAZILY and cached: the whole show is 29 scenes
 * and 39 geometry programs, and building all of them up front would put several
 * seconds between the click and the first frame for no benefit.
 */
export function createEngine({ seg0, seg3, seg4, table, layoutText,
  programOf }) {
  const segs = [{ base: 0x10030000, d: seg3 }, { base: 0x10040000, d: seg4 }];
  const at = (addr) => {
    const s = segs.find((x) => addr >= x.base && addr < x.base + x.d.length);
    return s ? { d: s.d, o: addr - s.base } : null;
  };
  const ptr = (disp) => u32(seg0, R2 + disp);

  // WHERE THE GEOMETRY COMES FROM. `programOf(part, index)` hands back a
  // program in the shape buildMesh wants — built vertices, indexed triangles,
  // materials, and the SPRITE chain. geom.js reproduces the first three exactly
  // and does not yet build the fourth, so until it does the caller supplies
  // geo.json and this stays honest about which stage is computed.
  const meshCache = new Map();
  const meshOf = (part) => (resource) => {
    const key = `${part}:${resource}`;
    if (meshCache.has(key)) return meshCache.get(key);
    const [disp, n] = PROGRAMS[part];
    let mesh = null;
    if (resource < n) {
      const p = programOf ? programOf(part, resource) : null;
      if (p) mesh = buildMesh(p);
      else {
        const a = ptr(disp + resource * 4);
        const w = a === NIL ? null : at(a);
        if (w) mesh = buildMesh(decodeProgram(w.d, w.o, null));
      }
    }
    meshCache.set(key, mesh);
    return mesh;
  };

  const sceneCache = new Map();
  const sceneOf = (part, order) => {
    const key = `${part}/${order}`;
    if (sceneCache.has(key)) return sceneCache.get(key);
    const w = at(ptr(SCENES[part][order]));
    const nodes = w ? decodeScene(w.d, w.o).nodes : [];
    // Text is laid out once: the string and the glyph table are both static.
    if (layoutText) {
      for (const n of nodes) if (n.op === 4 && n.text) n.layout = layoutText(n.text);
    }
    const S = prepareScene(nodes, meshOf(part));
    sceneCache.set(key, S);
    return S;
  };

  return {
    counts: { p1: SCENES.p1.length, p3: SCENES.p3.length },
    scene: sceneOf,
    /** One tick. `musicSignal` is the replayer's effect-7 value, or -1. */
    frame(part, order, tick, musicSignal = -1, activeCamera = 0) {
      return stepScene(sceneOf(part, order), table, tick, musicSignal,
        activeCamera);
    },
    /** Reset every scene's animation state — a rewind. */
    rewind() { sceneCache.clear(); },
  };
}
