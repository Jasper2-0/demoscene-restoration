// Please the Cookie Thing — scene-graph renderer.
// Faithful port of the "asysgl" fixed-function 3D engine from the original
// binary (see work/re/engine/FUNCTION_MAP.md / EFFECTS.md; decompiled sources
// work/re/out/ptct.c). Every generator / draw path is ported from the named
// FUN_ address; deviations are commented at the site.
//
// Time base everywhere: 1 tick = 0.25 ms.

import { Mat4, DEG2RAD, srand, rand, RAND_MAX } from './mathlib.js';

// Re-exports for effect modules: MSVC-exact CRT rand (mathlib) plus the
// engine's own LCG "rand31" (FUN_004119a0): seed = seed*0x41c64e6d + 0x3093;
// return seed >>> 16  (16-bit result, NO 0x7fff mask — differs from CRT rand).
export { srand, rand, RAND_MAX, Mat4, DEG2RAD };

let seed31 = 0; // DAT_0041d488 lives in BSS → starts at 0
export function srand31(s) { seed31 = s | 0; }
export function rand31() {
  seed31 = (Math.imul(seed31, 0x41c64e6d) + 0x3093) | 0;
  return (seed31 >>> 16) & 0xffff;
}

// unpackColor (FUN_00418830): 0xAARRGGBB → floats. NOTE the original scales by
// 1/256 (DAT_0041aa6c = 0.00390625), so 0xff maps to 0.99609375, not 1.0.
const INV256 = 1 / 256;
export function unpackColor(argb) {
  return [
    ((argb >>> 16) & 0xff) * INV256,
    ((argb >>> 8) & 0xff) * INV256,
    (argb & 0xff) * INV256,
    ((argb >>> 24) & 0xff) * INV256,
  ];
}

// ---------------------------------------------------------------------------
// Mesh (Mesh::ctor FUN_00416770 / FUN_00416820 defaults)
//
// Layout notes (effects mutate these arrays in place and rely on them):
//  - verts:  Float32Array(nVerts*3)   [x,y,z]
//  - colors: Float32Array(nVerts*4)   RGBA, init 1.0 (baked lighting target)
//  - faces:  Uint32Array(nFaces*3)    vertex indices (triangles)
//  - uvs:    Float32Array(nFaces*6)   PER-FACE-CORNER uvs [u0,v0,u1,v1,u2,v2]
//            (the original stores uvs inside each 0x30-byte face record, NOT
//            per vertex — generators and effects depend on this layout)
//  - quad cubes (isQuadCube=1, genCube only): faces Uint32Array(nFaces*4),
//    uvs Float32Array(nFaces*8)
// ---------------------------------------------------------------------------

export class Mesh {
  constructor(nVerts, nFaces, tex = null) {
    this.nVerts = nVerts;
    this.nFaces = nFaces;
    this.tex = tex;               // +0x38 (WebGL texture object, not an id)
    this.pos = [0, 0, 0];         // +4..0xC  translation
    this.rot = [0, 0, 0];         // +0x10..0x18 rotation degrees X,Y,Z
    this.verts = new Float32Array(nVerts * 3);      // +0x24
    this.colors = new Float32Array(nVerts * 4).fill(1); // +0x1c
    this.normals = new Float32Array(nVerts * 3);    // +0x20 (averaged)
    this.faceNormals = new Float32Array(nFaces * 3); // +0x2c (unnormalized)
    this.faces = new Uint32Array(nFaces * 3);       // +0x30 (indices)
    this.uvs = new Float32Array(nFaces * 6);        // +0x30 (uv part)
    this.colorARGB = 0xffffffff;  // +0x3c flat/wire color (ctor sets -1)
    this.drawMode = 4;            // +0x40 mask: 1 wire, 2 flat, 4 textured,
                                  //   8 points, 0x10..0x800 user callbacks
    this.texFxMask = 0;           // +0x44: 1 detail pass, 2 envmap, 4 flat col
    this.cull = 0;                // +0x45: 0 front(CW), 1 back(CCW), 2 off
    this.dynamic = 0;             // +0x46 recompute normals every frame
    this.alphaBlend = 0;          // +0x47
    this.additiveBlend = 0;       // +0x48
    this.isQuadCube = 0;          // +0x49
    this.detailTex = null;        // +0x4c (null → default radial spot)
    this.fogDist = 0;             // +0x50 (0 = fog off)
    this.fogColorRGB = 0;         // +0x54 0xRRGGBB
    this.normalsValid = false;    // +0x58
    this.userData = null;         // free slot for effects
  }
  // Mesh::setPos (FUN_00416ee0) / setRot (FUN_004168d0)
  setPos(x, y, z) { this.pos[0] = x; this.pos[1] = y; this.pos[2] = z; }
  setRot(x, y, z) { this.rot[0] = x; this.rot[1] = y; this.rot[2] = z; }
}

// computeNormals (FUN_004168f0 + FUN_004169d0): face normal =
// cross(v1-v0, v2-v0) (unnormalized); vertex normal = average of adjacent
// face normals (also unnormalized — normalization happens in the sphere-map
// texgen, as fixed-function GL did). Called from drawMesh for every
// non-callback draw mode; recomputes when !normalsValid || dynamic, exactly
// like the original's gate. Feeds the detail/envmap sphere-map passes.
export function computeNormals(mesh) {
  if (mesh.normalsValid && !mesh.dynamic) return;
  const v = mesh.verts, f = mesh.faces, fn = mesh.faceNormals, n = mesh.normals;
  const counts = new Int32Array(mesh.nVerts);
  n.fill(0);
  for (let i = 0; i < mesh.nFaces; i++) {
    const i0 = f[i * 3] * 3, i1 = f[i * 3 + 1] * 3, i2 = f[i * 3 + 2] * 3;
    const ax = v[i1] - v[i0], ay = v[i1 + 1] - v[i0 + 1], az = v[i1 + 2] - v[i0 + 2];
    const bx = v[i2] - v[i0], by = v[i2 + 1] - v[i0 + 1], bz = v[i2 + 2] - v[i0 + 2];
    const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
    fn[i * 3] = nx; fn[i * 3 + 1] = ny; fn[i * 3 + 2] = nz;
    for (const k of [i0, i1, i2]) {
      n[k] += nx; n[k + 1] += ny; n[k + 2] += nz;
      counts[k / 3]++;
    }
  }
  for (let i = 0; i < mesh.nVerts; i++) {
    const c = counts[i];
    if (c) { n[i * 3] /= c; n[i * 3 + 1] /= c; n[i * 3 + 2] /= c; }
  }
  mesh.normalsValid = true;
}

// ---------------------------------------------------------------------------
// Scene (Scene::ctor FUN_004163c0)
// ---------------------------------------------------------------------------

export class Scene {
  constructor() {
    this.camera = {
      pos: [-100, -100, -100],  // Camera::ctor defaults (FUN_00416e70)
      target: [0, 0, 0],
      roll: 0,
      fov: 90,
    };
    this.objects = [];          // max 0x400 in the original
    this.lights = [];           // max 0x20: {color:[r,g,b], pos:[x,y,z], radius}
    this.tilted = false;        // +0x10 → gluLookAt up=(1,1,1) (eff1E only)
  }
  addObject(mesh) { this.objects.push(mesh); return mesh; }
  // Scene::addLight (FUN_004166d0): rgb is 0xRRGGBB (unpacked ×1/256)
  addLight(x, y, z, radius, rgb) {
    if (this.lights.length >= 0x20) return null;
    const [r, g, b] = unpackColor(rgb);
    const l = { color: [r, g, b], pos: [x, y, z], radius };
    this.lights.push(l);
    return l;
  }
}

// ---------------------------------------------------------------------------
// Geometry generators — ported EXACTLY (vertex order, uv assignment, winding).
// ---------------------------------------------------------------------------

// genGrid (FUN_00417400): (n+1)² verts flat XZ grid, y = 0, centered.
// Vertex index = row*(n+1)+col where x follows the ROW index and z the COLUMN.
export function genGrid(n, size, tex = null) {
  const nv = (n + 1) * (n + 1);
  const mesh = new Mesh(nv, n * n * 2, tex);
  const step = size / n, half = size * 0.5;
  const V = mesh.verts;
  let vi = 0;
  for (let j = 0; j <= n; j++) {         // outer → x
    for (let i = 0; i <= n; i++) {       // inner → z
      V[vi++] = j * step - half;
      V[vi++] = 0;
      V[vi++] = i * step - half;
    }
  }
  const F = mesh.faces, T = mesh.uvs, inv = 1 / n;
  let fi = 0, ti = 0;
  for (let j = 0; j < n; j++) {
    const v1coord = (j + 1) * inv, v0coord = j * inv;
    for (let i = 0; i < n; i++) {
      const v = j * (n + 1) + i;
      const u0 = i * inv, u1 = (i + 1) * inv;
      // face 1: [v, v+n+1, v+n+2]  uv [(u0,v0),(u0,v1),(u1,v1)]
      F[fi++] = v; F[fi++] = v + n + 1; F[fi++] = v + n + 2;
      T[ti++] = u0; T[ti++] = v0coord;
      T[ti++] = u0; T[ti++] = v1coord;
      T[ti++] = u1; T[ti++] = v1coord;
      // face 2: [v, v+n+2, v+1]  uv [(u0,v0),(u1,v1),(u1,v0)]
      F[fi++] = v; F[fi++] = v + n + 2; F[fi++] = v + 1;
      T[ti++] = u0; T[ti++] = v0coord;
      T[ti++] = u1; T[ti++] = v1coord;
      T[ti++] = u1; T[ti++] = v0coord;
    }
  }
  return mesh;
}

// genSphere (FUN_00417140): n×n lat/long sphere. Vertex j*n+i:
// lat angle j·π/(n−1) (cos → y), long angle i·2π/n.
export function genSphere(n, radius, tex = null) {
  const mesh = new Mesh(n * n, (n - 1) * n * 2, tex);
  const latStep = Math.PI / (n - 1), lonStep = (2 * Math.PI) / n;
  const V = mesh.verts;
  let vi = 0;
  for (let j = 0; j < n; j++) {
    const c = Math.cos(j * latStep), s = Math.sin(j * latStep);
    for (let i = 0; i < n; i++) {
      const a = i * lonStep;
      V[vi++] = Math.cos(a) * s * radius;
      V[vi++] = c * radius;
      V[vi++] = Math.sin(a) * s * radius;
    }
  }
  const F = mesh.faces, T = mesh.uvs;
  const invU = 1 / n, invV = 1 / (n - 1);
  let fi = 0, ti = 0;
  for (let j = 0; j < n - 1; j++) {
    const v0c = j * invV, v1c = (j + 1) * invV;
    for (let i = 0; i < n; i++) {
      const v = j * n + i;
      const wrap = ((i + 1) % n);
      const u0 = i * invU, u1 = (i + 1) * invU;
      // face 1: [v, (j+1)*n+wrap, j*n+wrap]  uv [(u0,v0),(u1,v1),(u1,v0)]
      F[fi++] = v; F[fi++] = (j + 1) * n + wrap; F[fi++] = j * n + wrap;
      T[ti++] = u0; T[ti++] = v0c;
      T[ti++] = u1; T[ti++] = v1c;
      T[ti++] = u1; T[ti++] = v0c;
      // face 2: [v, (j+1)*n+i, (j+1)*n+wrap]  uv [(u0,v0),(u0,v1),(u1,v1)]
      F[fi++] = v; F[fi++] = (j + 1) * n + i; F[fi++] = (j + 1) * n + wrap;
      T[ti++] = u0; T[ti++] = v0c;
      T[ti++] = u0; T[ti++] = v1c;
      T[ti++] = u1; T[ti++] = v1c;
    }
  }
  return mesh;
}

// genTube (FUN_00417650): nAround verts per ring × nRings rings along Y,
// centered (y from −length/2 to +length/2). x = sin·r, z = cos·r.
// Original call sites: genTube(26, 3, 300, 5000, tex) etc. — first arg is
// verts-around, second is ring count.
export function genTube(nAround, nRings, radius, length, tex = null) {
  const mesh = new Mesh(nAround * nRings, (nRings - 1) * nAround * 2, tex);
  const V = mesh.verts, lonStep = (2 * Math.PI) / nAround;
  const half = length * 0.5, yStep = length / (nRings - 1);
  let vi = 0;
  for (let j = 0; j < nRings; j++) {
    for (let i = 0; i < nAround; i++) {
      const a = i * lonStep;
      V[vi++] = Math.sin(a) * radius;
      V[vi++] = yStep * j - half;
      V[vi++] = Math.cos(a) * radius;
    }
  }
  const F = mesh.faces, T = mesh.uvs;
  const invU = 1 / nAround, invV = 1 / (nRings - 1);
  let fi = 0, ti = 0;
  for (let j = 0; j < nRings - 1; j++) {
    const base = j * nAround;
    const v0c = j * invV, v1c = (j + 1) * invV;
    for (let i = 0; i < nAround; i++) {
      const wrap = (i + 1) % nAround;
      const u0 = i * invU, u1 = (i + 1) * invU;
      // face 1: [base+i, base+nAround+i, base+wrap]
      //         uv [(u0,v0),(u0,v1),(u1,v0)]
      F[fi++] = base + i; F[fi++] = base + nAround + i; F[fi++] = base + wrap;
      T[ti++] = u0; T[ti++] = v0c;
      T[ti++] = u0; T[ti++] = v1c;
      T[ti++] = u1; T[ti++] = v0c;
      // face 2: [base+wrap, base+nAround+i, base+nAround+wrap]
      //         uv [(u1,v0),(u0,v1),(u1,v1)]
      F[fi++] = base + wrap; F[fi++] = base + nAround + i;
      F[fi++] = base + nAround + wrap;
      T[ti++] = u1; T[ti++] = v0c;
      T[ti++] = u0; T[ti++] = v1c;
      T[ti++] = u1; T[ti++] = v1c;
    }
  }
  return mesh;
}

// genCube (FUN_00416f00): 8 verts, 6 QUAD faces, isQuadCube = 1 (loading
// screen only). faces = Uint32Array(6*4), uvs = Float32Array(6*8).
export function genCube(halfSize, tex = null) {
  const mesh = new Mesh(8, 6, tex);
  mesh.isQuadCube = 1;
  const s = halfSize, m = -halfSize;
  mesh.verts.set([
    m, m, m,  m, m, s,  m, s, m,  m, s, s,
    s, m, m,  s, m, s,  s, s, m,  s, s, s,
  ]);
  mesh.faces = new Uint32Array([
    2, 3, 1, 0,
    4, 5, 7, 6,
    6, 7, 3, 2,
    3, 7, 5, 1,
    4, 6, 2, 0,
    4, 0, 1, 5,
  ]);
  mesh.uvs = new Float32Array(6 * 8);
  for (let f = 0; f < 6; f++) {
    mesh.uvs.set([0, 0, 1, 0, 1, 1, 0, 1], f * 8);
  }
  return mesh;
}

// Deep copy — convenience for "hidden source" objects (the original simply
// runs the generator twice; both are equivalent).
export function cloneMesh(src) {
  const m = new Mesh(src.nVerts, src.nFaces, src.tex);
  m.verts.set(src.verts);
  m.colors.set(src.colors);
  m.faces = src.faces.slice();
  m.uvs = src.uvs.slice();
  for (const k of ['colorARGB', 'drawMode', 'texFxMask', 'cull', 'dynamic',
    'alphaBlend', 'additiveBlend', 'isQuadCube', 'detailTex', 'fogDist',
    'fogColorRGB']) m[k] = src[k];
  m.pos = src.pos.slice();
  m.rot = src.rot.slice();
  return m;
}

// ---------------------------------------------------------------------------
// Scene::computeVertexLighting (FUN_00416550):
// color.rgb = ambient + Σ_lights max(0, 1 − dist/radius) · lightRGB
// per vertex (world = vert + mesh.pos). NO upper clamp; alpha untouched.
// Skips objects with drawMode == 0 and lights with radius == 0.
// ambientARGB is a packed 0x00RRGGBB (unpacked ×1/256).
// ---------------------------------------------------------------------------
export function computeVertexLighting(scene, ambientARGB = 0) {
  const [ar, ag, ab] = unpackColor(ambientARGB >>> 0);
  for (const mesh of scene.objects) {
    if (!mesh || mesh.drawMode === 0 || mesh.nVerts <= 0) continue;
    const V = mesh.verts, C = mesh.colors;
    const px = mesh.pos[0], py = mesh.pos[1], pz = mesh.pos[2];
    for (let i = 0; i < mesh.nVerts; i++) {
      let r = ar, g = ag, b = ab;
      const wx = V[i * 3] + px, wy = V[i * 3 + 1] + py, wz = V[i * 3 + 2] + pz;
      for (const L of scene.lights) {
        if (L.radius === 0) continue;
        const dx = L.pos[0] - wx, dy = L.pos[1] - wy, dz = L.pos[2] - wz;
        let f = 1 - Math.sqrt(dx * dx + dy * dy + dz * dz) / L.radius;
        if (f < 0) f = 0;
        r += f * L.color[0]; g += f * L.color[1]; b += f * L.color[2];
      }
      C[i * 4] = r; C[i * 4 + 1] = g; C[i * 4 + 2] = b;
    }
  }
}

// ---------------------------------------------------------------------------
// Matrix helpers (gluPerspective / gluLookAt equivalents on mathlib Mat4)
// ---------------------------------------------------------------------------

function perspective(mat, fovyDeg, aspect, near, far) {
  const f = 1 / Math.tan((fovyDeg * DEG2RAD) / 2);
  const m = mat.m;
  m.fill(0);
  m[0] = f / aspect;
  m[5] = f;
  m[10] = (far + near) / (near - far);
  m[11] = -1;
  m[14] = (2 * far * near) / (near - far);
  return mat;
}

function lookAtMatrix(ex, ey, ez, cx, cy, cz, ux, uy, uz) {
  let fx = cx - ex, fy = cy - ey, fz = cz - ez;
  let l = Math.sqrt(fx * fx + fy * fy + fz * fz) || 1;
  fx /= l; fy /= l; fz /= l;
  // s = f × up
  let sx = fy * uz - fz * uy, sy = fz * ux - fx * uz, sz = fx * uy - fy * ux;
  l = Math.sqrt(sx * sx + sy * sy + sz * sz) || 1;
  sx /= l; sy /= l; sz /= l;
  // u = s × f
  const nux = sy * fz - sz * fy, nuy = sz * fx - sx * fz, nuz = sx * fy - sy * fx;
  const r = new Mat4();
  const m = r.m;
  m[0] = sx; m[4] = sy; m[8] = sz;
  m[1] = nux; m[5] = nuy; m[9] = nuz;
  m[2] = -fx; m[6] = -fy; m[10] = -fz;
  r.translate(-ex, -ey, -ez);
  return r;
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

// Indices whose raw 256×256 RGBA pixels are kept for CPU sampling
// (loadAllTextures FUN_00403620 keeps 7..12 — the cr_* credit images — and we
// additionally keep 14 (ptct.atg) per the port plan). 7..12 get NO GL texture
// in the original; we mirror that (textures[7..12] === null).
const RAW_KEEP = new Set([7, 8, 9, 10, 11, 12, 14]);
const NO_GL_TEX = (i) => i >= 7 && i <= 12;

export class Renderer {
  constructor(mgl, assets) {
    this.mgl = mgl;
    this.gl = mgl.gl;
    this.assets = assets;
    this.canvas = mgl.gl.canvas;

    // geometry supersampling multiplier (1 = original tessellation);
    // effects apply it only where the surface is analytic/continuous
    this.tess = assets.tess || 1;

    // --- textures (texture index table, EFFECTS.md) ---
    this.texNames = assets.texNames;
    this.textures = [];
    this.rawPixels = []; // {data:Uint8ClampedArray RGBA, width, height} | null
    assets.images.forEach((img, i) => {
      // raw pixels ALWAYS from the 1x bit-exact bake — the credits spray
      // samples the 256 grid as part of its choreography
      this.rawPixels[i] = RAW_KEEP.has(i) ? this._readPixels(img) : null;
      // GL textures prefer the supersampled remaster set when provided
      // (assets.imagesHi, e.g. 1024×1024); GL_LINEAR, no mipmaps, REPEAT
      const glImg = (assets.imagesHi && assets.imagesHi[i]) || img;
      this.textures[i] = NO_GL_TEX(i) ? null
        : mgl.createTextureFromImage(glImg, false, false);
    });

    // default detail/lightmap texture (makeDefaultDetailTex FUN_00418700):
    // 128×128 grayscale radial spot, r=g=b=v, a=v>>2. The exact falloff
    // expression is lost in the decompile (raw ftol()); we use a linear
    // radial falloff v = clamp(255·(1 − r/64)) — DEVIATION, visually a soft
    // round spot as documented.
    this.defaultDetailTex = this._makeDefaultDetail(128);

    // startup random table (asysInit fills 0x100 entries from rand31 with
    // seed starting at 0 — consumed before anything else uses rand31)
    this.randomTable = new Uint32Array(256);
    for (let i = 0; i < 256; i++) this.randomTable[i] = rand31();

    // drawMode user-callback slots (DAT_00481ef8..): maskBit → fn(mesh)
    // e.g. R.setDrawCallback(0x10, fn) for eff13, 0x20 for eff1C.
    this.drawCallbacks = new Map();

    // eye-space (modelview) matrix of the most recently drawn object — used
    // for CPU texgen (detail/envmap passes) and available to callbacks.
    this.eyeMatrix = new Mat4();

    this._tmpMat = new Mat4();

    // per-frame defaults once (glInit): depth LEQUAL, texturing on demand
    this.gl.depthFunc(this.gl.LEQUAL);
    this._resetFrameState();
  }

  // ----- texture helpers -----

  _readPixels(img) {
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, img.width, img.height);
    return { data: d.data, width: d.width, height: d.height };
  }

  // glTextureFromBuffer (FUN_00412300): RGBA, LINEAR, no mipmaps, REPEAT
  makeTextureFromRGBA(data, w, h) {
    const u8 = data instanceof Uint8Array ? data : new Uint8Array(data.buffer || data);
    return this.mgl.createTextureFromData(u8, w, h, false, false);
  }

  _makeDefaultDetail(n) {
    const buf = new Uint8Array(n * n * 4);
    const half = n / 2;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const dx = x - half, dy = y - half;
        let v = Math.round(255 * (1 - Math.sqrt(dx * dx + dy * dy) / half));
        if (v < 0) v = 0; else if (v > 255) v = 255;
        const o = (y * n + x) * 4;
        buf[o] = v; buf[o + 1] = v; buf[o + 2] = v; buf[o + 3] = v >> 2;
      }
    }
    return this.makeTextureFromRGBA(buf, n, n);
  }

  // ----- frame control -----

  // Letterbox scissor: glScissor(0, h/12, w, 5h/6) + SCISSOR_TEST (demoMain).
  // The original clears AFTER SwapBuffers (frameFlip); in WebGL the buffer is
  // presented when the rAF callback returns, so the "clear for the next
  // frame" necessarily happens at the START of the next frame — beginFrame
  // performs frameFlip's post-swap clear. Net semantics identical.
  beginFrame() {
    const gl = this.gl, mgl = this.mgl;
    const w = this.canvas.width, h = this.canvas.height;
    gl.viewport(0, 0, w, h);
    // frameFlip (FUN_004121f0): clear color+depth with scissor OFF
    gl.disable(gl.SCISSOR_TEST);
    gl.clearColor(0, 0, 0, 1);
    gl.depthMask(true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.scissor(0, Math.floor(h / 12), w, Math.floor((5 * h) / 6));
    gl.enable(gl.SCISSOR_TEST);
    this._resetFrameState();
    mgl.matricesDirty = true;
  }

  // frameFlip tail (FUN_00412270 / FUN_004122c0) — matrix + fog reset.
  _resetFrameState() {
    const mgl = this.mgl;
    mgl.matrixMode(mgl.PROJECTION);
    mgl.loadIdentity();
    perspective(mgl.cur, 90, 1, 2, 32768); // endFrameMatrix's gluPerspective(90,1,…)
    mgl.matricesDirty = true;
    mgl.matrixMode(mgl.MODELVIEW);
    mgl.loadIdentity();
    mgl.translate(0, 0, -0.1);
    mgl.enableFog(false);
    mgl.fogExpOff();
    mgl.color4(1, 1, 1, 1);
    mgl.enableTexture(false);
    mgl.enableBlend(false);
    mgl.enableDepthTest(true);
    this.gl.depthFunc(this.gl.LEQUAL);
  }

  // See beginFrame note: the buffer clear lives there; endFrame only resets
  // per-frame state (glFinish/SwapBuffers have no WebGL equivalent).
  endFrame() {
    this._resetFrameState();
  }

  blackout() {
    const gl = this.gl;
    gl.disable(gl.SCISSOR_TEST);
    gl.clearColor(0, 0, 0, 1);
    gl.depthMask(true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  // glClearColor(rgb)+glClear(COLOR|DEPTH) — eff0C clears to its fog color
  // (scissor stays enabled, as in the original).
  clearColorAndDepth(rgb) {
    const gl = this.gl;
    const [r, g, b] = unpackColor(rgb >>> 0);
    gl.clearColor(r, g, b, 1);
    gl.depthMask(true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  // glClear(GL_DEPTH_BUFFER_BIT) — used by eff12/eff0D/eff19/eff1A/eff1F
  clearDepth() {
    const gl = this.gl;
    gl.depthMask(true);
    gl.clear(gl.DEPTH_BUFFER_BIT);
  }

  // ----- scene graph -----

  createScene() { return new Scene(); }
  newMesh(nVerts, nFaces, tex = null) { return new Mesh(nVerts, nFaces, tex); }
  genGrid(n, size, tex) { return genGrid(n, size, tex); }
  genSphere(n, radius, tex) { return genSphere(n, radius, tex); }
  genTube(nAround, nRings, radius, length, tex) { return genTube(nAround, nRings, radius, length, tex); }
  genCube(halfSize, tex) { return genCube(halfSize, tex); }
  cloneMesh(m) { return cloneMesh(m); }
  computeVertexLighting(scene, ambientARGB = 0) { computeVertexLighting(scene, ambientARGB); }
  unpackColor(argb) { return unpackColor(argb); }
  setDrawCallback(maskBit, fn) { this.drawCallbacks.set(maskBit, fn); }
  currentEyeMatrix() { return this.eyeMatrix; }
  // Force-refresh mesh.normals after mutating verts (drawMesh does this
  // automatically for dynamic meshes; static meshes edited once can call
  // this, or just set mesh.normalsValid = false).
  recomputeNormals(mesh) { mesh.normalsValid = false; computeNormals(mesh); }

  // Scene::render (FUN_004164d0): draw every object with the scene camera.
  // cam may override scene.camera ({fov, pos:[x,y,z], target:[x,y,z], roll}).
  drawScene(scene, cam = scene.camera) {
    for (const obj of scene.objects) {
      if (obj) this.drawMesh(obj, cam, scene.tilted);
    }
  }

  // Mesh::draw (FUN_00416b40) — full per-object state + matrices + emit.
  drawMesh(mesh, cam, tilted = false) {
    const gl = this.gl, mgl = this.mgl;
    const mode = mesh.drawMode >>> 0;

    // normals recomputed unless the mesh is callback-only (0x10..0x800)
    if (mode < 0x10 || mode > 0x800) computeNormals(mesh);
    if (mode === 0) return; // hidden (emit would draw nothing)

    // projection: gluPerspective(cam.fov, 1.0, 2.0, 32768.0)
    mgl.matrixMode(mgl.PROJECTION);
    mgl.loadIdentity();
    perspective(mgl.cur, cam.fov, 1, 2, 32768);
    mgl.matricesDirty = true;

    // base state: blend off, depth test on LEQUAL
    mgl.enableBlend(false);
    mgl.enableDepthTest(true);
    gl.depthFunc(gl.LEQUAL);
    if (mesh.additiveBlend) {       // +0x48: blend ONE,ONE and NO depth test
      mgl.enableBlend(true);
      mgl.enableDepthTest(false);
      gl.blendFunc(gl.ONE, gl.ONE);
    }
    if (mesh.alphaBlend) {          // +0x47: SRC_ALPHA blend
      mgl.enableBlend(true);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }
    // cull (+0x45): 0 → frontFace CW, 1 → CCW (both cull GL_BACK), 2 → off.
    // (The original's alpha-blend branch disables cull first, but this switch
    // runs unconditionally right after and wins — replicated as such.)
    if (mesh.cull === 2) {
      gl.disable(gl.CULL_FACE);
    } else {
      gl.enable(gl.CULL_FACE);
      gl.frontFace(mesh.cull === 1 ? gl.CCW : gl.CW);
      gl.cullFace(gl.BACK);
    }
    // fog (+0x50/+0x54): the engine leaves GL_FOG_MODE at its GL_EXP default
    // and sets GL_FOG_DENSITY = 1/fogDist → f = exp(−dist/fogDist), blended
    // toward fogColorRGB ([ptct ext] in minigl).
    if (mesh.fogDist !== 0) {
      const [r, g, b] = unpackColor(mesh.fogColorRGB >>> 0);
      mgl.enableFog(true);
      mgl.fogExp(1 / mesh.fogDist, r, g, b);
    } else {
      mgl.enableFog(false);
    }

    // modelview: identity · rotate(roll, 0,0,−1) · lookAt · translate · rotXYZ
    const mv = this._tmpMat.identity();
    mv.rotate(cam.roll, 0, 0, -1);
    let [ex, ey, ez] = cam.pos;
    let [tx, ty, tz] = cam.target;
    let ux = 0, uy = 1, uz = 0;
    if (tilted) { ux = 1; uy = 1; uz = 1; }
    else if (tx - ex === 0 && tz - ez === 0) tx += 0.0001; // straight-down fudge
    mv.mult(lookAtMatrix(ex, ey, ez, tx, ty, tz, ux, uy, uz));
    mv.translate(mesh.pos[0], mesh.pos[1], mesh.pos[2]);
    mv.rotate(mesh.rot[0], 1, 0, 0);
    mv.rotate(mesh.rot[1], 0, 1, 0);
    mv.rotate(mesh.rot[2], 0, 0, 1);
    this.eyeMatrix.copy(mv);
    mgl.matrixMode(mgl.MODELVIEW);
    mgl.loadMatrix(mv);

    this._emit(mesh);

    // pop-attrib equivalents: leave a sane default for the next object
    mgl.enableFog(false);
    gl.disable(gl.CULL_FACE);
    mgl.color4(1, 1, 1, 1);
  }

  // Mesh::emit (FUN_00418610): bind texture, then dispatch draw-mode bits.
  // Order matters: textured(4) → flat(2) → points(8) → callbacks → wire(1).
  _emit(mesh) {
    const mgl = this.mgl;
    if (mesh.tex) { mgl.bindTexture(mesh.tex); mgl.enableTexture(true); }
    else mgl.enableTexture(false);
    const mode = mesh.drawMode >>> 0;
    if (mode & 4) this._mainPass(mesh);
    if (mode & 2) this._flatPass(mesh);
    if (mode & 8) this._pointsPass(mesh);
    for (let bit = 0x10; bit <= 0x800; bit <<= 1) {
      if ((mode & bit) && this.drawCallbacks.has(bit)) {
        this.drawCallbacks.get(bit)(mesh, this);
      }
    }
    if (mode & 1) this._wirePass(mesh);
  }

  // expansion scratch (per-face-corner attributes → unindexed arrays)
  _scratch(mesh) {
    let s = mesh._scratch;
    const need = mesh.nFaces * 3;
    if (!s || s.cap < need) {
      s = mesh._scratch = {
        cap: need,
        pos: new Float32Array(need * 3),
        col: new Float32Array(need * 4),
        uvEye: new Float32Array(need * 2),
        idx: new Uint32Array(need),
      };
      for (let i = 0; i < need; i++) s.idx[i] = i;
    }
    return s;
  }

  _expandPositions(mesh, s) {
    const V = mesh.verts, F = mesh.faces, P = s.pos;
    const n = mesh.nFaces * 3;
    for (let i = 0; i < n; i++) {
      const v = F[i] * 3;
      P[i * 3] = V[v]; P[i * 3 + 1] = V[v + 1]; P[i * 3 + 2] = V[v + 2];
    }
  }

  _expandColors(mesh, s) {
    const C = mesh.colors, F = mesh.faces, O = s.col;
    const n = mesh.nFaces * 3;
    for (let i = 0; i < n; i++) {
      const c = F[i] * 4;
      O[i * 4] = C[c]; O[i * 4 + 1] = C[c + 1];
      O[i * 4 + 2] = C[c + 2]; O[i * 4 + 3] = C[c + 3];
    }
  }

  // GL_SPHERE_MAP texgen — FUN_00417860's glTexGeni(GL_S/GL_T,
  // GL_TEXTURE_GEN_MODE, 0x2402=GL_SPHERE_MAP) — used by BOTH the detail
  // (mask 1) and envmap (mask 2) passes; that is why those passes emit
  // per-vertex normals (mesh+0x20). Fixed-function formula per vertex:
  //   u = normalize(eyePos); n = mat3(MV)·normal
  //   r = u − 2·n·(n·u);  m = 2·sqrt(rx² + ry² + (rz+1)²)
  //   s = rx/m + 0.5,  t = ry/m + 0.5
  // IMPORTANT: n is NOT normalized — the engine never enables GL_NORMALIZE
  // (no 0xBA1 in the binary), so the hardware sphere-mapped the RAW
  // cross-product-averaged normals (magnitudes >> 1). That collapse/stretch
  // of the UVs is the authentic streaked look of the landscape/tunnel
  // detail+envmap passes. Only m == 0 is guarded.
  // (the engine's modelview is rotation+translation only, so mat3(MV) is a
  // valid normal matrix).
  _expandSphereUV(mesh, s) {
    const V = mesh.verts, N = mesh.normals, F = mesh.faces, U = s.uvEye;
    const m = this.eyeMatrix.m;
    const n = mesh.nFaces * 3;
    for (let i = 0; i < n; i++) {
      const v = F[i] * 3;
      const x = V[v], y = V[v + 1], z = V[v + 2];
      // eye-space position → u = normalize(p)
      let ux = x * m[0] + y * m[4] + z * m[8] + m[12];
      let uy = x * m[1] + y * m[5] + z * m[9] + m[13];
      let uz = x * m[2] + y * m[6] + z * m[10] + m[14];
      let l = Math.sqrt(ux * ux + uy * uy + uz * uz);
      if (l > 0) { ux /= l; uy /= l; uz /= l; }
      // eye-space normal — RAW, deliberately NOT normalized (see above)
      const ox = N[v], oy = N[v + 1], oz = N[v + 2];
      const nx = ox * m[0] + oy * m[4] + oz * m[8];
      const ny = ox * m[1] + oy * m[5] + oz * m[9];
      const nz = ox * m[2] + oy * m[6] + oz * m[10];
      // reflection + sphere-map projection
      const d2 = 2 * (nx * ux + ny * uy + nz * uz);
      const rx = ux - nx * d2, ry = uy - ny * d2, rz = uz - nz * d2;
      const den = 2 * Math.sqrt(rx * rx + ry * ry + (rz + 1) * (rz + 1)) || 1;
      U[i * 2] = rx / den + 0.5;
      U[i * 2 + 1] = ry / den + 0.5;
    }
  }

  _drawExpanded(mesh, s, uvs, useVertexColors) {
    const n = mesh.nFaces * 3;
    this.mgl.drawElements(
      s.pos.subarray(0, n * 3),
      uvs.subarray(0, n * 2),
      s.idx.subarray(0, n),
      useVertexColors ? s.col.subarray(0, n * 4) : null,
    );
  }

  // mainPass (FUN_00417860). flat = texFx&4 → glColor4f(r,g,b,1) constant;
  // else per-vertex baked colors. Pass structure replicated exactly:
  //   base textured pass iff texFx == 0 || texFx == 4
  //   envmap pass (sphere-map uv, mesh texture, current blend) iff texFx & 2
  //   detail: iff texFx & 1 → base pass here, then additive sphere-map pass
  //           with the detail texture and WHITE color when flat.
  _mainPass(mesh) {
    const mgl = this.mgl, gl = this.gl;
    const fx = mesh.texFxMask & 0xff;
    const flat = (fx & 4) !== 0;
    if (flat) {
      const [r, g, b] = unpackColor(mesh.colorARGB >>> 0);
      mgl.color4(r, g, b, 1);
    }
    if (mesh.isQuadCube) {
      // quad path: current color, per-face-corner uvs, immediate mode
      mgl.begin(mgl.QUADS);
      for (let f = 0; f < mesh.nFaces; f++) {
        for (let c = 0; c < 4; c++) {
          const v = mesh.faces[f * 4 + c] * 3;
          mgl.texCoord2(mesh.uvs[f * 8 + c * 2], mesh.uvs[f * 8 + c * 2 + 1]);
          mgl.vertex3(mesh.verts[v], mesh.verts[v + 1], mesh.verts[v + 2]);
        }
      }
      mgl.end();
      mgl.color4(1, 1, 1, 1);
      return;
    }
    const s = this._scratch(mesh);
    this._expandPositions(mesh, s);
    if (!flat) this._expandColors(mesh, s);

    const drawBase = () => this._drawExpanded(mesh, s, mesh.uvs, !flat);

    if (fx === 0 || fx === 4) drawBase();
    if (fx & 2) {
      this._expandSphereUV(mesh, s);
      this._drawExpanded(mesh, s, s.uvEye, !flat);
    }
    if (fx & 1) {
      drawBase();
      // additive detail pass
      mgl.enableBlend(true);
      gl.blendFunc(gl.ONE, gl.ONE);
      mgl.bindTexture(mesh.detailTex || this.defaultDetailTex);
      this._expandSphereUV(mesh, s);
      if (flat) mgl.color4(1, 1, 1, 1); // detail pass is white when flat
      this._drawExpanded(mesh, s, s.uvEye, !flat);
      // restore the mesh's own blend state for any following passes
      if (mesh.additiveBlend) gl.blendFunc(gl.ONE, gl.ONE);
      else if (mesh.alphaBlend) gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      else mgl.enableBlend(false);
      if (mesh.tex) mgl.bindTexture(mesh.tex);
    }
    mgl.color4(1, 1, 1, 1);
  }

  // flat pass (FUN_00418330): untextured tris/quads, color = colorARGB (with
  // its alpha), current blend state.
  _flatPass(mesh) {
    const mgl = this.mgl;
    const [r, g, b, a] = unpackColor(mesh.colorARGB >>> 0);
    mgl.enableTexture(false);
    mgl.color4(r, g, b, a);
    if (mesh.isQuadCube) {
      mgl.begin(mgl.QUADS);
      for (let f = 0; f < mesh.nFaces; f++) {
        for (let c = 0; c < 4; c++) {
          const v = mesh.faces[f * 4 + c] * 3;
          mgl.vertex3(mesh.verts[v], mesh.verts[v + 1], mesh.verts[v + 2]);
        }
      }
      mgl.end();
    } else {
      const s = this._scratch(mesh);
      this._expandPositions(mesh, s);
      const n = mesh.nFaces * 3;
      this.mgl.drawArraysTri(s.pos.subarray(0, n * 3), s.uvEye.subarray(0, n * 2));
    }
    mgl.color4(1, 1, 1, 1);
    if (mesh.tex) mgl.enableTexture(true);
  }

  // points pass (FUN_004184c0): GL_POINTS at each face's corner verts
  _pointsPass(mesh) {
    const mgl = this.mgl, gl = this.gl;
    const [r, g, b, a] = unpackColor(mesh.colorARGB >>> 0);
    mgl.enableTexture(false);
    mgl.color4(r, g, b, a);
    const zeros = mesh._ptUV || (mesh._ptUV = new Float32Array(mesh.nVerts * 2));
    mgl.drawElements(mesh.verts, zeros, mesh.faces, null, null, gl.POINTS);
    mgl.color4(1, 1, 1, 1);
    if (mesh.tex) mgl.enableTexture(true);
  }

  // wireframe pass (FUN_00418170): GL_LINES per face edge, color = colorARGB
  // (with alpha), texture off, current blend state. Drawn LAST (drawMode 5 =
  // textured + wireframe overlay).
  _wirePass(mesh) {
    const mgl = this.mgl;
    const [r, g, b, a] = unpackColor(mesh.colorARGB >>> 0);
    mgl.enableTexture(false);
    mgl.color4(r, g, b, a);
    const per = mesh.isQuadCube ? 4 : 3;
    let L = mesh._wire;
    const need = mesh.nFaces * per * 2 * 3;
    if (!L || L.length < need) L = mesh._wire = new Float32Array(need);
    const V = mesh.verts, F = mesh.faces;
    let o = 0;
    for (let f = 0; f < mesh.nFaces; f++) {
      for (let e = 0; e < per; e++) {
        const i0 = F[f * per + e] * 3, i1 = F[f * per + ((e + 1) % per)] * 3;
        L[o++] = V[i0]; L[o++] = V[i0 + 1]; L[o++] = V[i0 + 2];
        L[o++] = V[i1]; L[o++] = V[i1 + 1]; L[o++] = V[i1 + 2];
      }
    }
    mgl.drawArraysLines(L.subarray(0, need));
    mgl.color4(1, 1, 1, 1);
    if (mesh.tex) mgl.enableTexture(true);
  }

  // ----- 2D helpers -----

  // ortho quad (FUN_004124a0): glOrtho(0,1,0,1,−1,1), MODELVIEW pushed to
  // identity·translate(0,0,−0.1). EXACT vertex/uv order (v flipped):
  //   uv(0,0)→(x,y+h)  uv(1,0)→(x+w,y+h)  uv(1,1)→(x+w,y)  uv(0,1)→(x,y)
  // Extension: optional custom uv rect (u0,v0,u1,v1) for the text effects
  // (u1 replaces "1", etc. — same corner ordering).
  orthoQuad(x, y, w, h, u0 = 0, v0 = 0, u1 = 1, v1 = 1) {
    const mgl = this.mgl;
    this._push2D();
    mgl.begin(mgl.QUADS);
    mgl.texCoord2(u0, v0); mgl.vertex3(x, y + h, 0);
    mgl.texCoord2(u1, v0); mgl.vertex3(x + w, y + h, 0);
    mgl.texCoord2(u1, v1); mgl.vertex3(x + w, y, 0);
    mgl.texCoord2(u0, v1); mgl.vertex3(x, y, 0);
    mgl.end();
    this._pop2D();
  }

  // free quad (FUN_004125b0, recovered from the unpacked-EXE disassembly):
  // 16 float args — four corner positions AND four explicit texcoords:
  //   glTexCoord2f(u_k, v_k); glVertex2f(x_k, y_k)  for k = 0..3
  // in glOrtho(0,1,0,1,−1,1) space with modelview identity·translate(0,0,−0.1).
  // pts = [x0,y0, x1,y1, x2,y2, x3,y3]; uvs = [u0,v0, …, u3,v3]
  // (uvs defaults to the flipped-v orthoQuad ordering for convenience).
  rotatedQuad(pts, uvs = [0, 0, 1, 0, 1, 1, 0, 1]) {
    const mgl = this.mgl;
    this._push2D();
    mgl.begin(mgl.QUADS);
    for (let k = 0; k < 4; k++) {
      mgl.texCoord2(uvs[k * 2], uvs[k * 2 + 1]);
      mgl.vertex3(pts[k * 2], pts[k * 2 + 1], 0);
    }
    mgl.end();
    this._pop2D();
  }

  _push2D() {
    const mgl = this.mgl;
    mgl.matrixMode(mgl.PROJECTION);
    mgl.pushMatrix();
    mgl.loadIdentity();
    mgl.ortho(0, 1, 0, 1, -1, 1);
    mgl.matrixMode(mgl.MODELVIEW);
    mgl.pushMatrix();
    mgl.loadIdentity();
    mgl.translate(0, 0, -0.1);
  }

  _pop2D() {
    const mgl = this.mgl;
    mgl.popMatrix();
    mgl.matrixMode(mgl.PROJECTION);
    mgl.popMatrix();
    mgl.matrixMode(mgl.MODELVIEW);
  }

  // solid fullscreen fade (overlays 0x32–0x37): untextured quad, standard
  // alpha blend. color = [r,g,b]; skips when alpha <= 0.
  solidFade(color, alpha) {
    if (alpha <= 0) return;
    const mgl = this.mgl, gl = this.gl;
    mgl.enableTexture(false);
    mgl.enableDepthTest(false);
    mgl.enableBlend(true);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    mgl.color4(color[0], color[1], color[2], alpha);
    this.orthoQuad(0, 0, 1, 1);
    mgl.color4(1, 1, 1, 1);
    mgl.enableBlend(false);
    mgl.enableDepthTest(true);
  }
}
