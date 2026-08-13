// eff_e.js — scene E, music pos [0xc00, 0xe00)  and  scene E2, [0x1200, 0x1400)
//
// Ported one-for-one from work/re/out/lv.c (image base 0x400000):
//
//   generator  FUN_00409bb0
//   init       FUN_00409d8d
//   per frame  FUN_00409da6(param_1)      variant 0 / variant 1
//
// WHAT IT IS
// ----------
// A stack of 32 concentric, textured SQUARES drawn in screen space (FVF 0x244,
// no transforms).  Ring i is a quad whose four corners sit at
// (sin/cos)(sin(phase_i) + k*pi/2) * radius around a wandering centre, with the
// radius growing by a fixed step per ring and every ring's phase lagging the
// one before it by 50 ms.  Each quad has the full 0..1 uv range, so the grid
// texture is stretched over rings of wildly different size and the overlaps
// beat against each other — the "fine blue/white moire grid" of the reference
// capture.  Everything is additive (SRCBLEND = DESTBLEND = ONE) over the
// sky-blue background, at a flat grey 0x1f1f1f1f, so it reads as a faint
// interference pattern that flashes bright on specific music rows.
//
// The DRAW CALL ONLY ASKS FOR 16 RINGS (dwVertexCount = 0x40, dwIndexCount =
// 0x60) even though the buffers hold and the loop fills 32.  That is verbatim
// from the disassembly at 0x40a1ba; the upper 16 rings are dead data.
//
// WHAT `param_1` SELECTS  (this is what the brief asked me to determine)
// ---------------------------------------------------------------------
// It is the "second half" flag, and it does FOUR things:
//   1. re-binds stage 0 from the 256x256 grid-panel texture (DAT_005101e0) to
//      the 64x64 small-grid texture (DAT_005101c0)      — 0x409e4c;
//   2. multiplies the per-ring radius step by 1.5       — 0x409fec;
//   3. adds a second, much brighter flash channel driven by music rows 4/6/7
//      that decays over 0xe0 ms and is allowed up to 0xff instead of 0x1f;
//   4. draws the whole yellow+black "design" overlay and the
//      "cheap / imitations / suck" text, fading in on _DAT_00510200.
// Variant 0 draws nothing but the rings.
//
// TIMEBASE: _DAT_005101bc is 1.0 for both blocks — FUN_0040f285 explicitly
// assigns 1.0 before the 0x1400 block, and the 0xc00 block inherits 1.0 from
// the end of scene D's ramp.  It is therefore a constant here.

import {
  D3DRS_SRCBLEND, D3DRS_DESTBLEND, D3DRS_ZWRITEENABLE,
  D3DBLEND_ONE, D3DBLEND_SRCALPHA, D3DBLEND_INVSRCALPHA,
  D3DPT_TRIANGLELIST, FVF_XYZRHW_DIFFUSE_TEX2, makeVertexScratch,
} from '../minid3d7.js';

// --- .rdata constants ----------------------------------------------------
const PHASE_STEP_MS = 0x32;         // the per-ring 50 ms lag
const PHASE_SCALE   = 1 / 1200;     // 0x4125b0 (double)
const RING_R0       = 100.0;
const RING_STEP     = 45.0;         // 0x420fcc (float)
const FLASH_R0      = 150.0;        // 0x4124b0 (double)
const FLASH_RATE    = 0.1;          // 0x412570 (double)
const BRIGHT_MAX    = 31.0;         // 0x412644 (float)
const STEP_MUL_V1   = 1.5;          // 0x412640 (float)
const CX_RATE       = 1.447;        // 0x412638 (double)
const CX_AMP        = 80.0;         // 0x412630 (float)
const CX_BASE       = 320.0;        // 0x4123d8 (float)
const CY_RATE       = 1.115;        // 0x412628 (double)
const CY_AMP        = 60.0;         // 0x412500 (float)
const CY_BASE       = 240.0;        // 0x4123d4 (float)
const CORNER = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];  // 0x412620/508/618
const ALPHA_RATE    = 1 / 15;       // 0x412610 (double)
const ALPHA_BIAS    = 100;
const FLASH2_MS     = 0xe0;
const RINGS_ALLOC   = 32;
const RINGS_DRAWN   = 16;

const DESIGN_YELLOW_RGB = 0xd7b45a;

// The 0x1f1f1f1f / z / rhw immediates FUN_00409bb0 stamps into every vertex.
const V_Z_BITS   = 0x3f7fff58;
const V_RHW_BITS = 0x3f800054;
const V_COLOR0   = 0x1f1f1f1f;

// --- FUN_00409da6's variant-1 overlay, transcribed from 0x40a2a4 / 0x40a6e8
// (Ghidra emits the three stack copies before each FUN_004049f5 in reverse
//  argument order — the LAST one listed lands at the lowest address and is
//  therefore arg0.  Verified against the disassembly.)
const OVL1_XY = [
  [18, 347], [18, 389], [32, 403], [67, 403], [67, 471], [149, 471],
  [163, 457], [219, 457], [219, 372], [163, 372], [163, 347],
  [173, 337], [229, 337], [229, 362], [173, 362], [0, 0],
];
const OVL1_TRIS = [
  [0, 1, 2], [0, 10, 2], [2, 3, 10], [3, 10, 9], [3, 9, 6],
  [3, 4, 5], [3, 5, 6], [6, 9, 8], [6, 7, 8], [11, 12, 13], [13, 14, 11],
];
// v11..v14 are then reassigned and the last two triangles repeat.
const OVL1_XY_B = [[47, 413], [100, 413], [100, 471], [47, 471]];
const OVL1_TRIS_B = [[11, 12, 13], [13, 14, 11]];

const OVL2_XY = [
  [18, 333], [19, 333], [19, 343], [18, 343],
  [162, 333], [163, 333], [163, 343], [162, 343],
  [90, 333], [91, 333], [91, 343], [90, 343],
  [18, 343], [163, 343], [163, 344], [18, 344],
];
const OVL2_TRIS = [
  [0, 1, 2], [2, 3, 0], [4, 5, 6], [6, 7, 4],
  [8, 9, 10], [10, 11, 8], [12, 13, 14], [14, 15, 12],
];

const _fb = new ArrayBuffer(4);
const _fu = new Uint32Array(_fb), _ff = new Float32Array(_fb);
function f32(bits) { _fu[0] = bits >>> 0; return _ff[0]; }

/** x87 `fistp`, default rounding (nearest, ties to even). */
function ftol(x) {
  const r = Math.round(x);
  return (x - Math.floor(x) === 0.5 && (r & 1)) ? r - 1 : r;
}

/**
 * FUN_00409bb0's texture post-process: zero a 2-pixel-wide black grid every
 * `step` pixels in BOTH directions over the DR-decoded bitmap.  The shipped
 * baked assets (web/assets/dr_256_grid_panels.png with step 8 and
 * dr_64_grid_small.png with step 4) already have this applied — verified
 * byte-exact against work/baked/dr/*_raw.png — and the operation is
 * idempotent, so binding them directly is equivalent.  Kept for fidelity and
 * for anyone re-baking from the raw decode.
 */
export function applyGridLines(px, w, h, step) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if ((x % step) < 2 || (y % step) < 2) px[y * w + x] = 0xff000000;
    }
  }
  return px;
}

// =========================================================================

export function makeScene(ctx, variant = 0) {
  const { K, d3d, textures } = ctx;
  const v1 = variant !== 0;

  let phase, verts, idx;
  let t0 = 0;             // _DAT_00510200
  let flash = false;      // DAT_005101b0
  let flashT0 = 0;        // _DAT_005101f8
  let flash2 = false;     // DAT_005101fc   (variant 1 only)
  let flash2T0 = 0;       // _DAT_005101d8
  let entered = false;
  let lastPos = -1;

  const FADE = 1.0;       // _DAT_005101bc — see the header note

  const tri = [
    [0, 0, 0.01, 100, 0, 0, 0, 0, 0],
    [0, 0, 0.01, 100, 0, 0, 0, 0, 0],
    [0, 0, 0.01, 100, 0, 0, 0, 0, 0],
  ];

  function init() {
    // --- FUN_00409bb0 (the parts that are not the two DR textures) --------
    phase = new Float32Array(RINGS_ALLOC);
    verts = makeVertexScratch(FVF_XYZRHW_DIFFUSE_TEX2, RINGS_ALLOC * 4);
    idx = new Uint16Array(RINGS_ALLOC * 6);

    const Z = f32(V_Z_BITS), RHW = f32(V_RHW_BITS);
    for (let i = 0; i < RINGS_ALLOC * 4; i++) {
      const b = verts.base(i);
      verts.f32[b + 2] = Z;
      verts.f32[b + 3] = RHW;
      verts.u32[verts.colorIndex(i)] = V_COLOR0;
      const c = i & 3;                              // 0:(0,0) 1:(1,0) 2:(1,1) 3:(0,1)
      verts.f32[b + 5] = (c === 1 || c === 2) ? 1.0 : 0.0;
      verts.f32[b + 6] = (c === 2 || c === 3) ? 1.0 : 0.0;
    }
    for (let q = 0; q < RINGS_ALLOC; q++) {
      const b = q * 4, o = q * 6;
      idx[o] = b; idx[o + 1] = b + 1; idx[o + 2] = b + 2;
      idx[o + 3] = b + 2; idx[o + 4] = b + 3; idx[o + 5] = b;
    }
  }

  /**
   * FUN_00409d8d.  It is called right before the 0x1400 block (variant 1) but
   * NOT before the 0xe00 block — variant 0 inherits the timestamp taken at the
   * start of scene D's block, so its ring phases run continuously across the
   * D -> E cut.  eff_d.js owns that timestamp and this is a separate module,
   * so variant 0 keeps t0 = 0 (the demo clock) in both places: a constant
   * phase shift versus the original, but no visible rewind at the cut.
   */
  function reset(ms) {
    if (v1) t0 = ms;
    flash = false; flash2 = false;
  }

  function drawTris(list, xy, color, slotOverride) {
    for (const t of list) {
      for (let k = 0; k < 3; k++) {
        const src = slotOverride && slotOverride[t[k]] ? slotOverride[t[k]] : xy[t[k]];
        tri[k][0] = src[0];
        tri[k][1] = src[1];
        tri[k][4] = color;
      }
      K.drawTri2D(tri[0], tri[1], tri[2]);
    }
  }

  function render(pos, extra) {
    const ms = (extra && extra.ms) || 0;
    if (!entered || pos < lastPos) reset(ms);
    entered = true; lastPos = pos;

    // 32 ring phases, each lagging 50 ms behind the previous one
    for (let i = 0; i < RINGS_ALLOC; i++) {
      phase[i] = (ms - i * PHASE_STEP_MS - t0) * PHASE_SCALE;
    }

    const row = pos & 0x1f;
    if (row === 0x14 || row === 0x16 || row === 0x17) { flash = true; flashT0 = ms; }

    K.setTextureHandle(textures.dr_256_grid_panels, null);   // FUN_0040406d(0x5101e0, 0)
    if (v1) K.setTextureHandle(textures.dr_64_grid_small, null);  // ... (0x5101c0, 0)

    d3d.dispatchState(1, 0);           // stage 1 DISABLE
    d3d.dispatchState(3, 0);           // cull NONE
    d3d.dispatchState(5, 1);           // alpha blend on
    d3d.SetRenderState(D3DRS_SRCBLEND, D3DBLEND_ONE);
    d3d.SetRenderState(D3DRS_DESTBLEND, D3DBLEND_ONE);   // additive

    let radius = RING_R0;
    let step = RING_STEP;
    if (flash) {
      step = FLASH_R0 - (ms - flashT0) * FLASH_RATE;
      if (step < RING_STEP) { flash = false; step = RING_STEP; }
    }

    let bright = ftol(FADE * BRIGHT_MAX);
    if (flash) bright = ftol((ms - flashT0) * FLASH_RATE);
    if (bright > 0x1f) bright = 0x1f;

    let alpha = 0;
    if (v1) {
      if (row === 4 || row === 6 || row === 7) { flash2 = true; flash2T0 = ms; }
      if (flash2) {
        const dt = ftol(ms - flash2T0);
        bright += FLASH2_MS - dt;
        if (dt > FLASH2_MS) flash2 = false;
      }
      if (bright > 0xff) bright = 0xff;

      alpha = ftol((ms - t0) * ALPHA_RATE) - ALPHA_BIAS;
      if (alpha < 0) alpha = 0;
      if (alpha > 0xff) alpha = 0xff;
    }

    const color = Math.imul(bright, 0x1010101) >>> 0;
    if (v1) step *= STEP_MUL_V1;

    const F = verts.f32, U32 = verts.u32;
    for (let i = 0; i < RINGS_ALLOC; i++) {
      const p = phase[i];
      const a = Math.sin(p);
      const cx = Math.sin(p * CX_RATE) * CX_AMP + CX_BASE;
      const cy = Math.cos(p * CY_RATE) * CY_AMP + CY_BASE;
      for (let c = 0; c < 4; c++) {
        const vi = i * 4 + c, b = verts.base(vi);
        F[b]     = Math.sin(a + CORNER[c]) * radius + cx;
        F[b + 1] = Math.cos(a + CORNER[c]) * radius + cy;
        U32[verts.colorIndex(vi)] = color;
      }
      radius += step;
    }

    d3d.DrawIndexedPrimitive(D3DPT_TRIANGLELIST, FVF_XYZRHW_DIFFUSE_TEX2,
      verts.bytes, RINGS_DRAWN * 4, idx, RINGS_DRAWN * 6, 0);

    if (!v1) { d3d.dispatchState(5, 0); return; }

    // ---- variant-1 design overlay ---------------------------------------
    d3d.SetRenderState(D3DRS_SRCBLEND, D3DBLEND_SRCALPHA);
    d3d.SetRenderState(D3DRS_DESTBLEND, D3DBLEND_INVSRCALPHA);
    d3d.SetRenderState(D3DRS_ZWRITEENABLE, 1);
    d3d.dispatchState(5, 1);

    K.setTextureHandle(null);
    const yellow = (((alpha << 24) >>> 0) + DESIGN_YELLOW_RGB) >>> 0;
    drawTris(OVL1_TRIS, OVL1_XY, yellow);
    drawTris(OVL1_TRIS_B, OVL1_XY, yellow,
      { 11: OVL1_XY_B[0], 12: OVL1_XY_B[1], 13: OVL1_XY_B[2], 14: OVL1_XY_B[3] });

    K.setTextureHandle(null);
    const black = (alpha << 24) >>> 0;
    drawTris(OVL2_TRIS, OVL2_XY, black);

    K.drawTextAt('cheap',      28.0, 352.0, 200.0, black);
    K.drawTextAt('imitations', 28.0, 378.0, 200.0, black);
    K.drawTextAt('suck',       80.0, 418.0, 256.0, black);

    d3d.dispatchState(5, 0);
  }

  return { init, render };
}
