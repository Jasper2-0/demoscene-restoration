// flare.js — Sonnet's lens flare / sun disc and its software occlusion query.
//
//   FUN_00405082  constructor           (vtable PTR_FUN_004182b4)
//   FUN_0040520d  draw the marker quad  -> FUN_00402788
//   FUN_004050ed  read it back and fade -> FUN_00402907
//   FUN_004051ac  draw the sprite       -> FUN_00404dbb
//
// See re/scenes/FLARE.md for the reverse engineering; every float constant
// quoted below was read out of unpacked/sonnet_img.bin at its VA, never out of
// re/out/sonnet.c.
//
// THE MECHANISM, in one paragraph.  After all the depth-writing geometry has
// been drawn, the demo draws a ~3x3-pixel screen-space quad at the sun's
// projected position, at clip-space z = 1.0 (the far plane), opaque, with
// ZFUNC = LESSEQUAL.  It therefore survives only where nothing has written
// depth, i.e. only over raw sky.  Its colour is the frame's clear colour minus
// 0x00020304, which is numerically distinctive but visually identical to the
// sky.  The demo then CopyRects/LockRects a 4x4 block of the back buffer at
// that position and asks: did ANY of those sixteen pixels come out as the
// marker colour?  Yes -> the sun is visible, grow the flare; no -> shrink it.
// The flare sprite itself is then drawn last, over everything, additive with
// ZFUNC = ALWAYS: it does not need depth testing, because the query has already
// shrunk it to nothing whenever the sun is behind something.
//
// This file owns nothing else.  It is attached to scene7.js's `Landscape` class
// from outside (`installFlare`) so that file stays untouched.

import {
  D3DTS_WORLD, D3DTS_VIEW, D3DTS_PROJECTION,
  D3DPT_TRIANGLELIST, D3DFMT_INDEX16, FVF_SONNET_STRIDE,
} from './minid3d8.js';

const F = Math.fround;

// ---------------------------------------------------------------------------
// Constants (VAs are image VAs; 0x401000 == offset 0 in sonnet_img.bin)
// ---------------------------------------------------------------------------
export const K = {
  /** FUN_00402773: DAT_0041a000 = (clearColour - 0x00020304) | 0xFF000000 */
  MARKER_DELTA: 0x00020304,
  /** [0x418200] = 2.0 — both the screen-edge margin and the marker half-width base */
  EDGE: 2.0,
  /** [0x4170bc] = 1.5 — marker half-size = (EDGE / width) * 1.5 in NDC == 1.5 px */
  MARKER_SCALE: 1.5,
  /** [0x418268] = 255.0 — alpha = ftol(cur/max * 255) */
  ALPHA_255: 255.0,
  /** [0x461c4000] = 10000.0 — the far plane the flare pass runs with */
  FLARE_FAR: 10000.0,
  /** material flags: FUN_004026be's FUN_00401c67(mat, 0, 0, 0x1810) */
  MARKER_FLAGS: 0x1810,
  /** material flags: FUN_004082a9's FUN_00401c67(mat, texgen14, 0, 0x1891) */
  SPRITE_FLAGS: 0x1891,
  /** the original's back buffer, and the coordinate space the query works in */
  WIDTH: 640,
  HEIGHT: 480,
};

const IDENTITY = Object.freeze([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

/**
 * FUN_00404224 — x87 `fistp`, i.e. round-half-to-EVEN, not truncate and not
 * JS's round-half-up.  SCENES_7_10.md §0 makes the same point about `m3`.
 */
export function ftol(x) {
  if (!Number.isFinite(x)) return 0;
  const f = Math.floor(x);
  const d = x - f;
  if (d > 0.5) return f + 1;
  if (d < 0.5) return f;
  return (f % 2 === 0) ? f : f + 1;      // exactly .5 -> to even
}

/** FUN_00402773. `clearColour` is DAT_00474790, the scene's fog colour dword. */
export function markerColour(clearColour) {
  return (((((clearColour >>> 0) - K.MARKER_DELTA) >>> 0)) | 0xff000000) >>> 0;
}

/**
 * FUN_00402a6f — transform a point by a D3D row-vector matrix and divide by w.
 * Ghidra renders the operand order confusingly; this is `out = v * M`.
 */
function transformDivide(out, v, m) {
  const x = v[0], y = v[1], z = v[2];
  const w = F(F(m[3] * x) + F(F(m[7] * y) + F(F(m[11] * z) + m[15])));
  const iw = 1 / w;
  out[0] = F(F(F(m[0] * x) + F(F(m[4] * y) + F(F(m[8] * z) + m[12]))) * iw);
  out[1] = F(F(F(m[1] * x) + F(F(m[5] * y) + F(F(m[9] * z) + m[13]))) * iw);
  out[2] = F(F(F(m[2] * x) + F(F(m[6] * y) + F(F(m[10] * z) + m[14]))) * iw);
  return out;
}

// ===========================================================================
// The occlusion query, isolated behind ONE contract.
// ===========================================================================
/**
 * The contract every occlusion-query backend implements:
 *
 *     sample(x, y, marker) -> number in [0, 1]
 *
 * "Of the 4x4 block of back-buffer pixels whose top-left corner is at D3D
 * screen position (round(x), round(y)), what FRACTION still shows `marker`
 * (i.e. is still sky)?"  Returns 0 when the position is off-screen.
 *
 * The original is a strict binary test — `FUN_00402907` sets its result byte to
 * 0 the moment any single pixel matches and never counts — so `Flare` treats
 * `> 0` as "visible".  The fraction is returned rather than the boolean because
 * it is free here, it is what a future backend would naturally produce, and it
 * is useful diagnostically.  Nothing on the authentic path may depend on it.
 *
 * Swapping in an asynchronous backend (readPixels into a PBO + fenceSync, read
 * one or two frames later) means implementing this one method and nothing else:
 * `Flare` never touches the device for the query itself.  Such a backend would
 * report occlusion one or two frames late (~16-33 ms), which is a remaster-path
 * trade, NOT something ?quality=original may do.  Not built — see FLARE.md §6.
 */
export class SyncOcclusionQuery {
  /** @param {object} d3d the MiniD3D8 device */
  constructor(d3d) {
    this.d3d = d3d;
    this.name = 'sync-readpixels';
    /** cumulative cost, for the profiler. Note: a blocking GL call is charged
     *  to JS time, so this number is "wall time spent inside readbackRect",
     *  which is what we actually want to know. */
    this.totalMs = 0;
    this.calls = 0;
    this.lastMs = 0;
  }

  /**
   * @param {number} x D3D screen x (y = 0 at the top)
   * @param {number} y
   * @param {number} marker 0xAARRGGBB; only the low 24 bits are compared
   * @returns {number} matched / 16
   */
  sample(x, y, marker) {
    const t0 = (typeof performance !== 'undefined') ? performance.now() : 0;
    const px = this.d3d.readbackRect(ftol(x), ftol(y), 4, 4);
    const want = marker & 0xffffff;
    let n = 0;
    for (let i = 0; i < 16; i++) if ((px[i] & 0xffffff) === want) n++;
    // Diagnostics: WHAT was found when the marker was not. Without this you can
    // only see "occluded" and have to guess whether geometry covered the marker
    // or something wiped it — the distinction that took two reverts to find.
    this.lastWant = want;
    this.lastFound = [px[0] & 0xffffff, px[5] & 0xffffff, px[10] & 0xffffff, px[15] & 0xffffff];
    const t1 = (typeof performance !== 'undefined') ? performance.now() : 0;
    this.lastMs = t1 - t0;
    this.totalMs += this.lastMs;
    this.calls++;
    return n / 16;
  }
}

// ===========================================================================
// The flare object
// ===========================================================================
export class Flare {
  /**
   * FUN_00405082(this, flareParam1, flareParam2).  Both are `(float)u16` read
   * from the scene descriptor at +0x2e / +0x30.  Note that `cur` is seeded to
   * `max` — the flare starts fully open, and only the query ever closes it.
   *
   * @param {object} d3d
   * @param {object} o  { pos, max, rate, texture, width, height, query }
   */
  constructor(d3d, o) {
    this.d3d = d3d;
    this.pos = (o.pos || [0, 0, 0]).slice();   // sprite[0].pos, the SUN position
    this.max = o.max || 0;                     // +0xd8
    this.cur = o.max || 0;                     // +0xdc, seeded to max by the ctor
    this.rate = o.rate || 0;                   // +0xe0
    this.enabled = true;                       // +0xac
    this.spriteVisible = true;                 // +0xe5
    this.wasOccluded = false;                  // +0xe4 (bookkeeping only)
    this.width = o.width || K.WIDTH;
    this.height = o.height || K.HEIGHT;

    this.query = o.query || new SyncOcclusionQuery(d3d);

    // --- the marker quad (the static globals at DAT_004747c0, FUN_004026be)
    this.markerMat = { texture0: null, texture1: null, flags: K.MARKER_FLAGS, alphaRef: 0x80 };
    this.markerVB = new ArrayBuffer(4 * FVF_SONNET_STRIDE);
    this.markerF = new Float32Array(this.markerVB);
    this.markerU = new Uint32Array(this.markerVB);
    this.markerB = new Uint8Array(this.markerVB);
    for (let k = 0; k < 4; k++) this.markerF[k * 11 + 2] = 1.0;   // z = 1.0, the far plane
    // UVs are never written by any code in the image and the material binds no
    // texture, so they stay 0 — D3D8_API.md §"open questions" item 2.

    // --- the sprite (FUN_00404bb8's one-element billboard array)
    this.spriteMat = { texture0: o.texture || null, texture1: null,
      flags: K.SPRITE_FLAGS, alphaRef: 0x80 };
    this.spriteVB = new ArrayBuffer(4 * FVF_SONNET_STRIDE);
    this.spriteF = new Float32Array(this.spriteVB);
    this.spriteU = new Uint32Array(this.spriteVB);
    this.spriteB = new Uint8Array(this.spriteVB);
    const UV = [[0, 0], [1, 0], [1, 1], [0, 1]];
    for (let k = 0; k < 4; k++) {
      this.spriteF[k * 11 + 7] = UV[k][0];
      this.spriteF[k * 11 + 8] = UV[k][1];
    }
    this.indices = new Uint16Array([0, 1, 2, 2, 3, 0]);   // FUN_004026be

    // --- probe state (the object at +0xcc: { ?, screenX, screenY })
    this.screenX = -1;
    this.screenY = -1;
    this.onScreen = false;
    this.fraction = 1;          // last query result, diagnostics only
    this.visible = true;        // last query verdict

    this.stats = { probeMs: 0, drawMs: 0, queryMs: 0, frames: 0 };
    this._v = [0, 0, 0];
    this._n = [0, 0, 0];
  }

  /** Back to the constructor's state. */
  reset() {
    this.cur = this.max;
    this.wasOccluded = false;
    this.screenX = this.screenY = -1;
    this.onScreen = false;
    this.fraction = 1;
    this.visible = true;
  }

  // -------------------------------------------------------------------------
  // FUN_0040520d -> FUN_00402788 — project the sun and stamp the marker quad.
  // -------------------------------------------------------------------------
  /**
   * @param {number[]} view  the camera's view matrix (camera+0x08)
   * @param {number[]} proj  the camera's projection matrix (camera+0xcc)
   * @param {number}   clearColour DAT_00474790, the scene's fog/clear colour
   */
  probe(view, proj, clearColour) {
    if (!this.enabled) return;
    const t0 = (typeof performance !== 'undefined') ? performance.now() : 0;
    const d3d = this.d3d;

    const vp = transformDivide(this._v, this.pos, view);
    // `if (0.0 <= viewPos.z)` — behind the camera means "no marker at all", and
    // FUN_00402788 parks the screen position at (-1, -1) so the bounds check in
    // FUN_00402907 rejects it.
    if (!(vp[2] >= 0)) {
      this.screenX = -1.0;
      this.screenY = -1.0;
      this.onScreen = false;
      this.stats.probeMs += ((typeof performance !== 'undefined') ? performance.now() : 0) - t0;
      return;
    }

    const marker = markerColour(clearColour);
    this.marker = marker;
    for (let k = 0; k < 4; k++) this.markerU[k * 11 + 6] = marker;

    const nd = transformDivide(this._n, vp, proj);
    const ndx = nd[0], ndy = nd[1];
    this.screenX = F(F(F(ndx + 1.0) * 0.5) * this.width);
    this.screenY = F(F(1.0 - F(F(ndy + 1.0) * 0.5)) * this.height);
    this.onScreen = true;

    // half = (2.0 / width) * 1.5 in NDC == 1.5 logical pixels, so the quad is
    // ~3x3 px.  It is deliberately smaller than the 4x4 readback block, and the
    // block's top-left corner is AT the sun rather than centred on it, so about
    // four of the sixteen sampled pixels carry the marker when fully visible.
    const half = F(F(K.EDGE / this.width) * K.MARKER_SCALE);
    const C = [[-half, -half], [half, -half], [half, half], [-half, half]];
    for (let k = 0; k < 4; k++) {
      this.markerF[k * 11] = F(ndx + C[k][0]);
      this.markerF[k * 11 + 1] = F(ndy + C[k][1]);
      // z stays 1.0 (set in the constructor)
    }

    d3d.applyMaterial(this.markerMat);
    d3d.reset2D();                       // FUN_00401bd0: VIEW/PROJ/WORLD <- I
    d3d.DrawIndexedPrimitiveUP(D3DPT_TRIANGLELIST, 0, 4, 2,
      this.indices, D3DFMT_INDEX16, this.markerB, FVF_SONNET_STRIDE);
    d3d.unapplyMaterial(this.markerMat);
    // The original follows this with the camera object's apply (vtbl+4), which
    // restores VIEW and PROJECTION; the caller does that.
    this.stats.probeMs += ((typeof performance !== 'undefined') ? performance.now() : 0) - t0;
  }

  /** Restore what `probe`'s reset2D() clobbered. */
  restoreTransforms(view, proj) {
    this.d3d.SetTransform(D3DTS_VIEW, view);
    this.d3d.SetTransform(D3DTS_PROJECTION, proj);
    this.d3d.SetTransform(D3DTS_WORLD, IDENTITY);
  }

  // -------------------------------------------------------------------------
  // FUN_004050ed — read the marker back, then fade in or out.
  // -------------------------------------------------------------------------
  /** @param {number} dt frame delta in 1/30-second units (the object's +0x04) */
  update(dt) {
    if (!this.enabled) return;

    // FUN_00402907's bounds guard, verbatim: the 4x4 block must lie inside
    // [2, width-2) x [2, height-2).  Outside it the function returns 1 = occluded.
    const x = this.screenX, y = this.screenY;
    const inside = this.onScreen &&
      x >= K.EDGE && y >= K.EDGE &&
      x < (this.width - 2) && y < (this.height - 2);

    if (inside) {
      const f = this.query.sample(x, y, this.marker);
      this.fraction = f;
      this.visible = f > 0;             // ANY matching pixel -> visible
      this.stats.queryMs = this.query.totalMs;
    } else {
      this.fraction = 0;
      this.visible = false;
    }
    this.stats.frames++;

    if (!this.visible) {
      this.wasOccluded = true;
      if (this.cur > 0) this.cur = F(this.cur - F(dt * this.rate));
      if (this.cur < 0) this.cur = 0;
    } else {
      this.wasOccluded = false;
      if (this.cur < this.max) this.cur = F(F(dt * this.rate) + this.cur);
      if (this.cur > this.max) this.cur = this.max;
    }
  }

  /**
   * The half of `FUN_004050ed` that needs no device: project the sun, run
   * `FUN_00402907`'s bounds guard, and if it FAILS — the original returns 1,
   * "occluded", without touching the back buffer at all — shrink.
   *
   * This exists for main.js's `warmTo`, which steps every object's state machine
   * at 60 Hz with no rendering. Without it the flare comes out of a warm-up at
   * full size no matter what the camera has been looking at, and a captured
   * frame taken just after the sun re-enters the view shows it fully open when
   * the original would still be ramping (object 7 takes 1.33 s at rate 20).
   * When the sun IS on screen we cannot know whether geometry covers it without
   * drawing, so we assume visible — the same assumption the port made before.
   */
  updateOffline(view, proj, dt) {
    if (!this.enabled) return;
    const vp = transformDivide(this._v, this.pos, view);
    let inside = false;
    if (vp[2] >= 0) {
      const nd = transformDivide(this._n, vp, proj);
      const x = F(F(F(nd[0] + 1.0) * 0.5) * this.width);
      const y = F(F(1.0 - F(F(nd[1] + 1.0) * 0.5)) * this.height);
      inside = x >= K.EDGE && y >= K.EDGE && x < (this.width - 2) && y < (this.height - 2);
    }
    if (!inside) {
      if (this.cur > 0) this.cur = F(this.cur - F(dt * this.rate));
      if (this.cur < 0) this.cur = 0;
    } else {
      if (this.cur < this.max) this.cur = F(F(dt * this.rate) + this.cur);
      if (this.cur > this.max) this.cur = this.max;
    }
  }

  // -------------------------------------------------------------------------
  // FUN_004051ac + FUN_00404dbb — draw the sprite.
  // -------------------------------------------------------------------------
  /**
   * The quad is built in CAMERA space: FUN_00404dbb forces VIEW and WORLD to
   * identity and pre-multiplies the centre by the view matrix itself, which is
   * what makes it exactly camera-facing.  Half-size is the flare's +0xdc, alpha
   * is ftol((cur/max) * 255).
   *
   * @param {number[]} view       the camera view matrix
   * @param {number[]} projFar    the projection matrix with far = 10000
   * @param {number[]} projNormal the scene's own projection matrix, restored after
   */
  draw(view, projFar, projNormal) {
    if (!this.enabled || !this.spriteVisible) return;
    const t0 = (typeof performance !== 'undefined') ? performance.now() : 0;
    const d3d = this.d3d;

    const a = this.max > 0 ? (ftol(F(F(this.cur / this.max) * K.ALPHA_255)) & 0xff) : 0;
    const colour = ((a << 24) | 0xffffff) >>> 0;

    const p = this.pos;
    const cx = F(F(p[0] * view[0]) + F(F(p[1] * view[4]) + F(F(p[2] * view[8]) + view[12])));
    const cy = F(F(p[0] * view[1]) + F(F(p[1] * view[5]) + F(F(p[2] * view[9]) + view[13])));
    const cz = F(F(p[0] * view[2]) + F(F(p[1] * view[6]) + F(F(p[2] * view[10]) + view[14])));

    const s = this.cur;
    const C = [[-s, -s], [s, -s], [s, s], [-s, s]];
    for (let k = 0; k < 4; k++) {
      const o = k * 11;
      this.spriteF[o] = F(cx + C[k][0]);
      this.spriteF[o + 1] = F(cy + C[k][1]);
      this.spriteF[o + 2] = cz;
      this.spriteU[o + 6] = colour;
    }

    d3d.SetTransform(D3DTS_PROJECTION, projFar);
    d3d.SetTransform(D3DTS_VIEW, IDENTITY);
    d3d.SetTransform(D3DTS_WORLD, IDENTITY);
    d3d.applyMaterial(this.spriteMat);
    d3d.DrawIndexedPrimitiveUP(D3DPT_TRIANGLELIST, 0, 4, 2,
      this.indices, D3DFMT_INDEX16, this.spriteB, FVF_SONNET_STRIDE);
    d3d.unapplyMaterial(this.spriteMat);
    if (projNormal) d3d.SetTransform(D3DTS_PROJECTION, projNormal);
    d3d.SetTransform(D3DTS_VIEW, view);
    this.stats.drawMs += ((typeof performance !== 'undefined') ? performance.now() : 0) - t0;
  }

  /**
   * `FUN_00405f8b` pass 2 (mask 4, param_3 = 0) — LAY THE MARKER DOWN.
   *
   * This is the first half of the occlusion test and it must run BEFORE the
   * scene paints, which is why it is a separate entry point: the gap between
   * this call and `stepQuery` below is the entire test.  See scene7.js's
   * `__flareMarker` hook for where that is.
   *
   * `markerFrame` is bumped so `stepQuery` can tell whether the marker actually
   * went down this frame and fall back to the old combined behaviour if it did
   * not — a readback with no marker would score "fully occluded" every frame and
   * silently extinguish the sun.
   */
  stepMarker(view, proj, clearColour) {
    this.probe(view, proj, clearColour);
    this.restoreTransforms(view, proj);
    this.markerFrame = (this.markerFrame | 0) + 1;
  }

  /**
   * `FUN_00405f8b` pass 4 (mask 0xc, param_3 = 1) — READ THE MARKER BACK, then
   * fade and draw the sprite.  Runs after the scene has painted over it.
   *
   * @param {object} o { view, proj, projFar, dt, clearColour }
   */
  stepQuery(o) {
    // No marker this frame -> the back buffer holds no marker to find, and the
    // query would report a total occlusion that never happened.  Do the old
    // marker-then-read-immediately dance instead: it under-reports occlusion,
    // which is the safe direction (a sun that is too bright, not one that is
    // missing).  ONLY reachable if a caller skips the pass-2 hook.
    if (this.markerFrame !== this.queryFrame + 1) {
      this.probe(o.view, o.proj, o.clearColour);
      this.restoreTransforms(o.view, o.proj);
      this.markerFrame = (this.markerFrame | 0) + 1;
    }
    this.queryFrame = this.markerFrame;
    this.update(o.dt);
    this.draw(o.view, o.projFar, o.proj);
  }

  /**
   * Marker, readback and sprite back-to-back.
   *
   * ⚠ This is NOT what the original does and it cannot measure occlusion: the
   * marker lands on top of the finished frame and is read straight back, so the
   * query can only ever answer "visible".  Kept because `?flare=legacy` and the
   * `--compare` baseline both need the pre-split behaviour reproducible.
   */
  step(o) {
    this.probe(o.view, o.proj, o.clearColour);
    this.restoreTransforms(o.view, o.proj);
    this.update(o.dt);
    this.draw(o.view, o.projFar, o.proj);
  }
}

// ===========================================================================
// Attaching it to scene7.js's Landscape without touching that file.
// ===========================================================================
/**
 * Wraps `Landscape.prototype.{build,reset,tick,render}`.  Every hook is
 * additive: the original method runs first and its return value is passed
 * through.
 *
 * @param {Function} Landscape   the class exported by scene7.js
 * @param {Function} texgenImage scene7.js's cached texgen accessor
 * @param {object}   [opts]      { makeQuery(d3d) } to swap the query backend
 */
export function installFlare(Landscape, texgenImage, opts = {}) {
  const proto = Landscape.prototype;
  if (proto.__flareInstalled) return Landscape;
  proto.__flareInstalled = true;

  // Verification aid, in the spirit of main.js's ?skip= : `?flare=0` renders the
  // scenes exactly as they were before this file existed, so the sweep can quote
  // a before/after RMSE without editing anything.
  // ---------------------------------------------------------------------------
  // ⚠ THE MARKER/DRAW SPLIT IS OFF BY DEFAULT AND SHOULD STAY THAT WAY.
  //
  // `?flare=split` opts into it. It is kept only as executable evidence for the
  // conclusion in FLARE.md; it is NOT a work in progress. Measured with
  // `flare_live.mjs --compare=base`, marker-early breaks precisely the scenes
  // with alpha-blended OVERDRAW and leaves every other scene untouched:
  //
  //             marker LAST (default)      marker EARLY (?flare=split)
  //   grove       69.5% vis,  8 flips        69.3% vis,  8 flips   unchanged
  //   beach      100.0% vis,  0 flips         0.0% vis,  0 flips   BREAKS
  //   forest A    99.2% vis,  1 flip          0.0% vis,  0 flips   BREAKS
  //   spires      95.3% vis,  4 flips        95.4% vis,  4 flips   unchanged
  //   cloud sea   15.1% vis,  1 flip         15.1% vis,  1 flip    unchanged
  //
  // The forest's rain and the beach's grass are alpha-blended: they paint over
  // the marker's COLOUR whatever the depth buffer says, so a marker laid down
  // before them is destroyed every frame and the sun is extinguished. That is
  // the whole of "the sun is gone from the forest scene", and it is a property
  // of drawing the marker early, not of any bug the split was meant to fix.
  //
  // Marker-LAST is the original's mechanism, exactly as this file's header
  // describes it: the quad goes down at z = 1.0 with ZFUNC = LESSEQUAL AFTER the
  // depth-writing geometry, so it survives only where nothing wrote depth. That
  // model accounts for every segment above, including the grove pulsing (its
  // leaves are alpha-TESTED, so they do write depth) and the beach not (its
  // grass curtain is `0x1050`, ZWRITEENABLE = 0, so it cannot reject anything).
  // ---------------------------------------------------------------------------
  let off = false, legacy = true;
  try {
    const q = new URLSearchParams(location.search).get('flare');
    off = q === '0';
    legacy = q !== 'split';
  } catch { /* node */ }
  if (off) return Landscape;

  const origBuild = proto.build;
  const origReset = proto.reset;
  const origRender = proto.render;
  const origTick = proto.tick;

  /** The camera state `render` and `tick` both need. `evaluate` is pure. */
  function camState(self) {
    const cam = self.cameras && (self.cameras[self.activeCam] || self.cameras[0]);
    if (!cam) return null;
    const ev = cam.evaluate(self.camTimes[self.activeCam] || 0);
    return { cam, view: cam.viewMatrix(ev.position, ev.target, ev.roll) };
  }

  proto.build = function build() {
    const r = origBuild.call(this);
    if (!this.flare && this.desc) {
      // texgen program 14 is the sun sprite; full mip chain, like every other
      // content texture in the demo (D3D8_API.md §6.1.1).
      // Deliberately NOT wrapped in a try/catch: an untextured flare is a
      // white square over the sun, which looks plausible enough to survive a
      // review, and main.js already swallows scene-build failures far too
      // quietly (see verify/SWEEP.md §5). Let it throw.
      const img = texgenImage(14);
      const tex = this.d3d.createTexture(img.argb, img.w, img.h, { levels: 0 });
      this.flare = new Flare(this.d3d, {
        pos: this.desc.sunPosition,
        max: this.desc.flareParam1,
        rate: this.desc.flareParam2,
        texture: tex,
        width: K.WIDTH,
        height: K.HEIGHT,
        query: opts.makeQuery ? opts.makeQuery(this.d3d) : undefined,
      });
    }
    return r;
  };

  proto.reset = function reset() {
    const r = origReset.call(this);
    if (this.flare) this.flare.reset();
    return r;
  };

  proto.tick = function tick(ctx, draw) {
    const r = origTick.call(this, ctx, draw);
    const f = this.flare;
    if (!f || !this.built || !this.visible || !f.rate) return r;
    const cs = camState(this);
    if (!cs) return r;
    cs.cam.far = this.desc.fogEnd;
    if (typeof this.sunY === 'number' && this.sunY !== null) f.pos[1] = this.sunY;
    // ONCE PER SIMULATION STEP, not once per call. scene7 advances in whole
    // fixed steps now (re/scenes/FRAME_RATE.md), so a tick may carry none or
    // several; integrating per call would make the sun's ramp depend on the
    // caller's cadence, which is the bug the fixed step exists to remove.
    const proj = cs.cam.projectionMatrix();
    const n = this.simStepsThisCall | 0;
    for (let i = 0; i < n; i++) f.updateOffline(cs.view, proj, 1.0);
    return r;
  };

  /**
   * `FUN_00405f8b` PASS 2 — called by scene7.js's render, after the cloud
   * composite and the camera transforms and before any scene geometry.
   *
   * It lives on the prototype rather than inside `render` because the marker
   * needs THIS frame's camera matrices, and scene7's `#advance()` is what
   * produces them; only scene7 knows that moment. Left undefined under
   * `?flare=legacy` so scene7's `if (this.__flareMarker)` guard skips it.
   */
  if (!legacy) {
    proto.__flareMarker = function __flareMarker(view, proj) {
      const f = this.flare;
      if (!f || !this.built || !this.visible) return;
      // Object 7's sunset ramp moves the sun during the scene; the marker has to
      // track it or the probe samples where the sun no longer is.
      if (typeof this.sunY === 'number' && this.sunY !== null) f.pos[1] = this.sunY;
      f.stepMarker(view, proj, (this.fogColour >>> 0));
    };
  }

  proto.render = function render(layer, ctx) {
    const r = origRender.call(this, layer, ctx);
    const f = this.flare;
    if (!f || !this.built || !this.visible) return r;

    // `render` has already advanced the clock and the camera time, and
    // CameraPath.evaluate is pure, so re-evaluating reproduces exactly the view
    // the scene just drew with.
    const cs = camState(this);
    if (!cs) return r;
    const cam = cs.cam, view = cs.view;
    const savedFar = cam.far;
    const proj = cam.projectionMatrix();
    cam.far = K.FLARE_FAR;
    const projFar = cam.projectionMatrix();
    cam.far = savedFar;

    // FUN_00408eef mutates the sun sprite's Y during object 7's sunset ramp
    // (mat+0x04 = 200.0 - t*150.0, [0x418eb8]/[0x418e9c]).  scene7.js already
    // computes it as `this.sunY`; the light keeps the descriptor position.
    if (typeof this.sunY === 'number' && this.sunY !== null) f.pos[1] = this.sunY;

    // The pass-4 half. `__flareMarker` (installed below, called from scene7's
    // render right after the camera transforms) has already laid the marker down
    // and the scene has painted over it, so this is a real occlusion test.
    // `legacy` keeps the old both-at-frame-end order for A/B.
    // Same rule as the tick wrapper, but the query/draw must happen exactly
    // ONCE — so the extra steps are pure ramp integration and the final one
    // carries the draw. (The precip path in scene7 is split the same way.)
    const n = this.simStepsThisCall | 0;
    for (let i = 1; i < n; i++) f.update(1.0);
    const stepDt = n > 0 ? 1.0 : 0;
    if (legacy) {
      f.step({ view, proj, projFar, dt: stepDt, clearColour: (this.fogColour >>> 0) });
    } else {
      f.stepQuery({ view, proj, projFar, dt: stepDt, clearColour: (this.fogColour >>> 0) });
    }

    // Diagnostics for test/sweep.mjs.  Read-only; nothing here feeds the image.
    try {
      (globalThis.__sonnetFlare ||= {})[this.sceneIdx] = {
        obj: this.objIndex, pos: f.pos.slice(), screenX: f.screenX, screenY: f.screenY,
        onScreen: f.onScreen, fraction: f.fraction, visible: f.visible,
        cur: f.cur, max: f.max, rate: f.rate,
        marker: f.marker, queryMs: f.query.lastMs, queryTotalMs: f.query.totalMs,
        want: f.query.lastWant, found: f.query.lastFound,
        queryCalls: f.query.calls, probeMs: f.stats.probeMs, drawMs: f.stats.drawMs,
      };
    } catch { /* diagnostics only */ }
    return r;
  };

  return Landscape;
}

export default installFlare;
