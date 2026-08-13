// scene9.js — Sonnet object 9 (sceneIdx 7): ICE / SNOW.
//
// Descriptor res 34, camera res 48..49, music positions 0x1e00-0x2300.
//   water 0, N = 128 (watch the index width), hmap prog 22, ground 20/18,
//   scale (3, 1.6, 3)
//   flags 0x000d0050 = billboards0 | precip | terrainVisible | billboard0Opt
//                    | precipOpt
//   snow: 4096 particles, type 0, box (60, 128, 60)
//   fog:  0x00c9cdd0 (pale ice grey), 50 .. 300  -> a very close far plane
//   1 billboard cluster: 20 instances over +-350, size 25
//
// Timeline: m252=2 (layer 2), m255=1, m6=1 at 0x1e00; m4=1 (camera path 1) at
// 0x2000; m255=0 at 0x2300.
//
// N = 128 gives 16384 vertices — still inside D3DFMT_INDEX16, so the mesh keeps
// u16 indices (meshgen's `Mesh.indexFormat` reports 0x65 and the shim uses the
// array class anyway).  Only a tessellated remaster would need Uint32Array.

import { Landscape } from './scene7.js';

export function buildScene9(d3d, opts = {}) {
  return new Landscape(d3d, 7, { objIndex: 9, ...opts });
}

export default buildScene9;
