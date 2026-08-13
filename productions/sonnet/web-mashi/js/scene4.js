// scene4.js — Sonnet, timeline object 4 (sceneIdx 1, descriptor res 29,
// camera res 37+38, t 0x0700..0x0a00) — the dark landscape with the lakes.
//
// A wrapper around the one shared Landscape class (scene7.js); see
// re/scenes/CONSOLIDATION.md.
//
// descriptor res 29 is the shortest of the eight (83 bytes, header only: no
// arrays at all).  Everything on screen is:
//   * the terrain, hmap program 23, N = 64, scale (3, 0.5, 3), VISIBLE
//     (flag bit 16) — the only one of scenes 0..3 that shows it;
//   * a water plane at level 1.0, coarse 4x4 (bit 13 clear), whose level is
//     ANIMATED by flag bit 17: FUN_00408eef forces desc+0x10 to 0 before music
//     position 0x820 and to 1.0 after.  The script's m4(1) at 0x0820 switches
//     to the second camera at the same instant, so the water and the cut land
//     together — that is the moment the lakes appear in the reference.
//     (scene7.js's port had no bit-17 handling at all; the merge restores it,
//     and with it the gate on the reflection pass and the water surface.)
//   * a cloud layer (bit 9), cloudCount 3, size 250, colour 0xffffff.  Bit 10
//     is CLEAR, which selects the CURVED 16x16 DOME (see scene6.js's header and
//     CONSOLIDATION.md §2 — the meshgen parameter's polarity is the inverse of
//     FUN_0040ec28's argument, so the raw bit is what gets passed).  Since
//     terrainVisible is set and bit 10 is clear, FUN_004082a9 also parents the
//     layer to `terrainScale * 2` with y halved.  It matters here beyond the
//     shape: with a cloud layer present FUN_00408eef does NOT clear the colour
//     buffer before the reflection pass, so the sky comes from the geometry;
//   * the sun at (-400, 374, 400) — note FUN_004082a9 PATCHES desc+0x36 to
//     374.0f for scene 1 only, which scene_desc.mjs already applies;
//   * fog 0x00c8c8ff / 400 / 700.
// flag bit 24 (terrainOpt24) is set, which makes FUN_0040e058's param_13 zero
// and therefore SKIPS the second ground-texture program pass.  Not ported.
//
// m7 at 0x0720 sets +0x144, which in FUN_00408eef gates the water-level fade
// accumulator at +0x140.

import { Landscape } from './scene7.js';

export function makeScene4(d3d, opts = {}) {
  return new Landscape(d3d, 1, { objIndex: 4, ...opts });
}

export default makeScene4;
