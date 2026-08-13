// eff_b.js — scene B, music pos 0x600 .. 0x800 (video ~25.2 s .. ~40.5 s):
// the SHATTER FIELD — 1024 white translucent triangles tumbling towards the
// camera, under the "why limit ourselves" banner and its running counter.
//
//   generator  FUN_0040c730   (called up front from FUN_0040f285)
//   init       FUN_0040ccd0
//   per frame  FUN_0040cce0
//
// Geometry: ONE 3-vertex / 1-face mesh (the isoceles triangle (-25,-25) (0,25)
// (25,-25), uv (0,0) (0.5,1) (1,0), diffuse 0x7fffffff) re-used 1024 times.
// Per shard the generator stores a position (x,y in [-100,100], z in [0,511]),
// a per-axis size in [0,0.5] and a per-axis rotation phase in [0,pi]; each frame
// the triangle's three vertices are RESIZED in place, the shard is rotated by
// (t*2.7+rx, t*-2.3+ry, t*3.1+rz), and its z is scrolled by t*512 and wrapped
// into [0,511].  The diffuse fades with depth: alpha = 255 - (z >> 1).
//
// Texture: the 64x64 DR-generator bitmap at .rdata 0x41d0e4 — the same one the
// chrome tunnel (scene F, FUN_004087c0) uses, i.e. the baked `dr_64_envmap`.
// Blended additively (SRCALPHA / ONE) with Z-write off, which is what turns the
// warm/rusty texture into pale blue-white glass over the sky-blue background.
//
// Decompile ambiguities resolved from the disassembly:
//   * FUN_004049f5 / FUN_00404f10 / FUN_00404e70 lost their arguments (see
//     eff_a.js); recovered by tracking esp/edi through the `rep movsd` blocks.
//   * The `SetRenderState` calls are ZWRITEENABLE=0, SRCBLEND=SRCALPHA(5),
//     DESTBLEND=ONE(2) before the shard pass and ZWRITEENABLE=1 after it.
//   * The 2D vertices' D3DCOLOR prints as `-NAN`; it is 0xFFD7B45A.
//   * The shard draw is a *non-indexed* DrawPrimitive(TRIANGLELIST, 0x242, v, 3,
//     0x18) with the world matrix pushed through SetTransform — not K.drawMesh.
//
// BATCHING (the one deliberate departure from the original's call sequence):
// the original issues SetTransform + DrawPrimitive once per shard, i.e. 1024
// draw calls a frame, which costs ~35 ms under WebGL.  Nothing varies between
// those calls except the world matrix, the three vertex positions and the
// diffuse, so each shard's world transform is applied on the CPU here and all
// 1024 triangles go out in ONE DrawPrimitive with WORLD = identity.  Same
// shards, same order, same colours, same pixels — and the shards are additively
// blended with Z-write off, so draw order cannot matter either way.
//   * 0x4125b0/0x4125a0/0x4127e8/0x4127e0/0x4127d8/0x4127d0/0x4127c8/0x4127c0/
//     0x4127b8/0x412780/0x412778/0x412720/0x4127a0/0x412508/0x4120a8 are qword
//     (double) loads; 0x412458/0x412548/0x4127b0/0x4127ac/0x4127a8/0x412448 and
//     0x412788..0x412798 are dword (float) loads.

import {
  D3DMatrix, D3DTS_WORLD, D3DPT_TRIANGLELIST, FVF_XYZ_DIFFUSE_TEX2,
  D3DRS_ZWRITEENABLE, D3DRS_SRCBLEND, D3DRS_DESTBLEND,
  D3DBLEND_SRCALPHA, D3DBLEND_ONE,
} from '../minid3d7.js';
import { createMesh, createCamera } from '../kernel.js';

const SKY = 0xff7dafc8;
const FOG_DENSITY = 0.009999999776482582;    // DAT_0041a2ac = 0x3c23d70a (fog stays OFF)

// Timing: driven from timeGetTime in the original.  The clock is ANCHORED to
// the music position (a constant 120 ms/row — XM speed 6 @ 125 BPM) with only
// the sub-row remainder taken from `extra.ms`, so a single debug frame is exact
// and playback stays smooth per frame rather than per row.
const MS_PER_ROW = 120;
const rawPos = (p) => (p > 0x1ff ? p - 0x200 : p);
const rowOf = (p) => { const r = rawPos(p); return (r >> 8) * 64 + (r & 0xff); };
const SCENE_START_ROW = 4 * 64;              // normalized pos 0x600 == raw 0x400

// --- the intro's rand(), see eff_a.js --------------------------------------
// FUN_0040c730 runs after FUN_00407380 (scene A, 400 draws), which itself runs
// 141482 draws into the sequence.
const RAND_PRESKIP = 32 * 4096 + 256 + 2048 * 4 + 1962 + 200 * 2;   // 141882
const INV32767 = 3.0518509475997192e-05;

function makeRand(skip) {
  let lo = 0x28c9, hi = 0xabf8;
  const step = () => {
    const l = lo * 0x4e35;
    const carry = ((l & 0xffff) === 0xffff) ? 1 : 0;
    const nlo = ((l & 0xffff) + 1) & 0xffff;
    hi = ((l >>> 16) + hi * 0x4e35 + lo * 0x15a + carry) & 0xffff;
    lo = nlo;
    return hi & 0x7fff;
  };
  for (let i = 0; i < skip; i++) step();
  return step;
}

/** x87 fistp / (int)ROUND — round half to even. */
function rn(x) {
  const f = Math.floor(x), d = x - f;
  if (d < 0.5) return f;
  if (d > 0.5) return f + 1;
  return (f & 1) ? f + 1 : f;
}

/**
 * FUN_004017f0 — rotX(rx) * rotY(ry) * rotZ(rz), written into a row-major
 * D3DMatrix in place (D3DMatrix.rotation*() allocate, and this runs 1024x per
 * frame).  Expanded from the same three factors minid3d7's rotationX/Y/Z build.
 */
function setRotXYZ(M, rx, ry, rz) {
  const cx = Math.cos(rx), sx = Math.sin(rx);
  const cy = Math.cos(ry), sy = Math.sin(ry);
  const cz = Math.cos(rz), sz = Math.sin(rz);
  M[0] = cy * cz;                 M[1] = cy * sz;                 M[2] = -sy;      M[3] = 0;
  M[4] = sx * sy * cz - cx * sz;  M[5] = sx * sy * sz + cx * cz;  M[6] = sx * cy;  M[7] = 0;
  M[8] = cx * sy * cz + sx * sz;  M[9] = cx * sy * sz - sx * cz;  M[10] = cx * cy; M[11] = 0;
  M[12] = 0; M[13] = 0; M[14] = 0; M[15] = 1;
}

const SHARDS = 1024;

// --- the 2D design layer (all 0xFFD7B45A; only y is animated) ---------------
const YELLOW = 0xffd7b45a;
const DESIGN = [
  { v: [[115, 368], [115, 288], [230, 288], [246, 320], [377, 320], [390, 288],
        [477, 288], [477, 275], [631, 275], [631, 407], [477, 407], [477, 370],
        [380, 370], [368, 392], [254, 392], [242, 368]],
    t: [[0, 1, 2], [0, 2, 15], [2, 3, 15], [15, 3, 4], [4, 15, 13], [15, 13, 14],
        [4, 13, 12], [12, 5, 4], [5, 6, 12], [6, 12, 11], [7, 11, 8], [8, 11, 9],
        [11, 9, 10]] },
  { v: [[448, 373], [474, 373], [474, 399], [448, 399]], t: [[0, 1, 2], [2, 3, 0]] },
  { v: [[471, 404], [477, 404], [477, 407], [471, 407]], t: [[0, 1, 2], [2, 3, 0]] },
];

export function makeScene(ctx, variant = 0) {
  const { K, d3d, textures } = ctx;

  let cam = null, tri = null, tex = null;
  let sPos = null, sSize = null, sRot = null;
  const mRot = new D3DMatrix();
  const IDENTITY = new D3DMatrix();
  // one interleaved FVF-0x242 block for all 1024 shards (3 vertices each)
  const batch = new Float32Array(SHARDS * 3 * 8);
  const batchU32 = new Uint32Array(batch.buffer);
  const V = [[0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0],
             [0, 0, 0, 0, 0, 0, 0, 0, 0]];

  // sub-row interpolation: wall-clock ms since the music position last advanced
  let lastPos = -1, lastWall = 0;
  function subRow(pos, extra) {
    // Exact fraction through the current row, measured from the audio clock.
    // The wall-clock reconstruction below is a fallback for the debug path; it
    // re-anchors on pos changes and clamps, which visibly steps during playback.
    if (extra && typeof extra.rowFrac === 'number') return extra.rowFrac * MS_PER_ROW;
    const wall = extra && typeof extra.ms === 'number' ? extra.ms : 0;
    if (pos !== lastPos) { lastPos = pos; lastWall = wall; }
    let f = wall - lastWall;
    if (!(f > 0)) f = 0;
    return f > MS_PER_ROW ? MS_PER_ROW : f;
  }

  function build() {
    const rand = makeRand(RAND_PRESKIP);
    cam = createCamera(0, 0, 0, 0, 0, 0);
    tex = textures.dr_64_envmap;                  // FUN_00405fe6(&DAT_0041d0e4, 64, 64, 0)

    tri = createMesh(3, 1);
    tri.flags |= 1;
    const P = [-25, -25, 0, 0, 0, /**/ 0, 25, 0, 0.5, 1.0, /**/ 25, -25, 0, 1, 0];
    for (let i = 0; i < 3; i++) {
      const b = i * 8, s = i * 5;
      tri.verts[b] = P[s]; tri.verts[b + 1] = P[s + 1]; tri.verts[b + 2] = P[s + 2];
      tri.vertsU32[b + 3] = 0x7fffffff;
      tri.verts[b + 4] = P[s + 3]; tri.verts[b + 5] = P[s + 4];
    }
    tri.indices.set([0, 1, 2]);

    sPos = new Float32Array(SHARDS * 3);
    sSize = new Float32Array(SHARDS * 3);
    sRot = new Float32Array(SHARDS * 3);
    for (let i = 0; i < SHARDS; i++) {
      const b = i * 3;
      sPos[b] = Math.fround(rand() * INV32767 * 200.0 - 100.0);
      sPos[b + 1] = Math.fround(rand() * INV32767 * 200.0 - 100.0);
      sPos[b + 2] = Math.fround(rand() * INV32767 * 511.0);
      sSize[b] = Math.fround(rand() * INV32767 * 0.5);
      sSize[b + 1] = Math.fround(rand() * INV32767 * 0.5);
      sSize[b + 2] = Math.fround(rand() * INV32767 * 0.5);
      sRot[b] = Math.fround(rand() * INV32767 * Math.PI);
      sRot[b + 1] = Math.fround(rand() * INV32767 * Math.PI);
      sRot[b + 2] = Math.fround(rand() * INV32767 * Math.PI);
    }
  }

  return {
    init() { if (!tri) build(); },

    render(pos, extra) {
      if (!tri) build();

      if (d3d.clearColor !== SKY) { d3d.clearColor = SKY; d3d.Clear(3, SKY, 1.0); }
      d3d.SetRenderState(34 /* FOGCOLOR */, SKY);
      d3d.SetRenderState(38 /* FOGDENSITY */, FOG_DENSITY);
      d3d.setFog(0);            // FUN_0040cce0 never re-enables it (inherited off)

      const ms = (rowOf(pos) - SCENE_START_ROW) * MS_PER_ROW + subRow(pos, extra);
      const T = Math.fround(ms * 0.00083333333333333339);      // _DAT_00510310

      d3d.setStage1Op(0);
      K.setTextureHandle(tex);

      // ---- camera ----------------------------------------------------------
      cam.fov = 120.0;
      cam.roll = Math.fround(Math.sin(T * 0.67300000000000004));
      cam.ex = Math.fround(Math.sin(T * 3.8145769999999999) * 50.0);
      cam.ey = Math.fround(Math.cos(T * 2.3145769999999999) * 50.0);
      cam.ez = 80.0;
      cam.ax = Math.fround(Math.sin(T * 2.1716099999999998) * 300.0);
      cam.ay = Math.fround(Math.sin(T * 1.3737299999999999) * 300.0);
      cam.az = 511.0;
      K.setCamera(cam);

      d3d.setAlphaBlend(1);
      d3d.SetRenderState(D3DRS_ZWRITEENABLE, 0);
      d3d.SetRenderState(D3DRS_SRCBLEND, D3DBLEND_SRCALPHA);
      d3d.SetRenderState(D3DRS_DESTBLEND, D3DBLEND_ONE);
      d3d.setCullMode(0);

      // ---- 1024 shards -----------------------------------------------------
      const rxT = T * 2.7000000000000002;
      const ryT = T * -2.2999999999999998;
      const rzT = T * 3.1000000000000001;
      const zScroll = T * 512.0;
      const M = mRot.m, TV = tri.verts, TU = tri.vertsU32;
      let o = 0;
      for (let i = 0; i < SHARDS; i++) {
        const b = i * 3;
        // FUN_004017f0(m, rx, ry, rz) = rotX * rotY * rotZ
        setRotXYZ(M, Math.fround(rxT + sRot[b]),
                  Math.fround(ryT + sRot[b + 1]), Math.fround(rzT + sRot[b + 2]));

        const sx = sSize[b], sy = sSize[b + 1];
        TV[0] = Math.fround(sx * -25.0);               // v0.x
        TV[16] = Math.fround(sx * 25.0);               // v2.x
        TV[17] = Math.fround(sy * -25.0);              // v2.y
        TV[1] = TV[17];                                // v0.y
        TV[9] = Math.fround(sy * 25.0);                // v1.y

        const z = rn(Math.fround(sPos[b + 2] - zScroll)) & 0x1ff;
        const col = ((((-1 - (z >> 1)) & 0xff) << 24) | 0xffffff) >>> 0;
        TU[3] = col; TU[11] = col; TU[19] = col;

        // FUN_00401a50(m, x, y, z) — the translation row of the world matrix
        const tx = sPos[b], ty = sPos[b + 1], tz = z;

        // ...which the original would hand to SetTransform(WORLD); here the
        // three vertices go through it on the CPU and into the shared batch.
        for (let v = 0; v < 3; v++) {
          const s = v * 8;
          const x = TV[s], y = TV[s + 1], zz = TV[s + 2];
          batch[o] = x * M[0] + y * M[4] + zz * M[8] + tx;
          batch[o + 1] = x * M[1] + y * M[5] + zz * M[9] + ty;
          batch[o + 2] = x * M[2] + y * M[6] + zz * M[10] + tz;
          batchU32[o + 3] = TU[s + 3];
          batch[o + 4] = TV[s + 4]; batch[o + 5] = TV[s + 5];
          batch[o + 6] = TV[s + 6]; batch[o + 7] = TV[s + 7];
          o += 8;
        }
      }
      d3d.SetTransform(D3DTS_WORLD, IDENTITY);
      d3d.DrawPrimitive(D3DPT_TRIANGLELIST, FVF_XYZ_DIFFUSE_TEX2, batch, SHARDS * 3, 0x18);

      // ---- 2D design layer -------------------------------------------------
      K.setTextureHandle(null);
      d3d.setAlphaBlend(0);
      d3d.SetRenderState(D3DRS_ZWRITEENABLE, 1);

      let slide = Math.fround(200.0 - ms * 0.25);        // drops in from below
      if (slide < 0.0) slide = 0.0;
      const yOff = slide + 40.0;

      for (const g of DESIGN) {
        for (const t of g.t) {
          for (let n = 0; n < 3; n++) {
            const p = g.v[t[n]], v = V[n];
            v[0] = p[0]; v[1] = p[1] + yOff;
            v[2] = 0.01; v[3] = 100.0; v[4] = YELLOW;
            v[5] = 0; v[6] = 0; v[7] = 0; v[8] = 0;
          }
          K.drawTri2D(V[0], V[1], V[2]);
        }
      }

      K.drawTextAt('#', 456.0, slide + 417.0, 256.0, 0xff000000);
      K.drawTextAt('why', 138.0, slide + 364.0, 256.0, 0xff000000);
      K.drawTextAt('limit', 264.0, slide + 387.0, 256.0, 0xff000000);
      K.drawTextAt('ourselves', 399.0, slide + 360.0, 200.0, 0xff000000);

      // the running counter — four digits drawn right-aligned at fixed columns
      const n = rn(Math.fround(ms * 0.10000000000000001));
      const cy = slide + 416.0;
      K.drawTextRight(String(Math.trunc(n / 1000) % 10), 515.0, cy, 256.0, 0xff000000);
      K.drawTextRight(String(Math.trunc(n / 100) % 10), 545.0, cy, 256.0, 0xff000000);
      K.drawTextRight(String(Math.trunc(n / 10) % 10), 575.0, cy, 256.0, 0xff000000);
      K.drawTextRight(String(n % 10), 605.0, cy, 256.0, 0xff000000);
    },
  };
}
