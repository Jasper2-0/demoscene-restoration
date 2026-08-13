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
import { parseLWS, evalEnvelope } from '../../work/js/lws.mjs';
import { parseLWO } from '../../work/js/lwo.mjs';

const ROOT = new URL('../../', import.meta.url).href;
const DATA = ROOT + 'work/unpacked/lapsus_dat/data/';

const qs = new URLSearchParams(location.search);
const SCENE = qs.get('scene') ?? 'hulluolli';
const T = parseFloat(qs.get('t') ?? '4');
const WMUL = parseFloat(qs.get('wmul') ?? '1');   // debug: scale cylindrical wrap
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
function localMatrix(item, t) {
  const mo = item.motion;
  // CAMERAS CARRY 6 CHANNELS, objects and lights carry 9 — the last three are
  // scale, which a camera has no use for. Requiring 9 here silently returned
  // identity for every camera, i.e. put the viewer at the world origin inside
  // the geometry, which looks like a broken projection rather than a missing
  // transform. (27 six-channel motions across the 23 scenes = exactly the
  // camera count.)
  if (!mo || mo.length < 6) return { m: M.ident(), s: 1 };
  const v = (c) => evalEnvelope(mo[c], t);
  const [px, py, pz, h, p, b] = [0,1,2,3,4,5].map(v);
  const s = mo.length >= 9 ? (v(6) + v(7) + v(8)) / 3 : 1;   // per-axis scale collapsed
  let m = M.mul(M.translate(px, py, pz), M.rotY(h));
  m = M.mul(m, M.rotX(p));
  m = M.mul(m, M.rotZ(b));
  return { m, s };
}

function worldMatrix(item, t, depth = 0) {
  const { m, s } = localMatrix(item, t);
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
const gl = canvas.getContext('webgl2', { antialias: true, preserveDrawingBuffer: true });
if (!gl) throw new Error('WebGL2 required');

const VS = `#version 300 es
in vec3 aPos; in vec3 aNormal; in vec2 aUV; in vec2 aUV1;
uniform mat4 uMV, uProj;
out vec3 vN, vP; out vec2 vUV, vUV1;
void main(){ vec4 p = uMV * vec4(aPos,1.0); vP = p.xyz;
  vN = mat3(uMV) * aNormal; vUV = aUV; vUV1 = aUV1; gl_Position = uProj * p; }`;
// Fixed-function-equivalent lighting, per RENDER.md §8: per-light diffuse
// only (no per-light ambient), light-model ambient from the scene, and the
// LWO surface's own diffuse coefficient. No hardcoded fill light — pene has
// AmbientIntensity 0, so anything facing away from its single distant light
// is genuinely black, and an invented ambient floor would wash it out.
const FS = `#version 300 es
precision highp float;
in vec3 vN, vP; in vec2 vUV, vUV1; out vec4 o;
uniform vec3 uColor, uAmbient;
uniform sampler2D uTex;
uniform bool uHasTex, uUnlit, uTwoSided;
uniform float uDiffuse, uAlpha;
#define MAXL 8
uniform int uNumLights;
uniform vec3 uLightDir[MAXL];        // eye space, pointing TOWARD the light
uniform vec3 uLightColor[MAXL];
uniform sampler2D uEnv;              // RIMG reflection image
uniform bool uHasEnv;
uniform float uRefl;
uniform float uSpec, uShine;         // specularity, shininess
uniform sampler2D uTex1;             // second texture unit
uniform bool uHasTex1, uTex1Add;     // unit-1 env: GL_ADD when true, else MODULATE
uniform bool uPass1;                 // mask-7 second pass: additive LUMI only
uniform bool uFogOn; uniform vec3 uFogColor; uniform vec2 uFogRange;
void main(){
  // Mask 7 (COLR+DIFF+LUMI) draws a SECOND additive pass carrying only the
  // LUMI texture, on its own UV set (RENDER.md §4.5, mat[+0x60] = 1).
  if (uPass1) { o = vec4(texture(uTex1, vUV1).rgb, 1.0); return; }
  vec3 base = uColor * (uHasTex ? texture(uTex, vUV).rgb : vec3(1.0));
  // Unit 1: GL_MODULATE for a DIFF texture (mask 5), GL_ADD for LUMI (mask 3).
  if (uHasTex1) {
    vec3 t1 = texture(uTex1, vUV1).rgb;
    if (uTex1Add) base += t1; else base *= t1;
  }
  vec3 n = normalize(vN);                       // GL_NORMALIZE equivalent
  if (uTwoSided && !gl_FrontFacing) n = -n;
  vec3 col;
  if (uUnlit) {
    col = base;
  } else {
    vec3 lit = uAmbient;
    for (int i = 0; i < MAXL; i++) {
      if (i >= uNumLights) break;
      lit += uLightColor[i] * max(dot(n, uLightDir[i]), 0.0);
    }
    col = base * lit;
  }
  // GL_SPHERE_MAP on the eye-space reflection vector, added on top: the
  // engine puts the RIMG reflection on texture unit 1 with env mode GL_ADD
  // (RENDER.md §4, mask 0x81), which is why these surfaces read as glowing.
  //
  // The texel is added UNSCALED. LWO reflectivity does not attenuate it — it
  // only decides whether the sphere-map bit is set at all: RENDER.md records
  // that mask bit 0x80 is cleared unless surface reflectivity > 0.95. So REFL
  // is a threshold, not a coefficient, and multiplying by it here was
  // inventing an attenuation the fixed-function pipeline cannot express.
  if (uHasEnv) {
    vec3 u = normalize(vP);
    vec3 r = u - 2.0 * n * dot(n, u);
    float m = 2.0 * sqrt(r.x*r.x + r.y*r.y + (r.z + 1.0)*(r.z + 1.0));
    col += texture(uEnv, vec2(r.x/m + 0.5, r.y/m + 0.5)).rgb;
  }
  // Specular, added AFTER the texture — the engine enables
  // GL_SEPARATE_SPECULAR_COLOR, so the highlight is not modulated by the
  // texture the way the diffuse term is (RENDER.md §4.5). Only when the
  // surface is lit and specularity > 0; the material specular is a grey of
  // that specularity.
  if (!uUnlit && uSpec > 0.0) {
    vec3 V = -normalize(vP);                    // toward the viewer, eye space
    for (int i = 0; i < MAXL; i++) {
      if (i >= uNumLights) break;
      vec3 H = normalize(uLightDir[i] + V);
      col += uLightColor[i] * uSpec * pow(max(dot(n, H), 0.0), uShine);
    }
  }
  // Fog last: GL_LINEAR over [min,max], the factor running the full 0->1.
  // GL_FOG_DENSITY is never set and FogMin/MaxAmount are ignored, so this is
  // an unclamped linear ramp — not the GL_EXP that METHOD.md warns about.
  if (uFogOn) {
    float f = clamp((uFogRange.y + vP.z) / (uFogRange.y - uFogRange.x), 0.0, 1.0);
    col = mix(uFogColor, col, f);
  }
  o = vec4(col, uAlpha);
}`;
const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
const prog = gl.createProgram();
gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
gl.linkProgram(prog);
if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
gl.useProgram(prog);
const uMV = gl.getUniformLocation(prog, 'uMV');
const uProj = gl.getUniformLocation(prog, 'uProj');
const uColor = gl.getUniformLocation(prog, 'uColor');
const uHasTex = gl.getUniformLocation(prog, 'uHasTex');
const uUnlit = gl.getUniformLocation(prog, 'uUnlit');
const uTwoSided = gl.getUniformLocation(prog, 'uTwoSided');
const uDiffuse = gl.getUniformLocation(prog, 'uDiffuse');
const uAlpha = gl.getUniformLocation(prog, 'uAlpha');
const uAmbient = gl.getUniformLocation(prog, 'uAmbient');
const uNumLights = gl.getUniformLocation(prog, 'uNumLights');
const uLightDir = gl.getUniformLocation(prog, 'uLightDir');
const uLightColor = gl.getUniformLocation(prog, 'uLightColor');
const uEnv = gl.getUniformLocation(prog, 'uEnv');
const uHasEnv = gl.getUniformLocation(prog, 'uHasEnv');
const uRefl = gl.getUniformLocation(prog, 'uRefl');
const uSpec = gl.getUniformLocation(prog, 'uSpec');
const uShine = gl.getUniformLocation(prog, 'uShine');
const uFogOn = gl.getUniformLocation(prog, 'uFogOn');
const uFogColor = gl.getUniformLocation(prog, 'uFogColor');
const uFogRange = gl.getUniformLocation(prog, 'uFogRange');
const uHasTex1 = gl.getUniformLocation(prog, 'uHasTex1');
const uTex1Add = gl.getUniformLocation(prog, 'uTex1Add');
const uPass1 = gl.getUniformLocation(prog, 'uPass1');

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
// accumulated per-vertex from face normals (area weighted). Smoothing groups
// (SMAN) are ignored at this stage.
function meshFromLayer(layer, obj) {
  const P = layer.points, n = P.length / 3;
  const nrm = new Float32Array(P.length);
  const groups = new Map();                     // surface name -> index array
  const idx = [];
  layer.polygons.forEach((poly, pi) => {
    if (poly.length < 3) return;                         // 2-vertex = spline guide
    const surf = obj.tags[layer.polygonSurface?.[pi] ?? -1] ?? '';
    let g = groups.get(surf);
    if (!g) groups.set(surf, g = []);
    for (let i = 1; i + 1 < poly.length; i++) {
      const a = poly[0], b = poly[i], c = poly[i + 1];
      g.push(a, b, c);
      idx.push(a, b, c);
      const ax = P[a*3], ay = P[a*3+1], az = P[a*3+2];
      const ux = P[b*3]-ax, uy = P[b*3+1]-ay, uz = P[b*3+2]-az;
      const vx = P[c*3]-ax, vy = P[c*3+1]-ay, vz = P[c*3+2]-az;
      const nx = uy*vz - uz*vy, ny = uz*vx - ux*vz, nz = ux*vy - uy*vx;
      for (const k of [a, b, c]) { nrm[k*3] += nx; nrm[k*3+1] += ny; nrm[k*3+2] += nz; }
    }
  });
  for (let i = 0; i < n; i++) {
    const l = Math.hypot(nrm[i*3], nrm[i*3+1], nrm[i*3+2]) || 1;
    nrm[i*3] /= l; nrm[i*3+1] /= l; nrm[i*3+2] /= l;
  }
  // UVs are per-surface (each surface has its own projection), but a point can
  // only carry one UV in a shared buffer. Every surface in these objects
  // shares the same SIZE/CENTER/AXIS, so one projection per LAYER is exact
  // here; a layer whose surfaces disagreed would need vertex splitting.
  // Position and normal are shared; UVs are NOT. Each surface has its own
  // BLOK projections, and a channel's coordinates come from ITS OWN block —
  // so every surface group gets its own VAO with uv0/uv1 computed for that
  // surface. (The engine's vertex is stride 48 with uv0@32 and uv1@40.)
  const mkBuf = (data) => {
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return b;
  };
  const posBuf = mkBuf(P), nrmBuf = mkBuf(nrm);
  const uvFor = (blk) => {
    const a = new Float32Array(n * 2);
    if (blk) for (let i = 0; i < n; i++) {
      const [u, v] = projectUV(P[i*3], P[i*3+1], P[i*3+2], blk);
      a[i*2] = u; a[i*2+1] = v;
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

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const attach = (loc, buf, size) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    };
    attach(0, posBuf, 3); attach(1, nrmBuf, 3);
    attach(2, uvFor(bColr), 2);
    attach(3, uvFor(bSecond ?? bColr), 2);
    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(list), gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    parts.push({ surfName, vao, ib, count: list.length,
      secondIsAdd: !bDiff && !!bLumi, hasSecond: !!bSecond, pass1Blk: bPass1,
      pass1Uv: bPass1 ? uvFor(bPass1) : null });
  }
  // Bounding-sphere centre (bbox midpoint) in object space — the sort key the
  // engine uses, transformed to camera space per frame (RENDER.md §4 step 5).
  let mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) {
    if (P[i+k] < mn[k]) mn[k] = P[i+k];
    if (P[i+k] > mx[k]) mx[k] = P[i+k];
  }
  return { parts, count: idx.length, centre: [0,1,2].map((k) => (mn[k] + mx[k]) / 2) };
}

gl.bindAttribLocation(prog, 0, 'aPos');
gl.bindAttribLocation(prog, 1, 'aNormal');
gl.bindAttribLocation(prog, 2, 'aUV');
gl.bindAttribLocation(prog, 3, 'aUV1');

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
async function loadTexture(file) {
  if (texCache.has(file)) return texCache.get(file);
  const url = ROOT + TEXDIR + file.replace(/\\/g, '/').split('/').pop();
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('image ' + file)); img.src = url; });
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);          // do NOT flip rows
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, img);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
  texSize.set(tex, [img.width, img.height]);
  texCache.set(file, tex);
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
const BG_VS = `#version 300 es
const vec2 P[4] = vec2[4](vec2(-1.,-1.), vec2(1.,-1.), vec2(-1.,1.), vec2(1.,1.));
uniform vec2 uFit;
out vec2 vUV;
void main(){ vec2 p = P[gl_VertexID]; vUV = vec2(p.x*.5+.5, .5-p.y*.5) * uFit;
  gl_Position = vec4(p,0.,1.); }`;
const BG_FS = `#version 300 es
precision highp float;
in vec2 vUV; out vec4 o; uniform sampler2D uTex;
void main(){ o = vec4(texture(uTex, vUV).rgb, 1.0); }`;
// Faders (ENGINE.md §6). Six shared objects, but only three are ever used:
// black FadeIn/FadeOut in mode 3 (alpha over a black quad), a white FadeIn in
// mode 1 (additive flash), and a RandomFadeOut for Part_Empt's flicker. Drawn
// as one fullscreen quad in ortho after everything else.
//   mode 3: alpha = v (FadeIn) / 1-v (FadeOut), colour black
//   mode 1: rgb scaled by 1-v (FadeIn) / v (FadeOut), additive
const FADE_VS = `#version 300 es
const vec2 P[4] = vec2[4](vec2(-1.,-1.), vec2(1.,-1.), vec2(-1.,1.), vec2(1.,1.));
void main(){ gl_Position = vec4(P[gl_VertexID], 0., 1.); }`;
const FADE_FS = `#version 300 es
precision highp float; out vec4 o;
uniform vec4 uFade;                  // rgb, alpha
void main(){ o = uFade; }`;
const fadeProg = gl.createProgram();
gl.attachShader(fadeProg, sh(gl.VERTEX_SHADER, FADE_VS));
gl.attachShader(fadeProg, sh(gl.FRAGMENT_SHADER, FADE_FS));
gl.linkProgram(fadeProg);
const fadeVao = gl.createVertexArray();

/**
 * Draw one fader. `kind` is 'in' | 'out', `mode` 1 (additive white) or
 * 3 (alpha over black), `v` the 0..1 ramp position.
 * Early-outs match the engine: FadeIn stops at v >= 1, FadeOut at v <= 0.
 */
function drawFade(kind, mode, v, rgb = [0, 0, 0]) {
  v = Math.min(1, Math.max(0, v));
  if (kind === 'in' && v >= 1) return;
  if (kind === 'out' && v <= 0) return;
  gl.useProgram(fadeProg);
  gl.bindVertexArray(fadeVao);
  gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
  gl.enable(gl.BLEND);
  if (mode === 1) {
    gl.blendFunc(gl.ONE, gl.ONE);
    const k = kind === 'in' ? 1 - v : v;
    gl.uniform4f(gl.getUniformLocation(fadeProg, 'uFade'), rgb[0]*k, rgb[1]*k, rgb[2]*k, 1);
  } else {
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    // mode 3 writes the ramp into material TRANSPARENCY; GL alpha = 1 - that
    const transparency = kind === 'in' ? v : 1 - v;
    gl.uniform4f(gl.getUniformLocation(fadeProg, 'uFade'), rgb[0], rgb[1], rgb[2], 1 - transparency);
  }
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.disable(gl.BLEND); gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE);
  gl.useProgram(prog);
}
window.__lapsusFade = drawFade;

const bgProg = gl.createProgram();
gl.attachShader(bgProg, sh(gl.VERTEX_SHADER, BG_VS));
gl.attachShader(bgProg, sh(gl.FRAGMENT_SHADER, BG_FS));
gl.linkProgram(bgProg);
const bgVao = gl.createVertexArray();

(async () => {
  const scene = parseLWS(await (await fetch(DATA + SCENE + '.lws')).text());
  const drawables = [];
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
      const tex = await texOf(blk);
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
        // RENDER.md §8: luminosity > 0.95 is drawn unlit via glColor4f
        unlit: (s.luminosity ?? 0) > 0.95,
        diffuse: s.diffuse ?? 1,
        // Blend mode, per RENDER.md §4.5's surface rules:
        //   ADTR > 0.95          -> mode 1, additive     (+ depth mode 2)
        //   TRAN > 0 (or a TTEX) -> mode 3, alpha        (+ depth mode 2)
        //   otherwise            -> mode 0, no blending  (depth mode 3)
        // Depth mode 2 is no-write + LEQUAL, mode 3 is write + LEQUAL.
        blendMode: (s.additiveTransparency ?? 0) > 0.95 ? 1
                 : (s.transparency ?? 0) > 0 ? 3 : 0,
        // LWO TRAN is transparency, so alpha is its complement. SIDE 3 is
        // double-sided: culling off and normals flipped on back faces.
        alpha: 1 - (s.transparency ?? 0),
        twoSided: (s.sides ?? 1) === 3,
        refl: s.reflection ?? 0,
        // RENDER.md §4.5: specular only when lit, specularity > 0 and the
        // surface colour is non-black; material specular is a grey of the
        // specularity. UNVERIFIED: how LWO GLOS maps to the GL shininess
        // exponent. RENDER.md records "shininess = surface[+0x30]" but the
        // loader's LWO GLOS -> that field scaling was not traced. Shipped
        // GLOS values are 0.065..0.725, which as a raw exponent would give an
        // almost flat highlight, so the x128 below is an ASSUMPTION.
        spec: ((s.color ?? [1,1,1]).some((c) => c > 0) ? (s.specular ?? 0) : 0),
        shine: Math.max(1, (s.glossiness ?? 0.2) * 128),
        // Mask bit 0x80 (sphere-map texgen) is cleared unless reflectivity
        // > 0.95 (RENDER.md §4), so a dim reflection is not a faint one — it
        // is no reflection at all.
        envTex: await (async () => {
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

  const cam = scene.cameras[0];
  const zoom = cam?.motion?.length >= 9 ? null : cam?.zoom ?? 3.2;
  // ZoomFactor may be a static header value or an envelope; prefer the envelope
  const zoomAt = cam?.zoomEnvelope ? evalEnvelope(cam.zoomEnvelope, T) : (cam?.zoom ?? 3.2);

  const fovX = 2 * Math.atan(1 / zoomAt);
  const right = Math.tan(fovX / 2) * NEAR;
  const top = Math.tan(0.375 * fovX) * NEAR;   // fovY = 0.75*fovX AS AN ANGLE
  const proj = M.frustum(-right, right, -top, top, NEAR, FAR);

  const camWorld = cam ? worldMatrix(cam, T) : M.ident();
  const view = M.mul(M.scale(1, 1, -1), M.invRigid(camWorld));

  const bg = scene.backdrop?.color ?? [0, 0, 0];
  gl.clearColor(bg[0] ?? 0, bg[1] ?? 0, bg[2] ?? 0, 1);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
  gl.frontFace(gl.CW);                        // paired with the Scale(1,1,-1)
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // ---- backdrop image, before the 3D and with depth disabled
  let bgTex = null;
  if (scene.backdropImage) {
    // loadTexture resolves by basename, so the three path shapes in the
    // assets all land in the same place — no probing, no spurious 404s.
    try { bgTex = await loadTexture(scene.backdropImage); } catch { bgTex = null; }
  }
  if (bgTex) {
    gl.useProgram(bgProg);
    gl.bindVertexArray(bgVao);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, bgTex);
    gl.uniform1i(gl.getUniformLocation(bgProg, 'uTex'), 0);
    const [tw, th] = texSize.get(bgTex) ?? [canvas.width, canvas.height];
    gl.uniform2f(gl.getUniformLocation(bgProg, 'uFit'),
      Math.min(1, canvas.width / tw), Math.min(1, canvas.height / th));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.useProgram(prog);
  }

  gl.uniformMatrix4fv(uProj, false, proj);
  gl.uniform1i(gl.getUniformLocation(prog, 'uTex'), 0);
  gl.uniform1i(uEnv, 2);
  gl.uniform1i(gl.getUniformLocation(prog, 'uTex1'), 1);

  // ---- lights. LightType 0 is a DISTANT light: direction only, taken from
  // the item's world +Z and negated to point toward the light (RENDER.md 8).
  // Light-model ambient = scene ambient colour x intensity; pene sets
  // AmbientIntensity 0, so there is no ambient floor at all.
  const lightDirs = [], lightCols = [];
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
  }
  gl.uniform1i(uNumLights, scene.lights.slice(0, 8).length);
  if (lightDirs.length) {
    gl.uniform3fv(uLightDir, new Float32Array(lightDirs));
    gl.uniform3fv(uLightColor, new Float32Array(lightCols));
  }
  const ambI = scene.ambientIntensity ?? 0, ambC = scene.ambientColor ?? [1, 1, 1];
  gl.uniform3f(uAmbient, ambC[0]*ambI, ambC[1]*ambI, ambC[2]*ambI);

  // Fog: enabled only for FogType 1. Colour comes from BackdropColor when the
  // BackdropFog flag is set, else FogColor (RENDER.md §4).
  const fogOn = (scene.fog?.type ?? 0) === 1;
  gl.uniform1i(uFogOn, fogOn ? 1 : 0);
  if (fogOn) {
    const fc = scene.backdrop?.fog ? (scene.backdrop.color ?? [0,0,0]) : (scene.fog.color ?? [0,0,0]);
    gl.uniform3f(uFogColor, fc[0], fc[1], fc[2]);
    gl.uniform2f(uFogRange, scene.fog.minDist ?? 0, scene.fog.maxDist ?? 100);
  }

  // ---- opaque first, then blended (RENDER.md 8 draw order)
  let textured = 0;
  // Depth sort: key is the camera-space Z of each object's bounding-sphere
  // centre, ASCENDING (nearest first). The opaque pass walks forward and the
  // blended pass BACKWARD (far->near). It is per-OBJECT, not per-triangle, so
  // the original's transparency ordering is imperfect — reproduce it rather
  // than improve on it (RENDER.md §4 steps 5-8).
  const objs = drawables.map((d) => {
    const mv = M.mul(view, worldMatrix(d.item, T));
    const c = d.mesh.centre;
    return { d, mv, z: mv[2]*c[0] + mv[6]*c[1] + mv[10]*c[2] + mv[14] };
  }).sort((a, b) => a.z - b.z);

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
      gl.uniformMatrix4fv(uMV, false, o.mv);
      if (blended) {
        gl.enable(gl.BLEND);
        if (mat.blendMode === 1) gl.blendFunc(gl.ONE, gl.ONE);              // additive
        else if (mat.blendMode === 2) gl.blendFunc(gl.DST_COLOR, gl.ZERO);  // multiplicative
        else gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);            // alpha
        gl.depthMask(false);                                   // depth mode 2
      } else { gl.disable(gl.BLEND); gl.depthMask(true); }     // depth mode 3
      if (mat.twoSided) gl.disable(gl.CULL_FACE); else gl.enable(gl.CULL_FACE);
      gl.uniform3f(uColor, mat.color[0], mat.color[1], mat.color[2]);
      gl.uniform1i(uHasTex, mat.tex ? 1 : 0);
      gl.uniform1i(uUnlit, mat.unlit ? 1 : 0);
      gl.uniform1i(uTwoSided, mat.twoSided ? 1 : 0);
      gl.uniform1f(uDiffuse, mat.diffuse ?? 1);
      gl.uniform1f(uAlpha, mat.alpha ?? 1);
      gl.uniform1i(uHasEnv, mat.envTex ? 1 : 0);
      gl.uniform1f(uRefl, mat.refl ?? 0);
      gl.uniform1f(uSpec, mat.spec ?? 0);
      gl.uniform1f(uShine, mat.shine ?? 16);
      gl.uniform1i(uHasTex1, mat.tex1 ? 1 : 0);
      gl.uniform1i(uTex1Add, mat.tex1Add ? 1 : 0);
      gl.uniform1i(uPass1, 0);
      gl.activeTexture(gl.TEXTURE0);
      if (mat.tex) { gl.bindTexture(gl.TEXTURE_2D, mat.tex); textured++; }
      if (mat.tex1) { gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, mat.tex1); }
      if (mat.envTex) { gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, mat.envTex); }
      gl.bindVertexArray(part.vao);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, part.ib);
      gl.drawElements(gl.TRIANGLES, part.count, gl.UNSIGNED_INT, 0);
      // mask 7: second, additive pass carrying only the LUMI texture
      if (mat.texPass1) {
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false);
        gl.uniform1i(uPass1, 1);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, mat.texPass1);
        gl.drawElements(gl.TRIANGLES, part.count, gl.UNSIGNED_INT, 0);
        gl.uniform1i(uPass1, 0);
        if (!blended) { gl.disable(gl.BLEND); gl.depthMask(true); }
      }
    }
  }
  gl.disable(gl.BLEND); gl.depthMask(true);

  // Scheduled fade for this part, from ?fadein=/?fadeout= (kind:dur:mode[:rgb]).
  // The sequencer computes the ramp as (t - start)/dur for a fade-in and
  // (t - (start + dur - fadeOutDur))/fadeOutDur for a fade-out (ENGINE.md §4);
  // the harness passes the already-resolved ramp so this renderer stays a
  // single-frame tool.
  const fadeIn = qs.get('fadein'), fadeOut = qs.get('fadeout');
  if (fadeIn) { const [v, mode, r, g, b] = fadeIn.split(',').map(Number);
    drawFade('in', mode ?? 3, v, [r ?? 0, g ?? 0, b ?? 0]); }
  if (fadeOut) { const [v, mode, r, g, b] = fadeOut.split(',').map(Number);
    drawFade('out', mode ?? 3, v, [r ?? 0, g ?? 0, b ?? 0]); }

  gl.finish();

  window.__lapsusInfo = {
    scene: SCENE, t: T, objects: drawables.length,
    triangles: drawables.reduce((a, d) => a + d.mesh.count / 3, 0),
    texturedGroups: textured,
    zoom: zoomAt, fovXdeg: fovX * 180 / Math.PI, near: NEAR,
    glError: gl.getError(),
  };
  window.__lapsusReady = true;
})().catch((e) => {
  window.__lapsusError = String(e.message ?? e);
  window.__lapsusReady = true;
});
