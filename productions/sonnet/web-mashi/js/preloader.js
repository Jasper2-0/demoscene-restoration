// preloader.js — Sonnet's loading screen: a port of FUN_004010dc @ 0x004010dc.
//
// This is NOT a screen drawn once. In the original it is a PROGRESS TICK, called
// from the top of twelve heavy precalc constructors (and once inside a 16-iteration
// loop), each of which repaints the loading screen as work advances:
//
//   0x402f30 0x407ea8 0x408e6b 0x409303 0x4095ea 0x409861 0x40a0cb 0x40aab7
//   0x40ad20(x16) 0x40ae59 0x40b3c6 0x40b5f7                 (re/out/sonnet.c call sites)
//
// ---------------------------------------------------------------------------
// WHAT IT ACTUALLY DRAWS — and it is not a rectangle
// ---------------------------------------------------------------------------
// `re/PRELOADER.md` described the four `FUN_00402362(0, a, b)` calls as "two nested
// rectangles, outline and fill". They are not geometry at all: FUN_00402362 is
// `SetTextureStageState`, so
//
//   FUN_00402362(0,2,3)  COLORARG1 <- D3DTA_TFACTOR      (2 = D3DTSS_COLORARG1)
//   FUN_00402362(0,1,2)  COLOROP   <- D3DTOP_SELECTARG1  (1 = D3DTSS_COLOROP)
//   FUN_00402362(0,5,3)  ALPHAARG1 <- D3DTA_TFACTOR      (5 = D3DTSS_ALPHAARG1)
//   FUN_00402362(0,4,2)  ALPHAOP   <- D3DTOP_SELECTARG1  (4 = D3DTSS_ALPHAOP)
//
// i.e. "ignore the texture and the vertex colour; take everything from
// D3DRS_TEXTUREFACTOR". The four calls after the draw put the stage back to
// MODULATE/TEXTURE for the text engine. Likewise FUN_00401558 is not a colour: it is
// a three-float setter, `vec3::set`, and `FUN_00401558(v, 0, 0, 1.0f)` seeds a POINT
// at (0, 0, 1).
//
// The real drawing is a growing DIAMOND LATTICE of soft quads:
//
//   pts = [ (0, 0, 1) ]                       ; the seed, z carries the quad SIZE
//   n   = round(progress)                     ; FUN_00404224 = fistp of _DAT_00474650
//   for i in 0 .. n-1:                        ; breadth-first, over a growing array
//       t = (i == n-1) ? clamp01(progress - n) : 1.0
//       spawn 4 children of pts[i] at  (-d,0) (+d,0) (0,-d) (0,+d),  each with z = t
//   for each point: draw a TRIANGLEFAN quad of half-size 0.08*z centred on it,
//                   colour = PALETTE[i & 3] | 0x1f000000
//
// so the cloud holds 1 + 4*round(progress) quads, the four newest fade in by growing
// from zero, and `progress` counts DOWN from 100 by 100/599 per tick until it passes
// the -1.0f sentinel at 0x4170cc and the cloud stops being drawn entirely.
//
// Every constant below was read out of the image, not guessed
// (unpacked/sonnet_u.exe, .text at VA 0x401000 = file offset 0x400):
//
//   0x4170b4 = 599.0f   ticks the counter is scaled for
//   0x4170b8 = 0.08f    quad half-size in NDC, and the lattice pitch unit
//   0x4170bc = 1.5f     lattice pitch = 0.08 * 1.5 = 0.12 NDC
//   0x4170c0 = 100.0f   the counter's start value (_DAT_00474650, set in FUN_00401000)
//   0x4170c4 = 1.0f     upper clamp of the newest generation's fade
//   0x4170c8 = 0.0f     lower clamp
//   0x4170cc = -1.0f    the "stop drawing" sentinel
//   0x41a9c0 = { 0x00a7d77f, 0x00fdda62, 0x00a34701, 0x00c9cdd0 }   the palette
//
// Transforms are identity (FUN_00401bd0 = reset2D), so those coordinates are NDC:
// half-size 0.08 is 25.6 x 19.2 screen pixels on a 640x480 backbuffer and the pitch
// 0.12 is 38.4 x 28.8, which makes neighbouring quads overlap slightly and the
// lattice read as one soft blob rather than a grid of dots.
//
// ---------------------------------------------------------------------------
// AND A LINE OF THE POEM
// ---------------------------------------------------------------------------
// The tail of FUN_004010dc pokes the text engine's item array directly:
//
//   items[0].active = 1 ; items[0].t = 1.0f          (+0x08 / +0x0c of a 0x40 record)
//   if (textObject) { vtbl[0](); vtbl[4](0); vtbl[0](); vtbl[4](0); }   <- TWICE
//   items[0].active = 0 ; items[0].t = 0
//
// The vtable is at 0x418de0 = { FUN_00406d90 init, FUN_004072e9 render,
// FUN_004076c4 event }, so that is `init(); render(layer 0);` run twice — a genuine
// double-draw of the same frame, reproduced here because it does change the pixels
// (the glyphs' antialiased edges composite twice through SRCALPHA/INVSRCALPHA).
// FUN_00406d90 clears the title-bar phase/flash arrays and re-anchors the frame
// clock; it does NOT clear item state, which is why item 0 survives between the two.
//
// Poem item 0 is "beauty continues to amaze" — the one item the timeline never
// triggers. So the original's loading screen is: black, a slowly collapsing cloud,
// and a line of the poem it is about to show you.
//
// ---------------------------------------------------------------------------
// HOW OURS IS DRIVEN
// ---------------------------------------------------------------------------
// The original simply steps a counter: every call subtracts 100/599 regardless of
// how much work the caller did, and with only ~27 call sites the cloud never gets
// anywhere near collapsing. `tick(fraction)` instead maps REAL progress onto that
// same counter over its full designed range (599 ticks x 100/599 = exactly 100), so
// the mechanism, the geometry and the palette are the original's and only the input
// is honest. Nothing here is animated on a timer; if no generator reports progress,
// nothing moves.

import {
  D3DPT_TRIANGLEFAN, FVF_SONNET_STRIDE,
  D3DRS_TEXTUREFACTOR, D3DCLEAR_TARGET, D3DCLEAR_ZBUFFER,
} from './minid3d8.js';

// D3DTSS / D3DTOP / D3DTA, spelled out so the four calls read as themselves.
const D3DTSS_COLOROP = 1, D3DTSS_COLORARG1 = 2;
const D3DTSS_ALPHAOP = 4, D3DTSS_ALPHAARG1 = 5;
const D3DTOP_SELECTARG1 = 2, D3DTOP_MODULATE = 4;
const D3DTA_TEXTURE = 2, D3DTA_TFACTOR = 3;

/** The floats at 0x4170b4..0x4170cc, verbatim. */
export const K = {
  TICKS: 599.0,     // 0x4170b4
  QUAD: 0.08,       // 0x4170b8  quad half-size, NDC
  PITCH: 1.5,       // 0x4170bc  lattice pitch, in units of QUAD
  START: 100.0,     // 0x4170c0  and the counter's initial value
  ONE: 1.0,         // 0x4170c4
  ZERO: 0.0,        // 0x4170c8
  SENTINEL: -1.0,   // 0x4170cc
};

/** _DAT_00474650 -= STEP once per call, in the original. */
export const STEP = K.START / K.TICKS;          // 0.16694490818...

/** The four RGB entries at 0x41a9c0; the draw ORs in alpha 0x1f. */
export const PALETTE = [0x00a7d77f, 0x00fdda62, 0x00a34701, 0x00c9cdd0];
export const PALETTE_ALPHA = 0x1f;

/** FUN_00401000 allocates 60000 bytes = 5000 vec3 slots. 1 + 4*100 = 401 are used. */
export const MAX_POINTS = 5000;

/** Do not repaint the loading screen more often than this. See `tick`. */
export const MIN_PAINT_MS = 33;

const clamp01 = (v) => (v < K.ZERO ? K.ZERO : v > K.ONE ? K.ONE : v);

export class Preloader {
  /**
   * @param {MiniD3D8} d3d
   * @param {object} [opts]
   * @param {object} [opts.text]  a TextEngine, or null while the atlas does not
   *                              exist yet — the original guards on
   *                              `DAT_00478920 != 0` for exactly this reason.
   */
  constructor(d3d, opts = {}) {
    this.d3d = d3d;
    this.text = opts.text || null;
    /** _DAT_00474650. Counts DOWN from 100.0; below -1.0 nothing is drawn. */
    this.progress = K.START;

    // DAT_00474614 / DAT_0047461c — the point array and its live count.
    this.pts = new Float32Array(MAX_POINTS * 3);
    this.count = 0;

    /** When the screen was last actually repainted, for the 30 Hz cap in `tick`. */
    this.lastPaint = -1e9;

    // One reusable quad. FVF 0x252, stride 44; the original leaves normal, diffuse
    // and both texcoord sets as uninitialised stack, which is safe because lighting
    // is off (FUN_0040184c -> setLighting(0)) and the stage takes TFACTOR only.
    this.vb = new ArrayBuffer(4 * FVF_SONNET_STRIDE);
    this.vf = new Float32Array(this.vb);
    this.bytes = new Uint8Array(this.vb);
    for (let i = 0; i < 4; i++) this.vf[i * 11 + 2] = 0;   // z, zeroed at 0x40120a
  }

  /** FUN_00401061 — spawn the four children of (x,y,z) with the caller's fade `t`. */
  #spawn(x, y, z, t) {
    const d = K.QUAD * K.PITCH;                 // 0.08 * 1.5 = 0.12
    const p = this.pts;
    let o = this.count * 3;
    for (let i = 0; i < 4; i++) {
      p[o] = x; p[o + 1] = y; p[o + 2] = z;
      if (i === 0) p[o] -= d;
      else if (i === 1) p[o] += d;
      else if (i === 2) p[o + 1] -= d;
      else if (i === 3) p[o + 1] += d;
      p[o + 2] = t;                             // z is overwritten with the fade
      this.count++;
      o += 3;
    }
  }

  /** Rebuild the lattice for the current `progress`. Pure arithmetic, no device. */
  #buildLattice() {
    const p = this.pts;
    // FUN_00401558(v, 0, 0, 1.0f) — the seed point, full size.
    p[0] = 0; p[1] = 0; p[2] = K.ONE;
    this.count = 1;

    // FUN_00404224 is `fistp`, i.e. round-to-nearest-even under the x87 default.
    const n = roundHalfToEven(this.progress);
    if (n <= 0) return;
    for (let i = 0; i < n; i++) {
      // Only the LAST generation fades; everything behind it is at full size.
      const t = (i === n - 1) ? clamp01(this.progress - n) : K.ONE;
      const o = i * 3;
      this.#spawn(p[o], p[o + 1], p[o + 2], t);
    }
  }

  /**
   * The whole of FUN_004010dc, once.
   *
   * ONE REORDERING against the decompile, and it is the same one main.js's
   * `renderAt` makes: the original opens with `FUN_00402c72(0)` (clear) and closes
   * with `FUN_0040149b` (Present, then clear again for the next frame). D3D8 flips,
   * so clearing after Present touches the NEXT back buffer. WebGL has one buffer and
   * the browser composites when the task ends, so clearing after Present would wipe
   * exactly the frame we just drew — which it did, and the loading screen came out
   * black. Present-then-clear moves to the TOP of the tick instead, which presents
   * the previous tick's frame and leaves this one on screen. Same sequence of
   * device calls, same frames, one rotation.
   */
  draw() {
    const d3d = this.d3d;

    d3d.clearColor = 0;                                    // DAT_00474790 = 0
    d3d.presentAndRestoreBackbuffer(0);                    // FUN_0040149b + FUN_00402c72(0)
    d3d.resetLayerState();                                 // FUN_0040184c
    d3d.reset2D();                                         // FUN_00401bd0

    if (this.progress > K.SENTINEL) {                      // _DAT_004170cc < _DAT_00474650
      d3d.SetTextureStageState(0, D3DTSS_COLORARG1, D3DTA_TFACTOR);
      d3d.SetTextureStageState(0, D3DTSS_COLOROP, D3DTOP_SELECTARG1);
      d3d.SetTextureStageState(0, D3DTSS_ALPHAARG1, D3DTA_TFACTOR);
      d3d.SetTextureStageState(0, D3DTSS_ALPHAOP, D3DTOP_SELECTARG1);
      d3d.setBlendMode(2);                                 // FUN_004019e6(2)

      this.#buildLattice();

      const p = this.pts, vf = this.vf;
      for (let i = 0, o = 0; i < this.count; i++, o += 3) {
        const h = K.QUAD * p[o + 2], x = p[o], y = p[o + 1];
        //  0 (-,-)   1 (+,-)   2 (+,+)   3 (-,+)   — a two-triangle fan
        vf[0] = x - h; vf[1] = y - h;
        vf[11] = x + h; vf[12] = y - h;
        vf[22] = x + h; vf[23] = y + h;
        vf[33] = x - h; vf[34] = y + h;
        d3d.SetRenderState(D3DRS_TEXTUREFACTOR,
          ((PALETTE[i & 3] | (PALETTE_ALPHA << 24)) >>> 0));
        d3d.DrawPrimitiveUP(D3DPT_TRIANGLEFAN, 2, this.bytes, FVF_SONNET_STRIDE);
      }

      this.progress -= STEP;         // the original's own per-call decrement
    }

    // Put stage 0 back the way every other object expects to find it.
    d3d.SetTextureStageState(0, D3DTSS_COLORARG1, D3DTA_TEXTURE);
    d3d.SetTextureStageState(0, D3DTSS_COLOROP, D3DTOP_MODULATE);
    d3d.SetTextureStageState(0, D3DTSS_ALPHAARG1, D3DTA_TEXTURE);
    d3d.SetTextureStageState(0, D3DTSS_ALPHAOP, D3DTOP_MODULATE);

    this.#drawPoemLine();
  }

  /**
   * items[0].active = 1, t = 1.0; init(); render(0); init(); render(0); then clear.
   * `init` is FUN_00406d90: it zeroes the title-bar arrays and re-anchors the frame
   * clock (SceneObjectBase::started), and deliberately does NOT touch item state —
   * so this is NOT TextEngine.reset(), which would clear the item we just enabled.
   */
  #drawPoemLine() {
    const text = this.text;
    if (!text) return;                                     // DAT_00478920 == 0
    const it = text.items[0];
    if (!it) return;

    const ctx = { d3d: this.d3d, position: 0, ms: 0, songMs: 0, rowFrac: 0 };
    it.active = true;
    it.t = K.ONE;
    for (let pass = 0; pass < 2; pass++) {
      text.barPhase.fill(0);                               // FUN_00406d90
      text.barFlash.fill(0);
      text.started = false;                                // FUN_004060c9 — dt := 0
      it.t = K.ONE;                                        // advance() nudges it; re-pin
      text.render(0, ctx);                                 // vtbl[4](0) = FUN_004072e9
    }
    it.active = false;
    it.t = 0;
  }

  /**
   * The tick generators call. `fraction` is REAL progress in [0,1] — 0 at the start
   * of precalc, 1 when everything is built. It drives the original's counter across
   * its full designed range, so the cloud collapses exactly as 599 original ticks
   * would have collapsed it.
   *
   * Awaiting a frame is what actually lets the screen update: generation is
   * synchronous JS and would otherwise never yield. It is also the only real cost of
   * having a loading screen at all — `requestAnimationFrame` resumes on the next
   * vsync, so a tick after a 2 ms texture program pays up to 16 ms to display a
   * change nobody can see. MEASURED: repainting on every one of the 27 texture steps
   * added ~270 ms to a ~900 ms precalc. Repaints are therefore capped at ~30 Hz;
   * that changes only how often the screen is drawn, never what the bar reports —
   * `progress` is still set from real completed work on every call.
   */
  async tick(fraction) {
    this.progress = K.START * (1 - clamp01(fraction));
    // ⚠ `draw()` PRESENTS (`presentAndRestoreBackbuffer`), so a draw and a yield
    // must stay paired. Two failed variants, both measured on real browsers:
    //
    //  * draw+yield only every 33 ms, skipping the draw otherwise — the
    //    framebuffer then held stale content between waits, so the lattice
    //    animated in coarse jumps on Safari (Chrome happened to line up).
    //  * draw EVERY tick but keep the 33 ms cap on the yield — that queues a
    //    present per tick with nothing letting the compositor drain them, and
    //    Safari FROZE after the precalc.
    //
    // So: present once per tick and always give the frame back. The vsync waits
    // cost ~0.2 s over a ~4 s load, which is what the cap was saving; smooth
    // progress on every browser is worth more, and it is also what the original
    // does — `FUN_004010dc` presents on every one of its progress ticks.
    this.draw();
    this.lastPaint = (typeof performance !== 'undefined') ? performance.now() : Date.now();
    await nextFrame();
  }

  /** The literal original: one fixed step, no notion of total work. */
  tickStep() {
    this.draw();      // draw() applies the decrement itself
  }

  /** Hand the screen back to the demo: present the last tick, then leave it black. */
  finish() {
    this.progress = K.SENTINEL;
    this.d3d.clearColor = 0;
    this.d3d.presentAndRestoreBackbuffer(0);
    this.d3d.Clear(0, null, D3DCLEAR_TARGET | D3DCLEAR_ZBUFFER, 0, 1.0, 0);
  }
}

/** x87 `fistp` under the default rounding mode: nearest, ties to even. */
export function roundHalfToEven(v) {
  const f = Math.floor(v), d = v - f;
  if (d < 0.5) return f;
  if (d > 0.5) return f + 1;
  return (f % 2 === 0) ? f : f + 1;
}

/**
 * Yield one frame — but NEVER deadlock on it.
 *
 * The precalc runs inside the click handler and awaits this on every progress
 * tick, so a single `requestAnimationFrame` that does not fire hangs `boot()`
 * for good: the lattice sits there fully drawn and the intro simply never
 * starts. Safari throttles or drops rAF in more situations than Chrome does
 * (backgrounded tab, occluded window, compositor pressure), and that is exactly
 * what was reported on 2026-08-10.
 *
 * So race it against a timer. Whichever comes first wins, and the fallback is
 * generous enough that on a healthy frame clock rAF always wins and the pacing
 * is unchanged.
 */
export function nextFrame() {
  if (typeof requestAnimationFrame !== 'function') {
    return new Promise((r) => setTimeout(r, 0));
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => { if (!settled) { settled = true; resolve(); } };
    requestAnimationFrame(finish);
    setTimeout(finish, 100);
  });
}

export default Preloader;
