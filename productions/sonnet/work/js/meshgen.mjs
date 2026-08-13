// meshgen.mjs — JS port of the "Sonnet" (threestate, Assembly 2001 64k intro)
// mesh generator: the mesh container, the parametric primitive library, and the
// (load-bearing) normal generator.
//
// Reverse-engineered from work/re/out/sonnet.c + ndisasm of
// unpacked/sonnet_img.bin (VA 0x401000 = offset 0).
// See re/gen/MESHGEN_notes.md (spec) and re/gen/MESHGEN_PORT.md (what this port
// confirmed / corrected, and per-function confidence).
//
// ---------------------------------------------------------------------------
// VERTEX LAYOUT — FVF 0x252, stride 0x2c = 44 bytes = 11 floats
//   0x00 pos.x  pos.y  pos.z          (slots 0,1,2)
//   0x0c nrm.x  nrm.y  nrm.z          (slots 3,4,5)
//   0x18 diffuse D3DCOLOR ARGB        (slot 6, read through a Uint32 view)
//   0x1c uv0.u  uv0.v                 (slots 7,8)
//   0x24 uv1.u  uv1.v                 (slots 9,10)
// Confirmed at VA 0x4014f2 (SetVertexShader 0x252) and VA 0x404ac2
// (DrawIndexedPrimitiveUP, stride 0x2c, D3DFMT_INDEX16, D3DPT_TRIANGLELIST).
// ---------------------------------------------------------------------------

const F = Math.fround;

export const VERTEX_FLOATS = 11;
export const VERTEX_STRIDE = 44;

// Slot indices inside one vertex.
export const V_PX = 0, V_PY = 1, V_PZ = 2;
export const V_NX = 3, V_NY = 4, V_NZ = 5;
export const V_COL = 6;
export const V_U0 = 7, V_V0 = 8;
export const V_U1 = 9, V_V1 = 10;

// ---------------------------------------------------------------------------
// Constants read out of the image, never from the decompile.
// ---------------------------------------------------------------------------
export const K = {
  ONE_F: 1.0,                     // [0x4170c4] normal-accumulator increment
  NEG_ONE_F: -1.0,                // [0x4170cc] normal averaging scale  <-- key
  HALF: 0.5,                      // [0x4170d4]
  TWO: 2.0,                       // [0x418200]
  FOUR: 4.0,                      // [0x418230]
  F255: 255.0,                    // [0x418268]
  F65536: 65536.0,                // [0x418270]
  INV255_F: 0.003921568859368563, // [0x418298]  float32 1/255
  INV255_D: 0.00392156862745098,  // [0x418fa0]  double  1/255
  INV65536: 1.52587890625e-05,    // [0x418f94]
  F256: 256.0,                    // [0x4182bc] terrain Y extent
  F128: 128.0,                    // [0x418e30] terrain XZ half-extent
  HERMITE_A: -2.0,                // [0x4182c8]
  HERMITE_B: 3.0,                 // [0x4182cc]
  DEG2RAD: 0.017453292519943295,  // double [0x4182e0]
  PI: 3.141592653589793,          // double [0x418220]
  TWO_PI: 6.283185307179586,      // double [0x418f18]
  WATER_KNEE: 48.0,               // [0x418e80]
  COARSE_WATER_EXT: 300.0,        // [0x418e78]
  COARSE_WATER_UV0: 8.0,          // [0x418e7c]
  HIRES_WATER_DIM: 32.0,          // [0x418e84]
  HIRES_WATER_EXT: 600.0,         // [0x418e88]
  TERRAIN_UV1: 16.0,              // [0x418f0c]
  TREE_SEGLEN: 66.0,              // [0x418ef4]
  TREE_SPREAD: 0.6,               // [0x418f00]
  TREE_RING_U: 0.142857149,       // [0x418f20] 1/7
  TREE_TAPER4: 0.7,               // [0x418f10]
  REV_BIAS: 1.001,                // [0x418f44]
  RIBBON_U: 0.0666667,            // [0x418fcc]
  K_0_3: 0.3,                     // [0x418f54]
  HALF_PI: 1.5707964,             // [0x418f58]
  K_1_27: 1.27,                   // [0x418f40]
  K_0_125: 0.125,                 // [0x418f64]
  K_0_0625: 0.0625,               // [0x418f68]
  K_THIRD: 0.333333343,           // [0x418f78]
};

// Quad index templates (byte arrays at these VAs, added to a base vertex index
// by FUN_00409ca6). Verified byte-for-byte from the image.
export const QUAD_RIBBON = [0, 1, 2, 3, 2, 1];   // [0x418ed4]
export const QUAD_CW     = [0, 1, 2, 2, 3, 0];   // [0x418edc]
export const QUAD_CCW    = [0, 3, 2, 2, 1, 0];   // [0x418ee4]  leaf back face
export const QUAD_ALT    = [0, 2, 3, 3, 1, 0];   // [0x418eec]

// ---------------------------------------------------------------------------
// The demo's ONE global RNG stream — see js/rng.mjs.  meshgen used to keep a
// private copy of the LCG ("same algorithm, separate stream"); the original has
// a single global seed shared with the texture VM, and that sharing is
// load-bearing.  Re-exported so existing callers (MG.srand / MG.rand / ...)
// are unchanged.
// ---------------------------------------------------------------------------
import { srand, rand, randState } from './rng.mjs';
export { srand, rand, randState };

// ---------------------------------------------------------------------------
// Mesh container — FUN_004042f6, object size 0xcc, vtable PTR_FUN_00418290.
//
//   +0xac vertexCount   +0xb0 vertices (stride 0x2c)
//   +0xb4 triCount      +0xb8 indices (u16 x3)
//   +0xbc float[vcount] incident-face counter (normal scratch)
//   +0xc0 vec3[tricount] per-face normals (NEGATED, see computeNormals)
//   +0xc8 flags: bit0 = recompute normals every frame, bit1 = hidden
//
// Allocation goes through FUN_004042e0 -> FUN_004040e5, which is
//   VirtualAlloc(NULL, size, MEM_COMMIT=0x1000, PAGE_READWRITE=4)
// -> memory is ZERO FILLED.  That resolves MESHGEN_notes §10's first open
// question: the normals of generators that never call the normal generator are
// exactly (0,0,0), not garbage.  FUN_00404380 then sets only the diffuse dword
// of every vertex to 0xFFFFFFFF.
// ---------------------------------------------------------------------------
export class Mesh {
  constructor(vertexCount = 0, triCount = 0, flags = 0) {
    this.name = '';
    this.flags = flags | 0;
    // Transform state (mesh +0x88 / +0x94); world = Scale * (Rot|Trans).
    this.pos = [0, 0, 0];
    this.scale = [1, 1, 1];
    this.rot = null;            // optional 3x3 row-major, null = identity
    this.material = null;
    this.verts = null;
    this.vu32 = null;
    this.indices = null;
    this.faceNormals = null;    // Float32Array, 3 per triangle
    this.vertexCount = 0;
    this.triCount = 0;
    this.allocVerts(vertexCount);
    this.allocIndices(triCount);
  }

  get hidden() { return (this.flags & 2) !== 0; }
  set hidden(v) { this.flags = v ? (this.flags | 2) : (this.flags & ~2); }
  get dynamicNormals() { return (this.flags & 1) !== 0; }

  // FUN_00404380
  allocVerts(n) {
    n = n | 0;
    this.vertexCount = n;
    const buf = new ArrayBuffer(n * VERTEX_STRIDE);
    this.verts = new Float32Array(buf);
    this.vu32 = new Uint32Array(buf);
    this.ncount = new Float32Array(n);      // mesh+0xbc
    for (let i = 0; i < n; i++) this.vu32[i * VERTEX_FLOATS + V_COL] = 0xffffffff;
    return this;
  }

  // FUN_004043d2.  The original is always D3DFMT_INDEX16 (0x65); `wide` exists
  // only for the remaster's tessellator, which can exceed 65535 vertices.
  allocIndices(t, wide = this.wideIndices || false) {
    t = t | 0;
    this.triCount = t;
    this.wideIndices = !!wide;
    this.indices = wide ? new Uint32Array(t * 3) : new Uint16Array(t * 3);
    this.faceNormals = new Float32Array(t * 3);
    return this;
  }

  /** D3DFMT_INDEX16 = 0x65, D3DFMT_INDEX32 = 0x66. */
  get indexFormat() { return this.wideIndices ? 0x66 : 0x65; }

  // FUN_0040449f — "shrink to fit" after an over-allocating generator.
  shrink(vertexCount, triCount) {
    const nv = vertexCount | 0, nt = triCount | 0;
    const buf = new ArrayBuffer(nv * VERTEX_STRIDE);
    const nvf = new Float32Array(buf);
    nvf.set(this.verts.subarray(0, nv * VERTEX_FLOATS));
    this.verts = nvf;
    this.vu32 = new Uint32Array(buf);
    this.ncount = new Float32Array(nv);
    const ni = this.wideIndices ? new Uint32Array(nt * 3) : new Uint16Array(nt * 3);
    ni.set(this.indices.subarray(0, nt * 3));
    this.indices = ni;
    this.faceNormals = new Float32Array(nt * 3);
    this.vertexCount = nv;
    this.triCount = nt;
    return this;
  }

  // -- vertex accessors ---------------------------------------------------
  setPos(i, x, y, z) {
    const o = i * VERTEX_FLOATS;
    this.verts[o] = x; this.verts[o + 1] = y; this.verts[o + 2] = z;
    return this;
  }
  getPos(i, out = [0, 0, 0]) {
    const o = i * VERTEX_FLOATS;
    out[0] = this.verts[o]; out[1] = this.verts[o + 1]; out[2] = this.verts[o + 2];
    return out;
  }
  setNormal(i, x, y, z) {
    const o = i * VERTEX_FLOATS + V_NX;
    this.verts[o] = x; this.verts[o + 1] = y; this.verts[o + 2] = z;
    return this;
  }
  getNormal(i, out = [0, 0, 0]) {
    const o = i * VERTEX_FLOATS + V_NX;
    out[0] = this.verts[o]; out[1] = this.verts[o + 1]; out[2] = this.verts[o + 2];
    return out;
  }
  setColor(i, argb) { this.vu32[i * VERTEX_FLOATS + V_COL] = argb >>> 0; return this; }
  getColor(i) { return this.vu32[i * VERTEX_FLOATS + V_COL] >>> 0; }
  setUV0(i, u, v) {
    const o = i * VERTEX_FLOATS + V_U0;
    this.verts[o] = u; this.verts[o + 1] = v; return this;
  }
  setUV1(i, u, v) {
    const o = i * VERTEX_FLOATS + V_U1;
    this.verts[o] = u; this.verts[o + 1] = v; return this;
  }
  setTri(t, a, b, c) {
    const o = t * 3;
    this.indices[o] = a; this.indices[o + 1] = b; this.indices[o + 2] = c;
    return this;
  }

  // -----------------------------------------------------------------------
  // FUN_004045f1 — THE normal generator.  Every mesh that has normals at all
  // goes through this and nothing else.  Disassembled at 0x4045f1-0x404874 and
  // transcribed instruction by instruction; see MESHGEN_PORT.md.
  //
  //   pass 1: n[v] = 0 ; count[v] = 0
  //   pass 2: for each tri
  //             e1 = V[i1]-V[i0] ; e2 = V[i2]-V[i0]
  //             c  = -cross(e1,e2)                 (fchs on each component)
  //             fn = c * (1.0 / |c|)               (fdivr qword [0x418248])
  //             faceNormals[t] = fn                (stored NEGATED)
  //             for k in (i0,i1,i2): n[k] += fn ; count[k] += 1.0
  //   pass 3: s = -1.0 / count[v] ; n[v] *= s      ([0x4170cc] == -1.0f)
  //
  // The two negations cancel, so vertex normals carry the geometric
  // +cross(e1,e2) orientation while the per-face array keeps -cross.  There is
  // NO final normalize: |n| < 1 at every crease and, with
  // D3DRS_NORMALIZENORMALS off, that shortening darkens creases.  Do not
  // "fix" this.
  //
  // No degenerate guard: |c| == 0 -> 1/0 = Infinity -> fn = NaN/Inf, which
  // poisons all three vertices.  Also: a vertex touched by zero triangles gets
  // s = -1/0 = -Infinity and 0 * -Infinity = NaN.  Both reproduced verbatim.
  // -----------------------------------------------------------------------
  computeNormals() {
    const V = this.verts, I = this.indices, C = this.ncount, FN = this.faceNormals;
    const nv = this.vertexCount, nt = this.triCount;

    for (let v = 0; v < nv; v++) {
      const o = v * VERTEX_FLOATS + V_NX;
      V[o] = 0; V[o + 1] = 0; V[o + 2] = 0;
      C[v] = 0;
    }

    for (let t = 0; t < nt; t++) {
      const i0 = I[t * 3], i1 = I[t * 3 + 1], i2 = I[t * 3 + 2];
      const a = i0 * VERTEX_FLOATS, b = i1 * VERTEX_FLOATS, c = i2 * VERTEX_FLOATS;
      // e1 = V[i1] - V[i0], e2 = V[i2] - V[i0]  (stored to float32 scratch)
      const e1x = F(V[b] - V[a]), e1y = F(V[b + 1] - V[a + 1]), e1z = F(V[b + 2] - V[a + 2]);
      const e2x = F(V[c] - V[a]), e2y = F(V[c + 1] - V[a + 1]), e2z = F(V[c + 2] - V[a + 2]);
      // NEGATED cross product, exactly as the x87 code computes it.
      let nx = F(-F(F(e2z * e1y) - F(e2y * e1z)));
      let ny = F(-F(F(e2x * e1z) - F(e2z * e1x)));
      let nz = F(-F(F(e2y * e1x) - F(e2x * e1y)));
      const len = Math.sqrt(F(F(F(nz * nz) + F(ny * ny)) + F(nx * nx)));
      const inv = 1.0 / len;                 // fdivr qword [0x418248] (double 1.0)
      nx = F(nx * inv); ny = F(ny * inv); nz = F(nz * inv);
      FN[t * 3] = nx; FN[t * 3 + 1] = ny; FN[t * 3 + 2] = nz;
      for (const k of [i0, i1, i2]) {
        const o = k * VERTEX_FLOATS + V_NX;
        V[o] = F(V[o] + nx); V[o + 1] = F(V[o + 1] + ny); V[o + 2] = F(V[o + 2] + nz);
        C[k] = F(C[k] + 1.0);
      }
    }

    for (let v = 0; v < nv; v++) {
      const s = F(-1.0 / C[v]);
      const o = v * VERTEX_FLOATS + V_NX;
      V[o] = F(V[o] * s); V[o + 1] = F(V[o + 1] * s); V[o + 2] = F(V[o + 2] * s);
    }
    return this;
  }

  // Interleaved buffer ready for minid3d8's DrawIndexedPrimitiveUP shim.
  toBuffers() {
    return {
      fvf: 0x252,
      stride: VERTEX_STRIDE,
      indexFormat: this.indexFormat,   // 0x65 = D3DFMT_INDEX16 (0x66 only after tessellation)
      vertexCount: this.vertexCount,
      primitiveCount: this.triCount,
      vertices: this.verts,
      indices: this.indices,
    };
  }
}

// ---------------------------------------------------------------------------
// FUN_00409ca6 — emit one 6-index template offset by a base vertex index.
// FUN_00409ccd(dst, base, i, ringWidth, ring) — stitch the quad between ring
// and ring+1, columns i and (i+1) % ringWidth (a WRAPPING ring stitch).
// ---------------------------------------------------------------------------
export function emitTemplate(mesh, tri, base, tmpl) {
  const o = tri * 3;
  for (let k = 0; k < 6; k++) mesh.indices[o + k] = base + tmpl[k];
  return tri + 2;
}

export function stitchRing(mesh, tri, base, i, ringWidth, ring) {
  const a = base + ring * ringWidth + i;
  const b = base + ring * ringWidth + ((i + 1) % ringWidth);
  const c = base + (ring + 1) * ringWidth + ((i + 1) % ringWidth);
  const d = base + (ring + 1) * ringWidth + i;
  mesh.setTri(tri, a, b, c);
  mesh.setTri(tri + 1, c, d, a);
  return tri + 2;
}

// ---------------------------------------------------------------------------
// FUN_00404875 — the parametric grid / plane.  THE primary primitive.
// Signature recovered by ndisasm (0x40487b-0x4048a3, `ret 0x34` = 13 dwords):
//
//   grid(mesh, W_f, flatY, H_f, extX, heightScale, extZ,
//        u0Tile, v0Tile, _, u1Tile, v1Tile, _, heightArray|null)
//
//   W = (int)W_f ; H = (int)H_f
//   verts = W*H ; tris = (2*W-2)*(H-1)
//   fv = r / H            <-- divided by H, NOT H-1
//   fu = c / W            <-- divided by W, NOT W-1
//   x  = fu*extX*2 - extX
//   y  = heightArray ? heightArray[r*W+c] * (1/255) * heightScale : flatY
//   z  = fv*extZ*2 - extZ
//   diffuse = 0xFFFFFFFF
//   uv0 = (u0Tile*fu, v0Tile*fv) ; uv1 = (u1Tile*fu, v1Tile*fv)
//   tri A = (c+b0, c+b1, c+1+b1) ; tri B = (c+1+b1, c+1+b0, c+b0)
//   then computeNormals()
//
// The /W (not /(W-1)) division is a real bug in the original: the plane never
// reaches +extX/+extZ and the last row/column of UVs never reaches 1.0.  It is
// load bearing — the baked ground texture is aligned to it.
//
// The height array is read as a 32-bit int and converted with `fild qword`
// after zero-extension, so a negative int32 becomes a large positive value.
// ---------------------------------------------------------------------------
export function buildGrid(mesh, opts) {
  const {
    W, H, flatY = 0, extX = 1, extZ = 1, heightScale = 1,
    u0Tile = 1, v0Tile = 1, u1Tile = 1, v1Tile = 1,
    heightArray = null,
  } = opts;

  mesh.allocVerts(W * H);
  // The original is always D3DFMT_INDEX16; widen only when the remaster's
  // resampled terrain exceeds what a u16 index can address.
  mesh.allocIndices((2 * W - 2) * (H - 1), W * H > 65536);

  let vi = 0;
  for (let r = 0; r < H; r++) {
    const fv = F(r / H);
    const z = F(F(F(fv * extZ) * 2.0) - extZ);
    const v0 = F(v0Tile * fv);
    const v1 = F(v1Tile * fv);
    for (let c = 0; c < W; c++) {
      const fu = F(c / W);
      const x = F(F(F(fu * extX) * 2.0) + F(-extX));
      let y;
      if (heightArray) {
        const h = heightArray[r * W + c] >>> 0;   // fild qword, zero-extended
        y = F(F(h * K.INV255_F) * heightScale);
      } else {
        y = flatY;
      }
      mesh.setPos(vi, x, y, z);
      mesh.setColor(vi, 0xffffffff);
      mesh.setUV0(vi, F(u0Tile * fu), v0);
      mesh.setUV1(vi, F(u1Tile * fu), v1);
      vi++;
    }
  }

  let t = 0;
  for (let r = 0; r < H - 1; r++) {
    const b0 = r * W, b1 = (r + 1) * W;
    for (let c = 0; c < W - 1; c++) {
      mesh.setTri(t++, c + b0, c + b1, c + 1 + b1);
      mesh.setTri(t++, c + 1 + b1, c + 1 + b0, c + b0);
    }
  }

  mesh.computeNormals();
  return mesh;
}

// ---------------------------------------------------------------------------
// TERRAIN — FUN_0040e058 @ 0x40e058, plus its samplers.
//
// Object field map (this = Landscape+0x4c):
//   +0x00 vec3 scaleVec (desc+0x40)        +0x0c vec3 extents = (128, 256, 128)
//   +0x18 int N                            +0x20 mesh*
//   +0x24 256x256 soft shadow map          +0x28 N*N int height array
//   +0x2c 256x256 upsampled heightmap      +0x44 baked ground texture scratch
//
// CORRECTION TO MESHGEN_notes §4: the vec3 passed before scaleVec is the SUN
// POSITION (desc+0x32, via the flare object's +0xb4), not a sun colour.  And
// the last two args are (param_13 = ~(flags>>24)&1, param_14 = (flags&0x100)!=0)
// — the notes had them the other way round.  `param_14 == 0` makes the soft
// shadow bake run TWICE instead of once.
// ---------------------------------------------------------------------------

export const TERRAIN_EXTENTS = [128.0, 256.0, 128.0];   // [0x418e30],[0x4182bc]

/**
 * FUN_0040e6f6 — bilinear sample of an int array, disassembled at
 * 0x40e6f6-0x40e83f.  Fixed point: the fraction comes from the low 16 bits of
 * (coord * 65536) truncated toward zero, so negative coordinates alias.
 * Out-of-range neighbours contribute 0 (they are simply not loaded) — the
 * sampler is NOT clamped, it fades to zero at the far edge.
 */
export function bilinearSample(arr, W, x, z) {
  const x16 = Math.trunc(F(x * K.F65536)) | 0;
  const z16 = Math.trunc(F(z * K.F65536)) | 0;
  const u = F((x16 & 0xffff) * K.INV65536);
  const v = F((z16 & 0xffff) * K.INV65536);
  const ix = x16 >> 16, iz = z16 >> 16;
  const h00 = arr[iz * W + ix] >>> 0;
  const h10 = (ix + 1 < W) ? (arr[iz * W + ix + 1] >>> 0) : 0;
  const h01 = (iz + 1 < W) ? (arr[(iz + 1) * W + ix] >>> 0) : 0;
  const h11 = (ix + 1 < W && iz + 1 < W) ? (arr[(iz + 1) * W + ix + 1] >>> 0) : 0;
  const iu = F(1 - u), iv = F(1 - v);
  let r = F(F(h00 * iu) * iv);
  r = F(r + F(F(h01 * iu) * v));
  r = F(r + F(F(h10 * u) * iv));
  r = F(r + F(F(h11 * v) * u));
  return r;
}

/** FUN_0040e842 — world XZ -> [0,256) heightmap coordinates, or (0,0) if outside. */
export function worldToMap(scaleVec, x, z) {
  const ex = F(TERRAIN_EXTENTS[0] * scaleVec[0]);
  const ez = F(TERRAIN_EXTENTS[2] * scaleVec[2]);
  if (-ex > x || -ez > z || x > ex || z > ez) return [0, 0];
  return [F(F(F(ex + x) / F(ex + ex)) * K.F256), F(F(F(ez + z) / F(ez + ez)) * K.F256)];
}

/**
 * Steps 1-3 of FUN_0040e058: 128x128 -> 256x256 2x bilinear upsample, then a
 * box downsample to N x N, then buildGrid.
 *
 * @param {Int32Array|Uint32Array} hmap128  the texgen heightmap, 128x128, values 0..255
 *        (FUN_00407983 masks it with & 0xff before handing it over)
 * @param {number} N grid resolution (64 or 128)
 * @param {number[]} scaleVec terrain scale (desc+0x40)
 */
export function upsampleHeightmap(hmap128) {
  const out = new Int32Array(256 * 256);
  for (let r = 0; r < 128; r++) {
    for (let c = 0; c < 128; c++) {
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const s = bilinearSample(hmap128, 128, F(c + F(dx * 0.5)), F(r + F(dy * 0.5)));
          out[(r * 2 + dy) * 256 + (c * 2 + dx)] = Math.trunc(s) | 0;
        }
      }
    }
  }
  return out;
}

export function downsampleHeightmap(map256, N) {
  const step = Math.trunc(256 / N);
  const out = new Int32Array(N * N);
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      let sum = 0, n = 0;
      for (let y = r * step; y < (r + 1) * step; y++) {
        for (let x = c * step; x < (c + 1) * step; x++) { sum += map256[y * 256 + x]; n++; }
      }
      out[r * N + c] = Math.trunc(sum / n) | 0;   // integer division
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// FUN_0040e923 @ 0x40e923 — THE TERRAIN SHADOW BAKE.
//
// Transcribed in REVIEW_FIXES.md §2b; the setup below re-derived from ndisasm
// this session (0x40e923-0x40e9dd) because it is the load-bearing part.
//
// PINNED, all of it:
//   passes          16          `mov dword [ebp-0x18],0x10` @0x40e9dd
//   RNG             EXACTLY 2 rand01() sites @0x40ea0b, 0x40ea1c
//                   => 2 * 65536 * 16 = 2,097,152 shared-stream draws per call
//   terrain+0x00..08 = terrainScale (param_10..12, also written to mesh+0x94)
//   terrain+0x0c/14  = (128.0, ., 128.0)   [0x418e30], [0x4182bc]=256.0 in +0x10
//   EMA             new = lit*0.1 + old*0.9   [0x418ea4], [0x418fa8]
//   fixed point     *65536                    [0x418270]
//   consumer        FUN_0040e8fb = bilinear(byte)/255  (qword [0x418fa0])
//
// The light is mapped into HEIGHT-MAP TEXEL space:
//   inv = 1/terrainScale ;  L = lightPos * inv          (componentwise)
//   f   = 2*half.x = 256
//   L   = ( 256*(L.x + 128)/f, 256*(L.y/256), 256*(L.z + 128)/f )
//       = ( L.x + 128,          L.y,           L.z + 128 )
// i.e. one texel horizontally == one terrainScale.x world unit, and one height
// unit vertically == one terrainScale.y world unit — the same space the 0..255
// height map already lives in.
//
// @param {Int32Array} map256 the 256x256 height map (`buildTerrain`'s map256)
// @param {number[]} scaleVec terrainScale
// @param {number[]} lightPos world-space sun position (descriptor +0x32)
// @returns {Uint8Array} 256*256 shadow bytes, 41..255 (never 0 — see the EMA)
export function buildShadowMap(map256, scaleVec, lightPos) {
  const ftol = Math.trunc;          // x87 ftol truncates toward zero
  const shadow = new Uint8Array(65536).fill(0xff);      // memset(0xff) = unshadowed
  const Lx = F(F(lightPos[0] / scaleVec[0]) + 128.0);
  const Ly = F(lightPos[1] / scaleVec[1]);
  const Lz = F(F(lightPos[2] / scaleVec[2]) + 128.0);
  for (let pass = 0; pass < 16; pass++) {
    for (let y = 0; y < 256; y++) {
      for (let x = 0; x < 256; x++) {
        // TWO rand01 draws per texel per pass, in this order — the RNG budget.
        const jx = F(F(x + rand01()) - 0.5);
        const jy = F(F(y + rand01()) - 0.5);
        const h = map256[((ftol(jy) & 255) << 8) + (ftol(jx) & 255)];
        let dx = F(Lx - jx), dy = F(Ly - h), dz = F(Lz - jy);
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (len > 0) { dx = F(dx / len); dy = F(dy / len); dz = F(dz / len); }
        if (dx !== 0 || dz !== 0) {
          // grow the step until it covers at least one texel, then halve
          while (Math.abs(dx) < 1.0 && Math.abs(dz) < 1.0) {
            dx = F(dx * 2.0); dy = F(dy * 2.0); dz = F(dz * 2.0);
          }
          dx = F(dx * 0.5); dy = F(dy * 0.5); dz = F(dz * 0.5);
        }
        let X = ftol(F(jx * 65536.0)), Y = ftol(F(h * 65536.0)), Z = ftol(F(jy * 65536.0));
        const dX = ftol(F(dx * 65536.0)), dY = ftol(F(dy * 65536.0)), dZ = ftol(F(dz * 65536.0));
        let lit = 0xff;
        for (let step = 0; step <= 0xfff; step++) {
          X += dX; Y += dY; Z += dZ;
          if (X < 0 || Z < 0 || Y < 0 || X > 0xff0000 || Z > 0xff0000 || Y > 0xff0000) break;
          if ((map256[((Z >> 16) << 8) + (X >> 16)] << 16) > Y) { lit = 0; break; }
        }
        const o = (y << 8) + x;
        shadow[o] = ftol(F(F(lit * 0.1) + F(shadow[o] * 0.9))) & 0xff;
      }
    }
  }
  return shadow;
}

/**
 * The DISCARDED first shadow bake.
 *
 * PINNED (ndisasm 0x40e31b-0x40e343): `FUN_0040e058` calls `FUN_0040e923`
 * TWICE when its `param_14` (flag bit 8, `terrainOpt8`) is CLEAR, and once when
 * it is set:
 *
 *     cmp byte [ebp+0x3c],0 ; jnz .second ; call FUN_0040e923 ; .second: call FUN_0040e923
 *
 * `memset(shadowMap, 0xff)` is INSIDE the bake, so the second call throws the
 * first one's result away — the first call's only lasting effect is that it
 * consumes another 2,097,152 draws from the shared RNG stream, which every
 * generator built afterwards depends on.
 *
 * Replaying just the draws is exactly equivalent (the ray march consumes no
 * randomness, and the two rand01 calls per texel are unconditional and in a
 * fixed order) and costs ~20 ms instead of ~200 ms.  `meshgen_test` asserts the
 * equivalence against a real double bake rather than assuming it.
 */
export function consumeShadowBakeRandoms() {
  for (let i = 0; i < 16 * 65536 * 2; i++) rand();
}

/** FUN_0040e8fb — bilinear fetch of the shadow byte, normalised to 0..1. */
export function shadowAt(shadow, tx, tz) {
  const x0 = Math.floor(tx), z0 = Math.floor(tz);
  const fx = tx - x0, fz = tz - z0;
  const c = (x, z) => shadow[((z & 255) << 8) + (x & 255)];
  const a = c(x0, z0), b = c(x0 + 1, z0), d = c(x0, z0 + 1), e = c(x0 + 1, z0 + 1);
  const top = a + (b - a) * fx, bot = d + (e - d) * fx;
  return (top + (bot - top) * fz) * 0.00392156862745098;   // qword [0x418fa0] = 1/255
}

export function buildTerrain(hmap128, N, scaleVec, opts = {}) {
  const map256 = upsampleHeightmap(hmap128);
  const heights = downsampleHeightmap(map256, N);
  const mesh = new Mesh();
  mesh.name = 'terrain';
  buildGrid(mesh, {
    W: N, H: N, extX: TERRAIN_EXTENTS[0], heightScale: TERRAIN_EXTENTS[1],
    extZ: TERRAIN_EXTENTS[2],
    u0Tile: 1, v0Tile: 1, u1Tile: K.TERRAIN_UV1, v1Tile: K.TERRAIN_UV1,
    heightArray: heights,
  });
  mesh.scale = scaleVec.slice();
  if (opts.hidden) mesh.hidden = true;
  return { mesh, heights, map256, N, scaleVec: scaleVec.slice(), extents: TERRAIN_EXTENTS.slice() };
}

/** FUN_0040e8d2 — terrain height query in world space. */
export function terrainHeight(terrain, x, z) {
  const [mx, mz] = worldToMap(terrain.scaleVec, x, z);
  const step = Math.trunc(256 / terrain.N);
  return F(bilinearSample(terrain.heights, terrain.N, F(mx / step), F(mz / step)) * terrain.scaleVec[1]);
}

// ---------------------------------------------------------------------------
// WATER PLANE — FUN_004082a9.  Built only when desc.waterLevel > 0.
//   coarse (flag bit13 clear): 4x4 grid, half-extent 300, uv0 x8,  uv1 x1
//   hi-res (flag bit13 set)  : 32x32 grid, half-extent 600, uv0 x5, uv1 x1
// Both get the terrain scaleVec as mesh +0x94.
// ---------------------------------------------------------------------------
export function buildWaterPlane(hiRes, scaleVec) {
  const mesh = new Mesh();
  mesh.name = hiRes ? 'water32' : 'water4';
  const dim = hiRes ? 32 : 4;
  const ext = hiRes ? K.HIRES_WATER_EXT : K.COARSE_WATER_EXT;
  const uv0 = hiRes ? 5.0 : K.COARSE_WATER_UV0;
  buildGrid(mesh, {
    W: dim, H: dim, flatY: 0, extX: ext, heightScale: 0, extZ: ext,
    u0Tile: uv0, v0Tile: uv0, u1Tile: 1, v1Tile: 1, heightArray: null,
  });
  mesh.scale = scaleVec.slice();
  return mesh;
}

/**
 * FUN_004082a9's two shoreline-alpha loops (VA 0x408647 and 0x408712,
 * disassembled because Ghidra drops the FPU chain).  Only run in the hi-res
 * (bit-13) branch.
 *
 *   d = sqrt(v.x*v.x + v.z*v.z) * 0.5      (FUN_00408c11 vs (0, v.y, 0))
 *   if (d > 48.0) d *= 4.0                 [0x418e80] / [0x418230]
 *   a = (int)d ; if (a > 255) a = 255
 *   terrain: if (a < 0x40) a = 0
 *            if (v.y <= waterLevel)  colour = ((-(a+1)) << 24) | 0x00FFFFFF
 *                                    i.e. alpha = 255 - a, RGB white
 *   water  : colour = (a << 24) | 0x003F3F3F
 *
 * The `if (a < 0x40) a = 0` clamp is applied ONLY on the terrain side, and the
 * `v.y <= waterLevel` test is a hard per-vertex threshold — that is what makes
 * the shoreline jagged.  Both are deliberate.
 */
export function shorelineAlpha(x, z) {
  let d = F(Math.sqrt(F(F(x * x) + F(z * z))) * K.HALF);
  if (d > K.WATER_KNEE) d = F(d * K.FOUR);
  let a = Math.trunc(d) | 0;
  if (a > 255) a = 255;
  return a;
}

export function applyShorelineColours(terrainMesh, waterMesh, waterLevel) {
  for (let i = 0; i < terrainMesh.vertexCount; i++) {
    const o = i * VERTEX_FLOATS;
    let a = shorelineAlpha(terrainMesh.verts[o], terrainMesh.verts[o + 2]);
    if (a < 0x40) a = 0;
    if (terrainMesh.verts[o + 1] <= waterLevel) {
      terrainMesh.setColor(i, ((((-(a + 1)) << 24) >>> 0) | 0x00ffffff) >>> 0);
    }
  }
  for (let i = 0; i < waterMesh.vertexCount; i++) {
    const o = i * VERTEX_FLOATS;
    const a = shorelineAlpha(waterMesh.verts[o], waterMesh.verts[o + 2]);
    waterMesh.setColor(i, (((a << 24) >>> 0) | 0x003f3f3f) >>> 0);
  }
}

// ---------------------------------------------------------------------------
// REMASTER: TESSELLATION
//
// MESHGEN_notes §9.1 says tessellation is blocked outright, because
// computeNormals() divides by the incident-triangle count and never
// re-normalises, so changing the triangle count around a vertex changes |n| and
// therefore the brightness.
//
// The way out is the direct analogue of the pinned-lattice rule used for the
// textures: compute normals on the ORIGINAL topology, then INTERPOLATE them
// onto the new vertices.  Original vertices keep their exact |n| and their
// exact position/colour/UVs; new vertices get barycentric-interpolated
// attributes.  computeNormals() is NEVER re-run on a tessellated mesh.
//
// Invariants this implementation guarantees:
//   * tess === 1 returns byte-identical vertex and index buffers (regression
//     guard; exercised by meshgen_test.mjs).
//   * the first `vertexCount` vertices of the output are the input vertices,
//     bit for bit, at the same indices.
//   * new vertices are cached by ORIGINAL VERTEX INDEX + integer barycentric
//     weight, never by position.  So a UV seam that duplicates a vertex (tree
//     rings, FUN_00409ccd's `% ringWidth` stitch) stays duplicated, and the
//     double-wound leaf quads (QUAD_CW + QUAD_CCW over the same 8 vertices)
//     keep both windings — nothing is welded or re-wound.
//   * triangle order and winding are preserved; sub-triangles of triangle t
//     appear contiguously and in the same orientation as t.
// ---------------------------------------------------------------------------

function cloneMesh(mesh) {
  const out = new Mesh();
  out.name = mesh.name;
  out.flags = mesh.flags;
  out.pos = mesh.pos.slice();
  out.scale = mesh.scale.slice();
  out.rot = mesh.rot ? mesh.rot.slice() : null;
  out.material = mesh.material;
  out.vertexCount = mesh.vertexCount;
  out.triCount = mesh.triCount;
  out.wideIndices = !!mesh.wideIndices;
  const buf = mesh.verts.buffer.slice(0);
  out.verts = new Float32Array(buf);
  out.vu32 = new Uint32Array(buf);
  out.ncount = mesh.ncount.slice();
  out.indices = mesh.indices.slice();
  out.faceNormals = mesh.faceNormals.slice();
  return out;
}

/**
 * @param {Mesh} mesh   a mesh whose normals have already been generated
 * @param {number} tess subdivision factor; 1 = identity
 * @returns {Mesh} a new mesh (the input is not modified)
 */
export function tessellate(mesh, tess = 1) {
  tess = Math.max(1, Math.trunc(tess));
  if (tess === 1) return cloneMesh(mesh);

  const srcV = mesh.verts, srcI = mesh.indices, srcC = mesh.vu32;
  const nvSrc = mesh.vertexCount, ntSrc = mesh.triCount;

  const outV = [];     // flat float array
  const outC = [];     // packed colours, one per vertex (parallel to outV)
  const outI = [];

  // Seed with the original vertices, unchanged and at their original indices.
  for (let i = 0; i < nvSrc; i++) {
    const o = i * VERTEX_FLOATS;
    for (let k = 0; k < VERTEX_FLOATS; k++) outV.push(srcV[o + k]);
    outC.push(srcC[o + V_COL] >>> 0);
  }

  const cache = new Map();

  // Barycentric integer weights (w0,w1,w2) summing to `tess` over (a,b,c).
  function vertexAt(a, b, c, w0, w1, w2) {
    if (w0 === tess) return a;
    if (w1 === tess) return b;
    if (w2 === tess) return c;
    const parts = [];
    if (w0) parts.push([a, w0]);
    if (w1) parts.push([b, w1]);
    if (w2) parts.push([c, w2]);
    parts.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    const key = parts.map(p => p[0] + ':' + p[1]).join('|');
    const hit = cache.get(key);
    if (hit !== undefined) return hit;

    const f0 = w0 / tess, f1 = w1 / tess, f2 = w2 / tess;
    const oa = a * VERTEX_FLOATS, ob = b * VERTEX_FLOATS, oc = c * VERTEX_FLOATS;
    const idx = outC.length;
    for (let k = 0; k < VERTEX_FLOATS; k++) {
      if (k === V_COL) { outV.push(0); continue; }
      outV.push(F(srcV[oa + k] * f0 + srcV[ob + k] * f1 + srcV[oc + k] * f2));
    }
    // Diffuse: interpolate per channel and round.
    const ca = srcC[oa + V_COL] >>> 0, cb = srcC[ob + V_COL] >>> 0, cc = srcC[oc + V_COL] >>> 0;
    let col = 0;
    for (let ch = 0; ch < 4; ch++) {
      const s = 8 * ch;
      const v = Math.round(((ca >>> s) & 255) * f0 + ((cb >>> s) & 255) * f1 + ((cc >>> s) & 255) * f2);
      col |= (Math.min(255, Math.max(0, v)) << s);
    }
    outC.push(col >>> 0);
    cache.set(key, idx);
    return idx;
  }

  for (let t = 0; t < ntSrc; t++) {
    const a = srcI[t * 3], b = srcI[t * 3 + 1], c = srcI[t * 3 + 2];
    // P(i,j) has weights (tess-i-j, i, j) over (a,b,c).
    const P = (i, j) => vertexAt(a, b, c, tess - i - j, i, j);
    for (let j = 0; j < tess; j++) {
      for (let i = 0; i < tess - j; i++) {
        outI.push(P(i, j), P(i + 1, j), P(i, j + 1));
        if (i < tess - 1 - j) outI.push(P(i + 1, j), P(i + 1, j + 1), P(i, j + 1));
      }
    }
  }

  const out = new Mesh();
  out.name = mesh.name;
  out.flags = mesh.flags & ~1;   // never recompute normals on a tessellated mesh
  out.pos = mesh.pos.slice();
  out.scale = mesh.scale.slice();
  out.rot = mesh.rot ? mesh.rot.slice() : null;
  out.material = mesh.material;
  out.allocVerts(outC.length);
  // The original is D3DFMT_INDEX16.  Tessellating a 128x128 terrain past
  // tess=2 blows through 65535 vertices, so widen the index buffer rather
  // than silently wrapping (that was a real bug caught by the shading diff).
  out.allocIndices(outI.length / 3, outC.length > 65535);
  out.verts.set(outV);
  for (let i = 0; i < outC.length; i++) out.vu32[i * VERTEX_FLOATS + V_COL] = outC[i];
  out.indices.set(outI);
  out.tessellatedFrom = { vertexCount: nvSrc, triCount: ntSrc, tess };
  return out;
}

// ---------------------------------------------------------------------------
// 4x4 matrix helpers — row-major, ROW-VECTOR convention (D3D).
// FUN_004024c5(out,A,B): out[i][j] = sum_k A[i][k]*B[k][j], i.e. out = A*B.
// FUN_00402280(M,e):     M = Rx(e.x) * Ry(e.y) * Rz(e.z)
// FUN_00402a6f(out,v,M): out = (v*M).xyz / w, w = v.x*M3 + v.y*M7 + v.z*M11 + M15
// ---------------------------------------------------------------------------
export function mat4Identity() { return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]; }
export function mat4Mul(A, B) {
  const o = new Array(16);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    let s = 0;
    for (let k = 0; k < 4; k++) s = F(s + F(A[i * 4 + k] * B[k * 4 + j]));
    o[i * 4 + j] = s;
  }
  return o;
}
export function mat4Euler(rx, ry, rz) {
  const cx = F(Math.cos(rx)), sx = F(Math.sin(rx));
  const cy = F(Math.cos(ry)), sy = F(Math.sin(ry));
  const cz = F(Math.cos(rz)), sz = F(Math.sin(rz));
  const Rx = mat4Identity(); Rx[5] = cx; Rx[6] = sx; Rx[9] = -sx; Rx[10] = cx;
  const Ry = mat4Identity(); Ry[0] = cy; Ry[2] = -sy; Ry[8] = sy; Ry[10] = cy;
  const Rz = mat4Identity(); Rz[0] = cz; Rz[1] = sz; Rz[4] = -sz; Rz[5] = cz;
  return mat4Mul(mat4Mul(Rx, Ry), Rz);
}
/** FUN_004022bb — post-multiply by a uniform scale. */
export function mat4Scale(M, s) {
  const S = mat4Identity(); S[0] = s; S[5] = s; S[10] = s;
  return mat4Mul(M, S);
}
export function mat4Transform(v, M) {
  const w = F(F(F(F(M[7] * v[1]) + F(M[3] * v[0])) + F(M[11] * v[2])) + M[15]);
  return [
    F(F(F(F(v[0] * M[0]) + F(M[4] * v[1])) + F(M[8] * v[2]) + M[12]) / w),
    F(F(F(F(M[5] * v[1]) + F(M[1] * v[0])) + F(M[9] * v[2]) + M[13]) / w),
    F(F(F(F(M[6] * v[1]) + F(M[2] * v[0])) + F(M[10] * v[2]) + M[14]) / w),
  ];
}

/** rand01() — rand() * [0x4170d0] = rand() / 32767. */
export const RAND_SCALE = 3.0518509447574615e-05;   // [0x4170d0]
export function rand01() { return F(rand() * RAND_SCALE); }

// ---------------------------------------------------------------------------
// FUN_004078b6 @ 0x4078b6 — the scatter generator that feeds arrays A, C and D.
// Ghidra loses every argument; call signature recovered from the call sites.
//
//   srand(seed)
//   for k in 0..count-1:
//     do {
//       p = centre + (rand01()*ext.x*2 - ext.x, 0, rand01()*ext.z*2 - ext.z)
//       h = terrainHeight(p.x, p.z)
//       if (snapToTerrain) p.y = h
//     } while (h + 5.0 < waterLevel)          // [0x418e54] = 5.0
//     out[k] = p
//
// centre.y is forced to 0 at VA 0x4078c2, and ext.y is never read.
// `terrainHeight` may be null, in which case h is treated as 0.
// ---------------------------------------------------------------------------
export function scatter(count, centre, extent, {
  seed = 1, snapToTerrain = false, waterLevel = 0, terrainHeightFn = null,
} = {}) {
  srand(seed);
  const out = [];
  const cy = 0;                                   // centre.y forced to 0
  for (let k = 0; k < count; k++) {
    let p, h;
    for (;;) {
      p = [
        F(centre[0] + F(F(F(rand01() * extent[0]) * 2.0) - extent[0])),
        cy,
        F(centre[2] + F(F(F(rand01() * extent[2]) * 2.0) - extent[2])),
      ];
      h = terrainHeightFn ? terrainHeightFn(p[0], p[2]) : 0;
      if (snapToTerrain) p[1] = h;
      if (!(F(h + 5.0) < waterLevel)) break;
    }
    out.push(p);
  }
  return out;
}

// ---------------------------------------------------------------------------
// FUN_0040bc63 @ 0x40bc63 — SURFACE OF REVOLUTION (the "spire" cluster).
// Array A, used only by scene 0.  Call site VA 0x407fda passes rings = 0x10,
// segments = 8.
//
//   dy = radius * heightRatio / rings          (NOTE: / rings, not / (rings-1))
//   for ring i in 0..rings-1:
//     t = i / (rings - 1)
//     r = (1.001 - t^3) * 1.0 * radius         [0x418f44] * [0x418ef8]
//     y = i * dy
//     for seg j in 0..segments-1:
//       a = (j / segments) * 2PI               [0x418f18] double 2PI
//       pos = (sin(a)*r, y, cos(a)*r)
//       ** nothing else is written: no UVs, no normals, no colour **
//     if i < rings-1: stitchRing(base 0, j, segments, i)
//   shrink(); computeNormals()
//
// CORRECTION TO MESHGEN_notes §9.8: this generator writes NO UVs at all, so
// there is no UV seam here (there is one in the tree rings — see buildTree).
// CORRECTION TO §9.9: the radius multiplier is the RADIUS argument, not the
// height.  The top ring has r = (1.001 - 1) * radius = 0.001 * radius, so it is
// near-degenerate and its normals are numerically unstable — that part stands.
// ---------------------------------------------------------------------------
export function buildRevolution(radius, heightRatio, rings = 16, segments = 8) {
  const mesh = new Mesh();
  mesh.name = 'revolution';
  mesh.allocVerts(rings * segments);
  mesh.allocIndices(2 * segments * (rings - 1));
  const dy = F(F(radius * heightRatio) / rings);
  let vi = 0, ti = 0;
  for (let i = 0; i < rings; i++) {
    const t = F(i / (rings - 1));
    const r = F(F(F(K.REV_BIAS - F(F(t * t) * t)) * 1.0) * radius);
    const y = F(i * dy);
    for (let j = 0; j < segments; j++) {
      const a = F(F(j / segments) * K.TWO_PI);
      mesh.setPos(vi++, F(Math.sin(a) * r), y, F(Math.cos(a) * r));
    }
    if (i < rings - 1) for (let j = 0; j < segments; j++) ti = stitchRing(mesh, ti, 0, j, segments, i);
  }
  mesh.computeNormals();
  return mesh;
}

/**
 * Instance the revolution template: FUN_0040bc63's per-instance loop copies the
 * whole vertex/index/face-normal set and sets pos = scatter[k],
 * scale = (1.0, 0.001, 1.0)  [0x418e28].  The instances grow over time
 * (FUN_0040bfc1) from y-scale 0 to 1.
 */
export function instanceRevolution(template, positions) {
  return positions.map((p, k) => {
    const m = cloneMesh(template);
    m.name = `revolution[${k}]`;
    m.pos = p.slice();
    m.scale = [1.0, 0.001, 1.0];
    return m;
  });
}

// ---------------------------------------------------------------------------
// TREE — FUN_00409d45 (host) + FUN_0040a186 (L-system), plus FUN_00409ccd.
//
// Two meshes: branches (bark texture, material flags 0, lighting OFF) and
// leaves (leaf texture MODULATED by DAT_0047895c, material flags 0x300 ->
// lighting ON, alpha ref 0xF0).  Both are over-allocated to 0xffff and shrunk.
// computeNormals() runs ONCE per mesh, after the whole tree is emitted.
//
// CORRECTION TO MESHGEN_notes §9.5: the autumn colour DAT_0047895c is NOT a
// vertex colour.  It is a per-texel modulate applied to the generated leaf
// TEXTURE (out.c = (src.c * tint.c) >> 8, all four ARGB channels, loop at VA
// 0x40a0a8).  Tree vertex colours are never written and stay 0xFFFFFFFF.
//
// Node: depth 0..4 inclusive, exactly 4 children per node -> (4^5-1)/3 = 341
// nodes -> 341*24 = 8184 branch verts, 341*32 = 10912 branch tris.
// ---------------------------------------------------------------------------
export const TREE = {
  SEG_LEN: 66.0,        // [0x418ef4]
  LEAF_HALF_LEN: 20.0,  // [0x418944], hardcoded
  LEAF_R: 10.0,         // [0x418e5c]
  DEPTH4_TAPER: 0.7,    // [0x418f10]
  SPREAD: 0.6,          // [0x418f00]
  JITTER: 0.4,          // [0x418f08] (offset by [0x418f04] = 0.2)
  LEAF_TRIES: 16,       // literal 0x10 @ 0x40a512
  LEAF_THRESHOLD: 4000, // cmp eax,0xfa0 @ 0x40a51e — rand() < 4000 emits a leaf
  RING_U: 0.142857149,  // [0x418f20] = 1/7
  MAX_DEPTH: 4,
};

const LEAF_UV_U = [0, 0, 1, 1];   // uvTab[m+4]
const LEAF_UV_V = [1, 0, 0, 1];   // uvTab[m]

/**
 * @param {object} p
 *   branchRadius  DAT_00478934 (array-E byte at +0x18, as a float)
 *   levelTaper    DAT_00478948 (array-E byte at +0x19, / 255)
 *   bend          DAT_00478950 (array-E vec3 at +0x0c) — added to every Euler
 *   leafSize      -> DAT_00478930 = leafSize * 10.0
 *   seed          rand() seed; the original inherits the global stream
 * @returns {{branches: Mesh, leaves: Mesh, nodes: number}}
 */
export function buildTree({ branchRadius = 10, levelTaper = 0.8, bend = [0, 0, 0],
                            leafSize = 1.0, seed = null } = {}) {
  if (seed !== null) srand(seed);
  const leafHalfWidth = F(leafSize * TREE.LEAF_R);   // DAT_00478930
  const branches = new Mesh(); branches.name = 'tree.branches';
  const leaves = new Mesh(); leaves.name = 'tree.leaves';
  branches.allocVerts(0xffff); branches.allocIndices(0xffff);
  leaves.allocVerts(0xffff); leaves.allocIndices(0xffff);
  let bv = 0, bt = 0, lv = 0, lt = 0, nodes = 0;

  // DAT_00478938 is BSS and never written anywhere in the image: the root
  // position and the root Euler are permanently (0,0,0).
  function node(parent, angleOffset, depth) {
    nodes++;
    let parentDir, dir, pos, scale;
    if (!parent) {
      parentDir = [0, 0, 0]; dir = [0, 0, 0]; pos = [0, 0, 0]; scale = 1.0;
    } else {
      parentDir = parent.dir;
      dir = [F(F(parent.dir[0] + bend[0]) + angleOffset[0]),
             F(F(parent.dir[1] + bend[1]) + angleOffset[1]),
             F(F(parent.dir[2] + bend[2]) + angleOffset[2])];
      scale = F(parent.scale * levelTaper);
      let M = mat4Euler(parent.dir[0], parent.dir[1], parent.dir[2]);
      M = mat4Scale(M, parent.scale);
      const step = mat4Transform([0, TREE.SEG_LEN, 0], M);
      pos = [F(parent.pos[0] + step[0]), F(parent.pos[1] + step[1]), F(parent.pos[2] + step[2])];
    }
    const self = { dir, pos, scale, depth };

    const base = bv;
    for (let ring = 0; ring < 3; ring++) {
      const t = F(ring * K.HALF);                        // 0, 0.5, 1
      const dirI = [0, 1, 2].map(k => F(F(parentDir[k] * F(1 - t)) + F(dir[k] * t)));
      let M2 = mat4Euler(dirI[0], dirI[1], dirI[2]);
      if (ring !== 0) M2 = mat4Scale(M2, scale);
      else if (parent) M2 = mat4Scale(M2, parent.scale);
      M2[12] = pos[0]; M2[13] = pos[1]; M2[14] = pos[2];
      const v = F(t + t);                                // = ring
      for (let j = 0; j < 8; j++) {
        const u = F(j * TREE.RING_U);
        const M3 = mat4Mul(mat4Euler(0, F(u * K.TWO_PI), 0), M2);
        let R = branchRadius;
        if (depth === 4) R = F(F(1.0 - F(t * TREE.DEPTH4_TAPER)) * R);
        const p = mat4Transform([R, F(F(TREE.SEG_LEN * K.HALF) * ring), 0], M3);
        branches.setPos(bv, p[0], p[1], p[2]);
        branches.setUV0(bv, u, v);
        bv++;
      }
      // Leaves are emitted from rings 1 and 2 of every non-root node.
      if (ring !== 0 && depth !== 0) {
        for (let tryIdx = 0; tryIdx < TREE.LEAF_TRIES; tryIdx++) {
          if (rand() >= TREE.LEAF_THRESHOLD) continue;
          let Rl = TREE.LEAF_R;
          if (depth === 4) Rl = F(F(1.0 - F(t * TREE.DEPTH4_TAPER)) * TREE.LEAF_R);
          const half = F(TREE.SEG_LEN * K.HALF);         // 33
          const bpos = [Rl, F(F((ring - 1) * half) + F(rand01() * half)), 0];
          const ty = F(F(rand01() * 16.0) - 8.0);
          const yaw = F(F(rand01() * 2.0) * K.PI);
          const M4 = mat4Mul(mat4Euler(0, yaw, 0), M2);
          const L = leafHalfWidth, Wl = TREE.LEAF_HALF_LEN;
          const corner = [[0, 0, -L], [F(2 * Wl), ty, -L], [F(2 * Wl), ty, L], [0, 0, L]];
          for (let k = 0; k < 8; k++) {
            const m = k & 3;
            const c = corner[m];
            const p = mat4Transform([F(bpos[0] + c[0]), F(bpos[1] + c[1]), F(bpos[2] + c[2])], M4);
            leaves.setPos(lv, p[0], p[1], p[2]);
            leaves.setUV0(lv, LEAF_UV_U[m], LEAF_UV_V[m]);
            lv++;
          }
          lt = emitTemplate(leaves, lt, lv - 8, QUAD_CW);   // front
          lt = emitTemplate(leaves, lt, lv - 4, QUAD_CCW);  // back (opposite winding)
        }
      }
    }
    for (let row = 0; row < 2; row++)
      for (let j = 0; j < 8; j++) bt = stitchRing(branches, bt, base, j, 8, row);

    if (depth < TREE.MAX_DEPTH) {
      for (const axis of [0, 1, 2, 3]) {
        const R = F(F(rand01() * TREE.JITTER) - 0.2);
        const off = axis < 2
          ? [0, 0, F(axis === 0 ? R - TREE.SPREAD : R + TREE.SPREAD)]
          : [F(axis === 2 ? R - TREE.SPREAD : R + TREE.SPREAD), 0, 0];
        node(self, off, depth + 1);
      }
    }
    return self;
  }
  node(null, [0, 0, 0], 0);

  branches.shrink(bv, bt);
  leaves.shrink(lv, lt);
  branches.computeNormals();
  leaves.computeNormals();

  // ---- leaf animation records — `FUN_00409d45`'s tail, VA 0x409f05-0x409fc5.
  //
  // PINNED (ndisasm; function bounds 0x409d45..0x40a186 from the Ghidra
  // function list, so this loop is INSIDE the tree generator):
  //
  //   00409F05  test dword [ecx+0xac],0xfffffff8   ; leafVertexCount & ~7
  //   00409F21  mov dword [ebp+0xc],0x8            ; 8 VERTICES per leaf
  //   00409F58  call rand01                        ; settle   = r+r      -> +0x7c
  //   00409F70  call rand01                        ; vel.z    = r+r-1    -> +0x6c
  //   00409F81  call rand01                        ; vel.y    = r+r-1
  //   00409F92  call rand01                        ; vel.x    = r+r-1
  //   00409FC1  mov byte [eax+0x78],0x1            ; falling  = 1
  //   00409FC5  jnz 0x409f28
  //
  // ⚠ THIS LOOP MUST LIVE HERE, NOT IN THE CALLER.  It draws 4 randoms per
  // vertex x 8 vertices = 32 PER LEAF from the shared stream, and the original
  // draws them inside the generator — so every call path gets them.  It used to
  // sit in the array-E caller in scene7.js, which meant the OTHER call path
  // (`bakeTreeSet`, the impostor bake) skipped 42,144 draws per bake and every
  // subsequent generator ran at the wrong stream position.  Build order is part
  // of the spec when geometry is procedurally seeded; see
  // re/scenes/SCENE2_TODO.md §1.1 and the note in restoration-methodology.
  //
  // The original fills settle/vel INSIDE the 8-vertex copy loop, so the LAST
  // iteration's values are the ones that survive.  Reproduced verbatim — the
  // draw COUNT is what the stream position depends on, and dropping the
  // redundant assignments would keep the values while changing the count.
  const leafRecords = [];
  const LV = leaves.verts, nLeaves = leaves.vertexCount >> 3;
  for (let j = 0; j < nLeaves; j++) {
    const base = new Float32Array(24);
    let settle = 0, vx = 0, vy = 0, vz = 0;
    for (let k = 0; k < 8; k++) {
      const o = (j * 8 + k) * VERTEX_FLOATS;
      base[k * 3] = LV[o]; base[k * 3 + 1] = LV[o + 1]; base[k * 3 + 2] = LV[o + 2];
      { const r = rand01(); settle = F(r + r); }
      { const r = rand01(); vz = F(F(r + r) - 1.0); }
      { const r = rand01(); vy = F(F(r + r) - 1.0); }
      { const r = rand01(); vx = F(F(r + r) - 1.0); }
    }
    leafRecords.push({
      base, disp: [0, 0, 0], vel: [vx, vy, vz],
      falling: 1, settle, falling0: 1, settle0: settle,
    });
  }
  return { branches, leaves, nodes, leafRecords, leafBase: LV.slice() };
}

/** FUN_00409d45's leaf texture tint (per texel, per channel): (src*tint)>>8. */
export function modulateARGB(src, tint) {
  let out = 0;
  for (let ch = 0; ch < 4; ch++) {
    const s = 8 * ch;
    out |= ((((src >>> s) & 255) * ((tint >>> s) & 255)) >>> 8) << s;
  }
  return out >>> 0;
}

// ---------------------------------------------------------------------------
// FUN_00409c71 — stamp the standard quad UV set on 4 consecutive vertices.
// ---------------------------------------------------------------------------
export function quadUV(mesh, base) {
  mesh.setUV0(base, 0, 0); mesh.setUV0(base + 1, 1, 0);
  mesh.setUV0(base + 2, 1, 1); mesh.setUV0(base + 3, 0, 1);
  return mesh;
}

// ---------------------------------------------------------------------------
// FUN_0040b0b0 @ 0x40b0b0 — CROSSED-BILLBOARD IMPOSTORS (arrays C and D).
//
//   FUN_0040b0b0(this, scene, type, land, N, M, pos[], size, unused, optFlag)
//
// `M` is the literal 2 at both call sites: the same N instances are emitted
// twice, at yaw[i] and yaw[i] + PI/2, into two separate meshes textured with
// impostors baked at those angles — a 2-plane crossed billboard.  `param_8`
// (the array-C dword at record+0x1e) is passed but NEVER READ.
//
// type 0: 1 quad,  4 verts / 2 tris per instance, size s = record.f32 * 50.0
// type 1: 2 quads, 8 verts / 4 tris per instance, size s = record.f32 *  4.0
//
// Vertex colours: the top verts are 0xFFFFFFFF; the bottom verts take the
// terrain SHADOW MAP grey at the instance position (FUN_0040e8fb), so the
// billboards are grounded in the baked lighting.  uv1 is never written.
// FUN_004045f1 IS called per mesh.
//
// Flag bit 18 selects impostor texture set 1 instead of set 0 (a different
// bake, not a different geometry) — no effect on the geometry this port emits.
// ---------------------------------------------------------------------------
export const BILLBOARD_TYPE0 = [
  // [x, y, z, u, v, useShadowColour]
  [-1, 2, 0, 0, 0, false], [1, 2, 0, 1, 0, false],
  [1, 0, 0, 1, 0.9, true], [-1, 0, 0, 0, 0.9, true],
];
export const BILLBOARD_TYPE1 = [
  [-1, 3.5, 0, 0, 0, false], [1, 3.5, 0, 1, 0, false],
  [1, 2, 0, 1, 0.8, true], [-1, 2, 0, 0, 0.8, true],
  [-0.1, 2, 0, 0.47, 0.85, true], [0.1, 2, 0, 0.53, 0.85, true],
  [0.1, 0, 0, 0.53, 1.0, true], [-0.1, 0, 0, 0.47, 1.0, true],
];

/**
 * @param {object} p
 *   type 0|1, N instances, size (already multiplied by 50 / 4),
 *   positions[]  from scatter(),
 *   angleIndex k / angleCount M -> baseAngle = (k/M)*PI,
 *   yaw[]        per-instance random yaw (rand01()*2PI, drawn once for all M),
 *   terrainHeightFn / shadowFn  optional; when given, y is snapped to the
 *   terrain and the bottom verts take the shadow grey.
 */
export function buildBillboards({ type = 0, positions, size, yaw, angleIndex = 0,
                                  angleCount = 2, terrainHeightFn = null, shadowFn = null }) {
  const tmpl = type === 1 ? BILLBOARD_TYPE1 : BILLBOARD_TYPE0;
  const perInst = tmpl.length, quads = perInst / 4;
  const N = positions.length;
  const mesh = new Mesh();
  mesh.name = `billboard${type}[${angleIndex}]`;
  mesh.allocVerts(N * perInst);
  mesh.allocIndices(N * quads * 2);
  const baseAngle = F(F(angleIndex / angleCount) * K.PI);
  let vi = 0, ti = 0;
  for (let i = 0; i < N; i++) {
    const a = F(baseAngle + (yaw ? yaw[i] : 0));
    const ca = F(Math.cos(a)), sa = F(Math.sin(a));
    const p = positions[i].slice();
    let colBottom = 0xffffffff;
    if (terrainHeightFn) {
      p[1] = F(p[1] + terrainHeightFn(p[0], p[2]));
      if (shadowFn) {
        const g = Math.trunc(shadowFn(p[0], p[2])) & 255;
        colBottom = (0xff000000 | (g << 16) | (g << 8) | g) >>> 0;
      }
    }
    for (const [lx, ly, lz, u, v, shadow] of tmpl) {
      // R = rotY(a): x' = x*cos + z*sin, z' = -x*sin + z*cos
      const x = F(lx * size), y = F(ly * size), z = F(lz * size);
      mesh.setPos(vi, F(F(F(x * ca) + F(z * sa)) + p[0]), F(y + p[1]),
                      F(F(F(-F(x * sa)) + F(z * ca)) + p[2]));
      mesh.setUV0(vi, u, v);
      mesh.setColor(vi, shadow ? colBottom : 0xffffffff);
      vi++;
    }
    for (let q = 0; q < quads; q++) ti = emitTemplate(mesh, ti, i * perInst + q * 4, QUAD_CW);
  }
  mesh.computeNormals();
  return mesh;
}

// ---------------------------------------------------------------------------
// FUN_0040c721 @ 0x40c721 — THE COMPOUND PROP: a DANDELION.
// Transcribed in SCENES_7_10.md §12; landed 2026-08-06 for scene 2's array D
// (256 field billboards, Jasper: "the dandelions are also missing") and the
// impostor set-2 bake.  A 50-unit 8-sided stem carrying 128 randomly-tilted
// 4-sided tapered twigs at y=50, each with 16 curved 3x3 leaves — the twig
// burst IS the seed head.
//
// RNG DISCIPLINE (SCENES_7_10.md §12.5).  `FUN_0040c721` draws 4864 randoms in
// total, but they are IN TWO GROUPS SEPARATED BY A STREAM BARRIER and this file
// splits them into two exported functions to match:
//
//   buildDandelion()          128 * (2 + 16*2) = 4352   geometry
//   <caller runs texgen program 3 — its op 3 SELF-RESEEDS; see 0x40CDCC>
//   buildDandelionRecords()   128 * 4          =  512   animation records
//
// Geometry is per twig: 2 (its Euler), then 16 leaves x 2 (a, b), interleaved
// twig-by-twig.  A wrong count is strictly worse than none, so the draw sites
// below are the ONLY rand()/rand01() calls in this function and each is
// annotated with its share of the 4352.
//
// DO NOT re-merge the two.  The totals agree either way — which is precisely
// why running the records early went undetected for so long — but a reseed
// erases everything before it, so only the SPLIT reproduces the exit state the
// tree-impostor yaws read.  `buildDandelionRecords`' header has the full story.
//
// Constants (all dumped from the image): [0x418f78]=1/3, [0x418230]=4.0,
// [0x418efc]=0.1, [0x418ddc]=0.25, [0x418e60]=50.0, [0x418f70]=PI/2 (qword),
// [0x418220]=PI (qword), [0x418eb0]=0.75, [0x418f6c]=1.25, [0x418e54]=5.0,
// [0x418f68]=0.0625, [0x418f64]=0.125, [0x418f54]=0.3, [0x418e7c]=8.0.
// Twig vertex colour 0x5FFFFFFF (VA 0x40c8e9), leaf 0x2FFFFFFF (VA 0x40cb3d);
// the STEM colour dword is the one §12.5 item still unresolved by ndisasm —
// left at the allocVerts default 0xFFFFFFFF.
// ---------------------------------------------------------------------------
export function buildDandelion() {
  const twigs = new Mesh(); twigs.name = 'dandelion.twigs';
  twigs.allocVerts(0x800); twigs.allocIndices(0xc00);
  const leaves = new Mesh(); leaves.name = 'dandelion.leaves';
  leaves.allocVerts(0x4800); leaves.allocIndices(0x6000);
  const stem = new Mesh(); stem.name = 'dandelion.stem';
  stem.allocVerts(0x80); stem.allocIndices(0xf0);
  const TWIG_Y = [0, 1, 2, 5];
  let tv = 0, tt = 0, lv = 0, lt = 0;

  for (let inst = 0; inst < 128; inst++) {
    // 2 draws/twig (256 of 4352)
    const M = mat4Euler(F(rand01() * 2 * K.PI), 0, F(rand01() * 2 * K.PI));
    const tBase = inst * 16;
    for (let row = 0; row < 4; row++) {
      const v0 = F(F(row * (1 / 3)) * 4.0);
      let r = F(0.1 * 4.0);                        // 0.4
      if (row >= 2) r = F(r * 0.25);               // 0.1
      const y = TWIG_Y[row];
      for (let col = 0; col < 4; col++) {
        const u = F(col * (1 / 3));
        const th = F(u * K.TWO_PI);
        const p = mat4Transform([F(Math.sin(th) * r), y, F(Math.cos(th) * r)], M);
        twigs.setPos(tv, p[0], F(p[1] + 50.0), p[2]);
        twigs.setUV0(tv, u, v0);
        twigs.setColor(tv, 0x5fffffff);
        tv++;
      }
    }
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 3; j++) tt = stitchRing(twigs, tt, tBase, i, 4, j);

    for (let leaf = 0; leaf < 16; leaf++) {
      // 2 draws/leaf (128*16*2 = 4096 of 4352)
      const a = F(F(rand01() * K.PI) - K.HALF_PI);
      const b = F(F(rand01() * K.PI) - K.HALF_PI);
      const Mtop = mat4Euler(F(a * 0.75), 0, F(b * 0.75));
      const Mroot = mat4Euler(F(a * 1.25), 0, F(b * 1.25));
      const lBase = lv;
      for (let row = 0; row < 3; row++) {
        const w = F(row * K.HALF);
        for (let col = 0; col < 3; col++) {
          const u = F(col * K.HALF);
          const th = F(u * K.TWO_PI);
          const q = [F(Math.sin(th) * 0.1), F(w * 2), F(Math.cos(th) * 0.1)];
          const pr = mat4Transform(q, Mroot), pt = mat4Transform(q, Mtop);
          let p = [F(F(pr[0] * w) + F(pt[0] * F(1 - w))),
                   F(F(pr[1] * w) + F(pt[1] * F(1 - w))),
                   F(F(pr[2] * w) + F(pt[2] * F(1 - w)))];
          p[1] = F(p[1] + 5.0);
          p = mat4Transform(p, M);
          leaves.setPos(lv, p[0], F(p[1] + 50.0), p[2]);
          leaves.setUV0(lv, u, w);
          leaves.setColor(lv, 0x2fffffff);
          lv++;
        }
      }
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 2; j++) lt = stitchRing(leaves, lt, lBase, i, 3, j);
    }
  }

  // stem — no RNG
  let sv = 0, st = 0;
  for (let row = 0; row < 16; row++) {
    const y = F(F(row * 0.0625) * 50.0);
    for (let col = 0; col < 8; col++) {
      const u = F(col * 0.125);
      const th = F(u * K.TWO_PI);
      stem.setPos(sv, F(Math.sin(th) * 0.3), y, F(Math.cos(th) * 0.3));
      stem.setUV0(sv, u, 0);
      sv++;
    }
  }
  for (let row = 0; row < 15; row++) {
    const base = row * 8;
    for (let col = 0; col < 8; col++) {
      const c0 = col & 7, c1 = (col + 1) & 7;
      stem.setTri(st++, base + c1 + 8, base + c0 + 8, base + c0);
      stem.setTri(st++, base + c0, base + c1, base + c1 + 8);
    }
  }

  // COMPUTE NORMALS — all three meshes, stem/twigs/leaves in that order.
  // PINNED: `0040CCFA / 0040CD02 / 0040CD0A  call 0x4045f1` on `*this`,
  // `*(this+4)`, `*(this+8)` (sonnet.c:10367-10369), immediately after the
  // stem loop and before the terrain snap.
  //
  // ⚠ THIS BLOCK USED TO SAY THE OPPOSITE, and the reasoning is worth keeping
  // as a warning.  It read: "no call site to 0x40449f anywhere in
  // 0x40c721-0x40cfed", which is TRUE — and irrelevant.  **`0x40449f` is not
  // the normal generator**; it is an allocation helper (its callees are
  // VirtualAlloc and friends).  The real generator is `0x4045f1`, called from
  // 13 sites across the image, and `re/tools/xray.py` had BOTH addresses
  // labelled "mesh_computeNormals", so a grep for the wrong one came back
  // empty and was read as proof of absence.  A negative claim is only as good
  // as the identity of the symbol it is negating.
  //
  // Consequence of getting it wrong: with zero normals `N·L = 0` for every
  // light, so the whole plant rendered on the ambient term alone
  // (`0x1f1f1f1f` = 0.122) — and because the seed materials blend ADDITIVELY,
  // that scaled every filament's contribution by ~1/8 and made the seed head
  // read as a pale smudge instead of the reference's brilliant white burst.
  stem.computeNormals();
  twigs.computeNormals();
  leaves.computeNormals();
  // REST POSES — the original keeps a second copy of the twig and leaf
  // positions at prop+0x14 / prop+0x18 and `FUN_0040cfed` writes
  // `dst = rest + offset` every frame, never accumulating into the live
  // buffer.  Snapshot them here so the updater has the same two sources.
  // (No RNG is drawn, so this cannot move the stream.)
  return {
    twigs, leaves, stem, records: null,   // records come later — see below
    twigsRest: twigs.verts.slice(),     // prop+0x14, 128 x 16 verts
    leavesRest: leaves.verts.slice(),   // prop+0x18, 128 x 144 verts
  };
}

/**
 * `FUN_0040c721`'s TAIL — the 128 seed records, 4 `rand01()` each = 512 draws.
 *
 * ⚠ THIS MUST RUN **AFTER** THE CALLER HAS GENERATED TEXGEN PROGRAMS 3 AND 4,
 * not inside `buildDandelion`. In the binary the order is
 *
 *     geometry (4352 draws)
 *     0x40CDCC  texgen program 3      <- op 3 SELF-RESEEDS: a stream anchor
 *     0x40CE65  texgen program 4      <- draws nothing
 *     0x40CEBF  alloc 0xE00 = 128 * 0x1C
 *     0x40CEEC / 0x40CEFF / 0x40CF13 / 0x40CF5D   4 x rand01, x128 = 512 draws
 *     0x40CF83  loop exit
 *
 * The port used to draw these inside `buildDandelion`, i.e. BEFORE program 3 —
 * so program 3's reseed erased them from the anchored stream and every consumer
 * after the dandelion bake ran 512 draws early. That is exactly the tree-impostor
 * billboard yaws: measured `0xb67fd936`, correct `0x5f95db36`, and
 * `0x5f95db36 = 0xb67fd936` advanced 512. **The total of 4864 was right all
 * along; only the program point was wrong** — which is why every draw-count
 * audit passed. Found by `/codex:rescue`; predictions reproduced exactly before
 * this change was made.
 */
export function buildDandelionRecords(dd) {
  const records = [];
  for (let i = 0; i < 128; i++) {
    const r0 = F(F(F(rand01() * 2) - 1) * 10.0);
    const r1 = F(F(F(rand01() * 2) - 1) * 10.0);
    const r2 = F(F(F(rand01() * 2) - 1) * 10.0);
    const r6 = F(rand01() * 8.0);
    // `phase0` is not in the original — it is the build-time value `#resetAnim`
    // restores, because `#stepProps` counts `phase` down and a second warm-up
    // would otherwise start with the seeds already shed.
    records.push({ jitter: [r0, r1, r2], rest: [0, 0, 0], phase: r6, phase0: r6 });
  }
  if (dd) dd.records = records;
  return records;
}

// ---------------------------------------------------------------------------
// FUN_0040d1f1 @ 0x40d1f1 — RAIN / SNOW particle quads.
//
// The generator writes ONLY the UVs and the indices.  Positions and colours are
// rebuilt every frame by FUN_0040d5c6 from the particle records, so this
// function returns both the (UV-only) mesh and the initial particle state.
//
//   P.pos = (rand01()*2*extX - extX, -rand01()*extY, rand01()*2*extZ - extZ)
//   P.vel = rain  ? (0, -1, 0)
//         : snow  ? (rand01()*0.2 - 0.1, -0.1, rand01()*0.2 - 0.1)
//
// Spawn box (from FUN_00407983): rain (50, 256, 50), snow (60, 128, 60).
// Quad half-height at draw time: rain 5.0, snow 1.0; quad scale (1, rain?2:1, 1)
// -> snow 2x2 camera-facing, rain 2x20 billboarded about world +Y (streaks).
//
// CORRECTION TO MESHGEN_notes §1: the extra fixed quad block is 0x100 = 256
// QUADS (0x400 was the VERTEX count).  They are screen-space lens droplets, not
// world particles — buildLensDroplets() below.
// ---------------------------------------------------------------------------
export function buildPrecipitation({ count, type = 0, box = null, seed = null }) {
  if (seed !== null) srand(seed);
  const isRain = type !== 0;
  const [ex, ey, ez] = box || (isRain ? [50, 256, 50] : [60, 128, 60]);
  const mesh = new Mesh();
  mesh.name = isRain ? 'rain' : 'snow';
  mesh.allocVerts(count * 4);
  mesh.allocIndices(count * 2);
  const particles = [];
  let ti = 0;
  for (let i = 0; i < count; i++) {
    const pos = [F(F(F(rand01() * ex) * 2.0) - ex), F(-F(rand01() * ey)), F(F(F(rand01() * ez) * 2.0) - ez)];
    const vel = isRain ? [0, -1.0, 0]
      : [F(F(rand01() * 0.2) - 0.1), -0.1, F(F(rand01() * 0.2) - 0.1)];
    particles.push({ pos, vel });
    quadUV(mesh, i * 4);
    ti = emitTemplate(mesh, ti, i * 4, QUAD_CW);
  }
  // FUN_004045f1 is NOT called: the normals stay (0,0,0) from the zero-filled
  // allocation.  The material (0x1050) has lighting off, so that is fine.
  return {
    mesh, particles,
    box: [ex, ey, ez],
    quadHalfHeight: isRain ? 5.0 : 1.0,
    quadScale: [1, isRain ? 2 : 1, 1],
    isRain,
  };
}

/** The 256 screen-space lens droplet quads (FUN_0040d1f1's second block). */
export function buildLensDroplets() {
  const N = 256;
  const mesh = new Mesh();
  mesh.name = 'lensDroplets';
  mesh.allocVerts(N * 4);
  mesh.allocIndices(N * 2);
  let ti = 0;
  for (let i = 0; i < N; i++) {
    quadUV(mesh, i * 4);
    for (let k = 0; k < 4; k++) mesh.setColor(i * 4 + k, 0x7fffffff);
    ti = emitTemplate(mesh, ti, i * 4, QUAD_CW);
  }
  return mesh;
}

// ---------------------------------------------------------------------------
// FUN_0040ec28 @ 0x40ec28 — CLOUD LAYER.  Three meshes:
//   A (this+0x0c) N*4 / N*2 — the scrolling noise quads, rendered to a 256x256 RT
//   B (this+0x10) 4 / 2     — the blit quad, 256 RT -> 512 RT
//   C (this+0x14)           — the visible sky, TWO mutually exclusive shapes:
//       opt10 != 0 (descriptor bit 10 CLEAR): flat stacked layers
//       opt10 == 0 (bit 10 SET):              a curved 16x16 dome
// opt10 = ~(flags>>10)&1, opt11 = (flags & 0x800) != 0.
// ---------------------------------------------------------------------------
export const CLOUD_QUAD = [[-1, 1, 0], [1, 1, 0], [-1, -1, 0], [1, -1, 0]];

export function buildCloudNoiseQuads(N) {
  const mesh = new Mesh();
  mesh.name = 'cloud.noise';
  mesh.allocVerts(N * 4);
  mesh.allocIndices(N * 2);
  const params = [];
  let ti = 0;
  for (let i = 0; i < N; i++) {
    params.push([F(F(rand01() * 4.0) + 1.0), rand01(), rand01()]);   // this+0x18
    for (let k = 0; k < 4; k++) mesh.setPos(i * 4 + k, ...CLOUD_QUAD[k]);
    ti = emitTemplate(mesh, ti, i * 4, QUAD_ALT);   // 0x418eec = 0,2,3,3,1,0
  }
  return { mesh, params };
}

export function buildCloudBlitQuad() {
  const mesh = new Mesh();
  mesh.name = 'cloud.blit';
  mesh.allocVerts(4);
  mesh.allocIndices(2);
  const uv = [[0, 0], [1, 0], [0, 1], [1, 1]];
  for (let k = 0; k < 4; k++) { mesh.setPos(k, ...CLOUD_QUAD[k]); mesh.setUV0(k, uv[k][0], uv[k][1]); }
  emitTemplate(mesh, 0, 0, QUAD_ALT);
  return mesh;
}

export function buildCloudSky({ N, size, colour, opt10, opt11 }) {
  if (opt10) {
    // Flat stacked layers.  [0x418fbc] = -1500, [0x418fb8] = 1500, [0x418f04] = 0.2
    const count = opt11 ? 8 : N;
    const KK = opt11 ? 4 : 15;
    const mesh = new Mesh();
    mesh.name = 'cloud.layers';
    mesh.allocVerts(count * 4);
    mesh.allocIndices(count * 2);
    let ti = 0;
    for (let i = 0; i < count; i++) {
      const y = F(size + F(KK * (count - i)));
      const S = opt11 ? 1.0 : F(1.0 - F(0.2 * i));
      const t = F(i / count);
      const a = Math.trunc(F(255.0 * (opt11 ? Math.max(t, F(1 - t)) : t))) & 255;
      const col = ((a << 24) >>> 0 | (colour & 0x00ffffff)) >>> 0;
      const corners = [[-1500, y, -1500, 0, 0], [1500, y, -1500, S, 0],
                       [-1500, y, 1500, 0, S], [1500, y, 1500, S, S]];
      for (let k = 0; k < 4; k++) {
        mesh.setPos(i * 4 + k, corners[k][0], corners[k][1], corners[k][2]);
        mesh.setUV0(i * 4 + k, corners[k][3], corners[k][4]);
        mesh.setColor(i * 4 + k, col);
      }
      ti = emitTemplate(mesh, ti, i * 4, QUAD_ALT);
    }
    return mesh;
  }
  // Curved dome: a 16x16 grid at y = size, then y = size * (1.75 - d*0.002)
  // with d = |(v.x*5.3, v.y, v.z*5.3)|.
  // [0x418e9c] = 150, [0x418fb4] = 5.3, [0x418fac] = 1.75, [0x418fb0] = 0.002
  const mesh = new Mesh();
  mesh.name = 'cloud.dome';
  buildGrid(mesh, { W: 16, H: 16, flatY: size, extX: 150, extZ: 150, heightScale: 0,
                    u0Tile: 1, v0Tile: 1, u1Tile: 1, v1Tile: 1 });
  for (let i = 0; i < mesh.vertexCount; i++) {
    const p = mesh.getPos(i);
    mesh.setColor(i, (colour | 0xff000000) >>> 0);
    const d = Math.hypot(F(p[0] * 5.3), p[1], F(p[2] * 5.3));
    mesh.setPos(i, p[0], F(size * F(1.75 - F(d * 0.002))), p[2]);
  }
  return mesh;
}

// ---------------------------------------------------------------------------
// FUN_004080e0 @ 0x4080e0 — THE WATER GLITTER (the sun's sparkle on the sea).
//
// 128 view-space billboards scattered from ONE anchor: the sun's position
// projected onto the water. `Landscape+0x3c` is the LENS FLARE object
// (`FUN_00405082`), and 0x407084 writes `desc+0x32` — the sun position — into
// its record 0; `FUN_004080e0` copies that as every glitter record's base and
// forces y to 0. So the glitter is literally the sun's reflection point.
//
// Record layout, 0x20 bytes (8 floats), matching the sprite class's draw
// (`FUN_00404dbb`, vtable 0x4182ac):
//   [0..2] base position   [3..5] VIEW-SPACE offset   [6] half-size   [7] colour
//
// RNG: FOUR LCG steps per record — one raw `rand()` to pick the population,
// then three `rand01()`. 512 draws in total, and they land after every array
// generator and before `FUN_0040ec28`, so their position in the shared stream
// is load-bearing for anything built later.
export function buildWaterGlitter(sunPos) {
  const recs = [];
  // y is explicitly zeroed at 0x408119 (`[dst+4] = 0`) — the sun dropped onto
  // the water plane, not the sun itself.
  const bx = sunPos[0], bz = sunPos[2];
  for (let i = 0; i < 128; i++) {
    // The population split is on the RAW rand(), not rand01(): `cmp eax,0x4000`
    // against the 15-bit LCG output, i.e. an even coin flip.
    const wide = rand() < 0x4000;
    const a = F(F(rand01() * 1000.0) - 1000.0);                 // [0x418300]
    const b = wide ? F(F(rand01() * 40.0) - 20.0)               // [0x418e64]/[0x418e24]
                   : F(F(rand01() * 10.0) - 5.0);               // [0x418e5c]/[0x418e54]
    recs.push({
      base: [bx, 0, bz],
      off: [b, a, 0],           // vec3_set(dst, b, a, 0) — x from the population, y the spread
      size: 2.0,                // [0x418200]; overwritten on the first update
      colour: 0xffffffff,
      phase: F(F(rand01() * 2.0) * Math.PI),                    // [0x418220] qword
    });
  }
  return recs;
}

/**
 * The per-frame half, VA 0x409900-0x40995d. Ghidra dropped the alpha's `ftol`
 * argument (the usual x87 pattern), so the expression is from ndisasm.
 *   u     = sin(T * 10.0 + phase) * 0.5 + 0.5
 *   size  = u * 96.0 + 32.0                       -> 32 .. 128
 *   alpha = ftol((u * 127.0 + 63.0) * 0.5)        -> 31 .. 95
 * Note the original DRAWS before it updates, so frame one shows the build size.
 */
export function stepWaterGlitter(recs, T) {
  for (let i = 0; i < recs.length; i++) {
    const r = recs[i];
    const u = F(F(Math.sin(F(F(T * 10.0) + r.phase)) * 0.5) + 0.5);
    r.size = F(F(u * 96.0) + 32.0);
    let a = Math.trunc(F(F(F(u * 127.0) + 63.0) * 0.5));
    if (a < 0) a = 0; else if (a > 255) a = 255;
    r.colour = (((a << 24) >>> 0) | 0xffffff) >>> 0;
  }
}

// ---------------------------------------------------------------------------
// FUN_0040f42f / FUN_0040f5a8 @ 0x40f42f — RIBBON STRIP (32 verts / 30 tris).
// 16 stations x 2 verts, 72 units wide, snaking in Z, translated in -Z.
// 32 of these are created when the hi-res water flag (bit 13) is set.
// ---------------------------------------------------------------------------
export function buildRibbon(index, { seed = null } = {}) {
  if (seed !== null) srand(seed);
  const st = {
    index,
    speed: F(F(rand01() * 20.0) + 90.0),        // +0x54  [0x418e24]=20, [0x418fc4]=90
    phase: F(F(rand01() * 2.0) + 2.0),          // +0x4c
    phaseRate: F(rand01() + 1.0),               // +0x50
    freqA: F(rand01() + 1.0),                   // +0x00
    freqB: F(rand01() + 1.0),                   // +0x04
    yaw: F(F(F(rand01() * -0.7) + 0.1) * K.PI), // [0x418fc0]=-0.7, [0x418ea4]=0.1
  };
  const mesh = new Mesh();
  mesh.name = `ribbon[${index}]`;
  mesh.allocVerts(0x20);
  mesh.allocIndices(0x1e);
  let ti = 0;
  for (let b = 0; b < 30; b += 2) ti = emitTemplate(mesh, ti, b, QUAD_RIBBON);
  updateRibbon(mesh, st, 0);
  mesh.computeNormals();
  return { mesh, state: st };
}

/** FUN_0040f5a8 — rebuild the 32 vertices (also the per-frame update). */
export function updateRibbon(mesh, st, dt) {
  st.phase = F(st.phase + F(dt * st.phaseRate));
  const off = [0, F(F(st.index * 0.1) + 0.2), F(300.0 - F(st.phase * st.speed))];
  // THE FADE ENVELOPE, VA 0x40f5f3-0x40f642.  A triangular envelope over the
  // phase, and since `off.z = 300 - phase*speed` a rising phase IS travel toward
  // the island — so each strip fades UP as it appears at the far edge and fades
  // back OUT as it arrives at the centre.  Ghidra drops all of this (it is pure
  // x87 through a reused stack slot, `[ebp+8]`, the dt argument's own slot —
  // safe because dt is consumed at 0x40f5ae before anything overwrites it):
  //
  //   0040F5F3  fld1                       ; fade = 1.0
  //   0040F5FA  fld [ebx+0x4c] ; fcomp 1.0 ; jnc  -> skip when phase >= 1
  //   0040F60B    fld [ebx+0x4c]           ;   fade = phase
  //   0040F611  fld [ebx+0x4c] ; fcomp 1.0 ; fld 2.0 ; jna -> skip when phase <= 1
  //   0040F625    fld st0 ; fsub [ebx+0x4c] ; fmul [ebp+8]
  //                                        ;   fade = (2 - phase) * fade
  //   0040F630  fld [ebp+8] ; fcomp 0.0 ; jnc
  //   0040F63E    fldz                     ;   fade = 0
  //
  // The `fnstsw`/`sahf` pair at 0x40f620 reads the status word left by the
  // `fcomp` at 0x40f614 — the intervening `fld` does not disturb it — so both
  // tests are against the phase, not against 2.0.  Exactly 1.0 takes neither
  // branch and keeps fade = 1.0.  The clamp at 0 is load-bearing: `buildRibbon`
  // seeds phase in [2, 4), so the build-time call gets a NEGATIVE (2 - phase)
  // and every strip starts invisible, with the wrap below staggering it into
  // [0, 2) for the first real frame.
  let fade = 1.0;
  if (st.phase < 1.0) fade = st.phase;
  if (st.phase > 1.0) fade = F(F(2.0 - st.phase) * fade);
  if (fade < 0) fade = 0;
  if (st.phase >= 2.0) st.phase = F(st.phase - 2.0);
  const M = mat4Euler(0, st.yaw, 0);
  for (let i = 0; i < 16; i++) {
    const u = F(i * K.RIBBON_U);
    const X = F(F(u * 200.0) - 100.0);
    const W = F(F(Math.cos(F(F(st.freqB * st.phase) + F(F(F(2 * u) * st.freqB) * K.PI))) *
                  Math.sin(F(F(st.freqA * st.phase) + F(F(F(2 * u) * st.freqA) * K.PI)))) * 10.0);
    // TWO `ftol`s, not one (0x40f6f8 and 0x40f706): the station ramp is
    // truncated to an INTEGER first, and only then scaled by the fade and
    // truncated again — so the alpha is quantised twice, and at low fade the
    // second truncation is what actually kills the strip.  No clamp: the ramp
    // is 255 - |(i-8)*0.125|*255 with i in 0..15, which lands in [0, 255] by
    // construction, and fade is clamped into [0, 1] above.
    const ramp = Math.trunc(F(255.0 - F(Math.abs(F((i - 8) * K.K_0_125)) * 255.0)));
    const a = Math.trunc(F(ramp * fade));
    const col = ((a << 24) >>> 0 | 0x006f6f6f) >>> 0;
    for (const [k, zoff, v] of [[0, -36.0, 0], [1, 36.0, 1]]) {
      const p = mat4Transform([F(X + off[0]), off[1], F(F(W + zoff) + off[2])], M);
      const vi = i * 2 + k;
      mesh.setPos(vi, p[0], p[1], p[2]);
      mesh.setUV0(vi, u, v);
      mesh.setColor(vi, col);
    }
  }
  return mesh;
}

// ---------------------------------------------------------------------------
// FUN_0040f803 @ 0x40f803 — BIRDS.  6 verts / 4 tris per instance, two wing
// quads sharing the body edge (0,1).  Indices are LITERAL, not a template:
//   0,2,1  2,3,1  0,1,4  1,5,4
// Colour: 0xFF000000 | (0x9b + rand()%100) per channel, three independent
// draws; species != 0 forces pure white.  Wing multiplier Wf = species ? 3 : 1.
// FUN_004045f1 is NOT called -> normals stay (0,0,0).
// ---------------------------------------------------------------------------
/**
 * ⚠ THIS FUNCTION DRAWS NO RNG, deliberately. It used to draw the colour's
 * three `rand()`s itself, and only for species 0 — two bugs at once:
 *   * `FUN_0040f803` draws them for EVERY species and merely discards the
 *     result when species != 0 (`if (in_stack_00000020 != 0) uVar8 = 0xffffffff`),
 *     so species-1 flocks were short 3 draws per bird; and
 *   * it drew them BEFORE the position draws, where the original draws them
 *     AFTER — so even species 0 had the stream in the wrong order.
 * The caller (`buildFlock`) now owns all eight per-bird draws in the original's
 * order and passes the finished colour in.
 */
export function buildBird(species = 0, col = 0xffffffff) {
  const Wf = species ? 3 : 1;
  const xL = F(-3.0 * Wf), xR = F(3.0 * Wf);
  const mesh = new Mesh();
  mesh.name = 'bird';
  mesh.allocVerts(6);
  mesh.allocIndices(4);
  const V = [[0, 0, -3, 0, 1], [0, 0, 3, 0, 0], [xL, 0, -3, 1, 1],
             [xL, 0, 3, 1, 0], [xR, 0, -3, 1, 1], [xR, 0, 3, 1, 0]];
  for (let i = 0; i < 6; i++) {
    mesh.setPos(i, V[i][0], V[i][1], V[i][2]);
    mesh.setUV0(i, V[i][3], V[i][4]);
    mesh.setColor(i, col);
  }
  mesh.setTri(0, 0, 2, 1); mesh.setTri(1, 2, 3, 1);
  mesh.setTri(2, 0, 1, 4); mesh.setTri(3, 1, 5, 4);
  return mesh;
}

/**
 * FUN_0040f803's flock loop.  Per bird: a 0x14-byte record and one 6-vertex
 * mesh placed at centre + (2*rand01()*A - 2*A, 0, 2*rand01()*A - 2*A).
 */
export function buildFlock({ count, centre, A, amp, species = 0, seed = null }) {
  if (seed !== null) srand(seed);
  const birds = [];
  for (let i = 0; i < count; i++) {
    // ⚠ RNG ORDER IS THE SPEC HERE. `FUN_0040f803` draws EIGHT LCG steps per
    // bird and this port used to draw five, in the wrong order — so every bird
    // after the first landed somewhere else, which is what "the birds are in
    // the wrong place" looks like. Verbatim from the decompile plus ndisasm:
    //
    //   1  rand01  speed = (r + 0.5) * 1.0 * A * 0.01        [0x418fd8]
    //   2  rand01  phase = r * 100.0                         [0x4170c0]
    //   3  rand01  Z     = 2*r*A + A*(-2.0)                  [0x4182c8]   <- Z FIRST
    //   4  rand01  X     = 2*r*A + A*(-2.0)
    //   5  rand    ) the per-vertex COLOUR: ((r%100 + 0x9b) etc.
    //   6  rand    ) DRAWN EVEN WHEN SPECIES != 0, which overwrites the
    //   7  rand    ) result with 0xffffffff — the draws still happen.
    //   8  rand01  preroll = ftol(r * 500.0)                  [0x418fd0]
    //
    // The Z-before-X order is the same trap `MG.scatter` had (SPIRE_REOPEN.md):
    // the distribution is identical, the positions are not.
    const scale = F(F(F(rand01() + K.HALF) * A) * 0.01);
    const phase = F(rand01() * 100.0);
    const bz = F(centre[2] + F(F(F(2 * rand01()) * A) - F(2 * A)));
    const bx = F(centre[0] + F(F(F(2 * rand01()) * A) - F(2 * A)));
    // Per-vertex colour. `FUN_0040f803` builds it from three raw `rand()`s and
    // then throws it away for every species but 0 — but the draws are part of
    // the shared stream either way, so they must happen here regardless.
    const c1 = rand() % 100, c2 = rand() % 100, c3 = rand() % 100;
    const colour = species !== 0 ? 0xffffffff
      : ((0xff000000 | ((0x9b + c2) << 16) | ((0x9b + c1) << 8) | (0x9b + c3)) >>> 0) >>> 0;
    const mesh = buildBird(species, colour);
    mesh.name = `bird[${i}]`;
    mesh.pos = [bx, centre[1], bz];
    const preroll = Math.trunc(F(rand01() * 500.0));
    birds.push({ mesh, scale, phase, euler: [0, 0, 0], preroll, colour });
  }
  return { birds, amp, species };
}

// ---------------------------------------------------------------------------
// REMASTER: TERRAIN RE-SAMPLING TESSELLATION
//
// `tessellate()` above subdivides triangles with LINEAR interpolation.  On the
// terrain that is geometrically a NO-OP: the surface is piecewise linear, so
// every interpolated vertex lands exactly in the plane of the triangle it came
// from, and the UVs are linear in (c/W, r/H) too, so they interpolate exactly.
// It costs triangles and buys nothing.
//
// What actually helps is re-sampling: the heightmap the terrain is carved from
// is 256x256 (FUN_0040e058 upsamples the 128x128 texture-program output 2x),
// but the mesh is only N x N with N = 64 or 128 — the box downsample throws
// away 4x-16x of the detail that is already there.  Rebuilding the grid at
// N*tess recovers real geometry.
//
// The normals then come from the ORIGINAL N x N topology, bilinearly resampled
// onto the finer lattice.  Because the fine lattice is a strict superset of the
// coarse one (fu = c/(W*tess), so c = k*tess reproduces k/W exactly), every
// original vertex keeps its exact position, UVs AND its exact un-normalised
// |n| — so the crease darkening that §0 calls load-bearing is preserved
// wherever it was defined, and only the new in-between vertices get a smooth
// interpolant.  computeNormals() is NEVER run on the result.
//
// tess = 1 returns a byte-identical mesh (regression guard).
// ---------------------------------------------------------------------------
export function buildTerrainTessellated(hmap128, N, scaleVec, tess = 1, opts = {}) {
  const base = buildTerrain(hmap128, N, scaleVec, opts);
  if (tess === 1) return base;
  const Nf = N * tess;
  if (Nf > 256) {
    // Past 256 there is no more heightmap detail; fall back to bilinear
    // resampling of the 256x256 map, which is still smoother than the box
    // downsample but adds no new information.
  }
  const heightsF = resampleHeights(base.map256, Nf);
  // PIN THE ORIGINAL LATTICE.  The box downsample to Nf averages a smaller
  // block than the downsample to N, so without this the ORIGINAL vertices move
  // too (up to ~74 world units on scene 8) — which would desynchronise them
  // from the ground texture that FUN_0040e058 bakes against the N x N cell grid
  // and from the `v.y <= waterLevel` shoreline threshold.  Forcing the coarse
  // lattice back to its own heights keeps every original vertex exactly where
  // the original put it and lets only the in-between vertices add detail.
  // This is the direct analogue of the texture pinned-lattice rule.
  if (opts.pin !== false) {
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) heightsF[r * tess * Nf + c * tess] = base.heights[r * N + c];
    }
  }
  const mesh = new Mesh();
  mesh.name = 'terrain';
  buildGrid(mesh, {
    W: Nf, H: Nf, extX: TERRAIN_EXTENTS[0], heightScale: TERRAIN_EXTENTS[1],
    extZ: TERRAIN_EXTENTS[2],
    u0Tile: 1, v0Tile: 1, u1Tile: K.TERRAIN_UV1, v1Tile: K.TERRAIN_UV1,
    heightArray: heightsF,
  });
  // Replace the freshly generated normals with the coarse ones, resampled.
  transferGridNormals(base.mesh, N, mesh, Nf, tess);
  mesh.scale = scaleVec.slice();
  if (opts.hidden) mesh.hidden = true;
  return {
    mesh, heights: heightsF, map256: base.map256, N: Nf, baseN: N, tess,
    scaleVec: scaleVec.slice(), extents: TERRAIN_EXTENTS.slice(), coarse: base.mesh,
  };
}

/** Box-average the 256x256 map down to Nf x Nf (Nf <= 256), else bilinear up. */
export function resampleHeights(map256, Nf) {
  if (Nf <= 256 && 256 % Nf === 0) return downsampleHeightmap(map256, Nf);
  const out = new Int32Array(Nf * Nf);
  const s = 256 / Nf;
  for (let r = 0; r < Nf; r++) for (let c = 0; c < Nf; c++) {
    out[r * Nf + c] = Math.trunc(bilinearSample(map256, 256, F(c * s), F(r * s))) | 0;
  }
  return out;
}

/**
 * Bilinearly resample the coarse mesh's per-vertex normals onto the fine
 * lattice.  At c = k*tess, r = m*tess the weights are (1,0,0,0), so the
 * original vertices keep their normal BIT FOR BIT.
 */
export function transferGridNormals(coarse, N, fine, Nf, tess) {
  for (let r = 0; r < Nf; r++) {
    const fr = r / tess, r0 = Math.min(N - 1, Math.floor(fr)), r1 = Math.min(N - 1, r0 + 1);
    const tv = fr - r0;
    for (let c = 0; c < Nf; c++) {
      const fc = c / tess, c0 = Math.min(N - 1, Math.floor(fc)), c1 = Math.min(N - 1, c0 + 1);
      const tu = fc - c0;
      if (tu === 0 && tv === 0) {
        const n = coarse.getNormal(r0 * N + c0);
        fine.setNormal(r * Nf + c, n[0], n[1], n[2]);
        continue;
      }
      const n00 = coarse.getNormal(r0 * N + c0), n10 = coarse.getNormal(r0 * N + c1);
      const n01 = coarse.getNormal(r1 * N + c0), n11 = coarse.getNormal(r1 * N + c1);
      const out = [0, 0, 0];
      for (let k = 0; k < 3; k++) {
        out[k] = F(F(F(n00[k] * (1 - tu)) * (1 - tv)) + F(F(n10[k] * tu) * (1 - tv))
                 + F(F(n01[k] * (1 - tu)) * tv) + F(F(n11[k] * tu) * tv));
      }
      fine.setNormal(r * Nf + c, out[0], out[1], out[2]);
    }
  }
  return fine;
}
