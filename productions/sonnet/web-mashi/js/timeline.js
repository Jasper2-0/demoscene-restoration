// Sonnet — the timeline VM.
//
// A 1:1 port of FUN_00402d87 (the scene manager's per-frame tick) plus the event
// table at VA 0x41a048. See work/re/ENGINE.md for the reverse engineering.
//
// The original separates SCRIPT from ENGINE: 293 time-sorted records drive virtual
// method calls on eleven C++ objects. We keep that separation — the script ships as
// assets/timeline.json exactly as decoded, so the demo's pacing is authentic by
// construction rather than by transcription.
//
//   struct Event { u16 time; u8 objIndex; u8 method; f32 param; };   // 8 bytes
//
// Dispatch in the original is  objects[objIndex]->vtbl[8](method, param).
// Here each scene object exposes  event(method, param).
//
// Time is MUSIC POSITION, not wall clock: (order << 8) | row, straight from the
// MiniFMOD player. At the song's speed 6 / BPM 92 a row lasts 6*2.5/92 = 0.1630 s.
// The demo ends at position 0x2c0f (order 44 = the song's last order, row 15).

export const END_POSITION = 0x2c0f;
export const ROW_SECONDS = 6 * 2.5 / 92;   // 0.163043…
export const INIT_POSITION = 0xffff;       // sentinel: run setup events only
export const LAYER_COUNT = 16;

/** Music position -> seconds from the start of the song. */
export function positionToSeconds(pos) {
  return ((pos >> 8) * 64 + (pos & 0xff)) * ROW_SECONDS;
}

/** Seconds -> music position, the inverse of positionToSeconds. */
export function secondsToPosition(sec) {
  const totalRows = Math.floor(sec / ROW_SECONDS);
  return ((Math.floor(totalRows / 64) & 0xff) << 8) | (totalRows % 64);
}

export class Timeline {
  /**
   * @param {{events: Array<{t:number,obj:number,m:number,u32:number,f:number}>}} data
   *        parsed assets/timeline.json
   * @param {Array<{event?:Function, render?:Function, layer?:number}>} objects
   *        index-addressed exactly as the original's object array
   */
  constructor(data, objects) {
    this.events = data.events;
    this.objects = objects;
    this.cursor = 0;          // this[2] in the original: only ever moves forward
    this.lastPosition = -1;
  }

  /** Rewind the script. Does not touch the objects' own state. */
  reset() {
    this.cursor = 0;
    this.lastPosition = -1;
  }

  /**
   * Run the setup pass. The original calls the same tick with 0xffff, which fires
   * ONLY the records whose time is 0xffff and skips everything else.
   */
  init() {
    for (const e of this.events) {
      if (e.t === INIT_POSITION) this.#dispatch(e);
    }
  }

  /**
   * Fire every event up to `position`, then render.
   * Port of FUN_00402d87's two phases.
   */
  tick(position, renderContext) {
    this.dispatchUpTo(position);
    this.render(renderContext);
  }

  /** Phase 1: fire pending events. The cursor never rewinds, so events fire once. */
  dispatchUpTo(position) {
    while (this.cursor < this.events.length) {
      const e = this.events[this.cursor];
      if (e.t > position) break;
      // 0xffff records belong to the init pass and are skipped during playback.
      if (e.t !== INIT_POSITION) this.#dispatch(e);
      this.cursor++;
    }
    this.lastPosition = position;
  }

  /**
   * Phase 2: sixteen layer passes. Every object whose layer matches draws, and the
   * engine clears ONLY the depth buffer between layers (D3DCLEAR_ZBUFFER, flag 2)
   * so layers composite over one another rather than erasing the colour.
   */
  render(ctx) {
    for (let layer = 0; layer < LAYER_COUNT; layer++) {
      for (const obj of this.objects) {
        if (!obj || obj.layer !== layer || !obj.render) continue;
        ctx?.beginLayer?.(layer);
        obj.render(layer, ctx);
      }
    }
  }

  #dispatch(e) {
    const obj = this.objects[e.obj];
    if (!obj) return;                 // object not yet ported — skip, don't crash
    if (typeof obj.event !== 'function') return;
    obj.event(e.m, e.f, e.u32);
  }
}

/**
 * Seeking. Scene objects accumulate state from the events they receive, so jumping
 * straight to a position leaves them unconfigured — the sibling project lost time to
 * exactly this (text fades started from zero and overlays looked missing). Replaying
 * the script from the beginning is cheap here: 293 records, no per-frame work.
 */
export function seek(timeline, position) {
  timeline.reset();
  timeline.init();
  timeline.dispatchUpTo(position);
}

/** Method numbers shared across objects (see re/ENGINE.md). */
export const M = {
  ENABLE: 255,   // visibility toggle; 1 = on, 0 = off
  SCALAR_254: 254,
  SCALAR_252: 252,
};

/** Which object index is active at a given music position, per the ENABLE events. */
export function activeSceneAt(data, position) {
  let active = null;
  for (const e of data.events) {
    if (e.t > position) break;
    if (e.m === M.ENABLE && e.obj >= 3) active = e.f ? e.obj : (active === e.obj ? null : active);
  }
  return active;
}
