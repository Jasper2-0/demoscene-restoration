// eff_c.js — scene C, music pos 0x800 .. 0xa00 (video ~40.5 s .. ~55.8 s):
// "MASS MEDIA" — a scrolling grid floor under 312 bouncing golden glyphs, with
// one huge sky-blue copy of the same glyph composited on top.
//
//   generator     FUN_0040aca0   (called up front from FUN_0040f285)
//   init          FUN_0040af60
//   per frame     FUN_0040af80
//   draw helpers  FUN_0040aba0 (wrapped small glyph) / FUN_0040ac70 (big glyph)
//
// Assets built by the generator:
//   * a 256x256 radial glow (FUN_0040607f with k = 1.1) used as the env map for
//     both glyph meshes;
//   * a 256x256 grid: black with a white line every 16 texels in both
//     directions — the floor (see gridTexture() for the opacity note);
//   * TWO copies of one embedded mesh (FUN_0040aa40 over the byte blob at
//     .rdata 0x421394: u8 vertexCount, u8 faceCount, then int16 x,y,z scaled by
//     1/256, then u8 index triples).  48 vertices / 92 faces — a flat outline
//     extruded 25 units in z.  Copy 1 is scale 0.25 with every vertex diffuse
//     0xFFD7B45A (the golden ones); copy 2 is scale 2.0 with diffuse 0xFF7DAFC8
//     (the big blue one).  Both get their spherical env-map UVs baked ONCE at
//     generation time, with the world matrix still identity;
//   * a 2000x2000 ground quad at y = -10, uv 0..5 (a 5x5 tiling of the grid).
//
// Per frame: the floor's UVs scroll by (scrollX, scrollZ)/512, where
//     scrollX = sin(t*0.336)*750 + 750,  scrollZ = cos(t*0.421)*750 + 750
// and the same two values feed FUN_0040aba0's wrap, so the glyph lattice
// (13 columns x = -450..450 step 75, 24 rows z = -420..385 step 35) scrolls with
// the floor, wrapping modulo 975 x 840.  Each glyph's height is a rectified
// cosine, phase-shifted by its lattice index -> the travelling bounce wave.
// EXP fog (sky blue, density 0.003) is what fades the lattice into the horizon.
//
// Decompile ambiguities resolved from the disassembly:
//   * FUN_0040aa40's return value (the mesh pointer) was lost by Ghidra.
//   * FUN_004049f5's three arguments and FUN_00404f10's five were lost; the
//     triangles below come from tracking esp/edi through the `rep movsd` blocks,
//     the text call is ("mass media", x=50, y=420, scale=287, 0xFF000000).
//   * The bare `SetRenderState` calls are ZWRITEENABLE=1 at the top of the
//     frame, then ZFUNC=ALWAYS(8) + ZWRITEENABLE=0 before the 2D layer and the
//     big glyph, and ZWRITEENABLE=1 + ZFUNC=LESSEQUAL(4) at the very end.
//   * 0x412698/0x412690/0x412680/0x412510/0x412678/0x412470/0x412658/0x412660/
//     0x412668/0x4120a8/0x4120b0/0x412088 are qword (double) loads;
//     0x412688 (750), 0x412650 (35), 0x412654 (75), 0x412670 (1/300),
//     0x41264c (450), 0x412648 (420) are dword (float) loads.
//   * ALPHABLENDENABLE is never touched by FUN_0040af80 — from the second frame
//     on it is ON with SRCALPHA/INVSRCALPHA, left behind by the text engine
//     (FUN_00404f10) at the end of the previous frame.  Set explicitly here so
//     frame 1 looks like every other frame.  (Every texture in this scene is
//     opaque, so it is only the text overlay that actually blends.)
//
// BATCHING: the original calls FUN_00402180 (SetTransform + DrawIndexedPrimitive)
// once per lattice glyph, i.e. 312 draw calls a frame.  Nothing varies between
// them except the world matrix, so each copy's transform is applied on the CPU
// and all 312 go out in one indexed draw with WORLD = identity.  Same copies,
// same order, same pixels — only the call sequence differs.

import {
  D3DMatrix, D3DTS_WORLD, D3DPT_TRIANGLELIST, FVF_XYZ_DIFFUSE_TEX2,
  D3DRS_ZWRITEENABLE, D3DRS_ZFUNC, D3DRS_SRCBLEND, D3DRS_DESTBLEND,
  D3DCMP_ALWAYS, D3DCMP_LESSEQUAL, D3DBLEND_SRCALPHA, D3DBLEND_INVSRCALPHA,
  D3DTEX_MIPMAP,
} from '../minid3d7.js';
import { createMesh, createCamera, setMeshRotation, meshEnvMapUV } from '../kernel.js';

const SKY = 0xff7dafc8;
const FOG_DENSITY = 0.003000000026077032;     // DAT_0041a2ac = 0x3b449ba6

// Timing: driven from timeGetTime in the original.  The clock is ANCHORED to
// the music position (a constant 120 ms/row — XM speed 6 @ 125 BPM) with only
// the sub-row remainder taken from `extra.ms`, so a single debug frame is exact
// and playback stays smooth per frame rather than per row.
const MS_PER_ROW = 120;
const rawPos = (p) => (p > 0x1ff ? p - 0x200 : p);
const rowOf = (p) => { const r = rawPos(p); return (r >> 8) * 64 + (r & 0xff); };
const SCENE_START_ROW = 6 * 64;               // normalized pos 0x800 == raw 0x600

/** x87 fistp / (int)ROUND — round half to even. */
function rn(x) {
  const f = Math.floor(x), d = x - f;
  if (d < 0.5) return f;
  if (d > 0.5) return f + 1;
  return (f & 1) ? f + 1 : f;
}

// ---------------------------------------------------------------------------
// FUN_0040607f — the 256x256 radial glow, k = 1.1 here.
// ---------------------------------------------------------------------------
function radialGlow(k) {
  const px = new Uint32Array(256 * 256);
  let p = 0;
  for (let y = -128; y < 128; y++) {
    for (let x = -128; x < 128; x++) {
      const r = Math.fround(Math.sqrt(x * x + y * y));
      let i = rn(Math.fround((255.0 - (r + r)) * k));
      if (i > 0) i = (i * i) >> 8;
      if (i < 0) i = 0;
      if (i > 0xff) i = 0xff;
      px[p++] = ((i * 0x10101) - 0x1000000) >>> 0;
    }
  }
  return px;
}

/**
 * The 256x256 grid floor: white lines every 16 texels over black.
 *
 * FUN_0040aca0 fills the buffer with literal 0x00000000 and the lines with
 * 0xffffffff, then uploads it through FUN_00403bd6 with flags = 0 — i.e. WITHOUT
 * the "alpha surface" bit, so DirectDraw picks a plain RGB565 surface and the
 * alpha byte is thrown away: every texel ends up OPAQUE.  minid3d7 is RGBA8 and
 * documents that it ignores those format bits, so the background has to be
 * written as opaque black here or the floor renders fully transparent (and the
 * reference capture clearly shows a dark, fog-faded floor).
 */
function gridTexture() {
  const px = new Uint32Array(256 * 256).fill(0xff000000);
  for (let r = 0; r < 16; r++) {               // 16 full rows, stride 16
    const base = r * 16 * 256;
    for (let x = 0; x < 256; x++) px[base + x] = 0xffffffff;
  }
  for (let y = 0; y < 256; y++) {              // 16 columns per row, stride 16
    const base = y * 256;
    for (let c = 0; c < 16; c++) px[base + c * 16] = 0xffffffff;
  }
  return px;
}

// ---------------------------------------------------------------------------
// The embedded mesh at .rdata 0x421394, decoded by FUN_0040aa40.
// 48 vertices (int16 x,y,z, * 1/256) and 92 u8 index triples.
// ---------------------------------------------------------------------------
const GLYPH_V = new Int16Array([
  -5178, -31786, 0, -2560, -18986, 0, 2560, -18986, 0, 5183, -31786, 0, 12863, -31786, 0, 10240, 9173, 0,
  12800, 6613, 0, 12800, -6151, 0, 17920, -6151, 0, 17920, 14293, 0, 5120, 14293, 0, 5120, 16853, 0,
  7680, 19413, 0, 7680, 29653, 0, -5120, 29653, 0, -7680, 19413, 0, -5120, 16853, 0, -5120, 14293, 0,
  -17920, 14293, 0, -17920, -6151, 0, -12800, -6151, 0, -12800, 6613, 0, -10240, 9173, 0, -12858, -31786, 0,
  -5178, -31786, 6399, -2560, -18986, 6399, 2560, -18986, 6399, 5183, -31786, 6399, 12863, -31786, 6399, 10240, 9173, 6399,
  12800, 6613, 6399, 12800, -6151, 6400, 17920, -6151, 6400, 17920, 14293, 6399, 5120, 14293, 6399, 5120, 16853, 6399,
  7680, 19413, 6400, 7680, 29653, 6399, -5120, 29653, 6399, -7680, 19413, 6400, -5120, 16853, 6399, -5120, 14293, 6399,
  -17920, 14293, 6399, -17920, -6151, 6400, -12800, -6151, 6400, -12800, 6613, 6399, -10240, 9173, 6399, -12858, -31786, 6399,
]);
const GLYPH_I = new Uint16Array([
  0, 1, 25, 0, 25, 24, 1, 2, 26, 1, 26, 25, 2, 3, 27, 2, 27, 26, 3, 4, 28, 3, 28, 27, 4, 5, 29, 4, 29, 28,
  5, 6, 30, 5, 30, 29, 6, 7, 31, 6, 31, 30, 7, 8, 32, 7, 32, 31, 8, 9, 33, 8, 33, 32, 9, 10, 34, 9, 34, 33,
  10, 11, 35, 10, 35, 34, 11, 12, 36, 11, 36, 35, 12, 13, 37, 12, 37, 36, 13, 14, 38, 13, 38, 37, 14, 15, 39, 14, 39, 38,
  15, 16, 40, 15, 40, 39, 16, 17, 41, 16, 41, 40, 17, 18, 42, 17, 42, 41, 18, 19, 43, 18, 43, 42, 19, 20, 44, 19, 44, 43,
  20, 21, 45, 20, 45, 44, 21, 22, 46, 21, 46, 45, 22, 23, 47, 22, 47, 46, 23, 0, 24, 23, 24, 47, 3, 5, 4, 2, 5, 3,
  22, 0, 23, 22, 1, 0, 19, 21, 20, 18, 21, 19, 18, 22, 21, 17, 22, 18, 12, 14, 13, 12, 15, 14, 11, 15, 12, 11, 16, 15,
  10, 16, 11, 10, 17, 16, 7, 9, 8, 6, 9, 7, 5, 9, 6, 5, 10, 9, 22, 2, 1, 22, 5, 2, 17, 5, 22, 10, 5, 17,
  27, 28, 29, 26, 27, 29, 46, 47, 24, 46, 24, 25, 43, 44, 45, 42, 43, 45, 42, 45, 46, 41, 42, 46, 36, 37, 38, 36, 38, 39,
  35, 36, 39, 35, 39, 40, 34, 35, 40, 34, 40, 41, 31, 32, 33, 30, 31, 33, 29, 30, 33, 29, 33, 34, 46, 25, 26, 46, 26, 29,
  41, 46, 29, 34, 41, 29,
]);

function loadGlyphMesh(diffuse) {
  const nv = GLYPH_V.length / 3, nf = GLYPH_I.length / 3;
  const m = createMesh(nv, nf);
  for (let i = 0; i < nv; i++) {
    const b = i * 8, s = i * 3;
    m.verts[b] = Math.fround(GLYPH_V[s] * 0.00390625);        // 0x412088 = 1/256
    m.verts[b + 1] = Math.fround(GLYPH_V[s + 1] * 0.00390625);
    m.verts[b + 2] = Math.fround(GLYPH_V[s + 2] * 0.00390625);
    m.vertsU32[b + 3] = diffuse;
  }
  m.indices.set(GLYPH_I);
  return m;
}

// --- the static 2D design layer (colour 0xFFD7B45A) -------------------------
const YELLOW = 0xffd7b45a;
const DESIGN_V = [
  [640, 407], [50, 407], [43, 414], [43, 450], [640, 450],
  [100, 450], [640, 450], [640, 460], [100, 460],
];
const DESIGN_T = [[2, 0, 1], [2, 4, 0], [2, 3, 4], [5, 6, 7], [7, 8, 5]];

const GLYPHS = 24 * 13;                       // lattice rows x columns

export function makeScene(ctx, variant = 0) {
  const { K, d3d, textures } = ctx;

  let cam = null, small = null, big = null, ground = null, glow = null, grid = null;
  const V = [[0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0],
             [0, 0, 0, 0, 0, 0, 0, 0, 0]];
  const IDENTITY = new D3DMatrix();
  // one interleaved FVF-0x242 block + index list for all 312 small glyphs; see
  // the batching note in the header.
  const NV = GLYPH_V.length / 3, NF = GLYPH_I.length / 3;
  const batch = new Float32Array(GLYPHS * NV * 8);
  const batchU32 = new Uint32Array(batch.buffer);
  const batchIdx = new Uint16Array(GLYPHS * NF * 3);
  for (let g = 0; g < GLYPHS; g++) {
    for (let k = 0; k < NF * 3; k++) batchIdx[g * NF * 3 + k] = g * NV + GLYPH_I[k];
  }
  let batchOut = 0;
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
    cam = createCamera(-200.0, 160.0, 420.0, -70.0, -180.0, 100.0);
    cam.roll = 0.0;

    glow = textures && textures.proc_radial_k110
      ? d3d.createTextureFromImage(textures.proc_radial_k110, 0 | D3DTEX_MIPMAP)
      : K.createTexture(radialGlow(1.1), 256, 256, 0);

    small = loadGlyphMesh(YELLOW);
    small.flags |= 1;
    small.scale = 0.25;
    big = loadGlyphMesh(SKY);
    big.flags |= 1;
    big.scale = 2.0;
    // both UV sets are baked once, with the world matrix still identity
    meshEnvMapUV(small, cam, 1.0, 1);
    meshEnvMapUV(big, cam, 1.0, 1);

    // flags 0 as in FUN_0040aca0 — see gridTexture()'s note: the original's
    // RGB565 surface discards alpha, so the bake stores an OPAQUE black
    // background too and must not be uploaded as an alpha format.
    grid = textures && textures.proc_grid16
      ? d3d.createTextureFromImage(textures.proc_grid16, 0 | D3DTEX_MIPMAP)
      : K.createTexture(gridTexture(), 256, 256, 0);

    ground = createMesh(4, 2);
    const G = [-1000, -10, -1000, 0, 0,
                1000, -10, -1000, 5, 0,
                1000, -10, 1000, 5, 5,
               -1000, -10, 1000, 0, 5];
    for (let i = 0; i < 4; i++) {
      const b = i * 8, s = i * 5;
      ground.verts[b] = G[s]; ground.verts[b + 1] = G[s + 1]; ground.verts[b + 2] = G[s + 2];
      ground.vertsU32[b + 3] = 0xffffffff;
      ground.verts[b + 4] = G[s + 3]; ground.verts[b + 5] = G[s + 4];
    }
    ground.indices.set([0, 1, 2, 2, 3, 0]);
  }

  /**
   * FUN_0040aba0 — position the small glyph with the lattice wrap, then draw.
   * The draw is batched: the world matrix (a uniform scale plus the translation
   * — rx/ry/rz are always 0 here) is applied to the 48 vertices on the CPU and
   * appended to `batch`, so all 312 copies leave in one indexed draw instead of
   * 312.  `small.m` is still updated exactly as FUN_00402180 would.
   */
  function drawWrapped(scrollX, scrollZ, x, y, z) {
    const i1 = rn(Math.fround(scrollX + x + 450.0));
    const i2 = rn(Math.fround(scrollZ + z + 420.0));
    small.px = (i1 >= 0 ? 1 : -1) * (i1 % 975) - 450.0;
    small.py = y;
    small.pz = (i2 >= 0 ? 1 : -1) * (i2 % 840) - 420.0;

    const M = small.m, SV = small.verts, SU = small.vertsU32;
    M[12] = small.px; M[13] = small.py; M[14] = small.pz;
    let o = batchOut;
    for (let v = 0; v < NV; v++) {
      const s = v * 8;
      const vx = SV[s], vy = SV[s + 1], vz = SV[s + 2];
      batch[o] = vx * M[0] + vy * M[4] + vz * M[8] + M[12];
      batch[o + 1] = vx * M[1] + vy * M[5] + vz * M[9] + M[13];
      batch[o + 2] = vx * M[2] + vy * M[6] + vz * M[10] + M[14];
      batchU32[o + 3] = SU[s + 3];
      batch[o + 4] = SV[s + 4]; batch[o + 5] = SV[s + 5];
      batch[o + 6] = SV[s + 6]; batch[o + 7] = SV[s + 7];
      o += 8;
    }
    batchOut = o;
  }

  return {
    init() { if (!small) build(); },

    render(pos, extra) {
      if (!small) build();

      d3d.setCullMode(1);                                    // FUN_0040484a(3,1)
      if (d3d.clearColor !== SKY) { d3d.clearColor = SKY; d3d.Clear(3, SKY, 1.0); }
      d3d.enableFog(SKY, FOG_DENSITY);                       // FUN_0040484a(4,1)
      d3d.SetRenderState(D3DRS_ZWRITEENABLE, 1);
      // inherited from the previous frame's text pass — see the header note
      d3d.setAlphaBlend(1);
      d3d.SetRenderState(D3DRS_SRCBLEND, D3DBLEND_SRCALPHA);
      d3d.SetRenderState(D3DRS_DESTBLEND, D3DBLEND_INVSRCALPHA);

      const row = rowOf(pos);
      const frac = subRow(pos, extra);
      // FUN_0040af80's bounce phase uses the ABSOLUTE timeGetTime value, so this
      // one is the whole-tune clock, not the scene clock.
      const msAbs = row * MS_PER_ROW + frac;
      const ms = (row - SCENE_START_ROW) * MS_PER_ROW + frac;

      // _DAT_0051023c / _DAT_00510240: both accumulate dt * 0.0003125 every
      // frame, i.e. they are just the scene clock scaled.
      const acc = Math.fround(ms * 0.00031250000000000001);
      const scrollX = Math.fround(Math.sin(acc * 0.33600000000000002) * 750.0 + 750.0);
      const scrollZ = Math.fround(Math.cos(acc * 0.42130000000000001) * 750.0 + 750.0);

      cam.fov = 88.0;
      cam.roll = Math.fround(Math.sin(acc * 0.77300000000000002));
      cam.ex = -200.0; cam.ey = 160.0; cam.ez = 420.0;
      cam.ax = -70.0; cam.ay = -180.0; cam.az = 100.0;
      K.setCamera(cam);

      d3d.setStage1Op(0);

      // ---- the scrolling floor --------------------------------------------
      const us = Math.fround(scrollX * 0.001953125);         // 1/512
      const vs = Math.fround(scrollZ * 0.001953125);
      ground.verts[4] = -us;        ground.verts[5] = -vs;
      ground.verts[12] = 5.0 - us;  ground.verts[13] = -vs;
      ground.verts[20] = 5.0 - us;  ground.verts[21] = 5.0 - vs;
      ground.verts[28] = -us;       ground.verts[29] = 5.0 - vs;
      d3d.setCullMode(0);
      K.setTextureHandle(grid);
      K.drawMesh(ground);

      // ---- 312 bouncing glyphs (24 rows x 13 columns) ----------------------
      K.setTextureHandle(glow);
      // the rotation part of the world matrix never changes (rx=ry=rz=0), but
      // FUN_00402180 rebuilds it on every draw because flags & 1 is set
      setMeshRotation(small, small.rx, small.ry, small.rz);
      batchOut = 0;
      const tick = msAbs | 0;
      let z = -420.0;
      for (let i6 = 0; i6 < 0x14a0; i6 += 0xdc) {
        let x = -450.0;
        for (let i5 = 0; i5 < 0x2db4; i5 += 900) {
          const a = Math.fround((tick + i6 + i5) * 0.0033333334140479565);
          const h = (Math.cos(a) + 1.0) * 0.5 * 48.0 + 1.0;
          const y = Math.fround(Math.abs((50.0 - h) - 25.0) + 25.0);
          drawWrapped(scrollX, scrollZ, x, y, z);
          x = Math.fround(x + 75.0);
        }
        z = Math.fround(z + 35.0);
      }
      d3d.SetTransform(D3DTS_WORLD, IDENTITY);
      d3d.DrawIndexedPrimitive(D3DPT_TRIANGLELIST, FVF_XYZ_DIFFUSE_TEX2,
        batch, GLYPHS * NV, batchIdx, GLYPHS * NF * 3, 0);

      // ---- 2D design layer -------------------------------------------------
      d3d.SetRenderState(D3DRS_ZFUNC, D3DCMP_ALWAYS);
      d3d.SetRenderState(D3DRS_ZWRITEENABLE, 0);
      K.setTextureHandle(null);
      for (const t of DESIGN_T) {
        for (let n = 0; n < 3; n++) {
          const p = DESIGN_V[t[n]], v = V[n];
          v[0] = p[0]; v[1] = p[1];
          v[2] = 0.01; v[3] = 100.0; v[4] = YELLOW;
          v[5] = 0; v[6] = 0; v[7] = 0; v[8] = 0;
        }
        K.drawTri2D(V[0], V[1], V[2]);
      }
      K.drawTextAt('mass media', 50.0, 420.0, 287.0, 0xff000000);

      // ---- the big blue glyph, on a second camera, over everything ---------
      K.setTextureHandle(glow);
      setMeshRotation(big, 0.0, 1.0210176706314087, 0.0);    // FUN_00402230
      cam.ex = -75.0; cam.ey = 75.0; cam.ez = -100.0;
      cam.ax = 0.0; cam.ay = 35.0; cam.az = 0.0;
      cam.roll = 0.0;
      cam.fov = 100.0;
      K.setCamera(cam);
      d3d.setCullMode(1);
      big.px = 140.0; big.py = -100.0; big.pz = 0.0;         // FUN_0040ac70
      K.drawMesh(big);

      d3d.SetRenderState(D3DRS_ZWRITEENABLE, 1);
      d3d.SetRenderState(D3DRS_ZFUNC, D3DCMP_LESSEQUAL);
    },
  };
}
