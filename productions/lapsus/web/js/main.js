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
import { parseLWS, evalEnvelope, MORPH_EPSILON } from '../../work/js/lws.mjs';
import { parseLWO } from '../../work/js/lwo.mjs';
import { decodeTGA } from '../../work/js/tga.mjs';
import { parseHair, buildStrands, simulate, toLines, msvcRand } from '../../work/js/hair.mjs';
import { parseParticles, simulateSystem, frameOf, billboard } from '../../work/js/particles.mjs';

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
in vec3 aPos; in vec3 aNormal; in vec2 aUV; in vec2 aUV1; in vec2 aUV2;
uniform mat4 uMV, uProj;
out vec3 vN, vP; out vec2 vUV, vUV1, vUV2;
void main(){ vec4 p = uMV * vec4(aPos,1.0); vP = p.xyz;
  vN = mat3(uMV) * aNormal; vUV = aUV; vUV1 = aUV1; vUV2 = aUV2; gl_Position = uProj * p; }`;
// Fixed-function-equivalent lighting, per RENDER.md §8: per-light diffuse
// only (no per-light ambient), light-model ambient from the scene, and the
// LWO surface's own diffuse coefficient. No hardcoded fill light — pene has
// AmbientIntensity 0, so anything facing away from its single distant light
// is genuinely black, and an invented ambient floor would wash it out.
const FS = `#version 300 es
precision highp float;
in vec3 vN, vP; in vec2 vUV, vUV1, vUV2; out vec4 o;
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
uniform bool uTexGen0;               // unit-0 GL_SPHERE_MAP texgen (mask 0x80)
uniform bool uFogOn; uniform vec3 uFogColor; uniform vec2 uFogRange;
// GL_SPHERE_MAP exactly as the fixed-function pipeline derives it, from the
// eye-space normal and the eye vector.
vec2 sphereMap(vec3 n, vec3 p){
  vec3 u = normalize(p);
  vec3 r = u - 2.0 * n * dot(n, u);
  float m = 2.0 * sqrt(r.x*r.x + r.y*r.y + (r.z + 1.0)*(r.z + 1.0));
  return vec2(r.x/m + 0.5, r.y/m + 0.5);
}
void main(){
  // Mask 7 (COLR+DIFF+LUMI) draws a SECOND additive pass carrying only the
  // LUMI texture, on its own UV set (RENDER.md §4.5, mat[+0x60] = 1).
  // Pass 1 (mask 7) is NOT a bare additive blit (RENDER.md §13.4): it
  // modulates by glColor, samples its OWN third UV set, writes depth, and is
  // still fogged — material[+0x6a] is never written by the SURF builder, so
  // fog stays on. That last one bites higherbiing, the only one of the three
  // mask-7 parts with FogType 1.
  vec3 pass1 = uColor * texture(uTex1, vUV2).rgb;
  vec3 n = normalize(vN);                       // GL_NORMALIZE equivalent
  if (uTwoSided && !gl_FrontFacing) n = -n;
  // MASK 0x80 — a reflection image and NOTHING else. The engine binds the
  // sphere map to texture unit ZERO (0x42bd1e: setTexCount(1),
  // setTexture(unit 0, refl), setTexGen(unit 0, SPHERE_MAP)), and unit 0's env
  // mode is unconditionally GL_MODULATE (§4.4 @0x40c231). So on these surfaces
  // the reflection MULTIPLIES the lit colour; it is only ADDED when it lands on
  // unit 1, which happens for mask 0x81 (a colour texture as well).
  vec2 uv0 = uTexGen0 ? sphereMap(n, vP) : vUV;
  // PRIMARY COLOUR FIRST, then the texture stages — the order the
  // fixed-function pipeline runs in, and it matters because the material's
  // GL_AMBIENT is not the diffuse colour. The SURF builder stores
  // 0x437f0000 = 255.0 into material[+0x04/+0x08/+0x0c] unconditionally
  // (0x42b90b-0x42b937), so **GL_AMBIENT = (1,1,1) for every surface in the
  // demo**, and GL_EMISSION is never written. Only GL_DIFFUSE carries K.
  // Folding the ambient into K (col = K*(amb + sum)) attenuated the light-model
  // ambient by the surface colour, which is wrong wherever AmbientIntensity is
  // non-zero — paleksi 0.515, rad_out 0.54, viherio 0.22 (RENDER.md §13.2.1).
  vec3 col;
  if (uUnlit) {
    col = uColor;                               // glColor4f(K), lighting off
  } else {
    vec3 diff = vec3(0.0);
    for (int i = 0; i < MAXL; i++) {
      if (i >= uNumLights) break;
      diff += uLightColor[i] * max(dot(n, uLightDir[i]), 0.0);
    }
    col = uAmbient + uColor * diff;             // 1*lmAmbient + K*sum(N.L)*Lc
  }
  // Unit 0 is always GL_MODULATE, and it modulates the whole primary colour —
  // the ambient term included.
  if (uHasTex) col *= texture(uTex, uv0).rgb;
  // Unit 1: GL_MODULATE for a DIFF texture (mask 5), GL_ADD for LUMI (mask 3).
  if (uHasTex1) {
    vec3 t1 = texture(uTex1, vUV1).rgb;
    if (uTex1Add) col += t1; else col *= t1;
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
  if (uHasEnv) col += texture(uEnv, sphereMap(n, vP)).rgb;
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
  if (uPass1) col = pass1;
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
const uTexGen0 = gl.getUniformLocation(prog, 'uTexGen0');

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
    }
  });
  // Face-normal accumulation, factored out because a morphed mesh has to redo
  // it every frame (the deltas are large enough on silli to change the shading
  // completely, not just the silhouette).
  const buildNormals = (pts, out) => {
    out.fill(0);
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t], b = idx[t+1], c = idx[t+2];
      const ax = pts[a*3], ay = pts[a*3+1], az = pts[a*3+2];
      const ux = pts[b*3]-ax, uy = pts[b*3+1]-ay, uz = pts[b*3+2]-az;
      const vx = pts[c*3]-ax, vy = pts[c*3+1]-ay, vz = pts[c*3+2]-az;
      const nx = uy*vz - uz*vy, ny = uz*vx - ux*vz, nz = ux*vy - uy*vx;
      for (const k of [a, b, c]) { out[k*3] += nx; out[k*3+1] += ny; out[k*3+2] += nz; }
    }
    for (let i = 0; i < n; i++) {
      const l = Math.hypot(out[i*3], out[i*3+1], out[i*3+2]) || 1;
      out[i*3] /= l; out[i*3+1] /= l; out[i*3+2] /= l;
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
  const mkBuf = (data) => {
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return b;
  };
  const posBuf = mkBuf(P), nrmBuf = mkBuf(nrm);
  const uvFor = (blk) => {
    const a = new Float32Array(n * 2);
    if (blk && blk.projection === 5) {
      // PROJ 5 is UV MAPPING: coordinates come from the named TXUV VMAP, not
      // from geometry. `v` is FLIPPED (v = 1 - uv.v) — the only projection
      // mode that flips (RENDER.md §10.3). All 60 PROJ-5 blocks in the
      // archive belong to KaivoalieniRadOut / hirbiRadBack / rad_out, so
      // omitting this mode planar-projected those three objects entirely.
      const map = layer.uvMaps?.[blk.uvMap] ??
        Object.values(layer.uvMaps ?? {}).find((m) => m.type === 'TXUV');
      if (map) for (const [pt, vals] of map.entries) {
        if (pt < n) { a[pt*2] = vals[0]; a[pt*2+1] = 1 - vals[1]; }
      }
    } else if (blk) {
      for (let i = 0; i < n; i++) {
        const [u, v] = projectUV(P[i*3], P[i*3+1], P[i*3+2], blk);
        a[i*2] = u; a[i*2+1] = v;
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

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const attach = (loc, buf, size) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    };
    attach(0, posBuf, 3); attach(1, nrmBuf, 3);
    attach(2, uvFor(bColr), 2);
    attach(3, uvFor(bSecond ?? bColr), 2);
    attach(4, uvFor(bPass1 ?? bSecond ?? bColr), 2);
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
    buildNormals(morphed, nrm);
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf); gl.bufferData(gl.ARRAY_BUFFER, morphed, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, nrmBuf); gl.bufferData(gl.ARRAY_BUFFER, nrm, gl.DYNAMIC_DRAW);
  };
  return { parts, count: idx.length, centre: [0,1,2].map((k) => (mn[k] + mx[k]) / 2),
           morphMaps, applyMorph: morphed ? applyMorph : null };
}

gl.bindAttribLocation(prog, 0, 'aPos');
gl.bindAttribLocation(prog, 1, 'aNormal');
gl.bindAttribLocation(prog, 2, 'aUV');
gl.bindAttribLocation(prog, 3, 'aUV1');
gl.bindAttribLocation(prog, 4, 'aUV2');

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
async function loadTexture(file, dir = TEXDIR) {
  const key = dir + file;
  if (texCache.has(key)) return texCache.get(key);
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

// Hair (RENDER.md §11): GL_LINES, additive, culling off, depth writes ON.
// Shading normals are recomputed per frame from the first light and are
// shading-only; drawn here with the file's DiffuseColor under the additive
// blend, which is what carries the look.
const HAIR_VS = `#version 300 es
in vec3 aPos; uniform mat4 uMV, uProj;
void main(){ gl_Position = uProj * uMV * vec4(aPos,1.0); }`;
const HAIR_FS = `#version 300 es
precision highp float; out vec4 o; uniform vec3 uHairColor;
void main(){ o = vec4(uHairColor, 1.0); }`;
const hairProg = gl.createProgram();
gl.attachShader(hairProg, sh(gl.VERTEX_SHADER, HAIR_VS));
gl.attachShader(hairProg, sh(gl.FRAGMENT_SHADER, HAIR_FS));
gl.bindAttribLocation(hairProg, 0, 'aPos');
gl.linkProgram(hairProg);

// Particles (RENDER.md §11): GL_QUADS billboards, additive, depth test on
// with depthMask(FALSE). Only Part_Pehko uses the system, cloning ONE system
// per hair node.
const PAR_VS = `#version 300 es
in vec3 aPos; in vec2 aUV; in float aAlpha;
uniform mat4 uMV, uProj; out vec2 vUV; out float vA;
void main(){ vUV = aUV; vA = aAlpha; gl_Position = uProj * uMV * vec4(aPos,1.0); }`;
const PAR_FS = `#version 300 es
precision highp float; in vec2 vUV; in float vA; out vec4 o;
uniform sampler2D uTex; uniform vec3 uTint;
void main(){ o = vec4(texture(uTex, vUV).rgb * vA * uTint, 1.0); }`;
const parProg = gl.createProgram();
gl.attachShader(parProg, sh(gl.VERTEX_SHADER, PAR_VS));
gl.attachShader(parProg, sh(gl.FRAGMENT_SHADER, PAR_FS));
gl.bindAttribLocation(parProg, 0, 'aPos');
gl.bindAttribLocation(parProg, 1, 'aUV');
gl.bindAttribLocation(parProg, 2, 'aAlpha');
gl.linkProgram(parProg);

// Picture — a 2D sprite in a virtual 640x480 ortho, used by Part_Empt's
// stamping and by the loading screens. Alpha comes from a SEPARATE `_a`
// image as (R+G+B)/3 (RENDER.md §8), and material transparency scales it
// (mode 3 = SRC_ALPHA / ONE_MINUS_SRC_ALPHA).
const PIC_VS = `#version 300 es
const vec2 P[4] = vec2[4](vec2(0.,0.), vec2(1.,0.), vec2(0.,1.), vec2(1.,1.));
uniform vec4 uRect;                  // x, y, w, h in virtual 640x480 pixels
out vec2 vUV;
void main(){
  vec2 q = P[gl_VertexID];
  // NOT V-flipped: the engine's Picture quad maps the image top-to-bottom
  // down the screen, so design1.tga's typography (which sits in the upper
  // part of the image) lands at the BOTTOM of the quad — which is where the
  // capture shows it.
  vUV = q;
  vec2 px = uRect.xy + q * uRect.zw;
  gl_Position = vec4(px.x / 320.0 - 1.0, 1.0 - px.y / 240.0, 0., 1.);
}`;
const PIC_FS = `#version 300 es
precision highp float; in vec2 vUV; out vec4 o;
uniform sampler2D uTex, uAlphaTex; uniform float uOpacity; uniform bool uHasAlpha;
void main(){
  vec3 c = texture(uTex, vUV).rgb;
  vec3 a = uHasAlpha ? texture(uAlphaTex, vUV).rgb : vec3(1.0);
  o = vec4(c, ((a.r + a.g + a.b) / 3.0) * uOpacity);
}`;
const picProg = gl.createProgram();
gl.attachShader(picProg, sh(gl.VERTEX_SHADER, PIC_VS));
gl.attachShader(picProg, sh(gl.FRAGMENT_SHADER, PIC_FS));
gl.linkProgram(picProg);
const picVao = gl.createVertexArray();

function drawPicture(tex, alphaTex, x, y, w, h, opacity) {
  gl.useProgram(picProg);
  gl.bindVertexArray(picVao);
  gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.uniform1i(gl.getUniformLocation(picProg, 'uTex'), 0);
  if (alphaTex) { gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, alphaTex); }
  gl.uniform1i(gl.getUniformLocation(picProg, 'uAlphaTex'), 1);
  gl.uniform1i(gl.getUniformLocation(picProg, 'uHasAlpha'), alphaTex ? 1 : 0);
  gl.uniform1f(gl.getUniformLocation(picProg, 'uOpacity'), opacity);
  gl.uniform4f(gl.getUniformLocation(picProg, 'uRect'), x, y, w, h);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.disable(gl.BLEND); gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE);
  gl.useProgram(prog);
}

const bgProg = gl.createProgram();
gl.attachShader(bgProg, sh(gl.VERTEX_SHADER, BG_VS));
gl.attachShader(bgProg, sh(gl.FRAGMENT_SHADER, BG_FS));
gl.linkProgram(bgProg);
const bgVao = gl.createVertexArray();

(async () => {
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
      const mask80 = !!reflTex && s.blocks.length === 0;
      const tex = mask80 ? reflTex : await texOf(blk);
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
        blendMode: (s.additiveTransparency ?? 0) > 0.95 ? 1
                 : (s.transparency ?? 0) > 0.95 ? 1
                 : (s.transparency ?? 0) > 0 ? 3 : 0,
        // LWO TRAN is transparency, so alpha is its complement. SIDE 3 is
        // double-sided: culling off and normals flipped on back faces.
        alpha: (s.transparency ?? 0) > 0.95 ? 1 : 1 - (s.transparency ?? 0),
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

  let textured = 0, hairLines = 0, particleCount = 0, camIndex = 0, zoomAt = 0, fovX = 0;
  const emptRand = msvcRand();
  let emptTex = null, emptAlphaTex = null;
  if (/^empt$/i.test(SCENE)) {
    const PICS = 'work/unpacked/lapsus_dat/data/pics/';
    try { emptTex = await loadTexture('design1.tga', PICS); } catch {}
    try { emptAlphaTex = await loadTexture('design1_a.tga', PICS); } catch {}
  }

  // ONE FRAME of the demo, at time `T`. Feedback parts call this repeatedly
  // without clearing so the buffer accumulates, which is what the original
  // gets for free from the swap chain (RENDER.md §12): Silli clears depth
  // only and lays a 20% black quad, Pehko clears nothing and uses 5%, Empt
  // clears exactly once in the whole process, and Viherio's strobe gates the
  // CLEAR rather than the draw. No FBO is needed — the default framebuffer
  // persists across draw calls within a page load.
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

  let camWorld = cam ? worldMatrix(cam, T) : M.ident();
  if (camShift[0] || camShift[1] || camShift[2] || camOverwriteZ != null) {
    camWorld = new Float32Array(camWorld);
    camWorld[12] += camShift[0]; camWorld[13] += camShift[1]; camWorld[14] += camShift[2];
    if (camOverwriteZ != null) camWorld[14] += camOverwriteZ;
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
  const FEEDBACK = { silli: 0.20, pehko: 0.05, empt: 0.10 };
  const fbAlpha = FEEDBACK[SCENE] ?? null;
  // Silli clears DEPTH only; Pehko and Empt clear nothing once running.
  if (clearColour) gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  else gl.clear(gl.DEPTH_BUFFER_BIT);

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

  if (fbAlpha != null) drawFade('in', 3, 1 - fbAlpha);   // black quad at fbAlpha

  gl.uniformMatrix4fv(uProj, false, proj);
  gl.uniform1i(gl.getUniformLocation(prog, 'uTex'), 0);
  gl.uniform1i(uEnv, 2);
  gl.uniform1i(gl.getUniformLocation(prog, 'uTex1'), 1);

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
  textured = 0;
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
      gl.uniform1i(uTexGen0, mat.texGen0 ? 1 : 0);
      gl.activeTexture(gl.TEXTURE0);
      if (mat.tex) { gl.bindTexture(gl.TEXTURE_2D, mat.tex); textured++; }
      if (mat.tex1) { gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, mat.tex1); }
      if (mat.envTex) { gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, mat.envTex); }
      gl.bindVertexArray(part.vao);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, part.ib);
      gl.drawElements(gl.TRIANGLES, part.count, gl.UNSIGNED_INT, 0);
      // mask 7: second, additive pass carrying only the LUMI texture
      if (mat.texPass1 && !NOPASS1) {
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
        gl.depthMask(true);                       // pass 1 WRITES depth
        gl.uniform1i(uPass1, 1);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, mat.texPass1);
        gl.drawElements(gl.TRIANGLES, part.count, gl.UNSIGNED_INT, 0);
        gl.uniform1i(uPass1, 0);
        if (!blended) { gl.disable(gl.BLEND); gl.depthMask(true); }
      }
    }
  }
  gl.disable(gl.BLEND); gl.depthMask(true);

  // ---- hair. `AddNullObject Hair_<name>` binds that null to
  // data/hairs/<name>.txt; every strand shares ONE root, the null's world
  // origin, so the animated nulls drive the hair purely by parenting.
  const hairNodes = [];        // emitter positions for the particle systems
  for (const nullObj of scene.objects.filter((o) => /^Hair_/.test(o.name ?? ''))) {
    const name = nullObj.name.replace(/^Hair_/, '');
    let txt;
    try { txt = await (await fetch(DATA + 'hairs/' + name + '.txt')).text(); } catch { continue; }
    if (!txt || /^\s*$/.test(txt) || /not found/i.test(txt)) continue;
    const h = parseHair(txt);
    if (!h.hairCount || !h.nodesPerHair) continue;
    const w = worldMatrix(nullObj, T);
    const root = [w[12], w[13], w[14]];
    const strands = simulate(buildStrands(h), root, h.gravity, T);
    const verts = toLines(strands, root);
    if (/^pehko$/i.test(SCENE))
      for (const st of strands) for (let i = 1; i < st.nodes.length; i++) hairNodes.push(st.nodes[i].pos);
    hairLines += verts.length / 6;

    gl.useProgram(hairProg);
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.uniformMatrix4fv(gl.getUniformLocation(hairProg, 'uMV'), false, view);
    gl.uniformMatrix4fv(gl.getUniformLocation(hairProg, 'uProj'), false, proj);
    gl.uniform3f(gl.getUniformLocation(hairProg, 'uHairColor'),
      h.diffuseColor[0] / 255, h.diffuseColor[1] / 255, h.diffuseColor[2] / 255);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    gl.depthMask(true);
    // NB the engine sets glLineWidth(3); WebGL2 implementations generally
    // clamp line width to 1, so the hair renders thinner than the original.
    gl.lineWidth(3);
    gl.drawArrays(gl.LINES, 0, verts.length / 3);
    gl.disable(gl.BLEND); gl.enable(gl.CULL_FACE);
    gl.useProgram(prog);
  }

  // ---- Part_Empt: no LW::Scene at all — its content IS this stamping
  // routine (RENDER.md §12.1). Three mutually exclusive phases whose timers
  // run in sequence and sum to 1.3 + 8.0 + 3.7 = 13.0s, exactly its slot.
  // `rand01` draws from the shared MSVC stream. All coordinates are in the
  // virtual 640x480 space and are TRUNCATED, and note phase C's y uses a
  // MINUS (screen y grows downward).
  if (/^empt$/i.test(SCENE) && emptTex) {
    const r01 = () => emptRand() * (1 / 32767);
    const stamp = (x, y, op) =>
      drawPicture(emptTex, emptAlphaTex, Math.trunc(x), Math.trunc(y), 256, 256, op);
    if (T < 1.3) {                                    // phase A
      drawFade('in', 3, 1 - 0.1);                     // black veil at alpha 0.1
      const X = 8 * T - 8, A = X * X;
      const N = Math.max(1, Math.trunc((X - 2.0) * 3.0));
      for (let i = 0; i < N; i++)
        stamp((r01() - 0.5) * A + 50.0, (r01() - 0.5) * A + 180.0, r01());
    } else if (T < 9.3) {                             // phase B
      drawFade('in', 3, 1 - 0.1);
      const J = 5.759998321533203;                    // = X^2 at t0 = 1.3
      stamp((r01() - 0.5) * J + 50.0, (r01() - 0.5) * J + 180.0, r01());
    } else {                                          // phase C
      const d = T - 9.3;
      drawFade('in', 3, 1 - (0.9 - 0.05 * d));        // veil deepens with d
      const Y = 8 * d + 2.4, A2 = 1.5 * Y * Y;
      const N = Math.max(1, Math.trunc(28 * d + 1.4));
      for (let i = 0; i < N; i++) {
        const ang = 0.7853981852531433 + 2.094395160675049 * (r01() - 0.5);
        const rr = (r01() - 0.1) * A2;
        stamp(50.0 + rr * Math.cos(ang), 180.0 - rr * Math.sin(ang), r01());
      }
    }
  }

  // ---- particles. Part_Pehko clones one system per hair node; the emitter
  // positions are therefore the simulated hair nodes, which is why this runs
  // after the hair above.
  if (hairNodes.length) {
    let ptxt = null;
    try { ptxt = await (await fetch(DATA + 'particles/tauno/tauno.txt')).text(); } catch {}
    if (ptxt && !/not found/i.test(ptxt)) {
      const pp = parseParticles(ptxt);
      const rand = msvcRand();
      // camera forward axis in world space, for the billboard basis
      const camZ = [camWorld[8], camWorld[9], camWorld[10]];
      const byFrame = new Map();
      for (const node of hairNodes) {
        for (const q of simulateSystem(pp, node, T, 1 / 60, rand)) {
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
      // RENDER.md §11.4: the tint computes to r in [0.0135,0.017] and
      // g,b in [0.010,0.0125] — only ~1.5% additive contribution per sprite,
      // which is what keeps 720 overlapping sprites from blowing out. The
      // bytes were unambiguous but wanted a capture check; this is it.
      gl.uniform3f(gl.getUniformLocation(parProg, 'uTint'), 0.0153, 0.0113, 0.0113);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      gl.depthMask(false); gl.disable(gl.CULL_FACE);
      gl.activeTexture(gl.TEXTURE0);
      for (const [f, list] of byFrame) {
        let tex = null;
        try {
          tex = await loadTexture(`epes${String(f).padStart(3, '0')}.jpg`,
                                  'work/unpacked/lapsus_dat/data/particles/tauno/');
        } catch { continue; }
        gl.bindTexture(gl.TEXTURE_2D, tex);
        const pos = [], uv = [], al = [];
        for (const q of list) {
          const c = billboard(q, camZ);
          const uvs = [[0,1],[1,1],[1,0],[0,0]];
          for (const i of [0,1,2, 0,2,3]) {          // quad -> 2 triangles
            pos.push(...c[i]); uv.push(...uvs[i]); al.push(q.alpha);
          }
        }
        const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
        const put = (loc, data, size) => { const b = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, b);
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
          gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0); };
        put(0, pos, 3); put(1, uv, 2); put(2, al, 1);
        gl.drawArrays(gl.TRIANGLES, 0, pos.length / 3);
      }
      gl.disable(gl.BLEND); gl.depthMask(true); gl.enable(gl.CULL_FACE);
      gl.useProgram(prog);
    }
  }

  };   // end renderAt

  // Feedback parts replay a short window of frames so the trail exists; the
  // window only needs to cover the decay (0.8^n for Silli reaches ~1% in ~20
  // frames), not the whole part. Everything else renders exactly one frame.
  const FB_WINDOW = { silli: 0.5, pehko: 0.5, empt: 0.5 };
  // Viherio is NOT continuous feedback: its strobe suppresses the clear only
  // inside 14 specific windows (table at 0x463c2c, every onset an exact
  // multiple of 0.110794005s on a 64-unit cycle of 7.090816327s). Treating it
  // as always-accumulating cost it 0.488 -> 0.155, so it renders normally
  // until the table is implemented properly.
  const VIHERIO_ONSETS = [0, 0.886352062, 1.218734026, 1.551116109, 1.994292140,
    2.659056187, 2.991438150, 3.323820114, 3.766996145, 4.431760311, 4.764142036,
    5.096524239, 5.539700031, 6.426052094];
  const VIHERIO_CYCLE = 7.090816326530613;
  let win = FB_WINDOW[SCENE];
  if (/^viherio$/i.test(SCENE)) {
    const phase = T % VIHERIO_CYCLE;
    win = VIHERIO_ONSETS.some((e) => phase >= e && phase < e + 0.1) ? 0.12 : undefined;
  }
  if (win) {
    const dt = 1 / 60, n = Math.max(1, Math.round(win / dt));
    for (let i = n; i >= 0; i--) {
      const t = Math.max(0, T - i * dt);
      await renderAt(t, i === n);          // clear only on the first of the window
    }
  } else {
    await renderAt(T, true);
  }

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
    scene: SCENE, t: T, camera: camIndex, objects: drawables.length,
    triangles: drawables.reduce((a, d) => a + d.mesh.count / 3, 0),
    texturedGroups: textured, hairLines, particleCount,
    zoom: zoomAt, fovXdeg: fovX * 180 / Math.PI, near: NEAR,
    glError: gl.getError(),
  };
  window.__lapsusReady = true;
})().catch((e) => {
  window.__lapsusError = String(e.message ?? e);
  window.__lapsusReady = true;
});
