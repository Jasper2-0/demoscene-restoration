// scene3.js — Sonnet, timeline object 3 (sceneIdx 0, descriptor res 28,
// camera res 36, t 0x0400..0x0700) — the bright "shine for me" shot.
//
// This file used to carry a SECOND, independent port of the Landscape class for
// objects 3..6.  There is only one such class in the original (class id 3 in the
// table at 0x41a038, ctor FUN_00402d27 -> `new 0x15c` + FUN_00408251, vtable
// PTR_FUN_00418e68 = {init 0x408d72, render 0x408eef, event 0x409acb,
// dtor 0x408276}), so the two ports have been merged into the one in scene7.js
// and everything here is now a three-line wrapper.  What each port had that the
// other lacked, and what was dropped, is in re/scenes/CONSOLIDATION.md.
//
// See re/scenes/SCENES_2_6.md for this scene's derivation and confidence table.
//
// descriptor res 28:  terrain HIDDEN (flag bit 16 clear), no water, no clouds,
// fog 0x00c8c8ff / 500 / 800 (the lavender sky the reference shows), sun at
// (0, 400, 0) with flareParam1 = 300 and flareParam2 = 0 (constant size), and
// ONE array-A cluster: 80 surface-of-revolution spires scattered in a
// 150 x 150 box around (106, 40, 24), radius 3.2, heightRatio 160 -> 512 units
// tall.  Those are the grass blades that sweep across the sun at ~65 s.  Their
// material carries the SPHERE MAP bit 0x20 over texgen program 2 and the
// generator writes no UVs at all, so they are environment-mapped — that is
// where their yellow-green sheen comes from.
//
// Camera res 36, 3 keys, t 0..192; the scene lasts 192 rows = 31.3 s and the
// camera clock runs at 6.4 units/s, so it ends at t = 200 — just past the last
// key, which is why the shot settles.
// The script fires m1(0) at 0x042a, which is what starts the spires growing
// (FUN_0040bfc1, y scale 0.001 -> 1 at desc.paramA * dt * 0.01).

import { Landscape } from './scene7.js';

export function makeScene3(d3d, opts = {}) {
  return new Landscape(d3d, 0, { objIndex: 3, ...opts });
}

export default makeScene3;
