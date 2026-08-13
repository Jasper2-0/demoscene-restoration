// scene7.js — Sonnet object 7 (sceneIdx 4): the beach / hi-res water scene,
// PLUS **the** shared `Landscape` class.
//
// The original has ONE class for every outdoor scene (vtable PTR_FUN_00418e68,
// ctor FUN_00408d72, build FUN_004082a9 + FUN_00407983, event handler
// FUN_00409acb, render FUN_00408eef).  The class-id array at 0x41a038 is
// [1,2,0,3,3,3,3,3,3,3,3], so timeline objects 3..10 are EIGHT INSTANCES of it,
// differing only by the descriptor index the `m3` init event passes to
// FUN_004082a9 (res 28..35 => sceneIdx 0,1,2,3,4,5,7,8).
//
// This file used to serve objects 7..10 only, while scene3.js carried a second,
// independent port of the same class for objects 3..6.  They have been merged:
// scene3/4/5/6/8/9/10.js are now all thin wrappers that pick a sceneIdx, and
// every gated path either port discovered lives here.  See
// re/scenes/CONSOLIDATION.md for what came from where and what was dropped.
//
// Timeline: obj 7, sceneIdx 4, descriptor res 32, camera res 43..45,
//           music positions 0x1200-0x1700.
//
// See re/scenes/SCENES_7_10.md and re/scenes/SCENES_2_6.md for the reverse
// engineering and confidence notes.

import * as MG from '../../work/js/meshgen.mjs';
import { RESOURCES } from '../../work/js/resources.mjs';
import { runTexgen } from '../../work/js/texgen.mjs';
import { decodeSceneDescriptor, DESC_RES_MAP } from '../../work/js/scene_desc.mjs';
import { CameraPath, CAM_RES_BASE } from '../../work/js/camera.mjs';
import {
  D3DMatrix, D3DTS_WORLD, D3DTS_VIEW, D3DTS_PROJECTION,
  D3DPT_TRIANGLELIST, FVF_SONNET_STRIDE, D3DLIGHT_POINT,
  D3DRS_CLIPPLANEENABLE, D3DRS_ZFUNC, D3DCMP_ALWAYS, D3DCMP_LESSEQUAL,
} from './minid3d8.js';

const F = Math.fround;
const ZERO3 = [0, 0, 0];

// `FUN_00401abf` receives fog start/end as raw float BIT PATTERNS (they are
// dwords copied straight out of the descriptor), and minid3d8's `_asFloat`
// resolves the same ambiguity the same way: an integral JS number > 64 is read
// as a bit pattern, not as a value.  Scene 4's fogStart is exactly 600.0, which
// would decode as 8.4e-43 and fog the whole world to the sky colour — that is a
// real trap, so hand the shim the bit pattern the original hands D3D.
const _fb = new DataView(new ArrayBuffer(4));
function f32bits(x) { _fb.setFloat32(0, x, true); return _fb.getUint32(0, true) >>> 0; }

/**
 * FUN_00404224 — x87 `fistp` under the default control word, i.e. round-half-to
 * EVEN.  Not `Math.trunc` and not `Math.round`.  Every `m N` index and every
 * float-to-int in the generators goes through it.  (Same function js/flare.js
 * transcribes; duplicated rather than imported so scene7.js keeps no dependency
 * on the flare, which attaches itself from outside.)
 */
function ftol(x) {
  if (!Number.isFinite(x)) return 0;
  const f = Math.floor(x);
  const d = x - f;
  if (d > 0.5) return f + 1;
  if (d < 0.5) return f;
  return (f % 2 === 0) ? f : f + 1;
}

// ---------------------------------------------------------------------------
// Constants, all read out of unpacked/sonnet_img.bin at their VAs.
// ---------------------------------------------------------------------------
const K = {
  TIME_RATE: 0.009999999776482582,   // [0x418260]  the generic dt multiplier
  CAM_SPEED: 6.400000095367432,      // [0x418e8c]  camera+0x110 units per +0xc
  FRAME_BASE: 1000.0,                // [0x418300]  ms per "1.0" of +0xc
  INV255: 0.003921568859368563,      // [0x418298]
  LIGHT_RANGE: 1500.0,               // [0x418e?]   light +0x118 = 0x44bb8000
  ATT_MIN: 9.999999747378752e-05,    // [0x4182f0]
  AMBIENT: 0x1f1f1f1f,               // scene root +0x14
  PRECIP_FADE_RAIN: 0.07999999821186066, // [0x418ebc]  precipType != 0
  PRECIP_FADE_SNOW: 0.009999999776482582,// [0x418260]  precipType == 0
  PRECIP_RAMP: 0.003000000026077032, // [0x418ecc]
  WATER_CLIP: 1.100000023841858,     // [0x418ea0]
  GLITTER_AMP: 96.0,                 // [0x418e94]
  GLITTER_BASE: 32.0,                // [0x418e84]
  GLITTER_RATE: 10.0,                // [0x418e5c]
  FOG_FAR_HACK: 10000.0,             // [0x461c4000]
  DEFAULT_FOV: 90.0,                 // camera+0xbc forced every frame

  // ---- per-frame animation (see re/scenes/LANDSCAPE_ANIM.md) ----
  BIRD_BANK_RATE: 0.027000000700354576,  // [0x418fdc]  sin(T*this + phase)
  BIRD_YAW_RATE: 0.009999999776482582,   // [0x418260]  euler.y += dt*this
  BIRD_FLAP_RATE: 0.20000000298023224,   // [0x418f04]  sin(T*this)
  BIRD_FLAP_AMP: 3.0,                    // [0x4182cc]
  LEAF_STEP: 50.0,                       // [0x418e60]  h = dt*this
  LEAF_GRAVITY: -0.05000000074505806,    // [0x418f28]  vel.y += this*h
  LEAF_SWAY_RATE: 18.700000762939453,    // [0x418f24]  sin((j+T)*this)
  LEAF_SWAY_AMP: 1.5,                    // [0x4170bc]
  CLOUD_SCROLL: 0.029999999329447746,    // [0x418e48]  k = (i*i*C + C)*T
  PRECIP_STEP: 1250.0,                   // [0x418f98]  pos += vel*(dt*this)
  PRECIP_TOP_FADE: 32.0,                 // [0x418e84]  boxY - this
  PRECIP_BOT_FADE: 8.0,                  // [0x418e7c]  a = 255 - dy*this / a = y*32
  PRECIP_ALPHA_MAX: 256.0,               // [0x4182bc]  +0x11c = ftol(t158*this)

  // ---- FUN_0040d5c6's tail + FUN_0040de4e, THE LENS DROPLETS ----
  DROP_PROB: 32767.0,                    // [0x41826c]  n = ftol(dot(up,fwd)*this)
  DROP_HX: 0.11999999731779099,          // [0x418f90]  quad half-width  (NDC)
  DROP_HY: 0.1599999964237213,           // [0x418f8c]  quad half-height (NDC)
  DROP_UX: 0.1599999964237213,           // [0x418f88]  uv1 half-width  before *0.5
  DROP_UY: 0.2133333384990692,           // [0x418f84]  uv1 half-height before *-0.5
  DROP_UV_SY: -0.5,                      // [0x418e1c]  the v flip
  DROP_UV_H: 0.5,                        // [0x4170d4]  the u scale and both biases
  DROP_FADE: 50.0,                       // [0x418e60]  a = 255 - age*this
  DROP_A_MAX: 255.0,                     // [0x418268]
  DROP_PASSB: 0.3499999940395355,        // [0x418f9c]  pass B alpha multiplier

  // ---- merged in from scene3.js (objects 3..6) ----
  M5_SCALE: 0.6399999856948853,          // [0x418ed0]  the m5 camera-rate multiplier
  SPIRE_SCALE_Y: 0.001,                  // [0x418e28]  an array-A instance's initial y scale
  // ---- FUN_0040bfc1, the array-A stagger + growth + wobble ----
  SPIRE_DELAY_SPAN: 255.0,               // [0x418268]  rec[0] = rand01()*this
  SPIRE_GROW: 0.009999999776482582,      // [0x418260]  rec[1] += T*this
  SPIRE_WOBBLE_RATE: 10.0,               // [0x418e5c]  a = inst + T*this + ring*0.5
  SPIRE_RING_PHASE: 0.5,                 // [0x4170d4]
  SPIRE_WOBBLE_AMP: 5.5,                 // [0x418ef8]=1.0 * [0x418f4c]=5.5
  SPIRE_WOBBLE_Z: 1.3700000047683716,    // [0x418f48]  dz = cos(a*this)*amp
  CLOUD_DISSOLVE: 0.003000000026077032,  // [0x418ea8]  m10's +0x150 accumulator rate
  CLOUD_GREY: 31.0,                      // [0x418eb4]  grey = ftol(31 * (1 - t150))
  SCATTER_LIFT: 5.0,                     // [0x418e54]  the scatter's water-clearance

  // ---- FUN_0040ec28 / FUN_0040f27e, the cloud RENDER-TARGET composite ----
  CLOUD_UV_SPAN: 4.0,                    // [0x418230]  params[i][0] = rand01()*this + 1
  CLOUD_ALPHA_BIAS: 0x20,                //             noise texel alpha -= this, clamped at 0
  CLOUD_GREY_STEP: 0x3f,                 //             layer i's vertex grey, from 0x3f up

  // ---- FUN_0040c674, the array-B wind ----
  CURTAIN_WIND_X: 7.300000190734863,     // [0x418f60]  sin((k+T)*this)
  CURTAIN_WIND_Z: 5.699999809265137,     // [0x418f5c]  cos((k+T)*this)

  // ---- FUN_0040c1b2, the array-B curtains ----
  CURTAIN_YAW: 1.5707963705062866,       // [0x418f58]  PI/2 — the cross-hatch's second half
  CURTAIN_JITTER: 0.30000001192092896,   // [0x418f54]  yTop += rand01()*baseHeight*this
  CURTAIN_TEX_A: 128.0,                  // [0x418e30]  keep = ftol(rand01()*this) >= 0x60
  CURTAIN_TEX_B: 64.0,                   // [0x418f50]  start = ftol(rand01()*this)
};

// Texgen program ids used by the landscape class (FUN_00416036 call sites).
const TEX = {
  BRANCH: 0, LEAF: 1, WATER: 13, FLARE: 14, DETAIL: 16,
  SNOW: 3, RAIN: 4, CLOUD: 7, BIRD_S0: 10, BIRD_S1: 9,
  // FUN_0040d1f1's particle textures, read off the FUN_00416036 call sites at
  // VA 0x40d4d0 / 0x40d4f8: program 15 at 16x16 for snow, 6 at 8x8 for rain.
  PRECIP_SNOW: 15, PRECIP_RAIN: 6,
  // FUN_0040d1f1 @ 0x40d4a?: `FUN_00416036(5, 0x10, 0x10)` -> precip+0x40, the
  // LENS DROPLET texture.  Distinct from the two particle textures above.
  DROPLET: 5,
  // FUN_0040f42f @ 0x40f45?: the ribbon strip's texture, program 8 at 256x256.
  RIBBON: 8,
  // FUN_0040bc63 @ 0x40bc63: the array-A spires' SPHERE MAP, program 2 at
  // 256x256.  The generator writes no UVs at all, so the texture is addressed
  // purely by the camera-space normal (material flag 0x20) — that is where the
  // spires' yellow-green sheen comes from.  Scene 0 only.
  SPIRE: 2,
  // FUN_0040e058 @ VA 0x40e63e: `FUN_00416036(0x11, 0x100, 0x100)` -> the
  // Landscape+0x40 CROSS-FADE material's stage 0.  Built only for descriptors
  // with flag bit 24 (terrainOpt24), which is scene 1 alone.  Program 17 is
  // natively 256x256, matching the call.
  TERRAIN_FADE: 17,
};

// ---------------------------------------------------------------------------
// TEXTURE SCALE — the remaster knob (re/REMASTER.md §3, re/REMASTER_WIRING.md).
//
// `js/texgen.mjs` has been resolution-independent since TEXGEN_PORT.md Part II,
// but until now nothing passed it a scale, so every texture in the demo was 1x on
// both quality paths.  `setTexScale(S)` is the single place that changes, and
// main.js calls it once — BEFORE the pre-warm — from the ?quality / ?texscale
// parameters.
//
// Rules that hold this together:
//   * S = 1 is the authentic path and must stay byte-identical.  runTexgen()
//     forces `kernel: 'none'` at scale 1 and `noisePin` is a no-op there, so
//     "S = 1" means literally the original code path.
//   * S must be a POWER OF TWO.  Every content texture in this demo is
//     power-of-two sized (8, 16, 32, 128, 256, 512) and the D3D8 box mip filter
//     (`buildMipsD3D8Box`) halves exactly; an odd scale would make 8x8 -> 24x24
//     and break the chain.  S = 3 is fine for js/scale_roundtrip.mjs, which does
//     not build mips, and is rejected here.
//   * The cache is keyed by (id, scale) so the heightmap programs can be pulled
//     at 1x from the same module that pulls everything else at S.
// ---------------------------------------------------------------------------
let TEX_SCALE = 1;
// The two RENDER-TARGET bakes (tree impostors, cloud) follow the same knob but
// are tracked separately so the per-frame cloud pass can be capped independently
// of the load-time texture bake if the measurement ever demands it.
let RT_SCALE = 1;

/**
 * @param {number} s 1, 2 or 4.
 * @param {{rt?: number}} [opts] override the render-target scale (default: `s`).
 */
export function setTexScale(s, opts = {}) {
  const pot = (v) => {
    v = Math.max(1, Math.min(4, Math.round(Number(v) || 1)));
    if (v !== 1 && v !== 2 && v !== 4) {
      console.warn(`scene7: texture scale ${v} is not a power of two; using 2`);
      v = 2;
    }
    return v;
  };
  s = pot(s);
  const rt = pot(opts.rt ?? s);
  if (s !== TEX_SCALE || rt !== RT_SCALE) { _texgenCache.clear(); _texHandles.clear(); }
  TEX_SCALE = s;
  RT_SCALE = rt;
  return TEX_SCALE;
}
export function getTexScale() { return TEX_SCALE; }
export function getRtScale() { return RT_SCALE; }

/**
 * The programs whose OUTPUT IS DATA, not pixels — read off the descriptors rather
 * than hard-coded, so a descriptor correction cannot silently un-pin them.  Right
 * now this is exactly the terrain heightmaps (`desc+0x3f`): programs 22, 23, 24
 * and 25, each rendered at its native 128x128 and consumed as
 * `argb[i] & 0xff` -> `MG.buildTerrain`.  They must stay at scale 1 at every
 * quality setting, and none of them is also used as a surface texture.
 */
export function dataTextureIds() {
  const s = new Set();
  for (let i = 0; i < DESC_RES_MAP.length; i++) {
    const res = RESOURCES[0x1c + DESC_RES_MAP[i]];
    if (!res) continue;
    s.add(decodeSceneDescriptor(res, i).heightmapTexProg);
  }
  return [...s].sort((a, b) => a - b);
}

/**
 * Programs used as a TILED DETAIL MAP rather than as a surface texture, which
 * must also stay at scale 1.  See re/scenes/TERRAIN_DETAIL.md.
 *
 * The remaster knob buys resolution, and resolution is only worth having if the
 * texture has features FINER than its own texel grid — then more texels resolve
 * them.  Program 16 is the opposite case: it is `op16(amp=25, seed=198)` then
 * `op10 invert`, i.e. one uniform random value PER TEXEL and nothing else.  Its
 * only feature IS the texel grid.  Baking it at S therefore cannot sharpen
 * anything; it can only halve the grain's size.
 *
 * And this one is tiled **16x** across the terrain (`K.TERRAIN_UV1`, [0x418f0c])
 * over 256 world units, so one texel is already 16/512 = 0.031 world units at 1x.
 * At 2x that becomes 0.016 — below one screen pixel for all but the very nearest
 * ground — and the mip chain averages white noise straight to its mean.  The
 * detail map stops being detail and becomes a flat 0.84 tint.  Measured against
 * the reference capture: at 1x our grain matches the original's; at 2x it is
 * half the size and reads as smooth.  That is the "bilinear mush".
 *
 * NOT a general argument against `noise: 'native'` (js/texgen.mjs, changed
 * 2026-08-05).  For a 1x-tiled surface texture, finer noise at higher resolution
 * really is finer visible detail and the choice stands.  It is specifically
 * TILING that turns extra resolution into extra frequency.
 */
const TILED_DETAIL_TEX = new Set([TEX.DETAIL]);

/**
 * The pre-warm plan: every program paired with the scale it is actually USED at,
 * so the loading screen generates each one exactly once and nothing is generated
 * at a resolution nobody asks for.  (Before this, the heightmaps would have been
 * run at the remaster scale by the pre-warm and then again at 1x by `build()`.)
 *
 * @param {number[]} ids the ids to cover, in order
 * @returns {{id:number, scale:number}[]}
 */
export function texturePlan(ids) {
  const data = new Set(dataTextureIds());
  return ids.map((id) => ({
    id, scale: (data.has(id) || TILED_DETAIL_TEX.has(id)) ? 1 : TEX_SCALE,
  }));
}

// FUN_00416036's cache (DAT_00478a38): each program is evaluated at most once.
// Keyed `id` at scale 1 (so the pre-existing putTexgenImage contract still works)
// and `id + '@' + S` otherwise.
const _texgenCache = new Map();
const cacheKey = (id, s) => (s === 1 ? id : id + '@' + s);

/**
 * Seed the texture cache from outside — the hook a Web Worker pool needs, since
 * workers would generate programs off-thread and hand the results back rather
 * than calling texgenImage() here.
 *
 * Measured but NOT currently used: a 4-worker prototype took texture generation
 * from 666 ms to 259 ms (more than 4 workers was worse). That ~400 ms sits inside
 * a ~1.2 s total load, so it is a real but modest win and the worker pipeline is
 * not built. This export exists so building it later is not blocked on reaching
 * into a module-private Map. See re/PRELOADER.md and re/PERFORMANCE.md.
 */
export function putTexgenImage(id, entry, scale = 1) {
  _texgenCache.set(cacheKey(id, scale), entry);
}
/**
 * @param {number} id      texgen program id
 * @param {number} [scale] override the global scale — used for the heightmap
 *                         programs, which are terrain DATA and must stay 1x.
 * @returns {{w:number,h:number,argb:Uint32Array,rgba:Uint8ClampedArray}}
 */
// PRE-WARM vs THE SHARED RNG STREAM.
//
// `FUN_00416036` generates a program on FIRST USE and caches it, and its
// programs draw from the shared stream (js/rng.mjs) — so in the original each
// program's stream effect lands where the scene build first asks for it.
// Warming textures up front would move all of that before the first scene
// builds and change every downstream generator (see re/SHIM_AUDIT.md).
//
// It can be had both ways, exactly, because of a verified property: of the 28
// programs, **20 RESEED** (an op33 `srand` makes their outgoing state
// independent of the incoming one) and the other **8 consume nothing**. None
// carries state with draws. So "replay a pre-warmed program's stream effect" is
// precisely "set the stream to the post-state it produced" — and for the
// zero-consumers, "do nothing".
//
// So: the pre-warm runs with the stream saved/restored around it, recording each
// program's post-state; the first real use replays that state. Fast load, honest
// per-texture progress, and the original's stream order.
let PREWARMING = false;
export function setPrewarming(v) { PREWARMING = !!v; }

// The warm store's two seams (web/js/warmstore.js).  `textureObserver`
// fires after every real generation; `shadowProvider`/`shadowObserver` bracket
// the shadow bake below.  All optional and null by default — nothing here runs
// unless main.js wires a store or a recorder in.
let WARM_HOOKS = {};
export function setWarmHooks(hooks) { WARM_HOOKS = hooks || {}; }

export function texgenImage(id, scale = TEX_SCALE) {
  const key = cacheKey(id, scale);
  let e = _texgenCache.get(key);
  if (e) {
    // First REAL use of a pre-warmed (or warm-store-installed) program replays
    // its stream exit.  A hit during the pre-warm loop itself is not a real use
    // — consuming the replay there would land it inside main.js's saved/
    // restored bracket and lose it.
    if (e.pendingStream !== undefined && !PREWARMING) {
      MG.srand(e.pendingStream);
      e.pendingStream = undefined;
    }
    return e;
  }
  const streamBefore = MG.randState();
  // kernel 'continuous' and noise 'pinned' are runTexgen's own defaults and are
  // the decided policy (TEXGEN_PORT.md §7.2, §14); at scale 1 runTexgen forces
  // the literal 3x3 and the native noise, so this call is the authentic one.
  const r = runTexgen(RESOURCES[id], scale === 1 ? {} : { scale });
  const argb = new Uint32Array(r.width * r.height);
  for (let i = 0; i < argb.length; i++) {
    argb[i] = ((r.rgba[i * 4 + 3] << 24) | (r.rgba[i * 4] << 16)
      | (r.rgba[i * 4 + 1] << 8) | r.rgba[i * 4 + 2]) >>> 0;
  }
  e = { w: r.width, h: r.height, argb, rgba: r.rgba };
  const after = MG.randState();
  if (PREWARMING) {
    // only reseeding programs leave a state to replay; a zero-consumer must be
    // left alone or it would rewind the stream to the pre-warm's position
    if (after !== streamBefore) e.pendingStream = after;
  }
  // Record the exit state whether or not we are pre-warming: a program's stream
  // effect is entry-independent (op33 reseed or zero draws — the property the
  // pre-warm itself relies on), so `srand(exit)` at first use is equivalent to
  // having generated inline.  That is what lets the warm store install this
  // entry into a FUTURE boot with `pendingStream = after`.
  WARM_HOOKS.textureObserver?.(id, scale, e, streamBefore, after);
  _texgenCache.set(key, e);
  return e;
}

const _texHandles = new Map();
function texgenTexture(d3d, id, scale = TEX_SCALE) {
  const key = cacheKey(id, scale);
  let t = _texHandles.get(key);
  if (t) return t;
  const img = texgenImage(id, scale);
  t = d3d.createTexture(img.argb, img.w, img.h, { levels: 0 });
  _texHandles.set(key, t);
  return t;
}

// ---------------------------------------------------------------------------
// The ground-texture bake — FUN_0040e058 step 5, VA 0x40e3a6-0x40e5ea.
//
// Ghidra drops every FPU operand here, so the loop was disassembled by hand.
// Recovered form, per 256x256 texel:
//
//   cell = 256 / N
//   ax = (x % cell) / cell            ay = (y % cell) / cell
//   c00 = ny[(y/cell)*N     + (x/cell)]        <- note (x+1)/cell, NOT (x/cell)+1
//   c01 = ny[(y/cell)*N     + ((x+1)/cell)]       for the "next" samples; that is
//   c10 = ny[((y+1)/cell)*N + (x/cell)]           an off-by-one in the original
//   c11 = ny[((y+1)/cell)*N + ((x+1)/cell)]       and it is reproduced verbatim
//   W  = (1-ax)(1-ay)c00 + ax(1-ay)c01 + (1-ax)ay c10 + ax ay c11
//   S  = param_14 ? 1.0 : shadow[y][x].b / 255
//   out.c = min(255, round( (round(A.c*W) + round(B.c*(1-W))) * S ))
//   out.a = 0xff
//
// `ny` is the terrain vertex NORMAL's y component (vertex+0x10 = normal.y), so the
// flat parts get texture A (groundTexProgA) and the slopes get texture B.
// Out-of-range neighbours contribute 0, exactly as the original's `jnl` skips do.
//
// S comes from the 16-pass soft-shadow raymarch (FUN_0040e923), which IS ported
// (`MG.buildShadowMap`) and IS the default — `?lighting=legacy` is the escape.
// The map is memset to 0xff and the bake can only darken, so on the legacy path
// S = 1 is the unshadowed limit of the same expression, not a different formula.
// This is the ONE consumer of the bake that samples it; the billboard and
// curtain consumers still run at S = 1 (see re/scenes/SCENE2_TODO.md).
//
// REMASTER (re/REMASTER_WIRING.md §3, §7).  `size` generalises the hard-coded
// 256; `step` generalises the `+1` in `(x+1)/cell`.
//
// What the `(x+1)/cell` off-by-one actually DOES, once you work it out: inside a
// cell, `trunc((x+1)/cell) == trunc(x/cell)` for every x except the LAST texel of
// the cell.  So `c01 == c00` and `c11 == c10` almost everywhere, the `ax` terms
// cancel, and the weight field is piecewise CONSTANT per terrain cell with a
// one-texel transition seam at each cell boundary.  That is the original's look
// and it is not a bug to be fixed.
//
// But "one TEXEL wide" is a texel-denominated grid property — TEXGEN_PORT.md §16
// category G, the exact class of thing that silently changes meaning when the
// grid does.  Left literal, the seam would stay 1 texel while the cell grew to
// S texels, i.e. the blend would get RELATIVELY harder-edged at higher
// resolution.  `step = S` keeps the seam at the same FRACTION of a cell —
// the same spatial extent — which is the same reasoning that made `continuous`
// the right kernel rescaling.  `step = 1` is the literal original, so scale 1 is
// untouched (and is asserted below by the caller passing nothing).
//
// N is 64 or 128 and size is 256*S with S a power of two, so `cell` stays an
// exact integer at every supported scale (64 -> 4/8/16, 128 -> 2/4/8).  The
// terrain vertex grid N is NOT touched: geometry is unchanged, only the number
// of texels the same N x N normal field is resampled onto.  So this makes the
// ground texture's DETAIL finer; it does not make the A/B blend mask finer,
// because that mask's resolution is N, not the texture size.  See §7.
//
// ...which was the whole problem, and `opts.terrain` is the fix.  See below and
// re/scenes/GROUND_MASK.md.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// REMASTER — the blend mask at the ground texture's own resolution.
// Full derivation, calibration and measurements: re/scenes/GROUND_MASK.md.
//
// The short version.  `W` above is the terrain's vertex `normal.y`, and
// `FUN_004045f1` computes vertex normals as an UN-NORMALISED mean of unit face
// normals — which is exactly why the terrain must not be tessellated.  But on a
// regular height-field grid that mean has a closed form.  buildGrid emits
//   tri A = (R,C), (R+1,C), (R+1,C+1)     tri B = (R+1,C+1), (R,C+1), (R,C)
// and for BOTH, `cross(e1,e2)` comes out as `h^2 * (-fx, 1, -fz)` where fx, fz
// are that triangle's own planar gradient of the height field.  The y components
// are all positive, so nothing cancels in y and
//
//      normal.y  =  mean over the incident faces of  1 / sqrt(1 + fx^2 + fz^2)
//
// — the unweighted mean of the per-FACE cos(slope), over the 6 faces incident to
// an interior vertex.  Note this is NOT `1/sqrt(1 + fbar_x^2 + fbar_z^2)` on a
// central-difference gradient: by Jensen the face mean is systematically the
// rockier of the two, so substituting a central-difference normal would MOVE the
// sand/rock boundary.  Calibrated against the real vertex buffer at all N^2
// nodes: mean residual 3e-8, max 1.7e-6 — float error, across all five distinct
// terrains.  (`terrainScale` does not appear: `computeNormals` runs on
// object-space positions and `mesh.scale` is assigned afterwards.)
//
// Two rules make the finer evaluation a remaster and not a re-authoring:
//
//  1. **The stencil footprint stays one terrain cell** (`cell` texels, `h` object
//     units).  Shrinking it to the texel spacing would measure sub-cell roughness
//     instead of the slope the original measured — `f = dy/h` blows up, the mask
//     goes dark.  Measured at 1/4 cell: scene 7's mean W swings -2.0% and its
//     total variation rises 6.6x.  Same reasoning as REMASTER.md §3 (scale the
//     convolution kernel's RADIUS, preserve the operator's spatial extent) and as
//     `step = S` above.  Only the sampling DENSITY rises, to one per texel.
//     Because the offset is exactly `cell` texels, every stencil tap lands on the
//     output texel lattice — nine array reads, no resampling in the inner loop.
//
//  2. **The height field is PINNED to the mesh's own heights.**
//        Y = bilinear(heights)  +  [ M - bilinear(M at the nodes) ]
//     with M = `map256` (the 256x256 field the mesh's heights are the integer box
//     average OF), resampled with the block-centre offset (mstep-1)/2 so the
//     detail sits on the geometry it describes.  The bracket vanishes identically
//     at every node, so at a node texel the nine taps ARE the mesh's own nine
//     neighbouring vertex heights and the fine mask reproduces `normal.y` exactly.
//     Measured: |fine mask - mesh normal.y| at the nodes is 3e-8 mean / 1.7e-6 max
//     at size 256, 512 and 1024 alike.  The placement cannot move; only what
//     happens BETWEEN the nodes changes, and there the original had a box fill.
//     Dropping the detail term drifts scene 1's mean W +4.2% instead of +0.25% —
//     a too-smooth field reads as flatter, i.e. sandier.  It is load bearing.
//
// Information ceiling, stated honestly: the detail source is `map256`, so the
// mask tops out at 256x256 (4x the old mask in scene 1, 2x in scenes 7/8).  Going
// to a higher-scale texgen heightmap was measured and REJECTED — the heightmap
// programs are not pinned-reproducible (prog 23 differs by mean 18/255 at 2x,
// prog 26 by 60/255), so it would move mountains rather than sharpen them.
// ---------------------------------------------------------------------------
/** clamped bilinear fetch from a W x H array */
function _bilerp(arr, W, H, u, v) {
  if (u < 0) u = 0; else if (u > W - 1) u = W - 1;
  if (v < 0) v = 0; else if (v > H - 1) v = H - 1;
  const i0 = Math.floor(u), j0 = Math.floor(v);
  const i1 = i0 + 1 < W ? i0 + 1 : W - 1, j1 = j0 + 1 < H ? j0 + 1 : H - 1;
  const fu = u - i0, fv = v - j0;
  const a = arr[j0 * W + i0], b = arr[j0 * W + i1];
  const c = arr[j1 * W + i0], d = arr[j1 * W + i1];
  return (a * (1 - fu) + b * fu) * (1 - fv) + (c * (1 - fu) + d * fu) * fv;
}

/**
 * The blend mask at texture resolution, from the terrain's height field.
 * @param {{heights: Int32Array, map256: Int32Array}} terrain `MG.buildTerrain`'s result
 * @param {number} N terrain grid resolution
 * @param {number} size output texture size (a multiple of N)
 * @returns {Float64Array} `size * size` weights, the same quantity as `normal.y`
 */
function fineGroundMask(terrain, N, size) {
  const cell = size / N;              // integer — the caller's guard enforces it
  const mstep = 256 / N;              // map256 texels per terrain cell (4 or 2)
  const off = (mstep - 1) / 2;        // map256 block centre for grid node c
  const sc = mstep / cell;            // map256 texels per output texel
  const h = 256 / N;                  // object-space cell spacing (buildGrid extents)
  const KY = 256 / 255;               // buildGrid: heights * (1/255) * heightScale
  const H = terrain.heights, M = terrain.map256;

  // M sampled at the nodes, so the detail residual can be made to vanish there.
  const Mn = new Float64Array(N * N);
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) Mn[r * N + c] = _bilerp(M, 256, 256, c * mstep + off, r * mstep + off);
  }
  // The pinned fine height field, on the output texel lattice.
  const Y = new Float64Array(size * size);
  for (let y = 0; y < size; y++) {
    const v = y / cell;
    for (let x = 0; x < size; x++) {
      const u = x / cell;
      Y[y * size + x] = KY * (_bilerp(H, N, N, u, v)
        + _bilerp(M, 256, 256, x * sc + off, y * sc + off) - _bilerp(Mn, N, N, u, v));
    }
  }

  const W = new Float64Array(size * size);
  const at = (x, y) => {
    if (x < 0) x = 0; else if (x >= size) x = size - 1;
    if (y < 0) y = 0; else if (y >= size) y = size - 1;
    return Y[y * size + x];
  };
  const cos = (fx, fz) => 1 / Math.sqrt(1 + fx * fx + fz * fz);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // the 3x3 stencil, one terrain cell apart
      const Y00 = at(x - cell, y - cell), Y01 = at(x, y - cell), Y02 = at(x + cell, y - cell);
      const Y10 = at(x - cell, y), Y11 = at(x, y), Y12 = at(x + cell, y);
      const Y20 = at(x - cell, y + cell), Y21 = at(x, y + cell), Y22 = at(x + cell, y + cell);
      let a, b, p, q, acc = 0;
      a = Y21 - Y11; b = Y22 - Y11; acc += cos((b - a) / h, a / h);    // quad(r,   c  ) A
      p = Y12 - Y22; q = Y11 - Y22; acc += cos((p - q) / h, -p / h);   // quad(r,   c  ) B
      a = Y10 - Y00; b = Y11 - Y00; acc += cos((b - a) / h, a / h);    // quad(r-1, c-1) A
      p = Y01 - Y11; q = Y00 - Y11; acc += cos((p - q) / h, -p / h);   // quad(r-1, c-1) B
      a = Y11 - Y01; b = Y12 - Y01; acc += cos((b - a) / h, a / h);    // quad(r-1, c  ) A
      p = Y11 - Y21; q = Y10 - Y21; acc += cos((p - q) / h, -p / h);   // quad(r,   c-1) B
      W[y * size + x] = acc / 6;
    }
  }
  return W;
}

/**
 * @param {object} terrainMesh the terrain mesh (the authentic mask's `normal.y` source)
 * @param {number} N terrain grid resolution, 64 or 128
 * @param {Uint32Array} texA flat-surface texture   @param {Uint32Array} texB steep-surface
 * @param {number} [size] output size, a multiple of N
 * @param {number} [step] the `(x+step)/cell` seam width
 * @param {{terrain?: object, shadow?: Uint8Array}} [opts] `terrain` is the
 *        REMASTER mask source (pass `MG.buildTerrain`'s result to derive the
 *        blend from the height field at `size` instead of resampling the N x N
 *        vertex normals; omit for the authentic path).  `shadow` is
 *        `FUN_0040e923`'s 256x256 bake — the `S` term of the original's
 *        `colour * S`, sampled bilinearly per texel (`FUN_0040e8fb`).  Without
 *        it the bake runs at the unshadowed limit S = 1.
 */
export function bakeGroundTexture(terrainMesh, N, texA, texB, size = 256, step = 1, opts = {}) {
  const cell = Math.trunc(size / N);
  // Still meaningful on BOTH paths: the authentic path needs integer cell
  // arithmetic, and the fine path needs `cell` to be a whole number of texels
  // because that is its stencil offset (and what makes the taps land on nodes).
  if (cell * N !== size) {
    throw new Error(`scene7: ground bake size ${size} is not a multiple of the ` +
                    `terrain grid N=${N}; the original's cell arithmetic is integer`);
  }
  if (texA.length !== size * size || texB.length !== size * size) {
    throw new Error(`scene7: ground bake wants ${size}x${size} source textures, got ` +
                    `${texA.length} / ${texB.length} texels`);
  }
  const out = new Uint32Array(size * size);
  const V = terrainMesh.verts;
  const NY = MG.VERTEX_FLOATS;
  const ny = (r, c) => V[(r * N + c) * NY + MG.V_NY];
  const fine = opts.terrain ? fineGroundMask(opts.terrain, N, size) : null;
  // FUN_0040e923's shadow map is 256x256 regardless of the bake size, so a
  // remastered (size > 256) bake samples it bilinearly — the shadow's own
  // resolution is the original's and does not scale with the texture.
  const shadow = opts.shadow || null;
  const sScale = 256 / size;

  for (let y = 0; y < size; y++) {
    const r0 = Math.trunc(y / cell);
    const r1 = Math.trunc((y + step) / cell);
    const ay = F((y % cell) / cell);
    const iay = F(1 - ay);
    for (let x = 0; x < size; x++) {
      const c0 = Math.trunc(x / cell);
      const c1 = Math.trunc((x + step) / cell);
      const ax = F((x % cell) / cell);
      const iax = F(1 - ax);
      const o = y * size + x;
      let W, iW;
      if (fine) {
        W = fine[o];                 // REMASTER — derived from the height field
        iW = 1 - W;
      } else {
        const n00 = ny(r0, c0);
        const n01 = c1 < N ? ny(r0, c1) : 0;
        const n10 = r1 < N ? ny(r1, c0) : 0;
        const n11 = (r1 < N && c1 < N) ? ny(r1, c1) : 0;
        // Accumulation order copied from the x87 sequence at 0x40e4e9.
        W = F(F(F(ay * ax) * n11) + F(F(iax * iay) * n00));
        W = F(W + F(F(iax * ay) * n10));
        W = F(W + F(F(iay * ax) * n01));
        iW = F(1 - W);
      }

      const a = texA[o], b = texB[o];
      let R = Math.round(((a >>> 16) & 0xff) * W) + Math.round(((b >>> 16) & 0xff) * iW);
      let G = Math.round(((a >>> 8) & 0xff) * W) + Math.round(((b >>> 8) & 0xff) * iW);
      let B = Math.round((a & 0xff) * W) + Math.round((b & 0xff) * iW);
      // * S — the shadow term.  S in [41/255, 1]; it can only darken.
      const S = shadow ? MG.shadowAt(shadow, x * sScale, y * sScale) : 1;
      R = Math.round(R * S); G = Math.round(G * S); B = Math.round(B * S);
      if (R > 255) R = 255;
      if (G > 255) G = 255;
      if (B > 255) B = 255;
      out[o] = (0xff000000 | (R << 16) | (G << 8) | B) >>> 0;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// FUN_0040c1b2's procedural "grass strand" texture, VA 0x40c5a7-0x40c60a.
// DISASSEMBLED (the previous transcription had both RNG draws wrong).
//
//   for each of 256 COLUMNS x:
//       a     = ftol(rand01() * 128.0)          [0x418e30]
//       keep  = (a >= 0x60)                     ; setnl/dec/and 1/add 0xff:
//                                               ;   a >= 0x60 -> ecx = 0x00ff
//                                               ;   a <  0x60 -> ecx = 0x0100
//       start = ftol(rand01() *  64.0)          [0x418f50]
//       for each of 256 rows y:
//           texel = (y < start) ? 0x00007f40
//                               : ((ecx << 24) | 0x00007f40)   ; `or cx, 0x7f40`
//
// Two consequences the old version missed:
//  * `ecx << 24` for ecx = 0x100 is 0 — the "drop" case is spelled as a
//    deliberate 32-bit overflow, so a dropped column is fully TRANSPARENT.
//  * `a` is uniform on 0..127, so only **25 %** of columns are kept.  The port
//    tested `MG.rand() > 0x5f` against a 0..0x7fff generator, which is true
//    essentially always — every column was opaque.
//  * `start` spans 0..64, not 0..255: only the top quarter of each strand
//    tapers away (v = 0 is the TOP of the curtain — the top vertices get
//    v = 0.01 and the bottom ones v = 1.0).
//
// RGB 0x7f40 is (0, 0x7f, 0x40), a dark green, and the stage op is
// MODULATE(texture, diffuse) over a white-to-grey diffuse — so these really are
// green grass blades.  (Contrast the CLOUD texture, where SCENES_2_6.md §7.5
// overruled the same literal; there the reference is unambiguously white.)
// Only scene 4 uses it (array B).
//
// NOT quality-gated, and deliberately so — two independent reasons
// (re/REMASTER_WIRING.md §2 and §7):
//
//  1. It draws exactly **2 randoms per COLUMN** off the SHARED meshgen LCG.
//     512 columns would be 1024 draws and would desynchronise every object
//     built after scene 4.  `re/REMASTER.md`: never change PRNG draw count or
//     order.  (The pinned-lattice escape — draw 256 columns, replicate each S
//     times — is legal, and is why reason 2 is the one that actually decides it.)
//  2. Even done that way there is nothing to gain.  The only per-texel variation
//     here is a per-column `keep` bit and a per-column integer `start` row, both
//     in ORIGINAL texels; replicating them onto a finer grid reproduces the same
//     image exactly, just larger.  Zero new detail, 4x the memory.
//
// This is the clearest example in the file of a hard-coded size that is a UNIT,
// not a sampling rate.
// ---------------------------------------------------------------------------
export function buildCurtainTexture() {
  const out = new Uint32Array(256 * 256);
  for (let x = 0; x < 256; x++) {
    const keep = ftol(F(MG.rand01() * K.CURTAIN_TEX_A)) >= 0x60;
    const start = ftol(F(MG.rand01() * K.CURTAIN_TEX_B));
    for (let y = 0; y < 256; y++) {
      out[y * 256 + x] = (y < start) ? 0x00007f40 : (keep ? 0xff007f40 : 0x00007f40);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// THE CLOUD RENDER-TARGET COMPOSITE — FUN_0040ec28's first half plus the whole
// of FUN_0040f27e.  Transcribed in re/scenes/SCENES_7_10.md §11.
//
// Every sky in the demo used to be textured with texgen program 7 directly.
// The original never does that: it scrolls N noise quads into a 256x256 render
// target, blits that into a 512x512 one over a background cleared to the
// scene's FOG COLOUR, and textures the sky dome/layers with the 512.
//
//   DAT_00478960  256x256 RT — the scrolled noise accumulator (created once)
//   DAT_00478964  512x512 RT — what the sky is actually textured with
//
// Both are process globals in the original (`if (DAT_.. == 0) create`), shared
// by every cloud scene, and neither is ever destroyed.
// ---------------------------------------------------------------------------
// D3D8_API.md §9.5: "RT textures 64/128/256/512 — caller-supplied".  These two
// ARE the caller, and they were the second thing that was not quality-gated and
// should have been.  Both quads are full-target NDC quads through an identity
// transform, so the pair scales with no other change; the ratio 256:512 (the
// noise target is blitted, alpha-tested, into the sky target) is preserved.
const CLOUD_RT = { d3d: null, scale: 0, rt256: null, rt512: null };
function cloudRenderTargets(d3d) {
  const S = RT_SCALE;
  if (CLOUD_RT.d3d !== d3d || CLOUD_RT.scale !== S) {
    CLOUD_RT.d3d = d3d;
    CLOUD_RT.scale = S;
    CLOUD_RT.rt256 = d3d.createRenderTargetTexture(256 * S, 256 * S, true); // FUN_00402b16(0x100,0x100,1)
    CLOUD_RT.rt512 = d3d.createRenderTargetTexture(512 * S, 512 * S, true); // FUN_00402b16(0x200,0x200,1)
  }
  return CLOUD_RT;
}

/**
 * FUN_0040ec28's noise texture: texgen program 7 at 256x256 with every texel's
 * ALPHA reduced by 0x20 and clamped at 0 (VA 0x40ec7d).  The reduction is what
 * stops the layers saturating when N of them are added together.
 */
const _cloudNoiseTex = new Map();
function cloudNoiseTexture(d3d) {
  let t = _cloudNoiseTex.get(d3d);
  if (t) return t;
  const img = texgenImage(TEX.CLOUD);
  const px = new Uint32Array(img.argb.length);
  for (let i = 0; i < px.length; i++) {
    const s = img.argb[i] >>> 0;
    let a = ((s >>> 24) & 0xff) - K.CLOUD_ALPHA_BIAS;
    if (a < 0) a = 0;
    px[i] = (((a << 24) >>> 0) | (s & 0x00ffffff)) >>> 0;
  }
  // FUN_00403dd3's `Levels = (param_4 != 0)` is 0 here, i.e. a full mip chain.
  t = d3d.createTexture(px, img.w, img.h, { levels: 0 });
  _cloudNoiseTex.set(d3d, t);
  return t;
}

/**
 * The N scroll quads (FUN_0040ec28's `this+0x0c`) and the single blit quad
 * (`this+0x10`).  Both are drawn through an IDENTITY world/view/projection
 * (FUN_00401bd0), so their -1..+1 corners are literally NDC — a full-target
 * quad.  The index template is the byte table at 0x418eec, `{0,2,3,3,1,0}`.
 */
const CLOUD_QUAD = [[-1, 1], [1, 1], [-1, -1], [1, -1]];
const CLOUD_IDX = [0, 2, 3, 3, 1, 0];
function buildCloudQuads(n, uv) {
  const m = new MG.Mesh();
  m.name = uv ? 'cloud.blit' : 'cloud.noise';
  m.allocVerts(n * 4);
  m.allocIndices(n * 2);
  let ti = 0;
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 4; k++) {
      const c = CLOUD_QUAD[k];
      m.setPos(i * 4 + k, c[0], c[1], 0);
      // The blit quad's uv is written once at build time; the noise quads' uv
      // is rewritten every frame by FUN_0040f27e.
      if (uv) m.setUV0(i * 4 + k, c[0] > 0 ? 1 : 0, c[1] > 0 ? 0 : 1);
    }
    for (let k = 0; k < 6; k += 3) {
      m.setTri(ti++, i * 4 + CLOUD_IDX[k], i * 4 + CLOUD_IDX[k + 1], i * 4 + CLOUD_IDX[k + 2]);
    }
  }
  m.pos = [0, 0, 0];
  m.scale = [1, 1, 1];
  return m;
}

// ---------------------------------------------------------------------------
// FUN_004078b6 @ 0x4078b6 — the scatter, with one correction to `MG.scatter`.
//
// The original draws the Z offset FIRST and the X offset second; `MG.scatter`
// draws them the other way round.  The distribution is identical, but since the
// generator reseeds with `srand(clusterIndex)` the actual positions are fully
// determined by the draw order — get it backwards and every impostor lands
// somewhere else.  `MG.scatter` is covered by meshgen_test.mjs, so the corrected
// order lives here rather than being patched into the tested file.
//
//   centre.y = 0;  srand(seed);  extent.y is never read
//   for each instance:  h = -5.0
//     do { z = 2*rand01()*ext.z - ext.z;  x = 2*rand01()*ext.x - ext.x
//          p = centre + (x, 0, z);  h = terrainHeight(p.x, p.z)
//          if (snap) p.y = h }                 <- the `in_stack_00000028` flag
//     while (h + 5.0 < waterLevel)          [0x418e54] = 5.0, [0x418e58] = -5.0
//
// `snap` is the LAST argument and `seed` the one before it.  Disassembled at all
// three call sites (`ret 0x28` => 10 dwords: out, centre[3], count, extent[3],
// seed, snapByte; cdecl, so the FIRST push is the LAST argument):
//
//   array C   0x407cf4   push 0 ; push [ebp-0x8]   -> snap 0, seed = cluster idx
//   array D/E 0x407dfb   push 0 ; push [ebp-0x4]   -> snap 0, seed = cluster idx
//   array A   0x407f7d   push 0 ; push 1           -> snap 0, seed = LITERAL 1
//
// **NOBODY sets `snap`.**  A previous session's comment here claimed array A did,
// on the theory that FUN_0040bc63 does no height query of its own — it indeed
// does none (0x40bf49-0x40bf83 copies the scattered vec3 straight into
// instance+0x88), and that is exactly the point: every array-A spire's base sits
// at y = 0, NOT on the terrain.  Scene 0's camera flies at y ~ 55, so the blades
// start 55 units BELOW the eye and sweep down past it off the bottom of the
// frame; snapping them to the (hidden) terrain lifted 39 of the 80 bases to or
// above eye level and turned the reference's few huge cut-off blades into a fan
// of thin needles.  See re/scenes/SPIRE_REOPEN.md.
// ---------------------------------------------------------------------------
function scatterC(count, centre, extent, waterLevel, heightFn, seed, snap = false) {
  MG.srand(seed);
  const out = [];
  for (let k = 0; k < count; k++) {
    let p, h = -5.0;
    do {
      const dz = F(F(F(MG.rand01() * extent[2]) * 2.0) - extent[2]);
      const dx = F(F(F(MG.rand01() * extent[0]) * 2.0) - extent[0]);
      p = [F(centre[0] + dx), 0, F(centre[2] + dz)];
      h = heightFn ? heightFn(p[0], p[2]) : 0;
      if (snap) p[1] = h;
    } while (F(h + K.SCATTER_LIFT) < waterLevel);
    out.push(p);
  }
  return out;
}

// ---------------------------------------------------------------------------
// FUN_0040abed @ 0x40abed — the BILLBOARD IMPOSTOR BAKER.
//
// `FUN_0040b0b0` calls it three times, guarded by the never-reset global
// `DAT_00478968`, so the whole demo bakes exactly once:
//
//   FUN_0040abed(this, 0, 10.0, 0)  -> set 0: leafy tree,    512x512, 10 passes
//   FUN_0040abed(this, 0, 10.0, 1)  -> set 1: bare branches, 512x512,  1 pass
//   FUN_0040abed(this, 1, 10.0, 0)  -> set 2: compound prop, 128x128,  1 pass
//
// (The `float` argument is genuinely dead — `[ebp+0xc]` is never read.)  Per
// set, `angleCount` = 2 render targets; target k is rendered from
// `Ry(k/2 * PI) * (0, 128, -150)` looking at `(0, 128, 0)` with fov 90,
// aspect 1, near 1, far 1000, lit by a point light at (0, 300, 0), range 1000,
// attenuation1 0.002, over scene ambient 0x3F3F3F3F.
//
// The 10-pass accumulation is the interesting part: ONE clear, then
//   pass 0     — branches HIDDEN, leaves only, lit
//   passes 1-9 — branches shown, LIGHTING OFF (scene ambient set to -1, which
//                makes FUN_00406004 skip the lighting toggle entirely), the
//                leaf mesh re-yawed by rand01()*2PI, and every leaf QUAD given
//                a fresh random grey `ftol(rand01()*127 + 128)`.
// Ten overlapping copies of one tree, Z-tested, is what makes the impostor read
// as a dense canopy rather than a single sparse sapling.
//
// Set 2 (the compound prop, FUN_0040c721) IS baked — see `bakeImpostors(d3d, 2)`
// and the set-2 path below.  It used to be skipped, justified by "no scene in
// objects 7..10 uses array D".  ⚠ THAT JUSTIFICATION WAS FALSE AND IT COST US
// the forest's entire 256-instance ground-cover layer: the forest is OBJECT 5.
// A deferral's justification is scoped — re-check it whenever the consumer set
// changes.  (re/scenes/DANDELIONS.md, and INVENTORY.md exists to catch this
// class of miss from the descriptor rather than from memory.)
// ---------------------------------------------------------------------------
// FUN_0040bb14's constants: dt prescale [0x418ea4], x-axis frequency ratio
// [0x418f40].
// `FUN_0040cfed`'s constants — every one read from the image, not the decompile.
const K_PROP = {
  RINGS: 16,                             // 0x40D0BD  cmp [ebp-8],0x10
  RING_STEP: 0.0625,                     // [0x418f68]
  WIND_AMP: 20.0,                        // [0x418e24]
  WIND_FREQ_Z: 2.369999885559082,        // [0x418f80]
  STEM_HEIGHT: 50.0,                     // [0x418e60]
  STEM_R: 0.30000001192092896,           // [0x418f54]
  OCT: 0.125,                            // [0x418f64]  j*0.125, doubled, x PI
  SEED_DT: 1.399999976158142,            // [0x418f7c]
};

const K_SWAY_RATE = 0.10000000149011612;
const K_SWAY_FREQ2 = 1.2699999809265137;

const IMPOSTOR = {
  ANGLES: 2,
  RT_TREE: 512,
  RT_PROP: 128,                 // set 2 RT size (0x40abed line 8802: type 1 -> 0x80)
  PROP_LIFT: -50.0,             // [0x418f34] — head at the origin
  PROP_EYE: [0, 0, -10],        // [0x418f2c]
  TREE: { branchRadius: 10, levelTaper: 0.75, bend: [0, 0, 0], leafSize: 2.0 },
  EYE: [0, 128, -150],          // [0x418e30] = 128, [0x418f30] = -150
  AT: [0, 128, 0],
  LIGHT_POS: [0, 300, 0],       // [0x418e78] = 300
  LIGHT_RANGE: 1000.0,          // 0x447a0000
  LIGHT_ATT1: 0.0020000000949949026, // 0x3b03126f
  AMBIENT: 0x3f3f3f3f,
  GREY_SPAN: 127.0,             // [0x418e34]
  GREY_BASE: 128.0,             // [0x418e30]
  PASSES: 10,
};

// The terrain shadow bake + the D3D-correct normal transform are ONE change:
// measured separately each is a regression, together they take 0x0738 from
// 26.54 to 17.31 (REVIEW_FIXES.md 2f/2g).  `main.js` flips this from
// `?lighting=fixed`, and it also switches minid3d8's normal transform.
export let SHADOW_BAKE = false;
export function setLightingMode(mode) { SHADOW_BAKE = (mode === 'fixed'); }

// THE DANDELION STEMS ARE A REMASTER FIX, NOT A FIDELITY ERROR.
//
// The original does not render them — a bug in the original, confirmed by
// sagacity (the demo's own coder) and independently visible in the reference
// capture: at 0x0d00 the field dandelions are stemless white puffs floating
// above the grass, and the impostor RT's stem strip is therefore empty too.
//
// So it is gated exactly like the audio panning fix: `?quality=original`
// reproduces the original's bug, and the default (remaster) path draws the
// stems the geometry has always contained.  FUN_0040c721 builds the stem mesh
// eitherway — the original's own generator makes it — so this is a DRAW-time
// gate, not a build-time one, and the RNG stream is identical on both paths.
export let AUTHENTIC = false;
export function setAuthentic(v) { AUTHENTIC = !!v; }

const _impostorCache = new Map();
/**
 * FUN_0040b0b0's `DAT_00478968` guard: the FIRST billboard build bakes ALL
 * THREE sets in a fixed order — FUN_0040abed(0,'\0') leafy tree,
 * FUN_0040abed(0,'\x01') bare tree, FUN_0040abed(1,'\0') the DANDELION —
 * regardless of which set that first consumer wants.  Reproducing that order
 * matters because every bake draws from the shared RNG stream (two tree
 * builds, the per-pass yaws/greys, and the dandelion's exact 4352+512); baking
 * lazily per set put those draws at the wrong stream positions.
 * @param {0|1|2} opt which set to return
 * @returns {Array<object>} `ANGLES` render-target texture handles.
 */
function bakeImpostors(d3d, opt, clearRGB) {
  const bakedKey = 'baked:' + RT_SCALE;
  if (!_impostorCache.get(bakedKey)) {
    _impostorCache.set('set:0:' + RT_SCALE, bakeTreeSet(d3d, 0, clearRGB));
    _impostorCache.set('set:1:' + RT_SCALE, bakeTreeSet(d3d, 1, clearRGB));
    _impostorCache.set('set:2:' + RT_SCALE, bakeDandelionSet(d3d, clearRGB));
    _impostorCache.set(bakedKey, true);
  }
  return _impostorCache.get('set:' + (opt | 0) + ':' + RT_SCALE);
}

function bakeTreeSet(d3d, opt, clearRGB) {
  let rts;
  // The impostor bake is a square perspective render (aspect 1.0) of a fixed
  // subject, so its target size is pure RESOLUTION and nothing else — the
  // projection below is built from `perspectiveFovLH(PI/2, 1.0, ...)`, whose
  // aspect is a literal 1.0, and `beginRenderTarget` takes the viewport from the
  // target's own dimensions.  **Scaling S therefore cannot change the framing**,
  // only the sampling density.  That matters because the framing is under
  // investigation elsewhere: re/scenes/REVIEW_FIXES.md §3 finds the tree's canopy
  // radius is ~117 where the impostor camera can only hold ~75, so the bake
  // currently OVERFLOWS its target and the "tree" is a solid slab of foliage.
  //
  // So do NOT read this as fixing the horizon trees — it does not; that is an
  // open geometry fault in `MG.buildTree`, not a resolution problem.  What this
  // does is make the impostor sharper at no per-frame cost (it is baked twice, at
  // load), which will be worth having once the geometry is right.  MEASURED at
  // 1x vs 2x, opaque coverage of the four impostor targets is
  // 49.32/42.96/21.63/25.89 % -> 50.06/43.66/21.64/25.89 %, and the fraction of
  // each BORDER the silhouette runs off is unchanged (left 3.7->4.2, right
  // 11.5->13.5, bottom 15.8->16.0) — i.e. the framing is identical and the
  // sub-point rise is just a finer-resolved silhouette edge passing the alpha
  // test.  Scaling does not make the overflow worse.  See REMASTER_WIRING.md §10.
  const S = IMPOSTOR.RT_TREE * RT_SCALE;
  rts = [];
  for (let k = 0; k < IMPOSTOR.ANGLES; k++) rts.push(d3d.createRenderTargetTexture(S, S, true));

  // The subject.  DAT_0047895c (the leaf tint) is whatever the last scene set;
  // the bake runs before any of objects 7..10 tints it, so it is the default
  // green — the impostor is deliberately NOT autumn-coloured.
  const _sBefore = MG.randState();
  const _P = globalThis.__bakeProbe;
  const _s = (tag) => { if (_P) _P.push(tag + ' 0x' + MG.randState().toString(16)); };
  _s('set' + opt + ' pre-buildTree');
  const t = MG.buildTree(IMPOSTOR.TREE);
  _s('set' + opt + ' post-buildTree');
  if (globalThis.__scene2Probe) {
    globalThis.__scene2Probe.push({
      bakeSet: opt, before: '0x' + _sBefore.toString(16),
      after: '0x' + MG.randState().toString(16),
      leafRecords: t.leafRecords ? t.leafRecords.length : null,
      leafVerts: t.leaves ? t.leaves.vertexCount : null,
    });
  }
  if (globalThis.__impProbe) globalThis.__impProbe.push({ opt: opt ? 1 : 0, t });
  // (probe: state after the two texgens is stamped below)
  // ⚠ ORDER: BARK (program 0) BEFORE LEAF (program 1).  `FUN_00409d45` calls
  // FUN_00416036(0) at 0x40a035 and FUN_00416036(1) at 0x40a087, and both draw
  // from the shared RNG stream (js/rng.mjs) — so generating them the other way
  // round leaves the stream on program 0's post-state instead of program 1's
  // when the bake's per-pass yaws are drawn.  Program 1 carries an op33 `srand`,
  // which is why the correct order pins the yaw state to 0xa661ec3b at ANY
  // texture scale.
  const bark = texgenTexture(d3d, TEX.BRANCH);
  const leafImg = texgenImage(TEX.LEAF);
  const leaf = new Uint32Array(leafImg.argb.length);
  for (let i = 0; i < leaf.length; i++) {
    leaf[i] = MG.modulateARGB(leafImg.argb[i], 0xffa4ff9d);   // LEAF_COLOUR_GREEN
  }
  const leafTex = d3d.createTexture(leaf, leafImg.w, leafImg.h, { levels: 0 });
  t.branches.material = { texture0: bark, texture1: null, flags: 0x0000, alphaRef: 0x80 };
  // alphaRef 0xF0, not the material ctor's 0x80 — FUN_00409d45's last line
  // writes leafMesh->material[0x14] = 0xf0.  See REVIEW_FIXES.md §3c.
  t.leaves.material = { texture0: leafTex, texture1: null, flags: 0x0300, alphaRef: 0xf0 };
  // Codex derived that the state entering the passes is 0xa661ec3b; program 1's
  // op33 `srand` is what pins it, so it should hold at any texture scale.
  _s('set' + opt + ' pre-passes');
  t.branches.pos = [0, 0, 0]; t.branches.scale = [1, 1, 1];
  t.leaves.pos = [0, 0, 0]; t.leaves.scale = [1, 1, 1];
  if (opt) t.leaves.hidden = true;           // param_12 == 0 hides the leaf mesh

  const light = {
    Type: D3DLIGHT_POINT,
    Diffuse: opt ? { r: 0, g: 0, b: 0, a: 0 } : { r: 1, g: 1, b: 1, a: 1 },
    Ambient: { r: 0, g: 0, b: 0, a: 0 },
    Position: IMPOSTOR.LIGHT_POS.slice(),
    Range: IMPOSTOR.LIGHT_RANGE, Falloff: 1.0,
    Attenuation0: 0, Attenuation1: IMPOSTOR.LIGHT_ATT1, Attenuation2: 0,
  };
  const passes = opt ? 1 : IMPOSTOR.PASSES;
  const proj = D3DMatrix.perspectiveFovLH(Math.PI / 2, 1.0, 1.0, 1000.0);
  const savedClear = d3d.clearColor;

  d3d.setFog(0, 0xffffffff, 0, f32bits(1.0));
  for (let k = 0; k < IMPOSTOR.ANGLES; k++) {
    // FUN_00402b4f clears the target to DAT_00474790 — the LIVE SCENE'S FOG
    // COLOUR, whose alpha byte is 0 in every descriptor.  Clearing to
    // transparent BLACK instead makes the alpha-blended edges of the impostor
    // resolve towards black and the horizon tree renders as a dark blob rather
    // than the reference's pale, fog-tinted silhouette.
    d3d.clearColor = (clearRGB & 0xffffff) >>> 0;
    d3d.beginRenderTarget(rts[k], true);
    const theta = F((k / IMPOSTOR.ANGLES) * Math.PI);
    const R = MG.mat4Euler(0, theta, 0);
    const eye = MG.mat4Transform(IMPOSTOR.EYE, R);
    d3d.SetTransform(D3DTS_PROJECTION, proj);
    d3d.SetTransform(D3DTS_VIEW, D3DMatrix.lookAtLH(eye, IMPOSTOR.AT, [0, 1, 0]));
    for (let p = 0; p < passes; p++) {
      if (passes > 1) {
        if (p === 0) {
          t.branches.hidden = true;
          d3d.SetLight(0, light); d3d.LightEnable(0, true);
          d3d.setLighting(1, IMPOSTOR.AMBIENT);
        } else {
          if (p === 1) d3d.setLighting(0, 0xffffffff);   // scene ambient = -1 from here
          t.branches.hidden = false;
          t.leaves.rot = MG.mat4Euler(0, F(MG.rand01() * F(2 * Math.PI)), 0);
          t.leaves.material.flags |= 0x1000;
          const V = t.leaves, n = V.vertexCount >> 2;
          for (let q = 0; q < n; q++) {
            const g = Math.round(F(F(MG.rand01() * IMPOSTOR.GREY_SPAN) + IMPOSTOR.GREY_BASE)) & 0xff;
            const c = (0xff000000 | (g << 16) | (g << 8) | g) >>> 0;
            for (let j = 0; j < 4; j++) V.setColor(q * 4 + j, c);
          }
        }
      } else {
        d3d.SetLight(0, light); d3d.LightEnable(0, true);
        d3d.setLighting(1, IMPOSTOR.AMBIENT);
      }
      drawMesh(d3d, t.branches);
      drawMesh(d3d, t.leaves);
    }
    d3d.setLighting(0, 0xffffffff);
  }
  _s('set' + opt + ' post-passes');
  d3d.clearColor = savedClear;
  d3d.endRenderTarget(false);
  return rts;
}

/**
 * FUN_0040abed(this, 1, ·, '\0') — impostor set 2, the DANDELION, 128x128,
 * ONE pass, lit (fresh light per set, diffuse stays the ctor's white).
 * Subject: FUN_0040c721 at pos (0, [0x418f34]=-50, 0) — the stem runs y 0..50
 * so the SEED HEAD sits at the origin; camera eye Ry(k*PI/2)*(0,0,[0x418f2c]=-10),
 * target (0,0,0) (VA 0x40afda-0x40b00b), fov 90 deg, aspect 1.
 * Materials (SCENES_7_10.md §12.4): twigs/leaves texgen 3/4 (both natively
 * 32x32) flags 0x11 (additive + cull off), stem flags 0x10.
 */
function bakeDandelionSet(d3d, clearRGB) {
  const S = IMPOSTOR.RT_PROP * RT_SCALE;
  const rts = [];
  for (let k = 0; k < IMPOSTOR.ANGLES; k++) rts.push(d3d.createRenderTargetTexture(S, S, true));

  const _P2 = globalThis.__bakeProbe;
  if (_P2) _P2.push('set2 pre-buildDandelion 0x' + MG.randState().toString(16));
  // ORDER IS THE SPEC: geometry, then BOTH texgens, then the 128 seed records.
  // `FUN_0040c721` calls texgen 3 at 0x40CDCC and texgen 4 at 0x40CE65, and only
  // then runs the record loop at 0x40CEEC. Program 3's op 3 SELF-RESEEDS, so
  // drawing the records first (as this port used to) erased their 512 draws from
  // the anchored stream — see `MG.buildDandelionRecords`.
  const dd = MG.buildDandelion();                     // geometry: 4352 draws
  if (_P2) _P2.push('set2 post-geometry 0x' + MG.randState().toString(16));
  const t3 = texgenTexture(d3d, TEX.SNOW);            // program 3 @ 32x32 (RESEEDS)
  const t4 = texgenTexture(d3d, TEX.RAIN);            // program 4 @ 32x32 (no draws)
  if (_P2) _P2.push('set2 post-texgens 0x' + MG.randState().toString(16));
  MG.buildDandelionRecords(dd);                       // the tail: 512 draws
  if (_P2) _P2.push('set2 post-records 0x' + MG.randState().toString(16));
  dd.twigs.material = { texture0: t3, texture1: null, flags: 0x0011, alphaRef: 0x80 };
  dd.stem.material = { texture0: t3, texture1: null, flags: 0x0010, alphaRef: 0x80 };
  dd.leaves.material = { texture0: t4, texture1: null, flags: 0x0011, alphaRef: 0x80 };
  // Same remaster-only flat stem as the array-F prop, for the same reason: the
  // stem's vertex diffuse is the zero-filled buffer (black), so lit it can only
  // reach the ambient term and bakes into this impostor as a black wire under
  // all 256 ground-cover instances.  Gated on the remaster path; `?quality=
  // original` bakes the original's black stem untouched.  No RNG is drawn.
  if (!AUTHENTIC) {
    for (let i = 0; i < dd.stem.vertexCount; i++) dd.stem.setColor(i, 0xffffffff);
    dd.stem.material.flags |= 0x1000;
  }
  for (const m of [dd.stem, dd.twigs, dd.leaves]) {
    m.pos = [0, IMPOSTOR.PROP_LIFT, 0]; m.scale = [1, 1, 1];
  }

  const light = {
    Type: D3DLIGHT_POINT,
    Diffuse: { r: 1, g: 1, b: 1, a: 1 },
    Ambient: { r: 0, g: 0, b: 0, a: 0 },
    Position: IMPOSTOR.LIGHT_POS.slice(),
    Range: IMPOSTOR.LIGHT_RANGE, Falloff: 1.0,
    Attenuation0: 0, Attenuation1: IMPOSTOR.LIGHT_ATT1, Attenuation2: 0,
  };
  const proj = D3DMatrix.perspectiveFovLH(Math.PI / 2, 1.0, 1.0, 1000.0);
  const savedClear = d3d.clearColor;
  d3d.setFog(0, 0xffffffff, 0, f32bits(1.0));
  for (let k = 0; k < IMPOSTOR.ANGLES; k++) {
    d3d.clearColor = (clearRGB & 0xffffff) >>> 0;
    d3d.beginRenderTarget(rts[k], true);
    const theta = F((k / IMPOSTOR.ANGLES) * Math.PI);
    const eye = MG.mat4Transform(IMPOSTOR.PROP_EYE, MG.mat4Euler(0, theta, 0));
    d3d.SetTransform(D3DTS_PROJECTION, proj);
    d3d.SetTransform(D3DTS_VIEW, D3DMatrix.lookAtLH(eye, [0, 0, 0], [0, 1, 0]));
    d3d.SetLight(0, light); d3d.LightEnable(0, true);
    d3d.setLighting(1, IMPOSTOR.AMBIENT);
    if (!AUTHENTIC) drawMesh(d3d, dd.stem);   // see AUTHENTIC above
    drawMesh(d3d, dd.twigs);
    drawMesh(d3d, dd.leaves);
    d3d.setLighting(0, 0xffffffff);
    // Diagnostic (cheap, once per load): coverage of the freshly baked RT so a
    // silently-empty bake is loud instead of a mystery of invisible billboards.
    if (typeof window !== 'undefined') {
      const gl = d3d.gl, px = new Uint8Array(S * S * 4);
      gl.readPixels(0, 0, S, S, gl.RGBA, gl.UNSIGNED_BYTE, px);
      let a8 = 0, a32 = 0;
      for (let i = 3; i < px.length; i += 4) { if (px[i] > 8) a8++; if (px[i] >= 0x20) a32++; }
      (window.__rt2Stats = window.__rt2Stats || []).push({
        k, coverageA8: a8 / (S * S), coverageA32: a32 / (S * S) });
    }
  }
  d3d.clearColor = savedClear;
  d3d.endRenderTarget(false);
  return rts;
}

// ---------------------------------------------------------------------------
// The mesh -> device path.  Every drawable in the landscape is a meshgen Mesh
// with `.pos`, `.scale`, `.material` and `.hidden`, exactly as the original's
// FUN_00404a10 + FUN_004045dd model.
// ---------------------------------------------------------------------------
const _world = new Float32Array(16);
function worldMatrix(mesh) {
  const R = mesh.rot;
  if (R) {
    // FUN_0040fba1 copies a full 4x4 into the object's +0x08 slot; the node's
    // world transform is then scale * that matrix * translate.
    for (let r = 0; r < 3; r++) {
      const s = mesh.scale[r];
      _world[r * 4] = F(R[r * 4] * s);
      _world[r * 4 + 1] = F(R[r * 4 + 1] * s);
      _world[r * 4 + 2] = F(R[r * 4 + 2] * s);
      _world[r * 4 + 3] = 0;
    }
  } else {
    _world.fill(0);
    _world[0] = mesh.scale[0]; _world[5] = mesh.scale[1]; _world[10] = mesh.scale[2];
  }
  _world[12] = mesh.pos[0]; _world[13] = mesh.pos[1]; _world[14] = mesh.pos[2];
  _world[15] = 1;
  return _world;
}

function drawMesh(d3d, mesh) {
  if (!mesh || mesh.hidden || mesh.triCount === 0) return;
  d3d.SetTransform(D3DTS_WORLD, worldMatrix(mesh));
  const mat = mesh.material;
  if (mat) d3d.applyMaterial(mat);
  d3d.DrawIndexedPrimitiveUP(D3DPT_TRIANGLELIST, 0, mesh.vertexCount, mesh.triCount,
    mesh.indices, mesh.indexFormat, mesh.verts, FVF_SONNET_STRIDE);
  if (mat) d3d.unapplyMaterial(mat);
}

// ---------------------------------------------------------------------------
export class Landscape {
  /**
   * @param {object} d3d       the MiniD3D8 device
   * @param {number} sceneIdx  0..8 — which descriptor / camera set to load
   * @param {object} opts      { objIndex }
   */
  constructor(d3d, sceneIdx, opts = {}) {
    this.d3d = d3d;
    this.sceneIdx = sceneIdx;
    this.objIndex = opts.objIndex ?? -1;
    this.name = 'landscape' + sceneIdx;

    // ---- base object fields (FUN_004060ac / FUN_00402e4e / FUN_00408d72)
    this.layer = 0;              // +0x14, set by m252
    this.visible = false;        // +0x15, set by m255
    this.rate = 30.0;            // +0x0c, from FUN_00402e4e (0x41f00000)
    this.bias = 0;               // +0x08, set by m253
    this.dt = 0;                 // +0x04
    // null = 'unseeded'; #tickClock seeds it with the first ms it sees,
    // which is what FUN_004060c9 does with `call 0x402f01` (lastMs = now).
    this.lastMs = null;          // +0x10
    this.enabled = false;        // +0x20, set by m6
    this.camSpeed = F((1 / this.rate) * K.CAM_SPEED);   // +0x1c
    this.time = 0;               // +0x13c
    this.flag144 = false;        // m7  (water-level ramp gate)
    this.flag145 = false;        // m8  (fog-colour ramp,  obj 7)
    this.flag14c = false;        // m10 (cloud brightness, obj 6)
    this.t140 = 0; this.t148 = 0; this.t150 = 0; this.t154 = 0; this.t158 = 0;

    this.built = false;
    this.fogColour = 0;          // desc+0x22, MUTATED in place by the two ramps
    // FUN_0040ec28 stores its param_4 — the descriptor's cloudParam (desc+0x1b)
    // — at the cloud object's +0x00, and FUN_0040f27e pushes `+0x00 + 1` into
    // every sky vertex's alpha each frame.  The autumn fog ramp later overwrites
    // it with `ftol(225 - 225*t154)`; 225 is that RAMP's literal, not the
    // initial value, which is why this starts from the descriptor.
    this.cloudByte = 225;                 // replaced by desc.cloudParam in build()
    this.sunY = null;
    this.position = 0;           // the music position, needed by the precip gates
    this.activeCam = 0;
    this.meshes = [];            // draw order == registration order

    // Debug hook kept from scene3.js: a headless probe can read every live
    // Landscape's descriptor, camera time and mesh counts without main.js
    // exporting anything.  See SCENES_2_6.md §9.
    (globalThis.__landscapes ||= []).push(this);
  }

  // -------------------------------------------------------------------------
  // FUN_004082a9 + FUN_00407983 — build everything.
  // -------------------------------------------------------------------------
  build() {
    if (this.built) return this;
    this.built = true;
    const d3d = this.d3d;
    const desc = decodeSceneDescriptor(RESOURCES[0x1c + DESC_RES_MAP[this.sceneIdx]], this.sceneIdx);
    this.desc = desc;
    this.fogColour = desc.fogColour >>> 0;
    // desc+0x10 (waterLevel) is NOT a constant: under flag bit 17 FUN_00408eef
    // rewrites it every frame from the music position (0 before 0x820, 1.0 from
    // 0x820 on — VA 0x4091a7-0x4091c4).  Build-time consumers (the water plane,
    // scatterC, the shoreline colours) all run before any frame, so they see the
    // descriptor's stored value; keep a copy so reset() can restore it.
    this.waterLevel0 = desc.waterLevel;

    // ---- cameras (res 0x24 + CAM_RES_BASE[sceneIdx] + i)
    this.cameras = [];
    for (let i = 0; i < desc.cameraPathCount; i++) {
      this.cameras.push(new CameraPath(RESOURCES[0x24 + CAM_RES_BASE[this.sceneIdx] + i]));
    }
    if (!this.cameras.length) this.cameras.push(new CameraPath(new Uint8Array([3, 0, 0])));
    this.camTimes = [];          // camera+0x110, one per path (they run independently)

    // ---- heightmap: texgen program desc+0x3f, native 128x128, blue channel only
    // NOT quality-gated, deliberately: this image is terrain DATA, not a surface.
    // It is read as a 128*128 Int32Array and handed to MG.buildTerrain, so at any
    // scale > 1 it would (a) read only the top quarter of the rows and (b) change
    // the geometry.  Programs 22/23/24/25 are used for nothing else.  Pinned to 1x.
    const hm = texgenImage(desc.heightmapTexProg, 1);
    const hmap = new Int32Array(128 * 128);
    for (let i = 0; i < hmap.length; i++) hmap[i] = hm.argb[i] & 0xff;

    // ---- terrain (FUN_0040e058)
    const terr = MG.buildTerrain(hmap, desc.terrainGridN, desc.terrainScale);
    this.terrain = terr;
    this.terrainMesh = terr.mesh;
    if (!desc.flag.terrainVisible) this.terrainMesh.hidden = true;

    // ---- the SHADOW BAKE (FUN_0040e923), called from inside FUN_0040e058 and
    // therefore BEFORE every array generator — it draws 2,097,152 randoms from
    // the shared stream (16 passes x 65536 texels x 2 rand01), so its position
    // in the build order is load-bearing for everything generated after it.
    // ...and it runs TWICE unless flag bit 8 is set (ndisasm 0x40e31b): the
    // first bake's result is discarded by the second's own memset, so only its
    // RNG consumption survives.  Replay just the draws — see meshgen.
    //
    // ON BY DEFAULT since 2026-08-10 (`?lighting=legacy` is the escape).  It
    // costs ~200 ms per landscape on V8 and several times that on Safari's
    // JSC, all synchronous on the main thread — it is affordable only because
    // it now runs inside the preloader's progress loop with weights derived
    // from measured per-phase ms.  It is still NOT in a Worker.
    //
    // ⚠ The Safari "hang" this comment used to warn about was NOT this bake:
    // the bake merely made boot() slow enough to cross Safari's transient-
    // activation deadline and expose a latent AudioContext ordering bug (the
    // context was created after `await boot()`, outside the click gesture).
    // Fixed at the source in main.js.  Don't re-disable this on that account.
    if (SHADOW_BAKE) {
      // Warm store (warmstore.js): the bake is the one cached artifact whose
      // stream effect is entry-DEPENDENT, so a stored result is used only when
      // the live stream arrives at the recorded entry state — then the bytes
      // are installed and the stream jumps to the recorded exit.  Any mismatch
      // (an upstream draw-order change, a flag difference) falls through to the
      // live bake below, so the cache can never mask a stream-order change.
      const entryState = MG.randState();
      const warm = WARM_HOOKS.shadowProvider?.(this.sceneIdx, entryState);
      if (warm) {
        this.shadow = warm.shadow;
        MG.srand(warm.streamExit);
      } else {
        if (!desc.flag.terrainOpt8) MG.consumeShadowBakeRandoms();
        this.shadow = MG.buildShadowMap(terr.map256, desc.terrainScale, desc.sunPosition);
        WARM_HOOKS.shadowObserver?.(this.sceneIdx, entryState, MG.randState(), this.shadow);
      }
    } else {
      this.shadow = null;
    }

    // ---- ground texture bake
    const gA = texgenImage(desc.groundTexProgA);          // FUN_0040e058 param_5, weight W
    const gB = texgenImage(desc.groundTexProgB);          // FUN_0040e058 param_6, weight 1-W
    // Both are 256x256 programs, so the bake follows their size straight through
    // and stays square without the scale having to be threaded separately.
    const gSize = gA.w;
    // REMASTER — the blend mask at texture resolution instead of at N x N.
    // Gated on TEX_SCALE > 1, which is the only remaster signal this module has
    // and is exactly the condition `?quality=original` forces to false.  It also
    // makes `?texscale=1` a byte-identical fallback on the default path, which
    // gives the regression guard a second way in.  See GROUND_MASK.md.
    // ⚠ FLAG BIT 8 SUPPRESSES THE SHADOW TERM IN THE GROUND BAKE.  PINNED,
    // ndisasm 0x40E3F1:
    //
    //     0040E3F1  cmp byte [ebp+0x3c],0   ; param_14 = terrainOpt8
    //     0040E3F5  fld1                    ; S = 1.0
    //     0040E3F7  jnz 0x40e41a            ; flag SET -> keep S = 1, skip the
    //     0040E3F9  mov edx,[ebx+0x24]      ;   shadow-map read entirely
    //     ...       fmul [0x418298]         ; else S = shadow/255
    //
    // Scene 8 (the ice finale) is the ONLY descriptor with bit 8 set, and the
    // port was passing the baked shadow map for every scene — painting a
    // shadow onto the ice mountains that the original never draws.  Reported
    // from the video by Jasper ("a weird shadow on the ice mountains that is
    // not visible in the video"); the bake treats a null map as the S = 1
    // unshadowed limit, which is exactly the flag-set branch.
    const bakeShadow = desc.flag.terrainOpt8 ? null : this.shadow;
    const ground = bakeGroundTexture(this.terrainMesh, desc.terrainGridN,
      gA.argb, gB.argb, gSize, gSize / 256,
      TEX_SCALE > 1 ? { terrain: terr, shadow: bakeShadow } : { shadow: bakeShadow });
    // levels: 0 = full mip chain, built by the original's own integer box filter
    // (D3D8_API.md §6.1.1 — 23 of 24 sites) — one extra level per doubling, and
    // still buildMipsD3D8Box, never gl.generateMipmap.
    this.groundTex = d3d.createTexture(ground, gSize, gSize, { levels: 0 });

    // Terrain material.  sceneIdx 8 is special-cased in the original: stage 1 is
    // groundTexProgB with the sphere-map flags (0x3a); everything else gets the
    // shared 512x512 detail texture (program 16) with 0x18.
    if (this.sceneIdx === 8) {
      this.terrainMesh.material = {
        texture0: this.groundTex,
        texture1: texgenTexture(d3d, desc.groundTexProgB),
        flags: 0x3a, alphaRef: 0x80,
      };
    } else {
      this.terrainMesh.material = {
        texture0: this.groundTex,
        // Scale 1, ALWAYS — see TILED_DETAIL_TEX above.  Program 16 is
        // per-texel white noise tiled 16x, so the remaster scale would halve
        // the grain's world size instead of sharpening it, and mip it away.
        texture1: texgenTexture(d3d, TEX.DETAIL, 1),
        flags: 0x18, alphaRef: 0x80,
      };
    }
    this.meshes.push(this.terrainMesh);

    // ---- the TERRAIN CROSS-FADE overlay material (FUN_0040e058's tail,
    // VA 0x40e62e-0x40e67b).  Its gate is `param_13 == 0` and param_13 is
    // `~(flags >> 24) & 1`, so it is built exactly when flag bit 24
    // (terrainOpt24) is SET — scene 1 alone, which is also the only scene with
    // the bit-17 ramp that drives it.
    //
    //   this[0x3c] = texture(texgen(0x11), 256, 256)
    //   this[0x40] = material(tex0 = this[0x3c], tex1 = DAT_00478978, 0xc018)
    //   this[0x40][0x14] = 0xff
    //
    // DAT_00478978 is the shared 512x512 program-0x10 detail map — the same
    // handle the ordinary terrain material uses at stage 1.  Material +0x14 is
    // minid3d8's `alphaRef`, and flag 0x8000 is what turns it into the global
    // alpha through TFACTOR.  0xc018 = 0x8000 | 0x4000 (blend, still writes Z)
    // | 0x0010 (cull off) | 0x0008 (stage-1 MODULATE).
    this.terrainOverlay = null;
    if (desc.flag.terrainOpt24) {
      this.terrainOverlay = {
        texture0: texgenTexture(d3d, TEX.TERRAIN_FADE),
        // The same shared handle as the main terrain pass, so the same scale-1
        // rule applies — see TILED_DETAIL_TEX.
        texture1: texgenTexture(d3d, TEX.DETAIL, 1),
        flags: 0xc018, alphaRef: 0xff,
      };
    }

    // ---- water plane (FUN_004082a9, only when waterLevel > 0)
    this.waterMesh = null;
    if (desc.hasWater) {
      const hiRes = desc.flag.hiResWater;
      const w = MG.buildWaterPlane(hiRes, desc.terrainScale);
      w.pos = [0, desc.waterLevel, 0];
      if (hiRes) {
        MG.applyShorelineColours(this.terrainMesh, w, desc.waterLevel);
        // VA 0x408750: `*(byte*)(terrainMesh->material + 0xd) |= 0x40`, i.e. the
        // terrain's flag word gains 0x4000 — alpha blend WITH Z-write and
        // ZFUNC LESSEQUAL.  That is what makes the shoreline ramp visible: the
        // submerged flat of the terrain fades out into the water instead of
        // showing as a sandy shelf.
        this.terrainMesh.material.flags |= 0x4000;
        w.material = { texture0: texgenTexture(d3d, TEX.WATER), texture1: null,
          flags: 0x1011, alphaRef: 0x80 };
      } else {
        // The coarse branch also builds a grey copy of the heightmap as stage 1.
        //
        // NOT quality-gated, and deliberately so (re/REMASTER_WIRING.md §7):
        // `terr.map256` is `upsampleHeightmap(hmap128)` — meshgen has already
        // interpolated the 128x128 heightmap up to 256x256, so this image carries
        // 128x128 worth of information and no more.  Re-baking it at 512 would
        // interpolate an interpolation: invented detail, which is exactly what
        // this remaster refuses to do.  The heightmap program itself cannot be
        // re-run finer either, because the SAME array drives the terrain geometry
        // (see the pin at build()'s heightmap call).
        const gsz = 256;
        const grey = new Uint32Array(gsz * gsz);
        for (let i = 0; i < grey.length; i++) {
          const v = ((terr.map256[i] >> 1) + 0x40) & 0xff;
          grey[i] = (0xff000000 | (v << 16) | (v << 8) | v) >>> 0;
        }
        w.material = { texture0: texgenTexture(d3d, TEX.WATER),
          texture1: d3d.createTexture(grey, gsz, gsz, { levels: 0 }),
          flags: 0x1019, alphaRef: 0x80 };
      }
      this.waterMesh = w;
    }

    // ---- ribbons: 32 strips, only in the hi-res-water branch
    this.ribbons = [];
    if (desc.hasWater && desc.flag.hiResWater) {
      for (let i = 0; i < 32; i++) {
        const r = MG.buildRibbon(i);
        const m = r.mesh || r;
        // CORRECTION (FUN_0040f42f @ 0x40f42f): the strip's material is texgen
        // program 8 at 256x256 with flags 0x11 (additive, CULLMODE NONE) — the
        // port had texgen 13 (the water texture) and 0x1051.
        m.material = { texture0: texgenTexture(d3d, TEX.RIBBON), texture1: null,
          flags: 0x11, alphaRef: 0x80 };
        // The original sets +0xc8 |= 2 during the update loop (so the scene
        // graph skips the strip) and clears it again in the render's tail,
        // where all 32 are drawn explicitly.  The port keeps them out of
        // `this.meshes` and draws them last, which is the same thing.
        m.hidden = false;
        // CORRECTION (FUN_004082a9 @ 0x408814-0x408851): the build LOOP writes
        // the strip's node transform after `FUN_0040f42f` returns, and the port
        // transcribed only the generator, so every strip stayed at scale 1 at
        // the world origin — a 200x72 field with |r| 110..296 and y 0.2..3.3,
        // i.e. sitting ON the island's beach terrace instead of out on the sea,
        // where the additive material blew the sand out to white.
        //
        //   00408825  lea esi,[ebx+0x4c]     ; src = Landscape+0x4c, terrainScale
        //   00408828  add edi,0x94           ; dst = mesh+0x94, the node SCALE triple
        //   00408831  movsd / movsd / movsd  ; 12 bytes — the whole vec3
        //   0040883E  fld dword [eax+0x10]   ; desc+0x10 = waterLevel
        //   00408847  fadd dword [0x4170d4]  ; + 0.5
        //   00408851  fstp dword [eax+0x8c]  ; -> mesh+0x8c = pos.Y
        //
        // +0x94..0x9c is the same scale triple `FUN_004082a9` copies onto the
        // water plane (see #stepWater's note) — the strips ride the landscape's
        // scale — and only pos.Y is written, so X and Z stay at the origin.
        m.scale = desc.terrainScale.slice();
        m.pos = [0, F(desc.waterLevel + 0.5), 0];
        r._phase0 = (r.state || {}).phase;
        this.ribbons.push(r);
      }
    }

    // ---- array B — the terrain-following curtains (beach grass), scene 4 only
    this.curtains = [];
    if (desc.flag.buildB && desc.arrays.B.length) {
      for (const rec of desc.arrays.B) {
        // ORDER MATTERS: FUN_0040c1b2 emits the geometry FIRST (drawing W*H
        // randoms for the per-station height jitter) and only then bakes its
        // own 256x256 texture (2 randoms per column).  The port had the texture
        // first, and shared one texture across all records; the original bakes
        // one per record.  Scene 4 has a single record, so this is a
        // stream-order fix rather than a visible one — but the stream is shared
        // with everything built after it.
        const m = this.#buildCurtain(rec);
        const px = buildCurtainTexture();
        // Diagnostic (see SCENES_7_10.md §10.4): the fraction of columns this
        // record's texture keeps is entirely determined by where the SHARED RNG
        // stream stands when the bake starts, and that fraction is what the
        // field's effective coverage turns out to hinge on.  Recorded so a probe
        // can read it off `globalThis.__landscapes` without a rebuild.
        let keep = 0;
        for (let x = 0; x < 256; x++) if ((px[255 * 256 + x] >>> 24) !== 0) keep++;
        this.curtainKeep = keep;
        const tex = d3d.createTexture(px, 256, 256, { levels: 0 });
        this.curtainTex = tex;
        // FUN_00401c67(mat, tex, 0, 0x1050) then `material + 0x14 = 0x20`:
        // lighting off | alpha blend | CULLMODE NONE, alpha ref 0x20.
        m.material = { texture0: tex, texture1: null, flags: 0x1050, alphaRef: 0x20 };
        this.curtains.push(m);
        // ⚠ NOT `this.meshes.push(m)` — THE CURTAIN IS NOT A SCENE-GRAPH CHILD.
        //
        // `FUN_0040c1b2` contains ZERO calls to `FUN_00405f0e` (scene_addChild)
        // — I counted them over its whole range.  The grass is drawn once, from
        // the RENDER TAIL, by an explicit call gated on the same buildB flag
        // (`FUN_00408eef`, sonnet.c:7914):
        //
        //     if (desc[0x4f] & 4) {
        //       piVar3->vtbl[1](0);                       ; the water plane
        //       arrayB[0].mesh->vtbl[1](0);               ; THE CURTAIN
        //     }
        //
        // i.e. AFTER the layer-masked scene pass — and therefore after the
        // BIRDS, which are ordinary mask-8 children (`mesh_new` writes
        // `[esi+0xa4] = 8` @0x404322 and neither builder overrides it).
        //
        // Putting it in `this.meshes` drew it BEFORE the birds instead, and
        // because its material (0x1050 -> blend mode 2) leaves ZWRITEENABLE 0
        // in the original too, nothing could push the birds back behind it.
        // Reported from the video by Jasper: "birds are rendered over the
        // grass (birds are behind the grass in the video)".  The draw now
        // happens in the render tail — see `#drawCurtains`.
      }
    }

    // ---- array C — the BILLBOARD IMPOSTOR clusters (FUN_0040b0b0 type 0).
    // These are the horizon trees: one cluster of 1 on obj 7's island, five on
    // obj 8's ridge, twenty scattered over obj 9's snowfield.  The quads are
    // FIXED-ORIENTATION crossed billboards, two meshes per cluster at yaw 0 and
    // PI/2, each textured with the impostor baked from exactly that direction —
    // there is no runtime billboarding and array C has no per-frame updater.
    //
    // `FUN_004078b6` reseeds the RNG with the cluster index, so the SCATTER is
    // deterministic and independent of everything built before it — but the yaws
    // and the BAKE are not.
    //
    // ⚠ ORDER IS LOAD-BEARING.  The original does, per record:
    //     FUN_004078b6(scatter)          ; VA 0x407d44
    //     FUN_0040b0b0(...)              ; VA 0x407d98
    //         -> DAT_00478968 first-call guard runs the THREE bakes
    //         -> then the per-instance yaws (VA 0x40b208)
    // so the one-time impostor bake happens AFTER the first cluster's scatter,
    // and `FUN_00409d45` therefore builds its tree from the stream state that
    // scatter leaves behind.  The port used to bake BEFORE the loop, which put
    // `buildTree` at a different stream position and produced a DIFFERENT
    // STOCHASTIC TREE — same leaf count, but ~1/3 more foliage close to the bake
    // camera, which is the "canopy fills the render target" fault chased for
    // several sessions.  The generator formulas were never wrong.
    // Found by Codex; see re/scenes/TREE_IMPOSTOR.md.
    // `FUN_0040e8fb` — the billboards' shadow sample, PINNED:
    //   0040E8FB  fld [esp+8] ; push 0x100 ; push 0 ; push z ; push x
    //             push [ecx+0x24] ; call FUN_0040e6f6 ; fmul qword [0x418fa0]
    // i.e. worldToMap (`FUN_0040e842`) then a bilinear fetch over the 256x256
    // map, scaled by 1/255 — and `FUN_0040b0b0` multiplies it back by 255 for
    // the vertex colour (`g = ftol(sample * 255.0)`).  So `shadowFn` returns
    // 0..255 and `MG.shadowAt` returns 0..1; the x255 is the join.
    //
    // Null when the bake is off (`?lighting=legacy`), which leaves the bottom
    // verts at the unshadowed limit — the same expression at S = 1, not a
    // different code path.
    const shadowFn = this.shadow
      ? (x, z) => {
        const [mx, mz] = MG.worldToMap(desc.terrainScale, x, z);
        return F(MG.shadowAt(this.shadow, mx, mz) * 255.0);
      }
      : null;

    this.billboards = [];
    if (desc.flag.buildBillboards0 && desc.arrays.C.length) {
      let rts = null;
      const hFn = (x, z) => MG.terrainHeight(terr, x, z);
      desc.arrays.C.forEach((rec, ci) => {
        const positions = scatterC(rec.instanceCount, rec.boxCentre, rec.boxExtent,
          desc.waterLevel, hFn, ci);
        // the first-call guard, in the original's position: after this record's
        // scatter, before its yaws.
        const _preBakeState = MG.randState();
        const _didBake = !rts;
        if (!rts) rts = bakeImpostors(d3d, desc.flag.billboard0Opt ? 1 : 0, desc.fogColour);
        // Stream-position probe (opt-in, like __impProbe/__spireProbe).  The
        // post-bake RNG state and the first cluster's yaws are the two
        // quantities Codex predicted from the binary, so this is the
        // instrument that arbitrates re/scenes/SCENE2_TODO.md §1.1.
        const _preYawState = MG.randState();
        // ⚠ ONLY ONE random array here, and that is correct — verified twice.
        // `FUN_0040b0b0` has two `rand01() * 2PI` loops (0x40B1BB and 0x40B208),
        // but the FIRST is inside a block guarded by
        //     0040B137  cmp edi,0x1
        //     0040B13A  jnz 0x40b1d5      <- skips the whole block, loop included
        // so it runs for TYPE 1 ONLY (array D's sway phases). Array C takes the
        // jump and draws just the yaws.
        //
        // I "fixed" this by adding a phase loop here on 2026-08-11, having read
        // the inner guard (`test ebx,ebx`) and missed the outer one 26 bytes
        // earlier. The sweep caught it — forest 22.56 -> 23.91, median
        // 25.31 -> 25.53 — and re-reading the disassembly confirmed the port.
        // Do not re-add it.
        const yaw = [];
        for (let i = 0; i < rec.instanceCount; i++) yaw.push(F(MG.rand01() * F(2 * Math.PI)));
        if (globalThis.__scene2Probe) {
          // Tag the scene: scenes 4, 5 and 7 also build array C, so an
          // untagged probe mixes four scenes' clusters into one list.
          globalThis.__scene2Probe.push({
            sceneIdx: this.sceneIdx, cluster: ci, didBake: _didBake,
            preBakeState: '0x' + _preBakeState.toString(16),
            preYawState: '0x' + _preYawState.toString(16),
            yaws: Array.from(yaw.slice(0, 3)),
          });
        }
        for (let k = 0; k < IMPOSTOR.ANGLES; k++) {
          const m = MG.buildBillboards({
            type: 0, positions, size: rec.size, yaw,
            angleIndex: k, angleCount: IMPOSTOR.ANGLES,
            terrainHeightFn: hFn, shadowFn,
          });
          // FUN_00401ca8(mat, RT[k], 0, 0x1310), alphaRef 0x80 (the ctor default).
          m.material = { texture0: rts[k], texture1: null, flags: 0x1310, alphaRef: 0x80 };
          this.billboards.push(m);
          this.meshes.push(m);
        }
      });
    }

    // ---- array D — the DANDELION field (FUN_0040b0b0 type 1), scene 2 only:
    // 256 instances of size 1.6 (x4 = 6.4-unit quads) over +-300, textured with
    // impostor set 2 (the FUN_0040c721 seed head baked at 128x128).  Each
    // instance is a head quad + stem quad in ONE mesh per angle; material
    // FUN_00401ca8(RT2[k], 0, 0x1310) then material+0x14 = 0x20 (VA 0x40b169:
    // alphaRef 0x20, NOT the ctor's 0x80).  Build draws from the global stream:
    // per record, first the sway PHASES (VA 0x40b105), then the quad YAWS
    // (VA 0x40b121), one of each per instance.
    this.billboards1 = [];
    if (desc.flag.buildBillboards1 && desc.arrays.D.length) {
      const rts2 = bakeImpostors(d3d, 2, desc.fogColour);
      const hFn1 = (x, z) => MG.terrainHeight(terr, x, z);
      desc.arrays.D.forEach((rec, di) => {
        // PINNED: seed = the RECORD INDEX.  The array-D scatter is the call at
        // VA 0x407e4b — identified by its descriptor offsets (count 0x1953,
        // centre 0x1955, extent 0x1961) — and its seed is `push [ebp-0x4]`, the
        // loop counter, at 0x407dfd.  snap = 0 (`push 0` at 0x407dfb).
        //
        // (The literal `push 1` at 0x407f81 belongs to the call at 0x407fc3,
        // which uses offsets 0x53/0x55/0x61 = ARRAY A, the spires.  I briefly
        // mis-assigned it to array D; re/scenes/SPIRE_REOPEN.md had the mapping
        // right all along.)
        const positions = scatterC(rec.instanceCount, rec.boxCentre, rec.boxExtent,
          desc.waterLevel, hFn1, di);
        const phases = new Float32Array(rec.instanceCount);
        for (let i = 0; i < rec.instanceCount; i++) phases[i] = F(MG.rand01() * F(2 * Math.PI));
        const yaw = [];
        for (let i = 0; i < rec.instanceCount; i++) yaw.push(F(MG.rand01() * F(2 * Math.PI)));
        const group = { size: rec.size, phases, phases0: phases.slice(), meshes: [], rests: [] };
        for (let k = 0; k < IMPOSTOR.ANGLES; k++) {
          const m = MG.buildBillboards({
            type: 1, positions, size: rec.size, yaw,
            angleIndex: k, angleCount: IMPOSTOR.ANGLES,
            terrainHeightFn: hFn1, shadowFn,
          });
          m.material = { texture0: rts2[k], texture1: null, flags: 0x1310, alphaRef: 0x20 };
          group.meshes.push(m);
          // FUN_0040b0b0 keeps a REST-POSE copy (this+0x24) that the sway
          // updater FUN_0040bb14 displaces against every frame.
          group.rests.push(m.verts.slice(0, m.vertexCount * MG.VERTEX_FLOATS));
          this.meshes.push(m);
        }
        this.billboards1.push(group);
      });
    }

    // ---- array F — the standalone compound prop (scene 2: one dandelion at
    // the origin, scale 0.15).  Its wind updater FUN_0040cfed is NOT ported —
    // the prop stands still — but the BUILD (4352 geometry draws + the 512
    // record draws, split around the texgens as `FUN_0040c721` splits them)
    // runs so everything built after it sees the right RNG positions.
    this.props = [];
    if (desc.flag.buildProps && desc.arrays.F.length) {
      const t3 = texgenTexture(d3d, TEX.SNOW), t4 = texgenTexture(d3d, TEX.RAIN);
      for (const rec of desc.arrays.F) {
        // Same split as the bake.  `FUN_0040c721` re-issues both texgen calls
        // on EVERY invocation (0x40CDCC / 0x40CE65 are unconditional — the only
        // guard above them is the `0x15fff < local_2c` loop terminator), but
        // `FUN_00416036` caches per PROGRAM ID: `DAT_00478a38[id*8]` is a
        // generated-flag and a hit only memcpy's the stored pixels back out, so
        // the second call draws nothing.  The impostor bake already generated
        // both programs, so these two lines are cache hits here as well and the
        // effective order still matches: geometry, then the 128 records.
        if (globalThis.__bakeProbe) {
          globalThis.__bakeProbe.push('arrayF pre-buildDandelion 0x' + MG.randState().toString(16));
        }
        const dd = MG.buildDandelion();          // geometry: 4352 draws
        MG.buildDandelionRecords(dd);            // the tail: 512 draws
        if (globalThis.__bakeProbe) {
          globalThis.__bakeProbe.push('arrayF post-records 0x' + MG.randState().toString(16));
        }
        const y = F(rec.position[1] +
          (terr ? MG.terrainHeight(terr, rec.position[0], rec.position[2]) : 0));
        const pos = [rec.position[0], y, rec.position[2]];
        const s = rec.param;
        dd.twigs.material = { texture0: t3, texture1: null, flags: 0x0011, alphaRef: 0x80 };
        dd.stem.material = { texture0: t3, texture1: null, flags: 0x0010, alphaRef: 0x80 };
        dd.leaves.material = { texture0: t4, texture1: null, flags: 0x0011, alphaRef: 0x80 };
        // THE STEM IS LIT FLAT, AND ONLY ON THE REMASTER PATH (Jasper's call,
        // 2026-08-10).  Rationale, because this is a deliberate deviation:
        //
        // `FUN_0040c721` never writes a stem vertex colour — the only two
        // colour writes in it are 0x40C8E9 (twigs, 0x5fffffff) and 0x40CB3D
        // (leaves, 0x2fffffff) — so the stem's diffuse is the zero-filled
        // buffer, i.e. BLACK.  The lit model multiplies the directional term
        // by that diffuse, so the stem can only ever reach the ambient term
        // (0x1f1f1f1f = 0.122) and renders as a near-black wire.  **Normals
        // are not what makes it dark, and removing them would not help** —
        // that was the earlier misdiagnosis, and undoing them re-breaks the
        // seeds (SCENE2_TODO.md §6).
        //
        // The original never DRAWS the stem at all (the missing-stem bug
        // sagacity confirmed), so there is no reference for it and no fidelity
        // question to answer — `?quality=original` skips it entirely, one line
        // below. On the remaster path we own its appearance, so: white diffuse
        // and lighting off (flag 0x1000), which shows the bark texture evenly
        // instead of a black line. Nothing here touches the authentic path,
        // and nothing here is claimed to be what the original did.
        if (!AUTHENTIC) {
          for (let i = 0; i < dd.stem.vertexCount; i++) dd.stem.setColor(i, 0xffffffff);
          dd.stem.material = { ...dd.stem.material, flags: dd.stem.material.flags | 0x1000 };
        }
        for (const m of [dd.stem, dd.twigs, dd.leaves]) {
          m.pos = pos.slice(); m.scale = [s, s, s];
          if (AUTHENTIC && m === dd.stem) continue;   // see AUTHENTIC above
          this.meshes.push(m);
        }
        dd.T = 0;                       // prop+0x0c, the wind clock (#stepProps)
        this.props.push(dd);
      }
    }

    // ---- trees (array E)
    this.trees = [];
    if (desc.flag.buildTrees && desc.arrays.E.length) {
      const bark = texgenTexture(d3d, TEX.BRANCH);
      const leafImg = texgenImage(TEX.LEAF);
      // MESHGEN_PORT §2: the autumn colour is a per-texel TEXTURE modulate on the
      // generated leaf texture, not a vertex colour.
      const tint = desc.leafColour >>> 0;
      const leaf = new Uint32Array(leafImg.argb.length);
      for (let i = 0; i < leaf.length; i++) leaf[i] = MG.modulateARGB(leafImg.argb[i], tint);
      const leafTex = d3d.createTexture(leaf, leafImg.w, leafImg.h, { levels: 0 });
      for (const rec of desc.arrays.E) {
        const y = MG.terrainHeight(terr, rec.position[0], rec.position[2]);
        const t = MG.buildTree({
          branchRadius: rec.branchRadius, levelTaper: rec.levelTaper, bend: rec.bend,
        });
        const pos = [rec.position[0], F(rec.position[1] + y), rec.position[2]];
        const s = [rec.scale, rec.scale, rec.scale];
        for (const key of ['branches', 'leaves']) {
          const m = t[key];
          if (!m) continue;
          m.pos = pos.slice(); m.scale = s.slice();
          m.material = key === 'branches'
            ? { texture0: bark, texture1: null, flags: 0x0000, alphaRef: 0x80 }
            // FUN_00409d45's last line overwrites the material ctor's default
            // 0x80 with 0xF0: leafMesh->material[0x14] = 0xf0.  At 0x80 each
            // 40x40 leaf quad renders as a fat opaque blob; at 0xF0 only the
            // leaf's solid core survives.  See REVIEW_FIXES.md §3c.
            : { texture0: leafTex, texture1: null, flags: 0x0300, alphaRef: 0xf0 };
          this.meshes.push(m);
        }
        // ---- leaf animation records.  The loop that BUILDS them (and draws
        // its 32 randoms per leaf) now lives inside `MG.buildTree`, where
        // `FUN_00409d45` has it — see meshgen.mjs and SCENE2_TODO.md §1.1.
        // Nothing draws between `buildTree` and here, so moving it left this
        // path's stream order untouched; what it fixed is the OTHER caller,
        // `bakeTreeSet`, which was skipping the draws entirely.
        t.T = 0;
        t.active = false;                    // +0x24, set by event m9
        t.leafActive = true;                 // +0x25, the literal `leavesVisible`
        t.worldPos = pos.slice();
        t.meshScale = s.slice();
        this.trees.push(t);
      }
    }

    // ---- array A — the surface-of-revolution "grass blade" spires.
    //
    // FUN_004082a9's `desc[0x4f] & 2` block, which sits between the array-F
    // props and the array-G flocks in the build order (that ordering matters
    // only through the shared RNG stream, and scene 0 — the sole user of array
    // A — has no other arrays at all).  Per record:
    //
    //   FUN_004078b6(positions, centre, count, extent, seed = 1, snap = 0)
    //   FUN_0040bc63(cluster, root, radius, heightRatio, count, 0x10, 8, positions)
    //
    // so rings = 16 and segments = 8 are immediates at the call site, and the
    // scatter is the SAME FUN_004078b6 array C uses — Z drawn before X — but
    // array A is the ONE call site that seeds with the literal 1 instead of the
    // cluster index (0x407f7d `push 0 ; push 1`), and like every other call site
    // it leaves the terrain-snap flag CLEAR, so every blade's base is at y = 0.
    //
    // Both of those were wrong here until 2026-08-05 (`seed = ci`, `snap = true`);
    // that is the whole of the owner's "the grass is cut off" at 0x0628, because
    // snapping lifted half the field to or above the camera's own y.  Record and
    // reasoning in re/scenes/SPIRE_REOPEN.md.
    this.spires = [];
    if (desc.flag.buildA && desc.arrays.A.length) {
      const hFn = (x, z) => MG.terrainHeight(terr, x, z);
      const spireTex = texgenTexture(d3d, TEX.SPIRE);
      desc.arrays.A.forEach((rec) => {
        // seed is the LITERAL 1 for every array-A cluster — it is NOT the loop
        // index, so two clusters would scatter identically.  Scene 0 has one.
        const positions = scatterC(rec.instanceCount, rec.boxCentre, rec.boxExtent,
          desc.waterLevel, hFn, 1, false);
        const tmpl = MG.buildRevolution(rec.radius, rec.heightRatio, rec.rings, rec.segments);
        const meshes = MG.instanceRevolution(tmpl, positions);
        // FUN_0040bc63 gives every instance FUN_00401c67(mat, texgen 2 @256x256,
        // 0, 0x20) — the SPHERE MAP bit.  Getting this wrong renders the blades
        // as flat white hairlines.
        const mat = { texture0: spireTex, texture1: null, flags: 0x20, alphaRef: 0x80 };
        for (const m of meshes) { m.material = mat; this.meshes.push(m); }
        // FUN_0040bc63's per-instance tail, VA 0x40bc63 @ the `param_6*8` stride:
        //     rec[0] = rand01() * 255.0     [0x418268]   <- a STAGGER DELAY
        //     rec[1] = 0                                 <- the growth parameter
        // Both were missing: the port grew every instance of a cluster together
        // off one shared `t`.  These 80 draws are part of the shared RNG stream.
        const recs = [];
        for (let i = 0; i < meshes.length; i++) {
          recs.push({ delay: F(MG.rand01() * K.SPIRE_DELAY_SPAN), t: 0, delay0: 0 });
        }
        for (const r of recs) r.delay0 = r.delay;
        this.spires.push({
          meshes, recs, growing: false, T: 0,
          rings: rec.rings, segments: rec.segments,
          base: tmpl.verts.slice(),
        });
      });
    }

    // ---- birds (array G)
    this.flocks = [];
    if (desc.flag.buildBirds && desc.arrays.G.length) {
      for (const rec of desc.arrays.G) {
        const f = MG.buildFlock({
          count: rec.instanceCount, centre: rec.centre, A: rec.radius,
          amp: rec.amp, species: rec.species,
        });
        const tex = texgenTexture(d3d, rec.species === 0 ? TEX.BIRD_S0 : TEX.BIRD_S1);
        for (const b of f.birds) {
          b.mesh.material = { texture0: tex, texture1: null, flags: 0x1310, alphaRef: 0x80 };
          // FUN_0040f803 never writes the bird object's +0x94 scale: `b.scale`
          // is the flock record's float [3], which FUN_0040fba1 uses as the
          // per-bird SPEED, not as a mesh scale.
          b.mesh.scale = [1, 1, 1];
          b.speed = b.scale;
          this.meshes.push(b.mesh);
        }
        f.T = 0;
        // FUN_0040f803's warm-up: after creating bird i it calls
        // FUN_0040fba1(flock, 1.0, i) `ftol(rand01()*500)` times, which advances
        // the SHARED flock clock as well as that one bird.  Replaying the
        // prerolls in creation order reproduces it exactly (the preroll consumes
        // no further RNG).
        for (let i = 0; i < f.birds.length; i++) {
          for (let k = 0; k < (f.birds[i].preroll | 0); k++) {
            f.T = F(f.T + 1.0);
            this.#stepBird(f, i, 1.0);
          }
        }
        // Snapshot the post-preroll state so reset() can restore it: birds
        // integrate their position, so without this a second warm-up would
        // start them wherever the previous one left off.
        f._home = f.birds.map(b => ({ pos: b.mesh.pos.slice(), euler: b.euler.slice() }));
        f._homeT = f.T;
        this.flocks.push(f);
      }
    }

    // ---- WATER GLITTER (FUN_004080e0), built HERE: the original calls it at
    // 0x407244, after every array generator and before FUN_0040ec28's cloud
    // composite.  Its 512 RNG draws therefore sit between the birds and the
    // clouds, and moving them would shift everything after.
    //
    // The anchor is the SUN DROPPED ONTO THE WATER: `Landscape+0x3c` is the
    // lens flare, 0x407084 writes `desc+0x32` (sunPosition) into its record 0,
    // and FUN_004080e0 copies that with y forced to 0.
    this.glitter = null;
    if (desc.flag.waterGlitter) {
      this.glitter = MG.buildWaterGlitter(desc.sunPosition);
      this.glitterTex = texgenTexture(d3d, TEX.FLARE);      // Landscape+0x38
      // FUN_00401c67(mat, this[0x38], 0, 0x891) at 0x408109.
      this.glitterMat = { texture0: this.glitterTex, texture1: null,
                          flags: 0x891, alphaRef: 0x80 };
    }

    // ---- clouds
    this.cloud = null;
    this.cloudNoise = this.cloudBlit = this.cloudRT = null;
    if (desc.flag.cloudLayer && desc.cloudCount > 0) {
      // ---- FUN_0040ec28's FIRST HALF: the render-target composite chain.
      // It runs BEFORE the sky mesh is built and it draws 3 randoms per layer,
      // so it also sits in the shared RNG stream at exactly this point.
      const rts = cloudRenderTargets(d3d);
      this.cloudNoise = buildCloudQuads(desc.cloudCount, false);
      this.cloudNoise.material = {
        texture0: cloudNoiseTexture(d3d), texture1: null,
        flags: 0x1811, alphaRef: 0x80,          // FUN_00401c67(mat, noiseTex, 0, 0x1811)
      };
      // params[i] = { uv scale, u phase, v phase } — VA 0x40ecfa.
      const cloudParams = [];
      for (let i = 0; i < desc.cloudCount; i++) {
        const s = F(F(MG.rand01() * K.CLOUD_UV_SPAN) + 1.0);   // [0x418230]=4, [0x4170c4]=1
        const up = F(MG.rand01());
        const vp = F(MG.rand01());
        cloudParams.push([s, up, vp]);
      }
      this.cloudParams = cloudParams;
      this.cloudBlit = buildCloudQuads(1, true);
      this.cloudBlit.material = {
        texture0: rts.rt256, texture1: null,
        flags: 0x1111, alphaRef: 0x80,          // FUN_00401ca8(mat, RT256, 0, 0x1111)
      };
      this.cloudRT = rts;

      // THE CLOUD SHAPE — the one place the two ports flatly contradicted each
      // other.  Settled by disassembling FUN_0040ec28, not by eye.
      //
      // The call site computes the argument as
      //   FUN_0040ec28(this+0x94, root, count, (float)size, param, colour, '\x01',
      //                ~(byte)(*(uint *)(desc + 0x4f) >> 10) & 1,   /* param_7 */
      //                (*(uint *)(desc + 0x4f) & 0x800) != 0);      /* param_8 */
      // and inside FUN_0040ec28 the shape branch is
      //   if (param_6 != '\0') {
      //     if (param_7 == '\0') { count = param_8 ? 8 : N;
      //                            S = 1.0 - i*0.2;  if (param_8) S = 1.0; ... }  <- STACKED
      //     else                 { ...16x16 grid, y = size*(1.75 - d*0.002)... }  <- DOME
      //
      // so **param_7 == 0 selects the stacked layers** — while `MG.buildCloudSky`
      // does `if (opt10) { stacked }`.  The two are OPPOSITE POLARITY:
      // meshgen.mjs's header comment describes the ARGUMENT correctly
      // ("opt10 = ~(flags>>10)&1") but its code branches the other way, so the
      // parameter it actually wants is the raw bit.  Feeding it `~bit10&1` —
      // which scene7.js did — gives every cloud scene the wrong shape; feeding
      // it the bit, which scene3.js did, reproduces the original.
      // SCENES_2_6.md §4's "correction to the meshgen contract" is right, and
      // for the right reason.  (meshgen.mjs itself is not touched: it is another
      // agent's tested file and only its comment is misleading.)
      //
      // Measured, obj 6 — the sea of clouds — 0x0f30 35.4 -> 23.0 and
      // 0x1100 30.6 -> 24.1; obj 4, 0x0900 70.3 -> 56.7.
      // See CONSOLIDATION.md §2.
      const sky = MG.buildCloudSky({
        N: desc.cloudCount, size: desc.cloudSize, colour: desc.cloudColour,
        opt10: desc.flag.cloudOpt10 ? 1 : 0, opt11: desc.flag.cloudOpt11,
      });
      // FUN_004082a9, the block immediately after the FUN_0040ec28 call:
      //
      //   if ((flags & 0x10000) != 0 && (flags & 0x400) == 0) {   // terrainVisible && !bit10
      //       cloudMesh.scale = terrainScale * 2.0;               // FUN_0040268c, [0x418200]
      //       cloudMesh.scale.y *= 0.5;                           // [0x4170d4]
      //   }
      //   if ((desc[0x50] & 2) == 0) cloudMesh.flags |= 2;        // hidden unless cloudLayer
      //   if (sceneIdx == 8) { scale.x *= 2.0; scale.z *= 2.0; }  // obj 10 only
      //
      // `(float *)(Landscape + 0x4c)` is the inline terrain object, whose first
      // three floats are its scale vector — FUN_0040e8d2 multiplies its height
      // query by `terrain + 0x04`, which is scale.y.
      //
      // scene3.js had this as `(sx, sy*0.5, sz)`: it kept the halving but
      // dropped the x2, and it had no sceneIdx-8 case at all.
      if (desc.flag.terrainVisible && !desc.flag.cloudOpt10) {
        const ts = desc.terrainScale;
        sky.scale = [F(ts[0] * 2.0), F(F(ts[1] * 2.0) * 0.5), F(ts[2] * 2.0)];
      }
      if (this.sceneIdx === 8) {
        sky.scale = [F(sky.scale[0] * 2.0), sky.scale[1], F(sky.scale[2] * 2.0)];
      }
      // THE SKY'S MATERIAL, also read off FUN_0040ec28's tail rather than
      // guessed.  It is keyed on param_8 (flag bit 11), NOT on the shape:
      //   if (param_8 == '\0') FUN_00401ca8(mat, DAT_00478964, 0, 0x1050);
      //   else               { FUN_00401ca8(mat, DAT_00478964, 0, 0x3091);
      //                        *(byte *)(skyMesh + 0xc4 -> +0x14) = 1; }
      //
      // 0x1050 = lighting off | ALPHA BLEND | cull none.
      // 0x3091 = lighting off | dissolve (alpha test GREATER/3, stage-0
      //          ALPHAOP SUBTRACT) | ZWRITE off + ZFUNC ALWAYS | cull none |
      //          additive.  Only scene 3 sets bit 11, so only object 6 gets it.
      //
      // The port had 0x1811 here, which is ADDITIVE with fog off — i.e. the
      // cloud layer could only ever brighten the frame and was never fogged.
      // That is a large part of why object 10 measured a uniform +14 luminance
      // over all 64 of its samples (verify/SWEEP.md item 5): its two white
      // cloud layers were being added into the sky rather than blended.
      // 0x1811 is in fact the material of FUN_0040ec28's *noise quads* (the
      // ones scrolled into the 256x256 render target — LANDSCAPE_ANIM.md §4);
      // it was applied to the wrong mesh.
      //
      // DAT_00478964 is the 512x512 render target the noise composite is
      // blitted into, and it is now built — see SCENES_7_10.md §11.  (Both
      // ports used to texture the sky with texgen program 7 directly, which is
      // the *source* the composite scrolls, not its output.)
      sky.material = { texture0: this.cloudRT.rt512, texture1: null,
        flags: desc.flag.cloudOpt11 ? 0x3091 : 0x1050, alphaRef: 0x80 };
      this.cloud = sky;
      this.cloudSky = sky;
      // FUN_0040f27e's per-layer scroll parameters (stride 0xc: uv scale, u
      // phase, v phase).  The port only needs the base UVs to offset.
      const V = sky.verts, S = MG.VERTEX_FLOATS;
      const uvBase = new Float32Array(sky.vertexCount * 2);
      for (let i = 0; i < sky.vertexCount; i++) {
        uvBase[i * 2] = V[i * S + MG.V_U0];
        uvBase[i * 2 + 1] = V[i * S + MG.V_V0];
      }
      this.cloudAnim = { T: 0, uvBase, alphaApplied: -1 };
      this.cloudByte = desc.cloudParam;
    }

    // ---- precipitation (FUN_0040d1f1)
    this.precip = null;
    if (desc.flag.buildPrecip && desc.precipCount > 0) {
      const p = MG.buildPrecipitation({
        count: desc.precipCount, type: desc.precipType, box: desc.precip.box,
      });
      // CORRECTION (VA 0x40d4d0-0x40d536, disassembled): the particle mesh's
      // material is built from a TYPE-DEPENDENT texture and flags 0x1050 —
      //   snow: texgen program 15 at 16x16, with `if (a < 0x80) a = 0` applied
      //         per texel before the upload
      //   rain: texgen program  6 at  8x8
      // and 0x1050 = lighting off | alpha blend | CULLMODE NONE, not the 0x11
      // (additive, lit) the port had.  Program 5 at 16x16 makes a SECOND
      // texture stored at precip+0x40, which is the lens droplets' — not this.
      let ptex;
      if (desc.precip.isRain) {
        ptex = texgenTexture(d3d, TEX.PRECIP_RAIN);
      } else {
        const src = texgenImage(TEX.PRECIP_SNOW);
        const cut = new Uint32Array(src.argb.length);
        for (let i = 0; i < cut.length; i++) {
          cut[i] = (src.argb[i] >>> 24) < 0x80 ? (src.argb[i] & 0xffffff) : src.argb[i];
        }
        ptex = d3d.createTexture(cut, src.w, src.h, { levels: 0 });
      }
      p.mesh.material = { texture0: ptex, texture1: null, flags: 0x1050, alphaRef: 0x80 };
      p.mesh.hidden = true;
      p._home = p.particles.map(q => q.pos.slice());
      this.precip = p;
      this.precipAlpha = 0;
      p.T = 0;                       // precip+0x08, the droplet clock

      // ---- SNOW ACCUMULATION (FUN_0040d1f1's tail, PINNED).
      //
      // Reported from the video by Jasper: "in the snow scene the ground gets
      // progressively whiter, as if snow is accumulating on the ground".  It
      // does, and this is the mechanism — an accumulation TEXTURE that the
      // landing flakes paint into.
      //
      //   if (terrain != 0 && flagBit19 != 0) {          ; the build gate
      //     buf = alloc(0x40000);                        ; 256*256*4
      //     for (i = 0; i < 0x40000; i += 4) buf[i] = 0x00ffffff;
      //     tex = texture_new(buf, 0x100, 0x100, mips=1);
      //     mat = material_new(tex, 0, 0x50);
      //   }
      //
      // So the map starts WHITE with ZERO ALPHA — invisible — and every flake
      // that lands raises the alpha where it fell.  `precip+0x60` counts
      // updates and saturates at 16; deposits only start once it is past 15,
      // which keeps the build-time particle placement from dumping snow
      // everywhere on the first frame.  Bit 19 is set by WINTER ALONE (the
      // "one descriptor sets it" pattern that also found scene 3's cloud
      // grey), which is why nothing else in the demo accumulates.
      if (desc.flag.buildPrecip && desc.flag.precipOpt && terr) {
        this.snowMap = new Uint32Array(256 * 256).fill(0x00ffffff);
        this.snowTex = d3d.createTexture(this.snowMap, 256, 256, { levels: 0 });
        this.snowMat = { texture0: this.snowTex, texture1: null,
                         flags: 0x50, alphaRef: 0x80 };
        this.snowFrames = 0;         // precip+0x60
        this.snowDirty = false;
      }

      // ---- THE LENS DROPLETS (FUN_0040d1f1's second block).
      //
      // `FUN_0040d1f1` allocates three buffers the port never built:
      //   +0x34 = alloc(0xb000)  256 quads x 0xb0 (4 verts x 44 B)
      //   +0x38 = alloc(0xc00)   256 x 6 indices
      //   +0x3c = alloc(0x400)   256 floats — one BIRTH TIME per droplet
      // every vertex colour is seeded to 0x7fffffff, and both ring counters
      // (+0x2c head, +0x30 count) start at 0.  `MG.buildLensDroplets()` is
      // exactly that constructor and had no consumer until now.
      this.droplets = MG.buildLensDroplets();
      this.dropTex = texgenTexture(d3d, TEX.DROPLET);   // FUN_00416036(5, 0x10, 0x10)
      this.dropHead = 0;
      this.dropCount = 0;
      this.dropBirth = new Float32Array(256);

      // The 64x64 REFRACTION SOURCE — `FUN_004082a9` @ 0x40700f:
      //     if ((flags & 0x40) && (flags & 0x80))
      //         Landscape+0x30 = FUN_00402b16(alloc, 0x40, 0x40, 0)
      // `FUN_00408eef` re-renders the whole scene into it every frame (with the
      // clear colour forced to black, the flare suppressed and the cloud layer
      // hidden), and each droplet samples it through uv1 — so the blobs are
      // little inverted images of the scene behind them.  Only object 8 sets
      // `precipRenderTarget`.
      this.precipRT = desc.flag.precipRenderTarget
        ? d3d.createRenderTargetTexture(64, 64, false) : null;
    }

    // ---- the sun light (FUN_00405d13, VA 0x4082f0-0x408320)
    // desc flag bit 8 (`terrainOpt8`) suppresses the light and instead forces the
    // scene root's ambient to 0xffffffff, which makes FUN_00406004 never enable
    // lighting at all — that is why scene 8 (obj 10) renders flat/unlit.
    this.lightEnabled = !desc.flag.terrainOpt8;
    this.ambient = this.lightEnabled ? K.AMBIENT : -1;
    this.light = {
      Type: D3DLIGHT_POINT,
      Diffuse: { r: 1, g: 1, b: 1, a: 1 },
      Ambient: { r: 0, g: 0, b: 0, a: 0 },
      Position: desc.sunPosition.slice(),
      Range: K.LIGHT_RANGE,
      Falloff: 1.0,
      Attenuation0: 0.0,
      Attenuation1: Math.max(desc.haze, K.ATT_MIN),
      Attenuation2: 0.0,
    };

    // Draw order: opaque terrain/props first, then water, ribbons, clouds, precip.
    if (this.cloudSky) this.meshes.push(this.cloudSky);
    return this;
  }

  // -------------------------------------------------------------------------
  // FUN_0040fba1 — BIRD FLIGHT.  Called from FUN_00408eef as
  // `FUN_0040fba1(flock, dt, 0xffff)` — note the RAW dt (frames at `rate` fps),
  // NOT the dt*0.01 every other updater gets.
  //
  //   T += dt                                      (the flock shares one clock)
  //   step   = dt * rec[3]                         rec[3] = per-bird speed
  //   rec[0] = sin(T*0.027 + rec[4]) * flock.amp   [0x418fdc], rec[4] = phase
  //   rec[1] += dt * 0.01                          [0x418260]
  //   M = Rx(rec[0]) * Ry(rec[1]) * Rz(rec[2])
  //   pos += (0,0,step) * M                        forward is the local +Z
  //   obj.matrix = M
  //   if (rec[0] >= 0) pos.y -= step * 0.01        banking down -> climb
  //   else             vert[2..5].y = sin(T*0.2)*3 banking up   -> flap
  //
  // Confidence: HIGH — the decompile is clean and every constant was read out
  // of the image.  See re/scenes/LANDSCAPE_ANIM.md §2.
  // -------------------------------------------------------------------------


  #stepBird(f, i, dt) {
    const b = f.birds[i];
    const step = F(dt * b.speed);
    const e = b.euler;
    e[0] = F(Math.sin(F(F(f.T * K.BIRD_BANK_RATE) + b.phase)) * f.amp);
    e[1] = F(e[1] + F(dt * K.BIRD_YAW_RATE));
    const M = MG.mat4Euler(e[0], e[1], e[2]);
    const d = MG.mat4Transform([0, 0, step], M);
    const p = b.mesh.pos;
    p[0] = F(p[0] + d[0]); p[1] = F(p[1] + d[1]); p[2] = F(p[2] + d[2]);
    b.mesh.rot = M;
    if (e[0] >= 0) {
      p[1] = F(p[1] - F(step * K.BIRD_YAW_RATE));
    } else {
      // The wing verts are 2,3,4,5 of the 6-vertex bird (the vertex buffer is
      // walked from byte 0x5c = vertex 2's Y, four times with stride 44).
      const s = F(Math.sin(F(f.T * K.BIRD_FLAP_RATE)) * K.BIRD_FLAP_AMP);
      const V = b.mesh.verts, S = MG.VERTEX_FLOATS;
      for (let k = 2; k < 6; k++) V[k * S + 1] = s;
    }
  }

  /**
   * FUN_0040bb14 — the dandelion sway.  Per instance a phase advances by the
   * pre-scaled dt; displacement = (sin(phase)*amp, 0, cos(phase*1.27)*amp)
   * with amp = quadSize/2 ([0x418f40]=1.27 — a Lissajous wobble, the two axes
   * deliberately incommensurate).  SIX of the eight verts move (the head quad
   * and the stem quad's top edge); the stem base (verts 6,7) stays anchored.
   * Displacements are added to the build-time REST POSE, not accumulated.
   */
  /**
   * `FUN_0040cfed` @ 0x40cfed — THE ARRAY-F PROP WIND, i.e. the big foreground
   * dandelion swaying and shedding its seeds.  All constants PINNED (ndisasm
   * 0x40cfed-0x40d1ee; every float read from the image).
   *
   * Three parts.
   *
   * 1. THE STEM (0x40cff3-0x40d0c1) is REBUILT from scratch every frame, not
   *    offset: 16 rings of 8 verts, ring `i` at height `y = i*0.0625*50` and
   *    radius 0.3, displaced by a wind vector whose magnitude grows with the
   *    SQUARE of the normalised height — so the base is pinned and the tip
   *    whips:
   *        A  = i*0.0625                       [0x418f68]
   *        SX = sin(T)      * A^2 * 20         [0x418e24]
   *        SZ = cos(T*2.37) * A^2 * 20         [0x418f80]
   *        v  = (sin(j*PI/4)*0.3 + SX,  A*50,  cos(j*PI/4)*0.3 + SZ)
   *    The 2.37 on the Z axis is what stops it tracing a circle — the two axes
   *    are deliberately incommensurate, as in `#stepBillboards1`.
   *
   * 2. THE SEEDS (0x40d0c7-0x40d155), 128 records of 0x1c bytes, matching
   *    `buildDandelion`'s `{jitter, rest, phase}` field for field:
   *        rec+0x00 vec3 velocity  (`jitter`, the +-10 randoms)
   *        rec+0x0c vec3 offset    (`rest`,  zero at build)
   *        rec+0x18 float lifetime (`phase`, rand01()*8)
   *    Every frame `offset += velocity * (dt*1.4)` [0x418f7c]; then **while
   *    `lifetime >= 0` the offset is OVERWRITTEN with the stem-tip wind
   *    vector** `(SX, 0, SZ)` from the last ring, so an attached seed rides the
   *    tip and its integrated velocity is discarded.  Once the lifetime goes
   *    negative the overwrite stops and the seed drifts off on the velocity it
   *    has been accumulating all along.  That is the whole detach mechanism —
   *    there is no separate "released" flag.
   *
   * 3. The offset is added to the REST POSE of 16 twig verts and 144 leaf verts
   *    per record (0x40d158-0x40d1e4; `0x2c0 = 16*44`, `0x18c0 = 144*44`,
   *    terminating at `0x16000 = 128*0x2c0`).
   *
   * ⚠ THE LIFETIME ONLY COUNTS DOWN WHEN `prop+0x10` IS SET (0x40d143) — that
   * byte is what the timeline's `m2(0)` arms at 0x0c20.  Before the event the
   * seeds hang on the head indefinitely; that is why `propArmed` exists and
   * why wiring it is the last step, not an optional one.
   *
   * No RNG is drawn anywhere in this function, so it cannot move the stream.
   */
  #stepProps(dt) {
    const SF = MG.VERTEX_FLOATS;
    const dts = F(dt * K_PROP.SEED_DT);
    for (const dd of this.props) {
      dd.T = F(dd.T + dt);
      // Verification aid (inert unless set): force the wind clock, so the
      // head's screen position — which is a direct readout of sin(T) —
      // can be swept against the reference.  See re/FIXLOOP_LOG.md #5.
      if (globalThis.__propT !== undefined) dd.T = F(globalThis.__propT);
      // ---- 1. the stem, rebuilt in place
      const SV = dd.stem.verts;
      let SXtop = 0, SZtop = 0, vi = 0;
      for (let i = 0; i < K_PROP.RINGS; i++) {
        const A = F(i * K_PROP.RING_STEP);
        const B = F(A * A);
        const SX = F(F(Math.sin(dd.T) * B) * K_PROP.WIND_AMP);
        const SZ = F(F(Math.cos(F(dd.T * K_PROP.WIND_FREQ_Z)) * B) * K_PROP.WIND_AMP);
        const Y = F(A * K_PROP.STEM_HEIGHT);
        for (let j = 0; j < 8; j++) {
          const C = F(F(F(j * K_PROP.OCT) * 2) * Math.PI);
          const o = vi * SF;
          SV[o] = F(F(Math.sin(C) * K_PROP.STEM_R) + SX);
          SV[o + 1] = Y;
          SV[o + 2] = F(F(Math.cos(C) * K_PROP.STEM_R) + SZ);
          vi++;
        }
        SXtop = SX; SZtop = SZ;      // the LAST ring's wind is what the seeds ride
      }
      // ---- 2 + 3. the seeds
      const TV = dd.twigs.verts, TR = dd.twigsRest;
      const LV = dd.leaves.verts, LR = dd.leavesRest;
      for (let k = 0; k < dd.records.length; k++) {
        const rec = dd.records[k];
        const r = rec.rest;
        r[0] = F(r[0] + F(rec.jitter[0] * dts));
        r[1] = F(r[1] + F(rec.jitter[1] * dts));
        r[2] = F(r[2] + F(rec.jitter[2] * dts));
        if (rec.phase >= 0) {
          r[0] = SXtop; r[1] = 0; r[2] = SZtop;
          if (this.propArmed) rec.phase = F(rec.phase - dts);
        }
        let o = k * 16 * SF;
        for (let n = 0; n < 16; n++, o += SF) {
          TV[o] = F(TR[o] + r[0]);
          TV[o + 1] = F(TR[o + 1] + r[1]);
          TV[o + 2] = F(TR[o + 2] + r[2]);
        }
        let p = k * 144 * SF;
        for (let n = 0; n < 144; n++, p += SF) {
          LV[p] = F(LR[p] + r[0]);
          LV[p + 1] = F(LR[p + 1] + r[1]);
          LV[p + 2] = F(LR[p + 2] + r[2]);
        }
      }
    }
  }

  #stepBillboards1(dtScaled) {
    const SF = MG.VERTEX_FLOATS;
    for (const g of this.billboards1) {
      const amp = F(g.size * 0.5);          // [0x4170d4] — scene7's K has no HALF
      for (let i = 0; i < g.phases.length; i++) g.phases[i] = F(g.phases[i] + dtScaled);
      for (let mi = 0; mi < g.meshes.length; mi++) {
        const V = g.meshes[mi].verts, rest = g.rests[mi];
        for (let i = 0; i < g.phases.length; i++) {
          const dx = F(Math.sin(g.phases[i]) * amp);
          const dz = F(Math.cos(F(g.phases[i] * K_SWAY_FREQ2)) * amp);
          const b = i * 8;
          for (let j = 0; j < 6; j++) {
            const o = (b + j) * SF;
            V[o] = F(rest[o] + dx);
            V[o + 2] = F(rest[o + 2] + dz);
          }
        }
      }
    }
  }

  #stepFlocks(dt) {
    for (const f of this.flocks) {
      f.T = F(f.T + dt);
      for (let i = 0; i < f.birds.length; i++) this.#stepBird(f, i, dt);
    }
  }

  // -------------------------------------------------------------------------
  // FUN_0040a9ad — LEAF FALL.  Called as
  // `FUN_0040a9ad(tree_i, desc[10] * dt * 0.01)` for each of `desc[9]` trees;
  // `desc[10]` (`unknown0a`) is 1.0 in all eight descriptors.
  //
  // Every leaf starts `falling = 1` with a settle timer in [0, 2), so the whole
  // canopy SWAYS from the first frame; event `m9` sets `+0x24`, which starts the
  // timers counting down, and a leaf whose timer goes negative detaches and
  // falls under gravity until it reaches the terrain.  That is why obj 8 shows
  // leaves in flight only from 0x191f onwards.
  //
  // Confidence: HIGH for the maths (the decompile is complete and every
  // constant was read out of the image).  MEDIUM for the landing test, which
  // mixes world and local space in the original — transcribed verbatim.
  // -------------------------------------------------------------------------
  #stepLeaves(dt) {
    const SGN = [0, 1, 1, 0, 0, 1, 1, 0];   // local_18[] at VA 0x40a9f?
    for (const t of this.trees) {
      t.T = F(t.T + dt);
      if (!t.leafActive || !t.leafRecords || !t.leaves) continue;
      const h = F(dt * K.LEAF_STEP);
      const settleStep = F(h * K.TIME_RATE);
      const gy = F(K.LEAF_GRAVITY * h);
      const V = t.leaves.verts, S = MG.VERTEX_FLOATS;
      const P = t.worldPos, SC = t.meshScale;
      for (let j = 0; j < t.leafRecords.length; j++) {
        const L = t.leafRecords[j];
        let sway = 0;
        if (L.falling) {
          if (L.settle >= 0) {
            if (t.active) L.settle = F(L.settle - settleStep);
          } else {
            L.disp[0] = F(L.disp[0] + F(L.vel[0] * h));
            L.disp[1] = F(L.disp[1] + F(L.vel[1] * h));
            L.disp[2] = F(L.disp[2] + F(L.vel[2] * h));
            L.vel[1] = F(L.vel[1] + gy);
          }
          sway = F(Math.sin(F(F(j + t.T) * K.LEAF_SWAY_RATE)) * K.LEAF_SWAY_AMP);
          let th = 0;
          if (this.terrain) {
            th = MG.terrainHeight(this.terrain,
              F(F(F(L.disp[0] + P[0]) + L.base[0]) * SC[0]),
              F(F(F(L.disp[2] + L.base[2]) + P[2]) * SC[2]));
            th = F(F(th - P[1]) / SC[1]);
          }
          if (F(L.base[1] + L.disp[1]) < th) L.falling = 0;
        }
        const dx = L.disp[0], dy = L.disp[1], dz = L.disp[2];
        for (let k = 0; k < 8; k++) {
          const o = (j * 8 + k) * S, g = SGN[k], sw = F(g * sway);
          V[o] = F(F(sw + L.base[k * 3]) + dx);
          V[o + 1] = F(F(sw + L.base[k * 3 + 1]) + dy);
          V[o + 2] = F(F(sw + L.base[k * 3 + 2]) + dz);
        }
      }
    }
  }



  // -------------------------------------------------------------------------
  // FUN_0040f5a8 — RIBBON ANIMATION (`MG.updateRibbon` is the transcription).
  // FUN_00408eef animates all 32 strips with dt*0.01 and then sets each one's
  // mesh flag bit 1 so the scene-graph pass skips it; the LAST thing the render
  // does is clear that bit again and draw all 32 explicitly, so they are the
  // final geometry in the frame.  Confidence: HIGH.
  // -------------------------------------------------------------------------
  #stepRibbons(dt) {
    for (const r of this.ribbons) {
      if (!r.state || !r.mesh) continue;
      MG.updateRibbon(r.mesh, r.state, dt);
    }
  }

  // -------------------------------------------------------------------------
  // FUN_0040f27e — THE CLOUD SCROLL, now complete.  See SCENES_7_10.md §11 for
  // the transcription and the disassembly it came from.
  //
  // This half is the state update and runs in the warm-up as well (no device
  // calls): it advances T, rewrites the N noise quads' uv0 and vertex grey, and
  // pushes the sky's per-vertex alpha.  `#compositeCloud` does the two
  // render-target passes and can only run inside `render`.
  //
  //   T += dt*0.01
  //   if (skyMesh hidden) return                 <- AFTER the clock advance
  //   c = 0x3f
  //   for layer i:  k = (i*i*C + C)*T            C = [0x418e48] = 0.03
  //                 u = k + p[1];  v = k + p[2]
  //                 uv0 = (u*p0, v*p0) ((u+1)*p0, v*p0)
  //                       (u*p0, (v+1)*p0) ((u+1)*p0, (v+1)*p0)
  //                 colour = 0xff000000 | c<<16 | c<<8 | c ;  c += 0x3f
  // -------------------------------------------------------------------------
  #stepCloud(dt) {
    const c = this.cloudAnim;
    if (!c) return;
    c.T = F(c.T + dt);
    if (!this.cloudSky || this.cloudSky.hidden) return;

    const nm = this.cloudNoise;
    if (nm && this.cloudParams) {
      const V = nm.verts, U = nm.vu32, S = MG.VERTEX_FLOATS;
      let grey = K.CLOUD_GREY_STEP;
      for (let i = 0; i < this.cloudParams.length; i++) {
        const p = this.cloudParams[i], s = p[0];
        const k = F(F(F(F(i * i) * K.CLOUD_SCROLL) + K.CLOUD_SCROLL) * c.T);
        const u = F(k + p[1]), v = F(k + p[2]);
        const u0 = F(u * s), v0 = F(v * s);
        const u1 = F(F(u + 1.0) * s), v1 = F(F(v + 1.0) * s);
        const g = grey & 0xff;
        const col = (0xff000000 | (g << 16) | (g << 8) | g) >>> 0;
        grey += K.CLOUD_GREY_STEP;
        const uv = [[u0, v0], [u1, v0], [u0, v1], [u1, v1]];
        for (let q = 0; q < 4; q++) {
          const o = (i * 4 + q) * S;
          V[o + MG.V_U0] = uv[q][0];
          V[o + MG.V_V0] = uv[q][1];
          U[o + MG.V_COL] = col;
        }
      }
    }

    // FUN_0040f27e's TAIL, which neither port had:
    //
    //     if (this[0x1c] == 0)                    // == descriptor flag bit 11
    //         for every sky vertex:  diffuse.alpha = (byte)(-(this[0] + 1))
    //
    // CORRECTED (§11.3).  Ghidra writes `(*(byte *)this + 1) * -0x1000000` and
    // the disassembly at 0x40f3fe is `movzx ecx,byte[esi]; inc ecx; NEG ecx;
    // shl ecx,0x18` — so the alpha byte is `255 - cloudParam`, not
    // `cloudParam + 1`.  `this[0]` is the cloud object's base-brightness byte,
    // seeded from the descriptor's `cloudParam` (desc+0x1b) and overwritten
    // every frame by the autumn fog ramp as `ftol(225 - 225*t154)`
    // (SCENES_7_10.md §5) — so object 8's cloud layer THICKENS from alpha 30 to
    // alpha 255 as the storm closes in, rather than dissolving away.
    //
    // Bit 11 is set only by scene 3, which is why object 6's sky keeps the
    // constant alpha `buildCloudSky` gives it.
    if (this.desc.flag.cloudOpt11) return;
    const a = (-(this.cloudByte + 1)) & 0xff;
    if (a === c.alphaApplied) return;
    c.alphaApplied = a;
    const m = this.cloudSky, V = m.vu32, S = MG.VERTEX_FLOATS;
    for (let i = 0; i < m.vertexCount; i++) {
      const o = i * S + MG.V_COL;
      V[o] = (((a << 24) >>> 0) | (V[o] & 0x00ffffff)) >>> 0;
    }
  }

  /**
   * FUN_0040f27e's device half — the two render-target passes, VA
   * 0x40f386-0x40f427, disassembled.  Called from `render` at exactly the point
   * `FUN_00408eef` calls it: after the fog colour has been set and `SetFog`
   * issued, before the camera's transforms are pushed.
   *
   *   blitMesh.material.alphaRef = cloudParam        ; +0xc4 -> +0x14
   *   DAT_00474790 = 0                               ; clear colour := BLACK
   *   FUN_00401bd0()                                 ; WORLD/VIEW/PROJ = identity
   *   FUN_00402b4f(RT256, 1);  noiseMesh->render(0)  ; N quads, ADDITIVE
   *   DAT_00474790 = fogColour                       ; clear colour restored
   *   FUN_00402b4f(RT512, 1);  blitMesh->render(0)   ; 256 -> 512, alpha-tested
   *   FUN_00402c72(1)                                ; back to the backbuffer,
   *                                                  ;   AND CLEAR IT
   *
   * The last line is why a cloud scene skips `FUN_00408eef`'s own conditional
   * `FUN_00402c72(0)`: the composite is what clears the frame.
   *
   * The 512 target is cleared to the RAW descriptor fog colour, whose ALPHA
   * BYTE IS 0 in every descriptor — so where no cloud passes the alpha test the
   * sky texture is transparent and the backbuffer's fog-coloured clear shows
   * through.  (The two fog ramps write 0xff000000 | rgb, so once either is
   * running the sky becomes opaque; that is the original's behaviour, not a
   * port artefact.)
   */
  #compositeCloud(d3d) {
    const rts = this.cloudRT;
    if (!rts || !this.cloudSky || this.cloudSky.hidden) return;
    this.cloudBlit.material.alphaRef = this.cloudByte & 0xff;
    const I = new D3DMatrix();                       // FUN_0040190f + FUN_00401bd0
    d3d.SetTransform(D3DTS_VIEW, I);
    d3d.SetTransform(D3DTS_PROJECTION, I);
    const saved = d3d.clearColor;
    d3d.clearColor = 0x00000000;
    d3d.beginRenderTarget(rts.rt256, true);
    drawMesh(d3d, this.cloudNoise);
    d3d.clearColor = this.fogColour >>> 0;
    d3d.beginRenderTarget(rts.rt512, true);
    drawMesh(d3d, this.cloudBlit);
    d3d.clearColor = saved;
    d3d.endRenderTarget(true);
  }
  /**
   * FUN_0040c1b2 @ 0x40c1b2 — the array-B "curtains": scene 4's beach grass.
   *
   * REWRITTEN FROM THE DISASSEMBLY (VA 0x40c2d8-0x40c55e plus the call site at
   * 0x407c08).  The previous transcription was a radial fan of 16 strips and is
   * what verify/SWEEP.md item 1 measured as "built but far too small and
   * sparse" — RMSE 84-107 over 0x1400-0x1430, the worst cluster in the back
   * half of the demo.  MESHGEN_PORT.md §8 and SCENES_7_10.md §8 both graded it
   * LOW-MEDIUM because "the vec3 argument aliasing was never disassembled".
   * It has been now.
   *
   * THE CALL SITE, 0x407c08 — this is where the strip count comes from and it
   * is the number that was missing:
   *
   *     push 0x10                                  ; param_10 = H  = 16
   *     fld dword [rec+0x8ef] ; call ftol ; push   ; param_9  = W  = ftol(128.0)
   *     fld dword [rec+0x8eb] ; push ; fstp [esp]  ; param_8  = uTile      (8.0)
   *     fld dword [rec+0x8e7] ; push ; fstp [esp]  ; param_7  = baseHeight (10.0)
   *     fld dword [rec+0x8e3] ; push ; fstp [esp]  ; param_6  = halfSpan  (120.0)
   *     ... FUN_00408c48(rec+0x8d3) -> origin vec3 pushed by value
   *
   * Ghidra emitted `fVar8 = (float)FUN_00404224();` with no argument, so the
   * `fld [rec+0x8ef]` — the ONLY field of the 0x20-byte record nothing else
   * reads — was invisible in the decompile.  It is **128 strips**, not 16.
   *
   * `js/scene_desc.mjs`'s field names for this record predate the disassembly
   * and are misleading; the mapping is
   *     rec.param10    (+0x10) = 120.0 -> HALF-SPAN of each wall AND of the
   *                                       cross-hatch's extent
   *     rec.halfLength (+0x14) =  10.0 -> BASE HEIGHT of a blade
   *     rec.height     (+0x18) =   8.0 -> the U TILE COUNT
   *     rec.param1c    (+0x1c) = 128.0 -> W, the STRIP COUNT
   * (scene_desc.mjs is not edited here — it is another agent's file and only
   * its comments are wrong.)
   *
   * THE GEOMETRY.  Not a fan: a CROSS-HATCH.  The W strips are split in half,
   * the first W/2 running along Z and the second W/2 rotated by PI/2
   * ([0x418f58]) to run along X, each offset across the patch:
   *
   *     half = W >> 1;  t = (i % half) / (half - 1)
   *     A = (0, 0, -halfSpan);   B = (0, 0, +halfSpan)
   *     M = Euler(0,0,0) or Euler(0, PI/2, 0)          ; FUN_00402280
   *     M.translation = i < half ? (2*t*halfSpan - halfSpan, 0, 0)
   *                              : (0, 0, 2*t*halfSpan - halfSpan)
   *     A *= M;  B *= M                                ; FUN_00402a6f
   *     for j in 0 .. H-1:
   *         c  = j / (H - 1)
   *         p  = B*c + A*(1-c) + origin                ; the ORIGIN's y is
   *         yb = terrainHeight(p.x, p.z) + origin.y    ;   added separately too
   *         yt = yb + baseHeight + rand01() * (baseHeight * 0.3)   [0x418f54]
   *         g  = ftol(shadowSample(p.x, p.z) * 255.0)  ; FUN_0040e8fb
   *         a  = max(0, ftol(255.0 - 2*|origin - (p.x, 0, p.z)|))  ; FUN_00408c11
   *         colour = a << 24 | g << 16 | g << 8 | g
   *         emit TWO verts at (p.x, yb, p.z) uv (c*uTile, 1.0)
   *         emit TWO verts at (p.x, yt, p.z) uv (c*uTile, 0.01)
   *
   * so each strip is a zero-thickness vertical wall 240 units long, ~10-13
   * units tall, following the ground, and the whole array is 64 x 64 of them
   * over a 240 x 240 patch.  That is the frame-filling field of strands the
   * reference shows at 0x1410.
   *
   * The ALPHA is the striking part and it is why the field reads as a soft
   * clump rather than a hard-edged box: `255 - 2*d` from the record's origin,
   * clamped at zero, so the grass fades out over 127.5 units.
   *
   * The four verts per station are two coincident pairs, and the index list
   * emits FOUR triangles per quad — the same strip wound both ways, which is
   * the "emitted twice with opposite winding" quirk the leaf generator has too:
   *     {b, b+2, b+6, b+6, b+4, b}  and  {b+1, b+5, b+7, b+7, b+3, b+1}
   * with b = (i*H + j) * 4.  Preserved verbatim; it is what makes the strands
   * visible from both sides with CULLMODE CCW.
   *
   * `g` is the soft-shadow bake (FUN_0040e923, 16 passes — NOT 32; the old
   * figure here was wrong, `0040E9DD mov dword [ebp-0x18],0x10`), sampled
   * through `FUN_0040e8fb` exactly as the billboards' bottom verts are.
   * Wired 2026-08-10; on `?lighting=legacy` there is no map and it falls back
   * to the same expression's unshadowed limit, g = 255.
   *
   * Normals are NEVER written by the original (only +0x00/04/08, +0x18, +0x1c,
   * +0x20), which is consistent with the material's lighting-off bit; the port
   * leaves them at zero rather than calling computeNormals, as the original does.
   */
  #buildCurtain(rec) {
    const W = ftol(rec.param1c);         // 128 — desc+0x1c, via ftol at the call site
    const H = 16;                        // the literal `push 0x10`
    const halfSpan = rec.param10;        // 120.0
    const baseHeight = rec.halfLength;   // 10.0
    const uTile = rec.height;            // 8.0
    const org = rec.origin;
    const half = W >> 1;
    const m = new MG.Mesh();
    m.name = 'curtain';
    m.allocVerts(W * H * 4);
    m.allocIndices(W * (H - 1) * 4);
    let vi = 0, ti = 0;
    const jitter = F(baseHeight * K.CURTAIN_JITTER);
    for (let i = 0; i < W; i++) {
      const t = F((i % half) / (half - 1));
      const slide = F(F(F(t * halfSpan) + F(t * halfSpan)) - halfSpan);
      // FUN_00402280(M, euler) builds I*Rx*Ry*Rz; FUN_004022ff(M, offset) writes
      // the translation row; FUN_00402a6f(out, v, M) is the row-vector
      // transform.  `MG.mat4Euler` / `MG.mat4Transform` are the transcriptions
      // of exactly those, so the matrix is built rather than idealised away —
      // cos(PI/2) is -4.37e-8 in f32, not 0, and the strips are 240 units long.
      const M = MG.mat4Euler(0, i < half ? 0 : K.CURTAIN_YAW, 0);
      M[12] = i < half ? slide : 0;
      M[13] = 0;
      M[14] = i < half ? 0 : slide;
      const A = MG.mat4Transform([0, 0, F(-halfSpan)], M);
      const B = MG.mat4Transform([0, 0, halfSpan], M);
      const ax = A[0], az = A[2], bx = B[0], bz = B[2];
      const stripBase = i * H;
      for (let j = 0; j < H; j++) {
        const c = F(j / (H - 1));
        const s = F(1 - c);
        const px = F(F(bx * c) + F(ax * s) + org[0]);
        const pz = F(F(bz * c) + F(az * s) + org[2]);
        const yb = F(MG.terrainHeight(this.terrain, px, pz) + org[1]);
        const yt = F(F(yb + baseHeight) + F(MG.rand01() * jitter));
        // `g = ftol(FUN_0040e8fb(px, pz) * 255.0)`; 255 is that expression's
        // unshadowed limit, which is what the legacy (bake-off) path gets.
        let g = 255;
        if (this.shadow) {
          const [mx, mz] = MG.worldToMap(this.desc.terrainScale, px, pz);
          g = ftol(F(MG.shadowAt(this.shadow, mx, mz) * 255.0)) & 255;
        }
        const dx = F(org[0] - px), dy = org[1], dz = F(org[2] - pz);
        const d = F(Math.sqrt(F(F(dx * dx) + F(F(dy * dy) + F(dz * dz)))));
        let a = ftol(F(255.0 - F(d + d)));
        if (a < 0) a = 0;
        const col = (((a & 0xff) << 24) | (g << 16) | (g << 8) | g) >>> 0;
        const u = F(c * uTile);
        for (let k = 0; k < 2; k++) {
          m.setPos(vi, px, yb, pz); m.setUV0(vi, u, 1.0); m.setColor(vi, col); vi++;
        }
        for (let k = 0; k < 2; k++) {
          m.setPos(vi, px, yt, pz); m.setUV0(vi, u, 0.01); m.setColor(vi, col); vi++;
        }
        if (j < H - 1) {
          const b = (stripBase + j) * 4;
          m.setTri(ti++, b, b + 2, b + 6);
          m.setTri(ti++, b + 6, b + 4, b);
          m.setTri(ti++, b + 1, b + 5, b + 7);
          m.setTri(ti++, b + 7, b + 3, b + 1);
        }
      }
    }
    m.shrink(vi, ti);
    m.pos = [0, 0, 0];
    // FUN_0040c674's fields: `this+0x00` halfSpan, `this+0x04` H, `this+0x08` W
    // (an INT — Ghidra types it float because the call site `ftol`s it), and
    // `this+0x10` the wind clock.  Its loop count is `H * W`, i.e. one iteration
    // per STATION, walking the vertex buffer at 0x2c floats = 4 vertices.
    m.windHalfSpan = halfSpan;
    m.windStations = W * H;
    m.windT = 0;
    return m;
  }

  /**
   * FUN_0040c674 @ 0x40c674 — THE ARRAY-B WIND.  Called from `FUN_00408eef`'s
   * update block under the `desc[0x4f] & 4` gate with `dt * 0.01`, once per
   * array-B record (stride 0x14 at `Landscape + 0x12c`).  Disassembled, because
   * Ghidra mistypes both loop-bound fields:
   *
   *   T += dt*0.01
   *   for k in 0 .. H*W-1:
   *       sx = sin((k + T) * 7.3) * halfSpan * 0.01      [0x418f60]
   *       cz = cos((k + T) * 5.7) * halfSpan * 0.01      [0x418f5c]
   *       v[4k+2].x = v[4k+0].x + sx ;  v[4k+2].z = v[4k+0].z + cz
   *       v[4k+3].x = v[4k+0].x + sx ;  v[4k+3].z = v[4k+0].z + cz
   *
   * Vertices 2 and 3 of each station are the TOP pair, so this is a +-1.2-unit
   * sway of the blade tips (halfSpan is 120 in scene 4).  It is written from the
   * untouched BOTTOM pair every frame, so it is absolute rather than
   * accumulating and needs no state beyond `T`.
   */
  #stepCurtains(dt) {
    const S = MG.VERTEX_FLOATS;
    for (const m of this.curtains) {
      m.windT = F(m.windT + dt);
      const hs = m.windHalfSpan, V = m.verts;
      for (let k = 0; k < m.windStations; k++) {
        const t = F(k + m.windT);
        const sx = F(F(Math.sin(F(t * K.CURTAIN_WIND_X)) * hs) * K.TIME_RATE);
        const cz = F(F(Math.cos(F(t * K.CURTAIN_WIND_Z)) * hs) * K.TIME_RATE);
        const b = k * 4 * S;
        const x = F(V[b] + sx), z = F(V[b + 2] + cz);
        V[b + 2 * S] = x; V[b + 2 * S + 2] = z;
        V[b + 3 * S] = x; V[b + 3 * S + 2] = z;
      }
    }
  }

  // -------------------------------------------------------------------------
  // FUN_00409acb — the event handler (vtable +8).
  // FUN_00406127 handles 252..255; the switch handles 1..10.
  // -------------------------------------------------------------------------
  event(method, param) {
    // ---- base class (FUN_00406127)
    if (method === 252) { this.layer = Math.round(param) | 0; return; }
    if (method === 253) { this.bias = param; return; }
    if (method === 254) {
      this.rate = param;
      return;
    }
    if (method === 255) { this.visible = param !== 0; return; }

    switch (method) {
      case 1:                               // arm array-A cluster (scene 0 only)
        // FUN_00409acb: `if (desc[0x4f] & 2) clusters[ftol(param)].+0x20 = 1`.
        // Object 3 fires m1(0) at 0x042a — that is what starts the spires
        // growing.  (Was a bare `break;` here; scene3.js had it.)
        if (this.desc && this.desc.flag.buildA && this.spires) {
          const i = Math.round(param) | 0;
          if (i >= 0 && i < this.spires.length) this.spires[i].growing = true;
        }
        break;
      case 2:                               // arm array-F prop (scene 2 only)
        // Gated on flag bit 15 (buildProps).  The generator FUN_0040c721 IS
        // ported now (`MG.buildDandelion`, see the array-F block in build()),
        // so the prop exists and is drawn.  What this flag would gate is its
        // per-frame wind updater FUN_0040cfed, which is NOT ported — so
        // `propArmed` is currently set and never read.  SCENE2_TODO.md.
        if (this.desc && this.desc.flag.buildProps) this.propArmed = true;
        break;
      case 3:                               // FUN_004082a9 — build this scene
        this.sceneIdx = Math.round(param) | 0;
        this.build();
        break;
      case 4:                               // select camera path
        // The original swaps which of the 64 camera objects the scene root points
        // at (`root+0x08 = cameras[i]`); each camera keeps its OWN +0x110 time and
        // only advances while it is the active one, so a freshly selected path
        // always starts at 0 but a re-selected one resumes.
        if (this.enabled) {
          const i = Math.round(param) | 0;
          if (this.cameras && i >= 0 && i < this.cameras.length) this.activeCam = i;
        }
        break;
      case 5:                               // camera speed override
        if (this.enabled) this.camSpeed = F((1 / this.rate) * param * 0.6399999856948853);
        break;
      case 6:  this.enabled = param !== 0; break;
      case 7:  this.flag144 = true; break;
      case 8:  this.flag145 = true; break;   // obj 7: start the fog-colour ramp
      case 9:                                // activate tree N (obj 8, t=0x191f)
        if (this.trees && this.trees.length) {
          const i = Math.round(param) | 0;
          if (i >= 0 && i < this.trees.length) this.trees[i].active = true;
        }
        break;
      case 10: this.flag14c = true; break;
      default: break;
    }
  }

  /**
   * Reset to the CONSTRUCTOR state — FUN_00408d72 plus the base ctor
   * FUN_004060ac's `+0x15 = 0` / `+0x14 = 0`.  main.js's warm-up replays the
   * whole script from t = 0 after calling this, so every flag it clears is
   * re-established by the replay; NOT clearing `visible` leaves the object
   * live from ms 0 on a second warm-up and it then integrates its timers
   * across the entire song (this was a real bug, caught by an order-dependent
   * capture: obj 9's sky came out storm-grey only when a frame had been
   * rendered before it).
   */
  reset() {
    this.dt = 0; this.lastMs = null;   // re-seeded on the next tick (FUN_004060c9)
    this.visible = false;
    this.layer = 0;
    this.rate = 30.0;
    this.position = 0;
    this.enabled = false;
    this.time = 0; this.t13c = 0; this.t13cPrev = 0;
    this.camTimes = this.cameras ? this.cameras.map(() => 0) : [];
    this.activeCam = 0;
    this.flag144 = this.flag145 = this.flag14c = false;
    this.propArmed = false;
    if (this.desc) {
      this.fogColour = this.desc.fogColour >>> 0;
      // The bit-17 ramp writes the TERRAIN's scale.Y and the overlay material's
      // alpha every frame, so both have to go back to their build-time values or
      // a second warm-up starts scene 1 with the landscape already risen.
      if (this.terrainMesh) this.terrainMesh.scale[1] = this.desc.terrainScale[1];
      // The bit-17 waterLevel step mutates the descriptor in place; put the
      // stored value back or a warm-up that stopped before 0x820 leaves it 0.
      if (this.waterLevel0 !== undefined) this.desc.waterLevel = this.waterLevel0;
    }
    if (this.terrainOverlay) this.terrainOverlay.alphaRef = 0xff;
    this.cloudByte = this.desc ? this.desc.cloudParam : 225;
    this.sunY = null;
    if (this.cloudAnim) this.cloudAnim.alphaApplied = -1;
    this.t140 = this.t148 = this.t150 = this.t154 = this.t158 = 0;
    this.camSpeed = F((1 / this.rate) * K.CAM_SPEED);
    if (this.precip) this.#resetPrecip();
    // The accumulation map INTEGRATES, so it has to go back to its build-time
    // state (white, alpha 0) like every other integrator here — otherwise each
    // capture would inherit the snow every previous warm-up laid down, and the
    // sweep would stop being deterministic.  Not in the original, which never
    // replays; the same reason `phase0` and the terrain scale are restored.
    if (this.snowMap) {
      this.snowMap.fill(0x00ffffff);
      this.snowFrames = 0;
      this.snowDirty = true;
    }
    this.#resetAnim();
  }

  /**
   * Every animated system integrates state, so `reset()` has to put each of
   * them back to its build-time value or a second warm-up starts where the last
   * one stopped (the order-dependence trap of SCENES_7_10.md §6).
   */
  #resetAnim() {
    // Dandelion sway: phases are drawn from the global stream at BUILD time and
    // then integrate every frame — put both the phases and the displaced verts
    // back or a second warm-up starts mid-wobble.
    for (const g of (this.billboards1 || [])) {
      g.phases.set(g.phases0);
      for (let mi = 0; mi < g.meshes.length; mi++) g.meshes[mi].verts.set(g.rests[mi]);
    }
    for (const f of (this.flocks || [])) {
      if (!f._home) continue;
      f.T = f._homeT;
      for (let i = 0; i < f.birds.length; i++) {
        const b = f.birds[i], h = f._home[i];
        b.mesh.pos = h.pos.slice();
        b.euler = h.euler.slice();
        b.mesh.rot = MG.mat4Euler(b.euler[0], b.euler[1], b.euler[2]);
      }
    }
    // Array-F props: `#stepProps` integrates `rest`, counts `phase` down and
    // rewrites the stem from `T`, so all three have to go back — and the twig
    // and leaf buffers with them, since the updater writes rest+offset into
    // the live meshes.
    for (const dd of (this.props || [])) {
      dd.T = 0;
      for (const r of dd.records) {
        r.rest[0] = r.rest[1] = r.rest[2] = 0;
        r.phase = r.phase0;
      }
      if (dd.twigsRest) dd.twigs.verts.set(dd.twigsRest);
      if (dd.leavesRest) dd.leaves.verts.set(dd.leavesRest);
    }
    for (const t of (this.trees || [])) {
      t.T = 0;
      t.active = false;
      if (t.leafRecords) for (const L of t.leafRecords) {
        L.disp[0] = L.disp[1] = L.disp[2] = 0;
        L.vel[0] = L.vel[1] = L.vel[2] = 0;
        L.falling = L.falling0;
        L.settle = L.settle0;
      }
      if (t.leaves && t.leafBase) t.leaves.verts.set(t.leafBase);
    }
    // FUN_00408d72 puts every array-A cluster back to un-armed with its
    // instances at the initial 0.001 y scale.
    for (const c of (this.spires || [])) {
      c.growing = false; c.T = 0;
      for (let i = 0; i < c.meshes.length; i++) {
        c.meshes[i].scale[1] = K.SPIRE_SCALE_Y;
        c.recs[i].delay = c.recs[i].delay0;
        c.recs[i].t = 0;
        c.meshes[i].verts.set(c.base);
      }
    }
    if (this.cloudAnim) this.cloudAnim.T = 0;
    for (const m of (this.curtains || [])) m.windT = 0;
    for (const r of (this.ribbons || [])) {
      if (r.state && r._phase0 !== undefined) r.state.phase = r._phase0;
    }
  }

  #resetPrecip() {
    const p = this.precip;
    // The droplet ring integrates too, so a second warm-up would otherwise
    // start with the last one's droplets still on the lens.
    p.T = 0;
    this.dropHead = 0;
    this.dropCount = 0;
    if (p._home) {
      for (let i = 0; i < p.particles.length; i++) {
        p.particles[i].pos = p._home[i].slice();
      }
      return;
    }
    MG.srand(1);
    for (const q of p.particles) {
      q.pos[1] = F(-MG.rand01() * p.box[1]);
    }
  }

  // -------------------------------------------------------------------------
  // FUN_004060db — the frame delta.  `+0x04` is elapsed time expressed in
  // 1/`+0x0c` second units, i.e. "frames at `rate` fps".  Disassembled in
  // full (0x4060db-0x406124) 2026-08-12; the port had two deviations from it,
  // and they had to be corrected TOGETHER because each was masking the other:
  //
  //  1. `Math.min(d, 4)` IS NOT IN THE BINARY.  There is no comparison
  //     against 4.0 anywhere in FUN_004060db — the only `fcomp` is the bias
  //     test against 0 (`0x406106 fcomp dword [0x4170c8]`).  The original's
  //     clock is time-true at any frame rate: a slow frame advances the
  //     animation by exactly the elapsed time, it does not lose it.
  //  2. `lastMs` must start at the CURRENT ms, not 0.  The base ctor does
  //     `call 0x402f01 / mov [esi+0x10],eax` (FUN_004060c9 @0x4060d1), i.e.
  //     it seeds the clock with "now" so the first frame after a reset has a
  //     delta of ~0.  The port seeded 0, which makes the first tick after any
  //     mid-demo reset compute a delta of the whole elapsed song — which is
  //     precisely what the invented clamp was quietly absorbing.
  //
  // Removing the clamp alone would have turned that stale-`lastMs` spike into
  // a multi-thousand-unit dt; fixing `lastMs` alone would have left a clamp
  // the original does not have.  Verified inert for the capture path (the
  // cold warm-up never clamps: 0 of 8027 ticks to 0x0c34) and for the sweep.
  //
  // The `d > 0` guard is kept deliberately and is NOT in the binary: the
  // original's ms counter is a monotonic read of MiniFMOD's per-block time
  // table (FUN_004100db), while the port's clock can be re-anchored by a
  // scene jump — a port-only hazard needing a port-only guard.
  // -------------------------------------------------------------------------
  #tickClock(ms) {
    if (this.lastMs === null) this.lastMs = ms;      // FUN_004060c9: lastMs = now
    const d = (ms - this.lastMs) / (K.FRAME_BASE / this.rate);
    this.lastMs = ms;
    this.dt = Number.isFinite(d) && d > 0 ? d : 0;
    if (this.bias !== 0) { this.dt += this.bias; this.bias = 0; }
  }

  /** Headless warm-up hook (main.js `warmTo`): advance state with no device calls. */
  tick(ctx) {
    if (!this.built) return;
    this.position = ctx.position;
    this.#tickClock(ctx.songMs);
    if (!this.visible) return;
    this.#advance();
    // The particle system MUST integrate during the warm-up too.  In the
    // original `FUN_0040d5c6` runs inside every rendered frame, so by the time
    // a given frame is displayed the particles are in steady state; the port's
    // warm-up is standing in for those frames.  Skipping it here left every
    // particle still at its build-time position under the terrain, so the one
    // rendered frame caught all of them on their respawn tick — where the
    // original writes alpha 0 — and the snow was invisible.
    // `precipAlpha == 0` short-circuits, so this costs nothing outside the
    // music-position gate.
    if (this.precip && this.precipAlpha) {
      const cam = this.cameras[this.activeCam] || this.cameras[0];
      const ev = cam.evaluate(this.camTimes[this.activeCam] || 0);
      this.#stepPrecip(F(this.dt * K.TIME_RATE), ev.position, ZERO3, ZERO3, false, ev.target);
    }
  }

  /**
   * FUN_0040bfc1 @ 0x40bfc1 — array-A STAGGER + GROWTH + WOBBLE.
   * `FUN_00408eef`'s update block calls it as
   * `FUN_0040bfc1(clusters + i*0x24, desc[2] * dt * 0.01)` under the
   * `desc[0x4f] & 2` gate, `desc[2]` being `desc.paramA` = 0.1 in scene 0.
   *
   * REWRITTEN FROM THE DECOMPILE (sonnet.c FUN_0040bfc1).  The port had this as
   * a single per-CLUSTER ramp `t += dt*paramA`, which was wrong three ways:
   *
   *  1. `paramA` was applied TWICE (once by the caller, once here), so the
   *     blades grew 10x too slowly — at 0x0628 they stood at t = 0.06 of their
   *     512-unit height while the reference is full of full-height blades.
   *  2. The growth is driven by the cluster's ACCUMULATED clock, not by dt:
   *     `T += arg` once per frame, then `rec[1] += T * 0.01` per instance, so
   *     the ramp ACCELERATES (t ~ n^2/2) rather than being linear.
   *  3. Each instance carries its own STAGGER DELAY, `rec[0] = rand01()*255`
   *     from the generator, decremented by `T` every frame once the cluster is
   *     armed by event `m1`.  Nothing happens to an instance until its delay
   *     goes negative, so the field fills in progressively — which is exactly
   *     what the reference shows (some blades full height, some absent).
   *
   * And the part that was missing entirely: while an instance is growing its
   * vertices are REBUILT from the template every frame with a per-ring lateral
   * offset, which is what curves the blades:
   *
   *     a  = inst + T*10.0 + ring*0.5      [0x418e5c]=10  [0x4170d4]=0.5
   *     dx = sin(a)        * 1.0 * 5.5     [0x418ef8]=1.0 [0x418f4c]=5.5
   *     dz = cos(a * 1.37) * 1.0 * 5.5     [0x418f48]=1.37
   *     if (ring == 0) dx = dz = 0         ; the base is pinned
   *     vert = templateVert + (dx, 0, dz)
   *
   * Note the `else rec[1] = 1.0` arm skips the rebuild, so **the wobble freezes
   * at whatever phase the blade had when it finished growing** — the field is
   * static once grown, which is what the reference shows too.  Normals are
   * never recomputed (the original calls only its bounds update), and they
   * matter here because the material is a camera-space SPHERE MAP.
   *
   * The scale is written HERE rather than at draw time so that the water
   * reflection pass's mirror/un-mirror (which negates `scale[1]` in place) is
   * not fighting a per-draw assignment.
   */
  #stepSpires(dt) {
    const S = MG.VERTEX_FLOATS;
    for (const c of this.spires) {
      c.T = F(c.T + dt);
      const T = c.T;
      const wob = F(T * K.SPIRE_WOBBLE_RATE);
      for (let i = 0; i < c.recs.length; i++) {
        const rec = c.recs[i];
        if (c.growing) rec.delay = F(rec.delay - T);
        if (!(rec.delay < 0)) continue;
        rec.t = F(rec.t + F(T * K.SPIRE_GROW));
        const m = c.meshes[i];
        if (rec.t <= 1.0) {
          const V = m.verts, B = c.base;
          for (let ring = 0; ring < c.rings; ring++) {
            let dx = 0, dz = 0;
            if (ring !== 0) {
              const a = F(F(i + wob) + F(ring * K.SPIRE_RING_PHASE));
              dx = F(Math.sin(a) * K.SPIRE_WOBBLE_AMP);
              dz = F(Math.cos(F(a * K.SPIRE_WOBBLE_Z)) * K.SPIRE_WOBBLE_AMP);
            }
            for (let seg = 0; seg < c.segments; seg++) {
              const o = (ring * c.segments + seg) * S;
              V[o] = F(B[o] + dx);
              V[o + 1] = B[o + 1];
              V[o + 2] = F(B[o + 2] + dz);
            }
          }
        } else {
          rec.t = 1.0;
        }
        m.scale[1] = rec.t;
        rec.delay = 0;
      }
    }
  }

  #advance() {
    const dt = this.dt, desc = this.desc;
    this.time = F(this.time + F(dt * K.TIME_RATE));
    // Landscape+0x13c, advanced unconditionally at VA 0x409617 — the water
    // glitter's own clock (`sinf(this[0x13c] * 10.0 + phase)`).
    this.t13cPrev = this.t13c || 0;
    this.t13c = F((this.t13c || 0) + F(dt * K.TIME_RATE));
    if (this.enabled) {
      this.camTimes[this.activeCam] =
        F((this.camTimes[this.activeCam] || 0) + F(this.camSpeed * dt));
    }

    // ---- descriptor flag bit 17.  MISNAMED in scene_desc.mjs (kept for
    // compatibility): the water level does not move at all.  FUN_00408eef,
    // VA 0x40968a-0x4096f6, verified by ndisasm:
    //
    //     test byte [ecx+0x51],0x2          ; waterLevelAnim
    //     cmp  byte [esi+0x144],0x0         ; the m7 gate
    //     fld [esi+4]; fmul [0x418260]      ; dt * 0.01
    //     fadd [esi+0x140]; fstp [esi+0x140]
    //     clamp into [ [0x4170c8]=0.0 , [0x4170c4]=1.0 ]
    //     test byte [ecx+0x51],0x1          ; terrainVisible, bit 16 — the SECOND gate
    //     fld [ecx+0x44]                    ; desc+0x44 = terrainScale.Y
    //     fmul [esi+0x140]                  ; * the ramp
    //     mov eax,[esi+0x6c]                ; the TERRAIN mesh
    //     fstp [eax+0x98]                   ; -> scale.Y
    //
    // `this+0x6c` is the terrain mesh: FUN_0040e058's own `this` is scene+0x4c
    // and it stores the mesh at +0x20, i.e. scene+0x6c, and the render tail hides
    // exactly that pointer when bit 16 is clear.  `mesh+0x94..0x9c` is the node
    // SCALE triple — FUN_0040e058 writes terrainScale there, FUN_00407983 writes
    // a tree's uniform scale there, FUN_004082a9 copies the same triple onto the
    // water plane — so +0x98 is scale.Y.
    //
    // So: THE LANDSCAPE RISES OUT OF THE WATER.  Scene 1's terrain starts DEAD
    // FLAT and reaches its full 0.5 relief 100 frames-at-30fps (~3.3 s, ~20 music
    // rows) after the m7 at position 0x0720.  Scene 1 is the only descriptor with
    // bit 17, and it sets bit 16 as well, so the consumer really does run.
    //
    // ⚠ CORRECTION (2026-08-06): an earlier note here called the old
    // `desc.waterLevel = position < 0x820 ? 0 : 1.0` step "a fabrication".  It is
    // in the binary, verbatim: FUN_00408eef VA 0x4091a7-0x4091c4 does
    //     test byte [desc+0x51],0x2 ; call FUN_004030ef (music position)
    //     cmp ax,0x820 ; jc -> fldz / fld1 ; fstp [desc+0x10]
    // every frame.  Bit 17 carries BOTH behaviours: the waterLevel STEP at 0x820
    // (the moment scene 1's camera cuts to its second vista) AND the terrain
    // scale.Y ramp below.  The first landscape is dry; the water — and with it
    // the reflection pass, the clip planes and the Z-only clear — exists only
    // from 0x820 on.  Deleting the step was the over-correction that put water
    // (and a teal lake) into the first landscape.
    if (desc.flag.waterLevelAnim) {
      desc.waterLevel = (this.position & 0xffff) < 0x820 ? 0 : 1.0;
      if (this.flag144) this.t140 = F(this.t140 + F(dt * K.TIME_RATE));
      if (this.t140 < 0) this.t140 = 0;
      if (this.t140 > 1) this.t140 = 1;
      if (desc.flag.terrainVisible && this.terrainMesh) {
        this.terrainMesh.scale[1] = F(desc.terrainScale[1] * this.t140);
      }
    }

    // Precip fade-ins (FUN_00408eef, gated on the music position in the original;
    // here the same gates come from the object's own enable window).
    if (desc.flag.buildPrecip) {
      // FUN_00408eef gates the precipitation on the MUSIC POSITION, not on the
      // object's own enable window (VA 0x408f0d-0x408fd6):
      //   pos > 0x19ff                      -> t154 (the render-target ramp) runs
      //   0x1b00..0x1dff  or  pos >= 0x2000 -> the particle mesh is VISIBLE and
      //                                        t158 (its alpha) ramps
      // so obj 8's rain starts a quarter of the way into the autumn scene and
      // obj 9's snow starts at 0x2000, a third of the way into the ice scene.
      const pos = this.position;
      if (pos > 0x19ff) this.t154 = Math.min(1, F(this.t154 + F(dt * K.PRECIP_RAMP)));
      // VA 0x408f69-0x408fd2, the second fog ramp — active only in 0x1700..0x1dff,
      // i.e. exactly obj 8's window.  It runs BACKWARDS out of the autumn orange:
      //   R = round(163*(1-t) + 50*t)   G = round(71*(1-t) + 50*t)
      //   B = round( 50*t + (1-t))      cloudByte = round(225 - 225*t)
      // t = 0 reproduces 0xa34701 exactly; t = 1 is a flat 50,50,50 storm grey.
      if (pos > 0x16ff && pos < 0x1e00) {
        const t = this.t154, it = F(1 - t), t50 = F(50 * t);
        const R = Math.round(F(163 * it) + t50);
        const G = Math.round(F(71 * it) + t50);
        const B = Math.round(t50 + it);
        this.fogColour = (0xff000000 | (R << 16) | (G << 8) | B) >>> 0;
        this.cloudByte = Math.round(F(225.0 - F(t * 225.0))) & 0xff;
      }
      const on = (pos > 0x1aff && pos < 0x1e00) || pos > 0x1fff;
      this.precip.mesh.hidden = !on;
      // VA 0x408fdb: `and dword [esi+0x11c], 0`, then in the gated branch
      // `+0x11c = ftol(t158 * 256.0)`  [0x4182bc].  That word is the particle
      // updater's `+0x5c`, i.e. its global alpha, and zero makes it return
      // immediately — so the particles do not integrate at all while hidden.
      this.precipAlpha = 0;
      if (on) {
        // [0x418ebc] = 0.08 when precipType != 0 (rain), [0x418260] = 0.01 for snow.
        const r = desc.precip.isRain ? K.PRECIP_FADE_RAIN : K.PRECIP_FADE_SNOW;
        this.t158 = Math.min(1, F(this.t158 + F(dt * r)));
        this.precipAlpha = Math.round(F(this.t158 * K.PRECIP_ALPHA_MAX));
      }
    }
    // ---- the rest of FUN_00408eef's per-frame update block, in call order
    // (LANDSCAPE_ANIM.md §1's gate table).  Everything except the bird updater
    // takes dt * 0.01; FUN_0040fba1 takes the raw dt.
    if (desc.flag.cloudLayer) this.#stepCloud(F(dt * K.TIME_RATE));
    // `desc[0x50] & 0x08` (cloudOpt11) — THE INLINE CLOUD GREY + FADE.
    // Object 6 (scene 3, the cloud sea) is the ONLY descriptor with bit 11, so
    // everything here is scene-3 only.  Transcribed from VA 0x4091e4-0x4092e9;
    // Ghidra emitted the grey as a bare `FUN_00404224()` with no argument (the
    // usual dropped-x87 pattern), so the expression comes from ndisasm:
    //
    //   004091F2  clamp this+0x150 (t150) into [0, 1]
    //   0040922A  fmul  dword [0x418eb4]   ; t150 * 31.0
    //   00409230  fsubr dword [0x418eb4]   ; 31.0 - t150*31.0
    //   00409236  call  ftol               ; grey = ftol(31 * (1 - t150))
    //   00409243+ for every cloud-layer vertex (stride 0x2c, diffuse at +0x18):
    //               diffuse = (diffuse & 0xff000000) | grey<<16 | grey<<8 | grey
    //   then  f = max(0, (t150 - 0.75) * 4.0)            [0x418eb0], [0x418230]
    //         obj(this+0x3c).0xd8 = obj.0xdc = f * 2000.0 + 300.0   [0x418eac], [0x418e78]
    //   and finally, ONLY once m10 has fired:  t150 += dt * 0.003   [0x418ea8]
    //
    // ⚠ THE GREY IS 31, NOT 255, AND IT IS WRITTEN EVERY FRAME FROM THE START
    // OF THE SCENE — the m10 gate covers only the t150 accumulation, not the
    // write.  `buildCloudSky` colours these vertices `desc.cloudColour` =
    // 0xffffff and nothing ever overwrote it, so the port drew the cloud sea
    // 255/31 = 8.2x too bright.  With material 0x3091 (additive) that
    // saturates the whole lower field to flat white and destroys the billow
    // structure — the single largest divergence in this scene.
    if (desc.flag.cloudOpt11) {
      if (this.t150 < 0) this.t150 = 0;
      if (this.t150 > 1) this.t150 = 1;
      const grey = ftol(F(K.CLOUD_GREY - F(this.t150 * K.CLOUD_GREY))) & 0xff;
      if (this.cloudSky) {
        const u = new Uint32Array(this.cloudSky.verts.buffer);
        const S = MG.VERTEX_FLOATS;
        const rgb = ((grey << 16) | (grey << 8) | grey) >>> 0;
        for (let i = 0; i < this.cloudSky.vertexCount; i++) {
          const o = i * S + MG.V_COL;
          u[o] = ((u[o] & 0xff000000) | rgb) >>> 0;
        }
      }
      // The tail ramp: a late blow-up of the object at Landscape+0x3c once
      // t150 passes 0.75. Not wired — `this.cloud3c` does not exist in the
      // port — but the accumulator below keeps t150 honest for it.
      if (this.flag14c) {
        this.t150 = Math.min(1, F(this.t150 + F(dt * K.CLOUD_DISSOLVE)));
      }
    }
    if (desc.flag.hiResWater && this.ribbons.length) this.#stepRibbons(F(dt * K.TIME_RATE));
    if (desc.flag.buildTrees && this.trees.length) {
      this.#stepLeaves(F(F(desc.unknown0a * dt) * K.TIME_RATE));
    }
    // `desc[0x50] & 0x80` (buildProps) — FUN_0040cfed, the array-F prop wind.
    // Immediately after the leaf fall and before the droplets, which is the
    // original's own call order (sonnet.c:7708-7716).  Scene 2 only.
    if (desc.flag.buildProps && this.props.length) {
      this.#stepProps(F(dt * K.TIME_RATE));
    }
    if (desc.flag.buildA && this.spires.length) {
      this.#stepSpires(F(F(desc.paramA * dt) * K.TIME_RATE));
    }
    // `desc[0x4f] & 4` (buildB) — FUN_0040c674, the curtain wind.  Scene 4 only.
    if (desc.flag.buildB && this.curtains.length) this.#stepCurtains(F(dt * K.TIME_RATE));
    // FUN_00408eef VA ~0x40940x: per array-D entry, FUN_0040bb14(entry,
    // dt * [0x418ea4]=0.1) — the dandelion sway.  Ordered BEFORE the birds.
    if (desc.flag.buildBillboards1 && this.billboards1.length) {
      this.#stepBillboards1(F(dt * K_SWAY_RATE));
    }
    if (desc.flag.buildBirds && this.flocks.length) this.#stepFlocks(dt);
    // ---- the m8 SUNSET ramp (obj 7), VA 0x409070-0x4090cc.
    //   R = round(163*t + 200*(1-t))
    //   G = round( 71*t + 200*(1-t))
    //   B = round(255*(1-t) + t)              [0x418eb8]=200 [0x418ec4]=163
    //   sun.y = 200 - t*150                   [0x418ec0]=71  [0x418268]=255
    //   t += dt * 0.002                       [0x418e98]=0.002 [0x418e9c]=150
    // t = 0 gives (200,200,255), t = 1 gives 0xa34701 — exactly scene 5's
    // descriptor fog colour, i.e. the beach fades into the autumn palette.
    if (this.flag145) {
      const t = this.t148, it = F(1 - t);
      const R = Math.round(F(163 * t) + F(200 * it));
      const G = Math.round(F(71 * t) + F(200 * it));
      const B = Math.round(F(255 * it) + t);
      this.fogColour = (0xff000000 | (R << 16) | (G << 8) | B) >>> 0;
      this.sunY = F(200.0 - F(t * 150.0));
      this.t148 = Math.min(1, F(this.t148 + F(dt * 0.0020000000949949026)));
    }
    // (the m7 ramp `t140` is advanced above, inside its bit-17 gate, exactly
    // where FUN_00408eef advances it — it is NOT a free-running accumulator.)
  }

  /**
   * FUN_0040d5c6 — PARTICLE INTEGRATION + QUAD EMIT, one pass, disassembled at
   * VA 0x40d5c6-0x40da60 (Ghidra drops the whole x87 chain around the alpha
   * ramps and the respawn).  Confidence: HIGH.
   *
   *   if (globalAlpha == 0) return                   // the WHOLE updater is skipped
   *   camXZ = (camera.x, 0, camera.z)
   *   hh = rain ? 5.0 : 1.0                          // quad half-height
   *   M  = the camera billboard basis; for RAIN the local +Y is forced to (0,1,0)
   *   step = dt * 1250.0                             [0x418f98]
   *   for each particle:
   *       p0 = pos                                   // the quad uses the OLD pos
   *       pos += vel * step
   *       if (terrainHeight(p0.x, p0.z) <= pos.y):
   *           a = 255
   *           if (boxY - 32 < pos.y) a = round(255 - (pos.y - (boxY-32)) * 8)
   *           if (pos.y < 8)         a = round(pos.y * 32)    // NOT else-if
   *           a = clamp(a, 0, 255)
   *       else:
   *           pos = camXZ + (2*r*boxX - boxX,  boxY + pos.y,  2*r*boxZ - boxZ)
   *           a = 0                                  // z is drawn FIRST
   *       if (rain) a >>= 1
   *       col = ((a * globalAlpha) >> 8) << 24 | 0xffffff
   *       corners (-1,-hh) (1,-hh) (1,+hh) (-1,+hh), each * quadScale, * M, + p0
   *
   * So the real half-extents are (1, 5) x quadScale = (1, 10) world units for
   * rain and (1, 1) for snow — the previous eyeballed 0.6/5.5 and 0.4/0.4 made
   * the snow four times too small.
   */
  /**
   * Deposit one landed flake into the snow-accumulation map.
   * `FUN_0040d5c6`'s ground-contact branch, disassembled 0x40D740-0x40D873
   * (Ghidra dropped the whole x87 chain, as usual):
   *
   *   worldToMap(terrain, &X, &Z)                 ; 0x40D740
   *   if (X < 0 || Z < 0 || X >= 255 || Z >= 255) skip
   *   fx = (ftol(X * 65536) & 0xffff) * 1/65536   ; [0x418270], [0x418f94]
   *   fz = (ftol(Z * 65536) & 0xffff) * 1/65536
   *   w0 = (1-fx)(1-fz) * 64                      ; [0x418f50] = 64
   *   w1 = fx    (1-fz) * 64
   *   w2 = (1-fx) fz    * 64
   *   w3 = fx     fz    * 64
   *   idx = (ftol(Z) << 8) + ftol(X)              ; 0x40D80C-0x40D821
   *   four times: a = ftol(alpha[idx] + w); if (a > 255) a = 255; store
   *
   * ⚠ AND THE WALK IS THE ORIGINAL'S OWN QUIRK — reproduce it, do not "fix"
   * it.  The pointer advances +4, +0x400, +4 (0x40D854-0x40D864), i.e. one
   * texel in X, one row in Z, one texel in X — so the four texels written are
   * (X,Z) (X+1,Z) (X+1,Z+1) (X+2,Z+1), a staircase.  A correct bilinear
   * footprint would have been (X,Z) (X+1,Z) (X,Z+1) (X+1,Z+1); the bottom row
   * is one texel too far right because the second advance never subtracts the
   * first.  The weights are still the correct bilinear set, so the deposit is
   * simply smeared one texel diagonally — invisible at this scale, and it is
   * what the demo has always drawn.
   */
  #depositSnow(px, pz) {
    const map = this.snowMap;
    const [mx, mz] = MG.worldToMap(this.desc.terrainScale, px, pz);
    if (!(mx >= 0 && mz >= 0 && mx < 255 && mz < 255)) return;
    const INV = 1.0 / 65536.0;
    const fx = F((ftol(F(mx * 65536.0)) & 0xffff) * INV);
    const fz = F((ftol(F(mz * 65536.0)) & 0xffff) * INV);
    const K64 = 64.0;
    const w = [
      F(F(F(1.0 - fx) * F(1.0 - fz)) * K64),
      F(F(F(1.0 - fz) * fx) * K64),
      F(F(F(1.0 - fx) * fz) * K64),
      F(F(fz * fx) * K64),
    ];
    let idx = (ftol(mz) << 8) + ftol(mx);
    for (let i = 0; i < 4; i++) {
      const cur = (map[idx] >>> 24) & 255;
      let v = ftol(F(cur + w[i]));
      if (v > 255) v = 255;
      map[idx] = (((v & 255) << 24) | (map[idx] & 0x00ffffff)) >>> 0;
      idx += (i === 0 || i === 2) ? 1 : 256;      // +4 / +0x400 bytes
    }
    this.snowDirty = true;
  }

  #stepPrecip(dt, eye, right, up, emit = true, target = null) {
    const p = this.precip, m = p.mesh, V = m.verts, S = MG.VERTEX_FLOATS;
    const box = p.box, isRain = p.isRain;
    // +0x5c, written by the render as ftol(t158 * 256.0); 0 short-circuits the
    // whole function in the original.
    const gAlpha = this.precipAlpha | 0;
    if (gAlpha === 0) return;
    // precip+0x60: incremented every update, saturating at 16 (the deposit
    // gate tests `> 15`, so accumulation begins on the 16th update).
    if (this.snowMap !== undefined) {
      this.snowFrames = Math.min(16, (this.snowFrames | 0) + 1);
    }
    p.T = F(p.T + dt);              // precip+0x08 — the droplets' birth clock
    const step = F(dt * K.PRECIP_STEP);
    const hh = isRain ? 5.0 : 1.0;
    const qs = p.quadScale;
    // FUN_0040dd68 inverts the camera matrix, so the quad basis is
    // (right, up, forward) in world space; rain overrides the up axis with +Y.
    const rx = F(right[0] * qs[0]), ry = F(right[1] * qs[0]), rz = F(right[2] * qs[0]);
    const uy0 = isRain ? [0, 1, 0] : up;
    const ux = F(uy0[0] * qs[1]), uy = F(uy0[1] * qs[1]), uz = F(uy0[2] * qs[1]);
    const topEdge = F(box[1] - K.PRECIP_TOP_FADE);
    const CORNERS = [[-1, -hh], [1, -hh], [1, hh], [-1, hh]];
    for (let i = 0; i < p.particles.length; i++) {
      const q = p.particles[i], pos = q.pos;
      const x0 = pos[0], y0 = pos[1], z0 = pos[2];
      pos[0] = F(pos[0] + F(q.vel[0] * step));
      pos[1] = F(pos[1] + F(q.vel[1] * step));
      pos[2] = F(pos[2] + F(q.vel[2] * step));
      let a;
      const th = this.terrain ? MG.terrainHeight(this.terrain, x0, z0) : 0;
      if (th <= pos[1]) {
        a = 255;
        if (topEdge < pos[1]) a = Math.round(F(255.0 - F(F(pos[1] - topEdge) * K.PRECIP_BOT_FADE)));
        if (pos[1] < K.PRECIP_BOT_FADE) a = Math.round(F(pos[1] * K.PRECIP_TOP_FADE));
        if (a < 0) a = 0; else if (a > 255) a = 255;
      } else {
        // The flake has reached the ground.  In the original the snow is
        // deposited HERE, before the respawn moves the particle away.
        if (this.snowMap && this.snowFrames > 15) this.#depositSnow(x0, z0);
        const rz2 = F(F(F(MG.rand01() * box[2]) * 2.0) - box[2]);
        const ry2 = F(box[1] + pos[1]);
        const rx2 = F(F(F(MG.rand01() * box[0]) * 2.0) - box[0]);
        pos[0] = F(eye[0] + rx2); pos[1] = ry2; pos[2] = F(eye[2] + rz2);
        a = 0;
      }
      if (isRain) a >>= 1;
      if (!emit) continue;
      const col = ((((a * gAlpha) >> 8) << 24) | 0xffffff) >>> 0;
      for (let k = 0; k < 4; k++) {
        const o = (i * 4 + k) * S, ca = CORNERS[k][0], cb = CORNERS[k][1];
        V[o] = F(F(F(ca * rx) + F(cb * ux)) + x0);
        V[o + 1] = F(F(F(ca * ry) + F(cb * uy)) + y0);
        V[o + 2] = F(F(F(ca * rz) + F(cb * uz)) + z0);
        m.vu32[o + MG.V_COL] = col;
      }
    }
    this.#emitDroplet(target, eye);
  }

  /**
   * `FUN_0040d5c6`'s TAIL, VA 0x40dbd0-0x40dc5a — one lens droplet per frame,
   * into a 256-entry ring.  DISASSEMBLED: Ghidra renders the gate as
   * `ftol()` with no operand, which loses the multiply and makes the emission
   * look like a 1-in-32768 event.
   *
   *   0040DBE7  call 0x402626          ; fwd = camera.target - camera.pos
   *   0040DBEF  call 0x40de2a          ; normalize
   *   0040DBFE  call 0x4025b6          ; dot((0,1,0), fwd)  == fwd.y
   *   0040DC03  fmul dword [0x41826c]  ; * 32767.0          <- THE DROPPED MULTIPLY
   *   0040DC09  call 0x404224          ; n = ftol(...)
   *   0040DC10  test esi,esi / jnl     ; if (n < 0) n = 0
   *   0040DC16  call 0x404258          ; r = rand()   (0 .. 0x7fff)
   *   0040DC1B  cmp eax,esi / jnl      ; if (r < n) emit
   *
   * So the probability per frame is exactly `max(0, fwd.y)` — droplets fall on
   * the lens only while the camera is looking UP.  That is why the reference is
   * covered in them at 0x1b38 (the camera cranes up into the tree) and clean
   * everywhere else in the scene.
   *
   * The quad is written straight in NDC (the draw uses identity transforms):
   *   x = rand01()*2 - 1 ;  y = rand01()*2 - 1
   *   corners (x-+0.12, y+-0.16), and uv1 — the SECOND texcoord set, float
   *   offsets 9 and 10 — is the same rectangle widened to +-0.16 / +-0.2133,
   *   scaled by 0.5 and BIASED by 0.5, with v NEGATED.  uv0 keeps the plain
   *   0..1 quad the constructor wrote.
   */
  #emitDroplet(target, eye) {
    if (!this.droplets || !target) return;
    let fx = F(target[0] - eye[0]), fy = F(target[1] - eye[1]), fz = F(target[2] - eye[2]);
    const L = Math.sqrt(F(F(fx * fx) + F(F(fy * fy) + F(fz * fz))));
    if (!(L > 0)) return;
    let n = ftol(F(F(fy / L) * K.DROP_PROB));
    if (n < 0) n = 0;
    if (!(MG.rand() < n)) return;

    const m = this.droplets, V = m.verts, S = MG.VERTEX_FLOATS;
    const h = this.dropHead;
    this.dropBirth[h] = this.precip.T;
    const x = F(F(MG.rand01() * 2.0) - 1.0);
    const y = F(F(MG.rand01() * 2.0) - 1.0);
    const xL = F(x - K.DROP_HX), xR = F(x + K.DROP_HX);
    const yT = F(y + K.DROP_HY), yB = F(y - K.DROP_HY);
    const uL = F(F(F(x - K.DROP_UX) * K.DROP_UV_H) + K.DROP_UV_H);
    const uR = F(F(F(x + K.DROP_UX) * K.DROP_UV_H) + K.DROP_UV_H);
    const vT = F(F(F(y + K.DROP_UY) * K.DROP_UV_SY) + K.DROP_UV_H);
    const vB = F(F(F(y - K.DROP_UY) * K.DROP_UV_SY) + K.DROP_UV_H);
    const Q = [[xL, yT, uL, vT], [xR, yT, uR, vT], [xR, yB, uR, vB], [xL, yB, uL, vB]];
    for (let k = 0; k < 4; k++) {
      const o = (h * 4 + k) * S, q = Q[k];
      V[o] = q[0]; V[o + 1] = q[1]; V[o + 2] = 0;
      V[o + MG.V_U1] = q[2]; V[o + MG.V_V1] = q[3];
    }
    this.dropHead = (h + 1) % 256;
    if (this.dropCount < 256) this.dropCount++;
  }

  /**
   * `FUN_0040de4e` @ 0x40de4e — THE LENS-DROPLET DRAW.
   *
   * `LANDSCAPE_ANIM.md` §8 and `SCENES_7_10.md` §8 both call this "snow
   * accumulation"; it is not, and nothing in the demo accumulates snow.  Read
   * off the disassembly (Ghidra drops the operand of both `ftol`s):
   *
   *   save TRANSFORM 2 and 3 ;  FUN_00401bd0()          ; W = V = P = identity
   *   FUN_004019e6(1)                                   ; ADDITIVE, ZWRITE off
   *   SetRenderState(0x17, 8)                           ; ZFUNC = ALWAYS
   *   if (precip+0x44 != 0) {                           ; the 64x64 RT exists
   *       SetTexture(0, dropletTex) ;  SetTexture(1, RT64)
   *       FUN_004019a0(2)                               ; stage-1 op MODULATE
   *       FUN_0040191b(1, 0)                            ; stage-1 addressing CLAMP
   *       per droplet: a = clamp(ftol(255 - (T - birth)*50), 0, 255)
   *       DrawIndexedPrimitiveUP(TRIANGLELIST, 0, n*4, n*2, ...)   TWICE
   *   }
   *   per droplet: a = clamp(ftol((255 - (T - birth)*50) * 0.35), 0, 255)
   *   SetTexture(0, dropletTex) ;  SetTexture(1, NULL) ;  FUN_004019a0(0)
   *   FUN_004019e6(2)                                   ; normal ALPHA BLEND
   *   DrawIndexedPrimitiveUP(...)                       ; once
   *   SetRenderState(0x17, 4)                           ; ZFUNC = LESSEQUAL
   *   restore TRANSFORM 2 and 3
   *
   * `FUN_004019e6` / `FUN_004019a0` / `FUN_0040191b` are the shim's
   * `setBlendMode` / `setStage1Op` / `setAddressMode`, so this uses them
   * directly rather than going through `applyMaterial` — the original sets the
   * states by hand here and never builds a material for these quads.
   *
   * Lifetime is 255/50 = 5.1 units of the precip clock, which advances at
   * `frameDt*0.01` ~ 0.01 per frame, i.e. about **17 s** — long enough for the
   * ring to fill to its 256 limit while the camera is looking up.
   */
  #drawDroplets(d3d) {
    if (!this.droplets || this.dropCount === 0) return;
    const m = this.droplets, S = MG.VERTEX_FLOATS, U = m.vu32;
    const n = this.dropCount, T = this.precip.T;
    const setAlpha = (mul) => {
      for (let i = 0; i < n; i++) {
        let a = ftol(F(F(F(K.DROP_A_MAX - F(F(T - this.dropBirth[i]) * K.DROP_FADE))) * mul));
        if (a < 0) a = 0; else if (a > 255) a = 255;
        const c = (((a << 24) >>> 0) | 0xffffff) >>> 0;
        for (let k = 0; k < 4; k++) U[(i * 4 + k) * S + MG.V_COL] = c;
      }
    };
    const draw = () => d3d.DrawIndexedPrimitiveUP(D3DPT_TRIANGLELIST, 0, n * 4, n * 2,
      m.indices, m.indexFormat, m.verts, FVF_SONNET_STRIDE);

    const I = new D3DMatrix();
    d3d.SetTransform(D3DTS_WORLD, I);
    d3d.SetTransform(D3DTS_VIEW, I);
    d3d.SetTransform(D3DTS_PROJECTION, I);
    d3d.setLighting(0, 0xffffffff);
    d3d.setBlendMode(1);                                  // FUN_004019e6(1)
    d3d.SetRenderState(D3DRS_ZFUNC, D3DCMP_ALWAYS);
    if (this.precipRT) {
      d3d.SetTexture(0, this.dropTex);
      d3d.SetTexture(1, this.precipRT);
      d3d.setStage1Op(2);                                 // FUN_004019a0(2) MODULATE
      d3d.setAddressMode(1, 0);                           // FUN_0040191b(1, 0) CLAMP
      setAlpha(1.0);
      draw(); draw();                                     // the loop really runs twice
    }
    setAlpha(K.DROP_PASSB);
    d3d.SetTexture(0, this.dropTex);
    d3d.SetTexture(1, null);
    d3d.setStage1Op(0);                                   // FUN_004019a0(0) DISABLE
    d3d.setBlendMode(2);                                  // FUN_004019e6(2) alpha blend
    draw();
    d3d.SetRenderState(D3DRS_ZFUNC, D3DCMP_LESSEQUAL);
    d3d.setAddressMode(1, 1);
  }

  // -------------------------------------------------------------------------
  // FUN_00408eef — the render.
  // -------------------------------------------------------------------------
  render(layer, ctx) {
    if (!this.built || !this.visible) return;
    const d3d = this.d3d, desc = this.desc;
    this.position = ctx.position;
    this.#tickClock(ctx.songMs);
    this.#advance();

    // ---- camera (FUN_004058a6 + FUN_00405b5d)
    // Verification aid (inert unless set): force this frame's camera time, so
    // the path parameter can be swept against the reference without touching
    // the accumulator that produced it.  See re/FIXLOOP_LOG.md #5.
    if (globalThis.__camTimeOverride !== undefined) {
      this.camTimes[this.activeCam] = F(globalThis.__camTimeOverride);
    }
    const cam = this.cameras[this.activeCam] || this.cameras[0];
    cam.fovDeg = K.DEFAULT_FOV;
    cam.far = desc.fogEnd;                        // camera+0xc4 == fog end
    const ev = cam.evaluate(this.camTimes[this.activeCam] || 0);
    // NOTE: FUN_00408eef also clamps the camera's Y to the terrain height, but it
    // writes camera+0x118 AFTER FUN_004058a6 has already copied it to +0x88, and
    // +0x114..0x11c is rewritten by the spline every frame — so the clamp is a
    // no-op in the original and is deliberately not reproduced here.
    const view = cam.viewMatrix(ev.position, ev.target, ev.roll);
    const proj = cam.projectionMatrix();

    // ---- fog: the scene's clear colour doubles as the fog colour.
    // Two ramps overwrite desc+0x22 in place; both were disassembled because
    // Ghidra drops the whole x87 chain.  Constants read from the image.
    let fogColour = this.fogColour >>> 0;
    // DAT_00474790 = desc+0x22.  It is BOTH the fog colour and the device clear
    // colour, which is what makes geometry fade into the sky.
    const clearArgb = (0xff000000 | (fogColour & 0xffffff)) >>> 0;
    d3d.clearColor = clearArgb;

    // FUN_00408eef: `if ((flags & 0x200) == 0) FUN_00402c72(0)` — scenes WITHOUT a
    // cloud layer paint the sky by clearing the colour buffer to the fog colour.
    // The two cloud-layer scenes (5 and 8) get their sky from the cloud geometry
    // instead and only clear later.
    if (!desc.flag.cloudLayer) d3d.endRenderTarget(false);

    d3d.setFog(1, fogColour, f32bits(desc.fogStart), f32bits(desc.fogEnd));

    // FUN_00408eef calls FUN_0040f27e HERE — after the fog colour, the
    // conditional clear and SetFog, and before the camera's transforms go down
    // (the composite pushes identity ones of its own).  Its tail restores the
    // backbuffer AND clears it, which is what paints a cloud scene's frame.
    if (desc.flag.cloudLayer) this.#compositeCloud(d3d);

    d3d.SetTransform(D3DTS_PROJECTION, proj);
    d3d.SetTransform(D3DTS_VIEW, view);

    // ---- the LENS FLARE'S OCCLUSION MARKER hook.
    //
    // ⚠ CURRENTLY INERT AND DELIBERATELY SO. `flare.js` does not define
    // `__flareMarker` — the probe/draw split was REVERTED on 2026-08-11 after
    // Jasper reported the sun had disappeared from the forest in a real
    // browser. The split is structurally right (see below) but it changes the
    // occlusion query from "always visible" to a real test, and in LIVE
    // playback — where every frame queries, unlike the capture path — the
    // flare's integrator then decayed to zero instead of pulsing. It needs
    // verifying in the user's browser before it can land, not just in a sweep
    // whose numbers it barely moved (worst 81.07 -> 80.36).
    //
    // The hook stays because the analysis is worth keeping.  `FUN_00405f8b` visits the flare object TWICE per frame
    // on different masks (0x405FA9 `test al,0x4`):
    //
    //   pass 2  mask 4,    param_3 = 0  -> FUN_0040520d -> FUN_00402788   EARLY
    //   pass 4  mask 0xc,  param_3 = 1  -> FUN_004050ed -> FUN_00402907   LATE
    //
    // So the marker goes down early and the 4x4 read-back happens after the
    // scene has painted over it — that gap is the entire occlusion test.  Doing
    // both at frame end (which this port used to) draws the marker on top of the
    // finished frame and reads it straight back, so it always scores fully
    // visible and the sun blazes through foreground geometry.
    //
    // ⚠ THE HOOK IS NOT HERE. It used to be, and that is exactly why the split
    // was reverted — see the real call site further down, just after the
    // pre-main-pass clear. Left as a signpost because this is the intuitive
    // place to put it and it is wrong.

    // ---- lighting (FUN_00406004: ambient 0x1f1f1f1f + one point light at the sun)
    if (this.lightEnabled) {
      d3d.SetLight(0, this.light);
      d3d.LightEnable(0, true);
      d3d.setLighting(1, this.ambient >>> 0);
    } else {
      d3d.setLighting(0, 0xffffffff);
    }

    // ---- water reflection pass (FUN_00408dfc + the clip planes).
    // `waterLevel > 0` is FUN_00408eef's own gate (VA 0x4094c0); with the bit-17
    // step in #advance the gate is FALSE before 0x820, so scene 1's first vista
    // has no water, no reflection and no clipping at all.  Disassembled at
    // VA 0x4094c0-0x409572: mirror about y = waterLevel (FUN_00408dd1:
    // pos.y' = 2*wl - pos.y, scale.y' = -scale.y), plane1 (0,-1,0, wl*1.1) =
    // "keep y <= 1.1*wl" for the mirrored pass, then after the un-mirror plane2
    // (0,+1,0,-wl) = "keep y >= wl" is set and CLIPPLANEENABLE is LEFT ON for
    // everything up to the water surface (cleared at VA 0x409885).  The main and
    // overlay passes therefore never paint below the waterline, and the mirrored
    // scene painted first shows through in the hollows — the reference's
    // near-white lakes are that reflection.
    const hasWaterNow = this.waterMesh && desc.waterLevel > 0;
    // Debug-only pass ablation for the water composite (verification aid, in
    // kind with ?flare=0/?skip=): set `globalThis.__waterDbg` to a string
    // containing 'noreflect' | 'noclip' | 'nosurface' from a harness.  Unset =
    // faithful path, zero cost.
    const WD = String(globalThis.__waterDbg || '');
    if (hasWaterNow) {
      if (!WD.includes('noreflect')) {
        this.#mirror();
        d3d.SetClipPlane(0, [0, -1, 0, F(desc.waterLevel * K.WATER_CLIP)]);
        d3d.SetRenderState(D3DRS_CLIPPLANEENABLE, 1);
        this.#drawAll(d3d, true);
        d3d.SetRenderState(D3DRS_CLIPPLANEENABLE, 0);
        this.#mirror();
      }
      if (!WD.includes('noclip')) {
        d3d.SetClipPlane(0, [0, 1, 0, F(-desc.waterLevel)]);
        d3d.SetRenderState(D3DRS_CLIPPLANEENABLE, 1);
      }
    }

    // ---- the 64x64 REFRACTION SOURCE for the lens droplets.
    // FUN_00408eef, VA 0x409?? (sonnet.c:7781-7797), between the water
    // reflection and the main pass:
    //
    //   saved = DAT_00474790
    //   if ((flags & 0x40) && (flags & 0x80)) {
    //       if (flags & 0x200) cloudMesh.flags |= 2      ; hide the sky
    //       DAT_00474790 = 0                             ; clear to BLACK
    //       flare->+0xe5 = 0 ;  flare->+0xac = 0         ; flare suppressed
    //       FUN_00402b4f(Landscape+0x30)                 ; push the 64x64 RT
    //       FUN_00406004(scene, dt)                      ; the WHOLE scene again
    //       flare->+0xac = 1 ;  flare->+0xe5 = 1
    //       if (flags & 0x200) cloudMesh.flags &= ~2
    //   }
    //   DAT_00474790 = saved
    //
    // Only object 8 has both bits.  The flare is another agent's object and
    // attaches from outside, so it is simply not drawn into this target — which
    // is what the original wants anyway.
    if (this.precipRT) {
      const skyWasHidden = this.cloudSky ? this.cloudSky.hidden : false;
      if (desc.flag.cloudLayer && this.cloudSky) this.cloudSky.hidden = true;
      const savedClear = d3d.clearColor;
      d3d.clearColor = 0x00000000;
      d3d.beginRenderTarget(this.precipRT, true);
      this.#drawAll(d3d, false);
      d3d.clearColor = savedClear;
      d3d.endRenderTarget(false);
      if (desc.flag.cloudLayer && this.cloudSky) this.cloudSky.hidden = skyWasHidden;
      // beginRenderTarget/endRenderTarget resets the viewport but not the
      // transforms the shim already has; re-push them so the main pass is not
      // left with the render target's state.
      d3d.SetTransform(D3DTS_PROJECTION, proj);
      d3d.SetTransform(D3DTS_VIEW, view);
    }

    // FUN_00408eef, just before the main pass: with water, clear ONLY Z so the
    // reflection survives; without water, clear colour+Z to the fog colour.
    if (hasWaterNow) d3d.Clear(0, null, 2, clearArgb, 1.0, 0);
    else d3d.endRenderTarget(false);

    // ---- THE LENS FLARE'S OCCLUSION MARKER — `FUN_00405f8b` pass 2.
    //
    // THIS LINE'S POSITION IS THE WHOLE FEATURE, so: it must come AFTER the
    // clear above and BEFORE any main-pass geometry. The gap between here and
    // the read-back in flare.js's render wrapper IS the occlusion test.
    //
    // ⚠ IT WAS ONCE PLACED ~70 LINES EARLIER, right after the camera transforms,
    // which reads as the natural "before any geometry" spot. It is not: three
    // things run between there and here — the water-reflection pass, the 64x64
    // precipitation render target, and the clear above — and the clear wipes the
    // colour buffer to the fog colour in every scene without water. The marker
    // was therefore destroyed before it could be read, the query answered
    // "totally occluded" on every frame of every scene, and the integrator drove
    // every sun to zero. That shipped as *"the sun is gone from the forest
    // scene"* on 2026-08-11 and got the whole split reverted as unsound.
    //
    // The split was never the problem. `flare_live.mjs` reproduces the old
    // failure exactly (`--tag=split`: all six segments PINNED SHUT, including
    // the open-sky controls) — and it is the open-sky controls that identify it,
    // because nothing occludes the sun in those scenes, so a marker that reads
    // as covered there cannot have been covered by geometry.
    if (this.__flareMarker) this.__flareMarker(view, proj);

    // ---- the bit-24 TERRAIN CROSS-FADE, VA 0x409783-0x4097c3 (the alpha and the
    // skip) and 0x40980e-0x409845 (the extra pass).  Ghidra prints the alpha as a
    // bare `FUN_00404224()` with no argument — it drops the whole x87 chain, the
    // exact failure mode this port has hit ten times.  ndisasm:
    //
    //     test [eax+0x4f],ebp               ; ebp = 0x1000000, terrainOpt24
    //     fld1 ; fsub [esi+0x140]           ; 1.0 - ramp
    //     fmul [0x418268]                   ; * 255.0
    //     fcom [0x4170c8] ; jnc keep ; fstp st0 ; fldz     ; clamp at 0 below
    //     lea edi,[esi+0x8c] ; call ftol
    //     mov ecx,[edi] ; mov [ecx+0x14],al ; overlay material's alpha byte
    //     cmp byte [eax+0x14],0xff ; jz -> SKIP FUN_00406004   ; the MAIN pass
    //   ... then after the main pass:
    //     test [eax+0x4f],ebp
    //     mov ecx,[esi+0x8c] ; cmp byte [ecx+0x14],0 ; jz skip
    //     save terrain->[0xc4] ; terrain->[0xc4] = overlay ; terrain->Render(0.0)
    //     restore terrain->[0xc4]
    //
    // `scene+0x8c` is Landscape+0x40, the material FUN_0040e058 builds under the
    // same flag — so the terrain cross-fades from texgen program 17 to its baked
    // ground texture over exactly the ramp that raises it out of the water.  At
    // ramp 0 the overlay is fully opaque and the scene graph is not drawn at all;
    // at ramp 1 the overlay pass is skipped.  ONE ramp, BOTH of the reported
    // symptoms ("the landscape isn't animating nor is the texture changing").
    let overlayAlpha = -1;
    if (this.terrainOverlay) {
      let a = F(F(1 - this.t140) * 255.0);            // [0x418268] = 255.0
      if (a < 0) a = 0;                               // [0x4170c8] = 0.0
      overlayAlpha = ftol(a) & 0xff;                  // stored as a BYTE
      this.terrainOverlay.alphaRef = overlayAlpha;
    }

    // ---- the main pass
    if (overlayAlpha !== 0xff) this.#drawAll(d3d, false);

    // FUN_00406004's CLOSING BRACKET.  The main pass is `call 0x406004` at VA
    // 0x4097cf, and that function owns its own lighting:
    //
    //   if (root[0x14] != -1) FUN_00401b86(1, root[0x14]);  ; on  + scene ambient
    //   FUN_00405f8b(root, 2,   t, 0);                      ; the LIT passes
    //   FUN_00405f8b(root, 0xc, t, 1);
    //   if (root[0x14] != -1) FUN_00401b86(0, 0xffffffff);  ; OFF + white
    //   FUN_00405f8b(root, 2, 0.0, 0);                      ; trailing, unlit
    //   FUN_00405f8b(root, 4,   t, 2);
    //
    // so it RETURNS with lighting disabled, and everything after it in
    // FUN_00408eef — the overlay, the glitter, the water surface, the curtains,
    // the precipitation and the ribbon tail — inherits "off".  `#drawAll`
    // collapses the four masked passes into one traversal, so the bracket has to
    // be closed here instead.  Without it the tail draws inherited "on", and the
    // ribbons are the material that shows it: their flags (0x11) carry no
    // 0x1000, so they never switch lighting off themselves, and under the scene's
    // single point light (attenuation1 = 1e-4, i.e. att = 1e4/d ≈ 7..33 at these
    // distances) every strip saturated to white — a measured peak of +146 where
    // the strip's own 0x6f6f6f diffuse caps it at +98.  Two draws downstream had
    // already been hand-wrapped in a local save/restore for exactly this reason
    // (the snow and overlay passes below); those wrappers now simply save and
    // restore "off".
    if (!globalThis.__noLightBracket) d3d.setLighting(0, 0xffffffff);

    // ---- THE SNOW-ACCUMULATION PASS.  FUN_00408eef @ LAB_004097d4, i.e.
    // immediately after the main scene pass and BEFORE the cross-fade overlay
    // below — that is the original's order:
    //
    //   uVar7 = desc[0x4f];
    //   if ((uVar7 & 0x40) && (uVar7 & 0x80000)) {     ; buildPrecip && precipOpt
    //     save   = terrainMesh[0xc4];                  ; its material slot
    //     terrainMesh[0xc4] = precip+0x54;             ; the accumulation material
    //     terrainMesh->vtbl[1](0);                     ; draw the terrain AGAIN
    //     terrainMesh[0xc4] = save;
    //   }
    //
    // So the whitening is a second pass over the very same terrain mesh,
    // alpha-blended (material flags 0x50: blend mode 2, cull off, no alpha
    // test) with the map the landing flakes paint into.  Lighting is off here
    // for the same reason the overlay pass is: FUN_00406004 returns with it
    // disabled and nothing in between turns it back on.
    if (this.snowMat && desc.flag.buildPrecip && desc.flag.precipOpt) {
      if (this.snowDirty) {
        d3d.updateTexture(this.snowTex, this.snowMap);
        this.snowDirty = false;
      }
      const savedMat = this.terrainMesh.material;
      const savedLighting = d3d.getLightingFlag();
      const savedAmbient = d3d.setLighting(0, 0xffffffff);
      this.terrainMesh.material = this.snowMat;
      drawMesh(d3d, this.terrainMesh);
      this.terrainMesh.material = savedMat;
      d3d.setLighting(savedLighting, savedAmbient);
    }

    // ---- the overlay pass, between the main pass and the water surface.
    //
    // UNLIT, and that is not a guess.  FUN_00406004 brackets its own lighting —
    //   FUN_00401b86(1, root+0x14) ; passes 2 and 0xc ; FUN_00401b86(0, 0xffffffff)
    // — so it RETURNS with lighting disabled and ambient white, and nothing
    // between that call (VA 0x4097c5) and the overlay pass (VA 0x40980e) turns it
    // back on.  The overlay material's own flags (0xc018) carry no 0x1000, so it
    // does not switch lighting off itself; it simply inherits "off".  Drawing it
    // lit instead leaves the plain near-black under the point light, which then
    // makes the ADDITIVE water plane on top read as saturated teal rather than
    // washing the sand out — the reference is uniform pale sand here.
    if (overlayAlpha > 0) {
      const savedMat = this.terrainMesh.material;
      const savedLighting = d3d.getLightingFlag();
      const savedAmbient = d3d.setLighting(0, 0xffffffff);
      this.terrainMesh.material = this.terrainOverlay;
      drawMesh(d3d, this.terrainMesh);
      this.terrainMesh.material = savedMat;
      d3d.setLighting(savedLighting, savedAmbient);
    }

    // ---- WATER GLITTER, drawn between the terrain and the water surface, on
    // the original's own gates (0x409884): `waterLevel > 0` AND `desc[0x4f] & 1`.
    //
    // `FUN_00404dbb` (the sprite class's vtbl[1]) builds each quad in VIEW
    // SPACE: transform `base*scale + objPos` by the view matrix, add the
    // record's own offset AFTER that transform, then emit four corners at
    // +-size on x/y with z untouched.  Object scale is (1,1,1) and position
    // (0,0,0) — `FUN_00404b2d` writes `fld1` x3 into +0x94 — so the transform
    // reduces to `view * base + off`.
    //
    // Draw THEN update, which is the original's order (0x409890 draws, the
    // loop at 0x4098f8 updates for the next frame).
    if (this.glitter && desc.waterLevel > 0) {
      const g = this.glitter, S = MG.VERTEX_FLOATS;
      // ⚠ EVALUATED HERE, NOT INTEGRATED.  The original updates size/alpha at
      // the END of its draw (0x4098f8), so the drawn frame uses the PREVIOUS
      // frame's values — but both are a pure function of `t13c` and the record's
      // own phase, with no accumulated state.  Computing them from
      // `t13cPrev` reproduces the same one-frame lag AND survives `warmTo`,
      // which steps every object without ever rendering: an update living
      // inside the draw would never run during a warm-up, so every captured
      // frame drew the build-time size of 2.0 (one pixel) and the glitter was
      // invisible in the sweep.
      MG.stepWaterGlitter(g, this.t13cPrev || 0);
      const n = g.length;
      if (!this._glitterVB || this._glitterVB.length < n * 4 * S) {
        this._glitterVB = new Float32Array(n * 4 * S);
        this._glitterU = new Uint32Array(this._glitterVB.buffer);
        this._glitterIB = new Uint16Array(n * 6);
        for (let i = 0; i < n; i++) {
          const b = i * 4;
          // QUAD_CW 0,1,2 2,3,0 over the corner order the draw emits.
          this._glitterIB.set([b, b + 1, b + 2, b + 2, b + 3, b], i * 6);
          // UVs, written ONCE at allocation exactly as the flare's sprite does.
          // `FUN_00404dbb` never touches them per frame — they belong to the
          // buffer, not the record. Leaving them zero makes every vertex sample
          // texel (0,0) of the flare texture, which is transparent, so 128
          // additive quads contributed EXACTLY NOTHING and the glitter was
          // invisible while measurably drawing.
          const UV = [[0, 0], [1, 0], [1, 1], [0, 1]];
          for (let k = 0; k < 4; k++) {
            const q = (b + k) * S;
            this._glitterVB[q + 7] = UV[k][0];
            this._glitterVB[q + 8] = UV[k][1];
          }
        }
      }
      const V = this._glitterVB, U = this._glitterU;
      for (let i = 0; i < n; i++) {
        const r = g[i], p = r.base, o = r.off;
        // view * base  (row-vector convention, as everywhere else in the port)
        const cx = F(F(p[0] * view[0]) + F(F(p[1] * view[4]) + F(F(p[2] * view[8]) + view[12])));
        const cy = F(F(p[0] * view[1]) + F(F(p[1] * view[5]) + F(F(p[2] * view[9]) + view[13])));
        const cz = F(F(p[0] * view[2]) + F(F(p[1] * view[6]) + F(F(p[2] * view[10]) + view[14])));
        const ex = F(cx + o[0]), ey = F(cy + o[1]), ez = F(cz + o[2]);
        const s = r.size, col = r.colour;
        const C = [[-s, -s], [s, -s], [s, s], [-s, s]];
        for (let k = 0; k < 4; k++) {
          const q = (i * 4 + k) * S;
          V[q] = F(ex + C[k][0]); V[q + 1] = F(ey + C[k][1]); V[q + 2] = ez;
          U[q + MG.V_COL] = col;
        }
      }
      const I = new D3DMatrix();
      d3d.SetTransform(D3DTS_VIEW, I);
      d3d.SetTransform(D3DTS_WORLD, I);
      d3d.applyMaterial(this.glitterMat);
      d3d.DrawIndexedPrimitiveUP(D3DPT_TRIANGLELIST, 0, n * 4, n * 2,
        this._glitterIB, 0x65, V, FVF_SONNET_STRIDE);
      d3d.unapplyMaterial(this.glitterMat);
      d3d.SetTransform(D3DTS_VIEW, view);
    }

    // ---- water surface last (the original draws it after everything else).
    // VA 0x409885: CLIPPLANEENABLE finally goes off here — the water sheet is
    // the first thing since the reflection allowed to draw below the waterline.
    if (hasWaterNow) {
      d3d.SetRenderState(D3DRS_CLIPPLANEENABLE, 0);
      this.waterMesh.pos[1] = desc.waterLevel;
      if (!String(globalThis.__waterDbg || '').includes('nosurface')) {
        drawMesh(d3d, this.waterMesh);
      }
    }

    // ---- THE GRASS CURTAIN, drawn HERE and only here.  FUN_00408eef,
    // sonnet.c:7913-7916:
    //
    //     if (desc[0x4f] & 4) {          ; buildB — the same flag that built it
    //       piVar3->vtbl[1](0);          ; the water plane, immediately above
    //       arrayB[0].mesh->vtbl[1](0);  ; the curtain
    //     }
    //
    // The original never registers it as a scene child (no scene_addChild
    // anywhere in FUN_0040c1b2), so this tail call is its ONLY draw — which
    // puts it after the whole layer-masked pass and therefore after the birds.
    // That is why the video shows birds BEHIND the grass even though the
    // grass writes no depth: it simply paints over them.
    if (desc.flag.buildB && this.curtains.length) {
      for (const m of this.curtains) drawMesh(d3d, m);
    }

    // ---- precipitation.  FUN_0040d5c6 both integrates and emits, using the
    // camera's inverted matrix as the quad basis and the camera's XZ as the
    // respawn centre — so it has to run here, after the camera is evaluated.
    if (this.precip) {
      const right = [view[0], view[4], view[8]];
      const up = [view[1], view[5], view[9]];
      this.#stepPrecip(F(this.dt * K.TIME_RATE), ev.position, right, up, true, ev.target);
      const m = this.precip.mesh;
      m.pos = [0, 0, 0]; m.scale = [1, 1, 1];
      drawMesh(d3d, m);
      // FUN_00408eef's tail: `if ((flags & 0x40) && (flags & 0x80) &&
      // position > 0x1aff) FUN_0040de4e(precip)` — the same 0x1b00 gate the
      // rain itself uses.
      if (desc.flag.precipRenderTarget && this.position > 0x1aff) {
        this.#drawDroplets(d3d);
        d3d.SetTransform(D3DTS_PROJECTION, proj);
        d3d.SetTransform(D3DTS_VIEW, view);
      }
    }

    // ---- the ribbons, last (VA at the tail of FUN_00408eef: the hi-res-water
    // branch clears each strip's HIDDEN bit and renders it explicitly).
    // `__noRibbons` is an inert diagnostic knob (like `__waterDbg`): it skips
    // ONLY the rasterisation, after every update has run, so a diff against a
    // normal frame isolates the strips' screen footprint without perturbing the
    // shared RNG stream or any integrator.
    if (!globalThis.__noRibbons) for (const r of this.ribbons) drawMesh(d3d, r.mesh || r);

    d3d.setLighting(0, 0xffffffff);
    d3d.setFog(0, 0xffffffff, 0, f32bits(1.0));
  }

  #drawAll(d3d, reflected) {
    for (const m of this.meshes) drawMesh(d3d, m);
  }

  /** FUN_00408dfc / FUN_00408dd1 — reflect every drawable about the water plane. */
  #mirror() {
    const wl = this.desc.waterLevel;
    for (const m of this.meshes) {
      m.scale[1] = -m.scale[1];
      m.pos[1] = F(wl - m.pos[1]) * 2 + m.pos[1];
    }
  }
}

// ---------------------------------------------------------------------------
export function buildScene7(d3d, opts = {}) {
  return new Landscape(d3d, 4, { objIndex: 7, ...opts });
}

export default buildScene7;
