// sync.mjs - music-position helper for the graphics timeline.
//
// The Lost Vegas demo timeline is driven by MUSIC POSITION, not wall clock. The exe's
// FUN_004051ef() derives the value that the master loop FUN_0040f285 compares against
// the hard-coded scene thresholds (0x114, 0x200, 0x600, 0x800, 0xa00, 0xc00, 0xe00,
// 0x1200, 0x1400, 0x1600, 0x1a20; end clamp 0x3000).
//
// Source of the value (re/out/lv.c):
//   FUN_00410289 (audio callback) snapshots  EBP+0x4ba0 = row (EBP+6),
//                                             EBP+0x4ba4 = order (EBP+0x12)
//   FUN_00410678 returns  (order & 0xff) << 8 | (row & 0xff)         [16-bit]
//   FUN_004051ef:  p = (raw - 1) & 0xffff
//                  if (p > 0x3000) p = 0
//                  if (p > 0x1ff)  p += 0x200
//
// `order` = index into the order table (0..songLength-1), `row` = row within the
// current pattern. The reconstructed vegas.xm preserves the MXM order/pattern numbering
// 1:1 (no reorder/merge), so xm.js's live `position` (order) and `row` map directly.

/** Raw 16-bit MXM song position: (order<<8)|row, exactly as FUN_00410678 returns. */
export function rawMusicPos(player) {
  return (((player.position & 0xff) << 8) | (player.row & 0xff)) & 0xffff;
}

/**
 * The timeline position the graphics thresholds are compared against, i.e. the exact
 * value FUN_004051ef() returns. Call once per frame during live playback and gate the
 * scene ladder on it: a scene runs while `musicPos(player) < THRESHOLD`.
 */
export function musicPos(player) {
  let p = (rawMusicPos(player) - 1) & 0xffff;
  if (p > 0x3000) return 0;
  if (p > 0x1ff) p = (p + 0x200) & 0xffff;
  return p;
}

/** The hard-coded scene thresholds from FUN_0040f285, in order. */
export const SCENE_THRESHOLDS = [
  0x114, 0x200, 0x600, 0x800, 0xa00, 0xc00, 0xe00, 0x1200, 0x1400, 0x1600, 0x1a20,
];
export const END_CLAMP = 0x3000;
