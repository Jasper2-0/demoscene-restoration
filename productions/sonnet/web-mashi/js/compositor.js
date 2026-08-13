// compositor.js — Sonnet, timeline object 0: the GLOBAL COMPOSITOR.
//
// One full-screen quad in NDC with identity transforms, drawn at render layer 3.
// Reverse-engineered from:
//   FUN_0040617b  constructor  — the quad's vertices and its 0,1,2, 2,3,0 indices
//   FUN_00406210  reset        — fading = 0, target = 0
//   FUN_00406222  render       — the colour lerp and the draw
//   FUN_004063b3  events       — NOT in re/out/sonnet.c (Ghidra's one decompile
//                                failure); disassembled from the image directly.
//
// What it actually does, corrected from ENGINE.md's guess of a "white flash":
// the timeline sets R = G = B = 0 once, at 0x0400, and then only ever drives the
// ALPHA with method 4 (255 / 0, sixteen pairs). So this is a FADE TO BLACK, and
// because it lives at layer 3 while the eight scenes live at layer 2 and the text
// at 14, it blacks out the SCENE and leaves the poem legible on top of it.

import {
  D3DPT_TRIANGLELIST, D3DFMT_INDEX16, FVF_SONNET_STRIDE,
} from './minid3d8.js';
import { SceneObjectBase, K } from './text.js';

export class Compositor extends SceneObjectBase {
  constructor(d3d) {
    super();
    this.d3d = d3d;
    this.color = 0;        // +0x18  the colour being displayed
    this.target = 0;       // +0x1c  where a method-4 fade is heading
    this.fading = false;   // +0x20
    this.fadeT = 0;        // +0x24

    // FUN_0040617b's literal vertex block: a screen-filling quad at z = 0.
    this.vb = new ArrayBuffer(4 * FVF_SONNET_STRIDE);
    this.vf = new Float32Array(this.vb);
    this.vu = new Uint32Array(this.vb);
    const P = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (let i = 0; i < 4; i++) {
      this.vf[i * 11] = P[i][0];
      this.vf[i * 11 + 1] = P[i][1];
      this.vf[i * 11 + 2] = 0;
    }
    this.ib = new Uint16Array([0, 1, 2, 2, 3, 0]);
    this.bytes = new Uint8Array(this.vb);
  }

  reset() {
    this.color = 0; this.target = 0; this.fading = false; this.fadeT = 0;
    this.enabled = false; this.started = false; this.layer = 0;
  }

  /**
   * FUN_004063b3. Methods 0..3 poke one channel of BOTH the current colour and
   * the fade target (an instant set). Method 4 sets only the target's alpha and
   * arms the fade — which is why all 31 of the script's method-4 events animate.
   */
  event(m, f) {
    super.event(m, f);
    const v = Math.trunc(f) & 0xff;
    const cur = this.color >>> 0;
    let out;
    switch (m) {
      case 0: out = ((cur & 0xff00ffff) | (v << 16)) >>> 0; break;   // red
      case 1: out = ((cur & 0xffff00ff) | (v << 8)) >>> 0; break;    // green
      case 2: out = ((cur & 0xffffff00) | v) >>> 0; break;           // blue
      case 3: out = ((cur & 0x00ffffff) | (v << 24)) >>> 0; break;   // alpha, instant
      case 4:
        this.fading = true;
        this.fadeT = 0;
        this.target = ((cur & 0x00ffffff) | (v << 24)) >>> 0;        // alpha, faded
        return;                                                     // `color` untouched
      default: return;
    }
    this.color = out;
    this.target = out;
  }

  render(_layer, ctx) { this.tick(ctx, true); }

  /** `draw === false` advances the fade without touching the device (seek warm-up). */
  tick(ctx, draw) {
    const d3d = this.d3d;
    this.tickDt(ctx.ms);
    if (!this.enabled) return;

    let color = this.color >>> 0;
    let alpha = color >>> 24;

    if (this.fading) {
      this.fadeT += this.dt * K.T_RATE;
      if (this.fadeT > 1.0) { this.color = this.target; this.fadeT = 0; }
      // A component-wise lerp with ftol truncation on each channel, exactly as the
      // FPU code does it. Note the fade never clears `fading`: once armed the object
      // keeps lerping (harmlessly, since colour == target once it has arrived).
      const c = this.color >>> 0, g = this.target >>> 0, t = this.fadeT, u = 1.0 - t;
      const lerp = (sh) => Math.trunc((((c >>> sh) & 0xff) * u) + (((g >>> sh) & 0xff) * t)) & 0xff;
      alpha = lerp(24);
      color = ((alpha << 24) | (lerp(16) << 16) | (lerp(8) << 8) | lerp(0)) >>> 0;
    }

    for (let i = 0; i < 4; i++) this.vu[i * 11 + 6] = color;

    if (!draw || alpha === 0) return;
    // Alpha 255 deliberately skips blend mode 2, so a full-strength fade is an
    // opaque overwrite of everything drawn at the layers below.
    if (alpha < 255) d3d.setBlendMode(2);
    d3d.setCullMode(0);
    d3d.reset2D();
    d3d.DrawIndexedPrimitiveUP(D3DPT_TRIANGLELIST, 0, 4, 2,
      this.ib, D3DFMT_INDEX16, this.bytes, FVF_SONNET_STRIDE);
  }
}

export default Compositor;
