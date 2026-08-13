// scene10.js — Sonnet object 10 (sceneIdx 8): ICE, the credits shot.
//
// Descriptor res 35, camera res 50..51, music positions 0x2300-0x2b00.
//   water 0, N = 128, hmap prog 26, ground 27/27, scale (2, 1, 2)
//   flags 0x00010300 = terrainOpt8 | cloudLayer | terrainVisible
//   clouds: 2 layers, white, size 256          fog: 0x0051a2e1, 200 .. 1000
//   no arrays at all — the descriptor is the bare 83-byte header.
//
// Two things are unique to this scene and both come straight from the binary:
//
//  1. `FUN_0040e058` special-cases `param_1 == 8`: the terrain's stage-1 texture
//     is `groundTexProgB` (program 27) instead of the shared 512x512 detail
//     texture, and the material flag word is **0x3a** instead of 0x18 — i.e.
//     0x20 | 0x02, the camera-space-normal SPHERE MAP with the +-2.0 texture
//     matrix.  That reflective sheen is what makes the ice read as ice.
//
//  2. descriptor flag bit 8 (`terrainOpt8`) is set, and `FUN_004082a9` reads it
//     as "do not register the sun light; set the scene root's ambient to
//     0xFFFFFFFF instead".  `FUN_00406004` skips `setLighting(1, ambient)` when
//     the ambient is -1, so this scene is rendered completely UNLIT — every
//     vertex passes through at full diffuse.
//
// Timeline: m252=2 (layer 2), m255=1, m6=1 at 0x2300; m4=1 at 0x2700;
// m255=0 at 0x2b00 (the last scene event in the demo).

import { Landscape } from './scene7.js';

export function buildScene10(d3d, opts = {}) {
  return new Landscape(d3d, 8, { objIndex: 10, ...opts });
}

export default buildScene10;
