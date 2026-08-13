// minid3d7.js — a Direct3D 7 immediate-mode shim over WebGL2.
//
// Written for the browser restoration of "lost vegas" by threestate
// (Ambience 2000, 64k intro, D3D7 HAL, 640x480x16 exclusive fullscreen).
// The call surface mirrors IDirect3DDevice7 as documented in
// re/engine/D3D7_API.md, so ported effect code can read like the original
// decompile: SetRenderState(D3DRS_CULLMODE, D3DCULL_CCW), DrawIndexedPrimitive
// (D3DPT_TRIANGLELIST, 0x242, verts, nv, idx, ni, 0), and so on.
//
// Structure follows web/js/minigl.js from the completed PTCT restoration:
// one constructor taking a canvas, one uber-shader, cached matrix state,
// state setters, and a couple of draw entry points.
//
// ---------------------------------------------------------------------------
// THE FIVE D3D <-> WebGL IMPEDANCE POINTS (each is re-explained at its site)
// ---------------------------------------------------------------------------
// 1. MATRICES. D3D is row-vector (v' = v * M) and stores matrices row-major
//    (float[16] = _11.._44, index = row*4+col). GL is column-vector
//    (v' = M * v) and uniformMatrix4fv(...,transpose=false) reads column-major
//    (index = col*4+row). Reading a D3D row-major array as a GL column-major
//    array *is* the transpose, and (v*M)^T == M^T * v^T -- so a D3D matrix can
//    be handed to WebGL verbatim, no repacking, as long as we also keep D3D's
//    multiplication order (WORLD * VIEW * PROJECTION, in that order).
// 2. DEPTH RANGE. D3D clip space is z in [0,w] (device z in [0,1]); GL clip
//    space is z in [-w,w]. We keep the original's projection matrix bit-exact
//    and fix it up in the vertex shader with `pos.z = 2.0*pos.z - pos.w`.
//    Doing it there (rather than folding a bias into the projection) means
//    effect code can use the demo's own FUN_00401eb0 matrix unchanged, and the
//    XYZRHW path -- which never touches a projection matrix -- gets the same
//    treatment for free.
// 3. WINDING / CULLING. Both APIs name a face by how it *looks* on the final
//    image, and because we do the y flip in clip space the image is the same
//    -- so "clockwise" means the same triangles in both. What differs is the
//    default: D3D (left-handed) treats CLOCKWISE as the front face, GL treats
//    counter-clockwise as the front face. So we set gl.frontFace(gl.CW) once,
//    which makes GL's notion of "front" coincide with D3D's, and then the cull
//    modes map straight across:
//        D3DCULL_CCW (cull the counter-clockwise ones) -> gl.cullFace(gl.BACK)
//        D3DCULL_CW  (cull the clockwise ones)         -> gl.cullFace(gl.FRONT)
//    (Verified both ways in test/minid3d7_test.html; getting this backwards
//    turns every solid object inside out, which is exactly the failure mode
//    this shim exists to prevent.)
// 4. D3DCOLOR IS BGRA. A D3DCOLOR is a packed uint32 0xAARRGGBB; on x86 that
//    lands in memory as bytes B,G,R,A. So vertex data can be uploaded raw (no
//    CPU conversion, exactly like D3D's user-pointer draws) and unswizzled in
//    the vertex shader with `.zyxw`.
// 5. STAGE STATE vs TEXTURE STATE. D3D7 filtering/addressing is per texture
//    *stage*; GL's is per texture *object*. We use WebGL2 sampler objects
//    (cached, one per distinct filter/address combination) bound to the texture
//    unit, which restores the D3D semantics exactly.
// ---------------------------------------------------------------------------

import { Vec3 } from './mathlib.js';

// ===========================================================================
// D3D7 enumerations. Exported individually so ported code reads like the
// original source. Values are the real DirectX 7 SDK values (d3dtypes.h).
// ===========================================================================

// --- D3DTRANSFORMSTATETYPE (SetTransform) ---
export const D3DTS_WORLD = 1;
export const D3DTS_VIEW = 2;
export const D3DTS_PROJECTION = 3;

// --- D3DPRIMITIVETYPE ---
export const D3DPT_POINTLIST = 1;
export const D3DPT_LINELIST = 2;
export const D3DPT_LINESTRIP = 3;
export const D3DPT_TRIANGLELIST = 4;   // the intro uses this
export const D3DPT_TRIANGLESTRIP = 5;
export const D3DPT_TRIANGLEFAN = 6;    // ...and this

// --- FVF bits and the two flexible vertex formats the intro uses ---
export const D3DFVF_XYZ = 0x002;
export const D3DFVF_XYZRHW = 0x004;
export const D3DFVF_DIFFUSE = 0x040;
export const D3DFVF_TEX1 = 0x100;
export const D3DFVF_TEX2 = 0x200;
/** XYZ | DIFFUSE | TEX2 — 32-byte stride, untransformed 3D scene geometry. */
export const FVF_XYZ_DIFFUSE_TEX2 = 0x242;
/** XYZRHW | DIFFUSE | TEX2 — 36-byte stride, pre-transformed 2D overlays. */
export const FVF_XYZRHW_DIFFUSE_TEX2 = 0x244;

// --- D3DRENDERSTATETYPE (the subset the intro touches, per D3D7_API.md §3) ---
export const D3DRS_TEXTUREPERSPECTIVE = 4;
export const D3DRS_ZENABLE = 7;
export const D3DRS_FILLMODE = 8;
export const D3DRS_SHADEMODE = 9;
export const D3DRS_ZWRITEENABLE = 14;      // 0x0e
export const D3DRS_ALPHATESTENABLE = 15;
export const D3DRS_SRCBLEND = 19;          // 0x13
export const D3DRS_DESTBLEND = 20;         // 0x14
export const D3DRS_CULLMODE = 22;          // 0x16
export const D3DRS_ZFUNC = 23;             // 0x17
export const D3DRS_ALPHAREF = 24;
export const D3DRS_ALPHAFUNC = 25;
export const D3DRS_DITHERENABLE = 26;      // 0x1a
export const D3DRS_ALPHABLENDENABLE = 27;  // 0x1b
export const D3DRS_FOGENABLE = 28;         // 0x1c
export const D3DRS_SPECULARENABLE = 29;
export const D3DRS_FOGCOLOR = 34;          // 0x22
export const D3DRS_FOGTABLEMODE = 35;      // 0x23
export const D3DRS_FOGSTART = 36;
export const D3DRS_FOGEND = 37;
export const D3DRS_FOGDENSITY = 38;        // 0x26
export const D3DRS_TEXTUREFACTOR = 60;     // 0x3c
export const D3DRS_LIGHTING = 137;         // 0x89
export const D3DRS_AMBIENT = 139;          // 0x8b
export const D3DRS_COLORVERTEX = 141;

// --- D3DZBUFFERTYPE ---
export const D3DZB_FALSE = 0;
export const D3DZB_TRUE = 1;
export const D3DZB_USEW = 2;

// --- D3DCMPFUNC (ZFUNC / ALPHAFUNC) ---
export const D3DCMP_NEVER = 1;
export const D3DCMP_LESS = 2;
export const D3DCMP_EQUAL = 3;
export const D3DCMP_LESSEQUAL = 4;         // the intro's ZFUNC
export const D3DCMP_GREATER = 5;
export const D3DCMP_NOTEQUAL = 6;
export const D3DCMP_GREATEREQUAL = 7;
export const D3DCMP_ALWAYS = 8;

// --- D3DBLEND ---
export const D3DBLEND_ZERO = 1;
export const D3DBLEND_ONE = 2;
export const D3DBLEND_SRCCOLOR = 3;
export const D3DBLEND_INVSRCCOLOR = 4;
export const D3DBLEND_SRCALPHA = 5;
export const D3DBLEND_INVSRCALPHA = 6;
export const D3DBLEND_DESTALPHA = 7;
export const D3DBLEND_INVDESTALPHA = 8;
export const D3DBLEND_DESTCOLOR = 9;
export const D3DBLEND_INVDESTCOLOR = 10;
export const D3DBLEND_SRCALPHASAT = 11;
export const D3DBLEND_BOTHSRCALPHA = 12;
export const D3DBLEND_BOTHINVSRCALPHA = 13;

// --- D3DCULL. See impedance note 3: these are relative to D3D's y-down,
// front-face-is-clockwise convention, i.e. the OPPOSITE sense from GL. ---
export const D3DCULL_NONE = 1;
export const D3DCULL_CW = 2;
export const D3DCULL_CCW = 3;

// --- D3DSHADEMODE ---
export const D3DSHADE_FLAT = 1;
export const D3DSHADE_GOURAUD = 2;
export const D3DSHADE_PHONG = 3;

// --- D3DFOGMODE (FOGTABLEMODE) ---
export const D3DFOG_NONE = 0;
export const D3DFOG_EXP = 1;               // the intro's fog
export const D3DFOG_EXP2 = 2;
export const D3DFOG_LINEAR = 3;

// --- D3DTEXTURESTAGESTATETYPE ---
export const D3DTSS_COLOROP = 1;
export const D3DTSS_COLORARG1 = 2;
export const D3DTSS_COLORARG2 = 3;
export const D3DTSS_ALPHAOP = 4;
export const D3DTSS_ALPHAARG1 = 5;
export const D3DTSS_ALPHAARG2 = 6;
export const D3DTSS_TEXCOORDINDEX = 11;    // 0x0b
export const D3DTSS_ADDRESS = 12;          // 0x0c — sets both U and V
export const D3DTSS_ADDRESSU = 13;
export const D3DTSS_ADDRESSV = 14;
export const D3DTSS_BORDERCOLOR = 15;
export const D3DTSS_MAGFILTER = 16;        // 0x10
export const D3DTSS_MINFILTER = 17;        // 0x11
export const D3DTSS_MIPFILTER = 18;        // 0x12

// --- D3DTEXTUREOP ---
export const D3DTOP_DISABLE = 1;
export const D3DTOP_SELECTARG1 = 2;
export const D3DTOP_SELECTARG2 = 3;
export const D3DTOP_MODULATE = 4;
export const D3DTOP_MODULATE2X = 5;
export const D3DTOP_MODULATE4X = 6;
export const D3DTOP_ADD = 7;
export const D3DTOP_ADDSIGNED = 8;
export const D3DTOP_ADDSIGNED2X = 9;
export const D3DTOP_SUBTRACT = 10;
export const D3DTOP_ADDSMOOTH = 11;
export const D3DTOP_BLENDDIFFUSEALPHA = 12;
export const D3DTOP_BLENDTEXTUREALPHA = 13;
export const D3DTOP_BLENDFACTORALPHA = 14;
export const D3DTOP_BLENDTEXTUREALPHAPM = 15;
export const D3DTOP_BLENDCURRENTALPHA = 16;

// --- D3DTA_* (texture stage argument selectors) ---
export const D3DTA_DIFFUSE = 0;
export const D3DTA_CURRENT = 1;
export const D3DTA_TEXTURE = 2;
export const D3DTA_TFACTOR = 3;
export const D3DTA_SPECULAR = 4;
export const D3DTA_COMPLEMENT = 0x10;
export const D3DTA_ALPHAREPLICATE = 0x20;

// --- D3DTEXTUREADDRESS ---
export const D3DTADDRESS_WRAP = 1;
export const D3DTADDRESS_MIRROR = 2;
export const D3DTADDRESS_CLAMP = 3;
export const D3DTADDRESS_BORDER = 4;

// --- D3DTEXTUREFILTER (mag/min) and D3DTEXTUREMIPFILTER ---
export const D3DTFG_POINT = 1;
export const D3DTFG_LINEAR = 2;
export const D3DTFN_POINT = 1;
export const D3DTFN_LINEAR = 2;
export const D3DTFP_NONE = 1;
export const D3DTFP_POINT = 2;
export const D3DTFP_LINEAR = 3;

// --- Clear flags / DrawPrimitive flags ---
export const D3DCLEAR_TARGET = 0x1;
export const D3DCLEAR_ZBUFFER = 0x2;
export const D3DCLEAR_STENCIL = 0x4;
export const D3DDP_DONOTUPDATEEXTENTS = 0x8;
export const D3DDP_DONOTLIGHT = 0x10;

// --- texture creation flags (mirrors FUN_00403bd6's `flags` byte) ---
export const D3DTEX_ALPHA = 0x4;    // pick the alpha pixel format (ignored: RGBA8)
export const D3DTEX_16BIT = 0x2;    // force 16-bit surface   (ignored: RGBA8)
export const D3DTEX_MIPMAP = 0x100; // [shim ext] build a mip chain (original never did)

/** True if the FVF carries pre-transformed (XYZRHW) vertices. */
export function rhwOf(fvf) { return fvf === FVF_XYZRHW_DIFFUSE_TEX2; }

// Stride (bytes) of each supported FVF.
export function fvfStride(fvf) {
  if (fvf === FVF_XYZ_DIFFUSE_TEX2) return 32;    // 3f + 1dw + 2f + 2f
  if (fvf === FVF_XYZRHW_DIFFUSE_TEX2) return 36; // 4f + 1dw + 2f + 2f
  throw new Error('minid3d7: unsupported FVF 0x' + fvf.toString(16));
}

/** Pack a D3DCOLOR (0xAARRGGBB) from 0..255 components. */
export function D3DCOLOR_ARGB(a, r, g, b) {
  return (((a & 255) << 24) | ((r & 255) << 16) | ((g & 255) << 8) | (b & 255)) >>> 0;
}
/** Pack a D3DCOLOR from 0..1 floats (D3DCOLOR_COLORVALUE in the SDK). */
export function D3DCOLOR_COLORVALUE(r, g, b, a) {
  const q = (v) => Math.max(0, Math.min(255, Math.round(v * 255)));
  return D3DCOLOR_ARGB(q(a), q(r), q(g), q(b));
}
export const D3DCOLOR_RGBA = (r, g, b, a) => D3DCOLOR_ARGB(a, r, g, b);

// ===========================================================================
// D3DMATRIX — 4x4, row-major (index = row*4 + col, i.e. m[12..14] is the
// translation row _41.._43), left-handed, row-vector convention: v' = v * M.
//
// This is deliberately NOT mathlib.js's Mat4, which is column-major GL/OpenGL
// convention: mixing the two silently transposes everything. mathlib is left
// untouched; use Mat4 for GL-style math and D3DMatrix for anything that feeds
// SetTransform. Convert with D3DMatrix.fromGLMat4()/toGLMat4() if ever needed.
// ===========================================================================
export class D3DMatrix {
  constructor(src) {
    this.m = new Float32Array(16);
    if (src) this.m.set(src.m ? src.m : src);
    else this.identity();
  }
  identity() {
    const m = this.m;
    m.fill(0);
    m[0] = m[5] = m[10] = m[15] = 1;
    return this;
  }
  zero() { this.m.fill(0); return this; }
  copy(o) { this.m.set(o.m ? o.m : o); return this; }
  clone() { return new D3DMatrix(this.m); }

  /** this = this * b, in D3D row-major order (out[r][c] = sum this[r][k]*b[k][c]). */
  mul(b) { return D3DMatrix.multiply(this, b, this); }

  /** out = a * b (row-major). `out` may alias a or b. */
  static multiply(a, b, out) {
    const A = a.m ? a.m : a, B = b.m ? b.m : b;
    const r = D3DMatrix._tmp;
    for (let i = 0; i < 4; i++) {
      const a0 = A[i * 4], a1 = A[i * 4 + 1], a2 = A[i * 4 + 2], a3 = A[i * 4 + 3];
      r[i * 4 + 0] = a0 * B[0] + a1 * B[4] + a2 * B[8] + a3 * B[12];
      r[i * 4 + 1] = a0 * B[1] + a1 * B[5] + a2 * B[9] + a3 * B[13];
      r[i * 4 + 2] = a0 * B[2] + a1 * B[6] + a2 * B[10] + a3 * B[14];
      r[i * 4 + 3] = a0 * B[3] + a1 * B[7] + a2 * B[11] + a3 * B[15];
    }
    const O = out || new D3DMatrix();
    (O.m ? O.m : O).set(r);
    return O;
  }

  // --- builders, mirroring the intro's matrix helpers (D3D7_API.md §6) ---

  /** FUN_00401a50: translation. Row 3 = _41,_42,_43. */
  static translation(x, y, z) {
    const r = new D3DMatrix();
    r.m[12] = x; r.m[13] = y; r.m[14] = z;
    return r;
  }
  static scaling(x, y, z) {
    const r = new D3DMatrix();
    r.m[0] = x; r.m[5] = y; r.m[10] = z;
    return r;
  }
  /** FUN_00401f50: rotation about X (radians, left-handed). */
  static rotationX(a) {
    const r = new D3DMatrix(), c = Math.cos(a), s = Math.sin(a);
    r.m[5] = c; r.m[6] = s; r.m[9] = -s; r.m[10] = c;
    return r;
  }
  /** FUN_00401fa0: rotation about Y. */
  static rotationY(a) {
    const r = new D3DMatrix(), c = Math.cos(a), s = Math.sin(a);
    r.m[0] = c; r.m[2] = -s; r.m[8] = s; r.m[10] = c;
    return r;
  }
  /** FUN_00401ff0: rotation about Z. */
  static rotationZ(a) {
    const r = new D3DMatrix(), c = Math.cos(a), s = Math.sin(a);
    r.m[0] = c; r.m[1] = s; r.m[4] = -s; r.m[5] = c;
    return r;
  }

  /**
   * FUN_00401b50: left-handed look-at view matrix (D3DXMatrixLookAtLH).
   * zaxis = normalize(at-eye); xaxis = normalize(cross(up,zaxis));
   * yaxis = cross(zaxis,xaxis). Up defaults to +Y, with the original's
   * degenerate-case fallbacks folded in.
   */
  static lookAtLH(eye, at, up) {
    const e = _v3(eye), a = _v3(at);
    const u = up ? _v3(up) : new Vec3(0, 1, 0);
    const z = new Vec3(a.x - e.x, a.y - e.y, a.z - e.z);
    const zl = Math.hypot(z.x, z.y, z.z) || 1;
    z.x /= zl; z.y /= zl; z.z /= zl;
    let x = _cross(u, z);
    let xl = Math.hypot(x.x, x.y, x.z);
    if (xl < 1e-6) { // view direction parallel to up: pick another basis
      x = _cross(new Vec3(0, 0, 1), z);
      xl = Math.hypot(x.x, x.y, x.z) || 1;
    }
    x.x /= xl; x.y /= xl; x.z /= xl;
    const y = _cross(z, x);
    const r = new D3DMatrix(), m = r.m;
    m[0] = x.x; m[1] = y.x; m[2] = z.x; m[3] = 0;
    m[4] = x.y; m[5] = y.y; m[6] = z.y; m[7] = 0;
    m[8] = x.z; m[9] = y.z; m[10] = z.z; m[11] = 0;
    m[12] = -(e.x * x.x + e.y * x.y + e.z * x.z);
    m[13] = -(e.x * y.x + e.y * y.y + e.z * y.z);
    m[14] = -(e.x * z.x + e.y * z.y + e.z * z.z);
    m[15] = 1;
    return r;
  }

  /**
   * FUN_00401eb0: the intro's own perspective projection. Left-handed,
   * z mapped to [0,1], and note `fovH` is the FULL HORIZONTAL field of view
   * (the original computes cot(fov*0.5) for _11 and multiplies _22 by the
   * 4:3 aspect constant at 0x412098), which is the reverse of D3DX's
   * vertical-fov convention. Keep this form so ported effects can pass the
   * demo's own fov values unchanged.
   *   _33 = zf/(zf-zn)   _34 = 1   _43 = -zn*zf/(zf-zn)   _44 = 0
   */
  static perspectiveFovLH(fovH, aspect, zn, zf) {
    const cot = Math.cos(fovH * 0.5) / Math.sin(fovH * 0.5);
    const q = zf / (zf - zn);
    const r = new D3DMatrix().zero(), m = r.m;
    m[0] = cot;
    m[5] = cot * aspect;
    m[10] = q;
    m[11] = 1;
    m[14] = -q * zn;
    return r;
  }

  /** Column-major (GL/mathlib Mat4) view of this matrix — i.e. the transpose. */
  toGLMat4(out) {
    const m = this.m, d = out ? (out.m || out) : new Float32Array(16);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) d[c * 4 + r] = m[r * 4 + c];
    return out || d;
  }
  static fromGLMat4(mat) {
    const s = mat.m ? mat.m : mat, r = new D3DMatrix();
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) r.m[i * 4 + j] = s[j * 4 + i];
    return r;
  }

  /** v * M (point, w=1), returning {x,y,z}. Handy for CPU-side billboarding. */
  transformPoint(v, out) {
    const m = this.m, o = out || new Vec3();
    const x = v.x, y = v.y, z = v.z;
    o.x = x * m[0] + y * m[4] + z * m[8] + m[12];
    o.y = x * m[1] + y * m[5] + z * m[9] + m[13];
    o.z = x * m[2] + y * m[6] + z * m[10] + m[14];
    return o;
  }
}
D3DMatrix._tmp = new Float32Array(16);

function _v3(v) { return Array.isArray(v) ? new Vec3(v[0], v[1], v[2]) : v; }
function _cross(a, b) {
  return new Vec3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
}

// ===========================================================================
// Vertex scratch helper.
//
// The original passes raw user pointers to DrawPrimitive; we do the same, so
// the shim's draw calls take a typed array / ArrayBuffer whose bytes are
// already in FVF layout. This helper hands you the three aliased views you
// need to fill one: floats for position/uv, uint32 for the D3DCOLOR.
// ===========================================================================
export function makeVertexScratch(fvf, vertexCount) {
  const stride = fvfStride(fvf);
  const bytes = new Uint8Array(stride * vertexCount);
  return {
    fvf, stride,
    strideF: stride >> 2,                     // stride in float/uint32 units
    count: vertexCount,
    bytes,
    f32: new Float32Array(bytes.buffer),
    u32: new Uint32Array(bytes.buffer),
    /** index of the DIFFUSE dword for vertex i, in the u32 view */
    colorIndex(i) { return i * (stride >> 2) + (fvf === FVF_XYZRHW_DIFFUSE_TEX2 ? 4 : 3); },
    /** index of the first float of vertex i, in the f32 view */
    base(i) { return i * (stride >> 2); },
  };
}

// ===========================================================================
// The uber-shader.
// ===========================================================================

const VS = `#version 300 es
precision highp float;

// FVF 0x242: aPos bound as 3 floats (w defaults to 1).
// FVF 0x244: aPos bound as 4 floats = x,y (screen pixels), z (device depth
//            [0,1]), rhw (= 1/w).
layout(location = 0) in vec4 aPos;
// D3DCOLOR bytes as they sit in memory: B,G,R,A (impedance note 4).
layout(location = 1) in vec4 aDiffuseBGRA;
layout(location = 2) in vec2 aUV0;
layout(location = 3) in vec2 aUV1;

uniform mat4 uWVP;        // WORLD*VIEW*PROJECTION, D3D row-major, uploaded verbatim
uniform mat4 uWV;         // WORLD*VIEW, for the fog distance
uniform vec4 uViewport;   // x, y, width, height — D3D screen pixels, y down
uniform bool uTransformed;

out vec4 vDiffuse;
flat out vec4 vDiffuseFlat;   // D3DSHADE_FLAT source (see uShadeFlat in the FS)
out vec2 vUV0;
out vec2 vUV1;
out float vFogDist;

void main() {
  vec4 c = aDiffuseBGRA.zyxw;   // B,G,R,A -> R,G,B,A
  vDiffuse = c;
  vDiffuseFlat = c;
  vUV0 = aUV0;
  vUV1 = aUV1;

  vec4 p;
  if (uTransformed) {
    // --- XYZRHW: pre-transformed screen-space vertices ---------------------
    // These bypass WORLD/VIEW/PROJECTION entirely. x,y are pixels measured
    // from the top-left of the *viewport*; z is already a device depth in
    // [0,1]; rhw is 1/w and exists so the rasteriser can still interpolate
    // texcoords with perspective correction. We rebuild a clip-space position
    // whose w is 1/rhw and pre-multiply xyz by it, which hands GL exactly the
    // same interpolation weights D3D's rasteriser used.
    float w = (aPos.w != 0.0) ? (1.0 / aPos.w) : 1.0;
    float ndcx = (aPos.x - uViewport.x) / uViewport.z * 2.0 - 1.0;
    // y flip: D3D screen y grows downward, NDC y grows upward.
    float ndcy = 1.0 - (aPos.y - uViewport.y) / uViewport.w * 2.0;
    p = vec4(ndcx * w, ndcy * w, aPos.z * w, w);
    vFogDist = w;   // D3D feeds table fog from w (=1/rhw) for transformed verts
  } else {
    p = uWVP * vec4(aPos.xyz, 1.0);
    // Left-handed view space: +z points away from the eye, so the eye-space
    // z IS the fog distance (no negation, unlike GL).
    vFogDist = (uWV * vec4(aPos.xyz, 1.0)).z;
  }
  // Impedance note 2: D3D clip z in [0,w] -> GL clip z in [-w,w].
  p.z = 2.0 * p.z - p.w;
  gl_Position = p;
}`;

const FS = `#version 300 es
precision highp float;

in vec4 vDiffuse;
flat in vec4 vDiffuseFlat;
in vec2 vUV0;
in vec2 vUV1;
in float vFogDist;

uniform sampler2D uTex0;
uniform sampler2D uTex1;

// The 2-stage fixed-function combiner, expressed as data. Packed into ONE
// array so a stage change costs a single uniform1iv instead of seven — the
// intro toggles stage 1 between DISABLE/ADD/MODULATE on alternating draws, so
// this upload happens constantly. Stage s occupies uStage[s*7 .. s*7+6].
// (Literal indices only — no dynamic indexing, so this compiles everywhere.)
uniform int uStage[14];
#define ST_COLOROP(s)   uStage[(s) * 7 + 0]
#define ST_COLORARG1(s) uStage[(s) * 7 + 1]
#define ST_COLORARG2(s) uStage[(s) * 7 + 2]
#define ST_ALPHAOP(s)   uStage[(s) * 7 + 3]
#define ST_ALPHAARG1(s) uStage[(s) * 7 + 4]
#define ST_ALPHAARG2(s) uStage[(s) * 7 + 5]
#define ST_TCI(s)       uStage[(s) * 7 + 6]

uniform vec4 uTexFactor;    // D3DRS_TEXTUREFACTOR, as D3DTA_TFACTOR
uniform bool uShadeFlat;    // D3DRS_SHADEMODE == D3DSHADE_FLAT

uniform bool uFogEnable;
uniform int uFogMode;       // D3DFOG_EXP / EXP2 / LINEAR
uniform float uFogDensity;
uniform float uFogStart;
uniform float uFogEnd;
uniform vec3 uFogColor;

out vec4 outColor;

// D3DTA_* argument selection, including the COMPLEMENT / ALPHAREPLICATE
// modifier bits that D3D ORs into the argument value.
vec4 selArg(int arg, vec4 texc, vec4 cur, vec4 dif, vec4 tf) {
  int base = arg & 0x0f;
  vec4 r;
  if (base == 1) r = cur;
  else if (base == 2) r = texc;
  else if (base == 3) r = tf;
  else r = dif;                     // D3DTA_DIFFUSE and D3DTA_SPECULAR
  if ((arg & 0x20) != 0) r = vec4(r.a);       // D3DTA_ALPHAREPLICATE
  if ((arg & 0x10) != 0) r = vec4(1.0) - r;   // D3DTA_COMPLEMENT
  return r;
}

vec4 combine(int op, vec4 a1, vec4 a2, vec4 texc, vec4 cur, vec4 dif, vec4 tf) {
  if (op == 2) return a1;                            // SELECTARG1
  if (op == 3) return a2;                            // SELECTARG2
  if (op == 4) return a1 * a2;                       // MODULATE
  if (op == 5) return a1 * a2 * 2.0;                 // MODULATE2X
  if (op == 6) return a1 * a2 * 4.0;                 // MODULATE4X
  if (op == 7) return a1 + a2;                       // ADD
  if (op == 8) return a1 + a2 - 0.5;                 // ADDSIGNED
  if (op == 9) return (a1 + a2 - 0.5) * 2.0;         // ADDSIGNED2X
  if (op == 10) return a1 - a2;                      // SUBTRACT
  if (op == 11) return a1 + a2 * (1.0 - a1);         // ADDSMOOTH
  if (op == 12) return a1 * dif.a + a2 * (1.0 - dif.a);   // BLENDDIFFUSEALPHA
  if (op == 13) return a1 * texc.a + a2 * (1.0 - texc.a); // BLENDTEXTUREALPHA
  if (op == 14) return a1 * tf.a + a2 * (1.0 - tf.a);     // BLENDFACTORALPHA
  if (op == 15) return a1 + a2 * (1.0 - texc.a);          // BLENDTEXTUREALPHAPM
  if (op == 16) return a1 * cur.a + a2 * (1.0 - cur.a);   // BLENDCURRENTALPHA
  return a1;
}

// One texture stage. Colour and alpha pipelines are independent, as in D3D.
vec4 runStage(int colorOp, int colorA1, int colorA2,
              int alphaOp, int alphaA1, int alphaA2,
              vec4 texc, vec4 cur, vec4 dif, vec4 tf) {
  vec3 rgb = combine(colorOp,
                     selArg(colorA1, texc, cur, dif, tf),
                     selArg(colorA2, texc, cur, dif, tf),
                     texc, cur, dif, tf).rgb;
  // ALPHAOP DISABLE leaves CURRENT's alpha untouched.
  float a = (alphaOp == 1) ? cur.a
          : combine(alphaOp,
                    selArg(alphaA1, texc, cur, dif, tf),
                    selArg(alphaA2, texc, cur, dif, tf),
                    texc, cur, dif, tf).a;
  return clamp(vec4(rgb, a), 0.0, 1.0);   // D3D saturates each stage's output
}

void main() {
  vec4 dif = uShadeFlat ? vDiffuseFlat : vDiffuse;
  vec2 uvA = (ST_TCI(0) == 1) ? vUV1 : vUV0;
  vec2 uvB = (ST_TCI(1) == 1) ? vUV1 : vUV0;
  vec4 t0 = texture(uTex0, uvA);
  vec4 t1 = texture(uTex1, uvB);

  // Stage 0. CURRENT at stage 0 is defined to be DIFFUSE.
  vec4 cur = dif;
  if (ST_COLOROP(0) != 1) {
    cur = runStage(ST_COLOROP(0), ST_COLORARG1(0), ST_COLORARG2(0),
                   ST_ALPHAOP(0), ST_ALPHAARG1(0), ST_ALPHAARG2(0),
                   t0, cur, dif, uTexFactor);
    // Stage 1 — reached only if stage 0 was enabled (a DISABLEd stage
    // disables every stage after it, per the D3D fixed-function rules).
    if (ST_COLOROP(1) != 1) {
      cur = runStage(ST_COLOROP(1), ST_COLORARG1(1), ST_COLORARG2(1),
                     ST_ALPHAOP(1), ST_ALPHAARG1(1), ST_ALPHAARG2(1),
                     t1, cur, dif, uTexFactor);
    }
  }

  if (uFogEnable) {
    float f;
    if (uFogMode == 3) f = (uFogEnd - vFogDist) / (uFogEnd - uFogStart);  // LINEAR
    else if (uFogMode == 2) {                                            // EXP2
      float d = uFogDensity * vFogDist;
      f = exp(-d * d);
    } else {                                                             // EXP
      f = exp(-uFogDensity * vFogDist);
    }
    f = clamp(f, 0.0, 1.0);
    // D3D blends fog into colour only; alpha is untouched.
    cur.rgb = mix(uFogColor, cur.rgb, f);
  }

  outColor = cur;
}`;

// ===========================================================================
// MiniD3D7
// ===========================================================================

export class MiniD3D7 {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} [opts] { preserveDrawingBuffer, antialias }
   */
  constructor(canvas, opts = {}) {
    const attribs = {
      alpha: false,
      antialias: opts.antialias === true,   // the original had none (16-bit HAL)
      depth: true,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: !!opts.preserveDrawingBuffer,
      powerPreference: 'high-performance',
    };
    let gl = canvas.getContext('webgl2', attribs);
    if (!gl) throw new Error('minid3d7: WebGL2 not available');
    this.canvas = canvas;
    this.gl = gl;

    this.contextLost = false;
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.contextLost = true;
    });

    // --- program ---
    const prog = gl.createProgram();
    const compile = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        throw new Error('minid3d7 shader: ' + gl.getShaderInfoLog(sh));
      }
      gl.attachShader(prog, sh);
    };
    compile(gl.VERTEX_SHADER, VS);
    compile(gl.FRAGMENT_SHADER, FS);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error('minid3d7 link: ' + gl.getProgramInfoLog(prog));
    }
    gl.useProgram(prog);
    this.prog = prog;
    const U = (n) => gl.getUniformLocation(prog, n);
    this.u = {
      WVP: U('uWVP'), WV: U('uWV'), viewport: U('uViewport'), transformed: U('uTransformed'),
      tex0: U('uTex0'), tex1: U('uTex1'),
      stage: U('uStage'),
      texFactor: U('uTexFactor'), shadeFlat: U('uShadeFlat'),
      fogEnable: U('uFogEnable'), fogMode: U('uFogMode'), fogDensity: U('uFogDensity'),
      fogStart: U('uFogStart'), fogEnd: U('uFogEnd'), fogColor: U('uFogColor'),
    };
    gl.uniform1i(this.u.tex0, 0);
    gl.uniform1i(this.u.tex1, 1);

    // --- geometry: one streaming VBO/IBO, re-specified per draw ---
    // See the long note above _setupVertices for why the upload uses
    // bufferData (orphaning) rather than bufferSubData.
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    this.vbo = gl.createBuffer();
    this.ibo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
    // Both bindings live in the VAO / global state and are never changed again,
    // so no draw has to re-bind them.
    for (let a = 0; a < 4; a++) gl.enableVertexAttribArray(a);
    this._boundFVF = -1;
    this._viewCache = new WeakMap();   // source array -> cached Uint8Array view

    // --- transforms (D3D row-major, see impedance note 1) ---
    this.transforms = {
      [D3DTS_WORLD]: new D3DMatrix(),
      [D3DTS_VIEW]: new D3DMatrix(),
      [D3DTS_PROJECTION]: new D3DMatrix(),
    };
    this._wv = new D3DMatrix();
    this._wvp = new D3DMatrix();
    this._matDirty = true;

    // --- render state cache ---
    this.rs = {
      [D3DRS_ZENABLE]: D3DZB_TRUE,
      [D3DRS_ZWRITEENABLE]: 1,
      [D3DRS_ZFUNC]: D3DCMP_LESSEQUAL,
      [D3DRS_ALPHABLENDENABLE]: 0,
      [D3DRS_SRCBLEND]: D3DBLEND_ONE,
      [D3DRS_DESTBLEND]: D3DBLEND_ZERO,
      [D3DRS_CULLMODE]: D3DCULL_CCW,
      [D3DRS_SHADEMODE]: D3DSHADE_GOURAUD,
      [D3DRS_LIGHTING]: 0,
      [D3DRS_FOGENABLE]: 0,
      [D3DRS_FOGCOLOR]: 0,
      [D3DRS_FOGTABLEMODE]: D3DFOG_NONE,
      [D3DRS_FOGDENSITY]: 1.0,
      [D3DRS_FOGSTART]: 0.0,
      [D3DRS_FOGEND]: 1.0,
      [D3DRS_TEXTUREFACTOR]: 0xffffffff,
    };

    // --- texture stage state cache (2 stages) ---
    const defStage = (i) => ({
      [D3DTSS_COLOROP]: i === 0 ? D3DTOP_MODULATE : D3DTOP_DISABLE,
      [D3DTSS_COLORARG1]: D3DTA_TEXTURE,
      [D3DTSS_COLORARG2]: i === 0 ? D3DTA_DIFFUSE : D3DTA_CURRENT,
      [D3DTSS_ALPHAOP]: i === 0 ? D3DTOP_MODULATE : D3DTOP_DISABLE,
      [D3DTSS_ALPHAARG1]: D3DTA_TEXTURE,
      [D3DTSS_ALPHAARG2]: i === 0 ? D3DTA_DIFFUSE : D3DTA_CURRENT,
      [D3DTSS_TEXCOORDINDEX]: i,
      [D3DTSS_ADDRESSU]: D3DTADDRESS_WRAP,
      [D3DTSS_ADDRESSV]: D3DTADDRESS_WRAP,
      [D3DTSS_MAGFILTER]: D3DTFG_LINEAR,
      [D3DTSS_MINFILTER]: D3DTFN_LINEAR,
      [D3DTSS_MIPFILTER]: D3DTFP_POINT,
    });
    this.tss = [defStage(0), defStage(1)];
    this.textures = [null, null];
    this._stageDirty = true;
    this._stageInts = new Int32Array(14);
    this._samplerCache = new Map();
    // Shadow of what is actually bound in GL, so a per-object draw loop emits
    // only the binds that changed (D3D-side redundant SetTexture calls are
    // extremely common — the intro re-sets the same texture constantly).
    this._stageSampler = [null, null];
    this._boundTexGL = [null, null];
    this._boundSamplerGL = [null, null];
    this._activeUnit = -1;
    this._transformedNow = false;

    // A 1x1 opaque white stand-in, so D3DTA_TEXTURE on a stage with no bound
    // texture behaves like "no texture" (MODULATE by white = pass-through)
    // instead of sampling whatever was bound last.
    this.whiteTexture = this._makeSolidTexture(0xffffffff);

    this.material = null;         // SetMaterial is a no-op: lighting is off
    this.inScene = false;
    this.frameCount = 0;

    // --- viewport (D3D convention: x,y from the TOP-left) ---
    this.viewport = { x: 0, y: 0, width: canvas.width, height: canvas.height, minZ: 0, maxZ: 1 };
    this.clearColor = 0xff000000;

    // caps, as reported by GetCaps
    this.caps = {
      dwMaxTextureWidth: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      dwMaxTextureHeight: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      wMaxTextureBlendStages: 2,
      wMaxSimultaneousTextures: 2,
    };

    this._applyViewport();
    this._applyAllRenderState();
    gl.clearColor(0, 0, 0, 1);
    gl.clearDepth(1);
    gl.disable(gl.SCISSOR_TEST);
    gl.disable(gl.STENCIL_TEST);
  }

  // =========================================================================
  // Device: frame boundary
  // =========================================================================

  /** IDirect3DDevice7::BeginScene [vtbl 0x14]. No-op beyond bookkeeping. */
  BeginScene() { this.inScene = true; return 0; }

  /** IDirect3DDevice7::EndScene [vtbl 0x18]. */
  EndScene() { this.inScene = false; return 0; }

  /**
   * IDirect3DDevice7::Clear [vtbl 0x28].
   * Accepts either the full COM signature
   *   Clear(dwCount, lpRects, dwFlags, dwColor, dvZ, dwStencil)
   * (so decompiled call sites transcribe verbatim) or the short form
   *   Clear(dwFlags, dwColor, dvZ).
   * Rectangle lists are not supported — the intro always passes (0, NULL).
   */
  Clear(a, b, c, d, e, f) {
    const gl = this.gl;
    let flags, color, z;
    if (arguments.length >= 5) { flags = c; color = d; z = e; }
    else { flags = a; color = b === undefined ? this.clearColor : b; z = c === undefined ? 1 : c; }
    let mask = 0;
    if (flags & D3DCLEAR_TARGET) {
      const A = ((color >>> 24) & 255) / 255, R = ((color >>> 16) & 255) / 255;
      const G = ((color >>> 8) & 255) / 255, B = (color & 255) / 255;
      gl.clearColor(R, G, B, A);
      mask |= gl.COLOR_BUFFER_BIT;
    }
    if (flags & D3DCLEAR_ZBUFFER) {
      gl.clearDepth(z);
      mask |= gl.DEPTH_BUFFER_BIT;
    }
    // D3D's Clear ignores ZWRITEENABLE; GL's honours the depth mask, so force
    // it on for the clear and put it back afterwards.
    const zwrite = !!this.rs[D3DRS_ZWRITEENABLE];
    if (!zwrite) gl.depthMask(true);
    gl.clear(mask);
    if (!zwrite) gl.depthMask(false);
    return 0;
  }

  /**
   * IDirectDrawSurface7::Flip. WebGL has no explicit present — the canvas is
   * composited when the rAF callback returns — so this just flushes and
   * counts frames. Kept so the frame loop can mirror FUN_004049a6 exactly.
   */
  Flip() { this.gl.flush(); this.frameCount++; return 0; }
  Present() { return this.Flip(); }

  /**
   * The exact per-frame pump from FUN_004049a6:
   *   EndScene -> Flip(WAIT) -> Clear(TARGET|ZBUFFER) -> BeginScene
   *   -> address WRAP -> cull NONE -> textures cleared
   * Effects render between these calls; call it once at the bottom of the
   * frame, driven by MUSIC POSITION (see FRAME_LOOP.md), not wall clock.
   */
  presentAndBeginNextFrame(clearColor) {
    this.EndScene();
    this.Flip();
    this.Clear(D3DCLEAR_TARGET | D3DCLEAR_ZBUFFER,
      clearColor === undefined ? this.clearColor : clearColor, 1.0);
    this.BeginScene();
    this.setAddressMode(1);   // FUN_0040484a(2,1) — WRAP
    this.setCullMode(0);      // FUN_0040484a(3,0) — NONE
    this.SetTextureHandle(null); // FUN_0040406d(0)
  }

  /** IDirect3DDevice7::GetCaps [vtbl 0x0c]. */
  GetCaps() { return this.caps; }

  /** IDirect3DDevice7::SetMaterial [vtbl 0x40]. No-op: LIGHTING is off. */
  SetMaterial(mat) { this.material = mat; return 0; }

  /**
   * D3DVIEWPORT7. x,y are measured from the TOP-left in D3D; GL's viewport
   * origin is bottom-left, hence the flip. minZ/maxZ go to gl.depthRange,
   * which maps NDC [-1,1] onto the same window-depth window D3D uses.
   */
  SetViewport(x, y, width, height, minZ = 0, maxZ = 1) {
    this.viewport = { x, y, width, height, minZ, maxZ };
    this._applyViewport();
    return 0;
  }
  GetViewport() { return { ...this.viewport }; }

  /**
   * [ptct ext] `renderScale` decouples the framebuffer resolution from the
   * logical 640x480 coordinate system the intro was written against. The GL
   * viewport is scaled up to cover a high-DPI canvas, while `uViewport` — which
   * is what the XYZRHW path maps screen pixels through — stays logical, so all
   * the hard-coded 2D overlay coordinates keep landing where they should and
   * the 3D simply gets more samples. renderScale = 1 is the original behaviour.
   */
  _applyViewport() {
    const gl = this.gl, v = this.viewport, s = this.renderScale || 1;
    const targetH = this.canvas.height;
    gl.viewport(Math.round(v.x * s), Math.round(targetH - (v.y + v.height) * s),
                Math.round(v.width * s), Math.round(v.height * s));
    gl.depthRange(v.minZ, v.maxZ);
    gl.uniform4f(this.u.viewport, v.x, v.y, v.width, v.height);   // logical, unscaled
  }

  /**
   * [ptct ext] Set the framebuffer:logical ratio.
   * `this.viewport` must stay in LOGICAL units — it is what the XYZRHW path
   * maps screen pixels through, and _applyViewport multiplies it by the scale
   * to get the GL viewport. Initialising it from the canvas (as the ctor does)
   * and then scaling would apply the factor twice: the GL viewport would be
   * scale x larger than the framebuffer, cropping the 3D to a zoomed centre
   * while the 2D coincidentally still landed correctly.
   */
  setRenderScale(s) {
    this.renderScale = s > 0 ? s : 1;
    this.viewport = { ...this.viewport,
      width: Math.round(this.canvas.width / this.renderScale),
      height: Math.round(this.canvas.height / this.renderScale) };
    this._applyViewport();
  }

  // =========================================================================
  // Transforms
  // =========================================================================

  /**
   * IDirect3DDevice7::SetTransform [vtbl 0x2c].
   * @param {number} type D3DTS_WORLD | D3DTS_VIEW | D3DTS_PROJECTION
   * @param {D3DMatrix|Float32Array|number[]} mat  row-major float[16]
   */
  SetTransform(type, mat) {
    const t = this.transforms[type];
    if (!t) throw new Error('minid3d7: unsupported transform state ' + type);
    // Compare before dirtying: effects re-set identity VIEW/WORLD constantly
    // (the 2D text path does it per glyph), and 16 float compares are far
    // cheaper than recomposing and re-uploading the matrix.
    const src = mat.m ? mat.m : mat, d = t.m;
    let same = true;
    for (let i = 0; i < 16; i++) if (d[i] !== src[i]) { same = false; break; }
    if (same) return 0;
    d.set(src);
    this._matDirty = true;
    return 0;
  }
  GetTransform(type) { return this.transforms[type].clone(); }

  _syncMatrices() {
    // XYZRHW draws ignore both matrices in the shader, so an overlay-heavy
    // pass (text, logo) uploads nothing at all.
    if (this._transformedNow || !this._matDirty) return;
    const gl = this.gl;
    // D3D order: v * WORLD * VIEW * PROJECTION.
    D3DMatrix.multiply(this.transforms[D3DTS_WORLD], this.transforms[D3DTS_VIEW], this._wv);
    D3DMatrix.multiply(this._wv, this.transforms[D3DTS_PROJECTION], this._wvp);
    // Impedance note 1: upload the row-major D3D array as-is. GL reads it
    // column-major, which is the transpose, which is exactly what turns
    // D3D's row-vector product into GL's column-vector product.
    gl.uniformMatrix4fv(this.u.WVP, false, this._wvp.m);
    // uWV only feeds the fog distance; with fog off it is dead weight, and the
    // finale changes WORLD once per object, so this halves the matrix traffic.
    // SetRenderState(FOGENABLE, 1) re-dirties the matrices so it is never stale.
    if (this.rs[D3DRS_FOGENABLE]) gl.uniformMatrix4fv(this.u.WV, false, this._wv.m);
    this._matDirty = false;
  }

  // =========================================================================
  // Render state
  // =========================================================================

  /** IDirect3DDevice7::SetRenderState [vtbl 0x50]. */
  SetRenderState(state, value) {
    if (this.rs[state] === value) {
      // FOGCOLOR/DENSITY are floats-in-DWORDs; cheap equality is still fine.
      return 0;
    }
    this.rs[state] = value;
    const gl = this.gl;
    switch (state) {
      case D3DRS_ZENABLE:
        // D3DZB_FALSE(0) / D3DZB_TRUE(1) / D3DZB_USEW(2 — treated as TRUE).
        if (value) gl.enable(gl.DEPTH_TEST); else gl.disable(gl.DEPTH_TEST);
        break;
      case D3DRS_ZWRITEENABLE:
        gl.depthMask(!!value);
        break;
      case D3DRS_ZFUNC:
        gl.depthFunc(this._cmpFunc(value));
        break;
      case D3DRS_ALPHABLENDENABLE:
        if (value) gl.enable(gl.BLEND); else gl.disable(gl.BLEND);
        break;
      case D3DRS_SRCBLEND:
      case D3DRS_DESTBLEND:
        this._applyBlendFunc();
        break;
      case D3DRS_CULLMODE:
        this._applyCullMode();
        break;
      case D3DRS_SHADEMODE:
        gl.uniform1i(this.u.shadeFlat, value === D3DSHADE_FLAT ? 1 : 0);
        break;
      case D3DRS_FOGENABLE:
        gl.uniform1i(this.u.fogEnable, value ? 1 : 0);
        // uWV is only uploaded while fog is on (see _syncMatrices) — force a
        // re-upload so switching fog on cannot pick up a stale matrix.
        if (value) this._matDirty = true;
        break;
      case D3DRS_FOGCOLOR:
        gl.uniform3f(this.u.fogColor,
          ((value >>> 16) & 255) / 255, ((value >>> 8) & 255) / 255, (value & 255) / 255);
        break;
      case D3DRS_FOGTABLEMODE:
        gl.uniform1i(this.u.fogMode, value | 0);
        break;
      case D3DRS_FOGDENSITY:
        gl.uniform1f(this.u.fogDensity, this._asFloat(value));
        break;
      case D3DRS_FOGSTART:
        gl.uniform1f(this.u.fogStart, this._asFloat(value));
        break;
      case D3DRS_FOGEND:
        gl.uniform1f(this.u.fogEnd, this._asFloat(value));
        break;
      case D3DRS_TEXTUREFACTOR:
        gl.uniform4f(this.u.texFactor,
          ((value >>> 16) & 255) / 255, ((value >>> 8) & 255) / 255,
          (value & 255) / 255, ((value >>> 24) & 255) / 255);
        break;
      // Silently accepted, no WebGL equivalent / no effect:
      //   LIGHTING  — always off in this intro; the shim has no lighting at all
      //   AMBIENT   — only meaningful with lighting on
      //   DITHERENABLE — the original dithers because the back buffer is 16-bit;
      //                  we render RGBA8, so there is nothing to dither
      //   TEXTUREPERSPECTIVE — always on in GL
      //   SPECULARENABLE / COLORVERTEX / FILLMODE
      default:
        break;
    }
    return 0;
  }
  GetRenderState(state) { return this.rs[state]; }

  // D3D passes floats to SetRenderState as raw DWORD bit patterns
  // (*(DWORD*)&f). JS callers naturally pass a real number, so accept both:
  // a value outside [0,64] that is an integer is assumed to be a bit pattern.
  _asFloat(value) {
    if (typeof value === 'number' && !Number.isInteger(value)) return value;
    const v = value >>> 0;
    if (v === 0) return 0;
    if (v <= 64) return v;             // plausible as a literal small number
    _f32[0] = 0; _u32[0] = v;
    return _f32[0];
  }

  _cmpFunc(v) {
    const gl = this.gl;
    switch (v) {
      case D3DCMP_NEVER: return gl.NEVER;
      case D3DCMP_LESS: return gl.LESS;
      case D3DCMP_EQUAL: return gl.EQUAL;
      case D3DCMP_LESSEQUAL: return gl.LEQUAL;
      case D3DCMP_GREATER: return gl.GREATER;
      case D3DCMP_NOTEQUAL: return gl.NOTEQUAL;
      case D3DCMP_GREATEREQUAL: return gl.GEQUAL;
      default: return gl.ALWAYS;
    }
  }

  _blendFactor(v, isDest) {
    const gl = this.gl;
    switch (v) {
      case D3DBLEND_ZERO: return gl.ZERO;
      case D3DBLEND_ONE: return gl.ONE;
      case D3DBLEND_SRCCOLOR: return gl.SRC_COLOR;
      case D3DBLEND_INVSRCCOLOR: return gl.ONE_MINUS_SRC_COLOR;
      case D3DBLEND_SRCALPHA: return gl.SRC_ALPHA;
      case D3DBLEND_INVSRCALPHA: return gl.ONE_MINUS_SRC_ALPHA;
      case D3DBLEND_DESTALPHA: return gl.DST_ALPHA;
      case D3DBLEND_INVDESTALPHA: return gl.ONE_MINUS_DST_ALPHA;
      case D3DBLEND_DESTCOLOR: return gl.DST_COLOR;
      case D3DBLEND_INVDESTCOLOR: return gl.ONE_MINUS_DST_COLOR;
      case D3DBLEND_SRCALPHASAT: return gl.SRC_ALPHA_SATURATE;
      // D3DBLEND_BOTHSRCALPHA/BOTHINVSRCALPHA are a D3D shorthand that sets
      // BOTH factors from one enum; expanded in _applyBlendFunc.
      case D3DBLEND_BOTHSRCALPHA: return isDest ? gl.ONE_MINUS_SRC_ALPHA : gl.SRC_ALPHA;
      case D3DBLEND_BOTHINVSRCALPHA: return isDest ? gl.SRC_ALPHA : gl.ONE_MINUS_SRC_ALPHA;
      default: return isDest ? gl.ZERO : gl.ONE;
    }
  }

  _applyBlendFunc() {
    const src = this.rs[D3DRS_SRCBLEND], dst = this.rs[D3DRS_DESTBLEND];
    if (src === D3DBLEND_BOTHSRCALPHA || src === D3DBLEND_BOTHINVSRCALPHA) {
      this.gl.blendFunc(this._blendFactor(src, false), this._blendFactor(src, true));
    } else {
      this.gl.blendFunc(this._blendFactor(src, false), this._blendFactor(dst, true));
    }
  }

  /**
   * Impedance note 3. frontFace(CW) restates GL's face convention in D3D's
   * left-handed terms (front = clockwise on screen); after that the two cull
   * enums line up one-to-one:
   *   D3DCULL_CCW -> cull BACK  (back == the counter-clockwise faces)
   *   D3DCULL_CW  -> cull FRONT (front == the clockwise faces)
   * The XYZRHW path obeys the same rule, because its y flip also happens in
   * clip space and so preserves on-screen winding.
   */
  _applyCullMode() {
    const gl = this.gl, v = this.rs[D3DRS_CULLMODE];
    if (v === D3DCULL_NONE) { gl.disable(gl.CULL_FACE); return; }
    gl.enable(gl.CULL_FACE);
    gl.frontFace(gl.CW);
    gl.cullFace(v === D3DCULL_CCW ? gl.BACK : gl.FRONT);
  }

  _applyAllRenderState() {
    const gl = this.gl;
    for (const k of Object.keys(this.rs)) {
      const state = k | 0, v = this.rs[k];
      this.rs[k] = undefined;      // defeat the equality short-circuit
      this.SetRenderState(state, v);
    }
    gl.uniform1i(this.u.shadeFlat, 0);
    this._applyBlendFunc();
    this._applyCullMode();
  }

  /**
   * The baseline pipeline state from FUN_004041df (D3D7_API.md §3a/§3c).
   * Call once after construction to start where the intro starts.
   */
  applyDefaultState() {
    this.SetRenderState(D3DRS_LIGHTING, 0);
    this.SetRenderState(D3DRS_AMBIENT, 0xffffffff);
    this.SetRenderState(D3DRS_ZENABLE, D3DZB_TRUE);
    this.SetRenderState(D3DRS_ZWRITEENABLE, 1);
    this.SetRenderState(D3DRS_ZFUNC, D3DCMP_LESSEQUAL);
    this.SetRenderState(D3DRS_DITHERENABLE, 1);
    this.SetRenderState(D3DRS_TEXTUREPERSPECTIVE, 1);
    this.SetRenderState(D3DRS_SRCBLEND, D3DBLEND_SRCALPHA);
    this.SetRenderState(D3DRS_DESTBLEND, D3DBLEND_INVSRCALPHA);
    this.SetRenderState(D3DRS_ALPHABLENDENABLE, 1);

    for (let s = 0; s < 2; s++) {
      this.SetTextureStageState(s, D3DTSS_COLORARG1, D3DTA_TEXTURE);
      this.SetTextureStageState(s, D3DTSS_COLORARG2, s === 0 ? D3DTA_DIFFUSE : D3DTA_CURRENT);
      this.SetTextureStageState(s, D3DTSS_ALPHAARG1, D3DTA_TEXTURE);
      this.SetTextureStageState(s, D3DTSS_ALPHAARG2, s === 0 ? D3DTA_DIFFUSE : D3DTA_CURRENT);
      this.SetTextureStageState(s, D3DTSS_COLOROP, s === 0 ? D3DTOP_MODULATE : D3DTOP_DISABLE);
      this.SetTextureStageState(s, D3DTSS_ALPHAOP, s === 0 ? D3DTOP_MODULATE : D3DTOP_DISABLE);
      this.SetTextureStageState(s, D3DTSS_TEXCOORDINDEX, s);
      this.SetTextureStageState(s, D3DTSS_MAGFILTER, D3DTFG_LINEAR);
      this.SetTextureStageState(s, D3DTSS_MINFILTER, D3DTFN_LINEAR);
      this.SetTextureStageState(s, D3DTSS_MIPFILTER, D3DTFP_POINT);
      this.SetTextureStageState(s, D3DTSS_ADDRESS, D3DTADDRESS_WRAP);
    }
  }

  // =========================================================================
  // The runtime state dispatcher — FUN_0040484a(mode, arg), D3D7_API.md §3d.
  // Exposed both as the original switch and as named helpers.
  // =========================================================================

  dispatchState(mode, arg) {
    switch (mode) {
      case 1: this.setStage1Op(arg); break;
      case 2: this.setAddressMode(arg); break;
      case 3: this.setCullMode(arg); break;
      case 4: this.setFog(arg); break;
      case 5: this.setAlphaBlend(arg); break;
      default: break;
    }
  }

  /** mode 1: stage-1 COLOROP. 0 -> DISABLE, 1 -> ADD, 2 -> MODULATE. */
  setStage1Op(arg) {
    const op = arg === 1 ? D3DTOP_ADD : (arg === 2 ? D3DTOP_MODULATE : D3DTOP_DISABLE);
    this.SetTextureStageState(1, D3DTSS_COLOROP, op);
  }
  /** mode 2: texture address on both stages. 0 -> CLAMP, else WRAP. */
  setAddressMode(arg) {
    const a = arg === 0 ? D3DTADDRESS_CLAMP : D3DTADDRESS_WRAP;
    this.SetTextureStageState(0, D3DTSS_ADDRESS, a);
    this.SetTextureStageState(1, D3DTSS_ADDRESS, a);
  }
  /** mode 3: CULLMODE. 0 -> NONE, 1 -> CCW, 2 -> CW. */
  setCullMode(arg) {
    const c = arg === 1 ? D3DCULL_CCW : (arg === 2 ? D3DCULL_CW : D3DCULL_NONE);
    this.SetRenderState(D3DRS_CULLMODE, c);
  }
  /** mode 4: fog. 0 -> off, else on with the current scene fog params. */
  setFog(arg) {
    if (!arg) { this.SetRenderState(D3DRS_FOGENABLE, 0); return; }
    this.SetRenderState(D3DRS_FOGENABLE, 1);
    this.SetRenderState(D3DRS_FOGTABLEMODE, D3DFOG_EXP);
  }
  /** FUN_004047f9: enable EXP fog with a colour and density. */
  enableFog(color, density) {
    this.SetRenderState(D3DRS_FOGENABLE, 1);
    this.SetRenderState(D3DRS_FOGCOLOR, color);
    this.SetRenderState(D3DRS_FOGTABLEMODE, D3DFOG_EXP);
    this.SetRenderState(D3DRS_FOGDENSITY, density);
  }
  /** mode 5: ALPHABLENDENABLE. */
  setAlphaBlend(arg) { this.SetRenderState(D3DRS_ALPHABLENDENABLE, arg ? 1 : 0); }

  // =========================================================================
  // Texture stage state
  // =========================================================================

  /** IDirect3DDevice7::SetTextureStageState [vtbl 0x94]. */
  SetTextureStageState(stage, type, value) {
    if (stage < 0 || stage > 1) return 0;   // the intro only ever uses 2 stages
    const st = this.tss[stage];
    if (type === D3DTSS_ADDRESS) {
      if (st[D3DTSS_ADDRESSU] === value && st[D3DTSS_ADDRESSV] === value) return 0;
      st[D3DTSS_ADDRESSU] = value;
      st[D3DTSS_ADDRESSV] = value;
      this._stageSampler[stage] = null;
      return 0;
    }
    if (st[type] === value) return 0;       // redundant set: nothing to do
    st[type] = value;
    // Filtering/addressing live in the sampler object; everything else is a
    // combiner input and only needs the packed int upload.
    if (type === D3DTSS_ADDRESSU || type === D3DTSS_ADDRESSV ||
        type === D3DTSS_MAGFILTER || type === D3DTSS_MINFILTER ||
        type === D3DTSS_MIPFILTER) {
      this._stageSampler[stage] = null;
    } else {
      this._stageDirty = true;
    }
    return 0;
  }
  GetTextureStageState(stage, type) { return this.tss[stage][type]; }

  _syncStages() {
    if (!this._stageDirty) return;
    const s = this._stageInts;
    for (let i = 0; i < 2; i++) {
      const st = this.tss[i], b = i * 7;
      s[b] = st[D3DTSS_COLOROP] | 0;
      s[b + 1] = st[D3DTSS_COLORARG1] | 0;
      s[b + 2] = st[D3DTSS_COLORARG2] | 0;
      s[b + 3] = st[D3DTSS_ALPHAOP] | 0;
      s[b + 4] = st[D3DTSS_ALPHAARG1] | 0;
      s[b + 5] = st[D3DTSS_ALPHAARG2] | 0;
      s[b + 6] = st[D3DTSS_TEXCOORDINDEX] | 0;
    }
    this.gl.uniform1iv(this.u.stage, s);
    this._stageDirty = false;
  }

  // Impedance note 5: D3D7 filter/address state is per-stage, GL's is baked
  // into the texture object. WebGL2 sampler objects give us the D3D behaviour
  // back; cache one per distinct combination.
  _samplerFor(stage, hasMips) {
    // Fast path: the stage's sampler is memoised until its filter/address
    // state changes, so a draw loop never builds the cache key at all.
    const memo = this._stageSampler[stage];
    if (memo !== null && memo.hasMips === hasMips) return memo.sampler;
    const st = this.tss[stage];
    const key = `${st[D3DTSS_ADDRESSU]}|${st[D3DTSS_ADDRESSV]}|${st[D3DTSS_MAGFILTER]}|` +
                `${st[D3DTSS_MINFILTER]}|${st[D3DTSS_MIPFILTER]}|${hasMips ? 1 : 0}`;
    let s = this._samplerCache.get(key);
    if (s) { this._stageSampler[stage] = { sampler: s, hasMips }; return s; }
    const gl = this.gl;
    s = gl.createSampler();
    const addr = (v) => {
      switch (v) {
        case D3DTADDRESS_MIRROR: return gl.MIRRORED_REPEAT;
        case D3DTADDRESS_CLAMP: return gl.CLAMP_TO_EDGE;
        // D3DTADDRESS_BORDER has no WebGL2 equivalent (no border colour);
        // CLAMP_TO_EDGE is the closest and the intro never selects BORDER.
        case D3DTADDRESS_BORDER: return gl.CLAMP_TO_EDGE;
        default: return gl.REPEAT;
      }
    };
    gl.samplerParameteri(s, gl.TEXTURE_WRAP_S, addr(st[D3DTSS_ADDRESSU]));
    gl.samplerParameteri(s, gl.TEXTURE_WRAP_T, addr(st[D3DTSS_ADDRESSV]));
    gl.samplerParameteri(s, gl.TEXTURE_MAG_FILTER,
      st[D3DTSS_MAGFILTER] === D3DTFG_POINT ? gl.NEAREST : gl.LINEAR);
    const linMin = st[D3DTSS_MINFILTER] !== D3DTFN_POINT;
    let min;
    // MIPFILTER only bites if the texture actually has a mip chain. The
    // original uploads exactly one level (a single Lock/Unlock), so in
    // practice this is always the no-mip branch.
    if (!hasMips || st[D3DTSS_MIPFILTER] === D3DTFP_NONE) {
      min = linMin ? gl.LINEAR : gl.NEAREST;
    } else if (st[D3DTSS_MIPFILTER] === D3DTFP_POINT) {
      min = linMin ? gl.LINEAR_MIPMAP_NEAREST : gl.NEAREST_MIPMAP_NEAREST;
    } else {
      min = linMin ? gl.LINEAR_MIPMAP_LINEAR : gl.NEAREST_MIPMAP_LINEAR;
    }
    gl.samplerParameteri(s, gl.TEXTURE_MIN_FILTER, min);
    this._samplerCache.set(key, s);
    this._stageSampler[stage] = { sampler: s, hasMips };
    return s;
  }

  // =========================================================================
  // Textures
  // =========================================================================

  /**
   * FUN_00403bd6 — the intro's only texture path. It builds an ARGB8888 buffer
   * on the CPU, creates a DDraw texture surface, Locks it, converts to the
   * surface's pixel format and Unlocks. Here: one texImage2D into RGBA8.
   *
   * @param {Uint8Array|Uint8ClampedArray|Uint32Array|null} pixels
   *        Uint8*: RGBA bytes in memory order.
   *        Uint32Array: packed D3DCOLOR 0xAARRGGBB, exactly what the intro's
   *        generators produce — converted here (the one place we cannot just
   *        reinterpret bytes, because GL has no ARGB8 upload format).
   * @param {number} w
   * @param {number} h
   * @param {number} [flags] D3DTEX_* — 16BIT/ALPHA are accepted and ignored
   *        (we always keep RGBA8); D3DTEX_MIPMAP builds a mip chain.
   * @returns {{tex:WebGLTexture,width:number,height:number,hasMips:boolean}}
   */
  createTexture(pixels, w, h, flags = 0) {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);   // D3D v grows downward,
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);          // and so does GL's row 0
    let data = null;
    if (pixels instanceof Uint32Array) data = argbToRGBA(pixels, w * h);
    else if (pixels) data = pixels instanceof Uint8Array ? pixels : new Uint8Array(pixels.buffer || pixels);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    const hasMips = !!(flags & D3DTEX_MIPMAP);
    if (hasMips) gl.generateMipmap(gl.TEXTURE_2D);
    // No texParameteri here on purpose: filtering/addressing live in the
    // per-stage sampler objects (impedance note 5).
    gl.bindTexture(gl.TEXTURE_2D, null);
    this._invalidateTexBinding();
    return { tex, width: w, height: h, hasMips };
  }

  /** Upload from an <img>/<canvas>/ImageBitmap (loading textures from PNGs). */
  createTextureFromImage(image, flags = 0) {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, image);
    const hasMips = !!(flags & D3DTEX_MIPMAP);
    if (hasMips) gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);
    this._invalidateTexBinding();
    return { tex, width: image.width, height: image.height, hasMips };
  }

  /** Re-upload a whole texture (the intro re-Locks animated textures). */
  updateTexture(handle, pixels) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, handle.tex);
    const data = pixels instanceof Uint32Array
      ? argbToRGBA(pixels, handle.width * handle.height)
      : pixels;
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, handle.width, handle.height,
      gl.RGBA, gl.UNSIGNED_BYTE, data);
    if (handle.hasMips) gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);
    this._invalidateTexBinding();
    return 0;
  }

  destroyTexture(handle) {
    if (handle && handle.tex) this.gl.deleteTexture(handle.tex);
  }

  _makeSolidTexture(argb) {
    return this.createTexture(new Uint32Array([argb >>> 0]), 1, 1, 0);
  }

  /** IDirect3DDevice7::SetTexture [vtbl 0x8c]. `tex` may be null. */
  SetTexture(stage, tex) {
    if (stage < 0 || stage > 1) return 0;
    this.textures[stage] = tex || null;
    return 0;
  }

  /**
   * FUN_0040406d — the intro's texture setter: one "texture handle" drives
   * both stages (stage 0 = handle's surface, stage 1 = the second texture or
   * NULL). Pass null to clear both, as the frame pump does.
   */
  SetTextureHandle(tex0, tex1 = null) {
    this.SetTexture(0, tex0);
    this.SetTexture(1, tex0 ? tex1 : null);
    return 0;
  }

  _bindTextures() {
    const gl = this.gl;
    for (let s = 0; s < 2; s++) {
      const h = this.textures[s];
      const t = h ? h.tex : this.whiteTexture.tex;
      if (this._boundTexGL[s] !== t) {
        if (this._activeUnit !== s) { gl.activeTexture(gl.TEXTURE0 + s); this._activeUnit = s; }
        gl.bindTexture(gl.TEXTURE_2D, t);
        this._boundTexGL[s] = t;
      }
      const samp = this._samplerFor(s, h ? h.hasMips : false);
      if (this._boundSamplerGL[s] !== samp) {
        gl.bindSampler(s, samp);
        this._boundSamplerGL[s] = samp;
      }
    }
  }

  // Texture creation/upload binds on unit 0 behind the draw loop's back.
  _invalidateTexBinding() {
    this._activeUnit = 0;
    this._boundTexGL[0] = null;
  }

  // =========================================================================
  // Draw calls
  // =========================================================================

  /**
   * IDirect3DDevice7::DrawPrimitive [vtbl 0x64].
   *   DrawPrimitive(primType, fvf, pVtx, vertexCount, flags)
   * `pVtx` is a raw vertex block in FVF layout (TypedArray or ArrayBuffer) —
   * uploaded byte-for-byte, exactly like D3D's user-pointer draw.
   * `vertexCount` is a VERTEX count (not a primitive count), as in D3D7.
   */
  DrawPrimitive(primType, fvf, pVtx, vertexCount, flags = 0) {
    if (vertexCount <= 0) return 0;
    const gl = this.gl;
    this._setupVertices(fvf, pVtx, vertexCount);
    this._applyDrawState(fvf);
    // `first` stays 0: the arena offset is already folded into the attribute
    // pointers, so vertex 0 is this draw's first vertex.
    gl.drawArrays(this._glPrim(primType), 0, vertexCount);
    return 0;
  }

  /**
   * IDirect3DDevice7::DrawIndexedPrimitive [vtbl 0x68].
   *   DrawIndexedPrimitive(primType, fvf, pVtx, nVtx, pIdx, nIdx, flags)
   * `pIdx` is a Uint16Array (D3D7 indices are 16-bit WORDs); `nIdx` is the
   * INDEX count (the intro passes triangleCount*3).
   */
  DrawIndexedPrimitive(primType, fvf, pVtx, nVtx, pIdx, nIdx, flags = 0) {
    if (nIdx <= 0 || nVtx <= 0) return 0;
    const gl = this.gl;
    this._setupVertices(fvf, pVtx, nVtx);
    this._setupIndices(pIdx, nIdx);
    this._applyDrawState(fvf);
    gl.drawElements(this._glPrim(primType), nIdx, gl.UNSIGNED_SHORT, 0);
    return 0;
  }

  _glPrim(t) {
    const gl = this.gl;
    switch (t) {
      case D3DPT_POINTLIST: return gl.POINTS;
      case D3DPT_LINELIST: return gl.LINES;
      case D3DPT_LINESTRIP: return gl.LINE_STRIP;
      case D3DPT_TRIANGLELIST: return gl.TRIANGLES;
      case D3DPT_TRIANGLESTRIP: return gl.TRIANGLE_STRIP;
      case D3DPT_TRIANGLEFAN: return gl.TRIANGLE_FAN;
      default: throw new Error('minid3d7: bad primitive type ' + t);
    }
  }

  // -------------------------------------------------------------------------
  // Geometry upload strategy — the single most important performance decision
  // in the shim, and an unintuitive one.
  //
  // D3D7 immediate mode hands the driver a fresh user pointer per draw. The
  // obvious WebGL translation is to keep one buffer and `bufferSubData` into it
  // before each draw. That turns out to be the *worst* option on ANGLE: a
  // partial update of a buffer the GPU may still be reading forces the backend
  // onto a synchronising/copying path, and the cost is enormous and per-call.
  //
  // Measured directly (test/bufstrat.html, 2000 draws, ANGLE/Metal, gl.finish()
  // on both sides of the clock, best of 3):
  //
  //     bufferSubData @0, exact-size buffer ....... 160.6 us/call
  //     bufferSubData at a rising offset in 1 MB .. 122.8 us/call
  //     bufferData(capacity) once/frame + subData . 249.3 us/call
  //     bufferData(data) every draw  <-- we do this   7.8 us/call
  //     no upload at all (floor) .................... 1.6 us/call
  //
  // So we call bufferData with the draw's data every time. This is the classic
  // "orphaning" idiom: handing the driver a whole new data store lets it hand
  // back fresh storage and keep the old one alive until the GPU is done with
  // it, instead of blocking. A streaming arena with rising offsets — the fix
  // that intuition (and the usual desktop-GL advice) suggests — is 15x SLOWER
  // here, because the cost is in bufferSubData itself, not in aliasing.
  //
  // If this is ever ported to a backend where bufferSubData is cheap, re-run
  // test/bufstrat.html before changing strategy.
  // -------------------------------------------------------------------------

  // Take a byte view of the caller's vertex block, limited to the vertices
  // actually being drawn (scratch arrays are usually over-allocated). The view
  // is cached per source buffer so a per-object draw loop allocates nothing.
  _byteView(src, need) {
    const isBuf = src instanceof ArrayBuffer;
    const buf = isBuf ? src : src.buffer;
    const off = isBuf ? 0 : src.byteOffset;
    const len = need < src.byteLength ? need : src.byteLength;
    let v = this._viewCache.get(src);
    if (v === undefined || v.byteLength !== len || v.buffer !== buf) {
      v = new Uint8Array(buf, off, len);
      this._viewCache.set(src, v);
    }
    return v;
  }

  _setupVertices(fvf, pVtx, count) {
    const gl = this.gl;
    const stride = fvfStride(fvf);
    if (!(pVtx instanceof ArrayBuffer) && !ArrayBuffer.isView(pVtx)) {
      throw new Error('minid3d7: vertex data must be a TypedArray or ArrayBuffer');
    }
    const bytes = this._byteView(pVtx, stride * count);
    gl.bufferData(gl.ARRAY_BUFFER, bytes, gl.STREAM_DRAW);

    this._transformedNow = rhwOf(fvf);
    if (this._boundFVF !== fvf) {
      const rhw = this._transformedNow;
      const cOff = rhw ? 16 : 12;
      // Attribute layout only depends on the FVF, and the data always starts at
      // offset 0, so this is re-issued only when the vertex format changes.
      gl.vertexAttribPointer(0, rhw ? 4 : 3, gl.FLOAT, false, stride, 0);
      // D3DCOLOR: 4 normalised unsigned bytes, in memory order B,G,R,A —
      // unswizzled in the vertex shader (impedance note 4).
      gl.vertexAttribPointer(1, 4, gl.UNSIGNED_BYTE, true, stride, cOff);
      gl.vertexAttribPointer(2, 2, gl.FLOAT, false, stride, cOff + 4);
      gl.vertexAttribPointer(3, 2, gl.FLOAT, false, stride, cOff + 12);
      this._boundFVF = fvf;
      // XYZRHW bypasses the transform pipeline entirely.
      gl.uniform1i(this.u.transformed, rhw ? 1 : 0);
    }
  }

  _setupIndices(pIdx, nIdx) {
    const gl = this.gl;
    let idx;
    if (pIdx instanceof Uint16Array) {
      idx = pIdx.length > nIdx ? pIdx.subarray(0, nIdx) : pIdx;
    } else if (ArrayBuffer.isView(pIdx) || pIdx instanceof ArrayBuffer) {
      const buf = pIdx instanceof ArrayBuffer ? pIdx : pIdx.buffer;
      const off = pIdx instanceof ArrayBuffer ? 0 : pIdx.byteOffset;
      idx = new Uint16Array(buf, off, nIdx);
    } else {
      idx = new Uint16Array(pIdx);       // plain Array fallback
    }
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STREAM_DRAW);
  }

  _applyDrawState(fvf) {
    this._syncMatrices();
    this._syncStages();
    this._bindTextures();
  }

  // =========================================================================
  // Misc
  // =========================================================================

  getError() { return this.gl.getError(); }
  /** Throws if the GL error flag is set — call from tests, not hot loops. */
  checkError(label) {
    const e = this.gl.getError();
    if (e !== 0) throw new Error(`minid3d7: GL error 0x${e.toString(16)} at ${label}`);
  }

  /** Read back an RGBA pixel (GL window coords have y=0 at the BOTTOM). */
  readPixelGL(x, y) {
    const px = new Uint8Array(4);
    this.gl.readPixels(x, y, 1, 1, this.gl.RGBA, this.gl.UNSIGNED_BYTE, px);
    return px;
  }
  /** Read back an RGBA pixel in D3D screen coords (y=0 at the TOP). */
  readPixel(x, y) { return this.readPixelGL(x, this.canvas.height - 1 - y); }
}

// Scratch used by SetRenderState's float-bit-pattern decode and _syncStages.
const _u32 = new Uint32Array(1);
const _f32 = new Float32Array(_u32.buffer);

/** ARGB8888 dwords (0xAARRGGBB) -> RGBA bytes, the one unavoidable repack. */
export function argbToRGBA(src, texelCount) {
  const n = texelCount === undefined ? src.length : texelCount;
  const out = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) {
    const c = src[i] >>> 0;
    out[i * 4 + 0] = (c >>> 16) & 255;
    out[i * 4 + 1] = (c >>> 8) & 255;
    out[i * 4 + 2] = c & 255;
    out[i * 4 + 3] = (c >>> 24) & 255;
  }
  return out;
}

export default MiniD3D7;
