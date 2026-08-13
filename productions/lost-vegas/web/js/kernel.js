// kernel.js — the shared render kernel of "lost vegas" (threestate, 2000).
//
// This is the layer ALL eight scenes plus the intro titles sit on: mesh model
// + generators, the two draw kernels, the camera, screen-space quads and the
// text engine. Ported one-for-one from the Ghidra decompile
// (`work/re/out/lv.c`, image base 0x400000); every entry point below names
// the address it came from. It renders exclusively through `minid3d7.js` —
// see `MINID3D7_API.md` for the conventions (left-handed, D3D row-major
// matrices, depth [0,1], D3DCOLOR = 0xAARRGGBB, frontFace CW).
//
// Data layout is kept in the original's shape on purpose: effect code rebuilds
// vertex positions and diffuse colours every frame, so `mesh.verts` /
// `mesh.vertsU32` are public typed arrays in the exact FVF 0x242 order and the
// ported effects can be read side-by-side with the decompile.
//
//   API reference: web/js/KERNEL_API.md
//   Test page:     web/test/kernel_test.html

import {
  D3DMatrix,
  FVF_XYZ_DIFFUSE_TEX2, FVF_XYZRHW_DIFFUSE_TEX2,
  D3DPT_TRIANGLELIST, D3DPT_TRIANGLEFAN,
  D3DTS_WORLD, D3DTS_VIEW, D3DTS_PROJECTION,
  D3DRS_SRCBLEND, D3DRS_DESTBLEND,
  D3DBLEND_SRCALPHA, D3DBLEND_INVSRCALPHA,
} from './minid3d7.js';

// ===========================================================================
// Constants lifted from .rdata (verbatim, with their VAs).
// ===========================================================================

/** @0x004120b8 — degrees→radians, applied to the camera fov. */
export const DEG2RAD = 0.017453292519943295;
/** @0x00412098 — the 4:3 aspect constant baked into FUN_00401eb0's _22. */
export const ASPECT_4_3 = 4 / 3;
/** FUN_00402860 hard-codes the near plane. */
export const CAM_ZNEAR = 0.2;
/** FUN_00402680 defaults: fov 135°, roll 0, far plane 1000. */
export const CAM_DEFAULT_FOV = 135.0;
export const CAM_DEFAULT_ZFAR = 1000.0;

/** @0x004120e8 = 2π/5 and @0x004120e0 = π/5 — the icosahedron's ring steps. */
const TWO_PI_OVER_5 = 1.2566370614359172;
const PI_OVER_5 = 0.6283185307179586;
/** 1/√5 — the icosahedron's pole-ring latitude. */
const INV_SQRT5 = 0.4472136;
/** @0x004120d8 = 1/π — the sphere's v scale. */
const INV_PI = 0.3183098861837907;
/** @0x004120d0 = 0.6 — the uv-seam detection threshold. */
const SEAM_EPS = 0.6;
/** @0x004120f0 — the sphere radius clamp. */
const RADIUS_MAX = 1e30;

/** FUN_00402990's cap: the particle meshes are allocated up to 0x800 quads. */
export const MAX_PARTICLES = 0x800;

// --- text engine (FUN_00404c30 / FUN_00404f10) ---------------------------
/** @0x004123b8 — atlas pixel → texture coordinate. The sheet is 256 px wide
 *  but the divisor really is 255; keep it, the glyph rects are tuned to it. */
const FONT_UV_SCALE = 1 / 255;
/** @0x00412088 — the scale argument's unit, i.e. "scale 256 == 1 em". */
const FONT_UNIT_SCALE = 1 / 256;
/** @0x004123c0 — space advance, in units. */
const FONT_SPACE_UNITS = 16;
/** @0x004123c8 — inter-glyph gap, in units. */
const FONT_GAP_UNITS = 4;
/** @0x004120a8 — FUN_00404dd0's centring factor. */
const FONT_CENTRE = 0.5;
/** Vertical kern, in units (@0x004123a8..b4). Everything else is 0. */
const FONT_KERN = {
  a: -4, g: -4,          // 0x004123b4
  e: -1,                 // 0x004123b0
  c: -2, h: -2, i: -2,   // 0x004123ac
  k: 2, p: 2, x: 2, z: 2, // 0x004123a8
};
/** FUN_00404f10's literal z / rhw for every glyph quad. */
const TEXT_Z = 0.01;
const TEXT_RHW = 100.0;

/**
 * The glyph rectangle table @0x0041b638, 4 bytes per entry (x0, y0, x1, y1)
 * in atlas pixels. Only 0..37 are real glyphs; entries 38+ are whatever
 * follows in .data — the original indexes into them for out-of-range
 * characters and the intro relies on it ('*' lands on index 42, a run of
 * zeroes, and renders as a zero-size quad, which is how
 * "threestate**in***lost***vegas**" gets its spacing). Reproduced up to 48 so
 * that quirk survives the port.
 */
export const DEFAULT_GLYPH_RECTS = [
  [0, 0, 26, 20], [27, 0, 53, 20], [55, 0, 80, 20], [82, 0, 107, 20],
  [110, 0, 134, 20], [136, 0, 161, 20], [163, 0, 189, 20], [190, 0, 216, 20],
  [217, 0, 221, 18], [223, 0, 248, 18], [1, 22, 26, 36], [28, 20, 53, 36],
  [55, 20, 81, 36], [83, 20, 108, 36], [109, 20, 135, 36], [137, 22, 162, 37],
  [164, 20, 189, 37], [191, 20, 216, 36], [219, 20, 244, 36], [1, 37, 27, 54],
  [29, 37, 55, 54], [56, 37, 84, 54], [86, 37, 111, 54], [113, 39, 138, 54],
  [140, 37, 165, 54], [167, 39, 193, 54], [165, 55, 190, 74], [195, 37, 197, 54],
  [199, 37, 224, 54], [226, 37, 251, 54], [2, 55, 27, 74], [29, 55, 54, 74],
  [56, 55, 81, 74], [83, 55, 108, 74], [110, 55, 136, 74], [138, 55, 163, 74],
  [192, 55, 201, 74], [203, 55, 210, 74],
  // past the end of the real table — see the note above
  [48, 183, 65, 0], [140, 79, 79, 0], [24, 183, 65, 0], [136, 79, 79, 0],
  [0, 0, 0, 0], [0, 0, 0, 0], [12, 183, 65, 0], [208, 182, 65, 0],
  [0, 0, 0, 0], [0, 0, 0, 0],
];

/**
 * FUN_00404c30's character → glyph index. Lowercase only; digits follow the
 * letters; '#' and '+' are the only punctuation. Anything else falls through
 * to its raw char code and over-reads the table, exactly as the original does.
 */
export function glyphIndex(ch) {
  const c = typeof ch === 'number' ? ch : ch.charCodeAt(0);
  if (c > 0x60 && c < 0x7b) return c - 0x61;   // 'a'..'z' → 0..25
  if (c > 0x2f && c < 0x3a) return c - 0x16;   // '0'..'9' → 26..35
  if (c === 0x23) return 36;                   // '#'
  if (c === 0x2b) return 37;                   // '+'
  return c;
}

// ===========================================================================
// Small math helpers, mirroring the decompile's own.
// ===========================================================================

/** FUN_00401930 — v * M with the perspective divide folded in (row-vector). */
function transformDivide(out, x, y, z, m) {
  const w = x * m[3] + y * m[7] + z * m[11] + m[15];
  out[0] = (x * m[0] + y * m[4] + z * m[8] + m[12]) / w;
  out[1] = (x * m[1] + y * m[5] + z * m[9] + m[13]) / w;
  out[2] = (x * m[2] + y * m[6] + z * m[10] + m[14]) / w;
  return out;
}

/** out = a * b, row-major, 16-float arrays. `out` must not alias a or b. */
function mul4(out, a, b) {
  for (let i = 0; i < 4; i++) {
    const a0 = a[i * 4], a1 = a[i * 4 + 1], a2 = a[i * 4 + 2], a3 = a[i * 4 + 3];
    out[i * 4] = a0 * b[0] + a1 * b[4] + a2 * b[8] + a3 * b[12];
    out[i * 4 + 1] = a0 * b[1] + a1 * b[5] + a2 * b[9] + a3 * b[13];
    out[i * 4 + 2] = a0 * b[2] + a1 * b[6] + a2 * b[10] + a3 * b[14];
    out[i * 4 + 3] = a0 * b[3] + a1 * b[7] + a2 * b[11] + a3 * b[15];
  }
  return out;
}

function identity4(m) {
  m.fill(0);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}

/** FUN_004017f0 then FUN_00401730: m = rotX(rx)*rotY(ry)*rotZ(rz)*scale(s). */
function buildRotationScale(m, rx, ry, rz, s) {
  const cx = Math.cos(rx), sx = Math.sin(rx);
  const cy = Math.cos(ry), sy = Math.sin(ry);
  const cz = Math.cos(rz), sz = Math.sin(rz);
  // rotX * rotY (row-major, row-vector), then * rotZ, then * uniform scale.
  // Expanded so the result is bit-comparable with the original's three
  // sequential 4x4 multiplies without allocating.
  const a00 = cy, a01 = 0, a02 = -sy;
  const a10 = sx * sy, a11 = cx, a12 = sx * cy;
  const a20 = cx * sy, a21 = -sx, a22 = cx * cy;
  m[0] = (a00 * cz + a01 * -sz) * s;
  m[1] = (a00 * sz + a01 * cz) * s;
  m[2] = a02 * s;
  m[3] = 0;
  m[4] = (a10 * cz + a11 * -sz) * s;
  m[5] = (a10 * sz + a11 * cz) * s;
  m[6] = a12 * s;
  m[7] = 0;
  m[8] = (a20 * cz + a21 * -sz) * s;
  m[9] = (a20 * sz + a21 * cz) * s;
  m[10] = a22 * s;
  m[11] = 0;
  m[12] = 0; m[13] = 0; m[14] = 0; m[15] = 1;
  return m;
}

// ===========================================================================
// Mesh model — FUN_00402040 / FUN_00402100 / FUN_00402140
// ===========================================================================

/**
 * FUN_00402040 — allocate a mesh object. `nVerts` and `nFaces` are u16 in the
 * original; the vertex block is `nVerts * 32` bytes in FVF 0x242 order and
 * every vertex's diffuse starts at 0xffffffff.
 *
 * Field names mirror the original's dword offsets so ported effects read the
 * same:  m[0..15] world matrix · px,py,pz (+0x40) · scale (+0x4c) ·
 * rx,ry,rz (+0x50) · flags (+0x5c) · verts (+0x60) · normAccum (+0x64) ·
 * nVerts (+0x68) · indices (+0x6c) · faceNormals (+0x70) · nFaces (+0x74).
 */
export function createMesh(nVerts, nFaces) {
  nVerts = nVerts & 0xffff;
  nFaces = nFaces & 0xffff;
  const vbuf = new ArrayBuffer(nVerts * 32);
  const obj = {
    m: identity4(new Float32Array(16)),
    px: 0, py: 0, pz: 0,
    scale: 1.0,
    rx: 0, ry: 0, rz: 0,
    flags: 0,
    verts: new Float32Array(vbuf),        // 8 floats per vertex
    vertsU32: new Uint32Array(vbuf),      // same block, for the D3DCOLOR
    vertBytes: new Uint8Array(vbuf),
    normAccum: new Float32Array(nVerts * 4),
    nVerts,
    indices: new Uint16Array(nFaces * 3),
    faceNormals: new Float32Array(nFaces * 3),
    nFaces,
  };
  for (let i = 0; i < nVerts; i++) obj.vertsU32[i * 8 + 3] = 0xffffffff;
  return obj;
}

/** Index of vertex `i`'s first float inside `mesh.verts`. */
export const vbase = (i) => i * 8;
/** Index of vertex `i`'s diffuse dword inside `mesh.vertsU32`. */
export const vcolor = (i) => i * 8 + 3;

/** FUN_00403150 — write a vertex position without touching colour/uv. */
export function setMeshVertexPos(obj, i, x, y, z) {
  const b = i * 8;
  obj.verts[b] = x; obj.verts[b + 1] = y; obj.verts[b + 2] = z;
}

/** FUN_00402230 — set the mesh's Euler rotation and rebuild its world matrix
 *  as rotX*rotY*rotZ*scale (the translation row is written at draw time). */
export function setMeshRotation(obj, rx, ry, rz) {
  obj.rx = rx; obj.ry = ry; obj.rz = rz;
  buildRotationScale(obj.m, rx, ry, rz, obj.scale);
}

// ===========================================================================
// FUN_004022a0 — smooth vertex normals + spherical environment-map uv.
// ===========================================================================

/**
 * FUN_004022a0(mesh, cam, uvScale, mode).
 *
 * Two passes:
 *  1. per-face normal `n = (v2-v0) × (v1-v0)`, normalised, stored in
 *     `mesh.faceNormals`, and accumulated (with a count in .w) into
 *     `mesh.normAccum` for each of the face's three vertices;
 *  2. average each vertex normal, transform it by `mesh.m * cam.m` (the
 *     mesh's world matrix from the *previous* draw times the view matrix —
 *     the original really does use the stale world matrix) and turn it into
 *     a sphere-map coordinate  u = n'.x*0.5+0.5,  v = n'.y*0.5+0.5.
 *
 * `mode === 0` writes only texcoord set 1, scaled by `uvScale`.
 * `mode !== 0` writes set 1 unscaled and set 0 scaled by `uvScale`.
 *
 * `cam` may be a camera object, a D3DMatrix or a raw 16-float array.
 */
export function meshEnvMapUV(obj, cam, uvScale, mode) {
  const V = obj.verts, N = obj.normAccum, I = obj.indices, FN = obj.faceNormals;
  N.fill(0);

  const nTri = obj.nFaces;
  for (let f = 0; f < nTri; f++) {
    const i0 = I[f * 3], i1 = I[f * 3 + 1], i2 = I[f * 3 + 2];
    const a = i0 * 8, b = i1 * 8, c = i2 * 8;
    const e1x = V[b] - V[a], e1y = V[b + 1] - V[a + 1], e1z = V[b + 2] - V[a + 2];
    const e2x = V[c] - V[a], e2y = V[c + 1] - V[a + 1], e2z = V[c + 2] - V[a + 2];
    // n = -(e1 × e2) = e2 × e1, exactly as the decompile negates each term.
    let nx = -(e2z * e1y - e2y * e1z);
    let ny = -(e2x * e1z - e2z * e1x);
    let nz = -(e2y * e1x - e2x * e1y);
    const inv = 1.0 / Math.sqrt(nx * nx + ny * ny + nz * nz);
    nx *= inv; ny *= inv; nz *= inv;
    FN[f * 3] = nx; FN[f * 3 + 1] = ny; FN[f * 3 + 2] = nz;
    // unrolled: the `for (const vi of [i0,i1,i2])` this replaces allocated a
    // fresh array per FACE (~12.7k/frame in scene F, and it scales with any
    // tessellation increase). Arithmetic and accumulation order are unchanged.
    let o = i0 * 4;
    N[o] += nx; N[o + 1] += ny; N[o + 2] += nz; N[o + 3] += 1.0;
    o = i1 * 4;
    N[o] += nx; N[o + 1] += ny; N[o + 2] += nz; N[o + 3] += 1.0;
    o = i2 * 4;
    N[o] += nx; N[o + 1] += ny; N[o + 2] += nz; N[o + 3] += 1.0;
  }

  const view = cam && cam.m ? cam.m : cam;
  const M = _envTmp;
  mul4(M, obj.m, view);

  const nv = obj.nVerts;
  if (mode === 0 || mode === false || mode === '\0') {
    for (let i = 0; i < nv; i++) {
      const o = i * 4;
      const k = 1.0 / N[o + 3];
      const x = N[o] * k, y = N[o + 1] * k, z = N[o + 2] * k;
      N[o] = x; N[o + 1] = y; N[o + 2] = z;
      const b = i * 8;
      V[b + 6] = ((x * M[0] + y * M[4] + z * M[8]) * 0.5 + 0.5) * uvScale;
      V[b + 7] = ((x * M[1] + y * M[5] + z * M[9]) * 0.5 + 0.5) * uvScale;
    }
  } else {
    for (let i = 0; i < nv; i++) {
      const o = i * 4;
      const k = 1.0 / N[o + 3];
      const x = N[o] * k, y = N[o + 1] * k, z = N[o + 2] * k;
      N[o] = x; N[o + 1] = y; N[o + 2] = z;
      const b = i * 8;
      const u = (x * M[0] + y * M[4] + z * M[8]) * 0.5 + 0.5;
      const v = (x * M[1] + y * M[5] + z * M[9]) * 0.5 + 0.5;
      V[b + 6] = u; V[b + 7] = v;
      V[b + 4] = u * uvScale; V[b + 5] = v * uvScale;
    }
  }
  return obj;
}
const _envTmp = new Float32Array(16);

// ===========================================================================
// FUN_00402d00 — slerp an edge into `count` segments, emitting count-1 points.
// ===========================================================================

/**
 * FUN_00402d00(mesh, indexA, indexB, cursor, count) — great-circle interpolate
 * the edge A→B into `count` segments and append the `count - 1` interior
 * points to the mesh at `cursor[0]`, advancing it.
 *
 * `cursor` is a one-element array (the original passes `int*`). Only the
 * position is written; the original copies whole 32-byte vertices so the
 * interpolated points inherit slot A's colour/uv, and `createGeoSphere`
 * rewrites both afterwards.
 *
 * The angle is `acos(dot(A,B) / |A|²)`, i.e. A is assumed to be the radius.
 * A zero-length A degenerates to replicating A.
 */
export function slerpEdge(obj, ia, ib, cursor, count) {
  if (count < 2) return;
  const V = obj.verts;
  const a = ia * 8, b = ib * 8;
  const ax = V[a], ay = V[a + 1], az = V[a + 2];
  const bx = V[b], by = V[b + 1], bz = V[b + 2];
  const len2 = ax * ax + ay * ay + az * az;

  if (len2 === 0.0) {                       // degenerate: replicate A
    for (let i = 0; i < count - 1; i++) {
      const d = cursor[0] * 8;
      V[d] = ax; V[d + 1] = ay; V[d + 2] = az;
      cursor[0]++;
    }
    return;
  }

  let t = (ax * bx + ay * by + az * bz) / len2;
  if (t < -1.0) t = -1.0;
  else if (t > 1.0) t = 1.0;
  // theta = acos(t), the original computes it as atan2(t, -sqrt(1-t^2))
  // plus -PI/2 (t >= 0) or 3*PI/2 (t < 0).
  const theta = Math.atan2(t, -Math.sqrt(1.0 - t * t))
              + (t < 0.0 ? 4.71238898038469 : -1.5707963267948966);
  const sTheta = Math.sin(theta);

  for (let i = 1, j = count - 1; i < count; i++, j--) {
    const a1 = (i * theta) / count;
    const a2 = (j * theta) / count;
    const s1 = Math.sin(a1), s2 = Math.sin(a2);
    const d = cursor[0] * 8;
    V[d] = (s2 * ax + s1 * bx) / sTheta;
    V[d + 1] = (s2 * ay + s1 * by) / sTheta;
    V[d + 2] = (s2 * az + s1 * bz) / sTheta;
    cursor[0]++;
  }
}

// ===========================================================================
// FUN_00402f40 — geodesic vertex index for (face f, row i, column j).
// ===========================================================================

/**
 * `n` is the subdivision count. Rows run 0..n from each icosahedron face's
 * apex; column j runs 0..i. Ported verbatim — it encodes the whole layout of
 * the vertex array (12 icosahedron corners, then 30 edges of n-1 points each,
 * then 20 face interiors of (n-1)(n-2)/2 points).
 */
export function geoIndex(n, f, i, j) {
  if (i === 0) {
    if (f < 5) return 0;
    if (f > 14) return 11;
    return f - 4;
  }
  if (i === n) {
    if (j === 0) {
      if (f < 5) return f + 1;
      if (f < 10) return (f + 4) % 5 + 6;
      if (f < 15) return (f + 1) % 5 + 1;
      return (f + 1) % 5 + 6;
    }
    if (j !== n) {
      if (f < 5) return (n - 1) * (f + 5) + 11 + j;
      if (f < 10) return ((f + 4) % 5 + 20) * (n - 1) + 11 + j;
      if (f < 15) return ((n - 1) * (f - 5) - j) + 11 + n;
      return ((n - 1) * (f + 5) - j) + 11 + n;
    }
    if (f < 5) return (f + 1) % 5 + 1;
    if (f < 10) return f + 1;
    return f - 9;
  }
  if (j === 0) {
    if (f < 5) return (n - 1) * f + 11 + i;
    if (f < 10) return (f % 5 + 15) * (n - 1) + 11 + i;
    if (f < 15) return (((f + 1) % 5 + 15) * (n - 1) - i) + 11 + n;
    return ((f + 1) % 5 + 25) * (n - 1) + 11 + i;
  }
  if (j !== i) {
    return ((i - 2) * (i - 1)) / 2 + j
         + ((n - 2) * (n - 1) * f) / 2 - 19 + n * 30;
  }
  if (f < 5) return ((f + 1) % 5) * (n - 1) + 11 + i;
  if (f < 10) return (f % 5 + 10) * (n - 1) + 11 + i;
  if (f < 15) return ((f % 5 + 10) * (n - 1) - i) + 11 + n;
  return (f % 5 + 25) * (n - 1) + 11 + i;
}

// ===========================================================================
// FUN_004031b0 — the geodesic sphere.
// ===========================================================================

/**
 * `createGeoSphere(subdiv, radius, uvScale, splitSeams)`.
 *
 * Icosahedron with the 5-fold axis on Z, every edge slerped into `subdiv`
 * segments and every face filled in with slerped rows. The intro calls it as
 * `FUN_004031b0(0xe, 100.0, 1.0, 0)` — 14 subdivisions.
 *
 *   vertices = subdiv²*20/2 + 2        faces = subdiv²*20
 *
 * UV: `u = (x/radius) * uvScale`, `v = atan2(z/radius, y/radius)/π * uvScale`
 * — a cylindrical wrap about the *X* axis, not about the pole. Diffuse is
 * 0xffffffff on every vertex.
 *
 * `splitSeams` (the original's 4th arg, unused by the shipped scenes) runs the
 * second pass that duplicates the vertices of any triangle whose uv span
 * exceeds 0.6, unwrapping the seam; it returns a NEW mesh and discards the
 * first.
 */
export function createGeoSphere(subdiv, radius, uvScale, splitSeams) {
  let n = subdiv & 0xff;
  if (n === 0) n = 1;
  else if (n > 200) n = 200;

  let r = radius;
  if (!(r >= 0.0)) r = 0.0;
  else if (r > RADIUS_MAX) r = RADIUS_MAX;

  const nFaces = n * n * 20;
  const nVerts = (nFaces / 2) + 2;
  const obj = createMesh(nVerts, nFaces);

  const cursor = [0];

  // --- the 12 icosahedron corners -----------------------------------------
  setMeshVertexPos(obj, cursor[0]++, 0, 0, r);            // north pole (+Z)
  const zRing = r * INV_SQRT5;                            // r/√5
  const ringR = zRing + zRing;                            // 2r/√5
  for (let i = 0; i < 5; i++) {
    const a = i * TWO_PI_OVER_5;
    setMeshVertexPos(obj, cursor[0]++,
      Math.cos(a) * ringR, Math.sin(a) * ringR, zRing);
  }
  for (let i = 1; i < 11; i += 2) {
    const a = i * PI_OVER_5;
    setMeshVertexPos(obj, cursor[0]++,
      Math.cos(a) * ringR, Math.sin(a) * ringR, -zRing);
  }
  setMeshVertexPos(obj, cursor[0]++, 0, 0, -r);           // south pole (-Z)

  // --- the 30 edges, n-1 interior points each ------------------------------
  for (let i = 1; i <= 5; i++) slerpEdge(obj, 0, i, cursor, n);             // pole → upper ring
  for (let i = 1; i <= 5; i++) slerpEdge(obj, i, i % 5 + 1, cursor, n);     // upper ring
  for (let i = 1; i <= 5; i++) slerpEdge(obj, i, i + 5, cursor, n);         // upper → lower (a)
  for (let i = 1; i <= 5; i++) slerpEdge(obj, i, (i + 3) % 5 + 6, cursor, n); // upper → lower (b)
  for (let i = 6; i <= 10; i++) slerpEdge(obj, i, (i - 5) % 5 + 6, cursor, n); // lower ring
  for (let i = 0; i < 5; i++) slerpEdge(obj, 11, i + 6, cursor, n);         // lower ring → pole

  // --- the 20 face interiors ----------------------------------------------
  const e = n - 1;                     // points per edge
  // north cap
  for (let p = 0; p < 5; p++) {
    let A = 13 + p * e;
    let B = ((p + 1) % 5) * e + 13;
    for (let k = 2; k < n; k++) { slerpEdge(obj, A, B, cursor, k); A++; B++; }
  }
  // upper band
  {
    let A = e * 15 + 13, B = e * 10 + 13;
    for (let m = 0; m < 5; m++) {
      let a = A, b = B;
      for (let k = 2; k < n; k++) { slerpEdge(obj, a, b, cursor, k); a++; b++; }
      A += e; B += e;
    }
  }
  // lower band (indices run backwards)
  {
    let B = n + 9 + e * 10;
    for (let p = 0; p < 5; p++) {
      let a = ((p + 1) % 5 + 15) * e + 9 + n;
      let b = B;
      for (let k = 2; k < n; k++) { slerpEdge(obj, a, b, cursor, k); b--; a--; }
      B += e;
    }
  }
  // south cap
  {
    let B = e * 25 + 13;
    for (let p = 0; p < 5; p++) {
      let b = B;
      let a = ((p + 1) % 5 + 25) * e + 13;
      for (let k = 2; k < n; k++) { slerpEdge(obj, a, b, cursor, k); b++; a++; }
      B += e;
    }
  }

  // --- triangles ------------------------------------------------------------
  const I = obj.indices;
  let tri = 0;
  for (let f = 0; f < 20; f++) {
    for (let row = 0; row < n; row++) {
      for (let col = 0; col <= row; col++) {
        const i0 = geoIndex(n, f, row, col);
        const i1 = geoIndex(n, f, row + 1, col);
        const i2 = geoIndex(n, f, row + 1, col + 1);
        I[tri * 3] = i0; I[tri * 3 + 1] = i1; I[tri * 3 + 2] = i2;
        tri++;
        if (col < row) {
          const i3 = geoIndex(n, f, row, col + 1);
          I[tri * 3] = i0; I[tri * 3 + 1] = i2; I[tri * 3 + 2] = i3;
          tri++;
        }
      }
    }
  }

  // --- uv + diffuse ---------------------------------------------------------
  const V = obj.verts, U = obj.vertsU32;
  for (let i = 0; i < obj.nVerts; i++) {
    const b = i * 8;
    V[b + 4] = (V[b] / r) * uvScale;
    V[b + 5] = Math.atan2(V[b + 2] / r, V[b + 1] / r) * INV_PI * uvScale;
    U[b + 3] = 0xffffffff;
  }

  if (!splitSeams) return obj;
  return splitUVSeams(obj);
}

/**
 * The second half of FUN_004031b0: any triangle whose three vertices span
 * more than 0.6 in u or v gets its own private copy of the three vertices,
 * with the offending coordinates pulled back by whole units until they agree.
 * Returns a new mesh; the input is dropped.
 */
export function splitUVSeams(src) {
  const out = createMesh(src.nFaces * 3 + src.nVerts, src.nFaces);
  out.verts.set(src.verts.subarray(0, src.nVerts * 8));
  out.indices.set(src.indices.subarray(0, src.nFaces * 3));

  const V = src.verts, OV = out.verts, OI = out.indices;
  let nv = src.nVerts;

  const A = new Float32Array(8), B = new Float32Array(8), C = new Float32Array(8);
  for (let f = 0; f < src.nFaces; f++) {
    const i0 = src.indices[f * 3], i1 = src.indices[f * 3 + 1], i2 = src.indices[f * 3 + 2];
    A.set(V.subarray(i0 * 8, i0 * 8 + 8));
    B.set(V.subarray(i1 * 8, i1 * 8 + 8));
    C.set(V.subarray(i2 * 8, i2 * 8 + 8));

    let split = false;
    // u (index 4), then v (index 5) — six ordered comparisons each, verbatim.
    for (const k of [4, 5]) {
      const pairs = [[A, B], [A, C], [B, A], [B, C], [C, A], [C, B]];
      for (const [p, q] of pairs) {
        if (p[k] - q[k] > SEAM_EPS) {
          split = true;
          do { p[k] -= 1.0; } while (p[k] - q[k] > SEAM_EPS);
        }
      }
    }
    if (!split) continue;

    OV.set(A, nv * 8);
    OV.set(B, (nv + 1) * 8);
    OV.set(C, (nv + 2) * 8);
    OI[f * 3] = nv; OI[f * 3 + 1] = nv + 1; OI[f * 3 + 2] = nv + 2;
    nv += 3;
  }
  out.nVerts = nv;
  return out;
}

// ===========================================================================
// FUN_00402990 — the particle / billboard mesh.
// ===========================================================================

/**
 * `count` quads (the intro allocates 0x800 = 2048 for scene E). Each particle
 * owns a position (3 floats), a D3DCOLOR and a size; the vertex block and the
 * static index list (v, v+1, v+2, v+2, v+3, v per quad) are built up front.
 *
 * Field names mirror the original's offsets: m[0..15] · pos (+0x40) ·
 * color (+0x44) · size (+0x48) · verts (+0x4c) · indices (+0x50) · count (+0x54).
 */
export function createParticles(count) {
  count = count & 0xffff;
  const vbuf = new ArrayBuffer(count * 128);   // 4 verts * 32 bytes
  const p = {
    m: identity4(new Float32Array(16)),
    pos: new Float32Array(count * 3),
    color: new Uint32Array(count),
    size: new Float32Array(count),
    verts: new Float32Array(vbuf),
    vertsU32: new Uint32Array(vbuf),
    vertBytes: new Uint8Array(vbuf),
    indices: new Uint16Array(count * 6),
    count,
  };
  for (let i = 0; i < count; i++) {
    const v = i * 4, o = i * 6;
    p.indices[o] = v; p.indices[o + 1] = v + 1; p.indices[o + 2] = v + 2;
    p.indices[o + 3] = v + 2; p.indices[o + 4] = v + 3; p.indices[o + 5] = v;
  }
  return p;
}

// ===========================================================================
// Camera — FUN_00402680 / FUN_004026f0 / FUN_00402760 / FUN_00402860
// ===========================================================================

/**
 * FUN_00402680 — a camera object. `m[0..15]` is the VIEW matrix, rebuilt from
 * (eye, at) by `setCamera`. `fov` is in DEGREES (135 by default), `roll` is a
 * Z rotation applied after the look-at, `zfar` defaults to 1000.
 */
export function createCamera(ex, ey, ez, ax, ay, az) {
  const cam = {
    m: identity4(new Float32Array(16)),
    ex, ey, ez, ax, ay, az,
    fov: CAM_DEFAULT_FOV,
    roll: 0.0,
    zfar: CAM_DEFAULT_ZFAR,
  };
  cameraLookAt(cam, ex, ey, ez, ax, ay, az);
  return cam;
}

/** FUN_004026f0 — set eye/target and rebuild the look-at matrix in place. */
export function cameraLookAt(cam, ex, ey, ez, ax, ay, az) {
  cam.ex = ex; cam.ey = ey; cam.ez = ez;
  cam.ax = ax; cam.ay = ay; cam.az = az;
  cam.m.set(D3DMatrix.lookAtLH([ex, ey, ez], [ax, ay, az], [0, 1, 0]).m);
  return cam;
}

// ===========================================================================
// The Kernel — everything that needs the device.
// ===========================================================================

export class Kernel {
  /** @param {import('./minid3d7.js').MiniD3D7} d3d */
  constructor(d3d) {
    this.d3d = d3d;
    /** the font texture handle, set by `setFont` */
    this.fontTexture = null;
    /** glyph rectangles in atlas pixels; overridable via `setFont` */
    this.glyphRects = DEFAULT_GLYPH_RECTS;
    this.fontMetrics = {
      uvScale: FONT_UV_SCALE,
      unitScale: FONT_UNIT_SCALE,
      spaceWidth: FONT_SPACE_UNITS,
      charGap: FONT_GAP_UNITS,
      centre: FONT_CENTRE,
      kern: FONT_KERN,
    };
    // scratch, allocated once (the original works out of its stack frame)
    this._quad2D = new Float32Array(4 * 9);
    this._quad2DU32 = new Uint32Array(this._quad2D.buffer);
    this._tri2D = new Float32Array(3 * 9);
    this._tri2DU32 = new Uint32Array(this._tri2D.buffer);
    this._mtmp = new Float32Array(16);
    this._ident = identity4(new Float32Array(16));
    this._glyph = { u0: 0, u1: 0, v0: 0, v1: 0, w: 0, h: 0, kern: 0 };
    this._pt = new Float32Array(3);
  }

  // -- meshes -------------------------------------------------------------
  createMesh(nVerts, nFaces) { return createMesh(nVerts, nFaces); }
  createGeoSphere(subdiv, radius, uvScale, splitSeams) {
    return createGeoSphere(subdiv, radius, uvScale, splitSeams);
  }
  createParticles(count) { return createParticles(count); }
  createCamera(ex, ey, ez, ax, ay, az) { return createCamera(ex, ey, ez, ax, ay, az); }
  setMeshRotation(obj, rx, ry, rz) { return setMeshRotation(obj, rx, ry, rz); }
  meshEnvMapUV(obj, cam, uvScale, mode) { return meshEnvMapUV(obj, cam, uvScale, mode); }

  /**
   * FUN_00402180 — draw one mesh object.
   *
   *   if (obj.flags & 1) rebuild the rotation from obj.rx/ry/rz
   *   world matrix's translation row := obj.px/py/pz
   *   SetTransform(WORLD, obj.m)
   *   DrawIndexedPrimitive(TRIANGLELIST, 0x242, verts, nVerts, indices, nFaces*3, 0)
   *
   * Note the world matrix is NOT rebuilt unless bit 0 of `flags` is set —
   * effects that animate rotation either set the flag or call
   * `setMeshRotation` themselves, exactly as in the original.
   */
  drawMesh(obj) {
    if (obj.flags & 1) setMeshRotation(obj, obj.rx, obj.ry, obj.rz);
    obj.m[12] = obj.px; obj.m[13] = obj.py; obj.m[14] = obj.pz;
    this.d3d.SetTransform(D3DTS_WORLD, obj.m);
    this.d3d.DrawIndexedPrimitive(D3DPT_TRIANGLELIST, FVF_XYZ_DIFFUSE_TEX2,
      obj.verts, obj.nVerts, obj.indices, obj.nFaces * 3, 0);
    return 0;
  }

  /**
   * FUN_00402a60 — draw camera-facing billboard quads.
   *
   * WORLD and VIEW are forced to identity and each particle centre is pushed
   * through `p.m * view` on the CPU (with the perspective divide of
   * FUN_00401930), so the quads are built axis-aligned in view space and
   * always face the camera. Half-size is `size * 0.5`; corners run
   * (-h,-h) (+h,-h) (+h,+h) (-h,+h) with uv (0,0) (1,0) (1,1) (0,1).
   * VIEW is restored to `view` on the way out.
   *
   * Texcoord set 1 is left untouched by the original (stage 1 is normally
   * DISABLEd for particles); this port mirrors set 0 into it so the block is
   * deterministic.
   *
   * @param p     a particle object from `createParticles`
   * @param view  the camera (or its matrix) currently set as VIEW
   */
  drawParticles(p, view) {
    const d3d = this.d3d;
    const vm = view && view.m ? view.m : view;
    d3d.SetTransform(D3DTS_WORLD, this._ident);
    d3d.SetTransform(D3DTS_VIEW, this._ident);

    const M = mul4(this._mtmp, p.m, vm);
    const V = p.verts, U = p.vertsU32, pt = this._pt;
    const n = p.count;
    for (let i = 0; i < n; i++) {
      transformDivide(pt, p.pos[i * 3], p.pos[i * 3 + 1], p.pos[i * 3 + 2], M);
      const x = pt[0], y = pt[1], z = pt[2];
      const h = p.size[i] * 0.5;
      const c = p.color[i];
      const b = i * 32;

      V[b] = x - h;      V[b + 1] = y - h;  V[b + 2] = z;
      V[b + 4] = 0;      V[b + 5] = 0;      V[b + 6] = 0;  V[b + 7] = 0;
      V[b + 8] = x + h;  V[b + 9] = y - h;  V[b + 10] = z;
      V[b + 12] = 1;     V[b + 13] = 0;     V[b + 14] = 1; V[b + 15] = 0;
      V[b + 16] = x + h; V[b + 17] = y + h; V[b + 18] = z;
      V[b + 20] = 1;     V[b + 21] = 1;     V[b + 22] = 1; V[b + 23] = 1;
      V[b + 24] = x - h; V[b + 25] = y + h; V[b + 26] = z;
      V[b + 28] = 0;     V[b + 29] = 1;     V[b + 30] = 0; V[b + 31] = 1;
      U[b + 3] = c; U[b + 11] = c; U[b + 19] = c; U[b + 27] = c;
    }

    d3d.DrawIndexedPrimitive(D3DPT_TRIANGLELIST, FVF_XYZ_DIFFUSE_TEX2,
      p.verts, n * 4, p.indices, n * 6, 0);
    d3d.SetTransform(D3DTS_VIEW, vm);
    return 0;
  }

  // -- camera --------------------------------------------------------------

  /**
   * FUN_00402860 — PROJECTION from the camera's fov (DEGREES) and far plane,
   * then VIEW and WORLD reset to identity.
   *
   *   PROJECTION = perspectiveFovLH(fovDeg * π/180, 4/3, 0.2, cam.zfar)
   *
   * `fovDeg` is a full HORIZONTAL fov: _11 = cot(fov/2), _22 = cot(fov/2)*4/3.
   * That's the reverse of D3DX's convention and is kept so the demo's own
   * numbers (135° etc.) port unchanged.
   */
  setCameraProjection(cam, fovDeg = cam.fov) {
    cam.fov = fovDeg;
    const proj = D3DMatrix.perspectiveFovLH(fovDeg * DEG2RAD, ASPECT_4_3,
                                            CAM_ZNEAR, cam.zfar);
    this.d3d.SetTransform(D3DTS_PROJECTION, proj);
    this.d3d.SetTransform(D3DTS_VIEW, this._ident);
    this.d3d.SetTransform(D3DTS_WORLD, this._ident);
    return 0;
  }

  /**
   * FUN_00402760 — the per-scene camera setter. Rebuilds the look-at from the
   * camera's stored eye/target, applies `setCameraProjection`, then folds the
   * roll in as `view = lookAt * rotZ(roll)` and uploads it as VIEW.
   *
   * `cam.m` is left holding the final view matrix (roll included), which is
   * what `meshEnvMapUV` and `drawParticles` consume.
   */
  setCamera(cam) {
    cameraLookAt(cam, cam.ex, cam.ey, cam.ez, cam.ax, cam.ay, cam.az);
    this.setCameraProjection(cam, cam.fov);
    const roll = D3DMatrix.rotationZ(cam.roll);   // FUN_00401a70 with yaw=pitch=0
    const out = mul4(this._mtmp, cam.m, roll.m);
    cam.m.set(out);
    this.d3d.SetTransform(D3DTS_VIEW, cam.m);
    return 0;
  }

  // -- 2D overlays ---------------------------------------------------------

  /**
   * FUN_004049f5 — one screen-space triangle:
   * `DrawPrimitive(TRIANGLELIST, 0x244, v, 3, 0x18)`.
   * Each vertex is 9 numbers: x, y, z, rhw, D3DCOLOR, u0, v0, u1, v1.
   */
  drawTri2D(v0, v1, v2) {
    const f = this._tri2D, u = this._tri2DU32;
    writeVertex2D(f, u, 0, v0);
    writeVertex2D(f, u, 1, v1);
    writeVertex2D(f, u, 2, v2);
    this.d3d.DrawPrimitive(D3DPT_TRIANGLELIST, FVF_XYZRHW_DIFFUSE_TEX2, f, 3, 0x18);
    return 0;
  }

  /**
   * FUN_00404a3f — one screen-space quad:
   * `DrawPrimitive(TRIANGLEFAN, 0x244, v, 4, 0x18)`.
   * Vertices in the intro's order: top-left, top-right, bottom-right,
   * bottom-left (clockwise on screen = front-facing under D3DCULL_CCW).
   * Each vertex is 9 numbers as above.
   */
  drawQuad2D(v0, v1, v2, v3) {
    const f = this._quad2D, u = this._quad2DU32;
    writeVertex2D(f, u, 0, v0);
    writeVertex2D(f, u, 1, v1);
    writeVertex2D(f, u, 2, v2);
    writeVertex2D(f, u, 3, v3);
    this.d3d.DrawPrimitive(D3DPT_TRIANGLEFAN, FVF_XYZRHW_DIFFUSE_TEX2, f, 4, 0x18);
    return 0;
  }

  /** The raw 4-vertex scratch behind `drawQuad2D` (36 floats, 9 per vertex),
   *  for effects that would rather fill it in place and call `flushQuad2D`. */
  get quad2DScratch() { return this._quad2D; }
  flushQuad2D() {
    this.d3d.DrawPrimitive(D3DPT_TRIANGLEFAN, FVF_XYZRHW_DIFFUSE_TEX2,
      this._quad2D, 4, 0x18);
    return 0;
  }

  /**
   * FUN_0040406d — the intro's texture setter. Disables stage 1's COLOROP
   * first, then binds stage 0 = `tex0` and stage 1 = `tex1` (or NULL).
   * `setTextureHandle(null)` clears both, as the frame pump does.
   */
  setTextureHandle(tex0, tex1 = null) {
    this.d3d.setStage1Op(0);
    this.d3d.SetTexture(0, tex0 || null);
    this.d3d.SetTexture(1, tex0 ? (tex1 || null) : null);
    return 0;
  }

  /**
   * Convenience wrapper for the design-bar overlays: an axis-aligned rect in
   * screen pixels (y down, from the viewport's top-left), one flat colour,
   * with the intro's own z = 0.01 / rhw = 100 defaults.
   */
  drawRect2D(x0, y0, x1, y1, color, opts = {}) {
    const z = opts.z ?? TEXT_Z;
    const rhw = opts.rhw ?? TEXT_RHW;
    const u0 = opts.u0 ?? 0, v0 = opts.v0 ?? 0;
    const u1 = opts.u1 ?? 1, v1 = opts.v1 ?? 1;
    return this.drawQuad2D(
      [x0, y0, z, rhw, color, u0, v0, u0, v0],
      [x1, y0, z, rhw, color, u1, v0, u1, v0],
      [x1, y1, z, rhw, color, u1, v1, u1, v1],
      [x0, y1, z, rhw, color, u0, v1, u0, v1]);
  }

  // -- text ----------------------------------------------------------------

  /**
   * Inject the font. `texture` is a shim texture handle for the 256x256 atlas
   * built by FUN_00404b10 (white texels, 2-bit alpha, top 78 rows used) —
   * `work/baked/dr/font.png`. `metrics` is optional and may carry
   * `{ rects, uvScale, unitScale, spaceWidth, charGap, centre, kern }`;
   * `rects` accepts either `[[x0,y0,x1,y1], …]` or the
   * `work/baked/dr/font_metrics.json` `glyphs` map.
   */
  setFont(texture, metrics) {
    this.fontTexture = texture || null;
    if (!metrics) return this;
    if (metrics.rects) this.glyphRects = normaliseRects(metrics.rects);
    else if (metrics.glyphs) this.glyphRects = normaliseRects(metrics.glyphs);
    const m = this.fontMetrics;
    const c = metrics.constants || metrics;
    if (c.uvScale !== undefined) m.uvScale = c.uvScale;
    if (c.unitScale !== undefined) m.unitScale = c.unitScale;
    if (c.spaceWidthUnits !== undefined) m.spaceWidth = c.spaceWidthUnits;
    if (c.spaceWidth !== undefined) m.spaceWidth = c.spaceWidth;
    if (c.charGapUnits !== undefined) m.charGap = c.charGapUnits;
    if (c.charGap !== undefined) m.charGap = c.charGap;
    if (c.centreFactor !== undefined) m.centre = c.centreFactor;
    if (c.centre !== undefined) m.centre = c.centre;
    if (metrics.kern) m.kern = metrics.kern;
    return this;
  }

  /**
   * FUN_00404c30 — glyph metrics for one character at one scale. Returns a
   * REUSED object with the original's seven fields, in its order:
   *   u0, u1, v0, v1  texture coordinates (atlas pixels × 1/255)
   *   w, h            quad size in screen pixels  (rect size × scale/255)
   *   kern            vertical offset in screen pixels (kernUnits × scale/256)
   *
   * A space has w = scale*16/256, h = 0 and uv 0.85 all round — it still
   * emits a (degenerate, invisible) quad in the original.
   *
   * NOTE: with no `out` argument this returns a SHARED scratch object that the
   * next call overwrites (the original returns a pointer into its own frame).
   * Read the fields you need before calling again, or pass your own `out`.
   */
  glyphMetrics(ch, scale, out) {
    const g = out || this._glyph, m = this.fontMetrics;
    if (ch === ' ') {
      g.u0 = g.u1 = g.v0 = g.v1 = 0.85;
      g.w = scale * m.unitScale * m.spaceWidth;
      g.h = 0.0;
      g.kern = 0.0;
      return g;
    }
    const r = this.glyphRects[glyphIndex(ch)] || [0, 0, 0, 0];
    const S = m.uvScale;
    g.u0 = r[0] * S; g.v0 = r[1] * S;
    g.u1 = r[2] * S; g.v1 = r[3] * S;
    g.w = (r[2] * S - r[0] * S) * scale;
    g.h = (r[3] * S - r[1] * S) * scale;
    g.kern = (m.kern[ch] || 0) * scale * m.unitScale;
    return g;
  }

  /** Total advance of a string at `scale`: Σ(glyph width + gap), including a
   *  trailing gap after the last character — as the original accumulates it. */
  measureText(str, scale) {
    const gap = scale * this.fontMetrics.unitScale * this.fontMetrics.charGap;
    let w = 0;
    for (const ch of str) w += this.glyphMetrics(ch, scale).w + gap;
    return w;
  }

  /**
   * FUN_00404f10 — the actual text draw. `x` is the LEFT edge of the run.
   *
   * State it forces (all of it recovered from the disassembly at 0x404f10):
   *   cull NONE · stage-1 COLOROP DISABLE · SetTexture(font, NULL) ·
   *   alpha blend ON · SRCBLEND = SRCALPHA · DESTBLEND = INVSRCALPHA.
   * It does NOT touch the Z states; every glyph quad sits at z = 0.01 with
   * rhw = 100.
   *
   * Per glyph, one TRIANGLEFAN quad in the order
   *   (x, y+kern) (x+w, y+kern) (x+w, y+kern+h) (x, y+kern+h)
   * with uv (u0,v0) (u1,v0) (u1,v1) (u0,v1), all four vertices carrying
   * `color` as diffuse. The pen then advances by w + gap.
   */
  drawTextAt(str, x, y, scale, color) {
    const d3d = this.d3d;
    d3d.setCullMode(0);                       // FUN_0040484a(3, 0)
    d3d.setStage1Op(0);                       // FUN_0040484a(1, 0)
    d3d.SetTextureHandle(this.fontTexture);   // FUN_0040406d(font)
    d3d.setAlphaBlend(1);                     // FUN_0040484a(5, 1)
    d3d.SetRenderState(D3DRS_SRCBLEND, D3DBLEND_SRCALPHA);
    d3d.SetRenderState(D3DRS_DESTBLEND, D3DBLEND_INVSRCALPHA);

    const gap = scale * this.fontMetrics.unitScale * this.fontMetrics.charGap;
    const f = this._quad2D, u = this._quad2DU32;
    const c = color >>> 0;
    let penX = x;
    let quads = 0;
    for (const ch of str) {
      const g = this.glyphMetrics(ch, scale);
      const x1 = penX + g.w;
      const y0 = g.kern + y;
      const y1 = g.h + g.kern + y;
      const P = [
        [penX, y0, g.u0, g.v0], [x1, y0, g.u1, g.v0],
        [x1, y1, g.u1, g.v1], [penX, y1, g.u0, g.v1],
      ];
      for (let i = 0; i < 4; i++) {
        const b = i * 9, p = P[i];
        f[b] = p[0]; f[b + 1] = p[1]; f[b + 2] = TEXT_Z; f[b + 3] = TEXT_RHW;
        u[b + 4] = c;
        f[b + 5] = p[2]; f[b + 6] = p[3]; f[b + 7] = p[2]; f[b + 8] = p[3];
      }
      this.flushQuad2D();
      quads++;
      penX += g.w + gap;
    }
    return quads;
  }

  /**
   * FUN_00404dd0 — CENTRED text: the run is measured first and the pen starts
   * at `x - width * 0.5`. This is what the intro titles and the credits use
   * (all four credit lines are drawn at x = 320, the screen centre).
   */
  drawText(str, x, y, scale, color) {
    const start = x - this.measureText(str, scale) * this.fontMetrics.centre;
    return this.drawTextAt(str, start, y, scale, color);
  }

  /**
   * FUN_00404e70 — RIGHT-ALIGNED text: the pen starts at `x - width`, so the
   * run ENDS at `x`. Used by the slogans and the address block
   * ("hard facts # we are better" at x = 620, "amsterdam" at x = 540, …).
   */
  drawTextRight(str, x, y, scale, color) {
    const start = x - this.measureText(str, scale);
    return this.drawTextAt(str, start, y, scale, color);
  }

  // -- textures ------------------------------------------------------------

  /**
   * FUN_00403bd6 — upload a CPU-generated ARGB8888 image as a texture.
   *
   * `pixels` is a `Uint32Array` of packed D3DCOLOR (0xAARRGGBB), the format
   * every procedural generator in the intro produces. Sizes are clamped to
   * the device's maximum and the source is point-resampled if the clamp
   * bites, exactly as the original does before the Lock/Unlock. The 16-bit /
   * alpha-only surface formats the original could pick are irrelevant here —
   * the shim is always RGBA8 — so `flags` only survives for call-site
   * fidelity (bit 1 = "prefer 32-bit", bit 2 = "alpha format").
   */
  createTexture(pixels, w, h, flags = 0) {
    const caps = this.d3d.GetCaps();
    const dw = Math.min(w, caps.dwMaxTextureWidth | 0 || w);
    const dh = Math.min(h, caps.dwMaxTextureHeight | 0 || h);
    let src = pixels;
    if ((dw !== w || dh !== h) && pixels) {
      const scaled = new Uint32Array(dw * dh);
      const sx = w / dw, sy = h / dh;
      for (let y = 0, fy = 0; y < dh; y++, fy += sy) {
        const row = Math.round(fy) * w;
        for (let x = 0, fx = 0; x < dw; x++, fx += sx) {
          scaled[y * dw + x] = pixels[row + Math.round(fx)];
        }
      }
      src = scaled;
    }
    return this.d3d.createTexture(src, dw, dh, flags);
  }

  /** Re-upload level 0 of an existing texture (the animated-texture path). */
  updateTexture(handle, pixels) { return this.d3d.updateTexture(handle, pixels); }
}

/** Write one 9-number XYZRHW vertex (x,y,z,rhw,D3DCOLOR,u0,v0,u1,v1). */
function writeVertex2D(f, u, i, s) {
  const b = i * 9;
  f[b] = s[0]; f[b + 1] = s[1]; f[b + 2] = s[2]; f[b + 3] = s[3];
  u[b + 4] = s[4] >>> 0;
  f[b + 5] = s[5]; f[b + 6] = s[6]; f[b + 7] = s[7]; f[b + 8] = s[8];
}

/** Accept `[[x0,y0,x1,y1], …]`, `[{x0,y0,x1,y1}, …]` or the JSON `glyphs` map. */
function normaliseRects(src) {
  if (Array.isArray(src)) {
    return src.map((r) => (Array.isArray(r) ? r : [r.x0, r.y0, r.x1, r.y1]));
  }
  // font_metrics.json: { "<char>": { index, x0, y0, x1, y1, … } }
  const out = [];
  for (const key of Object.keys(src)) {
    const g = src[key];
    if (g && g.index !== undefined) out[g.index] = [g.x0, g.y0, g.x1, g.y1];
  }
  for (let i = 0; i < out.length; i++) if (!out[i]) out[i] = [0, 0, 0, 0];
  // keep the out-of-range tail so the '*' quirk still works
  for (let i = out.length; i < DEFAULT_GLYPH_RECTS.length; i++) {
    out[i] = DEFAULT_GLYPH_RECTS[i];
  }
  return out;
}

export default Kernel;
