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

// Apply the engine's clamp/offset to a raw replayer position.
export function normalizePos(raw) {
  let p = raw & 0xffff;
  if (p > 0x1ff) p += 0x200;
  return p > POS_MAX ? POS_MAX : p;
}
