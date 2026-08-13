// scene8.js — Sonnet object 8 (sceneIdx 5): AUTUMN.
//
// Descriptor res 33, camera res 46..47, music positions 0x1700-0x1e00.
//   water 0, N = 64, hmap prog 24, ground 20/18, scale (4, 1.5, 4)
//   flags 0x008502d8 = trees | billboards0 | precip | precipRT | cloudLayer
//                    | terrainVisible | billboard0Opt | autumnLeaves
//   rain: 768 particles, type 1     clouds: 2 layers, 0xc8c8c8, size 150
//   fog:  0x00a34701 (orange), 700 .. 1000
//   1 tree at (-120, 10, 50), bend (0.175, 0.2, 0), scale 0.75
//
// Timeline methods it receives: m255=1, m6=1, m4=1 (camera path 1) at 0x1700,
// m4=0 at 0x1900, m9=0 at 0x191f (activate tree 0), m255=0 at 0x1e00.
// It never gets m252, so its layer stays at the ctor default 0 (FUN_004060ac).
//
// MESHGEN_PORT.md §2 correction, honoured in scene7.js's builder: the autumn
// colour is a per-texel MODULATE on the generated leaf texture, not a vertex
// colour — the tree's vertex colours stay 0xFFFFFFFF.

import { Landscape } from './scene7.js';

export function buildScene8(d3d, opts = {}) {
  return new Landscape(d3d, 5, { objIndex: 8, ...opts });
}

export default buildScene8;
