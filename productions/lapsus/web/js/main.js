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
in vec3 aPos; in vec3 aNormal;
uniform mat4 uMV, uProj;
out vec3 vN, vP;
void main(){ vec4 p = uMV * vec4(aPos,1.0); vP = p.xyz;
  vN = mat3(uMV) * aNormal; gl_Position = uProj * p; }`;
const FS = `#version 300 es
precision highp float;
in vec3 vN, vP; out vec4 o;
uniform vec3 uColor;
void main(){
  vec3 n = normalize(vN);                       // GL_NORMALIZE equivalent
  if (!gl_FrontFacing) n = -n;
  float d = max(dot(n, normalize(vec3(0.3,0.6,1.0))), 0.0);
  o = vec4(uColor * (0.18 + 0.82*d), 1.0);
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

// Build interleaved pos+normal from an LWO layer. LWO ships no normals, so
// they are accumulated per-vertex from face normals (area weighted). Smoothing
// groups (SMAN) are ignored at this stage.
function meshFromLayer(layer) {
  const P = layer.points, n = P.length / 3;
  const nrm = new Float32Array(P.length);
  const idx = [];
  for (const poly of layer.polygons) {
    if (poly.length < 3) continue;                       // 2-vertex = spline guide
    for (let i = 1; i + 1 < poly.length; i++) {
      const a = poly[0], b = poly[i], c = poly[i + 1];
      idx.push(a, b, c);
      const ax = P[a*3], ay = P[a*3+1], az = P[a*3+2];
      const ux = P[b*3]-ax, uy = P[b*3+1]-ay, uz = P[b*3+2]-az;
      const vx = P[c*3]-ax, vy = P[c*3+1]-ay, vz = P[c*3+2]-az;
      const nx = uy*vz - uz*vy, ny = uz*vx - ux*vz, nz = ux*vy - uy*vx;
      for (const k of [a, b, c]) { nrm[k*3] += nx; nrm[k*3+1] += ny; nrm[k*3+2] += nz; }
    }
  }
  for (let i = 0; i < n; i++) {
    const l = Math.hypot(nrm[i*3], nrm[i*3+1], nrm[i*3+2]) || 1;
    nrm[i*3] /= l; nrm[i*3+1] /= l; nrm[i*3+2] /= l;
  }
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const pb = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, pb); gl.bufferData(gl.ARRAY_BUFFER, P, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  const nb = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, nb); gl.bufferData(gl.ARRAY_BUFFER, nrm, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
  const ib = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(idx), gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  return { vao, count: idx.length };
}

gl.bindAttribLocation(prog, 0, 'aPos');
gl.bindAttribLocation(prog, 1, 'aNormal');

(async () => {
  const scene = parseLWS(await (await fetch(DATA + SCENE + '.lws')).text());
  const drawables = [];
  for (const obj of scene.objects) {
    if (!obj.file) continue;                              // null objects: transform only
    const url = ROOT + 'work/unpacked/lapsus_dat/' + obj.file.replace(/\\/g, '/');
    const lwo = parseLWO(new Uint8Array(await (await fetch(url)).arrayBuffer()));
    for (const layer of lwo.layers) {
      if (!layer.points || !layer.polygons.length) continue;
      drawables.push({ item: obj, mesh: meshFromLayer(layer) });
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

  gl.uniformMatrix4fv(uProj, false, proj);
  for (const d of drawables) {
    gl.uniformMatrix4fv(uMV, false, M.mul(view, worldMatrix(d.item, T)));
    gl.uniform3f(uColor, 0.72, 0.74, 0.78);
    gl.bindVertexArray(d.mesh.vao);
    gl.drawElements(gl.TRIANGLES, d.mesh.count, gl.UNSIGNED_INT, 0);
  }
  gl.finish();

  window.__lapsusInfo = {
    scene: SCENE, t: T, objects: drawables.length,
    triangles: drawables.reduce((a, d) => a + d.mesh.count / 3, 0),
    zoom: zoomAt, fovXdeg: fovX * 180 / Math.PI, near: NEAR,
    glError: gl.getError(),
  };
  window.__lapsusReady = true;
})().catch((e) => {
  window.__lapsusError = String(e.message ?? e);
  window.__lapsusReady = true;
});
