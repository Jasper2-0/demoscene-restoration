// Lost Vegas timeline — the demo's "script".
//
// There is no script data table in this intro: the sequence IS a ladder of
// `while (musicPos < THRESHOLD)` blocks in the master loop FUN_0040f285.
// See work/re/engine/{FRAME_LOOP,EFFECTS_OVERVIEW}.md.
//
// musicPos is a 16-bit song position from the replayer (FUN_004051ef →
// FUN_00410678), clamped to <= 0x3000, with +0x200 added once the raw value
// passes 0x1ff. Everything is sequenced against it, so the port stays locked
// to the soundtrack regardless of frame rate — no sync map needed.

export const POS_MAX = 0x3000;

// Scene ladder, in order. `until` = the exclusive upper bound on musicPos.
// `id` matches the effect module registered in effects/registry.js.
// Original init/render addresses kept for traceability to the decompile.
export const SCENES = [
  { id: 'intro_titles', until: 0x200, init: null,       render: '00404dd0',
    note: 'threestate / lost vegas scrolling titles (2D text)' },
  { id: 'sceneA',       until: 0x600, init: '00407880', render: '004078a0' },
  { id: 'sceneB',       until: 0x800, init: '0040ccd0', render: '0040cce0' },
  { id: 'sceneC',       until: 0xa00, init: '0040af60', render: '0040af80' },
  { id: 'sceneD',       until: 0xc00, init: '0040bf50', render: '0040bf80',
    note: 'fade-controlled via _DAT_005101bc in [0,1]' },
  { id: 'sceneE',       until: 0xe00, init: '00409d8d', render: '00409da6',
    arg: 0, note: 'geodesic sphere + billboard particles' },
  { id: 'sceneF',       until: 0x1200, init: '00408cc0', render: '00408e90' },
  { id: 'sceneE2',      until: 0x1400, init: '00409d8d', render: '00409da6',
    arg: 1, note: 'scene E variant' },
  { id: 'credits',      until: 0x1600, init: '00406500', render: '00406520',
    note: 'credits / text scroller' },
  { id: 'finale',       until: 0x1a20, init: '0040e940', render: '0040eb90' },
];

// Which scene owns a given music position (null once past the last threshold).
export function sceneAt(pos) {
  for (const s of SCENES) if (pos < s.until) return s;
  return null;
}

/**
 * Order start times in seconds, measured from our own xm.js render, and the row
 * duration at the module's speed/BPM.
 *
 * WHY THIS IS HERE RATHER THAN A CONSTANT. main.js used to convert with
 * `MS_PER_POS = 176700 / 0x1a20` = 26.42 ms per position UNIT, which is a
 * pos-space average and is only correct at the endpoint: `pos = (order << 8) |
 * row` is SPARSE — only 64 of every 256 values occur — and normalizePos adds a
 * +0x200 discontinuity past 0x1ff. A row actually lasts 120 ms, so the flat
 * average was out by ~4.5x per row.
 *
 * That mattered more than a wrong axis label: `ms` is exactly what scenes D, E
 * and F integrate (eff_d's blobS/spinX, eff_f's dt), so every cadence
 * experiment, pre-roll and equivalence test run against the old constant was
 * measuring a broken clock. This had to land before any determinism work.
 *
 * The table lived in work/verify/compare.mjs, i.e. Node-side, where the page
 * could not see it — so the harness and the demo disagreed about what time it
 * was. It is exported so compare.mjs can import it instead of keeping a copy.
 */
export const ORDER_SECONDS = Object.freeze([
  0, 5.6, 9.3, 17.1, 24.9, 32.3, 40.1, 47.9, 55.4, 63.2, 71.0, 74.7, 78.4,
  86.2, 94.0, 101.4, 109.2, 117.0, 124.5, 132.3, 140.1, 147.5, 155.3, 163.1,
  171.3,
]);
export const ROW_SECONDS = 0.120;

/**
 * Music position -> seconds from the start of the song, or null if the position
 * is outside the mapped range.
 *
 * Takes a NORMALIZED position (the +0x200 already applied) and undoes that
 * offset to index the order table, exactly as the measured mapping does.
 */
export function posToSeconds(pos) {
  const raw = pos > 0x3ff ? pos - 0x200 : pos;
  const order = raw >> 8, row = raw & 0xff;
  if (order < 0 || order >= ORDER_SECONDS.length || row >= 64) return null;
  return ORDER_SECONDS[order] + row * ROW_SECONDS;
}

/** Seconds -> normalized music position; the inverse of posToSeconds. */
export function secondsToPos(sec) {
  let order = 0;
  while (order + 1 < ORDER_SECONDS.length && ORDER_SECONDS[order + 1] <= sec) order++;
  const row = Math.min(63, Math.max(0, Math.floor((sec - ORDER_SECONDS[order]) / ROW_SECONDS)));
  return normalizePos((order << 8) | row);
}

// Apply the engine's clamp/offset to a raw replayer position.
export function normalizePos(raw) {
  let p = raw & 0xffff;
  if (p > 0x1ff) p += 0x200;
  return p > POS_MAX ? POS_MAX : p;
}
