// scene_camera.js — Sonnet, timeline object 2.
//
// ===========================================================================
// CORRECTION TO re/ENGINE.md AND TO THE BRIEF: object 2 IS NOT THE CAMERA.
//
// ENGINE.md guessed "camera: m0 x 28 stepping through keyframe indices".  The
// class is actually the ragged **BORDER** that frames the picture, and the m0
// parameter is an `srand()` SEED, not a keyframe index.  Evidence, all from
// the image (VA 0x401000 = offset 0 in unpacked/sonnet_img.bin):
//
//   * The object table at 0x41a00c is indexed by the class-id array at
//     0x41a038 = [1,2,0,3,3,3,3,3,3,3,3].  Object 2 therefore uses class 0,
//     whose factory is FUN_00402cdf -> `new 0x38` + FUN_00406539.
//   * FUN_00406539 (the ctor) allocates THREE 0x1600-byte vertex blocks.
//     0x1600 = 5632 = 4 strips x 16 stations x 2 verts x 44 bytes, and it
//     writes only uv0 (u = rand01(), v = -5.0 / +1.0), diffuse = 0 and
//     pos.z = 0 into them — it is a vertex buffer in the one FVF (0x252).
//   * It then builds a 0x2d0-byte (360 u16 = 120 triangle) index list of
//     4 x 15 quads, i.e. four independent strips.
//   * FUN_00406438 (disassembled + read from the decompile) fills a block with
//     four screen-edge strips in NDC: edge 0 at x = -1, edge 1 at x = +1,
//     edge 2 at y = +1, edge 3 at y = -1, each with 16 stations stepping the
//     other axis by 0.13333334 from +1 down to -1, and an inner vertex offset
//     by `level * 0.06666667 + 0.01` where `level` is a 0..3 random walk.
//     The top/bottom strips scale that offset by 4/3 (0x418314) so the frame
//     is the same width in PIXELS on a 640x480 screen.
//   * The vtable at 0x41831c is {init 0x40668c, render 0x4066a4, event
//     0x406783}.  Neither FUN_004066a4 nor FUN_00406783 is present in
//     re/out/sonnet.c, so both were disassembled by hand.
//   * FUN_00406783: after the shared FUN_00406127 tail, `if (method == 0)`
//     -> morphing = true; srand((int)param); FUN_00406438(targetBuffer).
//     That is the whole of m0.  The 28 m0 events (3,4,5,7,8..33,50) are seeds.
//   * FUN_004066a4: dest.xy = lerp(current, target, s) for 128 vertices with
//     s = 0.5 - 0.5*cos(PI*t) (the PI is the DOUBLE at 0x418220), t advanced
//     by dt*0.01; at t >= 1 the target is memcpy'd over the current and t
//     resets.  Then one DrawIndexedPrimitiveUP(TRIANGLELIST, 0, 0x80, 0x78,
//     idx, D3DFMT_INDEX16, verts, 0x2c) after FUN_00401bd0 (= reset2D).
//
// The vertices' diffuse is 0x00000000, so with the default stage-0 op
// MODULATE(texture, diffuse) the frame draws BLACK regardless of what texture
// is bound.  The 32x32 texture the ctor bakes from texgen program 12 (which
// the manifest confirms is an EMPTY program) is never bound by anything — it
// is dead code.
//
// Layer: the script sends m252 = 15.0, and m252 is `this->layer` (byte +0x14,
// FUN_00406127 case -4).  So the border draws in the last of the sixteen
// passes, over the scenes (layer 2), the compositor (3) and the poem (14).
// ===========================================================================

import {
  D3DPT_TRIANGLELIST, D3DFMT_INDEX16, FVF_SONNET_STRIDE,
} from './minid3d8.js';
import { SceneObjectBase } from './text.js';

// --- constants, read out of the image, never from the decompile -------------
const C = {
  T_RATE:    0.01,                 // 0x418260  t += dt * 0.01
  STATION:   0.13333334028720856,  // 0x418310  station step along the edge
  LEVEL:     0.06666667014360428,  // 0x418318  depth per random-walk level
  ASPECT:    1.3333333730697632,   // 0x418314  4/3, top/bottom depth fixup
  BASE:      0.01,                 // 0x418260  depth of level 0
};
const STRIPS = 4, STATIONS = 16, VERTS = STRIPS * STATIONS * 2;   // 128
const TRIS = STRIPS * (STATIONS - 1) * 2;                          // 120
const STRIDE_F = 11;                                               // 44 bytes

// MSVC rand(), the same stream FUN_0040424e / FUN_00404258 use. Kept local so
// the border cannot perturb meshgen's sequence (and vice versa).
let SEED = 1 >>> 0;
function srand(s) { SEED = s >>> 0; }
function rand() {
  SEED = (Math.imul(SEED, 214013) + 2531011) >>> 0;
  return (SEED >>> 16) & 0x7fff;
}
const RAND_SCALE = 3.0518509447574615e-05;   // 0x4170d0
const F = Math.fround;

/**
 * FUN_00406438 — fill one 128-vertex block with a fresh ragged frame.
 * Writes ONLY x and y of each vertex; everything else is set once in the ctor.
 */
function buildBorderShape(f32) {
  for (let edge = 0; edge < STRIPS; edge++) {
    let level = 2;          // the walk starts at 2 in every strip
    let s = 1.0;            // position along the edge, +1 -> -1
    for (let st = 0; st < STATIONS; st++) {
      // The walk only steps on ~37.5% of stations (rand() < 0x3000 of 0x8000),
      // and then down or up with equal-ish probability (rand() < 0x4000).
      if (rand() < 0x3000) {
        if (rand() < 0x4000) { level = Math.max(0, level - 1); }
        else { level = Math.min(3, level + 1); }
      }
      const d = F(F(level * C.LEVEL) + C.BASE);
      const b = (edge * STATIONS + st) * 2 * STRIDE_F;   // outer vertex
      const i = b + STRIDE_F;                            // inner vertex
      switch (edge) {
        case 0: f32[b] = -1.0; f32[b + 1] = s;    f32[i] = F(d - 1.0); f32[i + 1] = s; break;
        case 1: f32[b] = 1.0;  f32[b + 1] = s;    f32[i] = F(1.0 - d); f32[i + 1] = s; break;
        case 2: f32[b] = s;    f32[b + 1] = 1.0;  f32[i] = s; f32[i + 1] = F(1.0 - F(d * C.ASPECT)); break;
        case 3: f32[b] = s;    f32[b + 1] = -1.0; f32[i] = s; f32[i + 1] = F(F(d * C.ASPECT) - 1.0); break;
      }
      s = F(s - C.STATION);
    }
  }
}

export class Border extends SceneObjectBase {
  constructor(d3d) {
    super();
    this.d3d = d3d;

    // three parallel vertex blocks: the one that gets drawn, and the two the
    // morph interpolates between.
    this.drawBuf = new ArrayBuffer(VERTS * FVF_SONNET_STRIDE);
    this.drawF = new Float32Array(this.drawBuf);
    this.drawU = new Uint32Array(this.drawBuf);
    this.drawBytes = new Uint8Array(this.drawBuf);
    this.curF = new Float32Array(VERTS * STRIDE_F);
    this.tgtF = new Float32Array(VERTS * STRIDE_F);

    // FUN_00406539's per-station initialisation of the DRAW block.
    for (let i = 0; i < VERTS; i += 2) {
      const a = i * STRIDE_F, b = a + STRIDE_F;
      this.drawF[a + 2] = 0;                       // pos.z
      this.drawU[a + 6] = 0;                       // diffuse = 0 -> black
      this.drawF[a + 7] = F(rand() * RAND_SCALE);  // uv0.u
      this.drawF[a + 8] = -5.0;                    // uv0.v  (0xc0a00000)
      this.drawF[b + 2] = 0;
      this.drawU[b + 6] = 0;
      this.drawF[b + 7] = F(rand() * RAND_SCALE);
      this.drawF[b + 8] = 1.0;
    }

    // srand(4000) -> the shape on screen; srand(5000) -> the first target.
    srand(4000); buildBorderShape(this.curF);
    srand(5000); buildBorderShape(this.tgtF);

    // FUN_00406539's index template: per quad {v, v+1, w, w, v+3, v+1}.
    this.ib = new Uint16Array(TRIS * 3);
    let p = 0;
    for (let edge = 0; edge < STRIPS; edge++) {
      for (let j = 0; j < STATIONS - 1; j++) {
        const v = (j + edge * STATIONS) * 2, w = (j + 1 + edge * STATIONS) * 2;
        this.ib[p++] = v; this.ib[p++] = v + 1; this.ib[p++] = w;
        this.ib[p++] = w; this.ib[p++] = v + 3; this.ib[p++] = v + 1;
      }
    }

    this.morphing = false;   // +0x34
    this.t = 0;              // +0x30
    this.timeScale = 30.0;
  }

  /** FUN_0040668c. */
  reset() {
    this.morphing = false; this.t = 0;
    this.enabled = false; this.started = false; this.layer = 0;
    this.timeScale = 30.0; this.dt = 0; this.dtBias = 0; this.lastMs = 0;
    srand(4000); buildBorderShape(this.curF);
    srand(5000); buildBorderShape(this.tgtF);
  }

  /** FUN_00406783. */
  event(m, f) {
    super.event(m, f);
    if (m !== 0) return;
    this.morphing = true;
    srand(Math.trunc(f) | 0);
    buildBorderShape(this.tgtF);
  }

  render(_layer, ctx) { this.tick(ctx, true); }

  /** FUN_004066a4. `draw === false` advances the morph with no device calls. */
  tick(ctx, draw) {
    this.tickDt(ctx.ms);
    if (!this.enabled) return;

    let s = 0;
    if (this.morphing) {
      this.t = F(F(this.dt * C.T_RATE) + this.t);
      if (this.t >= 1.0) {
        this.curF.set(this.tgtF);
        this.morphing = false;
        this.t = 0;
      }
      // 0.5 - 0.5*cos(PI*t) — the PI here is the DOUBLE at 0x418220.
      s = F(0.5 - F(Math.cos(this.t * Math.PI) * 0.5));
    }

    const u = F(1.0 - s);
    for (let i = 0; i < VERTS; i++) {
      const o = i * STRIDE_F;
      this.drawF[o]     = F(F(s * this.tgtF[o])     + F(u * this.curF[o]));
      this.drawF[o + 1] = F(F(u * this.curF[o + 1]) + F(s * this.tgtF[o + 1]));
    }

    if (!draw) return;
    this.d3d.reset2D();
    this.d3d.DrawIndexedPrimitiveUP(D3DPT_TRIANGLELIST, 0, VERTS, TRIS,
      this.ib, D3DFMT_INDEX16, this.drawBytes, FVF_SONNET_STRIDE);
  }
}

export function buildBorder(d3d) { return new Border(d3d); }
export default Border;
