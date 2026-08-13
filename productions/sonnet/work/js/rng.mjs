// The demo's ONE global pseudo-random stream.
//
// `FUN_0040424e` (srand) / `FUN_00404258` (rand), the MSVC LCG, over the single
// global seed at **[0x41a9b8]**:
//
//     0040425C  mov  eax,[0x41a9b8]
//     00404261  imul eax,eax,0x343fd        ; 214013
//     00404267  add  eax,0x269ec3           ; 2531011
//     0040426C  mov  [0x41a9b8],eax
//     00404271  sar  eax,0x10 ; and eax,0x7fff
//
// ⚠ THERE IS EXACTLY ONE STREAM, AND THAT IS LOAD-BEARING. The mesh generators,
// the texture VM (`FUN_00416036`'s programs call this same `rand` — op33 at
// 0x414e71/0x414e8d), the impostor bake's per-pass yaws and the billboard yaws
// all draw from it, in binary order. The port used to keep meshgen and texgen on
// SEPARATE streams ("same algorithm, separate stream"), which silently changed
// what every procedural generator produced downstream — that is precisely the
// class of bug that made the tree impostor build a different stochastic tree for
// months (re/scenes/TREE_IMPOSTOR.md).
//
// Anything that draws from this stream is part of the demo's determinism. Do not
// add a private PRNG "so a module has no dependency"; add a call here instead.
let SEED = 1 >>> 0;

export function srand(s) { SEED = s >>> 0; }

export function rand() {
  SEED = (Math.imul(SEED, 214013) + 2531011) >>> 0;
  return (SEED >>> 16) & 0x7fff;
}

/** Read the position without disturbing it — for verification harnesses and for
 *  asserting a generator's draw count (see meshgen's `consumeShadowBakeRandoms`). */
export function randState() { return SEED >>> 0; }
