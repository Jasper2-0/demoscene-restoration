// scene6.js — Sonnet, timeline object 6 (sceneIdx 3, descriptor res 31,
// camera res 42, t 0x0f00..0x1200) — the SEA OF CLOUDS.
//
// A wrapper around the one shared Landscape class (scene7.js); see
// re/scenes/CONSOLIDATION.md.
//
// descriptor res 31: terrain scale (5, 0.001, 5) — a dead-flat plate — and
// flag bit 16 (terrainVisible) is CLEAR, so the terrain is not drawn at all.
// What is on screen is therefore only:
//   * the fog-colour clear, 0x00c8c8ff, with fog 2950..3000 (the largest fog
//     range in the demo; fog end doubles as the camera far plane, so the far
//     plane here is 3000 rather than the usual 700-800);
//   * the cloud layer (flag bit 9) with cloudCount 3, cloudParam 180,
//     cloudSize 200, colour 0xffffff.  Bits 10 AND 11 are both set, which is
//     the ONLY scene where that happens.
//
//     THE ONE PLACE THE TWO PORTS FLATLY CONTRADICTED EACH OTHER, and this
//     scene is where it shows.  FUN_0040ec28's argument really is
//     `~(byte)(desc[0x4f] >> 10) & 1`, which is what scene7.js computed — but
//     inside FUN_0040ec28 the branch is `if (param_7 == '\0') { stacked }`,
//     whereas `MG.buildCloudSky` is written `if (opt10) { stacked }`.  The
//     meshgen parameter is the OPPOSITE POLARITY of the original's argument, so
//     the value to pass it is the RAW BIT — which is what scene3.js did.
//     Bit 10 is set here, so object 6 gets the STACKED FLAT LAYERS, and because
//     bit 11 is also set it gets the 8-layer / K = 4 / max(t, 1-t) variant: a
//     bright band top and bottom, which is exactly the "sea of clouds seen
//     edge-on" the reference shows.  SCENES_2_6.md §4 reached the right answer
//     from the picture; CONSOLIDATION.md §2 has the mechanism, and the measured
//     effect (0x0f30 RMSE 35.4 -> 23.0, mean luma 138.6 -> 159.7 against the
//     reference's 160.5);
//
//     Its material is FUN_00401c67(mat, RT, 0, 0x3091) rather than the 0x1050
//     every other cloud scene gets, because that too is keyed on bit 11;
//   * the sun at (0, 440, 400), flareParam1 = 300, flareParam2 = 0;
//   * 4 species-1 birds at (0, 300, 0), radius 100 (flag bit 14), which now fly.
//
// m10 at 0x1100 sets +0x14c, which in FUN_00408eef starts the cloud-layer
// dissolve accumulator at +0x150 advancing by dt * 0.003 (0x418ea8).  The
// accumulator runs; the inline cloud vertex-colour grey/fade it drives is not
// ported (it was not ported in either port).

import { Landscape } from './scene7.js';

export function makeScene6(d3d, opts = {}) {
  return new Landscape(d3d, 3, { objIndex: 6, ...opts });
}

export default makeScene6;
