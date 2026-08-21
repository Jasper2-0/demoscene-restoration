// minid3d8.js — a Direct3D 8 fixed-function shim over WebGL2.
//
// Written for the browser restoration of "Sonnet" by threestate
// (Assembly 2001, 64k intro, 1st place, D3D8 SOFTWARE_VERTEXPROCESSING,
// 640x480 fullscreen). The call surface mirrors IDirect3DDevice8 as
// documented in re/engine/D3D8_API.md, so ported effect code can read like
// the original decompile:
//     dev.SetRenderState(D3DRS_CULLMODE, D3DCULL_CCW);
//     dev.DrawIndexedPrimitiveUP(D3DPT_TRIANGLELIST, 0, nv, ntri,
//                                idx, D3DFMT_INDEX16, verts, 44);
//
// Descended from productions/lost-vegas/web/js/minid3d7.js (the Lost Vegas / D3D7 shim). Roughly
// 80% is the same substrate; every deliberate difference is called out below
// and documented in MINID3D8_API.md.
//
// ---------------------------------------------------------------------------
// THE IMPEDANCE POINTS (each is re-explained at its site)
// ---------------------------------------------------------------------------
// 1. MATRICES. D3D is row-vector (v' = v * M) and stores matrices row-major
//    (float[16] = _11.._44, index = row*4+col). GL is column-vector and
//    uniformMatrix4fv(...,transpose=false) reads column-major. Reading a D3D
//    row-major array as a GL column-major array *is* the transpose, and
//    (v*M)^T == M^T * v^T — so a D3D matrix is handed to WebGL verbatim, no
//    repacking, as long as we keep D3D's order (WORLD * VIEW * PROJECTION).
// 2. DEPTH RANGE. D3D clip space is z in [0,w]; GL's is [-w,w]. The original's
//    projection matrix (FUN_00405c0c) is kept bit-exact and fixed up in the
//    vertex shader with `pos.z = 2.0*pos.z - pos.w`.
// 3. WINDING / CULLING. gl.frontFace(gl.CW) once makes GL's "front" coincide
//    with D3D's, after which D3DCULL_CCW -> cullFace(BACK) and
//    D3DCULL_CW -> cullFace(FRONT).
// 4. D3DCOLOR IS BGRA. A D3DCOLOR is a packed uint32 0xAARRGGBB; on x86 that
//    lands in memory as bytes B,G,R,A, so vertex blocks upload raw and the
//    vertex shader unswizzles with `.zyxw`.
// 5. STAGE STATE vs TEXTURE STATE. D3D filtering/addressing is per texture
//    *stage*; GL's is per texture *object*. WebGL2 sampler objects (cached,
//    one per distinct filter/address combination) restore D3D's semantics.
// 6. [D3D8-only] NO XYZRHW. Sonnet's 2D is drawn in NDC with identity
//    WORLD/VIEW/PROJECTION (FUN_00401bd0), so the whole rhw reconstruction
//    path of minid3d7 is gone. NDC +y is UP — the opposite of D3D screen y.
// 7. [D3D8-only] RENDER TARGETS ARE V-FLIPPED. D3D's RT texel (0,0) is the
//    top-left = NDC (-1,+1); GL's is the bottom-left. Content textures are
//    uploaded row 0 -> t 0 so D3D v == GL t, but a render target written
//    through the rasteriser comes out upside down relative to that. The shim
//    tags RT handles with `flipV` and flips t at sample time. See
//    MINID3D8_API.md "Divergences".
// ---------------------------------------------------------------------------

'use strict';

// ===========================================================================
// D3D8 enumerations. Exported individually so ported code reads like the
// original source. Values are the real DirectX 8 SDK values (d3d8types.h).
// ===========================================================================

// --- D3DTRANSFORMSTATETYPE (SetTransform) ---------------------------------
// !!! D3D8 CHANGED D3DTS_WORLD FROM 1 TO 256. D3DTS_WORLD == D3DTS_WORLDMATRIX(0)
// == 0x100. Transcribing a D3D7 `SetTransform(1, ...)` here is a bug, and
// SetTransform throws on any state it does not know so that it is a loud one.
export const D3DTS_VIEW = 2;
export const D3DTS_PROJECTION = 3;
export const D3DTS_TEXTURE0 = 0x10;
export const D3DTS_TEXTURE1 = 0x11;
export const D3DTS_WORLD = 0x100;

// --- D3DPRIMITIVETYPE ------------------------------------------------------
export const D3DPT_POINTLIST = 1;
export const D3DPT_LINELIST = 2;
export const D3DPT_LINESTRIP = 3;
export const D3DPT_TRIANGLELIST = 4;   // every DrawIndexedPrimitiveUP site
export const D3DPT_TRIANGLESTRIP = 5;
export const D3DPT_TRIANGLEFAN = 6;    // every DrawPrimitiveUP site

// --- FVF bits. Sonnet uses exactly ONE format. -----------------------------
export const D3DFVF_XYZ = 0x002;
export const D3DFVF_NORMAL = 0x010;
export const D3DFVF_DIFFUSE = 0x040;
export const D3DFVF_TEX1 = 0x100;
export const D3DFVF_TEX2 = 0x200;
/**
 * XYZ | NORMAL | DIFFUSE | TEX2 — 44-byte stride. SetVertexShader(0x252) at
 * 0x401803 is the only vertex-format call in the binary.
 *   +0   3xf32  x,y,z      model space (or NDC, for the identity-transform 2D)
 *   +12  3xf32  nx,ny,nz   normal (lighting AND the camera-space sphere map)
 *   +24  u32    diffuse    D3DCOLOR 0xAARRGGBB
 *   +28  2xf32  u0,v0      texcoord set 0
 *   +36  2xf32  u1,v1      texcoord set 1
 */
export const FVF_XYZ_NORMAL_DIFFUSE_TEX2 = 0x252;
export const FVF_SONNET = FVF_XYZ_NORMAL_DIFFUSE_TEX2;
export const FVF_SONNET_STRIDE = 44;

// --- index formats ---------------------------------------------------------
export const D3DFMT_INDEX16 = 0x65;   // 101 — what every original draw passes
export const D3DFMT_INDEX32 = 0x66;   // 102 — remaster path only (see §9.5)

// --- D3DRENDERSTATETYPE (the 21 states of D3D8_API.md §4.1, plus the few
//     the shim needs to model defaults for) ---------------------------------
export const D3DRS_ZENABLE = 7;
export const D3DRS_FILLMODE = 8;
export const D3DRS_SHADEMODE = 9;
export const D3DRS_ZWRITEENABLE = 14;       // 0x0e
export const D3DRS_ALPHATESTENABLE = 15;    // 0x0f
export const D3DRS_SRCBLEND = 19;           // 0x13
export const D3DRS_DESTBLEND = 20;          // 0x14
export const D3DRS_CULLMODE = 22;           // 0x16
export const D3DRS_ZFUNC = 23;              // 0x17
export const D3DRS_ALPHAREF = 24;           // 0x18
export const D3DRS_ALPHAFUNC = 25;          // 0x19
export const D3DRS_DITHERENABLE = 26;       // 0x1a
export const D3DRS_ALPHABLENDENABLE = 27;   // 0x1b
export const D3DRS_FOGENABLE = 28;          // 0x1c
export const D3DRS_SPECULARENABLE = 29;     // 0x1d
export const D3DRS_FOGCOLOR = 34;           // 0x22
export const D3DRS_FOGTABLEMODE = 35;       // 0x23
export const D3DRS_FOGSTART = 36;           // 0x24
export const D3DRS_FOGEND = 37;             // 0x25
export const D3DRS_FOGDENSITY = 38;         // 0x26
export const D3DRS_RANGEFOGENABLE = 48;     // 0x30
export const D3DRS_STENCILENABLE = 52;      // 0x34 (never used)
export const D3DRS_TEXTUREFACTOR = 60;      // 0x3c
export const D3DRS_LIGHTING = 137;          // 0x89
export const D3DRS_AMBIENT = 139;           // 0x8b
export const D3DRS_FOGVERTEXMODE = 140;     // 0x8c
export const D3DRS_COLORVERTEX = 141;       // 0x8d (default TRUE)
export const D3DRS_NORMALIZENORMALS = 143;  // 0x8f (default FALSE — load-bearing)
export const D3DRS_DIFFUSEMATERIALSOURCE = 145;  // 0x91 (default D3DMCS_COLOR1)
export const D3DRS_AMBIENTMATERIALSOURCE = 147;  // 0x93 (default D3DMCS_MATERIAL)
export const D3DRS_CLIPPLANEENABLE = 152;   // 0x98

// --- D3DMATERIALCOLORSOURCE ------------------------------------------------
export const D3DMCS_MATERIAL = 0;
export const D3DMCS_COLOR1 = 1;
export const D3DMCS_COLOR2 = 2;

// --- D3DZBUFFERTYPE --------------------------------------------------------
export const D3DZB_FALSE = 0;
export const D3DZB_TRUE = 1;
export const D3DZB_USEW = 2;

// --- D3DCMPFUNC (ZFUNC / ALPHAFUNC) ---------------------------------------
export const D3DCMP_NEVER = 1;
export const D3DCMP_LESS = 2;
export const D3DCMP_EQUAL = 3;
export const D3DCMP_LESSEQUAL = 4;
export const D3DCMP_GREATER = 5;
export const D3DCMP_NOTEQUAL = 6;
export const D3DCMP_GREATEREQUAL = 7;
export const D3DCMP_ALWAYS = 8;

// --- D3DBLEND --------------------------------------------------------------
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

// --- D3DCULL. Relative to D3D's front-face-is-clockwise convention. --------
export const D3DCULL_NONE = 1;
export const D3DCULL_CW = 2;
export const D3DCULL_CCW = 3;

// --- D3DSHADEMODE ----------------------------------------------------------
export const D3DSHADE_FLAT = 1;
export const D3DSHADE_GOURAUD = 2;
export const D3DSHADE_PHONG = 3;

// --- D3DFOGMODE ------------------------------------------------------------
export const D3DFOG_NONE = 0;
export const D3DFOG_EXP = 1;
export const D3DFOG_EXP2 = 2;
export const D3DFOG_LINEAR = 3;    // Sonnet: FOGVERTEXMODE = LINEAR

// --- D3DTEXTURESTAGESTATETYPE (D3D8 numbering) ----------------------------
export const D3DTSS_COLOROP = 1;
export const D3DTSS_COLORARG1 = 2;
export const D3DTSS_COLORARG2 = 3;
export const D3DTSS_ALPHAOP = 4;
export const D3DTSS_ALPHAARG1 = 5;
export const D3DTSS_ALPHAARG2 = 6;
export const D3DTSS_TEXCOORDINDEX = 11;          // 0x0b
export const D3DTSS_ADDRESSU = 13;               // 0x0d
export const D3DTSS_ADDRESSV = 14;               // 0x0e
export const D3DTSS_BORDERCOLOR = 15;
export const D3DTSS_MAGFILTER = 16;              // 0x10
export const D3DTSS_MINFILTER = 17;              // 0x11
export const D3DTSS_MIPFILTER = 18;              // 0x12
export const D3DTSS_TEXTURETRANSFORMFLAGS = 24;  // 0x18
/** Shim-only convenience: set ADDRESSU and ADDRESSV together (D3D7 had this). */
export const D3DTSS_ADDRESS = 12;

/** TEXCOORDINDEX flag: generate texcoords from the camera-space normal. */
export const D3DTSS_TCI_PASSTHRU = 0x00000;
export const D3DTSS_TCI_CAMERASPACENORMAL = 0x10000;
export const D3DTSS_TCI_CAMERASPACEPOSITION = 0x20000;
export const D3DTSS_TCI_CAMERASPACEREFLECTIONVECTOR = 0x30000;

// --- D3DTEXTURETRANSFORMFLAGS ---------------------------------------------
export const D3DTTFF_DISABLE = 0;
export const D3DTTFF_COUNT1 = 1;
export const D3DTTFF_COUNT2 = 2;
export const D3DTTFF_COUNT3 = 3;
export const D3DTTFF_COUNT4 = 4;
export const D3DTTFF_PROJECTED = 256;

// --- D3DTEXTUREOP ----------------------------------------------------------
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

// --- D3DTA_* (texture stage argument selectors) ---------------------------
export const D3DTA_DIFFUSE = 0;
export const D3DTA_CURRENT = 1;
export const D3DTA_TEXTURE = 2;
export const D3DTA_TFACTOR = 3;
export const D3DTA_SPECULAR = 4;
export const D3DTA_COMPLEMENT = 0x10;
export const D3DTA_ALPHAREPLICATE = 0x20;

// --- D3DTEXTUREADDRESS -----------------------------------------------------
export const D3DTADDRESS_WRAP = 1;
export const D3DTADDRESS_MIRROR = 2;
export const D3DTADDRESS_CLAMP = 3;
export const D3DTADDRESS_BORDER = 4;

// --- D3DTEXTUREFILTERTYPE (D3D8 merged the D3D7 D3DTFG/D3DTFN/D3DTFP sets) -
export const D3DTEXF_NONE = 0;
export const D3DTEXF_POINT = 1;
export const D3DTEXF_LINEAR = 2;    // Sonnet: MIN/MAG/MIP all LINEAR, always

// --- Clear flags -----------------------------------------------------------
export const D3DCLEAR_TARGET = 0x1;
export const D3DCLEAR_ZBUFFER = 0x2;
export const D3DCLEAR_STENCIL = 0x4;

// --- D3DLIGHTTYPE ----------------------------------------------------------
export const D3DLIGHT_POINT = 1;
export const D3DLIGHT_SPOT = 2;
export const D3DLIGHT_DIRECTIONAL = 3;

// --- D3DPOOL / D3DUSAGE ----------------------------------------------------
export const D3DPOOL_DEFAULT = 0;
export const D3DPOOL_MANAGED = 1;
export const D3DPOOL_SYSTEMMEM = 2;
export const D3DPOOL_SCRATCH = 3;
export const D3DUSAGE_RENDERTARGET = 1;

// --- D3DFORMAT (only the handful the original names) ----------------------
export const D3DFMT_A8R8G8B8 = 0x15;   // 21 — every content texture
export const D3DFMT_X8R8G8B8 = 0x16;   // 22 — the opaque render targets
export const D3DFMT_A4R4G4B4 = 0x1a;   // 26 — the dead 4444 path
export const D3DFMT_D24S8 = 0x4b;      // 75 — the shared depth-stencil

/** Stride of a supported FVF. Sonnet has exactly one. */
export function fvfStride(fvf) {
  if (fvf === FVF_XYZ_NORMAL_DIFFUSE_TEX2) return FVF_SONNET_STRIDE;
  throw new Error('minid3d8: unsupported FVF 0x' + (fvf >>> 0).toString(16) +
    ' (Sonnet uses only 0x252 = XYZ|NORMAL|DIFFUSE|TEX2, stride 44)');
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
export const D3DCOLOR_XRGB = (r, g, b) => D3DCOLOR_ARGB(255, r, g, b);

// ===========================================================================
// D3DMATRIX — 4x4, row-major (index = row*4 + col, i.e. m[12..14] is the
// translation row _41.._43), left-handed, row-vector convention: v' = v * M.
// Identical to minid3d7's D3DMatrix except for perspectiveFovLH (see below).
// ===========================================================================

class Vec3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
}
function _v3(v) { return Array.isArray(v) ? new Vec3(v[0], v[1], v[2]) : v; }
function _cross(a, b) {
  return new Vec3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
}
export { Vec3 };

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

  // --- builders, mirroring the intro's matrix helpers (D3D8_API.md §3.3) ---

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
  static rotationX(a) {
    const r = new D3DMatrix(), c = Math.cos(a), s = Math.sin(a);
    r.m[5] = c; r.m[6] = s; r.m[9] = -s; r.m[10] = c;
    return r;
  }
  static rotationY(a) {
    const r = new D3DMatrix(), c = Math.cos(a), s = Math.sin(a);
    r.m[0] = c; r.m[2] = -s; r.m[8] = s; r.m[10] = c;
    return r;
  }
  static rotationZ(a) {
    const r = new D3DMatrix(), c = Math.cos(a), s = Math.sin(a);
    r.m[0] = c; r.m[1] = s; r.m[4] = -s; r.m[5] = c;
    return r;
  }

  /**
   * FUN_00402072: left-handed look-at view matrix (D3DXMatrixLookAtLH).
   * zaxis = normalize(at-eye); xaxis = normalize(cross(up,zaxis));
   * yaxis = cross(zaxis,xaxis). Up defaults to +Y.
   */
  static lookAtLH(eye, at, up) {
    const e = _v3(eye), a = _v3(at);
    const u = up ? _v3(up) : new Vec3(0, 1, 0);
    const z = new Vec3(a.x - e.x, a.y - e.y, a.z - e.z);
    const zl = Math.hypot(z.x, z.y, z.z) || 1;
    z.x /= zl; z.y /= zl; z.z /= zl;
    let x = _cross(u, z);
    let xl = Math.hypot(x.x, x.y, x.z);
    if (xl < 1e-6) {           // view direction parallel to up: pick another basis
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
   * FUN_00405c0c @ 0x405c0c — the intro's projection. Left-handed, z in [0,1],
   * i.e. D3DXMatrixPerspectiveFovLH exactly:
   *     h   = cot(fovY/2)
   *     _11 = h / aspect      _22 = h
   *     _33 = zf/(zf-zn)      _34 = 1      _43 = -zn*zf/(zf-zn)   _44 = 0
   *
   * !!! `fovY` IS THE VERTICAL FIELD OF VIEW, IN RADIANS. This is the exact
   * reverse of Lost Vegas / minid3d7, whose FUN_00401eb0 took a HORIZONTAL fov
   * (_11 = cot(fovH/2), _22 = cot(fovH/2)*aspect). Copying that function across
   * unchanged produces an aspect-squared field-of-view error that looks almost
   * plausible, which is why it gets its own scream.
   *
   * The camera's own default is (90 degrees, 4/3, 1.0, 1000.0) — see
   * perspectiveFovDegLH and PROJECTION_DEFAULTS.
   */
  static perspectiveFovLH(fovY, aspect, zn, zf) {
    const half = fovY * 0.5;
    const h = Math.cos(half) / Math.sin(half);      // cot(fovY/2)
    const q = zf / (zf - zn);
    const r = new D3DMatrix().zero(), m = r.m;
    m[0] = h / aspect;
    m[5] = h;
    m[10] = q;
    m[11] = 1;
    m[14] = -q * zn;
    return r;
  }

  /**
   * The timeline (method m254) supplies the FOV in DEGREES — 24/30/45/60/75/90
   * — and FUN_00405b5d multiplies by 0.017453292519943295 before calling
   * FUN_00405c0c. This is that call, so timeline code transcribes 1:1.
   */
  static perspectiveFovDegLH(fovDeg, aspect, zn, zf) {
    return D3DMatrix.perspectiveFovLH(fovDeg * DEG2RAD, aspect, zn, zf);
  }

  /** Column-major (GL) view of this matrix — i.e. the transpose. */
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

/** _DAT_004182e0 — the degree-to-radian constant FUN_00405b5d applies. */
export const DEG2RAD = 0.017453292519943295;

/** The camera constructor's defaults, decompile lines 4280-4312. */
export const PROJECTION_DEFAULTS = Object.freeze({
  fovDeg: 90.0, aspect: 4 / 3, zn: 1.0, zf: 1000.0,
});

/**
 * FUN_00401a3f mode 1's sphere-map texture matrix:
 *     u = 0.5*Nx + 0.5     v = -0.5*Ny + 0.5
 * Verified byte-by-byte at 0x401A73-0x401A89.
 */
export function sphereMapMatrix(scale = 0.5) {
  const r = new D3DMatrix();
  r.m[0] = scale; r.m[5] = -scale; r.m[10] = 1;
  r.m[12] = 0.5; r.m[13] = 0.5;
  return r;
}

// ===========================================================================
// Vertex scratch helper.
//
// The original hands raw user pointers to DrawPrimitiveUP, so the shim's draw
// calls take a typed array / ArrayBuffer whose bytes are already in FVF
// layout. This helper hands you the aliased views needed to fill one.
// ===========================================================================
export function makeVertexScratch(fvf, vertexCount) {
  const stride = fvfStride(fvf);
  const bytes = new Uint8Array(stride * vertexCount);
  const strideF = stride >> 2;    // 11 for 0x252
  return {
    fvf, stride, strideF,
    count: vertexCount,
    bytes,
    f32: new Float32Array(bytes.buffer),
    u32: new Uint32Array(bytes.buffer),
    /** index of vertex i's first position float, in the f32 view */
    base(i) { return i * strideF; },
    /** index of vertex i's first normal float (offset 12), in the f32 view */
    normalIndex(i) { return i * strideF + 3; },
    /** index of vertex i's DIFFUSE dword (offset 24), in the u32 view */
    colorIndex(i) { return i * strideF + 6; },
    /** index of vertex i's u0 (offset 28), in the f32 view */
    uv0Index(i) { return i * strideF + 7; },
    /** index of vertex i's u1 (offset 36), in the f32 view */
    uv1Index(i) { return i * strideF + 9; },
  };
}

// ===========================================================================
// buildMipsD3D8Box — a port of the original's mip generator, FUN_00403e48
// (box filter at 0x403F.., decompile lines 3040-3060).
//
// 23 of the 24 content textures are created with Levels = 0 (full chain) and
// every level is filled by this filter, with MIPFILTER = LINEAR on both
// stages. So mipmaps are part of the AUTHENTIC look here — the opposite of
// Lost Vegas, where the original uploaded a single level.
//
// The filter is a plain per-channel integer average of the 2x2 block with an
// arithmetic `>> 2`, on the stored (non-linear) values: no gamma correction,
// no sRGB, no weighting. gl.generateMipmap is NOT bit-identical to this, so
// ?quality=original must use this function.
// ===========================================================================

let _warnedNonSquareMip = false;

/**
 * @param {Uint32Array} pixels ARGB8888 dwords (0xAARRGGBB), w*h of them —
 *        exactly what the texgen produces.
 * @param {number} w
 * @param {number} h
 * @param {number} [maxLevels] stop after this many levels (0/undefined = full
 *        chain down to 1x1, which is D3D's `Levels = 0`).
 * @returns {{width:number,height:number,data:Uint32Array}[]} level 0 first.
 *          Level 0's `data` aliases nothing — it is a copy, matching the
 *          original's `work = copy of the source buffer`.
 */
export function buildMipsD3D8Box(pixels, w, h, maxLevels = 0) {
  if (!(pixels instanceof Uint32Array)) {
    throw new Error('minid3d8: buildMipsD3D8Box needs a Uint32Array of ARGB8888 dwords');
  }
  if (pixels.length < w * h) {
    throw new Error(`minid3d8: buildMipsD3D8Box got ${pixels.length} texels for ${w}x${h}`);
  }
  const full = 1 + Math.floor(Math.log2(Math.max(w, h)));
  const want = maxLevels > 0 ? Math.min(maxLevels, full) : full;
  const levels = [{ width: w, height: h, data: pixels.slice(0, w * h) }];
  let sw = w, sh = h, src = levels[0].data;
  while (levels.length < want && (sw > 1 || sh > 1)) {
    const dw = Math.max(1, sw >> 1), dh = Math.max(1, sh >> 1);
    // Degenerate axis: the original's loop assumes both dimensions halve. The
    // only non-square content texture is the 2048x512 font page, whose chain
    // does reach 4x1 -> 2x1 -> 1x1. We clamp the second sample to the last
    // row/column, which makes the >>2 average of a duplicated pair exactly the
    // average of the two real texels. UNVERIFIED against the original's tail
    // behaviour (D3D8_API.md does not record it) — flagged, not silent.
    if ((sw === 1 || sh === 1) && !_warnedNonSquareMip) {
      _warnedNonSquareMip = true;
      console.warn('minid3d8: buildMipsD3D8Box reached a degenerate mip level (' +
        sw + 'x' + sh + '); the clamp-to-edge tail behaviour is an assumption, ' +
        'not something the RE pinned down. See MINID3D8_API.md.');
    }
    const dst = new Uint32Array(dw * dh);
    for (let y = 0; y < dh; y++) {
      const y0 = (y * 2) * sw;
      const y1 = (Math.min(y * 2 + 1, sh - 1)) * sw;
      for (let x = 0; x < dw; x++) {
        const x0 = x * 2;
        const x1 = Math.min(x * 2 + 1, sw - 1);
        const c0 = src[y0 + x0], c1 = src[y0 + x1];
        const c2 = src[y1 + x0], c3 = src[y1 + x1];
        const a = (((c0 >>> 24) + (c1 >>> 24) + (c2 >>> 24) + (c3 >>> 24)) >> 2) & 255;
        const r = ((((c0 >>> 16) & 255) + ((c1 >>> 16) & 255) +
                    ((c2 >>> 16) & 255) + ((c3 >>> 16) & 255)) >> 2) & 255;
        const g = ((((c0 >>> 8) & 255) + ((c1 >>> 8) & 255) +
                    ((c2 >>> 8) & 255) + ((c3 >>> 8) & 255)) >> 2) & 255;
        const b = (((c0 & 255) + (c1 & 255) + (c2 & 255) + (c3 & 255)) >> 2) & 255;
        dst[y * dw + x] = ((a << 24) | (r << 16) | (g << 8) | b) >>> 0;
      }
    }
    levels.push({ width: dw, height: dh, data: dst });
    src = dst; sw = dw; sh = dh;
  }
  return levels;
}

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

// ===========================================================================
// The uber-shader.
//
// Everything the D3D8 fixed-function pipeline does for Sonnet, as one program:
//   VS: transform, per-vertex point lighting, linear range vertex fog,
//       texcoord generation (incl. the camera-space-normal sphere map),
//       user clip plane 0.
//   FS: the two-stage texture combiner, fog blend, alpha test.
// ===========================================================================

/** D3D8's fixed-function light limit. SetLight throws above this. */
export const MAX_LIGHTS = 8;

function buildVS(useClipDistance) {
  return `#version 300 es
${useClipDistance ? '#extension GL_EXT_clip_cull_distance : enable' : ''}
precision highp float;

#define MAX_LIGHTS ${MAX_LIGHTS}

// FVF 0x252, stride 44. Offsets 0 / 12 / 24 / 28 / 36.
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;
// D3DCOLOR bytes as they sit in memory: B,G,R,A (impedance note 4).
layout(location = 2) in vec4 aDiffuseBGRA;
layout(location = 3) in vec2 aUV0;
layout(location = 4) in vec2 aUV1;

uniform mat4 uWVP;      // WORLD*VIEW*PROJECTION, D3D row-major, uploaded verbatim
uniform mat4 uWV;       // WORLD*VIEW  — fog distance and the camera-space normal
uniform mat4 uWorld;    // WORLD       — lighting and the world-space clip plane
uniform mat3 uNormalMat; // inverse transpose of WORLD's 3x3 — D3D FF normal transform

// --- fixed-function lighting (D3D8_API.md §4.3, §9.2 item 5) --------------
uniform bool  uLighting;
uniform vec3  uAmbient;                    // D3DRS_AMBIENT, unpacked
uniform vec3  uMatAmbient;                 // D3DMATERIAL8.Ambient.rgb
uniform int   uNumLights;                  // compacted: only enabled lights
uniform vec3  uLightPos[MAX_LIGHTS];       // WORLD space
uniform vec3  uLightDiffuse[MAX_LIGHTS];
uniform vec3  uLightAmbient[MAX_LIGHTS];
uniform float uLightRange[MAX_LIGHTS];
uniform vec3  uLightAtten[MAX_LIGHTS];     // (Attenuation0, 1, 2)

// --- fog (linear vertex fog with range fog) -------------------------------
uniform bool  uFogEnable;
uniform int   uFogMode;      // D3DFOG_LINEAR(3) / EXP(1) / EXP2(2)
uniform bool  uRangeFog;     // D3DRS_RANGEFOGENABLE -> radial distance
uniform float uFogStart;
uniform float uFogEnd;
uniform float uFogDensity;

// --- texcoord generation --------------------------------------------------
uniform ivec2 uTCI;          // D3DTSS_TEXCOORDINDEX per stage
uniform ivec2 uTTFF;         // D3DTSS_TEXTURETRANSFORMFLAGS per stage
uniform ivec2 uFlipV;        // 1 if the bound texture is a render target
uniform mat4  uTexM0;
uniform mat4  uTexM1;
uniform bool  uSphereMapNormalize;

// --- user clip plane 0 ----------------------------------------------------
uniform bool uClipEnable;
uniform vec4 uClipPlane;     // WORLD space; visible half-space is dot >= 0

out vec4 vDiffuse;
flat out vec4 vDiffuseFlat;
out vec2 vUV0;
out vec2 vUV1;
out float vFog;
out float vClip;

vec2 genTexcoord(int tci, int ttff, mat4 M, vec3 camNormal, int flip) {
  vec3 src;
  if ((tci & 0xffff0000) == 0x10000) {        // D3DTSS_TCI_CAMERASPACENORMAL
    src = uSphereMapNormalize ? normalize(camNormal) : camNormal;
  } else {
    src = vec3(((tci & 0xffff) == 1) ? aUV1 : aUV0, 0.0);
  }
  vec2 uv;
  if (ttff == 2) {                            // D3DTTFF_COUNT2
    // Row-vector product src * M — uploaded row-major, so GL sees the
    // transpose and "M * v" is the row-vector multiply (impedance note 1).
    uv = (M * vec4(src, 1.0)).xy;
  } else {
    uv = src.xy;
  }
  if (flip != 0) uv.y = 1.0 - uv.y;           // impedance note 7
  return uv;
}

void main() {
  vec4 dif = aDiffuseBGRA.zyxw;               // B,G,R,A -> R,G,B,A
  vec4 worldPos = uWorld * vec4(aPos, 1.0);
  vec4 viewPos = uWV * vec4(aPos, 1.0);

  // --- lighting ------------------------------------------------------------
  // D3DRS_COLORVERTEX defaults TRUE, so vertex colours feed the material
  // sources — but only the ones whose source is a vertex colour:
  //     D3DRS_DIFFUSEMATERIALSOURCE  default D3DMCS_COLOR1   -> vertex diffuse
  //     D3DRS_AMBIENTMATERIALSOURCE  default D3DMCS_MATERIAL -> the MATERIAL
  //     D3DRS_EMISSIVEMATERIALSOURCE default D3DMCS_MATERIAL -> the MATERIAL
  // Sonnet sets none of 0x8d/0x91/0x93/0x94, so those defaults stand. The
  // ambient term is therefore NOT modulated by the vertex diffuse; it is
  // modulated by the material ambient, which Sonnet sets to WHITE (once, at
  // 0x401776). See D3D8_API.md §9.2 item 5 and re/engine/AMBIENT_FIX.md.
  //
  //   rgb = vertexDiffuse * Σ att*lightDiffuse*N·L          (D3DMCS_COLOR1)
  //       + matAmbient    * (D3DRS_AMBIENT + Σ att*lightAmbient)
  //       + matEmissive                                     (always 0 here)
  //   a   = vertexDiffuse.a, untouched.
  if (uLighting) {
    // !!! D3DRS_NORMALIZENORMALS IS FALSE. The normal is transformed by the
    // world matrix and NOT renormalised. The mesh generator's normals are an
    // unweighted average of face normals that is deliberately never
    // normalised, so |n| < 1 at creases and that shortening darkens them.
    // Adding a normalize() here would silently destroy a load-bearing visual
    // property of the original.
    // D3D's fixed-function pipeline transforms normals by the INVERSE TRANSPOSE
    // of the world matrix, not by the world matrix.  It matters here because
    // every terrain carries a non-uniform node scale (terrainScale, typically
    // (3, 0.5, 3)): under the plain transform a normal's horizontal components
    // are amplified 6x relative to its vertical, so the lighting sees a terrain
    // six times steeper than the one being drawn — 32% of a HEIGHTFIELD's
    // vertices ended up facing away from a light directly overhead, giving a
    // hard terminator and flat black slabs (the project owner's "shadow too
    // dark and too coarse" at 0x0738).
    //
    // !! THIS FIX AND FUN_0040e923's SHADOW BAKE MUST LAND TOGETHER.  Measured
    // separately each is a REGRESSION (normals alone: mean +1.05; shadow alone:
    // +0.24 at 0x0738) because the over-steep normals were accidentally
    // standing in for the missing baked shadow.  Together: 0x0738 26.54 ->
    // 17.31, mean 30.94 -> 29.34.  See REVIEW_FIXES.md 2f/2g.
    //
    // NOTE this does not renormalise — the generator's unnormalised normals and
    // the |n| < 1 crease darkening they carry are preserved, as required.
    //
    // The matrix is computed on the CPU (uNormalMat) rather than with GLSL's
    // inverse(): it is a per-draw quantity, not a per-vertex one, and keeping
    // inverse()/transpose() out of the shader avoids depending on ES 3.0
    // built-ins that some drivers handle poorly.
    vec3 N = uNormalMat * aNormal;
    vec3 P = worldPos.xyz;
    vec3 difSum = vec3(0.0);         // Σ att * lightDiffuse * N·L
    vec3 ambSum = uAmbient;          // D3DRS_AMBIENT + Σ att * lightAmbient
    for (int i = 0; i < MAX_LIGHTS; i++) {
      if (i >= uNumLights) break;
      vec3 d = uLightPos[i] - P;
      float dist = length(d);
      if (dist > uLightRange[i]) continue;
      float att = uLightAtten[i].x + uLightAtten[i].y * dist +
                  uLightAtten[i].z * dist * dist;
      att = (att > 0.0) ? (1.0 / att) : 1.0;
      vec3 L = d / max(dist, 1e-20);
      float ndl = max(dot(N, L), 0.0);
      difSum += att * uLightDiffuse[i] * ndl;
      ambSum += att * uLightAmbient[i];
    }
    dif = vec4(clamp(dif.rgb * difSum + uMatAmbient * ambSum, 0.0, 1.0), dif.a);
  }
  vDiffuse = dif;
  vDiffuseFlat = dif;

  // --- texcoords -----------------------------------------------------------
  vec3 camNormal = (uWV * vec4(aNormal, 0.0)).xyz;
  vUV0 = genTexcoord(uTCI.x, uTTFF.x, uTexM0, camNormal, uFlipV.x);
  vUV1 = genTexcoord(uTCI.y, uTTFF.y, uTexM1, camNormal, uFlipV.y);

  // --- fog -----------------------------------------------------------------
  // VERTEX fog: D3D computes the factor per vertex and interpolates it, which
  // is what we do here. FOGTABLEMODE is D3DFOG_NONE in the original.
  // RANGEFOGENABLE is on, so the distance is RADIAL eye-space distance, not
  // the eye-space z that a naive port uses.
  vFog = 1.0;
  if (uFogEnable) {
    float d = uRangeFog ? length(viewPos.xyz) : viewPos.z;
    float f;
    if (uFogMode == 3) f = (uFogEnd - d) / (uFogEnd - uFogStart);   // LINEAR
    else if (uFogMode == 2) { float t = uFogDensity * d; f = exp(-t * t); }
    else f = exp(-uFogDensity * d);
    vFog = clamp(f, 0.0, 1.0);
  }

  // --- user clip plane 0 (world space, D3D8 SW-VP convention) --------------
  vClip = uClipEnable ? dot(worldPos, uClipPlane) : 1.0;
${useClipDistance ? '  gl_ClipDistance[0] = vClip;' : ''}

  vec4 p = uWVP * vec4(aPos, 1.0);
  // Impedance note 2: D3D clip z in [0,w] -> GL clip z in [-w,w].
  p.z = 2.0 * p.z - p.w;
  gl_Position = p;
}`;
}

function buildFS(useClipDistance) {
  return `#version 300 es
precision highp float;

in vec4 vDiffuse;
flat in vec4 vDiffuseFlat;
in vec2 vUV0;
in vec2 vUV1;
in float vFog;
in float vClip;

uniform sampler2D uTex0;
uniform sampler2D uTex1;

// The 2-stage fixed-function combiner, expressed as data. Packed into ONE
// array so a stage change costs a single uniform1iv instead of six — Sonnet
// toggles stage 1 between DISABLE/ADD/MODULATE constantly (FUN_004019a0).
// Stage s occupies uStage[s*6 .. s*6+5]. Texcoord routing lives in the VS.
uniform int uStage[12];
#define ST_COLOROP(s)   uStage[(s) * 6 + 0]
#define ST_COLORARG1(s) uStage[(s) * 6 + 1]
#define ST_COLORARG2(s) uStage[(s) * 6 + 2]
#define ST_ALPHAOP(s)   uStage[(s) * 6 + 3]
#define ST_ALPHAARG1(s) uStage[(s) * 6 + 4]
#define ST_ALPHAARG2(s) uStage[(s) * 6 + 5]

uniform vec4 uTexFactor;    // D3DRS_TEXTUREFACTOR, as D3DTA_TFACTOR
uniform bool uShadeFlat;    // D3DRS_SHADEMODE == D3DSHADE_FLAT
uniform vec3 uFogColor;
uniform bool uFogEnableFS;

uniform bool  uAlphaTest;   // D3DRS_ALPHATESTENABLE
uniform int   uAlphaFunc;   // D3DCMPFUNC
uniform float uAlphaRef;    // D3DRS_ALPHAREF, normalised to 0..1

uniform bool uClipDiscard;  // clip-plane fallback when EXT_clip_cull_distance
                            // is unavailable

out vec4 outColor;

// D3DTA_* argument selection, including the COMPLEMENT / ALPHAREPLICATE
// modifier bits D3D ORs into the argument value.
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

bool alphaPasses(float a) {
  float r = uAlphaRef;
  if (uAlphaFunc == 1) return false;             // NEVER
  if (uAlphaFunc == 2) return a <  r;            // LESS
  if (uAlphaFunc == 3) return a == r;            // EQUAL
  if (uAlphaFunc == 4) return a <= r;            // LESSEQUAL
  if (uAlphaFunc == 5) return a >  r;            // GREATER
  if (uAlphaFunc == 6) return a != r;            // NOTEQUAL
  if (uAlphaFunc == 7) return a >= r;            // GREATEREQUAL
  return true;                                   // ALWAYS
}

void main() {
  // Clip-plane fallback: no EXT_clip_cull_distance, so discard on the
  // interpolated signed distance instead. Same visible result for solid
  // rasterised geometry; it just does not actually clip the primitive.
  if (uClipDiscard && vClip < 0.0) discard;

  vec4 dif = uShadeFlat ? vDiffuseFlat : vDiffuse;
  vec4 t0 = texture(uTex0, vUV0);
  vec4 t1 = texture(uTex1, vUV1);

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

  if (uAlphaTest && !alphaPasses(cur.a)) discard;

  // D3D blends fog into COLOUR ONLY; alpha is untouched.
  if (uFogEnableFS) cur.rgb = mix(uFogColor, cur.rgb, vFog);

  outColor = cur;
}`;
}

// ===========================================================================
// MiniD3D8
// ===========================================================================

const _u32 = new Uint32Array(1);
const _f32 = new Float32Array(_u32.buffer);
let _asFloatWarned = null;   // set of already-warned ambiguous SetRenderState values

/** Vertices consumed by `primCount` primitives of the given type. */
export function verticesForPrimitives(primType, primCount) {
  switch (primType) {
    case D3DPT_POINTLIST: return primCount;
    case D3DPT_LINELIST: return primCount * 2;
    case D3DPT_LINESTRIP: return primCount + 1;
    case D3DPT_TRIANGLELIST: return primCount * 3;
    case D3DPT_TRIANGLESTRIP:
    case D3DPT_TRIANGLEFAN: return primCount + 2;
    default: throw new Error('minid3d8: bad primitive type ' + primType);
  }
}

/** The plain upper-left 3x3, row-major — this shim's historical normal transform. */
function worldMatrix3(m, out) {
  out[0] = m[0]; out[1] = m[1]; out[2] = m[2];
  out[3] = m[4]; out[4] = m[5]; out[5] = m[6];
  out[6] = m[8]; out[7] = m[9]; out[8] = m[10];
  return out;
}

/**
 * The inverse transpose of a row-major 4x4's upper-left 3x3, as a row-major
 * mat3 for `uniformMatrix3fv(..., false, ...)`.  D3D's fixed-function pipeline
 * transforms vertex normals by this, not by the world matrix — see the shader.
 * Singular matrices (a zero scale) fall back to the plain 3x3 rather than
 * producing NaN, which would silently discard the geometry.
 */
function normalMatrix3(m, out) {
  const a = m[0], b = m[1], c = m[2];
  const d = m[4], e = m[5], f = m[6];
  const g = m[8], h = m[9], i = m[10];
  const A =  (e * i - f * h), B = -(d * i - f * g), C =  (d * h - e * g);
  const det = a * A + b * B + c * C;
  if (det === 0 || !Number.isFinite(det)) {
    out[0] = a; out[1] = b; out[2] = c;
    out[3] = d; out[4] = e; out[5] = f;
    out[6] = g; out[7] = h; out[8] = i;
    return out;
  }
  const s = 1 / det;
  // inverse = adj/det; transpose of that, written row-major
  out[0] = A * s;                    out[1] = B * s;                    out[2] = C * s;
  out[3] = -(b * i - c * h) * s;     out[4] =  (a * i - c * g) * s;     out[5] = -(a * h - b * g) * s;
  out[6] =  (b * f - c * e) * s;     out[7] = -(a * f - c * d) * s;     out[8] =  (a * e - b * d) * s;
  return out;
}

export class MiniD3D8 {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} [opts] { antialias, preserveDrawingBuffer, rangeFogSupported }
   */
  constructor(canvas, opts = {}) {
    const attribs = {
      alpha: false,
      antialias: opts.antialias === true,   // the original had none
      depth: true,
      stencil: false,                       // D3DFMT_D24S8, but no stencil is ever used
      premultipliedAlpha: false,
      preserveDrawingBuffer: !!opts.preserveDrawingBuffer,
      powerPreference: 'high-performance',
    };
    const gl = canvas.getContext('webgl2', attribs);
    if (!gl) throw new Error('minid3d8: WebGL2 not available');
    this.canvas = canvas;
    this.gl = gl;

    this.contextLost = false;
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.contextLost = true;
    });

    // --- user clip plane support ---------------------------------------------
    // D3D8_API.md §9.2 item 7. EXT_clip_cull_distance gives real geometric
    // clipping; without it we fall back to a fragment discard on the
    // interpolated signed distance, which is visually equivalent for the
    // water-reflection cut the demo uses it for (FUN_00408eef).
    this.clipExt = gl.getExtension('EXT_clip_cull_distance');
    this.useClipDistance = !!this.clipExt;
    this.CLIP_DISTANCE0 = 0x3000;   // GL_CLIP_DISTANCE0

    // --- opts.anisotropy: max anisotropy for mip-filtered samplers -----------
    // 1 (the default) is the authentic D3D8 behaviour — Sonnet never sets
    // D3DTSS_MAXANISOTROPY, so every sampler is plain trilinear. See
    // _samplerFor for what turning it up buys and why nothing turns it up yet.
    this._anisoExt = gl.getExtension('EXT_texture_filter_anisotropic');
    this._aniso = 1;
    if (this._anisoExt && opts.anisotropy > 1) {
      this._aniso = Math.min(Number(opts.anisotropy),
        gl.getParameter(this._anisoExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT));
    }

    // --- program -------------------------------------------------------------
    const prog = gl.createProgram();
    const compile = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        throw new Error('minid3d8 shader: ' + gl.getShaderInfoLog(sh));
      }
      gl.attachShader(prog, sh);
    };
    compile(gl.VERTEX_SHADER, buildVS(this.useClipDistance));
    compile(gl.FRAGMENT_SHADER, buildFS(this.useClipDistance));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error('minid3d8 link: ' + gl.getProgramInfoLog(prog));
    }
    gl.useProgram(prog);
    this.prog = prog;
    const U = (n) => gl.getUniformLocation(prog, n);
    this.u = {
      WVP: U('uWVP'), WV: U('uWV'), world: U('uWorld'), normalMat: U('uNormalMat'),
      tex0: U('uTex0'), tex1: U('uTex1'),
      stage: U('uStage'), texFactor: U('uTexFactor'), shadeFlat: U('uShadeFlat'),
      lighting: U('uLighting'), ambient: U('uAmbient'), numLights: U('uNumLights'),
      matAmbient: U('uMatAmbient'),
      lightPos: U('uLightPos[0]'), lightDiffuse: U('uLightDiffuse[0]'),
      lightAmbient: U('uLightAmbient[0]'), lightRange: U('uLightRange[0]'),
      lightAtten: U('uLightAtten[0]'),
      fogEnable: U('uFogEnable'), fogEnableFS: U('uFogEnableFS'),
      fogMode: U('uFogMode'), rangeFog: U('uRangeFog'),
      fogStart: U('uFogStart'), fogEnd: U('uFogEnd'), fogDensity: U('uFogDensity'),
      fogColor: U('uFogColor'),
      tci: U('uTCI'), ttff: U('uTTFF'), flipV: U('uFlipV'),
      texM0: U('uTexM0'), texM1: U('uTexM1'),
      sphereMapNormalize: U('uSphereMapNormalize'),
      clipEnable: U('uClipEnable'), clipPlane: U('uClipPlane'),
      clipDiscard: U('uClipDiscard'),
      alphaTest: U('uAlphaTest'), alphaFunc: U('uAlphaFunc'), alphaRef: U('uAlphaRef'),
    };
    gl.uniform1i(this.u.tex0, 0);
    gl.uniform1i(this.u.tex1, 1);
    gl.uniform1i(this.u.clipDiscard, 0);

    // --- geometry: one streaming VBO/IBO, re-specified per draw --------------
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    this.vbo = gl.createBuffer();
    this.ibo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
    for (let a = 0; a < 5; a++) gl.enableVertexAttribArray(a);
    this._boundStride = -1;
    this._viewCache = new WeakMap();

    // --- transforms (D3D row-major, impedance note 1) ------------------------
    this.transforms = {
      [D3DTS_WORLD]: new D3DMatrix(),
      [D3DTS_VIEW]: new D3DMatrix(),
      [D3DTS_PROJECTION]: new D3DMatrix(),
      [D3DTS_TEXTURE0]: new D3DMatrix(),
      [D3DTS_TEXTURE1]: new D3DMatrix(),
    };
    this._wv = new D3DMatrix();
    this._wvp = new D3DMatrix();
    this._nrm = new Float32Array(9);   // normalMatrix3 scratch
    // Which matrix lights the normals.  'world' is what this shim always did;
    // 'inverse' is what D3D's FF pipeline actually does.  See setNormalTransform.
    this._normalMode = 'world';
    this._matDirty = true;
    this._texMatDirty = [true, true];

    // --- render state cache --------------------------------------------------
    this.rs = {
      [D3DRS_ZENABLE]: D3DZB_TRUE,
      [D3DRS_ZWRITEENABLE]: 1,
      [D3DRS_ZFUNC]: D3DCMP_LESSEQUAL,
      [D3DRS_ALPHATESTENABLE]: 0,
      [D3DRS_ALPHAFUNC]: D3DCMP_ALWAYS,
      [D3DRS_ALPHAREF]: 0,
      [D3DRS_ALPHABLENDENABLE]: 0,
      [D3DRS_SRCBLEND]: D3DBLEND_ONE,
      [D3DRS_DESTBLEND]: D3DBLEND_ZERO,
      [D3DRS_CULLMODE]: D3DCULL_CCW,
      [D3DRS_SHADEMODE]: D3DSHADE_GOURAUD,
      [D3DRS_LIGHTING]: 0,
      [D3DRS_AMBIENT]: 0xffffffff,
      [D3DRS_FOGENABLE]: 0,
      [D3DRS_FOGCOLOR]: 0,
      [D3DRS_FOGTABLEMODE]: D3DFOG_NONE,
      [D3DRS_FOGVERTEXMODE]: D3DFOG_NONE,
      [D3DRS_FOGDENSITY]: 1.0,
      [D3DRS_FOGSTART]: 0.0,
      [D3DRS_FOGEND]: 1.0,
      [D3DRS_RANGEFOGENABLE]: 0,
      [D3DRS_TEXTUREFACTOR]: 0xffffffff,
      [D3DRS_CLIPPLANEENABLE]: 0,
    };

    // --- texture stage state cache (2 stages; the original never touches more)
    const defStage = (i) => ({
      [D3DTSS_COLOROP]: i === 0 ? D3DTOP_MODULATE : D3DTOP_DISABLE,
      [D3DTSS_COLORARG1]: D3DTA_TEXTURE,
      [D3DTSS_COLORARG2]: i === 0 ? D3DTA_DIFFUSE : D3DTA_CURRENT,
      [D3DTSS_ALPHAOP]: i === 0 ? D3DTOP_MODULATE : D3DTOP_DISABLE,
      [D3DTSS_ALPHAARG1]: D3DTA_TEXTURE,
      [D3DTSS_ALPHAARG2]: i === 0 ? D3DTA_DIFFUSE : D3DTA_CURRENT,
      [D3DTSS_TEXCOORDINDEX]: i,
      [D3DTSS_TEXTURETRANSFORMFLAGS]: D3DTTFF_DISABLE,
      [D3DTSS_ADDRESSU]: D3DTADDRESS_WRAP,
      [D3DTSS_ADDRESSV]: D3DTADDRESS_WRAP,
      [D3DTSS_MAGFILTER]: D3DTEXF_LINEAR,
      [D3DTSS_MINFILTER]: D3DTEXF_LINEAR,
      [D3DTSS_MIPFILTER]: D3DTEXF_LINEAR,
    });
    this.tss = [defStage(0), defStage(1)];
    this.textures = [null, null];
    this._stageDirty = true;
    this._texRouteDirty = true;
    this._stageInts = new Int32Array(12);
    this._samplerCache = new Map();
    this._stageSampler = [null, null];
    this._boundTexGL = [null, null];
    this._boundSamplerGL = [null, null];
    this._activeUnit = -1;
    this._flipV = [0, 0];

    // A 1x1 opaque white stand-in, so D3DTA_TEXTURE on a stage with no bound
    // texture behaves like "no texture" (MODULATE by white = pass-through).
    // FUN_00401d12 relies on this: it does SetTexture(0, NULL) for untextured
    // materials while leaving COLOROP = MODULATE(TEXTURE, DIFFUSE).
    this.whiteTexture = this.createTexture(new Uint32Array([0xffffffff]), 1, 1, { levels: 1 });

    // --- lighting ------------------------------------------------------------
    // The D3D8 default material is all-zero, so uMatAmbient starts at black —
    // the shader's default is the GLSL uniform default of 0, which matches.
    // applyDefaultState() then transcribes Sonnet's SetMaterial (ambient white).
    this.material = null;
    this.lights = [];             // sparse, indexed by D3D light index
    this.lightEnabled = [];
    this._lightsDirty = true;
    this._lp = new Float32Array(MAX_LIGHTS * 3);
    this._ld = new Float32Array(MAX_LIGHTS * 3);
    this._la = new Float32Array(MAX_LIGHTS * 3);
    this._lr = new Float32Array(MAX_LIGHTS);
    this._lat = new Float32Array(MAX_LIGHTS * 3);

    // --- clip plane ----------------------------------------------------------
    this.clipPlanes = [new Float32Array([0, 0, 0, 0])];

    // --- fog helper cache (mirrors the demo's own cached fog descriptor) -----
    this.fogState = { mode: 0, color: 0xffffffff, start: 0, end: 1.0 };
    /**
     * D3DRS_RANGEFOGENABLE was only set if the card reported
     * D3DPRASTERCAPS_FOGRANGE (D3D8_API.md §10 item 6). Nearly all 2001
     * hardware did, so the shim assumes radial fog. Set false to reproduce a
     * card without it.
     */
    this.rangeFogSupported = opts.rangeFogSupported !== false;
    /** DAT_00474794 — the default ALPHAREF, reset to 0x80 by resetLayerState. */
    this.alphaRefDefault = 0x80;
    /** DAT_00474790 — the global clear colour. */
    this.clearColor = 0x00000000;
    /** DAT_004747b0 — the shadowed LIGHTING flag, readable via FUN_00401bca. */
    this.lightingFlag = 0;

    /**
     * Whether the camera-space normal fed to D3DTSS_TCI_CAMERASPACENORMAL is
     * renormalised. D3DRS_NORMALIZENORMALS is FALSE in the original, so the
     * shim's default (false) uses the raw transformed normal, matching the
     * lighting path. UNVERIFIED against real 2001 drivers — flip it if the
     * sphere map looks wrong. See MINID3D8_API.md "Uncertainties".
     */
    this.sphereMapNormalize = !!opts.sphereMapNormalize;

    this.inScene = false;
    this.frameCount = 0;

    // --- render targets ------------------------------------------------------
    this._fbo = gl.createFramebuffer();
    this._depthRBs = new Map();         // "WxH" -> WebGLRenderbuffer
    this.currentTarget = null;          // null == the backbuffer
    this._targetWidth = canvas.width;
    this._targetHeight = canvas.height;
    /**
     * The single logical depth-stencil surface (DAT_00474888). The original
     * created ONE oversized 1024x512 D24S8 and bound it to the backbuffer and
     * to every render-target texture. WebGL2 forbids a depth attachment whose
     * size differs from the framebuffer, so this token stands in for a
     * per-size renderbuffer cache. Safe because the demo Clears depth on every
     * target switch. Documented as a deliberate divergence.
     */
    this.depthSurface = { __minid3d8DepthSurface: true, width: 1024, height: 512 };
    /** The backbuffer surface (DAT_00474884). */
    this.backBufferSurface = { __minid3d8BackBuffer: true };

    // --- viewport (D3D convention: x,y from the TOP-left) --------------------
    this.viewport = { x: 0, y: 0, width: canvas.width, height: canvas.height, minZ: 0, maxZ: 1 };
    this.renderScale = 1;

    this.caps = {
      MaxTextureWidth: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      MaxTextureHeight: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      MaxTextureBlendStages: 2,
      MaxSimultaneousTextures: 2,
      MaxActiveLights: MAX_LIGHTS,
      MaxUserClipPlanes: 1,
      RasterCaps_FogRange: this.rangeFogSupported,
    };

    this._applyViewport();
    this._applyAllRenderState();
    this._uploadTexRouting();
    gl.uniform1i(this.u.sphereMapNormalize, this.sphereMapNormalize ? 1 : 0);
    gl.uniformMatrix4fv(this.u.texM0, false, this.transforms[D3DTS_TEXTURE0].m);
    gl.uniformMatrix4fv(this.u.texM1, false, this.transforms[D3DTS_TEXTURE1].m);
    gl.clearColor(0, 0, 0, 1);
    gl.clearDepth(1);
    gl.disable(gl.SCISSOR_TEST);
    gl.disable(gl.STENCIL_TEST);
  }

  // =========================================================================
  // Device: frame boundary
  // =========================================================================

  /** IDirect3DDevice8::BeginScene [vtbl 0x88]. Bookkeeping only. */
  BeginScene() { this.inScene = true; return 0; }

  /** IDirect3DDevice8::EndScene [vtbl 0x8c]. */
  EndScene() { this.inScene = false; return 0; }

  /**
   * IDirect3DDevice8::Present [vtbl 0x3c].
   *
   * !!! DELIBERATELY DOES NOT ASSERT !inScene. FUN_0040149b presents while
   * still inside a BeginScene/EndScene pair — the EndScene happens afterwards,
   * in FUN_00402c72. 2001 drivers tolerated it; here BeginScene/EndScene are
   * pure bookkeeping and Present is the frame boundary.
   */
  Present() { this.gl.flush(); this.frameCount++; return 0; }

  /**
   * FUN_0040149b + FUN_00402c72(0) — Present, then restore the backbuffer and
   * start the next frame. Transcribe the original's frame tail as one call.
   */
  presentAndRestoreBackbuffer(clearColor) {
    this.Present();
    this.EndScene();
    this.SetRenderTarget(null, this.depthSurface);
    this.Clear(0, null, D3DCLEAR_TARGET | D3DCLEAR_ZBUFFER,
      clearColor === undefined ? this.clearColor : clearColor, 1.0, 0);
    this.BeginScene();
    return 0;
  }

  /**
   * IDirect3DDevice8::Clear [vtbl 0x90]. Full COM form
   *   Clear(Count, pRects, Flags, Color, Z, Stencil)
   * so decompiled call sites transcribe verbatim; the short form
   *   Clear(Flags, Color, Z)
   * is also accepted. Rectangle lists are not supported — the original always
   * passes (0, NULL). Like D3D's, this ignores ZWRITEENABLE.
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
    if (flags & D3DCLEAR_STENCIL) {
      // No stencil is ever used (§9.2 item 8); accepted and ignored.
    }
    const zwrite = !!this.rs[D3DRS_ZWRITEENABLE];
    if (!zwrite) gl.depthMask(true);
    gl.clear(mask);
    if (!zwrite) gl.depthMask(false);
    return 0;
  }

  /** IDirect3DDevice8::GetDeviceCaps [vtbl 0x1c]. */
  GetDeviceCaps() { return this.caps; }

  // =========================================================================
  // Viewport
  // =========================================================================

  /**
   * IDirect3DDevice8::SetViewport [vtbl 0x60]. The original NEVER calls this
   * (§7.2): the device default follows the render target. SetRenderTarget
   * therefore resets the viewport to the target's full size, exactly as D3D8
   * does, and this entry point exists only for completeness.
   */
  SetViewport(x, y, width, height, minZ = 0, maxZ = 1) {
    this.viewport = { x, y, width, height, minZ, maxZ };
    this._applyViewport();
    return 0;
  }
  GetViewport() { return { ...this.viewport }; }

  _applyViewport() {
    const gl = this.gl, v = this.viewport, s = this.renderScale || 1;
    const targetH = this._targetHeight;
    gl.viewport(Math.round(v.x * s), Math.round(targetH - (v.y + v.height) * s),
      Math.round(v.width * s), Math.round(v.height * s));
    gl.depthRange(v.minZ, v.maxZ);
  }

  /**
   * [shim ext] Framebuffer:logical ratio for a supersampled remaster. The
   * whole demo draws in NDC or through a projection matrix, so nothing else
   * has to change — see §9.5, where the only resolution-bound value is the
   * lens-flare quad's half-size and the 4x4 occlusion rect.
   */
  setRenderScale(s) {
    this.renderScale = s > 0 ? s : 1;
    this._applyViewport();
  }

  // =========================================================================
  // Transforms
  // =========================================================================

  /**
   * IDirect3DDevice8::SetTransform [vtbl 0x64].
   *
   * !!! D3DTS_WORLD IS 0x100 IN D3D8 (it was 1 in D3D7). Unknown states throw
   * rather than being silently ignored, so a mis-transcribed constant is a
   * loud failure instead of an object that never moves.
   */
  SetTransform(state, mat) {
    const t = this.transforms[state];
    if (!t) {
      throw new Error('minid3d8: unsupported transform state ' + state +
        ' (0x' + (state >>> 0).toString(16) + '). Valid: D3DTS_VIEW=2, ' +
        'D3DTS_PROJECTION=3, D3DTS_TEXTURE0=0x10, D3DTS_TEXTURE1=0x11, ' +
        'D3DTS_WORLD=0x100. Note D3D7 used 1 for WORLD; D3D8 uses 0x100.');
    }
    const src = mat.m ? mat.m : mat, d = t.m;
    let same = true;
    for (let i = 0; i < 16; i++) if (d[i] !== src[i]) { same = false; break; }
    if (same) return 0;
    d.set(src);
    if (state === D3DTS_TEXTURE0) this._texMatDirty[0] = true;
    else if (state === D3DTS_TEXTURE1) this._texMatDirty[1] = true;
    else this._matDirty = true;
    return 0;
  }
  GetTransform(state) {
    const t = this.transforms[state];
    if (!t) throw new Error('minid3d8: unsupported transform state ' + state);
    return t.clone();
  }

  _syncMatrices() {
    const gl = this.gl;
    if (this._matDirty) {
      // D3D order: v * WORLD * VIEW * PROJECTION.
      D3DMatrix.multiply(this.transforms[D3DTS_WORLD], this.transforms[D3DTS_VIEW], this._wv);
      D3DMatrix.multiply(this._wv, this.transforms[D3DTS_PROJECTION], this._wvp);
      // Impedance note 1: upload the row-major D3D array as-is.
      gl.uniformMatrix4fv(this.u.WVP, false, this._wvp.m);
      gl.uniformMatrix4fv(this.u.WV, false, this._wv.m);
      gl.uniformMatrix4fv(this.u.world, false, this.transforms[D3DTS_WORLD].m);
      gl.uniformMatrix3fv(this.u.normalMat, false,
        this._normalMode === 'inverse'
          ? normalMatrix3(this.transforms[D3DTS_WORLD].m, this._nrm)
          : worldMatrix3(this.transforms[D3DTS_WORLD].m, this._nrm));
      this._matDirty = false;
    }
    if (this._texMatDirty[0]) {
      gl.uniformMatrix4fv(this.u.texM0, false, this.transforms[D3DTS_TEXTURE0].m);
      this._texMatDirty[0] = false;
    }
    if (this._texMatDirty[1]) {
      gl.uniformMatrix4fv(this.u.texM1, false, this.transforms[D3DTS_TEXTURE1].m);
      this._texMatDirty[1] = false;
    }
  }

  // =========================================================================
  // Render state
  // =========================================================================

  /** IDirect3DDevice8::SetRenderState [vtbl 0xa4]. */
  SetRenderState(state, value) {
    if (this.rs[state] === value) return 0;
    this.rs[state] = value;
    const gl = this.gl;
    switch (state) {
      case D3DRS_ZENABLE:
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
      // --- alpha test (D3D7 shim had none; Sonnet uses it for real) ---------
      case D3DRS_ALPHATESTENABLE:
        gl.uniform1i(this.u.alphaTest, value ? 1 : 0);
        break;
      case D3DRS_ALPHAFUNC:
        gl.uniform1i(this.u.alphaFunc, value | 0);
        break;
      case D3DRS_ALPHAREF:
        // D3D8's ALPHAREF is an 8-bit value compared against the fragment's
        // 8-bit alpha; normalise to the shader's 0..1.
        gl.uniform1f(this.u.alphaRef, (value & 255) / 255);
        break;
      // --- fog ---------------------------------------------------------------
      case D3DRS_FOGENABLE:
        gl.uniform1i(this.u.fogEnable, value ? 1 : 0);
        gl.uniform1i(this.u.fogEnableFS, value ? 1 : 0);
        if (value) this._matDirty = true;
        break;
      case D3DRS_FOGCOLOR:
        gl.uniform3f(this.u.fogColor,
          ((value >>> 16) & 255) / 255, ((value >>> 8) & 255) / 255, (value & 255) / 255);
        break;
      case D3DRS_FOGTABLEMODE:
      case D3DRS_FOGVERTEXMODE:
        this._applyFogMode();
        break;
      case D3DRS_RANGEFOGENABLE:
        gl.uniform1i(this.u.rangeFog, value ? 1 : 0);
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
      // --- lighting ----------------------------------------------------------
      case D3DRS_LIGHTING:
        gl.uniform1i(this.u.lighting, value ? 1 : 0);
        break;
      case D3DRS_AMBIENT:
        gl.uniform3f(this.u.ambient,
          ((value >>> 16) & 255) / 255, ((value >>> 8) & 255) / 255, (value & 255) / 255);
        break;
      // --- clip plane --------------------------------------------------------
      case D3DRS_CLIPPLANEENABLE: {
        if (value & ~1) {
          throw new Error('minid3d8: only clip plane 0 is implemented; ' +
            'CLIPPLANEENABLE = 0x' + (value >>> 0).toString(16) +
            ' names a plane the shim has no uniform for (D3D8_API.md §4.4 ' +
            'documents exactly one plane).');
        }
        const on = !!(value & 1);
        gl.uniform1i(this.u.clipEnable, on ? 1 : 0);
        if (this.useClipDistance) {
          if (on) gl.enable(this.CLIP_DISTANCE0); else gl.disable(this.CLIP_DISTANCE0);
        } else {
          gl.uniform1i(this.u.clipDiscard, on ? 1 : 0);
        }
        break;
      }
      // --- states the original never sets away from their defaults ----------
      case D3DRS_NORMALIZENORMALS:
        if (value) {
          throw new Error('minid3d8: D3DRS_NORMALIZENORMALS is FALSE in Sonnet and ' +
            'the shim does not implement renormalisation. The mesh generator emits ' +
            'unweighted, deliberately un-normalised face-normal averages; |n| < 1 at ' +
            'creases is a load-bearing visual property. Enabling this would change ' +
            'the shading of every lit object.');
        }
        break;
      case D3DRS_COLORVERTEX:
        if (!value) {
          throw new Error('minid3d8: D3DRS_COLORVERTEX = FALSE is not implemented. ' +
            'Sonnet leaves it at its TRUE default, which is what makes the vertex ' +
            'diffuse replace the material diffuse.');
        }
        break;
      case D3DRS_DIFFUSEMATERIALSOURCE:
        if (value !== D3DMCS_COLOR1) {
          throw new Error('minid3d8: only D3DMCS_COLOR1 is implemented for ' +
            'D3DRS_DIFFUSEMATERIALSOURCE (its D3D8 default, and what Sonnet relies on).');
        }
        break;
      case D3DRS_AMBIENTMATERIALSOURCE:
        // The D3D8 DEFAULT here is D3DMCS_MATERIAL, not COLOR1 — see
        // re/engine/AMBIENT_FIX.md. Sonnet never sets 0x93, so the default
        // stands and the ambient term is scaled by the MATERIAL ambient.
        if (value !== D3DMCS_MATERIAL) {
          throw new Error('minid3d8: only D3DMCS_MATERIAL is implemented for ' +
            'D3DRS_AMBIENTMATERIALSOURCE (its D3D8 default, and what Sonnet relies on).');
        }
        break;
      case D3DRS_SPECULARENABLE:
        if (value) {
          throw new Error('minid3d8: specular lighting is not implemented. ' +
            'Sonnet never sets D3DRS_SPECULARENABLE and every material has a ' +
            'zero specular (D3D8_API.md §4.3).');
        }
        break;
      case D3DRS_STENCILENABLE:
        if (value) throw new Error('minid3d8: no stencil buffer — Sonnet never uses one.');
        break;
      // Silently accepted, no WebGL equivalent / no observable effect:
      //   DITHERENABLE (we render RGBA8), FILLMODE (always SOLID)
      default:
        break;
    }
    return 0;
  }
  GetRenderState(state) { return this.rs[state]; }

  /**
   * Effective fog mode. D3D uses FOGTABLEMODE (pixel fog) when it is not
   * D3DFOG_NONE, otherwise FOGVERTEXMODE. Sonnet always sets
   * FOGTABLEMODE = NONE and FOGVERTEXMODE = LINEAR (FUN_00401abf), so pixel
   * fog never happens; if it ever does, say so out loud, because the shim
   * computes the factor per vertex either way.
   */
  _applyFogMode() {
    const table = this.rs[D3DRS_FOGTABLEMODE], vertex = this.rs[D3DRS_FOGVERTEXMODE];
    let mode = vertex;
    if (table !== D3DFOG_NONE) {
      mode = table;
      if (!this._warnedTableFog) {
        this._warnedTableFog = true;
        console.warn('minid3d8: D3DRS_FOGTABLEMODE != D3DFOG_NONE. The original ' +
          'always uses VERTEX fog (FUN_00401abf sets FOGTABLEMODE = NONE, ' +
          'FOGVERTEXMODE = LINEAR); the shim will still evaluate the factor ' +
          'per vertex, so per-pixel table fog will be subtly wrong.');
      }
    }
    this.gl.uniform1i(this.u.fogMode, mode | 0);
  }

  // D3D passes floats to SetRenderState as raw DWORD bit patterns
  // (*(DWORD*)&f). JS callers naturally pass a real number, so accept both.
  _asFloat(value) {
    if (typeof value === 'number' && !Number.isInteger(value)) return value;
    const v = value >>> 0;
    if (v === 0) return 0;
    if (v <= 64) return v;             // plausible as a literal small number
    _f32[0] = 0; _u32[0] = v;
    const f = _f32[0];
    // A genuine D3D bit pattern for any useful magnitude is a LARGE integer
    // (1.0 -> 0x3F800000, 400.0 -> 0x43C80000). An integer in this middle band
    // decodes to a denormal around 1e-43, which is never a meaningful render
    // state -- it means the caller passed a plain JS number by mistake. That
    // silently fogs the whole frame to the fog colour with no GL error, and it
    // has now cost two scene ports an hour each. Stay faithful (return the bit
    // pattern the original would have produced) but say so, loudly, once.
    if (f !== 0 && Math.abs(f) < 1e-30) {
      _asFloatWarned = _asFloatWarned || new Set();
      if (!_asFloatWarned.has(v)) {
        _asFloatWarned.add(v);
        console.warn(
          `minid3d8: SetRenderState received ${v}, which as a D3D float bit ` +
          `pattern is ${f.toExponential(2)} -- almost certainly a plain JS ` +
          `number passed where a bit pattern was expected. Wrap it: ` +
          `f32bits(${v}). Returning the faithful (denormal) value.`);
      }
    }
    return f;
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
   * left-handed terms (front = clockwise on screen); after that the cull enums
   * line up one-to-one.
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
    this._applyFogMode();
  }

  /**
   * The post-CreateDevice baseline of D3D8_API.md §1.5 (0x401714-0x401813).
   * Call once after construction to start where the original starts.
   */
  applyDefaultState() {
    this.SetRenderState(D3DRS_ZENABLE, D3DZB_TRUE);
    this.SetRenderState(D3DRS_ZWRITEENABLE, 1);
    this.SetRenderState(D3DRS_ZFUNC, D3DCMP_LESSEQUAL);
    // Diffuse and Ambient rgb = 1, ALPHA = 0 (only offsets 0,4,8 / 0x10,0x14,
    // 0x18 are written). The Diffuse is indeed irrelevant — COLORVERTEX +
    // DIFFUSEMATERIALSOURCE = D3DMCS_COLOR1 makes the vertex diffuse replace
    // it. The **Ambient is NOT**: AMBIENTMATERIALSOURCE defaults to
    // D3DMCS_MATERIAL, so this white ambient scales the whole ambient term.
    this.SetMaterial({
      Diffuse: { r: 1, g: 1, b: 1, a: 0 },
      Ambient: { r: 1, g: 1, b: 1, a: 0 },
      Specular: { r: 0, g: 0, b: 0, a: 0 },
      Emissive: { r: 0, g: 0, b: 0, a: 0 },
      Power: 0,
    });
    for (let s = 0; s < 2; s++) {
      this.SetTextureStageState(s, D3DTSS_MIPFILTER, D3DTEXF_LINEAR);
      this.SetTextureStageState(s, D3DTSS_TEXCOORDINDEX, s);
      this.SetTextureStageState(s, D3DTSS_MAGFILTER, D3DTEXF_LINEAR);
      this.SetTextureStageState(s, D3DTSS_MINFILTER, D3DTEXF_LINEAR);
      this.SetTextureStageState(s, D3DTSS_COLORARG1, D3DTA_TEXTURE);
      this.SetTextureStageState(s, D3DTSS_COLORARG2, D3DTA_DIFFUSE);
      this.SetTextureStageState(s, D3DTSS_COLOROP, D3DTOP_MODULATE);
      this.SetTextureStageState(s, D3DTSS_ALPHAARG1, D3DTA_TEXTURE);
      this.SetTextureStageState(s, D3DTSS_ALPHAARG2, D3DTA_DIFFUSE);
      this.SetTextureStageState(s, D3DTSS_ALPHAOP, D3DTOP_MODULATE);
    }
    this.SetTextureStageState(1, D3DTSS_COLORARG2, D3DTA_CURRENT);
    this.SetTextureStageState(1, D3DTSS_ALPHAARG2, D3DTA_CURRENT);
    this.SetVertexShader(FVF_XYZ_NORMAL_DIFFUSE_TEX2);
    this.resetLayerState();
    return 0;
  }

  /**
   * IDirect3DDevice8::SetVertexShader [vtbl 0x130]. The original calls this
   * exactly once, with the FVF 0x252, and never again.
   */
  SetVertexShader(fvf) {
    fvfStride(fvf);        // throws on anything but 0x252
    this.fvf = fvf;
    return 0;
  }
  GetVertexShader() { return this.fvf; }

  // =========================================================================
  // Lighting — D3D8_API.md §4.3 / §9.2 item 5
  // =========================================================================

  /**
   * IDirect3DDevice8::SetMaterial [vtbl 0xa8].
   *
   * Only Diffuse and Ambient are meaningful. Diffuse IS overridden by the
   * vertex diffuse (DIFFUSEMATERIALSOURCE defaults to D3DMCS_COLOR1), but
   * **Ambient is NOT** — AMBIENTMATERIALSOURCE defaults to D3DMCS_MATERIAL, so
   * the material's ambient really does scale the ambient term. It is uploaded
   * to the shader here. (Sonnet's one material has Ambient = white, but the
   * value is honoured rather than assumed.) See re/engine/AMBIENT_FIX.md.
   *
   * A non-zero Emissive/Specular is loudly rejected rather than silently
   * dropped.
   */
  SetMaterial(mat) {
    const nz = (c) => c && (c.r || c.g || c.b);
    if (mat) {
      if (nz(mat.Emissive)) {
        throw new Error('minid3d8: a non-zero material Emissive is not implemented. ' +
          'Every Sonnet material has Emissive = 0 (D3D8_API.md §4.3).');
      }
      if (nz(mat.Specular)) {
        throw new Error('minid3d8: a non-zero material Specular is not implemented. ' +
          'Sonnet never enables D3DRS_SPECULARENABLE and every material has ' +
          'Specular = 0.');
      }
    }
    this.material = mat || null;
    const a = mat && mat.Ambient;
    this.gl.uniform3f(this.u.matAmbient,
      a ? (a.r || 0) : 0, a ? (a.g || 0) : 0, a ? (a.b || 0) : 0);
    return 0;
  }
  GetMaterial() { return this.material; }

  /**
   * IDirect3DDevice8::SetLight [vtbl 0xb0].
   * @param {number} index
   * @param {object} light D3DLIGHT8: { Type, Diffuse, Ambient, Position,
   *        Range, Falloff, Attenuation0, Attenuation1, Attenuation2 }.
   *        Colours are D3DCOLORVALUE {r,g,b,a} floats; Position is {x,y,z} or
   *        [x,y,z], in WORLD space.
   *
   * POINT LIGHTS ONLY. FUN_00405d13 hard-codes Type = D3DLIGHT_POINT and
   * nothing in the demo ever changes it, so directional and spot throw rather
   * than being approximated.
   */
  SetLight(index, light) {
    if (index < 0 || index >= MAX_LIGHTS) {
      throw new Error(`minid3d8: light index ${index} is outside 0..${MAX_LIGHTS - 1}. ` +
        'Raise MAX_LIGHTS (and the shader arrays) if a remaster needs more.');
    }
    const type = light.Type === undefined ? D3DLIGHT_POINT : light.Type;
    if (type !== D3DLIGHT_POINT) {
      throw new Error('minid3d8: only D3DLIGHT_POINT is implemented (got Type=' + type +
        '). FUN_00405d13 creates point lights and nothing in Sonnet changes that.');
    }
    const p = light.Position || { x: 0, y: 0, z: 0 };
    const pos = Array.isArray(p) ? { x: p[0], y: p[1], z: p[2] } : p;
    const col = (c, d) => c ? { r: c.r || 0, g: c.g || 0, b: c.b || 0, a: c.a === undefined ? 1 : c.a } : d;
    this.lights[index] = {
      Type: type,
      Diffuse: col(light.Diffuse, { r: 1, g: 1, b: 1, a: 1 }),
      Ambient: col(light.Ambient, { r: 0, g: 0, b: 0, a: 0 }),
      Position: { x: pos.x || 0, y: pos.y || 0, z: pos.z || 0 },
      Range: light.Range === undefined ? 2000.0 : light.Range,
      Falloff: light.Falloff === undefined ? 1.0 : light.Falloff,
      Attenuation0: light.Attenuation0 || 0,
      // FUN_00405da8 clamps Attenuation1 to >= 1e-4; the ctor default is 1.0.
      Attenuation1: light.Attenuation1 === undefined ? 1.0 : Math.max(light.Attenuation1, 1e-4),
      Attenuation2: light.Attenuation2 || 0,
    };
    if (this.lightEnabled[index]) this._lightsDirty = true;
    return 0;
  }
  GetLight(index) { return this.lights[index]; }

  /** IDirect3DDevice8::LightEnable [vtbl 0xb8]. */
  LightEnable(index, enable) {
    if (index < 0 || index >= MAX_LIGHTS) {
      throw new Error(`minid3d8: light index ${index} is outside 0..${MAX_LIGHTS - 1}.`);
    }
    const on = !!enable;
    if (this.lightEnabled[index] === on) return 0;
    this.lightEnabled[index] = on;
    this._lightsDirty = true;
    return 0;
  }
  GetLightEnable(index) { return !!this.lightEnabled[index]; }

  _syncLights() {
    if (!this._lightsDirty) return;
    const gl = this.gl;
    let n = 0;
    for (let i = 0; i < MAX_LIGHTS; i++) {
      if (!this.lightEnabled[i]) continue;
      const L = this.lights[i];
      if (!L) continue;
      this._lp[n * 3] = L.Position.x; this._lp[n * 3 + 1] = L.Position.y; this._lp[n * 3 + 2] = L.Position.z;
      this._ld[n * 3] = L.Diffuse.r; this._ld[n * 3 + 1] = L.Diffuse.g; this._ld[n * 3 + 2] = L.Diffuse.b;
      this._la[n * 3] = L.Ambient.r; this._la[n * 3 + 1] = L.Ambient.g; this._la[n * 3 + 2] = L.Ambient.b;
      this._lr[n] = L.Range;
      this._lat[n * 3] = L.Attenuation0;
      this._lat[n * 3 + 1] = L.Attenuation1;
      this._lat[n * 3 + 2] = L.Attenuation2;
      n++;
    }
    gl.uniform1i(this.u.numLights, n);
    if (n > 0) {
      gl.uniform3fv(this.u.lightPos, this._lp);
      gl.uniform3fv(this.u.lightDiffuse, this._ld);
      gl.uniform3fv(this.u.lightAmbient, this._la);
      gl.uniform1fv(this.u.lightRange, this._lr);
      gl.uniform3fv(this.u.lightAtten, this._lat);
    }
    this._lightsDirty = false;
  }

  // =========================================================================
  // User clip plane — D3D8_API.md §4.4
  // =========================================================================

  /**
   * IDirect3DDevice8::SetClipPlane [vtbl 0xc0]. Plane 0 only.
   * The plane is in WORLD space (the D3D8 fixed-function / software-VP
   * convention) and the VISIBLE half-space is where dot(worldPos, plane) >= 0,
   * which is also GL's gl_ClipDistance convention.
   */
  SetClipPlane(index, plane) {
    if (index !== 0) {
      throw new Error('minid3d8: only clip plane 0 exists (D3D8_API.md §4.4 — ' +
        'FUN_00408eef sets exactly one, for the water reflection cut).');
    }
    const p = plane.length !== undefined ? plane : [plane.a, plane.b, plane.c, plane.d];
    this.clipPlanes[0].set([p[0], p[1], p[2], p[3]]);
    this.gl.uniform4fv(this.u.clipPlane, this.clipPlanes[0]);
    return 0;
  }
  GetClipPlane(index) {
    if (index !== 0) throw new Error('minid3d8: only clip plane 0 exists.');
    return Array.from(this.clipPlanes[0]);
  }

  // =========================================================================
  // Texture stage state
  // =========================================================================

  /** IDirect3DDevice8::SetTextureStageState [vtbl 0xc8]. */
  SetTextureStageState(stage, type, value) {
    if (stage < 0 || stage > 1) {
      throw new Error('minid3d8: only stages 0 and 1 exist (D3D8_API.md §5: the ' +
        'original never touches another). Got stage ' + stage + '.');
    }
    const st = this.tss[stage];
    if (type === D3DTSS_ADDRESS) {          // shim convenience: both axes
      if (st[D3DTSS_ADDRESSU] === value && st[D3DTSS_ADDRESSV] === value) return 0;
      st[D3DTSS_ADDRESSU] = value;
      st[D3DTSS_ADDRESSV] = value;
      this._stageSampler[stage] = null;
      return 0;
    }
    if (st[type] === value) return 0;       // redundant set: nothing to do
    st[type] = value;
    if (type === D3DTSS_ADDRESSU || type === D3DTSS_ADDRESSV ||
        type === D3DTSS_MAGFILTER || type === D3DTSS_MINFILTER ||
        type === D3DTSS_MIPFILTER) {
      this._stageSampler[stage] = null;
    } else if (type === D3DTSS_TEXCOORDINDEX || type === D3DTSS_TEXTURETRANSFORMFLAGS) {
      if (type === D3DTSS_TEXCOORDINDEX && (value & 0xffff0000) &&
          value !== D3DTSS_TCI_CAMERASPACENORMAL) {
        throw new Error('minid3d8: the only texcoord generator implemented is ' +
          'D3DTSS_TCI_CAMERASPACENORMAL (0x10000). Got 0x' + (value >>> 0).toString(16) + '.');
      }
      this._texRouteDirty = true;
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
      const st = this.tss[i], b = i * 6;
      s[b] = st[D3DTSS_COLOROP] | 0;
      s[b + 1] = st[D3DTSS_COLORARG1] | 0;
      s[b + 2] = st[D3DTSS_COLORARG2] | 0;
      s[b + 3] = st[D3DTSS_ALPHAOP] | 0;
      s[b + 4] = st[D3DTSS_ALPHAARG1] | 0;
      s[b + 5] = st[D3DTSS_ALPHAARG2] | 0;
    }
    this.gl.uniform1iv(this.u.stage, s);
    this._stageDirty = false;
  }

  /** Texcoord routing lives in the vertex shader (TCI / TTFF / RT v-flip). */
  _uploadTexRouting() {
    const gl = this.gl;
    gl.uniform2i(this.u.tci, this.tss[0][D3DTSS_TEXCOORDINDEX] | 0,
      this.tss[1][D3DTSS_TEXCOORDINDEX] | 0);
    gl.uniform2i(this.u.ttff, this.tss[0][D3DTSS_TEXTURETRANSFORMFLAGS] | 0,
      this.tss[1][D3DTSS_TEXTURETRANSFORMFLAGS] | 0);
    gl.uniform2i(this.u.flipV, this._flipV[0], this._flipV[1]);
    this._texRouteDirty = false;
  }

  // Impedance note 5: D3D filter/address state is per-stage, GL's is baked
  // into the texture object. WebGL2 sampler objects restore D3D's behaviour;
  // cache one per distinct combination.
  _samplerFor(stage, hasMips) {
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
        // D3DTADDRESS_BORDER has no WebGL2 equivalent; Sonnet never selects it.
        case D3DTADDRESS_BORDER: return gl.CLAMP_TO_EDGE;
        default: return gl.REPEAT;
      }
    };
    gl.samplerParameteri(s, gl.TEXTURE_WRAP_S, addr(st[D3DTSS_ADDRESSU]));
    gl.samplerParameteri(s, gl.TEXTURE_WRAP_T, addr(st[D3DTSS_ADDRESSV]));
    gl.samplerParameteri(s, gl.TEXTURE_MAG_FILTER,
      st[D3DTSS_MAGFILTER] === D3DTEXF_POINT ? gl.NEAREST : gl.LINEAR);
    const linMin = st[D3DTSS_MINFILTER] !== D3DTEXF_POINT;
    let min;
    // MIPFILTER only bites if the texture actually has a mip chain. Unlike
    // Lost Vegas, Sonnet's textures usually DO (23 of 24 content textures),
    // and MIPFILTER is LINEAR everywhere — genuine trilinear filtering.
    if (!hasMips || st[D3DTSS_MIPFILTER] === D3DTEXF_NONE) {
      min = linMin ? gl.LINEAR : gl.NEAREST;
    } else if (st[D3DTSS_MIPFILTER] === D3DTEXF_POINT) {
      min = linMin ? gl.LINEAR_MIPMAP_NEAREST : gl.NEAREST_MIPMAP_NEAREST;
    } else {
      min = linMin ? gl.LINEAR_MIPMAP_LINEAR : gl.NEAREST_MIPMAP_LINEAR;
    }
    gl.samplerParameteri(s, gl.TEXTURE_MIN_FILTER, min);
    // REMASTER, OPT-IN, DEFAULT OFF — anisotropic filtering.
    //
    // Sonnet never touches D3DTSS_MAXANISOTROPY (D3D8_API.md §5's per-stage
    // census), so trilinear is the authentic filter and `?quality=original`
    // must never see this. But trilinear picks its mip from the LARGER axis of
    // the footprint, and the ground is drawn at a grazing angle, so the terrain
    // is exactly the case it handles worst: the detail map is tiled 16x and
    // dissolves into its own mean a short way in front of the camera.
    // Measured at 0x1828: aniso 16x keeps the grain resolved several times
    // further out, and sharpens the distant rock ridge with it. See
    // re/scenes/TERRAIN_DETAIL.md "anisotropy".
    //
    // WIRED, and off by default: main.js reads `?aniso=N` into its ANISO const
    // and passes `new MiniD3D8(canvas, { anisotropy: ANISO })`, which is 1
    // unless asked. So the shipped page gets the authentic trilinear filter and
    // `?aniso=16` is the opt-in that reproduces the measurement above.
    if (this._aniso > 1 && hasMips && st[D3DTSS_MIPFILTER] !== D3DTEXF_NONE) {
      gl.samplerParameterf(s, this._anisoExt.TEXTURE_MAX_ANISOTROPY_EXT, this._aniso);
    }
    this._samplerCache.set(key, s);
    this._stageSampler[stage] = { sampler: s, hasMips };
    return s;
  }

  // =========================================================================
  // Textures
  // =========================================================================

  /**
   * FUN_00403dd3 / FUN_00403e48 — the content-texture path.
   * IDirect3DDevice8::CreateTexture(w, h, Levels, 0, D3DFMT_A8R8G8B8,
   * D3DPOOL_MANAGED) followed by a per-level Lock/copy/Unlock.
   *
   * @param {Uint32Array|Uint8Array} pixels ARGB8888 dwords (what the texgen
   *        produces) or raw RGBA bytes.
   * @param {number} w
   * @param {number} h
   * @param {object} [opts]
   *   `levels`  mirrors D3D8's Levels parameter EXACTLY: 0 = full mip chain,
   *             1 = single level, n = n levels. NEVER inferred — the per-site
   *             truth table is D3D8_API.md §6.1.1 (23 of 24 sites pass 0).
   *   `generateMipmap` remaster-only fast path: use gl.generateMipmap instead
   *             of the original's integer box filter. NOT byte-identical, so
   *             ?quality=original must leave it false.
   * @returns {{tex:WebGLTexture,width:number,height:number,levels:number,
   *            hasMips:boolean,flipV:boolean}}
   */
  createTexture(pixels, w, h, opts = {}) {
    const gl = this.gl;
    if (opts.levels === undefined) {
      throw new Error('minid3d8: createTexture requires an explicit `levels` ' +
        '(0 = full mip chain, 1 = single level), mirroring D3D8\'s Levels ' +
        'parameter. It is never inferred: see D3D8_API.md §6.1.1 for the ' +
        'per-call-site truth table.');
    }
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);   // D3D v grows downward,
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);          // and so does GL's row 0

    const wantChain = opts.levels === 0 || opts.levels > 1;
    let levelCount = 1;

    if (wantChain && !opts.generateMipmap) {
      const argb = _asARGB(pixels, w * h);
      const chain = buildMipsD3D8Box(argb, w, h, opts.levels);
      gl.texStorage2D(gl.TEXTURE_2D, chain.length, gl.RGBA8, w, h);
      for (let i = 0; i < chain.length; i++) {
        const lv = chain[i];
        gl.texSubImage2D(gl.TEXTURE_2D, i, 0, 0, lv.width, lv.height,
          gl.RGBA, gl.UNSIGNED_BYTE, argbToRGBA(lv.data, lv.width * lv.height));
      }
      levelCount = chain.length;
    } else {
      let data = null;
      if (pixels instanceof Uint32Array) data = argbToRGBA(pixels, w * h);
      else if (pixels) data = pixels instanceof Uint8Array ? pixels : new Uint8Array(pixels.buffer || pixels);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
      if (wantChain && opts.generateMipmap) {
        gl.generateMipmap(gl.TEXTURE_2D);
        levelCount = 1 + Math.floor(Math.log2(Math.max(w, h)));
      }
    }
    // No texParameteri here on purpose: filtering/addressing live in the
    // per-stage sampler objects (impedance note 5).
    gl.bindTexture(gl.TEXTURE_2D, null);
    this._invalidateTexBinding();
    return { tex, width: w, height: h, levels: levelCount, hasMips: levelCount > 1, flipV: false };
  }

  /**
   * FUN_00402b16 — a render-target texture. Levels = 1 always (RTs never have
   * mips), D3DUSAGE_RENDERTARGET, D3DPOOL_DEFAULT, A8R8G8B8 or X8R8G8B8.
   * Size is entirely caller-supplied — nothing here knows 64/128/256/512.
   */
  createRenderTargetTexture(w, h, hasAlpha = true) {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, hasAlpha ? gl.RGBA8 : gl.RGB8, w, h);
    gl.bindTexture(gl.TEXTURE_2D, null);
    this._invalidateTexBinding();
    // flipV: impedance note 7 — the rasteriser writes NDC +y up into GL's
    // bottom-up texture, so D3D's v is the GL t flipped.
    return {
      tex, width: w, height: h, levels: 1, hasMips: false,
      flipV: true, isRenderTarget: true, hasAlpha: !!hasAlpha,
    };
  }

  /** Re-upload a whole texture. The animated texture at line 10796 is instead
   *  re-created through the ctor, so this is a shim convenience. */
  updateTexture(handle, pixels) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, handle.tex);
    if (handle.hasMips) {
      const argb = _asARGB(pixels, handle.width * handle.height);
      const chain = buildMipsD3D8Box(argb, handle.width, handle.height, handle.levels);
      for (let i = 0; i < chain.length; i++) {
        const lv = chain[i];
        gl.texSubImage2D(gl.TEXTURE_2D, i, 0, 0, lv.width, lv.height,
          gl.RGBA, gl.UNSIGNED_BYTE, argbToRGBA(lv.data, lv.width * lv.height));
      }
    } else {
      const data = pixels instanceof Uint32Array
        ? argbToRGBA(pixels, handle.width * handle.height) : pixels;
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, handle.width, handle.height,
        gl.RGBA, gl.UNSIGNED_BYTE, data);
    }
    gl.bindTexture(gl.TEXTURE_2D, null);
    this._invalidateTexBinding();
    return 0;
  }

  destroyTexture(handle) {
    if (handle && handle.tex) this.gl.deleteTexture(handle.tex);
  }

  /** IDirect3DDevice8::SetTexture [vtbl 0xc4]. `tex` may be null. */
  SetTexture(stage, tex) {
    if (stage < 0 || stage > 1) {
      throw new Error('minid3d8: only stages 0 and 1 exist. Got ' + stage + '.');
    }
    const h = tex || null;
    if (this.textures[stage] === h) return 0;
    this.textures[stage] = h;
    const flip = h && h.flipV ? 1 : 0;
    if (this._flipV[stage] !== flip) { this._flipV[stage] = flip; this._texRouteDirty = true; }
    return 0;
  }
  GetTexture(stage) { return this.textures[stage]; }

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
  // Render targets — D3D8_API.md §6.2 / §9.2 item 8
  // =========================================================================

  /**
   * IDirect3DDevice8::SetRenderTarget [vtbl 0x7c].
   * @param {object|null} colorTarget a handle from createRenderTargetTexture,
   *        or null for the backbuffer.
   * @param {object} [depthTarget] accepted for signature fidelity and ignored
   *        — there is exactly one logical depth surface (see below).
   *
   * !!! DELIBERATE DIVERGENCE. The original creates ONE oversized 1024x512
   * D24S8 (FUN_00402bc9) and binds it to the 640x480 backbuffer AND to every
   * 64/128/256/512-square render-target texture, relying on D3D8's rule that
   * the depth surface may be LARGER than the render target. WebGL2 requires
   * the depth attachment to match the framebuffer's dimensions, so the shim
   * keeps a depth renderbuffer per render-target SIZE behind this one logical
   * surface. That is exactly equivalent here because both target-switch paths
   * (FUN_00402b4f and FUN_00402c72) Clear the depth buffer, so no depth
   * content ever needs to survive a switch.
   *
   * Also note D3D8 resets the viewport to the target's full size on
   * SetRenderTarget — the original never calls SetViewport and depends on it.
   */
  SetRenderTarget(colorTarget, depthTarget) {
    const gl = this.gl;
    if (depthTarget !== undefined && depthTarget !== null &&
        !depthTarget.__minid3d8DepthSurface) {
      throw new Error('minid3d8: the only depth surface is device.depthSurface ' +
        '(the shim collapses the original\'s single shared 1024x512 D24S8 into ' +
        'a per-size renderbuffer cache).');
    }
    if (!colorTarget || colorTarget.__minid3d8BackBuffer) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      this.currentTarget = null;
      this._targetWidth = this.canvas.width;
      this._targetHeight = this.canvas.height;
      this.viewport = {
        x: 0, y: 0,
        width: Math.round(this.canvas.width / (this.renderScale || 1)),
        height: Math.round(this.canvas.height / (this.renderScale || 1)),
        minZ: 0, maxZ: 1,
      };
      this._applyViewport();
      return 0;
    }
    if (!colorTarget.isRenderTarget) {
      throw new Error('minid3d8: SetRenderTarget needs a handle from ' +
        'createRenderTargetTexture (D3DUSAGE_RENDERTARGET), not a content texture.');
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D,
      colorTarget.tex, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER,
      this._depthRBFor(colorTarget.width, colorTarget.height));
    const st = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (st !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error('minid3d8: incomplete render-target framebuffer 0x' + st.toString(16));
    }
    this.currentTarget = colorTarget;
    this._targetWidth = colorTarget.width;
    this._targetHeight = colorTarget.height;
    // The viewport follows the render target and is NOT scaled by
    // renderScale: an RT's size is already whatever the caller asked for.
    this.viewport = { x: 0, y: 0, width: colorTarget.width, height: colorTarget.height, minZ: 0, maxZ: 1 };
    const s = this.renderScale;
    this.renderScale = 1;
    this._applyViewport();
    this.renderScale = s;
    return 0;
  }
  GetRenderTarget() { return this.currentTarget; }

  _depthRBFor(w, h) {
    const key = w + 'x' + h;
    let rb = this._depthRBs.get(key);
    if (rb) return rb;
    const gl = this.gl;
    rb = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
    // The original ran D3DFMT_D24S8. No stencil is ever used, so a plain
    // DEPTH_COMPONENT24 matches its depth precision exactly.
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    this._depthRBs.set(key, rb);
    return rb;
  }

  /**
   * FUN_00402b4f(t, bClear) — switch to a render-target texture and (usually)
   * clear it. Transcribes the original's RTT driver 1:1.
   */
  beginRenderTarget(rt, bClear = true) {
    this.EndScene();
    this.SetRenderTarget(rt, this.depthSurface);
    if (bClear) {
      this.Clear(0, null, D3DCLEAR_TARGET | D3DCLEAR_ZBUFFER, this.clearColor, 1.0, 0);
    }
    this.BeginScene();
    return 0;
  }

  /** FUN_00402c72(bOnlyIfRTT) — restore the backbuffer and clear it. */
  endRenderTarget(bOnlyIfRTT = true) {
    if (bOnlyIfRTT && !this.currentTarget) return 0;
    this.EndScene();
    this.SetRenderTarget(null, this.depthSurface);
    this.Clear(0, null, D3DCLEAR_TARGET | D3DCLEAR_ZBUFFER, this.clearColor, 1.0, 0);
    this.BeginScene();
    return 0;
  }

  // =========================================================================
  // Draw calls
  // =========================================================================

  /**
   * IDirect3DDevice8::DrawPrimitiveUP [vtbl 0x120].
   *   DrawPrimitiveUP(PrimitiveType, PrimitiveCount, pVertexStreamZeroData,
   *                   VertexStreamZeroStride)
   *
   * !!! `primitiveCount` IS A PRIMITIVE COUNT, NOT A VERTEX COUNT. D3D7's
   * DrawPrimitive took vertices; D3D8 takes primitives. Passing a vertex count
   * here silently draws one third of a triangle list.
   *
   * `stride` stays an explicit parameter rather than being derived from the
   * FVF — that is what the original passes (always 44), and it keeps the shim
   * quality-agnostic.
   */
  DrawPrimitiveUP(primType, primitiveCount, pVerts, stride) {
    if (primitiveCount <= 0) return 0;
    if (!stride) throw new Error('minid3d8: DrawPrimitiveUP needs an explicit stride ' +
      '(the original always passes 44).');
    const gl = this.gl;
    const vertexCount = verticesForPrimitives(primType, primitiveCount);
    this._setupVertices(pVerts, stride, vertexCount * stride);
    this._applyDrawState();
    gl.drawArrays(this._glPrim(primType), 0, vertexCount);
    return 0;
  }

  /**
   * IDirect3DDevice8::DrawIndexedPrimitiveUP [vtbl 0x124].
   *   DrawIndexedPrimitiveUP(PrimitiveType, MinVertexIndex, NumVertices,
   *                          PrimitiveCount, pIndexData, IndexDataFormat,
   *                          pVertexStreamZeroData, VertexStreamZeroStride)
   *
   * `primitiveCount` is again a PRIMITIVE count.
   *
   * Indices may be a Uint16Array (D3DFMT_INDEX16 — every original call site)
   * or a Uint32Array. The GL index type is chosen from the ARRAY CLASS, not
   * from `indexFormat`, so a remaster tessellator that exceeds the 65 536
   * vertex limit of D3DFMT_INDEX16 can simply hand over a Uint32Array with no
   * other change (D3D8_API.md §9.5).
   */
  DrawIndexedPrimitiveUP(primType, minVertexIndex, numVertices, primitiveCount,
                         pIndices, indexFormat, pVerts, stride) {
    if (primitiveCount <= 0 || numVertices <= 0) return 0;
    if (!stride) throw new Error('minid3d8: DrawIndexedPrimitiveUP needs an explicit ' +
      'stride (the original always passes 44).');
    const gl = this.gl;
    const indexCount = verticesForPrimitives(primType, primitiveCount);
    // The vertex pointer addresses vertex 0; MinVertexIndex only describes the
    // range the indices touch, so the upload must cover it.
    this._setupVertices(pVerts, stride, ((minVertexIndex | 0) + numVertices) * stride);
    const glType = this._setupIndices(pIndices, indexCount, indexFormat);
    this._applyDrawState();
    gl.drawElements(this._glPrim(primType), indexCount, glType, 0);
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
      default: throw new Error('minid3d8: bad primitive type ' + t);
    }
  }

  // -------------------------------------------------------------------------
  // Geometry upload strategy — the single most important performance decision
  // in the shim, and an unintuitive one.
  //
  // A *UP draw hands the driver a fresh user pointer each time. The obvious
  // WebGL translation is one buffer plus `bufferSubData` per draw. That is the
  // WORST option on ANGLE: a partial update of a buffer the GPU may still be
  // reading forces a synchronising/copying path, per call.
  //
  // Measured on the sibling project (2000 draws, ANGLE/Metal, gl.finish() on
  // both sides of the clock, best of 3):
  //
  //     bufferSubData @0, exact-size buffer ....... 160.6 us/call
  //     bufferSubData at a rising offset in 1 MB .. 122.8 us/call
  //     bufferData(capacity) once/frame + subData . 249.3 us/call
  //     bufferData(data) every draw  <-- we do this   7.8 us/call
  //     no upload at all (floor) .................... 1.6 us/call
  //
  // So: bufferData with the draw's data, every draw. The classic "orphaning"
  // idiom — handing the driver a whole new data store lets it hand back fresh
  // storage instead of blocking. The streaming-arena pattern that intuition
  // and the usual desktop-GL advice suggest is 15x SLOWER here. On Lost Vegas
  // this one issue was the difference between 320 ms and 8 ms per frame.
  // Re-measure before ever changing this.
  // -------------------------------------------------------------------------

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

  _setupVertices(pVerts, stride, byteLen) {
    const gl = this.gl;
    if (!(pVerts instanceof ArrayBuffer) && !ArrayBuffer.isView(pVerts)) {
      throw new Error('minid3d8: vertex data must be a TypedArray or ArrayBuffer');
    }
    gl.bufferData(gl.ARRAY_BUFFER, this._byteView(pVerts, byteLen), gl.STREAM_DRAW);
    if (this._boundStride !== stride) {
      // FVF 0x252 offsets: pos 0, normal 12, diffuse 24, uv0 28, uv1 36.
      // Only the stride is variable (a remaster may fatten the vertex).
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 12);
      // D3DCOLOR: 4 normalised unsigned bytes in memory order B,G,R,A —
      // unswizzled in the vertex shader (impedance note 4).
      gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, stride, 24);
      gl.vertexAttribPointer(3, 2, gl.FLOAT, false, stride, 28);
      gl.vertexAttribPointer(4, 2, gl.FLOAT, false, stride, 36);
      this._boundStride = stride;
    }
  }

  _setupIndices(pIdx, nIdx, indexFormat) {
    const gl = this.gl;
    let idx, type;
    if (pIdx instanceof Uint32Array) {
      idx = pIdx.length > nIdx ? pIdx.subarray(0, nIdx) : pIdx;
      type = gl.UNSIGNED_INT;
      if (indexFormat === D3DFMT_INDEX16 && !this._warnedIndex32) {
        this._warnedIndex32 = true;
        console.warn('minid3d8: a Uint32Array was passed with IndexDataFormat = ' +
          'D3DFMT_INDEX16. The array class wins (32-bit indices), which is the ' +
          'documented remaster escape hatch — but the original is 16-bit ' +
          'everywhere, so on ?quality=original this means something is off.');
      }
    } else if (pIdx instanceof Uint16Array) {
      idx = pIdx.length > nIdx ? pIdx.subarray(0, nIdx) : pIdx;
      type = gl.UNSIGNED_SHORT;
    } else if (ArrayBuffer.isView(pIdx) || pIdx instanceof ArrayBuffer) {
      const buf = pIdx instanceof ArrayBuffer ? pIdx : pIdx.buffer;
      const off = pIdx instanceof ArrayBuffer ? 0 : pIdx.byteOffset;
      idx = new Uint16Array(buf, off, nIdx);
      type = gl.UNSIGNED_SHORT;
    } else {
      idx = new Uint16Array(pIdx);       // plain Array fallback
      type = gl.UNSIGNED_SHORT;
    }
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STREAM_DRAW);
    return type;
  }

  _applyDrawState() {
    this._syncMatrices();
    this._syncStages();
    if (this._texRouteDirty) this._uploadTexRouting();
    if (this.rs[D3DRS_LIGHTING]) this._syncLights();
    this._bindTextures();
  }

  // =========================================================================
  // The demo's own state helpers — D3D8_API.md §4.2 / §9.3.
  // Ported as named methods so effect code transcribes 1:1.
  //
  // !!! The value mappings are NOT the same as Lost Vegas's dispatchState.
  // setCullMode in particular is reversed.
  // =========================================================================

  /** FUN_004018ec: 0 -> NONE, 1 -> CW, 2 -> CCW. (Reversed vs. Lost Vegas.) */
  setCullMode(n) {
    const c = n === 1 ? D3DCULL_CW : (n === 2 ? D3DCULL_CCW : D3DCULL_NONE);
    this.SetRenderState(D3DRS_CULLMODE, c);
  }

  /**
   * FUN_004019e6: 0 -> opaque, 1 -> additive, 2 -> alpha blend.
   * Note it also drives ZWRITEENABLE — that is what keeps transparent
   * geometry from punching the depth buffer.
   */
  setBlendMode(n) {
    if (n === 1) {
      this.SetRenderState(D3DRS_ALPHABLENDENABLE, 1);
      this.SetRenderState(D3DRS_SRCBLEND, D3DBLEND_SRCALPHA);
      this.SetRenderState(D3DRS_DESTBLEND, D3DBLEND_ONE);
      this.SetRenderState(D3DRS_ZWRITEENABLE, 0);
    } else if (n === 2) {
      this.SetRenderState(D3DRS_ALPHABLENDENABLE, 1);
      this.SetRenderState(D3DRS_SRCBLEND, D3DBLEND_SRCALPHA);
      this.SetRenderState(D3DRS_DESTBLEND, D3DBLEND_INVSRCALPHA);
      this.SetRenderState(D3DRS_ZWRITEENABLE, 0);
    } else {
      this.SetRenderState(D3DRS_ALPHABLENDENABLE, 0);
      this.SetRenderState(D3DRS_ZWRITEENABLE, 1);
    }
  }

  /** FUN_004019a0: stage-1 COLOROP and ALPHAOP. 0 -> DISABLE, 1 -> ADD, 2 -> MODULATE. */
  setStage1Op(n) {
    const op = n === 1 ? D3DTOP_ADD : (n === 2 ? D3DTOP_MODULATE : D3DTOP_DISABLE);
    this.SetTextureStageState(1, D3DTSS_COLOROP, op);
    this.SetTextureStageState(1, D3DTSS_ALPHAOP, op);
  }

  /** FUN_0040191b(stage, bWrap): truthy -> WRAP, 0 -> CLAMP, on both axes. */
  setAddressMode(stage, bWrap) {
    const a = bWrap ? D3DTADDRESS_WRAP : D3DTADDRESS_CLAMP;
    this.SetTextureStageState(stage, D3DTSS_ADDRESSU, a);
    this.SetTextureStageState(stage, D3DTSS_ADDRESSV, a);
  }

  /** FUN_00401b45(bEnable). ALPHAREF comes from `alphaRefDefault` (DAT_00474794). */
  setAlphaTest(bEnable) {
    if (bEnable) {
      this.SetRenderState(D3DRS_ALPHATESTENABLE, 1);
      this.SetRenderState(D3DRS_ALPHAFUNC, D3DCMP_GREATER);
      this.SetRenderState(D3DRS_ALPHAREF, this.alphaRefDefault);
    } else {
      this.SetRenderState(D3DRS_ALPHATESTENABLE, 0);
      this.SetRenderState(D3DRS_ALPHAFUNC, D3DCMP_ALWAYS);
      this.SetRenderState(D3DRS_ALPHAREF, 0);
    }
  }

  /**
   * FUN_00401abf(mode, color, start, end) — LINEAR VERTEX fog.
   * FOGTABLEMODE is explicitly NONE; RANGEFOGENABLE goes on whenever the card
   * reported D3DPRASTERCAPS_FOGRANGE, which the shim assumes (radial distance).
   */
  setFog(mode, color, start, end) {
    this.fogState = {
      mode,
      color: color === undefined ? this.fogState.color : color,
      start: start === undefined ? this.fogState.start : start,
      end: end === undefined ? this.fogState.end : end,
    };
    if (!mode) { this.SetRenderState(D3DRS_FOGENABLE, 0); return; }
    this.SetRenderState(D3DRS_FOGENABLE, 1);
    this.SetRenderState(D3DRS_FOGCOLOR, this.fogState.color);
    this.SetRenderState(D3DRS_FOGTABLEMODE, D3DFOG_NONE);
    this.SetRenderState(D3DRS_FOGVERTEXMODE, D3DFOG_LINEAR);
    this.SetRenderState(D3DRS_FOGSTART, this.fogState.start);
    this.SetRenderState(D3DRS_FOGEND, this.fogState.end);
    if (this.rangeFogSupported) this.SetRenderState(D3DRS_RANGEFOGENABLE, 1);
  }


  /** The GPU's real texture-size limit — the honest cap on the render scale. */
  get maxTextureSize() {
    return this._maxTex ?? (this._maxTex = this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE));
  }
  /** FUN_00401b86(bLighting, ambient) -> the PREVIOUS D3DRS_AMBIENT. */
  setLighting(bLighting, ambient) {
    const old = this.rs[D3DRS_AMBIENT];
    this.lightingFlag = bLighting ? 1 : 0;
    this.SetRenderState(D3DRS_LIGHTING, bLighting ? 1 : 0);
    this.SetRenderState(D3DRS_AMBIENT, ambient >>> 0);
    return old;
  }
  /** FUN_00401bca — the shadowed lighting flag (DAT_004747b0). */
  getLightingFlag() { return this.lightingFlag; }

  /**
   * FUN_00401a3f(stage, mode). 0 -> plain texcoord set `stage`;
   * 1 -> camera-space-normal sphere map with the +-0.5 matrix.
   */
  setTexTransform(stage, mode) {
    if (mode) {
      this.SetTextureStageState(stage, D3DTSS_TEXTURETRANSFORMFLAGS, D3DTTFF_COUNT2);
      this.SetTextureStageState(stage, D3DTSS_TEXCOORDINDEX, D3DTSS_TCI_CAMERASPACENORMAL);
      this.SetTransform(stage === 0 ? D3DTS_TEXTURE0 : D3DTS_TEXTURE1, sphereMapMatrix(0.5));
    } else {
      this.SetTextureStageState(stage, D3DTSS_TEXTURETRANSFORMFLAGS, D3DTTFF_DISABLE);
      this.SetTextureStageState(stage, D3DTSS_TEXCOORDINDEX, stage);
    }
  }

  /** FUN_00401bd0 — the true-2D setup: VIEW, PROJECTION and WORLD all identity.
   *  2D geometry is then emitted directly in NDC, +y UP. */
  reset2D() {
    const I = new D3DMatrix();
    this.SetTransform(D3DTS_VIEW, I);
    this.SetTransform(D3DTS_PROJECTION, I);
    this.SetTransform(D3DTS_WORLD, I);
  }

  /**
   * FUN_0040184c — the per-layer state baseline (§8). Called before every
   * object draw; every effect starts from exactly this.
   * PROJECTION is deliberately NOT reset (the camera's survives across layers).
   */
  resetLayerState() {
    this.clearColor = 0x00000000;
    this.alphaRefDefault = 0x80;
    this.setAlphaTest(0);
    this.setCullMode(0);
    this.setBlendMode(0);
    this.setStage1Op(0);
    for (let i = 0; i < 2; i++) {
      this.setAddressMode(i, 1);
      this.SetTexture(i, null);
      this.setTexTransform(i, 0);
    }
    this.setFog(0, 0xffffffff, 0, 1.0);
    this.setLighting(0, 0xffffffff);
    const I = new D3DMatrix();
    this.SetTransform(D3DTS_VIEW, I);
    this.SetTransform(D3DTS_WORLD, I);
    this.SetRenderState(D3DRS_ZFUNC, D3DCMP_LESSEQUAL);
  }

  /**
   * FUN_00401d12 — the material applier. A faithful decoder of the 16-bit flag
   * word of §5.6; every effect in the demo routes through it.
   *
   * @param {object} mat { texture0, texture1, flags, alphaRef }
   *        (the original's +0x04, +0x08, +0x0C, +0x14). Saved state is stashed
   *        back onto the object, mirroring +0x0E / +0x10 / +0x18.
   *
   * ORDERING NOTE (an inference, not something the RE pinned down): §5.6 lists
   * the flags as a table, not as code order. Blend mode is applied BEFORE the
   * 0x0080 depth override, because setBlendMode owns ZWRITEENABLE and that is
   * what stops transparent geometry writing depth; 0x0080's "else" branch
   * therefore only restores ZFUNC, leaving ZWRITEENABLE to the blend mode.
   * Any other order makes at least one documented flag combination incoherent.
   * See MINID3D8_API.md "Uncertainties".
   */
  applyMaterial(mat) {
    const f = (mat.flags | 0) & 0xffff;
    const alphaRef = mat.alphaRef === undefined ? this.alphaRefDefault : (mat.alphaRef & 255);

    // 0x0010 — cull
    this.setCullMode((f & 0x0010) ? 0 : 2);   // NONE, else CCW

    // 0x0001 / 0x0040 — blend mode (owns ZWRITEENABLE)
    if (f & 0x0001) this.setBlendMode(1);
    else if (f & 0x0040) this.setBlendMode(2);
    else this.setBlendMode(0);

    // 0x0080 — depth override
    if (f & 0x0080) {
      this.SetRenderState(D3DRS_ZWRITEENABLE, 0);
      this.SetRenderState(D3DRS_ZFUNC, D3DCMP_ALWAYS);
    } else {
      this.SetRenderState(D3DRS_ZFUNC, D3DCMP_LESSEQUAL);
    }

    // 0x4000 — blended but still writes Z
    if (f & 0x4000) {
      this.setBlendMode(2);
      this.SetRenderState(D3DRS_ZWRITEENABLE, 1);
      this.SetRenderState(D3DRS_ZFUNC, D3DCMP_LESSEQUAL);
    }

    // 0x0100 — alpha test + forced alpha blending
    if (f & 0x0100) {
      this.SetRenderState(D3DRS_ALPHATESTENABLE, 1);
      this.SetRenderState(D3DRS_ALPHAFUNC, D3DCMP_GREATER);
      this.SetRenderState(D3DRS_ALPHAREF, alphaRef);
      this.SetRenderState(D3DRS_ALPHABLENDENABLE, 1);
      this.SetRenderState(D3DRS_SRCBLEND, D3DBLEND_SRCALPHA);
      this.SetRenderState(D3DRS_DESTBLEND, (f & 1) ? D3DBLEND_ONE : D3DBLEND_INVSRCALPHA);
    }

    // 0x2000 — the erosion / dissolve look
    if (f & 0x2000) {
      this.SetRenderState(D3DRS_ALPHATESTENABLE, 1);
      this.SetRenderState(D3DRS_ALPHAFUNC, D3DCMP_GREATER);
      this.SetRenderState(D3DRS_ALPHAREF, 3);
      this.SetTextureStageState(0, D3DTSS_ALPHAOP, D3DTOP_SUBTRACT);
    }

    // 0x0004 / 0x0008 — stage-1 op (MODULATE wins)
    if (f & 0x0008) this.setStage1Op(2);
    else if (f & 0x0004) this.setStage1Op(1);
    else this.setStage1Op(0);

    // 0x0020 — sphere map on the stage that has a texture
    if (f & 0x0020) this.setTexTransform(mat.texture1 ? 1 : 0, 1);

    // 0x0002 — replace the stage-1 sphere-map matrix with the +-2.0 (4x zoom)
    // one. Applied unconditionally AFTER 0x0020's +-0.5 matrix. Read as
    // intentional (a zoomed environment map on the second layer), but it could
    // equally be a bug in the original they kept — D3D8_API.md §10 item 7.
    if (f & 0x0002) {
      this.SetTextureStageState(1, D3DTSS_TEXTURETRANSFORMFLAGS, D3DTTFF_COUNT2);
      this.SetTextureStageState(1, D3DTSS_TEXCOORDINDEX, D3DTSS_TCI_CAMERASPACENORMAL);
      this.SetTransform(D3DTS_TEXTURE1, sphereMapMatrix(2.0));
    }

    // 0x0200 / 0x0400 — stage-0 addressing (CLAMP wins), and OTHERWISE WRAP.
    //
    // ⚠ THE `else` IS LOAD-BEARING AND WAS MISSING. Without it the addressing
    // mode is STICKY: once any material with 0x0200 had drawn, stage 0 stayed
    // CLAMPed for every later material that names no mode of its own — a state
    // leak from one draw into the next.
    //
    // The original has all three branches (ndisasm, `FUN_00401d12`):
    //   00401EB2  test ah,0x2   ; 0x0200 -> push ebx(0)  -> setAddressMode(0, CLAMP)
    //   00401EBA  test ah,0x4   ; 0x0400 -> ADDRESSU/V = MIRROR, direct
    //   00401ED5  push esi(1)   ; ELSE   -> push ebx(0)
    //   00401ED7  call 0x40191b ;        -> setAddressMode(stage 0, bWrap = 1)
    //
    // It bites the cloud noise quads hardest: their material is 0x1811, which
    // names no addressing mode, and `FUN_0040f27e` scrolls their UVs across
    // 0..s with s in 1..5 — so under a leaked CLAMP the noise texture's edge
    // column is smeared across most of the quad instead of tiling.
    if (f & 0x0200) {
      this.SetTextureStageState(0, D3DTSS_ADDRESSU, D3DTADDRESS_CLAMP);
      this.SetTextureStageState(0, D3DTSS_ADDRESSV, D3DTADDRESS_CLAMP);
    } else if (f & 0x0400) {
      this.SetTextureStageState(0, D3DTSS_ADDRESSU, D3DTADDRESS_MIRROR);
      this.SetTextureStageState(0, D3DTSS_ADDRESSV, D3DTADDRESS_MIRROR);
    } else {
      this.SetTextureStageState(0, D3DTSS_ADDRESSU, D3DTADDRESS_WRAP);
      this.SetTextureStageState(0, D3DTSS_ADDRESSV, D3DTADDRESS_WRAP);
    }

    // 0x0800 — fog off for this draw
    if (f & 0x0800) {
      mat._savedFog = { ...this.fogState };
      this.setFog(0);
    }

    // 0x1000 — lighting off for this draw
    if (f & 0x1000) {
      mat._savedLighting = this.lightingFlag;
      mat._savedAmbient = this.setLighting(0, 0xffffffff);
    }

    // 0x8000 — the global alpha fade through TFACTOR
    if (f & 0x8000) {
      this.SetRenderState(D3DRS_TEXTUREFACTOR, ((alphaRef << 24) | 0x00ffffff) >>> 0);
      this.SetTextureStageState(1, D3DTSS_ALPHAARG1, D3DTA_TFACTOR);
      this.SetTextureStageState(1, D3DTSS_ALPHAOP, D3DTOP_SELECTARG1);
    }

    this.SetTexture(0, mat.texture0 || null);
    this.SetTexture(1, mat.texture1 || null);
    return 0;
  }

  /**
   * Select the normal transform.  `'inverse'` is D3D-correct (see the shader);
   * `'world'` reproduces this shim's original behaviour.  It is a switch rather
   * than a straight fix because the correct transform only helps when
   * FUN_0040e923's shadow bake is also present — alone, each is a regression.
   * See re/scenes/REVIEW_FIXES.md 2f/2g.
   */
  setNormalTransform(mode) {
    if (mode !== 'inverse' && mode !== 'world') throw new Error(`minid3d8: bad normal mode ${mode}`);
    this._normalMode = mode;
    this._matDirty = true;
  }

  /** FUN_00401f8b — the matching unapply. */
  unapplyMaterial(mat) {
    const f = (mat.flags | 0) & 0xffff;
    this.SetTextureStageState(1, D3DTSS_ALPHAARG1, D3DTA_TEXTURE);
    this.SetTextureStageState(1, D3DTSS_ALPHAOP, D3DTOP_MODULATE);
    // Not in the documented unapply, but 0x2000 leaves stage 0's ALPHAOP on
    // SUBTRACT and nothing else ever restores it (resetLayerState does not
    // touch stage-0 ops), which would leak the dissolve look into the next
    // draw. Restored here; see MINID3D8_API.md "Uncertainties".
    if (f & 0x2000) this.SetTextureStageState(0, D3DTSS_ALPHAOP, D3DTOP_MODULATE);
    if (f & 0x1000) {
      this.setLighting(mat._savedLighting ? 1 : 0,
        mat._savedAmbient === undefined ? 0xffffffff : mat._savedAmbient);
    }
    if (f & 0x0800 && mat._savedFog) {
      const s = mat._savedFog;
      this.setFog(s.mode, s.color, s.start, s.end);
    }
    this.setAlphaTest(0);
    this.setTexTransform(0, 0);
    this.setTexTransform(1, 0);
    return 0;
  }

  // =========================================================================
  // Misc
  // =========================================================================

  getError() { return this.gl.getError(); }
  /** Throws if the GL error flag is set — call from tests, not hot loops. */
  checkError(label) {
    const e = this.gl.getError();
    if (e !== 0) throw new Error(`minid3d8: GL error 0x${e.toString(16)} at ${label}`);
  }

  /**
   * FUN_00402907 — the lens flare's software occlusion query. The original
   * CopyRects a 4x4 block out of the backbuffer into a sysmem surface and
   * inspects the 16 pixels for the magic clear colour.
   *
   * @param {number} x  D3D screen coords (y = 0 at the TOP)
   * @param {number} y
   * @param {number} w  4 in the original; parameterised for the remaster,
   *                    where 4x4 pixels cover a smaller solid angle
   * @param {number} h
   * @returns {Uint32Array} w*h packed 0xAARRGGBB, row 0 = the TOP row
   *
   * !!! THIS IS A SYNCHRONOUS GPU->CPU STALL. gl.readPixels flushes the
   * pipeline and blocks until the GPU catches up, and it will be the single
   * most expensive call in the shim. That is faithful — a lock-and-read of the
   * back buffer was expensive in 2001 too — and it is only 4x4 pixels once per
   * flare, so it is affordable. Do not use it for anything else.
   */
  readbackRect(x, y, w = 4, h = 4) {
    const gl = this.gl;
    const s = this.currentTarget ? 1 : (this.renderScale || 1);
    const gx = Math.round(x * s), gw = Math.round(w * s), gh = Math.round(h * s);
    // GL window coords have y = 0 at the BOTTOM.
    const gy = this._targetHeight - Math.round((y + h) * s);
    const px = new Uint8Array(gw * gh * 4);
    gl.readPixels(gx, gy, gw, gh, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const out = new Uint32Array(w * h);
    // Sample one texel per logical pixel (renderScale > 1 supersamples) and
    // flip back to D3D's top-down row order.
    for (let ry = 0; ry < h; ry++) {
      const sy = gh - 1 - Math.min(gh - 1, Math.round(ry * s));
      for (let rx = 0; rx < w; rx++) {
        const sx = Math.min(gw - 1, Math.round(rx * s));
        const i = (sy * gw + sx) * 4;
        out[ry * w + rx] =
          (((px[i + 3] << 24) | (px[i] << 16) | (px[i + 1] << 8) | px[i + 2]) >>> 0);
      }
    }
    return out;
  }

  /** Read back an RGBA pixel (GL window coords have y=0 at the BOTTOM). */
  readPixelGL(x, y) {
    const px = new Uint8Array(4);
    this.gl.readPixels(x, y, 1, 1, this.gl.RGBA, this.gl.UNSIGNED_BYTE, px);
    return px;
  }
  /** Read back an RGBA pixel in D3D screen coords (y=0 at the TOP). */
  readPixel(x, y) { return this.readPixelGL(x, this._targetHeight - 1 - y); }
}

/** Coerce a pixel buffer to ARGB8888 dwords for the box filter. */
function _asARGB(pixels, texelCount) {
  if (pixels instanceof Uint32Array) return pixels;
  if (!pixels) throw new Error('minid3d8: a mip chain needs pixel data');
  const b = pixels instanceof Uint8Array ? pixels : new Uint8Array(pixels.buffer || pixels);
  const out = new Uint32Array(texelCount);
  for (let i = 0; i < texelCount; i++) {
    out[i] = (((b[i * 4 + 3] << 24) | (b[i * 4] << 16) |
      (b[i * 4 + 1] << 8) | b[i * 4 + 2]) >>> 0);
  }
  return out;
}

export default MiniD3D8;
