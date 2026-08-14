// main.js — Lapsus static-frame renderer (geometry + camera + transforms).
//
//   /web/index.html?scene=hulluolli&t=4.8
//
// SCOPE: this is deliberately step one of the port — it reproduces the
// transform and projection conventions recovered in re/RENDER.md and nothing
// else. No textures, no materials, no lighting model, no fog, no faders: a
// single directional lambert term so the silhouette and form are legible.
// The thing being verified here is *framing* — if the camera formula or the
// matrix order were wrong, no amount of shading would fix the picture, and
// every later step would be built on a lie.
//
// Conventions implemented (re/RENDER.md §8, each cited to its VA there):
//   local      = T(px,py,pz) · Ry(h) · Rx(p) · Rz(b)
//   world      = local · parentWorld, uniform scale s = (sx+sy+sz)/3
//   modelview  = Scale(1,1,-1) · inverse(cameraWorld) · objectWorld
//   fovX       = 2·atan(1/zoom);  fovY = 0.75·fovX AS AN ANGLE
//   frustum(±tan(fovX/2)·near, ±tan(0.375·fovX)·near, near, far), near=1 far=100
//   frontFace(CW), cullFace(BACK)
// Report MODULE-LEVEL failures too, not just ones inside the async body. The
// shader sources are built at module scope, so a syntax error there — or a
// stray backtick closing a template literal early — used to throw before the
// try/catch at the bottom existed, leaving __lapsusReady unset and every
// harness waiting out its full 30s timeout with no message. A 21-part scoring
// run then reports 21 identical "Waiting failed" lines and says nothing about
// the one-character cause.
addEventListener('error', (e) => {
  window.__lapsusError = String(e.message ?? e);
  window.__lapsusReady = true;
});

import { parseLWS, evalEnvelope, MORPH_EPSILON } from '../../work/js/lws.mjs';
import { parseLWO } from '../../work/js/lwo.mjs';
import { decodeTGA } from '../../work/js/tga.mjs';
import { parseHair, buildStrands, simulateSpan, shadeNormals, toLineVerts, msvcRand } from '../../work/js/hair.mjs';
import { parseParticles, createSystem, stepSystem, frameOf, billboard } from '../../work/js/particles.mjs';
import { MiniGL } from './shared/minigl.js';   // vendored: tools/sync-shared-runtime.mjs

const ROOT = new URL('../../', import.meta.url).href;
const DATA = ROOT + 'work/unpacked/lapsus_dat/data/';

const qs = new URLSearchParams(location.search);
const SCENE = qs.get('scene') ?? 'hulluolli';
const T = parseFloat(qs.get('t') ?? '4');
const WMUL = parseFloat(qs.get('wmul') ?? '1');   // debug: scale cylindrical wrap
const NOPASS1 = qs.get('nopass1') === '1';       // debug: skip the mask-7 additive pass
// ?objects=0 draws the backdrop only. Used by verify/timing.mjs to obtain an
// exact object mask by differencing, so timing can be judged on the moving
// content instead of on a static background that dominates the frame.
const DRAW_OBJECTS = qs.get('objects') !== '0';
// near=0.01 only for Diskojea and Kaivoalieni (RENDER.md §8)
const NEAR = /^(diskojea|kaivoalieni)$/i.test(SCENE) ? 0.01 : 1.0;
const FAR = 100.0;

// ---------------------------------------------------------------- math (4x4, column-major)
const M = {
  ident: () => new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]),
  mul(a, b) {                       // returns a·b
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = s;
    }
    return o;
  },
  translate: (x, y, z) => new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1]),
  scale: (x, y, z) => new Float32Array([x,0,0,0, 0,y,0,0, 0,0,z,0, 0,0,0,1]),
  rotX(a) { const c = Math.cos(a), s = Math.sin(a);
    return new Float32Array([1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]); },
  rotY(a) { const c = Math.cos(a), s = Math.sin(a);
    return new Float32Array([c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]); },
  rotZ(a) { const c = Math.cos(a), s = Math.sin(a);
    return new Float32Array([c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1]); },
  // rigid inverse (rotation transpose + inverted translation); the engine's
  // own inverse ignores scale too, and no camera in Lapsus is scaled.
  invRigid(m) {
    const o = M.ident();
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o[c * 4 + r] = m[r * 4 + c];
    const t = [m[12], m[13], m[14]];
    for (let r = 0; r < 3; r++) o[12 + r] = -(o[r] * t[0] + o[4 + r] * t[1] + o[8 + r] * t[2]);
    return o;
  },
  frustum(l, r, b, t, n, f) {
    const o = new Float32Array(16);
    o[0] = 2*n/(r-l); o[5] = 2*n/(t-b);
    o[8] = (r+l)/(r-l); o[9] = (t+b)/(t-b); o[10] = -(f+n)/(f-n); o[11] = -1;
    o[14] = -2*f*n/(f-n);
    return o;
  },
};

// Item -> local matrix at time t, per RENDER.md §8.
function localMatrix(item, t, positionOffset = null) {
  const mo = item.motion;
  // CAMERAS CARRY 6 CHANNELS, objects and lights carry 9 — the last three are
  // scale, which a camera has no use for. Requiring 9 here silently returned
  // identity for every camera, i.e. put the viewer at the world origin inside
  // the geometry, which looks like a broken projection rather than a missing
  // transform. (27 six-channel motions across the 23 scenes = exactly the
  // camera count.)
  if (!mo || mo.length < 6) return { m: M.ident(), s: 1 };
  const v = (c) => evalEnvelope(mo[c], t);
  let [px, py, pz, h, p, b] = [0,1,2,3,4,5].map(v);
  if (positionOffset) {
    px += positionOffset[0] ?? 0;
    py += positionOffset[1] ?? 0;
    pz += positionOffset[2] ?? 0;
  }
  const s = mo.length >= 9 ? (v(6) + v(7) + v(8)) / 3 : 1;   // per-axis scale collapsed
  let m = M.mul(M.translate(px, py, pz), M.rotY(h));
  m = M.mul(m, M.rotX(p));
  m = M.mul(m, M.rotZ(b));
  return { m, s };
}

function worldMatrix(item, t, depth = 0, positionOffset = null) {
  // positionOffset is applied to this item's LOCAL position only. Paleksi's
  // part code writes its camera-X kick into the camera item, invalidates the
  // matrix, and only then Scene::render evaluates the camera's parent chain
  // (forced_0x4072b0 @0x407384..0x4073ea). Applying the kick after this
  // function would incorrectly treat it as a world-X displacement.
  const { m, s } = localMatrix(item, t, positionOffset);
  if (!item.parentItem || depth > 32) return applyScale(m, s);
  const parent = worldMatrix(item.parentItem, t, depth + 1);
  return applyScale(M.mul(parent, m), s);
}
// scale the 3x3 after concatenation (RENDER.md §8)
function applyScale(m, s) {
  if (s === 1) return m;
  const o = new Float32Array(m);
  for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) o[c * 4 + r] *= s;
  return o;
}

// ---------------------------------------------------------------- GL
const canvas = document.getElementById('c');
// alpha:false — THE FRAMEBUFFER HAS NO ALPHA CHANNEL, as the original's window
// had none. Left at the WebGL default of true, every surface drawn with
// alpha < 1 writes that alpha into the canvas, and what you get out then
// depends on how you read it back: canvas.toDataURL() returns the raw store
// including alpha, while a page screenshot returns the composite. The two
// harnesses disagreed by a lot on exactly the parts that draw transparent
// surfaces — pene read as mean luma 55.6 through one and 39.7 through the
// other, and its "renders at the wrong brightness" issue was largely that.
const gl = canvas.getContext('webgl2',
  { alpha: false, antialias: true, preserveDrawingBuffer: true });
if (!gl) throw new Error('WebGL2 required');

// THE FIXED-FUNCTION PIPELINE IS THE SHIM'S JOB, not this file's. Everything
// the meshes need from OpenGL 1.x — per-vertex lighting, materials, the
// specular term, sphere-map texgen, the two texture units and their env
// modes, fog — lives in shared/sunflower/js/minigl.js, where ptct, wonder and
// energia already are. This file re-derived all of it once, got several parts
// wrong, and could share none of the answers.
//
// minigl ADOPTS the context above rather than making its own, because the
// capture harness needs preserveDrawingBuffer and because the passes below
// that are genuinely this demo's own — hair, particles, pictures, fades, the
// feedback accumulator — keep drawing with their own programs on the same
// context.
const mgl = new MiniGL(gl);

// The passes that are genuinely this demo's own still compile their own
// shaders: hair, particles, 2D pictures, fades and the feedback accumulator.
const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };

/**
 * The 2D passes — backdrop, Pictures, faders — as fixed-function quads.
 *
 * The engine draws all three the same way: an ortho projection, one textured
 * quad, a blend mode, depth and culling off. That is exactly what minigl's
 * immediate mode is, so they go through the shim rather than through three
 * hand-written programs each reimplementing a corner of it.
 *
 * begin() puts the pipeline in that state; end() hands depth and culling back,
 * because everything drawn after these passes expects them on.
 */
const quad2D = {
  begin() {
    mgl.enableDepthTest(false);
    mgl.enableCullFace(false);
    mgl.enableLighting(false);
    mgl.enableFog(false);
    mgl.enableBlend(false);
    for (const unit of [1, 0]) {
      mgl.activeTexture(unit);
      mgl.enableTexture(false);
      mgl.texGenSphereMap(false);
    }
    mgl.texEnv({ mode: 'modulate' });
    mgl.matrixMode(mgl.PROJECTION); mgl.loadIdentity();
    mgl.matrixMode(mgl.MODELVIEW); mgl.loadIdentity();
    mgl.color4(1, 1, 1, 1);
  },
  /** A quad in the current projection. `uvs` is four [u,v] pairs, or null. */
  rect(x, y, w, h, uvs = null) {
    const P = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    mgl.begin(mgl.QUADS);
    for (let i = 0; i < 4; i++) {
      if (uvs) mgl.texCoord2(uvs[i][0], uvs[i][1]);
      mgl.vertex3(P[i][0], P[i][1], 0);
    }
    mgl.end();
  },
  /** The whole screen, in clip space. */
  clip(uvs = null) { this.rect(-1, -1, 2, 2, uvs); },
  end() {
    mgl.enableBlend(false);
    mgl.enableDepthTest(true);
    mgl.enableCullFace(true);
  },
};


// Texture coordinates, read out of dm2000 itself — NOT from LightWave's
// documentation, which disagrees (METHOD.md, "the binary is the source of
// truth"). Full derivation and the per-mode asm in re/RENDER.md §10.
//
// The engine bakes UVs into the vertex buffer at load (FUN_0042b0c0
// @0x42b0c0, dispatching the jump table at 0x42b128 to four pure-x87
// workers); there is no per-frame texgen and glMatrixMode(GL_TEXTURE) never
// appears. Coordinates come from raw PNTS in OBJECT space — no layer pivot,
// no LWS scale, nothing from the scene.
//
// Where it departs from the published format, and why fitting could never
// find it: the engine's cylindrical U is the NEGATIVE of LightWave's, and is
// phased on the projection axis rather than on the texture centre. That is a
// mirror plus a half-texture shift — a change of SHAPE, not of scale, which
// is why sweeping the wrap multiplier plateaued at r≈0.71 for every value.
// WRAP, CSYS, ROTA, OREF, NEGA and OPAC are parsed but never read.
const A = (n, d) => Math.atan2(n, d) + Math.PI / 2;      // @0x42b500 et al

function projectUV(x, y, z, blk) {
  const [cx, cy, cz] = blk.center ?? [0, 0, 0];
  const [sx, sy, sz] = blk.size ?? [1, 1, 1];
  const ax = blk.axis ?? 2;
  const dx = x - cx, dy = y - cy, dz = z - cz;
  const w = (blk.wrapW ?? 1) * WMUL;
  const h = blk.wrapH ?? 1;
  const TAU = 2 * Math.PI;

  switch (blk.projection) {
    case 1:                                             // cylindrical @0x42b500
      // NB the axis-Z row really does use +0.25 and no negation.
      if (ax === 0) return [ -w * (A(dz, dy) / TAU + 0.75), 0.5 - dx / (sx || 1) ];
      if (ax === 1) return [ -w * (A(dx, dz) / TAU + 0.75), 0.5 - dy / (sy || 1) ];
      return [ w * (A(dx, dy) / TAU + 0.25), 0.5 - dz / (sz || 1) ];
    case 2: {                                           // spherical @0x42b2b0
      const vOf = (a, b, c) => h * (0.5 - Math.atan(a / Math.hypot(b, c)) / Math.PI);
      if (ax === 0) return [ -w * (A(dz, dy) / TAU + 0.75), vOf(dx, dy, dz) ];
      if (ax === 1) return [ -w * (A(dx, dz) / TAU + 0.75), vOf(dy, dx, dz) ];
      return [ w * (A(dx, dy) / TAU + 0.25), vOf(dz, dx, dy) ];
    }
    case 3: case 4:                                     // engine writes nothing
      return [0, 0];
    default:                                            // planar @0x42b140
      // A BLOK with no PROJ falls here too: all 7 channels are preset to
      // planar at 0x426bc9. WRPW/WRPH are not used by this mode.
      if (ax === 0) return [ 0.5 + dz / (sz || 1), 0.5 - dy / (sy || 1) ];
      if (ax === 1) return [ 0.5 + dx / (sx || 1), 0.5 - dz / (sz || 1) ];
      return [ 0.5 + dx / (sx || 1), 0.5 - dy / (sy || 1) ];
  }
}

// Build pos+normal+uv from an LWO layer, split into one index group per
// surface so each can bind its own texture. LWO ships no normals, so they are
// accumulated per-vertex from face normals (area weighted).
//
// SMAN (smoothing angle) is ignored, and that is a MATCH, not a shortcut.
// The chunk is parsed — FUN_00426a90 compares it at 0x426e9a and stores the
// float to surface[+0x60] at 0x4270c8 — and then nothing ever reads it: the
// only four float reads of a +0x60 field in the whole binary are
// [ESI + 0x60] inside the object world-matrix rebuild (0x40fa90-0x40faeb),
// which is LW::Object, a different struct. So smoothing angles are inert in
// dm2000 and every surface is smoothed uniformly regardless.
//
// This was worth checking rather than assuming either way: 52 of the 73
// surfaces carry SMAN, with angles from 49 to 863 degrees, and 21 carry none
// at all — which in LightWave means faceted. Honouring that would have
// faceted a third of the archive's surfaces and been wrong.
function meshFromLayer(layer, obj) {
  const P = layer.points, n = P.length / 3;

  // ---- FLAT SHADING: one vertex per POLYGON CORNER, carrying that polygon's
  // face normal, instead of one shared vertex per point carrying a smoothed
  // average.
  //
  // The capture settles this. kuubiotekniikka's cubes are FLAT-FACETED in the
  // original — each face a single uniform tone with a crisp edge — where a
  // shared-vertex mesh renders them with gradients running across the faces.
  //
  // It also resolves what RENDER.md §10.5 could not: `glShadeModel` is never
  // called, so GL is in its GL_SMOOTH default, and yet the picture is flat.
  // Those reconcile only one way — the engine hands GL three vertices per
  // triangle that all carry the SAME normal, so interpolating between them is
  // a no-op. It never needs GL_FLAT. That is also why "accumulate one unit
  // normal per polygon into shared vertices" (§10.5) measured worse: the
  // answer was not a different weighting, it was not averaging at all.
  //
  // `src` maps each expanded vertex back to its original point, which is what
  // keeps UV maps and the morph mixer working on point indices.
  const src = [], EPa = [];
  const groups = new Map();                     // surface name -> index array
  const faces = [];                             // [firstExpandedVertex, count]
  layer.polygons.forEach((poly, pi) => {
    if (poly.length < 3) return;                         // 2-vertex = spline guide
    const base = src.length;
    for (const pt of poly) {
      src.push(pt);
      EPa.push(P[pt * 3], P[pt * 3 + 1], P[pt * 3 + 2]);
    }
    faces.push([base, poly.length]);
    const surf = obj.tags[layer.polygonSurface?.[pi] ?? -1] ?? '';
    let g = groups.get(surf);
    if (!g) groups.set(surf, g = []);
    for (let i = 1; i + 1 < poly.length; i++) g.push(base, base + i, base + i + 1);
  });
  const n2 = src.length;
  // total INDICES across every surface group — what `count` reports and what
  // the triangle tally divides by three.
  const idxCount = [...groups.values()].reduce((a, g) => a + g.length, 0);
  const EP = new Float32Array(EPa);
  const nrm = new Float32Array(n2 * 3);

  // Which surface each polygon belongs to, and whether that surface smooths.
  //
  // SMAN DECIDES, and its ABSENCE is the signal. In LightWave a surface with
  // no SMAN chunk has smoothing OFF and renders faceted; one with SMAN smooths
  // across edges up to that angle. The archive splits 52 / 21 on this, and the
  // capture agrees on both sides: kuubio.lwo carries NO SMAN and its cubes are
  // flat-faceted in the original even though its 8 points are welded and
  // shared by three faces each, while Mesh059 (flu2's shards) carries SMAN
  // 191.5 degrees and is smooth.
  //
  // An earlier pass here recorded "SMAN is parsed and dead" after searching
  // for `FLD float ptr [reg + 0x60]` and finding only unrelated hits. That was
  // the same mistake as the texture-alpha one: one access pattern checked, and
  // absence concluded from it. The read has still not been located in the
  // binary — what is established is the BEHAVIOUR, from the data and the
  // capture together, which is what this implements.
  const faceSurf = [], faceN = [], faceUnit = [];
  {
    let fi = 0;
    layer.polygons.forEach((poly, pi) => {
      if (poly.length < 3) return;
      faceSurf[fi++] = obj.tags[layer.polygonSurface?.[pi] ?? -1] ?? '';
    });
  }
  // Surfaces that smooth. Only SMAN's PRESENCE is used, not its angle:
  // gating each edge on the angle as well measured indistinguishable
  // (median 0.850 either way), and the shipped angles are mostly far past
  // any edge in the mesh anyway — 863, 192, 105, 90 degrees. So the angle is
  // carried in the data and does no work here; presence is the whole signal.
  const smooths = new Set();
  for (const sf of new Set(faceSurf)) {
    if (obj.surfaces.find((x) => x.name === sf)?.smoothingAngle !== undefined) smooths.add(sf);
  }

  /** Face normals, then per-corner normals honouring each surface's SMAN. */
  const buildNormals = (pts, out) => {
    // Per-polygon UNIT normal, for the surfaces that do not smooth.
    for (let f = 0; f < faces.length; f++) {
      const [base] = faces[f];
      const a = src[base], b = src[base + 1], c = src[base + 2];
      const ax = pts[a*3], ay = pts[a*3+1], az = pts[a*3+2];
      const ux = pts[b*3]-ax, uy = pts[b*3+1]-ay, uz = pts[b*3+2]-az;
      const vx = pts[c*3]-ax, vy = pts[c*3+1]-ay, vz = pts[c*3+2]-az;
      const nx = uy*vz - uz*vy, ny = uz*vx - ux*vz, nz = ux*vy - uy*vx;
      const l = Math.hypot(nx, ny, nz) || 1;
      faceUnit[f] = [nx/l, ny/l, nz/l];
    }
    // Smooth surfaces accumulate per FAN TRIANGLE, area-weighted (the raw
    // cross product, whose length is twice the triangle's area). Both details
    // are load-bearing and were measured, not assumed: accumulating unit
    // normals instead, or one normal per polygon rather than per triangle,
    // each cost paleksi ~0.94 -> ~0.5, because its mesh is mostly quads and
    // both changes halve or skew what a quad contributes.
    const acc = new Map();                       // "surface\0point" -> [x,y,z]
    for (let f = 0; f < faces.length; f++) {
      if (!smooths.has(faceSurf[f])) continue;
      const [base, cnt] = faces[f];
      for (let i = 1; i + 1 < cnt; i++) {
        const a = src[base], b = src[base + i], c = src[base + i + 1];
        const ax = pts[a*3], ay = pts[a*3+1], az = pts[a*3+2];
        const ux = pts[b*3]-ax, uy = pts[b*3+1]-ay, uz = pts[b*3+2]-az;
        const vx = pts[c*3]-ax, vy = pts[c*3+1]-ay, vz = pts[c*3+2]-az;
        const nx = uy*vz - uz*vy, ny = uz*vx - ux*vz, nz = ux*vy - uy*vx;
        for (const pt of [a, b, c]) {
          const key = faceSurf[f] + '\u0000' + pt;
          let v = acc.get(key); if (!v) acc.set(key, v = [0, 0, 0]);
          v[0] += nx; v[1] += ny; v[2] += nz;
        }
      }
    }
    for (let f = 0; f < faces.length; f++) {
      const [base, cnt] = faces[f];
      const smooth = smooths.has(faceSurf[f]);
      for (let k = 0; k < cnt; k++) {
        const o = (base + k) * 3;
        if (!smooth) {
          const fn = faceUnit[f];
          out[o] = fn[0]; out[o+1] = fn[1]; out[o+2] = fn[2];
          continue;
        }
        const v = acc.get(faceSurf[f] + '\u0000' + src[base + k]) ?? faceUnit[f];
        const l = Math.hypot(v[0], v[1], v[2]) || 1;
        out[o] = v[0]/l; out[o+1] = v[1]/l; out[o+2] = v[2]/l;
      }
    }
  };
  /** Re-expand positions from the (possibly morphed) point array. */
  const expand = (pts, out) => {
    for (let j = 0; j < n2; j++) {
      const q = src[j] * 3;
      out[j*3] = pts[q]; out[j*3+1] = pts[q+1]; out[j*3+2] = pts[q+2];
    }
  };
  buildNormals(P, nrm);
  // UVs are per-surface (each surface has its own projection), but a point can
  // only carry one UV in a shared buffer. Every surface in these objects
  // shares the same SIZE/CENTER/AXIS, so one projection per LAYER is exact
  // here; a layer whose surfaces disagreed would need vertex splitting.
  // Position and normal are shared; UVs are NOT. Each surface has its own
  // BLOK projections, and a channel's coordinates come from ITS OWN block —
  // so every surface group gets its own VAO with uv0/uv1 computed for that
  // surface. (The engine's vertex is stride 48 with uv0@32 and uv1@40.)
  // Positions and normals are SHARED by every surface group in the layer, so
  // they are buffers the meshes borrow; only the UVs and the index list are
  // per-surface. Owning them per mesh would copy 50k triangles once per
  // surface.
  const mkBuf = (data) => mgl.createBuffer(data);
  const posBuf = mkBuf(EP), nrmBuf = mkBuf(nrm);
  // Per EXPANDED vertex. A UV map is keyed by original point, so it is looked
  // up through `src`; a projection is computed from the position, so it reads
  // EP directly. Both give what they gave before — the extra vertices are
  // duplicates, not different places.
  const uvFor = (blk) => {
    const a = new Float32Array(n2 * 2);
    if (blk && blk.projection === 5) {
      // PROJ 5 is UV MAPPING: coordinates come from the named TXUV VMAP, not
      // from geometry. `v` is FLIPPED (v = 1 - uv.v) — the only projection
      // mode that flips (RENDER.md §10.3). All 60 PROJ-5 blocks in the
      // archive belong to KaivoalieniRadOut / hirbiRadBack / rad_out, so
      // omitting this mode planar-projected those three objects entirely.
      const map = layer.uvMaps?.[blk.uvMap] ??
        Object.values(layer.uvMaps ?? {}).find((m) => m.type === 'TXUV');
      if (map) {
        const byPoint = new Map(map.entries);
        for (let j = 0; j < n2; j++) {
          const uv = byPoint.get(src[j]);
          if (uv) { a[j*2] = uv[0]; a[j*2+1] = 1 - uv[1]; }
        }
      }
    } else if (blk) {
      for (let j = 0; j < n2; j++) {
        const [u, v] = projectUV(EP[j*3], EP[j*3+1], EP[j*3+2], blk);
        a[j*2] = u; a[j*2+1] = v;
      }
    }
    return mkBuf(a);
  };
  const parts = [];
  for (const [surfName, list] of groups) {
    const surf = obj.surfaces.find((x) => x.name === surfName);
    const bColr = surf?.blocks.find((b) => b.channel === 'COLR') ?? surf?.blocks[0] ?? null;
    // Second unit: DIFF modulates (mask 5), LUMI adds (mask 3). With all
    // three present it is mask 7 — units 0+1 modulate and LUMI becomes a
    // separate additive PASS (RENDER.md §4.5).
    const bDiff = surf?.blocks.find((b) => b.channel === 'DIFF') ?? null;
    const bLumi = surf?.blocks.find((b) => b.channel === 'LUMI') ?? null;
    const bSecond = bDiff ?? bLumi;
    const bPass1 = (bDiff && bLumi) ? bLumi : null;

    // THREE UV SETS, TWO UNITS (RENDER.md §14.1). Set 0 is COLR's projection,
    // set 1 the second unit's, and set 2 the mask-7 additive pass's own — that
    // pass is unit 0 sampling a different set, not a third texture unit. The
    // draw picks which sets feed which unit, as glClientActiveTexture does.
    const mesh = mgl.createMesh({
      positions: posBuf, normals: nrmBuf,
      uvs: [uvFor(bColr), uvFor(bSecond ?? bColr), uvFor(bPass1 ?? bSecond ?? bColr)],
      indices: new Uint32Array(list),
    });
    parts.push({ surfName, mesh, count: list.length,
      secondIsAdd: !bDiff && !!bLumi, hasSecond: !!bSecond, pass1Blk: bPass1 });
  }
  // Bounding-sphere centre (bbox midpoint) in object space — the sort key the
  // engine uses, transformed to camera space per frame (RENDER.md §4 step 5).
  let mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) {
    if (P[i+k] < mn[k]) mn[k] = P[i+k];
    if (P[i+k] > mx[k]) mx[k] = P[i+k];
  }
  // ---- LW_MorphMixer support. The MORF vertex maps hold RELATIVE deltas and
  // the engine composes them additively — FUN_0041be60 @0x41bfd6 walks
  // `out = base + sum_i(w_i * delta_i)` with one pointer per active target,
  // striding numMorphs*12 bytes per vertex. UVs are NOT recomputed: the engine
  // bakes them into the vertex buffer at LOAD time from the raw PNTS
  // (RENDER.md §10.1), so they stay on the unmorphed positions.
  const morphMaps = new Map();
  for (const [name, m] of Object.entries(layer.uvMaps ?? {}))
    if (m.type === 'MORF' && m.dim === 3) morphMaps.set(name, m.entries);
  const morphed = morphMaps.size ? new Float32Array(P.length) : null;
  let morphState = '';
  const applyMorph = (active) => {         // [{ name, w }] with |w| > epsilon
    const key = active.map((a) => a.name + ':' + a.w.toFixed(5)).join(',');
    if (key === morphState) return;
    morphState = key;
    morphed.set(P);
    for (const { name, w } of active) {
      const e = morphMaps.get(name);
      if (!e) continue;                    // engine throws MorphMapNotFound here
      for (const [pt, v] of e) {
        morphed[pt*3] += w * v[0]; morphed[pt*3+1] += w * v[1]; morphed[pt*3+2] += w * v[2];
      }
    }
    // The morph moves POINTS; the buffers hold expanded polygon corners, so
    // re-expand before uploading and rebuild the face normals from the moved
    // points (silli's targets displace 7.8-8.5 units on a 64-unit object, so
    // the normals genuinely change, not just the silhouette).
    expand(morphed, EP);
    buildNormals(morphed, nrm);
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf); gl.bufferData(gl.ARRAY_BUFFER, EP, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, nrmBuf); gl.bufferData(gl.ARRAY_BUFFER, nrm, gl.DYNAMIC_DRAW);
  };
  return { parts, count: idxCount, centre: [0,1,2].map((k) => (mn[k] + mx[k]) / 2),
           morphMaps, applyMorph: morphed ? applyMorph : null };
}

// RENDER.md §8: RGBA8, REPEAT/REPEAT, LINEAR mag, LINEAR_MIPMAP_NEAREST min
// (no trilinear — the mip popping is original), and rows are NOT flipped.
// Texture references in the assets come in three shapes: relative to
// data/lwo ("textures/x.jpg"), relative to the archive root
// ("data/lwo/textures/x.jpg"), and — for 15 of the 80 CLIP entries —
// ABSOLUTE PATHS FROM THE ARTISTS' OWN MACHINES, e.g.
// "D:lapsus/textures/…" and "C:Documents and Settings/Administrator/
// Desktop/lapsus/kaivoalieni/lwo/textures/…". Every texture in the archive
// lives in one directory, and the basename of all 86 references resolves
// there (the sole exception is kieku's, and kieku is one of the three scenes
// the engine never schedules), so basename lookup is sufficient.
//
// UNVERIFIED AGAINST THE ENGINE: dm2000's own normalisation was not found in
// the STIL parser (FUN_00426230) and presumably lives in LW::TextureManager.
// This rule matches the evidence but is not read from the binary — treat it
// as the next thing to confirm, not as fact.
const TEXDIR = 'work/unpacked/lapsus_dat/data/lwo/textures/';
const texCache = new Map();
const texSize = new Map();   // GL texture -> [w, h], for the backdrop fit
/** Colour image + `_a` companion, combined into one RGBA texture. */
async function loadTexturePaired(file, dir, alphaFile, key) {
  const base = (f) => ROOT + dir + f.replace(/\\/g, '/').split('/').pop();
  const [c, a] = await Promise.all([decodePixels(base(file)), decodePixels(base(alphaFile))]);
  if (c.w !== a.w || c.h !== a.h) {
    // The engine throws here rather than guessing; so do we, because a silent
    // mismatch would show up as a subtly wrong cutout rather than an error.
    throw new Error(`Color texture and alpha texture have different dimensions. ` +
      `${file} ${c.w}x${c.h} vs ${alphaFile} ${a.w}x${a.h}`);
  }
  const out = new Uint8Array(c.data);          // copy: c.data may be a live ImageData
  for (let i = 0; i < out.length; i += 4) {
    out[i + 3] = (a.data[i] + a.data[i + 1] + a.data[i + 2]) / 3;
  }
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, c.w, c.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, out);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
  texSize.set(tex, [c.w, c.h]);
  texCache.set(key, tex);
  return tex;
}

/**
 * Decode an image to raw RGBA. Needed only when a texture has an `_a`
 * companion, because combining them requires pixel access that
 * `texImage2D(…, HTMLImageElement)` does not give.
 */
async function decodePixels(url) {
  if (/\.tga$/i.test(url)) {
    const t = decodeTGA(new Uint8Array(await (await fetch(url)).arrayBuffer()));
    return { w: t.width, h: t.height, data: t.data };
  }
  const img = new Image();
  await new Promise((res, rej) => {
    img.onload = res; img.onerror = () => rej(new Error('image ' + url)); img.src = url;
  });
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const cx = c.getContext('2d', { willReadFrequently: true });
  cx.drawImage(img, 0, 0);
  return { w: img.width, h: img.height, data: cx.getImageData(0, 0, img.width, img.height).data };
}

/**
 * `loadTexture(colour, dir, alpha)` — the third argument is the `_a` companion
 * image, and it is the whole reason this signature is not just a filename.
 *
 * THE ALPHA IS A SEPARATE FILE, not a channel. `LW::TextureManager::get` takes
 * (colorName, alphaName, filterMode), and FUN_0040ec70 @0x40ec70 decodes the
 * second image and writes its **(R + G + B) / 3** into the colour image's
 * alpha byte, throwing "Color texture and alpha texture have different
 * dimensions." if they disagree (RENDER.md §5.3).
 *
 * The pairing CANNOT be derived from the filenames — the archive ships
 * `design1.tga`/`design1_a.tga`, `eDezign.jpg`/`eDezign_a.jpg` and
 * `LapsusDezign1.jpg`/`LapsusDezign1_a2.jpg`, so the suffix is `_a` twice and
 * `_a2` once. It comes from the DATA: a surface's TRAN block names the alpha
 * image, and the two hardcoded Picture pairs name theirs in .rdata.
 */
// THE FRAME MUST BE ATOMIC. renderAt clears the colour buffer and then draws;
// any `await` in between hands the main thread back with a BLANK canvas on it,
// and the compositor is free to present exactly that. The result is a frame
// that flickers between the picture and nothing.
//
// Hairball was the worst of it because it re-fetched and re-parsed its two
// hair files on EVERY frame, so every hairball frame yielded twice right after
// the clear. These caches exist so that after a part's first frame the whole
// draw is synchronous — which is also what the engine does, since it loads
// everything in loadPhase and a frame is pure drawing (ENGINE.md §7).
const texReady = (file, dir = TEXDIR, alphaFile = null) =>
  texCache.get(dir + file + (alphaFile ? '|' + alphaFile : '')) ?? null;
const hairCache = new Map();      // name -> parsed hair, or null if absent
let taunoProto;                   // undefined = not tried yet, null = absent

async function loadTexture(file, dir = TEXDIR, alphaFile = null) {
  const key = dir + file + (alphaFile ? '|' + alphaFile : '');
  if (texCache.has(key)) return texCache.get(key);
  if (alphaFile) return loadTexturePaired(file, dir, alphaFile, key);
  // `dir` lets a caller opt out of basename-into-data/lwo/textures resolution:
  // the particle frames live in data/particles/tauno/ and their ColorTexture
  // pattern is already archive-relative.
  const url = ROOT + dir + file.replace(/\\/g, '/').split('/').pop();
  const tex = gl.createTexture();
  let w, h;
  if (/\.tga$/i.test(url)) {
    // Browsers cannot decode TGA, so these silently failed to load and their
    // surfaces rendered untextured. That is why the mask-7 objects were far
    // too bright: their DIFF texture (which MODULATES the surface down) and
    // their LUMI texture were both missing.
    const buf = new Uint8Array(await (await fetch(url)).arrayBuffer());
    const t = decodeTGA(buf);
    w = t.width; h = t.height;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, t.data);
  } else {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('image ' + file)); img.src = url; });
    w = img.width; h = img.height;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);        // do NOT flip rows
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, img);
  }
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
  texSize.set(tex, [w, h]);
  texCache.set(key, tex);
  return tex;
}

// Full-screen backdrop image (LWS `BGImage`). Scene::render draws it before
// the 3D (RENDER.md §draw order), with no depth interaction.
// The backdrop images are 640x512 while the display is 640x480: the artwork
// is 640x480 padded to a power-of-two height with a flat fill (pure black in
// MatureFurkTitle, pure white in eHollow/End_Mature). The original never
// shows those bottom 32 rows — it draws the image 1:1 in pixels, so the pad
// falls off the bottom of the screen. Stretching all 512 rows into 480
// squashes the whole backdrop by 6.7%, which misaligns every feature in it.
// uFit is (canvas / texture) per axis, so only the on-screen part is sampled.
// Faders (ENGINE.md §6). Six shared objects, but only three are ever used:
// black FadeIn/FadeOut in mode 3 (alpha over a black quad), a white FadeIn in
// mode 1 (additive flash), and a RandomFadeOut for Part_Empt's flicker. Drawn
// as one fullscreen quad in ortho after everything else.
//   mode 3: alpha = v (FadeIn) / 1-v (FadeOut), colour black
//   mode 1: rgb scaled by 1-v (FadeIn) / v (FadeOut), additive

/**
 * Draw one fader. `kind` is 'in' | 'out', `mode` 1 (additive white) or
 * 3 (alpha over black), `v` the 0..1 ramp position.
 * Early-outs match the engine: FadeIn stops at v >= 1, FadeOut at v <= 0.
 */
function drawFade(kind, mode, v, rgb = [0, 0, 0]) {
  v = Math.min(1, Math.max(0, v));
  if (kind === 'in' && v >= 1) return;
  if (kind === 'out' && v <= 0) return;
  quad2D.begin();
  if (mode === 1) {
    mgl.blendFunc(gl.ONE, gl.ONE);
    const k = kind === 'in' ? 1 - v : v;
    mgl.color4(rgb[0]*k, rgb[1]*k, rgb[2]*k, 1);
  } else {
    mgl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    // mode 3 writes the ramp into material TRANSPARENCY; GL alpha = 1 - that
    const transparency = kind === 'in' ? v : 1 - v;
    mgl.color4(rgb[0], rgb[1], rgb[2], 1 - transparency);
  }
  mgl.enableBlend(true);
  quad2D.clip();
  quad2D.end();
}
window.__lapsusFade = drawFade;

// Hair (RENDER.md §11): GL_LINES, additive, culling off, depth writes ON.
// Shading normals are recomputed per frame from the first light and are
// shading-only; drawn here with the file's DiffuseColor under the additive
// blend, which is what carries the look.
// Hair (RENDER.md §4.6 / §11.1). The hair is LIT — the draw at 0x424150 does
// hair[+0x108]->vf2(0), installing the scene's FIRST light as GL_LIGHT0, then
// FUN_0040c060 sets a material built from the .txt's DiffuseColor /
// SpecularColor / SpecularExponent, and glNormalPointer supplies the shading
// normals computed in §11.1. It is not the flat constant colour this shader
// used to emit.
//
// The vertex shader also does the WIDE-LINE expansion for glLineWidth(3), by
// GL's aliased wide-line rule: widen along y for an x-major segment, along x
// for a y-major one.
const HAIR_VS = `#version 300 es
in vec3 aPos; in vec3 aNormal; in vec3 aOther; in float aSide;
uniform mat4 uMV, uProj; uniform vec2 uViewport; uniform float uLineWidth;
out vec3 vN, vP;
void main(){
  vec4 e = uMV * vec4(aPos, 1.0);
  vP = e.xyz; vN = mat3(uMV) * aNormal;
  vec4 a = uProj * e;
  vec4 b = uProj * uMV * vec4(aOther, 1.0);
  vec2 half_ = uViewport * 0.5;
  vec2 sa = a.xy / a.w * half_;
  vec2 sb = b.xy / b.w * half_;
  vec2 d = abs(sb - sa);
  vec2 off = (d.x >= d.y) ? vec2(0.0, 1.0) : vec2(1.0, 0.0);
  a.xy += off * aSide * uLineWidth * 0.5 / half_ * a.w;
  gl_Position = a;
}`;
// Material defaults from FUN_0040bef0 that the hair path does NOT override:
// ambient stays (255,255,255) and emission 0, so the primary colour is
// lmAmbient + diffuse*(N.L). Specular is separate (GL_SEPARATE_SPECULAR_COLOR)
// and uses the same infinite viewer as the main shader. Fog stays enabled.
const HAIR_FS = `#version 300 es
precision highp float;
in vec3 vN, vP; out vec4 o;
uniform vec3 uHairColor, uHairSpec, uAmbient, uLightColor, uLightDir;
uniform float uShine;
uniform bool uFogOn; uniform vec3 uFogColor; uniform vec2 uFogRange;
void main(){
  vec3 n = normalize(vN);
  vec3 col = uAmbient + uHairColor * uLightColor * max(dot(n, uLightDir), 0.0);
  vec3 H = normalize(uLightDir + vec3(0.0, 0.0, 1.0));
  col += uHairSpec * uLightColor * pow(max(dot(n, H), 0.0), uShine);
  if (uFogOn) {
    float f = clamp((uFogRange.y + vP.z) / (uFogRange.y - uFogRange.x), 0.0, 1.0);
    col = mix(uFogColor, col, f);
  }
  o = vec4(col, 1.0);
}`;
const hairProg = gl.createProgram();
gl.attachShader(hairProg, sh(gl.VERTEX_SHADER, HAIR_VS));
gl.attachShader(hairProg, sh(gl.FRAGMENT_SHADER, HAIR_FS));
gl.bindAttribLocation(hairProg, 0, 'aPos');
gl.bindAttribLocation(hairProg, 1, 'aNormal');
gl.bindAttribLocation(hairProg, 2, 'aOther');
gl.bindAttribLocation(hairProg, 3, 'aSide');
gl.linkProgram(hairProg);
if (!gl.getProgramParameter(hairProg, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(hairProg));

// Particles (RENDER.md §11): GL_QUADS billboards, additive, depth test on
// with depthMask(FALSE). Only Part_Pehko uses the system, cloning ONE system
// per hair node.
// The sprite colour is PER PARTICLE, not one tint for the system: emit()
// draws its own r/g/b (0x40dc3f-0x40dc9c) and the draw does
// glColor4f(r*alpha, g*alpha, b*alpha, 1.0) under (ONE, ONE). aColor carries
// the already-multiplied r*alpha so the shader stays a plain modulate.
const PAR_VS = `#version 300 es
in vec3 aPos; in vec2 aUV; in vec3 aColor;
uniform mat4 uMV, uProj; out vec2 vUV; out vec3 vC;
void main(){ vUV = aUV; vC = aColor; gl_Position = uProj * uMV * vec4(aPos,1.0); }`;
const PAR_FS = `#version 300 es
precision highp float; in vec2 vUV; in vec3 vC; out vec4 o;
uniform sampler2D uTex;
void main(){ o = vec4(texture(uTex, vUV).rgb * vC, 1.0); }`;
const parProg = gl.createProgram();
gl.attachShader(parProg, sh(gl.VERTEX_SHADER, PAR_VS));
gl.attachShader(parProg, sh(gl.FRAGMENT_SHADER, PAR_FS));
gl.bindAttribLocation(parProg, 0, 'aPos');
gl.bindAttribLocation(parProg, 1, 'aUV');
gl.bindAttribLocation(parProg, 2, 'aColor');
gl.linkProgram(parProg);

// Picture — a 2D sprite in a virtual 640x480 ortho, used by Part_Empt's
// stamping and by the loading screens. Alpha comes from a SEPARATE `_a`
// image as (R+G+B)/3 (RENDER.md §8), and material transparency scales it
// (mode 3 = SRC_ALPHA / ONE_MINUS_SRC_ALPHA).

/**
 * A Picture: one textured quad in the engine's virtual 640x480 screen space.
 *
 * NOT V-flipped. The engine's Picture quad maps the image top-to-bottom down
 * the screen, so design1.tga's typography (which sits in the upper part of the
 * image) lands at the BOTTOM of the quad — which is where the capture shows it.
 *
 * The alpha is IN the texture: TextureManager::get folds the _a companion's
 * (R+G+B)/3 into the colour image's alpha byte at load time (RENDER.md §5.3),
 * so by the time a Picture is drawn there is one RGBA texture, not two.
 * GL_MODULATE against glColor(1,1,1,opacity) then gives exactly
 * alpha = opacity * texel.a.
 */
function drawPicture(tex, x, y, w, h, opacity, uv = null) {
  quad2D.begin();
  mgl.enableBlend(true);
  mgl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  mgl.activeTexture(0);
  mgl.bindTexture(tex);
  mgl.enableTexture(true);
  mgl.texEnv({ mode: 'modulate' });
  mgl.color4(1, 1, 1, opacity);
  mgl.matrixMode(mgl.PROJECTION);
  mgl.ortho(0, 640, 480, 0, -1, 1);          // the engine's virtual screen
  quad2D.rect(x, y, w, h, uv ?? [[0, 0], [1, 0], [1, 1], [0, 1]]);
  quad2D.end();
}

const ACC_VS = `#version 300 es
const vec2 P[3] = vec2[3](vec2(-1.0,-1.0), vec2(3.0,-1.0), vec2(-1.0,3.0));
void main(){ gl_Position = vec4(P[gl_VertexID], 0.0, 1.0); }`;
const ACC_FS = `#version 300 es
precision highp float; out vec4 o;
uniform sampler2D uSrc; uniform float uKeep;
void main(){
  vec3 c = texelFetch(uSrc, ivec2(gl_FragCoord.xy), 0).rgb;
  o = vec4(floor(c * 255.0 * uKeep) / 255.0, 1.0);
}`;
const BLIT_FS = `#version 300 es
precision highp float; out vec4 o;
uniform sampler2D uSrc;
void main(){ o = vec4(texelFetch(uSrc, ivec2(gl_FragCoord.xy), 0).rgb, 1.0); }`;
const mkProg = (fs) => { const p = gl.createProgram();
  gl.attachShader(p, sh(gl.VERTEX_SHADER, ACC_VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return p; };
const accProg = mkProg(ACC_FS), blitProg = mkProg(BLIT_FS);
const acc = { fb: [], tex: [], cur: 0, ready: false };
function accInit() {
  if (acc.ready) return;
  for (let i = 0; i < 2; i++) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, canvas.width, canvas.height, 0,
      gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const f = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    const d = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, d);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, canvas.width, canvas.height);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, d);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    acc.fb.push(f); acc.tex.push(t);
  }
  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  acc.ready = true;
}
function accDecay(keep) {
  const src = acc.cur, dst = 1 - acc.cur;
  gl.bindFramebuffer(gl.FRAMEBUFFER, acc.fb[dst]);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);
  gl.bindVertexArray(null);
  gl.useProgram(accProg);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, acc.tex[src]);
  gl.uniform1i(gl.getUniformLocation(accProg, 'uSrc'), 0);
  gl.uniform1f(gl.getUniformLocation(accProg, 'uKeep'), keep);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.clear(gl.DEPTH_BUFFER_BIT);
  for (const u of [0, 1, 2, 3]) { gl.activeTexture(gl.TEXTURE0 + u); gl.bindTexture(gl.TEXTURE_2D, null); }
  gl.activeTexture(gl.TEXTURE0);
  // No need to hand the mesh program back: minigl binds its own program and
  // defers every uniform to draw time, so these passes cannot strand it. That
  // coupling is what made the accumulator raise GL_INVALID_OPERATION when it
  // was first written — uniforms were set on a program that was not current.
  gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE);
  acc.cur = dst;
}
function accBlit() {
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);
  gl.bindVertexArray(null);
  gl.useProgram(blitProg);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, acc.tex[acc.cur]);
  gl.uniform1i(gl.getUniformLocation(blitProg, 'uSrc'), 0);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.bindTexture(gl.TEXTURE_2D, null);
}


(async () => {
  // ONE PART, fully prepared: its scene, its geometry and textures, its own
  // hair/particle/rand state, and a renderAt that draws it at a local time.
  // Built as a factory so the player can hold all 21 at once and switch on
  // the schedule, while the verification harness still asks for exactly one.
  async function makePart(SCENE) {
    // Part_Empt has NO .lws at all — it is pure 2D and its content is its own
    // stamping routine — so a missing scene file is legitimate here, not an
    // error. Everything downstream reads empty lists and skips.
    let scene = { objects: [], lights: [], cameras: [], fog: {}, backdrop: {}, unhandled: [] };
    {
      const res = await fetch(DATA + SCENE + '.lws');
      if (res.ok) scene = parseLWS(await res.text());
      else if (!/^empt$/i.test(SCENE)) throw new Error(`no scene ${SCENE}.lws`);
    }
    const drawables = [];
    // What this part uses, for the inspector's resource panel: the geometry it
    // loads and every image any of its surfaces references. Collected while
    // the part is built, because that is the only place the truth is known —
    // a list maintained by hand goes stale the first time a path shape changes.
    const assets = new Set();
    for (const obj of scene.objects) {
      if (!obj.file) continue;                              // null objects: transform only
      // Object paths come in three shapes, exactly like the texture refs:
      // archive-relative ("data/lwo/x.lwo", 84 of them), a BARE FILENAME with no
      // directory at all (49), and absolute paths from a third artist's machine
      // ("H:Lapsus/viherio/lwo/x.lwo", 18). Every .lwo lives in one directory,
      // so resolve by basename. 136 of the 151 references resolve; the 15 that
      // do not belong entirely to kieku/mela/sittis — the three scenes the
      // engine never schedules.
      const url = ROOT + 'work/unpacked/lapsus_dat/data/lwo/'
        + obj.file.replace(/\\/g, '/').split('/').pop();
      const lwo = parseLWO(new Uint8Array(await (await fetch(url)).arrayBuffer()));
      assets.add('lwo/' + url.split('/').pop());
      for (const c of lwo.clips) if (c.file) assets.add(c.file.replace(/\\/g, '/').split('/').slice(-2).join('/'));
      // surface name -> { texture, color, unlit }
      const mats = new Map();
      for (const s of lwo.surfaces) {
        // NOT filtered on ENAB: the engine never compares that chunk id
        // anywhere in .text, so a "disabled" layer is still drawn by the
        // original. No shipped BLOK has ENAB=0, so this is latent here — but
        // honouring a field the engine ignores is a deviation waiting to
        // happen. See LWO_INVENTORY.md, "the engine's real vocabulary".
        const texOf = async (b) => {
          const c = b ? lwo.clips.find((c) => c.index === b.imageIndex) : null;
          if (!c?.file) return null;
          try { return await loadTexture(c.file); } catch { return null; }
        };
        const blk = s.blocks.find((b) => b.channel === 'COLR') ?? s.blocks[0];
        const bDiff = s.blocks.find((b) => b.channel === 'DIFF') ?? null;
        const bLumi = s.blocks.find((b) => b.channel === 'LUMI') ?? null;
        const bTran = s.blocks.find((b) => b.channel === 'TRAN') ?? null;
        // The surface's texture MASK (RENDER.md §4.5) is built from which of the
        // eight name slots are non-empty; bit 0x80 is the reflection image and is
        // cleared unless reflectivity > 0.95. `mask 0x80` — reflection and
        // NOTHING else — is 26 of the archive's 73 surfaces, and the engine
        // handles it at 0x42bd1e as ONE texture on UNIT 0 with sphere-map texgen:
        //   setTexCount(mat, 1)          @0x42be1c -> mat[+0x3c] = 1
        //   setTexture(mat, 0, refl)     @0x42be30 -> mat[+0x40] = tex
        //   setTexGen(mat, 0, 1)         @0x42be3f -> mat[+0x4c] = SPHERE_MAP
        // Unit 0's env mode is always GL_MODULATE, so the reflection MULTIPLIES
        // the lit colour. Treating it as unit 1 / GL_ADD (which is only right for
        // mask 0x81, i.e. WITH a colour texture) turns every all-metal object
        // into a white silhouette: base white + a full-brightness env texel.
        const reflTex = (s.reflection ?? 0) > 0.95 && s.reflectionImage
          ? await texOf({ imageIndex: s.reflectionImage }) : null;
        // The mask is built from which NAME SLOTS are non-empty, so what decides
        // 0x80 against 0x81 is whether a colour texture actually RESOLVES — not
        // whether a BLOK chunk happens to be present. Three of the archive's
        // BLOKs are EMPTY: no CHAN, no IMAG, no PROJ. HigherBeingMM.lwo surface
        // 0 is one of them, and counting it as a colour texture flipped that
        // surface from 0x80 to 0x81, which moves its RIMG from unit 0
        // GL_MODULATE to unit 1 GL_ADD. Modulating by the reflection darkens the
        // figure's cloak to about a fifth of its lit colour; adding it unscaled
        // turns the cloak into bright iridescent chrome. The capture has it
        // nearly black.
        // A TTEX names the alpha of the COLOUR texture, not a texture of its own:
      // mask 0x41's branch reassigns the alpha argument to the TRAN slot at
      // 0x42c943 (`LEA ESI,[EBP+0x290]`) before calling the loader at 0x42c9d9.
      // An earlier reading of this said "the alpha name is always the empty
      // temp" — that is true of the mask-0x80 site it was taken from and false
      // here, which is why dezz.lwo's LapsusDezign1_a2.jpg went unused and
      // flu2's title overlay drew as an opaque block.
      const tranClip = bTran ? lwo.clips.find((c) => c.index === bTran.imageIndex) : null;
      const colrTex = await (async () => {
        const cc = blk ? lwo.clips.find((c) => c.index === blk.imageIndex) : null;
        if (!cc?.file) return null;
        try { return await loadTexture(cc.file, TEXDIR, tranClip?.file ?? null); }
        catch (e) { console.warn(e.message); return null; }
      })();
        const mask80 = !!reflTex && !colrTex;
        const tex = mask80 ? reflTex : colrTex;
        // unit 1 is DIFF (modulate) when present, else LUMI (add). With all
        // three, LUMI moves to the additive second pass instead.
        const tex1 = await texOf(bDiff ?? bLumi);
        const texPass1 = (bDiff && bLumi) ? await texOf(bLumi) : null;
        // Diffuse colour, per RENDER.md §4.5: with NO colour texture the
        // material is surfaceColour x diffuseLevel, but WITH one it is a
        // neutral grey diffuseLevel in all three channels — the texture
        // supplies the colour and the surface colour is not multiplied in.
        // Folding pene's 0.78 surface grey into its textured surfaces was
        // darkening them by 22%.
        const dl = s.diffuse ?? 1;
        const sc = s.color ?? [1, 1, 1];
        const blk0 = s.blocks.find((b) => b.channel === 'COLR');
        const matColor = blk0 ? [dl, dl, dl] : [sc[0]*dl, sc[1]*dl, sc[2]*dl];
        mats.set(s.name, {
          tex, tex1, texPass1, tex1Add: !bDiff && !!bLumi, color: matColor,
          texGen0: mask80,
          // RENDER.md §8: luminosity > 0.95 is drawn unlit via glColor4f
          unlit: (s.luminosity ?? 0) > 0.95,
          diffuse: s.diffuse ?? 1,
          // Blend mode, per RENDER.md §4.5's surface rules:
          //   ADTR > 0.95          -> mode 1, additive     (+ depth mode 2)
          //   TRAN > 0 (or a TTEX) -> mode 3, alpha        (+ depth mode 2)
          //   otherwise            -> mode 0, no blending  (depth mode 3)
          // Depth mode 2 is no-write + LEQUAL, mode 3 is write + LEQUAL.
          // A FULLY transparent surface is a glow sprite, not an invisible one.
          // RENDER.md §4.5's rule is "> 0.95 => blend mode 1 (additive)", and
          // krediili's credit sprites carry TRAN ~= 1.0 with LUMI = 1: treating
          // that as alpha = 1 - TRAN made them alpha ~= 0 and the whole part
          // rendered black, where the capture shows a bright plume.
          // RENDER.md §4.5: transparency > 0 **or a TTEX present** gives blend
          // mode 3 and depth mode 2. The TTEX arm was missing, so the two
          // TRAN-block surfaces in the archive (dezz.lwo is one — flu2's title
          // overlay) were classified opaque and sorted with the opaque group.
          //
          // The transparency IMAGE itself is correctly not loaded: FUN_0042cf90
          // forwards (surface, &colourName, &alphaName, filterMode) to
          // TextureManager::get and "the alpha name is always the empty temp",
          // so a surface never gets a separate alpha image — only Pictures do,
          // through drawPicture's explicit alpha argument. A TTEX therefore
          // changes the surface's BLEND CLASS and nothing else, and
          // material[+0x38] is forced to 0 when one is present, so the surface
          // is alpha-blended at alpha 1.
          // The colour texture carries a real alpha only when a TTEX supplied one.
        // Everything else uploads alpha 255, so gating on this rather than
        // always multiplying keeps 32-bit TGAs that were never meant to be
        // cutouts from suddenly becoming them.
        alphaFromTex: !!tranClip,
        // RENDER.md §4.5, in the order the SURF builder assigns them, so a
        // later rule overrides an earlier one:
        //   +0x3c  > 0.95            -> 1 additive
        //   +0x38  > 0 or a TTEX     -> 3 alpha
        //   +0x2d0 > 0.95            -> 2 MULTIPLICATIVE
        // The last was never implemented. It is CLRF, and exactly two surfaces
        // in the whole archive set it above 0.95 — lat.lwo's bolloballo and
        // ratash.lwo's ratash, which are the two Jasper picked out of the
        // capture as visibly wrong. Both are unlit white-and-black artwork,
        // which is what a multiply is for: white leaves the destination alone
        // and black darkens it, so the sheet reads as a cutout without ever
        // needing an alpha channel.
        blendMode: (s.colorFilter ?? 0) > 0.95 ? 2
                   : (s.additiveTransparency ?? 0) > 0.95 ? 1
                   : (s.transparency ?? 0) > 0.95 ? 1
                   : ((s.transparency ?? 0) > 0 || bTran) ? 3 : 0,
          // LWO TRAN is transparency, so alpha is its complement — except with a
          // TTEX, where material[+0x38] = 0 and the surface is opaque.
          alpha: bTran ? 1
               : (s.transparency ?? 0) > 0.95 ? 1 : 1 - (s.transparency ?? 0),
          twoSided: (s.sides ?? 1) === 3,
          refl: s.reflection ?? 0,
          // Specular gate, read at 0x42ca0f-0x42ca62:
          //   lit AND (specularity > 0 OR surface[+0x48] != 0) AND |colour| > 0
          // an OR, not the AND printed in RENDER.md §4.5 — the JZ at 0x42ca29
          // SKIPS the [EBP+0x48] test when specularity passes. It makes no
          // difference to the shipped data (+0x48 is the SPEC envelope
          // reference and is null for every surface in the archive) but the
          // note was wrong and is corrected in NOTES.md §14.
          //
          // Shininess is 2^(GLOS*10 + 2). The material builder's store at
          // 0x42caa6 is a bare FLD/FSTP of surface[+0x30] with no multiply, so
          // the conversion is not there — it is in the SURF parser, at the
          // moment GLOS is read (0x426dcd-0x426de8):
          //     FLD   double ptr [0x0045a3a8]   ; 2.0
          //     FLD   float  ptr [ESP + 0x38]   ; raw GLOS from the file
          //     FMUL  float  ptr [0x0045a580]   ; 10.0
          //     FADD  float  ptr [0x0045a3c4]   ; 2.0
          //     CALL  0x00430bc0                ; pow
          //     FSTP  float ptr [EDI + 0x30]
          // The three constants read 2.0 / 10.0 / 2.0 out of the binary, and
          // 0x45ad34 / 0x45accc / 0x45a30c nearby read 0.95 / 255.0 / 0.0
          // exactly as the notes predict, which is the check that the offsets
          // are being read correctly. This is LightWave's own glossiness curve.
          //
          // The x128 that stood here was flagged as an assumption and was a
          // decent numerical approximation of this curve over the shipped range
          // — which is why replacing it with the raw GLOS (the material store
          // taken at face value) made things much worse, not better.
          //
          // Stored UNCLAMPED. OpenGL 1.x accepts GL_SHININESS only in [0,128];
          // outside that it raises GL_INVALID_VALUE and leaves the material's
          // PREVIOUS value in place. 9 of the archive's 27 GLOS-bearing surfaces
          // map above 128 (GLOS > 0.5), so on those the engine does not get a
          // big exponent, it gets whatever the LAST surface to set one
          // successfully left behind. That is reproduced in the draw loop —
          // clamping here would have been a different picture entirely, since a
          // clamp gives 128 where GL gives the neighbour's value.
          spec: ((s.color ?? [1,1,1]).some((c) => c > 0) ? (s.specular ?? 0) : 0),
          shine: Math.pow(2, (s.glossiness ?? 0.2) * 10 + 2),
          // Mask bit 0x80 (sphere-map texgen) is cleared unless reflectivity
          // > 0.95 (RENDER.md §4), so a dim reflection is not a faint one — it
          // is no reflection at all. This slot is the ADDITIVE unit-1 sphere map
          // of mask 0x81 only: when the reflection is the surface's *sole*
          // texture (mask 0x80) it belongs on unit 0 and is handled above.
          envTex: await (async () => {
            if (mask80) return null;
            if ((s.reflection ?? 0) <= 0.95) return null;
            const c = s.reflectionImage ? lwo.clips.find((c) => c.index === s.reflectionImage) : null;
            if (!c?.file) return null;
            try { return await loadTexture(c.file); } catch { return null; }
          })(),
        });
      }
      for (const layer of lwo.layers) {
        if (!layer.points || !layer.polygons.length) continue;
        drawables.push({ item: obj, mesh: meshFromLayer(layer, lwo), mats });
      }
    }

    // PERSISTENT SIMULATION STATE. The hair and the particle systems are
    // explicit dt-dependent integrators (RENDER.md §11.1/§11.2.3), so their
    // state at time T is the whole history up to T — there is no closed form
    // to jump to. The frame renderer could afford to re-run that history from
    // rest on every call because it renders one instant and stops; a player at
    // 60fps cannot (krediili is 1000 strands, and at t=8s that is ~480k
    // integration steps PER FRAME).
    //
    // So the state lives here, across calls, and renderAt only ever advances
    // it. If it is asked for a time BEFORE where it stands — which is exactly
    // what the verification harness does when it seeks — it rebuilds from rest,
    // so both callers get the same answer and only the player gets the speed.
    let sim = null;
    let textured = 0, hairLines = 0, particleCount = 0, camIndex = 0, zoomAt = 0, fovX = 0;
    let probeInfo = null;
    const emptRand = msvcRand();
    let emptTex = null;
    // Part_Paleksi overlays a Picture LAST, every frame (RENDER.md §12.4):
    // Picture("data/pics/eDezign.jpg", alpha "data/pics/eDezign_a.jpg", mode 3)
    // at x=128, y=224, moved by the same decaying-burst scalar that shakes the
    // camera. It was missing entirely, which is most of why paleksi read as
    // "renders the wrong picture".
    let paleksiTex = null;
    if (/^paleksi$/i.test(SCENE)) {
      try {
        paleksiTex = await loadTexture('eDezign.jpg',
          'work/unpacked/lapsus_dat/data/pics/', 'eDezign_a.jpg');
      } catch (e) { console.warn(e.message); }
    }
    if (/^empt$/i.test(SCENE)) {
      const PICS = 'work/unpacked/lapsus_dat/data/pics/';
      try { emptTex = await loadTexture('design1.tga', PICS, 'design1_a.tga'); } catch (e) { console.warn(e.message); }
    }

    // ONE FRAME of the demo, at time `T`. Feedback parts call this repeatedly
    // without clearing so the buffer accumulates, which is what the original
    // gets for free from the swap chain (RENDER.md §12): Silli clears depth
    // only and lays a 20% black quad, Pehko clears nothing and uses 5%, Empt
    // clears exactly once in the whole process, and Viherio's strobe gates the
    // CLEAR rather than the draw. No FBO is needed — the default framebuffer
    // persists across draw calls within a page load.
    const FEEDBACK = { silli: 0.20, pehko: 0.05, empt: 0.10 };
    const fbAlpha = FEEDBACK[SCENE] ?? null;
    let useAcc = false;
    const renderAt = async (T, clearColour) => {

    // ---- per-part camera / fog overrides (RENDER.md §7).
    // Part_HigherBiing cuts between THREE cameras and rewrites the scene fog
    // range per shot; everything else uses camera 0 unaltered. Without this the
    // part renders from the wrong viewpoint for most of its 14s and scores a
    // NEGATIVE correlation — it is not a subtle error.
    // Per-part camera perturbation (RENDER.md §12). Applied AFTER the scene
    // tick, as the engine does. Syrjakyla deliberately gets nothing: its
    // oscillator is dead code that nothing reads, so it renders as generic.
    let camShift = [0, 0, 0], camOverwriteZ = null;
    if (/^paleksi$/i.test(SCENE)) {
      // env = pow(1 - phase/P, 5), tripled during the FIRST period only
      const P = 1.1924489795918367;
      const phase = T % P;
      let env = Math.pow(1 - phase / P, 5);
      if (T < P) env *= 3;
      camShift[0] = 0.5 * (env * Math.sin(40 * phase));
    } else if (/^turska$/i.test(SCENE)) {
      // Period 0.8863520408163266s, kick v=50/x=2, damped. The direction vector
      // is never initialised in the engine, so this collapses to a pure Z dolly
      // — reproduce the collapse, not the intent.
      const P = 0.8863520408163266;
      const phase = T % P;
      camOverwriteZ = 2 * Math.pow(Math.max(0, 1 - phase / P), 3);
    }

    camIndex = Number(qs.get('cam') ?? -1);
    if (camIndex < 0) {
      camIndex = 0;
      if (/^higherbiing$/i.test(SCENE)) {
        if (T >= 10.6) { camIndex = 2; scene.fog.minDist = 9.5;  scene.fog.maxDist = 18.0; }
        else if (T >= 4.5) { camIndex = 1; scene.fog.minDist = 15.0; scene.fog.maxDist = 30.0; }
        else { camIndex = 0; scene.fog.minDist = 7.5;  scene.fog.maxDist = 13.0; }
        scene.fog.type = scene.fog.type ?? 1;
      }
    }
    const cam = scene.cameras[Math.min(camIndex, scene.cameras.length - 1)];
    const zoom = cam?.motion?.length >= 9 ? null : cam?.zoom ?? 3.2;
    // ZoomFactor may be a static header value or an envelope; prefer the envelope
    zoomAt = cam?.zoomEnvelope ? evalEnvelope(cam.zoomEnvelope, T) : (cam?.zoom ?? 3.2);

    fovX = 2 * Math.atan(1 / zoomAt);
    const right = Math.tan(fovX / 2) * NEAR;
    const top = Math.tan(0.375 * fovX) * NEAR;   // fovY = 0.75*fovX AS AN ANGLE
    const proj = M.frustum(-right, right, -top, top, NEAR, FAR);

    let camWorld = cam ? worldMatrix(cam, T, 0, camShift) : M.ident();
    if (camOverwriteZ != null) {
      camWorld = new Float32Array(camWorld);
      camWorld[14] += camOverwriteZ;
    }
    const view = M.mul(M.scale(1, 1, -1), M.invRigid(camWorld));

    const bg = scene.backdrop?.color ?? [0, 0, 0];
    gl.clearColor(bg[0] ?? 0, bg[1] ?? 0, bg[2] ?? 0, 1);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.frontFace(gl.CW);                        // paired with the Scale(1,1,-1)
    gl.viewport(0, 0, canvas.width, canvas.height);
    // Feedback parts do not clear colour: Silli clears DEPTH ONLY and lays a
    // 20% black quad (a black FadeIn at 0.8 — RENDER.md §12 corrects §7's 30%);
    // Pehko clears nothing and uses 5%; Part_Empt clears exactly once in the
    // whole process. A single-frame renderer has no history to accumulate, so
    // it clears anyway and stamps the quad — the trail itself needs a
    // ping-pong FBO and a real frame loop.
    // Silli clears DEPTH only; Pehko and Empt clear nothing once running.
    if (clearColour) gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    else gl.clear(gl.DEPTH_BUFFER_BIT);
    // ---- backdrop image, before the 3D and with depth disabled
    let bgTex = null;
    if (scene.backdropImage) {
      // loadTexture resolves by basename, so the three path shapes in the
      // assets all land in the same place — no probing, no spurious 404s.
      bgTex = texReady(scene.backdropImage);
      if (!bgTex) { try { bgTex = await loadTexture(scene.backdropImage); } catch { bgTex = null; } }
    }
    if (bgTex) {
      // uFit is (canvas / texture) per axis, so only the on-screen part of an
      // oversized backdrop is sampled, and V runs DOWN the screen.
      const [tw, th] = texSize.get(bgTex) ?? [canvas.width, canvas.height];
      const fu = Math.min(1, canvas.width / tw), fv = Math.min(1, canvas.height / th);
      quad2D.begin();
      mgl.activeTexture(0);
      mgl.bindTexture(bgTex);
      mgl.enableTexture(true);
      mgl.texEnv({ mode: 'replace' });
      quad2D.clip([[0, fv], [fu, fv], [fu, 0], [0, 0]]);
      quad2D.end();
    }

    if (fbAlpha != null && !useAcc) drawFade('in', 3, 1 - fbAlpha);

    mgl.matrixMode(mgl.PROJECTION); mgl.loadMatrix(proj);
    mgl.matrixMode(mgl.MODELVIEW);
    // GL_NORMALIZE: the engine enables it, and both the lighting normal and
    // the sphere-map normal are normalised because of it.
    mgl.enableNormalize(true);
    // ---- LW_MorphMixer displacement, before anything reads the geometry.
    // Weight = the MorfForm envelope sampled at localTime, and a target is
    // dropped entirely unless |w| > 0.01 (FUN_0041be60 @0x41beb4 against
    // +/-_DAT_0045acdc). Five scenes use it; silli is the one where it dominates.
    for (const d of drawables) {
      if (!d.mesh.applyMorph) continue;
      const active = (d.item.morphs ?? [])
        .map((m) => ({ name: m.name, w: evalEnvelope(m.envelope, T) }))
        .filter((m) => Math.abs(m.w) > MORPH_EPSILON);
      d.mesh.applyMorph(active);
    }

    // ---- lights. LightType 0 is a DISTANT light: direction only, taken from
    // the item's world +Z and negated to point toward the light (RENDER.md 8).
    // Light-model ambient = scene ambient colour x intensity; pene sets
    // AmbientIntensity 0, so there is no ambient floor at all.
    const lightDirs = [], lightCols = [], lightSpecs = [];
    for (const L of scene.lights.slice(0, 8)) {
      const w = worldMatrix(L, T);
      const dW = [-w[8], -w[9], -w[10]];                  // -(world +Z)
      const d = [                                          // into eye space
        view[0]*dW[0] + view[4]*dW[1] + view[8]*dW[2],
        view[1]*dW[0] + view[5]*dW[1] + view[9]*dW[2],
        view[2]*dW[0] + view[6]*dW[1] + view[10]*dW[2]];
      const len = Math.hypot(...d) || 1;
      lightDirs.push(d[0]/len, d[1]/len, d[2]/len);
      const c = L.color ?? [1, 1, 1], I = L.intensity ?? 1;
      lightCols.push(c[0]*I, c[1]*I, c[2]*I);
      // GL_SPECULAR IS NEUTRAL GREY, SCALED BY INTENSITY ALONE. Traced to the
      // LWS light loader, which writes the two colours from different values:
      //
      //   colour  +0xd0/d4/d8 = LightColor.{r,g,b} * LightIntensity
      //   colour2 +0xdc/e0/e4 = LightIntensity * 255   -- the SAME in R, G, B
      //
      // and Light::apply divides both by 255 on the way to glLightfv, so
      // GL_SPECULAR = (I, I, I). The light's COLOUR never reaches the specular
      // term. Feeding it the diffuse colour, as this did, tints every highlight
      // in the demo — and because GL_SEPARATE_SPECULAR_COLOR adds the highlight
      // AFTER the texture stages, it is the one term a texture cannot correct.
      // paleksi is lit by a single almost-pure-red light over a GREEN sphere
      // map, so its highlights came out red where the capture is green.
      lightSpecs.push(I, I, I);
    }
    // w = 0 makes each one DIRECTIONAL, so the vector is the direction toward
    // the light and no position enters. The specular light colour is the same
    // colour as the diffuse: the engine never calls glLightfv(GL_SPECULAR),
    // and GL's default for light 0 is white, so the highlight takes the
    // light's own colour.
    mgl.setLights(lightDirs.length / 3 ? Array.from({ length: lightDirs.length / 3 }, (_, i) => ({
      pos: [lightDirs[i*3], lightDirs[i*3+1], lightDirs[i*3+2], 0],
      diffuse: [lightCols[i*3], lightCols[i*3+1], lightCols[i*3+2]],
      specular: [lightSpecs[i*3], lightSpecs[i*3+1], lightSpecs[i*3+2]],
    })) : []);
    const ambI = scene.ambientIntensity ?? 0, ambC = scene.ambientColor ?? [1, 1, 1];
    mgl.lightModelAmbient(ambC[0]*ambI, ambC[1]*ambI, ambC[2]*ambI);

    // Fog: enabled only for FogType 1. Colour comes from BackdropColor when the
    // BackdropFog flag is set, else FogColor (RENDER.md §4).
    const fogOn = (scene.fog?.type ?? 0) === 1;
    mgl.enableFog(fogOn);
    if (fogOn) {
      const fc = scene.backdrop?.fog ? (scene.backdrop.color ?? [0,0,0]) : (scene.fog.color ?? [0,0,0]);
      // GL_LINEAR over [min,max] against eye -z. GL_FOG_DENSITY is never set
      // and FogMin/MaxAmount are ignored, so this is a plain linear ramp — not
      // the GL_EXP that METHOD.md warns about.
      mgl.fog(scene.fog.minDist ?? 0, scene.fog.maxDist ?? 100, fc);
    }
    // ---- opaque first, then blended (RENDER.md 8 draw order)
    textured = 0;
    // Depth sort, per RENDER.md §4 steps 5-8: NEAREST FIRST, opaque pass
    // forward, blended pass BACKWARD so blending runs far->near. Per-OBJECT,
    // not per-triangle, so the original's transparency ordering is imperfect —
    // reproduce it rather than improve on it.
    //
    // THE SIGN MATTERS AND IT WAS WRONG. The engine's key is the sphere centre
    // through camInverseWorld, in a camera space that looks down +Z, so its
    // ascending sort is nearest-first. Ours is GL eye space, which looks down
    // -Z, so the same ascending sort put the FARTHEST object first and every
    // pass ran backwards. The depth test hides that in the opaque pass; the
    // blended pass drew near->far and composited in the wrong order. In `made`
    // the ratash quad (z -85.6) is behind the four Obu objects (z -72.2), so it
    // was drawn LAST and its multiply painted over the 3D object the capture
    // shows on top of it. Sorting by distance rather than by signed z restores
    // the engine's order.
    // ?onlyobj=<substring> / ?skipobj=<substring> — draw one object, or drop
    // one. A whole-frame score says the picture is wrong; it cannot say WHICH
    // object is painting the wrong pixels, and on a scene with a dozen objects
    // that is most of the work. Matches the item's file or name.
    const idOf = (d) => String(d.item.file ?? d.item.name ?? '').toLowerCase();
    const ONLYOBJ = (qs.get('onlyobj') ?? '').toLowerCase();
    const SKIPOBJ = (qs.get('skipobj') ?? '').toLowerCase();
    const objs = drawables.filter((d) =>
        (!ONLYOBJ || idOf(d).includes(ONLYOBJ)) && (!SKIPOBJ || !idOf(d).includes(SKIPOBJ))
      ).map((d) => {
      const mv = M.mul(view, worldMatrix(d.item, T));
      const c = d.mesh.centre;
      return { d, mv, z: mv[2]*c[0] + mv[6]*c[1] + mv[10]*c[2] + mv[14] };
    }).sort((a, b) => b.z - a.z);        // -z is distance: nearest first

    // ?probe-style diagnostic: what got drawn, in what order, with what key.
    // Draw order is decided by a sort key whose SIGN depends on the view's
    // Scale(1,1,-1), so it is not something to reason about from the source.
    if (single || inspect) window.__lapsusOrder = objs.map((o) => ({
      item: String(o.d.item.file ?? o.d.item.name ?? '?').split('/').pop(),
      z: +o.z.toFixed(3),
      modes: [...new Set(o.d.mesh.parts.map((pt) => o.d.mats.get(pt.surfName)?.blendMode ?? 0))],
    }));   // diagnostic only — not built during live playback
    const passes = [];
    for (const o of objs) for (const part of o.d.mesh.parts) {
      const mat = o.d.mats.get(part.surfName)
        ?? { tex: null, color: [0.72,0.74,0.78], unlit: false, diffuse: 1, alpha: 1,
             twoSided: false, refl: 0, envTex: null, blendMode: 0 };
      passes.push({ o, part, mat });
    }
    for (const blended of (DRAW_OBJECTS ? [false, true] : [])) {
      for (const { o, part, mat } of (blended ? [...passes].reverse() : passes)) {
        const d = o.d;
        if (((mat.blendMode ?? 0) !== 0) !== blended) continue;
        mgl.loadMatrix(o.mv);
        if (blended) {
          mgl.enableBlend(true);
          if (mat.blendMode === 1) mgl.blendFunc(gl.ONE, gl.ONE);              // additive
          else if (mat.blendMode === 2) mgl.blendFunc(gl.DST_COLOR, gl.ZERO);  // multiplicative
          else mgl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);            // alpha
          // §4.5 gives depth mode 2 to the additive and alpha rules ONLY; the
          // multiplicative rule sets no depth mode, so it keeps writing depth.
          mgl.depthMask(mat.blendMode === 2);
        } else { mgl.enableBlend(false); mgl.depthMask(true); }  // depth mode 3
        mgl.enableCullFace(!mat.twoSided);

        // THE MATERIAL, and why it is shaped like this.
        //
        // The SURF builder stores 0x437f0000 = 255.0 into material[+0x04/+0x08/
        // +0x0c] unconditionally (0x42b90b-0x42b937), so GL_AMBIENT is (1,1,1)
        // for EVERY surface in the demo and GL_EMISSION is never written. Only
        // GL_DIFFUSE carries the surface's K. With glColor at white the fixed
        // -function primary is therefore
        //
        //     lightModelAmbient * 1  +  K * sum(lightColor * max(N.L, 0))
        //
        // — the ambient term arrives UNATTENUATED by the surface colour.
        // Folding it into K instead (col = K * (amb + sum)) darkens every
        // scene with a non-zero AmbientIntensity: paleksi 0.515, rad_out 0.54,
        // viherio 0.22 (RENDER.md §13.2.1).
        mgl.enableLighting(!mat.unlit);
        if (mat.unlit) {
          // RENDER.md §13.1: the unlit branch is a glColor4f substitution and
          // nothing else — the texture stages still run on top of it.
          mgl.color4(mat.color[0], mat.color[1], mat.color[2], mat.alpha ?? 1);
        } else {
          mgl.color4(1, 1, 1, mat.alpha ?? 1);
          mgl.material({
            ambient: [1, 1, 1],
            diffuse: mat.color,
            // The engine's specular is a scalar level applied to all three
            // channels, and it is zeroed for a black surface colour.
            specular: [mat.spec ?? 0, mat.spec ?? 0, mat.spec ?? 0],
            // THE REFERENCE HARDWARE CLAMPED. Settled by measurement, so the
            // reasoning is recorded rather than left as a standing doubt.
            //
            // The engine really does hand GL an out-of-range exponent. The
            // call is glMaterialf(GL_FRONT_AND_BACK, GL_SHININESS,
            // material[+0x34]) at 0x40c19b-0x40c1a0, and FUN_0040c060 writes
            // it on EVERY material — both branches end at the same call site
            // (0x40c196):
            //
            //   material[+0x69] set   -> 0x40c192: shininess = material[+0x34]
            //   material[+0x69] clear -> 0x40c1d9: PUSH 1.0f; JMP 0x40c196
            //
            // 9 of the archive's 27 GLOS-bearing surfaces map above 128. By
            // the OpenGL spec that is GL_INVALID_VALUE, the state is left
            // untouched, and the surface silently inherits the previous
            // exponent — usually the 1.0 that the last non-specular surface
            // wrote.
            //
            // That model was implemented in full, with the persistent state,
            // the draw-order carry and the 1.0 reset, and MEASURED:
            //
            //   clamp to 128     syrjakyla 0.754 hedi 0.714 turska 0.937 flu2 0.648
            //   reject-and-carry syrjakyla 0.379 hedi 0.453 turska 0.806 flu2 0.620
            //
            // Four independent parts, all worse, by large margins. The capture
            // is the source of truth and it says the driver these frames were
            // rendered on clamped into range instead of rejecting — which is
            // what plenty of 2000-era GL drivers did with this exact call.
            // Clamping is not an approximation of the engine's behaviour, it
            // IS the observed behaviour; the spec is the external document
            // that loses. (minigl clamps too, for the same measured reason.)
            shininess: qs.has('shine') ? Number(qs.get('shine')) : (mat.shine ?? 16),
          });
        }

        // ---- unit 0. GL_MODULATE unconditionally (§4.4 @0x40c231). For a
        // mask-0x80 surface this unit carries the REFLECTION and nothing else
        // (0x42bd1e: setTexCount(1), setTexture(0, refl), setTexGen(0,
        // SPHERE_MAP)), so the sphere map MULTIPLIES the lit colour there — it
        // is only added when it lands on unit 1, which is mask 0x81.
        //
        // GL_MODULATE also multiplies ALPHA, which is where a TTEX surface's
        // cutout comes from: the _a companion image was folded into this
        // texture's alpha at load (RENDER.md §5.3).
        mgl.activeTexture(0);
        mgl.enableTexture(!!mat.tex);
        if (mat.tex) { mgl.bindTexture(mat.tex); textured++; }
        mgl.texGenSphereMap(!!mat.texGen0);
        mgl.texEnv({ mode: 'modulate' });

        // ---- unit 1, which the reflection and the second texture SHARE. The
        // hardware has two units and the mask picks what sits on this one; no
        // surface in the archive asks for both (RENDER.md §14, and
        // work/verify/texunits.mjs counts them).
        //
        // GL_ADD for a LUMI texture and for the reflection, GL_MODULATE for a
        // DIFF texture. The reflection texel is added UNSCALED: LWO
        // reflectivity does not attenuate it, it only decides whether the
        // sphere-map bit is set at all (bit 0x80 is cleared unless
        // reflectivity > 0.95). REFL is a threshold, not a coefficient — which
        // is why these surfaces read as glowing.
        const unit1 = mat.tex1 ?? mat.envTex;
        mgl.activeTexture(1);
        mgl.enableTexture(!!unit1);
        if (unit1) mgl.bindTexture(unit1);
        mgl.texGenSphereMap(!!mat.envTex && !mat.tex1);
        mgl.texEnv({ mode: (mat.envTex && !mat.tex1) || mat.tex1Add ? 'add' : 'modulate' });

        mgl.drawMesh(part.mesh, { count: part.count, uvSets: [0, 1] });
        // mask 7: second, additive pass carrying only the LUMI texture
        if (mat.texPass1 && !NOPASS1) {
          // NOT a bare additive blit (RENDER.md §13.4): it modulates by
          // glColor, samples its OWN third UV set, writes depth, and is still
          // fogged — material[+0x6a] is never written by the SURF builder, so
          // fog stays on. That last one bites higherbiing, the only mask-7
          // part with FogType 1. It carries the LUMI texture ALONE, so the
          // lighting and the other unit are off for it.
          mgl.enableBlend(true); mgl.blendFunc(gl.ONE, gl.ONE);
          mgl.depthMask(true);                      // pass 1 WRITES depth
          mgl.enableLighting(false);
          mgl.color4(mat.color[0], mat.color[1], mat.color[2], 1);
          mgl.activeTexture(1); mgl.enableTexture(false);
          mgl.activeTexture(0);
          mgl.enableTexture(true); mgl.bindTexture(mat.texPass1);
          mgl.texGenSphereMap(false);
          mgl.texEnv({ mode: 'modulate' });
          // unit 0 sampling UV SET 2 — the pass's own projection, not a third
          // texture unit (RENDER.md §14.1).
          mgl.drawMesh(part.mesh, { count: part.count, uvSets: [2, 1] });
          if (!blended) { mgl.enableBlend(false); mgl.depthMask(true); }
        }
      }
    }
    mgl.enableBlend(false); mgl.depthMask(true);
    // ---- hair. `AddNullObject Hair_<name>` binds that null to
    // data/hairs/<name>.txt; every strand shares ONE root, the null's world
    // origin, so the animated nulls drive the hair purely by parenting.
    //
    // Part_Pehko sets the global `DAT_004a900c = 1` around its frame
    // (RENDER.md §11.2.2), which suppresses Scene::render's hair pass entirely.
    // The simulation still RUNS — Scene::update ticks it and Pehko reads the
    // node positions to place its particle systems — but nothing is drawn. So
    // this is a draw suppression, not a skip: the strands must still be stepped.
    if (scene.backdropImage) assets.add(String(scene.backdropImage).split('/').slice(-2).join('/'));
    const hairSuppressed = /^pehko$/i.test(SCENE);
    const hairNodes = [];        // emitter positions for the particle systems
    // ONE rand() stream across every hair mesh in the scene, in creation order.
    // The engine never calls srand, so the CRT's initial seed of 1 stands and
    // each HairMesh ctor continues the sequence the previous one left off at —
    // it does not restart. Giving each mesh its own generator made every mesh
    // built from the same file identical, which matters most in hairball: it
    // has TWO `Hair_furball` nulls, and they are supposed to be two different
    // random tufts, not one drawn twice.
    // ONE rand() stream per rebuild, shared by hair construction and every
    // particle emission, because the engine never calls srand.
    // Rebuild from rest when asked for a time at or before where the state
    // stands (a seek, or the first frame); otherwise advance to T.
    const HAIR_DT = Number(qs.get('hairdt')) || 1 / 60;
    // Rebuild from rest only on a REAL seek. The tolerance is the point: the
    // old 1e-9 meant any backward step at all threw the simulation away, and
    // the show clock used to jitter backwards by a millisecond or two between
    // frames. Hairball rebuilt its hair from the rest pose on those frames and
    // flickered at the frame rate. A seek is tens of milliseconds at least;
    // sub-frame jitter never is, and simulateSpan already holds the state when
    // the clock does not advance.
    const SIM_SEEK = 0.1;
    if (!sim || T < sim.t - SIM_SEEK) sim = { t: 0, rand: msvcRand(), strands: new Map(), systems: [] };
    const simFrom = sim.t, simTo = Math.max(T, sim.t);
    const hairRand = sim.rand;
    // Part_Pehko's prototype system is built in Part_Pehko::create from the
    // literal "data/particles/tauno/tauno.txt" (0x4075b5), BEFORE any frame
    // runs, so it is loaded here rather than after the hair loop: its clones
    // have to advance on the hair's own clock, not in a later pass.
    let parP = null;
    const parSystems = sim.systems;
    if (hairSuppressed) {
      if (taunoProto === undefined) {
        taunoProto = null;
        try {
          const t = await (await fetch(DATA + 'particles/tauno/tauno.txt')).text();
          if (t && !/not found/i.test(t)) taunoProto = parseParticles(t);
        } catch {}
      }
      if (taunoProto) { parP = taunoProto; assets.add('particles/tauno/tauno.txt'); }
    }
    for (const nullObj of scene.objects.filter((o) => /^Hair_/.test(o.name ?? ''))) {
      const name = nullObj.name.replace(/^Hair_/, '');
      if (!hairCache.has(name)) {
        let txt = null;
        try { txt = await (await fetch(DATA + 'hairs/' + name + '.txt')).text(); } catch {}
        hairCache.set(name, (!txt || /^\s*$/.test(txt) || /not found/i.test(txt))
          ? null : parseHair(txt));
      }
      const h = hairCache.get(name);
      if (!h) continue;
      assets.add('hairs/' + name + '.txt');
      if (!h.hairCount || !h.nodesPerHair) continue;
      // The hair null is ANIMATED, so the simulation has to follow it through
      // time rather than pin it where it ends up. worldMatrix is re-evaluated at
      // every step, exactly as HairMesh::update re-derives it each frame.
      const matAt = (t) => worldMatrix(nullObj, t);
      const w = worldMatrix(nullObj, T);
      const root = [w[12], w[13], w[14]];
      // The step size is the one thing about the hair that cannot be read out of
      // the binary: the engine steps with the real elapsed QPC time, so the shape
      // is a function of the frame rate the demo happened to run at (§11.1 — same
      // dt same image, different dt visibly different hair). ?hairdt= exists so
      // verify/hairdt.mjs can MEASURE that frame rate against the capture instead
      // of leaving 1/60 as an unexamined assumption.
      const hairDt = HAIR_DT;
      // One system per node, over ALL nodes — the engine's loop is
      // `for node in strand[+0x18..0x1c]` with no skip, so `HairCount 8` x
      // `NodesPerHair 10` is 80 systems, not 72. Node 0 is the anchor, which
      // the simulation never moves, so its world position is the root itself.
      // They are stepped INSIDE the hair loop because Part_Pehko::vf2 writes
      // ps.position from the live node and updates the system in the same
      // frame — the emitters trace the path the nodes travel, and running them
      // afterwards over the final pose emits everything from a standing start.
      const onStep = (parP && hairSuppressed)
        ? (t, sts, rt) => {
            let k = 0;
            for (const st of sts)
              for (let i = 0; i < st.nodes.length; i++) {
                parSystems[k] ??= createSystem(parP);
                stepSystem(parSystems[k++], parP, i === 0 ? rt : st.nodes[i].pos,
                  hairDt, hairRand);
              }
          }
        : null;
      // ADVANCE the strands from where they stand to T, instead of rebuilding
      // the whole history. `simulate` integrates a span, so the state carries
      // and the cost per frame is the elapsed dt rather than the elapsed part.
      let strands = sim.strands.get(nullObj);
      if (!strands) sim.strands.set(nullObj, strands = buildStrands(h, hairRand));
      simulateSpan(strands, matAt, h.gravity, simFrom, simTo, hairDt, onStep);
      if (hairSuppressed) {
        for (const st of strands)
          for (let i = 0; i < st.nodes.length; i++)
            hairNodes.push(i === 0 ? root : st.nodes[i].pos);
        continue;                                  // DAT_004a900c = 1: no draw
      }
      // Shading normals need the FIRST light's world position (Scene::update
      // 0x4151be assigns hair[+0x108] = *scene[+0x48] unconditionally), and they
      // change every frame because they point at the light.
      const L0 = scene.lights[0];
      const lw = L0 ? worldMatrix(L0, T) : null;
      shadeNormals(strands, root, lw ? [lw[12], lw[13], lw[14]] : [0, 0, 0]);
      const verts = toLineVerts(strands, root);
      hairLines += verts.length / (10 * 6);        // 6 verts x 10 floats per segment

      gl.useProgram(hairProg);
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      const vb = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vb);
      gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
      const S = 10 * 4;                            // stride: 10 floats
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, S, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, S, 12);
      gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 3, gl.FLOAT, false, S, 24);
      gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, S, 36);
      const hu = (n) => gl.getUniformLocation(hairProg, n);
      gl.uniformMatrix4fv(hu('uMV'), false, view);
      gl.uniformMatrix4fv(hu('uProj'), false, proj);
      gl.uniform2f(hu('uViewport'), canvas.width, canvas.height);
      gl.uniform1f(hu('uLineWidth'), 3.0);         // glLineWidth(3.0f) @0x424173
      gl.uniform3f(hu('uHairColor'),
        h.diffuseColor[0] / 255, h.diffuseColor[1] / 255, h.diffuseColor[2] / 255);
      gl.uniform3f(hu('uHairSpec'),
        h.specularColor[0] / 255, h.specularColor[1] / 255, h.specularColor[2] / 255);
      gl.uniform1f(hu('uShine'), Math.min(128, h.specularExponent));
      // EXACTLY ONE light, the scene's first, and the hair material's own
      // ambient is the (255,255,255) default so the light-model ambient passes
      // through undimmed.
      gl.uniform3f(hu('uAmbient'), ambC[0]*ambI, ambC[1]*ambI, ambC[2]*ambI);
      gl.uniform3fv(hu('uLightDir'), new Float32Array(lightDirs.slice(0, 3).length
        ? lightDirs.slice(0, 3) : [0, 0, 1]));
      gl.uniform3fv(hu('uLightColor'), new Float32Array(lightCols.slice(0, 3).length
        ? lightCols.slice(0, 3) : [1, 1, 1]));
      gl.uniform1i(hu('uFogOn'), scene.fog?.type ? 1 : 0);
      if (scene.fog?.type) {
        const fc = scene.fog.color ?? [0, 0, 0];
        gl.uniform3f(hu('uFogColor'), fc[0], fc[1], fc[2]);
        gl.uniform2f(hu('uFogRange'), scene.fog.minDist ?? 0, scene.fog.maxDist ?? 100);
      }
      gl.disable(gl.CULL_FACE);                    // material noCull = 1
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);   // Additive 1
      gl.depthMask(true);                          // depth mode 3: test + write
      // Wide lines are expanded to triangles in HAIR_VS — see toLineVerts. A
      // gl.lineWidth(3) call here would be silently clamped to 1.
      gl.drawArrays(gl.TRIANGLES, 0, verts.length / 10);
      gl.disable(gl.BLEND); gl.enable(gl.CULL_FACE);
    }
    sim.t = simTo;

    // ---- Part_Empt: no LW::Scene at all — its content IS this stamping
    // routine (RENDER.md §12.1). Three mutually exclusive phases whose timers
    // run in sequence and sum to 1.3 + 8.0 + 3.7 = 13.0s, exactly its slot.
    // `rand01` draws from the shared MSVC stream. All coordinates are in the
    // virtual 640x480 space and are TRUNCATED, and note phase C's y uses a
    // MINUS (screen y grows downward).
    if (/^empt$/i.test(SCENE) && emptTex) {
      const r01 = () => emptRand() * (1 / 32767);
      const stamp = (x, y, op) =>
        drawPicture(emptTex, Math.trunc(x), Math.trunc(y), 256, 256, op);
      // The engine sets the picture's material TRANSPARENCY, so the alpha it
      // draws with is 1 - that (RENDER.md §12.1). Passing the raw rand as
      // opacity is distributionally identical for a uniform variate — which is
      // exactly why it survived every aggregate score — but it is the wrong
      // value per stamp, and in phase C the difference stops being cosmetic.
      const alphaOf = (transparency) => Math.max(0, Math.min(1, 1 - transparency));
      if (T < 1.3) {                                    // phase A
        drawFade('in', 3, 1 - 0.1);                     // black veil at alpha 0.1
        const X = 8 * T - 8, A = X * X;
        const N = Math.max(1, Math.trunc((X - 2.0) * 3.0));
        for (let i = 0; i < N; i++)
          stamp((r01() - 0.5) * A + 50.0, (r01() - 0.5) * A + 180.0, alphaOf(r01()));
      } else if (T < 9.3) {                             // phase B
        drawFade('in', 3, 1 - 0.1);
        const J = 5.759998321533203;                    // = X^2 at t0 = 1.3
        stamp((r01() - 0.5) * J + 50.0, (r01() - 0.5) * J + 180.0, alphaOf(r01()));
      } else {                                          // phase C
        const d = T - 9.3;
        drawFade('in', 3, 1 - (0.9 - 0.05 * d));        // veil deepens with d
        const Y = 8 * d + 2.4, A2 = 1.5 * Y * Y;
        // B2 GROWS: 0.4d + 0.12, so transparency passes 1 at about d = 2.2 and
        // the stamps clamp to invisible. THE PART STOPS EMITTING while its
        // feedback trail decays to black — which is what the capture does and
        // what we were not doing. Without this the spray keeps stamping at full
        // strength to the end: at local 11.26 our mean luma was 32.3 against
        // the reference's 1.8, and at 12.32, 28.7 against 0.0.
        const B2 = 0.05 * Y;
        const N = Math.max(1, Math.trunc(28 * d + 1.4));
        for (let i = 0; i < N; i++) {
          const ang = 0.7853981852531433 + 2.094395160675049 * (r01() - 0.5);
          const rr = (r01() - 0.1) * A2;
          // THE DOUBLE rand() IS LITERAL — 0x405ab6 tests, 0x405ada supplies
          // the value, and the test call's result is discarded. Y > 0 always so
          // the zero branch is unreachable, but the call still happens and
          // shifts the shared MSVC stream for everything after it.
          r01();
          stamp(50.0 + rr * Math.cos(ang), 180.0 - rr * Math.sin(ang),
                alphaOf(r01() + B2));
        }
      }
    }
    // ---- particles. Part_Pehko clones one system per hair node. The systems
    // were already advanced above, in lockstep with the hair, because each one
    // is re-anchored to its node every frame before being updated — so all that
    // is left here is to collect and draw whatever is alive at time T.
    {
      const pp = parP;
      if (pp && parSystems.length) {
        // camera forward axis in world space, for the billboard basis
        const camZ = [camWorld[8], camWorld[9], camWorld[10]];
        const byFrame = new Map();
        for (const sys of parSystems) {
          for (const q of sys.live) {
            const f = frameOf(q, pp, 40);
            if (!byFrame.has(f)) byFrame.set(f, []);
            byFrame.get(f).push(q);
            particleCount++;
          }
        }
        gl.useProgram(parProg);
        gl.uniformMatrix4fv(gl.getUniformLocation(parProg, 'uMV'), false, view);
        gl.uniformMatrix4fv(gl.getUniformLocation(parProg, 'uProj'), false, proj);
        gl.uniform1i(gl.getUniformLocation(parProg, 'uTex'), 0);
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
        // CULLING STAYS ON. The particle material is built at 0x40cb69-0x40cbe5
        // with FUN_0040bef0's defaults for everything it does not set, and
        // `noCull` defaults to 0 — so the sprites are culled against
        // glFrontFace(GL_CW) like everything else (§11.2). The billboard basis
        // is A = R x C, B = A x C with R = (sin zRot, cos zRot, 0), so the
        // quad's winding flips with the particle's random, freely-spinning
        // zRotation: the engine discards roughly half of its own sprites.
        // Disabling culling here doubled the per-frame additive contribution,
        // which on a part whose fader is only 5% is amplified 20x into a
        // visible floor over the whole frame (NOTES.md §15.2).
        gl.depthMask(false);
        gl.activeTexture(gl.TEXTURE0);
        for (const [f, list] of byFrame) {
          const epes = `epes${String(f).padStart(3, '0')}.jpg`;
          const epesDir = 'work/unpacked/lapsus_dat/data/particles/tauno/';
          let tex = texReady(epes, epesDir);
          if (!tex) { try { tex = await loadTexture(epes, epesDir); } catch { continue; } }
          gl.bindTexture(gl.TEXTURE_2D, tex);
          const pos = [], uv = [], al = [];
          const [tsw] = texSize.get(tex) ?? [32, 32];
          const e0 = 0.5 / tsw, e1 = 1 - 0.5 / tsw;
          for (const q of list) {
            const c = billboard(q, camZ);
            // HALF-TEXEL INSET, per §11.2.4: the engine spans (W-1)/TW from a
            // +0.5/TW origin, i.e. texel centre 0 to texel centre W-1, cropping
            // the outermost half-texel of the tile. Sampling the full [0,1]
            // instead lands exactly on the tile boundary, where bilinear
            // filtering blends in the WRAPPED opposite edge — a faint halo
            // around every one of 800 sprites, additively accumulated.
            const uvs = [[e0,e1],[e1,e1],[e1,e0],[e0,e0]];
            const cc = [q.r * q.alpha, q.g * q.alpha, q.b * q.alpha];
            for (const i of [0,1,2, 0,2,3]) {          // quad -> 2 triangles
              pos.push(...c[i]); uv.push(...uvs[i]); al.push(...cc);
            }
          }
          const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
          const put = (loc, data, size) => { const b = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, b);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
            gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0); };
          put(0, pos, 3); put(1, uv, 2); put(2, al, 3);
          gl.drawArrays(gl.TRIANGLES, 0, pos.length / 3);
        }
        gl.disable(gl.BLEND); gl.depthMask(true);
      }
    }

    // ?probe=1 reports the geometry that decides how big things land on screen:
    // where the camera is, how far the emitters spread in WORLD units, and what
    // fraction of the frame that spread subtends. Reading scale off pixels is
    // guesswork — this is the quantity itself, and it separates "the cloud is
    // the wrong size" from "the camera is in the wrong place".
    // Overlay LAST (0x4073f2), after the scene render. The same scalar S that
    // shifts the camera by 0.5 drives the overlay at gains 1.5 (x) and 10.5
    // (y) — so the logo mostly bounces vertically — and both coordinates are
    // TRUNCATED to whole pixels.
    if (paleksiTex) {
      const P = 1.1924489795918367;
      const phase = T - Math.floor(T / P) * P;
      let env = Math.pow(1 - phase / P, 5);
      if (T < P) env *= 3;                       // first period only
      const S = env * Math.sin(40 * phase);
      drawPicture(paleksiTex, Math.trunc(S * 1.5 + 128), Math.trunc(S * 10.5 + 224),
        512, 256, 1);
    }

    if (qs.get('probe') && hairNodes.length) {
      const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
      for (const p of hairNodes) for (let i = 0; i < 3; i++) {
        lo[i] = Math.min(lo[i], p[i]); hi[i] = Math.max(hi[i], p[i]);
      }
      const mid = lo.map((v, i) => (v + hi[i]) / 2);
      const cam = [camWorld[12], camWorld[13], camWorld[14]];
      const dist = Math.hypot(cam[0] - mid[0], cam[1] - mid[1], cam[2] - mid[2]);
      const span = Math.max(...hi.map((v, i) => v - lo[i]));
      probeInfo = {
        emitters: hairNodes.length,
        extent: hi.map((v, i) => +(v - lo[i]).toFixed(2)),
        centre: mid.map((v) => +v.toFixed(2)),
        camera: cam.map((v) => +v.toFixed(2)),
        distance: +dist.toFixed(2),
        frameFraction: +(2 * Math.atan(span / 2 / dist) / fovX).toFixed(3),
      };
    }
    };   // end renderAt

    return {
      name: SCENE, fbAlpha, renderAt,
      assets: () => [...assets].sort(),
      setAcc: (v) => { useAcc = v; },
      info: (T) => ({
        probe: probeInfo,
        scene: SCENE, t: T, camera: camIndex, objects: drawables.length,
        triangles: drawables.reduce((a, d) => a + d.mesh.count / 3, 0),
        texturedGroups: textured, hairLines, particleCount,
        zoom: zoomAt, fovXdeg: fovX * 180 / Math.PI, near: NEAR,
        glError: gl.getError(),
      }),
    };
  }


  // ---- feedback replay, shared by the harness and the player.
  //
  // How long a trail lasts follows from the black quad the part lays down each
  // frame: a quad at alpha a leaves (1-a)^n after n more frames, so the trail
  // is spent (under 1%) after ln(0.01)/ln(1-a) frames.
  const fbWindow = (a) => Math.log(0.01) / Math.log(1 - a) / 60;
  const FB_WINDOW = { silli: fbWindow(0.20), pehko: fbWindow(0.05), empt: fbWindow(0.10) };
  // Viherio is NOT continuous feedback: its strobe suppresses the CLEAR only
  // inside 14 specific windows (table at 0x463c2c, every onset an exact
  // multiple of 0.110794005s on a 64-unit cycle of 7.090816327s).
  const VIHERIO_ONSETS = [0, 0.886352062, 1.218734026, 1.551116109, 1.994292140,
    2.659056187, 2.991438150, 3.323820114, 3.766996145, 4.431760311, 4.764142036,
    5.096524239, 5.539700031, 6.426052094];
  const VIHERIO_CYCLE = 7.090816326530613;
  function fbWindowFor(name, T) {
    // ?fb= overrides the window so a feedback part can be drawn as a single
    // frame (?fb=0), separating "the per-frame content is wrong" from "the
    // accumulation is wrong" — different bugs the composite cannot tell apart.
    if (qs.has('fb')) return Number(qs.get('fb'));
    if (/^viherio$/i.test(name)) {
      const ph = T % VIHERIO_CYCLE;
      return VIHERIO_ONSETS.some((e) => ph >= e && ph < e + 0.1) ? 0.12 : undefined;
    }
    return FB_WINDOW[name];
  }
  /**
   * Draw one frame of `part` at local time T. Feedback parts replay a decay
   * window into the ping-pong accumulator, where the decay TRUNCATES — see the
   * accumulator's note: blending in the default framebuffer rounds to nearest,
   * and round(v*0.95) == v for every v <= 10, so faint pixels would never
   * decay and additive dust would build a permanent floor.
   */
  async function replay(part, T, win) {
    if (win) {
      const dt = 1 / 60, n = Math.max(1, Math.round(win / dt));
      const useAcc = part.fbAlpha != null;
      part.setAcc(useAcc);
      if (useAcc) accInit();
      for (let i = n; i >= 0; i--) {
        const t = Math.max(0, T - i * dt);
        if (useAcc) { accDecay(i === n ? 0 : 1 - part.fbAlpha); await part.renderAt(t, false); }
        else await part.renderAt(t, i === n);
      }
      if (useAcc) { accBlit(); part.setAcc(false); }
    } else {
      await part.renderAt(T, true);
    }
  }

  // ---- ENGINE.md §5: the shipped schedule. Two phases, one MP3 each, with a
  // load between them. Durations are the binary's, not measured — the 9.531s
  // run is exact and repeats.
  const PHASE1 = [
    ['startpart1', 0, 1],      ['empt', 1, 13],
    ['flu2', 14, 9],           ['pene', 23, 8],
    ['krediili', 31, 16],      ['silli', 47, 8],
    ['syrjakyla', 55, 9.531],  ['paleksi', 64.531, 9.531],
    ['pehko', 74.062, 9.531],  ['hulluolli', 83.593, 9.531],
    // ENGINE.md §5: the last phase-1 entry is Part_LoadPart2, which draws
    // pics/loading2.jpg. Its scheduled 1.5s is not how long it is on screen —
    // it STAYS current past its duration, and its index (0xc) is the phase-2
    // trigger at localTime 2.5 (§4 tail).
    ['loadpart2', 93.124, 1.5],
  ];
  const PHASE2 = [
    ['kuubiotekniikka', 0, 13.8], ['diskojea', 13.8, 8.5],
    ['kartonki', 22.3, 7.4],      ['hairball', 29.7, 7],
    ['higherbiing', 36.7, 14],    ['viherio', 50.7, 10.46],
    ['morko', 61.16, 3.54],       ['turska', 64.7, 7.5],
    ['rad_out', 72.2, 14],        ['kaivoalieni', 86.2, 13.5],
    ['made', 99.7, 5.5],          ['hedi', 105.2, 3],
  ];
  // ENGINE.md §6 fade table: [kind, seconds, mode, r,g,b]. mode 3 is the black
  // alpha fade, mode 1 the additive white flash.
  const FADES = {
    startpart1: { out: [1.0, 3] },
    empt:       { out: [0.7, 3, 'random'] },
    flu2:       { in: [2.0, 3], out: [2.0, 3] },
    pene:       { in: [2.0, 3], out: [2.0, 3] },
    krediili:   { in: [1.0, 3] },
    silli:      { in: [2.0, 3], out: [2.0, 3] },
    syrjakyla:  { in: [0.5, 1, 255, 255, 255], out: [2.0, 3] },
    paleksi:    { in: [0.5, 1, 255, 255, 255], out: [2.0, 3] },
    pehko:      { in: [1.0, 3], out: [1.0, 3] },
    // ENGINE.md §5's phase-1 table, read off the binary: black 4.0 BOTH ways.
    // The fade-out was missing entirely, which is why hulluolli scored r 0.998
    // with RMSE 69 — the right picture at the wrong brightness for its last
    // four seconds, and issue #7.
    hulluolli:  { in: [4.0, 3], out: [4.0, 3] },
    // Part_LoadPart2 has the +0x74 fader: mode 1, white, 2.0s. So the loading
    // screen does not cut in, it emerges from a full-white additive flash that
    // decays over two seconds. Missing entirely before.
    loadpart2:  { in: [2.0, 1, 255, 255, 255] },
    // ---- phase 2 (ENGINE.md §5). ALL OF THIS WAS MISSING except morko's
    // flash-in, so every phase-2 part cut hard in and out where the capture
    // fades. Spotted on a rewatch, then read off the binary's table rather
    // than timed by eye.
    //
    // The capture and the table agree independently, which is worth recording:
    // watching it, Jasper named an opening fade for every phase-2 part EXCEPT
    // kuubiotekniikka and viherio — and those are exactly the two the table
    // gives no fade-in.
    kuubiotekniikka: { out: [2.0, 3] },
    diskojea:   { in: [1.0, 3], out: [1.0, 3] },
    kartonki:   { in: [1.0, 3], out: [1.0, 3] },
    hairball:   { in: [1.0, 3], out: [1.0, 3] },
    higherbiing:{ in: [2.0, 3], out: [2.0, 3] },
    viherio:    { out: [1.0, 3] },
    morko:      { in: [0.5, 1, 255, 255, 255], out: [0.5, 3] },
    turska:     { in: [1.0, 3], out: [1.0, 3] },
    rad_out:    { in: [2.0, 3], out: [2.0, 3] },
    kaivoalieni:{ in: [2.0, 3], out: [2.0, 3] },
    made:       { in: [1.0, 3], out: [1.0, 3] },
    hedi:       { in: [0.5, 3], out: [2.0, 3] },
  };

  // ---- the loading screens (ENGINE.md §7). Two of the 27 parts are not
  // scenes at all: Part_StartPart1 (index 25) and Part_LoadPart2 (index 12)
  // are "clear + picture", drawing pics/loading.jpg and pics/loading2.jpg.
  // Without them the demo has no boot screen and no mid-demo loader, which is
  // a good part of what watching it actually feels like.
  const PICDIR = 'work/unpacked/lapsus_dat/data/pics/';
  const LOADING_PIC = { startpart1: 'loading.jpg', loadpart2: 'loading2.jpg' };
  const pics = new Map();
  const loadingPic = async (name) => {
    const file = LOADING_PIC[name];
    if (!file) return null;
    if (!pics.has(file)) {
      try { pics.set(file, await loadTexture(file, PICDIR)); }
      catch (e) { console.warn('loading screen failed:', file, e); pics.set(file, null); }
    }
    return pics.get(file);
  };
  /**
   * The loading picture alone, at `opacity`, over whatever is already there.
   *
   * 1:1 IN PIXELS, exactly as the backdrops are drawn. Both loading screens
   * are 640x512: 640x480 of artwork padded to a power-of-two height with a
   * flat fill. The engine blits them pixel for pixel, so the pad falls off the
   * bottom of the screen. Stretching all 512 rows into 480 squashes the
   * picture by 6.7% and misaligns everything in it — the same mistake already
   * found and fixed for the backdrops.
   */
  function drawLoadingPicture(tex, opacity = 1) {
    const [tw, th] = texSize.get(tex) ?? [640, 480];
    const fu = Math.min(1, 640 / tw), fv = Math.min(1, 480 / th);
    drawPicture(tex, 0, 0, 640, 480, opacity, [[0, 0], [fu, 0], [fu, fv], [0, fv]]);
  }
  /** clear + picture, with the boot FadeIn (Demo+0x6c, mode 3, black) on top. */
  function drawLoadingScreen(tex, fade = 1) {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (tex) drawLoadingPicture(tex, 1);
    if (fade < 1) drawFade('in', 3, fade);
  }
  // Half a second of dissolve out of the second loading screen into part 2.
  // NOT in the original, which cut straight from loading2.jpg to the first
  // frame of kuubiotekniikka — but the original also cut its music off there,
  // and now that the track plays out (see the handover below) the hard cut is
  // the only abrupt thing left in a transition that is otherwise gentle.
  const LOADER_FADE = 0.5;

  const ui = document.getElementById('ui');
  const setStatus = (s) => { if (ui) ui.textContent = s; };
  const parts = new Map();
  const load = async (names) => {
    for (const n of names) {
      if (parts.has(n)) continue;
      setStatus(`loading ${n}…`);
      try { parts.set(n, await makePart(n)); }
      catch (e) { console.warn('part failed:', n, e); parts.set(n, null); }
    }
  };
  const loadAll = () => load([...PHASE1, ...PHASE2].map((p) => p[0]));

  const clampF = (x) => Math.max(0, Math.min(1, x));
  /** Draw the part's scheduled fades at local time `t`, the way the sequencer
   *  computes them (ENGINE.md §4): a fade-in ramps (t)/dur, a fade-out ramps
   *  (t - (dur - fadeDur))/fadeDur. */
  // A fade entry is [duration, mode, ...rest]. `rest` is either an RGB triple
  // in 0-255, or the marker 'random' for empt's RandomFadeOut. Reading the
  // marker as the red channel gives 'random' / 255 = NaN, and a NaN colour
  // clamps to 1 once it travels as a vertex attribute — empt's fade-out went
  // RED, and because empt is a feedback part the ping-pong accumulator kept
  // re-reading it, so the whole opening stained. The old hand-written fade
  // shader wrote the NaN straight to the output and it happened not to show.
  const fadeColour = (rest) => {
    const [r, g, b] = rest.filter((x) => typeof x === 'number');
    return [(r ?? 0) / 255, (g ?? 0) / 255, (b ?? 0) / 255];
  };
  function applyFades(name, t, partDur) {
    const f = FADES[name];
    if (!f) return;
    if (f.in) { const [dur, mode, ...rest] = f.in;
      const v = clampF(t / dur);
      if (v < 1) drawFade('in', mode, v, fadeColour(rest)); }
    if (f.out && Number.isFinite(partDur)) { const [dur, mode, ...rest] = f.out;
      const v = clampF((t - (partDur - dur)) / dur);
      // NB: the 'random' flicker itself (ENGINE.md §6's RandomFadeOut) is not
      // implemented — this draws the plain black ramp that was drawn before.
      if (v > 0) drawFade('out', mode, v, fadeColour(rest)); }
  }

  const single = qs.has('scene') && qs.has('t');
  const inspect = qs.has('inspect');

  if (single) {
    // ---- verification path, unchanged: one part, one instant, then stop.
    const part = await makePart(SCENE);
    const win = fbWindowFor(SCENE, T);
    await replay(part, T, win);
    const fadeIn = qs.get('fadein'), fadeOut = qs.get('fadeout');
    if (fadeIn) { const [v, mode, r, g, b] = fadeIn.split(',').map(Number);
      drawFade('in', mode ?? 3, v, [r ?? 0, g ?? 0, b ?? 0]); }
    if (fadeOut) { const [v, mode, r, g, b] = fadeOut.split(',').map(Number);
      drawFade('out', mode ?? 3, v, [r ?? 0, g ?? 0, b ?? 0]); }
    gl.finish();
    window.__lapsusInfo = part.info(T);
    window.__lapsusReady = true;
    return;
  }

  // ---- INSPECTOR ADAPTER (tools/inspect/ADAPTER.md).
  //
  // The repo-level tooling is deliberately production-agnostic: it knows how to
  // sweep a timeline against a reference capture and how to draw an inspector,
  // but nothing about Lapsus. Everything specific lives behind this object, so
  // adding a production to the tooling means implementing this contract and
  // nothing else.
  //
  // The one genuinely Lapsus-shaped thing it has to express is that the demo
  // has TWO clocks — one per MP3, with a load between them — so a plan entry
  // carries both the part-local time we render and the CAPTURE time that
  // frame should be compared against. A production with a single clock just
  // returns captureTime = offset + t.
  const prod = await (await fetch(ROOT + 'prod.json')).json();
  const trk = prod.captures[0].trackOffsetsMs;
  const OFFSETS = { 1: trk['data/mjuusik/1.mp3'] / 1000, 2: trk['data/mjuusik/2.mp3'] / 1000 };
  const SCHEDULE = [
    ...PHASE1.map(([name, start, dur]) => ({ name, phase: 1, start, dur })),
    ...PHASE2.map(([name, start, dur]) => ({ name, phase: 2, start, dur })),
  ].filter((p) => p.name !== 'startpart1');   // 1s, entirely its own fade

  window.__demo = {
    id: 'lapsus',
    // Every part, in show order, with the capture window it maps to.
    schedule: () => SCHEDULE.map((p) => ({
      ...p, captureStart: OFFSETS[p.phase] + p.start,
    })),
    // Sample plan: one entry per instant the sweep should compare.
    plan(step = 2) {
      const out = [];
      for (const p of SCHEDULE) {
        // At least three samples per part however short it is: morko is 3.54s,
        // and one sample is an anecdote rather than a median.
        const n = Math.max(3, Math.floor((p.dur - 0.5) / step));
        for (let i = 0; i < n; i++) {
          // Inset from both ends by a quarter of a slot so a sample is never
          // taken exactly on a part boundary, where a one-frame timing
          // difference decides which part is on screen at all.
          const local = +((i + 0.5) / n * (p.dur - 0.3) + 0.15).toFixed(3);
          out.push({ part: p.name, phase: p.phase, local,
                     captureTime: +(OFFSETS[p.phase] + p.start + local).toFixed(3) });
        }
      }
      return out;
    },
    /** Draw one sample. Uses the same deterministic path the frame harness
     *  uses, NOT the live accumulator, so a sweep is reproducible. */
    async render({ part, local }) {
      // The loading screens are parts too (Part_StartPart1 / Part_LoadPart2 are
      // "clear + picture", ENGINE.md §7) and the capture shows them, so they
      // are swept like anything else — but they have no .lws behind them and
      // makePart would throw looking for one. Only the scheduled window is
      // sampled, so the fact that loadpart2 is held far longer than its 1.5s
      // in the player does not reach here.
      if (LOADING_PIC[part]) {
        drawLoadingScreen(await loadingPic(part));
        applyFades(part, local, SCHEDULE.find((x) => x.name === part)?.dur ?? Infinity);
        gl.finish();
        return { scene: part, loadingScreen: LOADING_PIC[part], objects: 0,
                 triangles: 0, texturedGroups: 0, glError: gl.getError() };
      }
      const p = parts.get(part) ?? await (async () => {
        const made = await makePart(part); parts.set(part, made); return made;
      })();
      if (!p) return null;
      await replay(p, local, fbWindowFor(part, local));
      // APPLY THE SCHEDULED FADE. Without it the sweep compares an un-faded
      // frame against a reference frame that is mid-fade, and every part with
      // a fade reports as a timing or brightness fault that does not exist —
      // morko opens on a white flash, hulluolli on a 1s fade from black. The
      // fade is part of what the demo shows, so it is part of what we render.
      const ent = SCHEDULE.find((x) => x.name === part);
      applyFades(part, local, ent ? ent.dur : Infinity);
      gl.finish();
      return p.info(local);
    },
    /** What is on screen: the inspector's right-hand panel. */
    state() { return window.__lapsusInfo ?? window.__lapsusNow ?? null; },
    /** Geometry and images this part references, collected at build time. */
    assets(part) {
      if (LOADING_PIC[part]) return ['pics/' + LOADING_PIC[part]];
      return parts.get(part)?.assets?.() ?? null;
    },
  };
  if (inspect) {
    // No autoplay and no click gate: the tooling drives every frame itself.
    setStatus('loading…');
    await loadAll();
    setStatus('');
    window.__lapsusReady = true;
    return;
  }

  // ---- PLAYER. The demo's clock IS the music: the engine resets its QPC
  // reference immediately after FSOUND_PlaySound (ENGINE.md §7), so part time
  // is measured from the start of the current track. Driving the loop from
  // audio.currentTime rather than a wall clock means the visuals cannot drift
  // against the soundtrack no matter how the frame rate varies — which is the
  // one thing a viewer would notice.
  const sceneParts = (table) => table.map((p) => p[0]).filter((n) => !LOADING_PIC[n]);

  const audio = new Audio();
  audio.preload = 'auto';
  window.__lapsusAudio = audio;   // so a harness can seek the demo's clock
  let phase = 1;
  const track = (n) => DATA + 'mjuusik/' + n + '.mp3';

  // Phase 2's scenes are loaded during the demo's own loading part — the gap
  // between the two tracks is authentic, not a stall we are adding.
  let phase2Loaded = null, phase2Ready = false;

  // ---- the show clock.
  //
  // The engine runs on a QPC wall clock RESET at FSOUND_PlaySound (ENGINE.md
  // §7), so a wall clock is the faithful model. Reading audio.currentTime
  // straight looks safer — the visuals cannot drift against the track — but it
  // advances in steps at the audio callback rate rather than per frame, and
  // between two requestAnimationFrame calls it can come back a millisecond or
  // two. Anything carrying dt-dependent state reads that as a seek.
  //
  // So: a wall clock, re-anchored every time the audio position actually
  // moves, and monotonic by construction. It cannot drift against the
  // soundtrack, because the anchor is the soundtrack; and it cannot step
  // backwards, because a step backwards is only honoured when it is far too
  // large to be jitter — which is what a real seek looks like.
  // It free-runs on the wall clock and is EASED toward the audio position
  // rather than snapped to it. Snapping — even with a "never go backwards"
  // clamp — converts the audio's jitter into stalls followed by jumps, and a
  // fixed-dt simulation then integrates zero steps on one frame and two on the
  // next. That is a shimmer you can see in the hair.
  //
  // Easing keeps it monotonic by construction: the correction is limited to
  // half a frame, so the clock always moves forward by at least half the wall
  // time, and it still cannot drift against the track because the error term
  // never stops pulling it back. A gap too large to be jitter is a real seek
  // and is taken at once.
  const SEEK = 0.25;
  let shown = 0, lastWall = 0;
  const resetClock = () => { shown = 0; lastWall = performance.now() / 1000; };
  const showClock = () => {
    const now = performance.now() / 1000;
    const dt = Math.min(0.25, Math.max(0, now - lastWall));
    lastWall = now;
    const a = audio.currentTime;
    if (Math.abs(a - shown) > SEEK) return (shown = a);      // a real seek
    const err = a - shown;
    const corr = Math.max(-0.5 * dt, Math.min(0.5 * dt, err * 0.1));
    return (shown = shown + dt + corr);
  };
  window.__lapsusClock = showClock;

  const startPhase = (n) => new Promise((res) => {
    phase = n;
    audio.src = track(n);
    audio.currentTime = 0;
    resetClock();
    audio.play().then(res, res);
  });

  // A no-clear part in a REAL loop needs no replay window at all: the
  // accumulator IS its history. `replay` exists because the frame renderer has
  // no history and has to manufacture one; here the trail simply persists,
  // which is both cheaper and what the original actually does.
  let accOwner = null;
  async function renderLive(part, T) {
    if (part.fbAlpha != null) {
      accInit();
      // Starting a new feedback part begins from black — the previous part's
      // image is not its trail.
      accDecay(accOwner === part ? 1 - part.fbAlpha : 0);
      accOwner = part;
      part.setAcc(true);
      await part.renderAt(T, false);
      part.setAcc(false);
      accBlit();
    } else {
      accOwner = null;
      await part.renderAt(T, true);
    }
  }

  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  let stopped = false;

  // The sequencer HOLDS its last entry rather than falling off the end
  // (ENGINE.md §4): that is exactly why Part_LoadPart2 is on screen far longer
  // than its scheduled 1.5s, and why phase 2 keeps hedi up from 108.2s until
  // Demo::update quits at t > 112.0.
  const entryAt = (table, t) => {
    for (const [name, s, d] of table) if (t >= s && t < s + d) return [name, t - s, d];
    const [name, s, d] = table[table.length - 1];
    return t < table[0][1] ? [null, 0, 0] : [name, t - s, d];
  };
  let handingOver = false;

  async function frame() {
    if (stopped) return;
    const table = phase === 1 ? PHASE1 : PHASE2;
    const t = showClock();
    const [cur, local, dur] = entryAt(table, t);
    const drawT0 = performance.now();

    // ENGINE.md §4 tail / §7 step 4: the phase-2 trigger is Part_LoadPart2
    // reaching localTime 2.5 — NOT the end of the music. mp3#1 goes on
    // playing over loading2.jpg for those 2.5s and right through the load,
    // and is only stopped when mp3#2 starts. Pausing the track instead (which
    // is what this did before) removed the one thing the loader sounds like.
    if (phase === 1 && cur === 'loadpart2' && !handingOver) {
      // HOLD THE LOADING SCREEN UNTIL THE TRACK HAS PLAYED OUT.
      //
      // A DELIBERATE DEPARTURE from the engine (ENGINE.md §7 step 4), because
      // the original's timing here was a consequence of its hardware. There,
      // loadPhase(2) took some five seconds of frozen display and mp3#1 was
      // cut off wherever it had got to — around 100s of its 111s. The load
      // takes a moment now, so honouring the 2.5s trigger would throw away
      // eleven seconds of music for no reason. The screen holds instead, from
      // 93.1s to the end of the track at 111.0s, and phase 2 starts on 2.mp3.
      //
      // The load starts as soon as the screen appears rather than at the 2.5s
      // mark, so it is long finished by the time the music ends.
      phase2Loaded ??= load(sceneParts(PHASE2)).then(() => { phase2Ready = true; });
      window.__lapsusNow = { phase, t, part: cur, local };
      drawLoadingScreen(await loadingPic('loadpart2'));
      applyFades(cur, local, dur);
      setStatus('');
      const trackDone = audio.ended ||
        (audio.duration > 0 && audio.currentTime >= audio.duration - 0.05);
      if (phase2Ready && trackDone) {
        handingOver = true;
        await startPhase(2);
        handingOver = false;
      }
      window.__lapsusFrameMs = performance.now() - drawT0;
      window.__lapsusFrames = (window.__lapsusFrames ?? 0) + 1;
      updateStats(window.__lapsusFrameMs);
      return;
    }
    if (phase === 2 && t > 112.0) { setStatus('the end'); stopped = true; return; }

    window.__lapsusNow = { phase, t, part: cur, local };
    if (LOADING_PIC[cur]) {
      drawLoadingScreen(await loadingPic(cur));
      applyFades(cur, local, dur);
    } else {
      const part = parts.get(cur);
      if (part) {
        await renderLive(part, local);
        applyFades(cur, local, dur);
      }
    }
    // The dissolve goes on top of everything, the part's own fades included.
    if (phase === 2 && t < LOADER_FADE) {
      const tex = pics.get(LOADING_PIC.loadpart2);
      if (tex) drawLoadingPicture(tex, 1 - t / LOADER_FADE);
    }
    // What one live frame actually costs, for work/verify/livetrace.mjs. Frame
    // INTERVAL cannot answer this: vsync hides every part that still has
    // headroom, and only tells you which parts are already too late.
    window.__lapsusFrameMs = performance.now() - drawT0;
    window.__lapsusFrames = (window.__lapsusFrames ?? 0) + 1;
    updateStats(window.__lapsusFrameMs);
  }

  // THE NEXT FRAME IS SCHEDULED FIRST, and that is the whole point.
  //
  // frame() is async. Scheduling the next requestAnimationFrame at the END of
  // it means the scheduling happens in a microtask AFTER the current rAF
  // callback has already returned — the browser has closed that vsync's
  // callback list, so the next frame lands on the vsync after it. One vsync
  // is lost per frame, every frame, and the demo runs at exactly HALF the
  // display rate no matter how little work it does: measured 29.9fps while
  // the render itself took between 0.6ms and 8.6ms.
  //
  // Asking for the next frame before doing the work keeps the cadence. The
  // guard is what makes that safe: if a frame ever does overrun, it skips the
  // next tick instead of re-entering, so an overrun costs one frame rather
  // than corrupting the state a half-finished frame was building.
  // ?stats=1 — fps, render cost and the worst frame in the last second, on
  // screen. Frame rate is a deliverable for this port (the original brought a
  // period P3 and GeForce to their knees, and running it smoothly is much of
  // the point), and "it feels slower" cannot be acted on while "the 1% low is
  // 22ms in kartonki" can. It also catches what an average hides: the median
  // frame here is a couple of milliseconds and the spikes are hundreds.
  const STATS = qs.get('stats') === '1';
  let statsEl = null;
  if (STATS) {
    statsEl = document.createElement('div');
    statsEl.style.cssText = 'position:fixed;left:8px;top:8px;z-index:99;font:12px/1.4 ui-monospace,monospace;' +
      'color:#8f8;background:rgba(0,0,0,.6);padding:6px 8px;white-space:pre;pointer-events:none';
    document.body.appendChild(statsEl);
  }
  const statWin = [];
  function updateStats(ms) {
    if (!statsEl) return;
    const now = performance.now();
    statWin.push({ now, ms });
    while (statWin.length && now - statWin[0].now > 1000) statWin.shift();
    if (statWin.length < 2) return;
    const sorted = statWin.map((x) => x.ms).sort((a, b) => a - b);
    const p99 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99))];
    const n = window.__lapsusNow;
    statsEl.textContent =
      `${statWin.length} fps   render ${sorted[sorted.length >> 1].toFixed(1)}ms  ` +
      `worst ${p99.toFixed(1)}ms\n${n ? n.part : ''}  t=${n ? n.t.toFixed(2) : ''}`;
  }

  let rendering = false;
  function tick() {
    requestAnimationFrame(tick);
    if (rendering || stopped) return;
    rendering = true;
    frame().catch((e) => console.error('frame', e)).finally(() => { rendering = false; });
  }

  // ---- BOOT, phase 0 (ENGINE.md §4 and §7 step 1).
  //
  // THE ORDER IS THE POINT, and it used to be backwards: the assets were
  // fetched, then the gesture was asked for, then the loading screen appeared.
  // The one screen whose entire job is to be looked at while the demo loads
  // was being shown after the loading had already finished. Now the screen
  // comes up first, the gesture is taken over it, and the loading happens
  // underneath it — which is also what the original does, since loadPhase(1)
  // runs with loading.jpg frozen on the display.
  //
  // With an empty schedule the engine draws loading.jpg every frame with the
  // fade clamp0((t - 0.5) * 0.5), so it rises from black between t=0.5 and
  // t=2.5, and phase 1 begins at t > 3.0. Both are kept, and the fade is never
  // cut short however fast the load turns out to be.
  //
  // DROPPED: the Sleep(4000) on frame 2. It is there to let a video mode
  // switch settle; there is no mode switch here, and four seconds of black in
  // front of the loading screen would defeat the ordering above — the viewer
  // would be waiting for permission to wait.
  const BOOT_END = 3.0;                         // _DAT_0045a32c
  const bootTex = await loadingPic('startpart1');
  const bootT0 = performance.now() / 1000;
  const bootAge = () => performance.now() / 1000 - bootT0;
  let booting = true;
  (function bootFrame() {
    if (!booting) return;
    drawLoadingScreen(bootTex, Math.max(0, (bootAge() - 0.5) * 0.5));
    requestAnimationFrame(bootFrame);
  })();

  // Autoplay needs a gesture in every current browser, so the first click,
  // touch or key starts the music and the clock together.
  const GESTURES = ['pointerdown', 'click', 'keydown'];
  setStatus('click to start');
  const begin = async () => {
    for (const ev of GESTURES) document.removeEventListener(ev, begin);
    // The loading screen is already up and keeps drawing while this runs;
    // load() names the part it is on through the same status line.
    await load(sceneParts(PHASE1));
    if (bootAge() < BOOT_END) {
      await new Promise((r) => setTimeout(r, (BOOT_END - bootAge()) * 1000));
    }
    setStatus('');
    booting = false;
    await startPhase(1);
    tick();
  };
  for (const ev of GESTURES) document.addEventListener(ev, begin);
  window.__lapsusReady = true;

})().catch((e) => {
  window.__lapsusError = String(e.message ?? e);
  window.__lapsusReady = true;
});
