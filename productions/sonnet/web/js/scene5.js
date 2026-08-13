// scene5.js — Sonnet, timeline object 5 (sceneIdx 2, descriptor res 30,
// camera res 39/40/41, t 0x0a00..0x0f00) — the GREEN FOREST.
//
// A wrapper around the one shared Landscape class (scene7.js); see
// re/scenes/CONSOLIDATION.md.  THE CONSOLIDATION'S HEADLINE WIN IS HERE: the
// billboard impostor baker (FUN_0040abed / FUN_0040b0b0) had been ported into
// scene7.js only, so this scene — whose four array-C clusters ARE the forest —
// was rendering as bare ground and sky.  verify/SWEEP.md item 2 attributes its
// worst samples (RMSE up to 113 at 0x0c08) precisely to that.
//
// descriptor res 30 is the busiest of the eight:
//   * terrain, hmap program 22, N = 64, scale (5, 1.5, 5), VISIBLE.  Program 22
//     peaks at only 38/255, so the ground is a nearly flat green field —
//     which is what the reference shows under the trees;
//   * FOUR array-C billboard clusters (flag bit 4): 10 at (0,0,-150) size 100,
//     5 at (-300,20,300) size 87.5, 5 at (300,20,300) size 125, 10 at
//     (0,20,300) size 100.  These are the TREES, and they are IMPOSTORS —
//     FUN_0040abed renders one procedurally generated tree (FUN_00409d45) from
//     2 angles into render targets that FUN_0040b0b0 uses as the quad textures;
//   * one array-D cluster (bit 5): 256 ground-cover billboards, size 1.6,
//     spread over a 300 x 300 box — the dandelion ground cover.  PORTED
//     2026-08-09 (FUN_0040b0b0 type 1 off impostor set 2, baked from
//     FUN_0040c721); see re/scenes/DANDELIONS.md;
//   * one array-F compound prop (bit 15) at the origin, param 0.15 — the big
//     foreground dandelion.  BUILT and drawn, but STATIC: its wind updater
//     FUN_0040cfed is unported, so it does not shed the drifting seeds the
//     reference shows.  `m2(0)` sets `propArmed`, which nothing reads yet;
//   * one array-G flock (bit 14): 256 SPECIES-0 "birds" at (0, 80, 0),
//     radius 100 — those are the butterflies.  They now FLY (FUN_0040fba1,
//     merged in from scene7.js) instead of hanging still;
//   * fog 0x0086c8ff (sky blue) / 500 / 800, sun at (0, 400, 400) with
//     flareParam1 = 300 and flareParam2 = 50 — the only one of scenes 0..3 with
//     a non-zero flare grow rate, i.e. the only one whose sun genuinely pulses
//     as the trees occlude it.  With the impostors present, js/flare.js's
//     occlusion query now has something to occlude it WITH.
//
// Script: m4(1) at 0x0b20 and m4(2) at 0x0c20 walk the three camera paths
// (res 39 t<=96, res 40 t<=64, res 41 t<=160 — 5.2 s, 10.4 s and 26.1 s of
// scene time at the 6.4 units/s camera clock, which matches each path's key
// range exactly).  m2(0) at 0x0c20 triggers the compound prop.

import { Landscape } from './scene7.js';

export function makeScene5(d3d, opts = {}) {
  return new Landscape(d3d, 2, { objIndex: 5, ...opts });
}

export default makeScene5;
