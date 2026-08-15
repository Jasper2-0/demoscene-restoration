// eff_d.js — scene D, music pos [0xa00, 0xc00)  ("we lost our explosive")
//
// Ported one-for-one from work/re/out/lv.c (image base 0x400000):
//
//   generator  FUN_0040bd10  (+ FUN_0040b630 for the logo texture)
//   init       FUN_0040bf50
//   per frame  FUN_0040bf80  (+ FUN_0040b780, the vertex displacer)
//
// WHAT IT IS
// ----------
// The geodesic sphere (FUN_004031b0(0xe, 100, 1, 0) -> 1962 verts / 3920 faces)
// with every vertex pulled in towards the origin by a field of FOUR moving
// metaball-ish blobs evaluated over the vertex's (x,z) plane coordinates.
// Where no blob is near, the vertex collapses onto the origin; where a blob
// passes, a spike shoots out — the "white crystal starburst explosion" of the
// reference capture (~56-63 s).  It is drawn ADDITIVELY (SRCBLEND=DESTBLEND=ONE)
// with a 2-stage combiner: stage 0 = the 64x64 DR-decoded env map, stage 1 =
// a procedurally generated 256x256 radial glow modulated on top, uv from
// FUN_004022a0 spherical environment mapping (uvScale 3, texcoord set 1).
//
// REMASTER (K.tess; ?quality=original pins it to 1): the sphere comes out of
// the same generator with `tess` times the subdivisions (14 -> 56 at tess 4),
// which is what the deformation and the sphere-map uv are sampled on. The
// billboards below stay on the original 1962-vertex set.
//
// A billboard is then parked on every one of the 1962 vertices (the same glow
// texture, ZFUNC=ALWAYS, additive) so the spikes sparkle, and the yellow
// "design" polygon fan + right-aligned text + the 72x94 1-bit DR logo are
// composited on top, all sliding in as _DAT_005101bc ramps 0 -> 1.
//
// NOTE ON EFFECTS_OVERVIEW.md: the table there attributes the geodesic sphere
// and the billboard system to scene E.  That is wrong — FUN_0040bd10 (scene D's
// generator) is what calls FUN_004031b0 and FUN_00402990.  Scene E is the 2D
// moire-ring effect.
//
// NOTE ON THE SCENE-D/E OVERLAP: FUN_0040f285's `pos < 0xc00` block calls
// FUN_0040bf80 AND, once pos >= 0xb38, FUN_00409da6(0) on top of it, while the
// fade _DAT_005101bc is pinned to 0 below 0xb38.  The registry gives one module
// per pos range, so the variant-0 half of FUN_00409da6 is duplicated at the
// bottom of this file (per the brief: duplicate, do not couple).

import {
  createGeoSphere, createParticles, createCamera, setMeshRotation,
} from '../kernel.js';
import {
  D3DRS_ZWRITEENABLE, D3DRS_ZFUNC, D3DRS_SRCBLEND, D3DRS_DESTBLEND,
  D3DBLEND_ONE, D3DBLEND_SRCALPHA, D3DBLEND_INVSRCALPHA,
  D3DCMP_ALWAYS, D3DCMP_LESSEQUAL,
  D3DPT_TRIANGLELIST, FVF_XYZRHW_DIFFUSE_TEX2, makeVertexScratch, D3DTEX_MIPMAP,
} from '../minid3d7.js';

// --- .rdata constants, read out of 3s-vegas-u.exe -------------------------
const C_TIME_SCALE   = 1 / 2400;      // 0x412770 (double)   ms -> "units"
const C_WOBBLE_RATE  = 1 / 600;       // 0x412768
const C_WOBBLE_AMP   = 0.01;          // 0x412760
const C_BLOB_STEP    = 0.02;          // 0x4123e8
const C_SPIN_RATE    = 0.0003125;     // 0x412698
const C_COUNT_SCALE  = 20.0;          // 0x4124f0 (float)
const C_FOV_RANGE    = 58.0;          // 0x412758 (float)
const C_FOV_BASE     = 120.0;         // 0x4124b8 (float)
const C_ROLL_RATE    = 0.673;         // 0x4125a0 (double)
const C_EYE_X_RATE   = 0.45839;       // 0x412750 (double)
const C_EYE_RADIUS   = 70.0;          // 0x412748 (float)
const C_EYE_Z_RATE   = 0.23457;       // 0x412740 (double)
const C_SLIDE_RANGE  = 150.0;         // 0x412580 (float)
const C_SLIDE_BASE   = 20.0;          // 0x4124f0 (float)
const C_FADE_MS      = 600.0;         // 0x412838 (double), FUN_0040f285

// FUN_0040b780's four blob centres, as (a*S + b) pairs   [0x412700..0x412728]
const BLOB = [
  [50.6, 100.0, 30.0, 0.0],     // (S*50.6 + 100,   S*30)
  [50.4, 0.0, 46.0, -80.0],     // (S*50.4,         S*46 - 80)
  [-67.3, 0.0, -63.0, 300.0],   // (-S*67.3,        300 - S*63)
  [-45.7, 677.0, 48.6, 0.0],    // (677 - S*45.7,   S*48.6)
];
const C_UV_SCALE  = 255.0;              // 0x412558 (double)
const C_HALF      = 0.5;                // 0x4120a8 (double)
const C_WRAP_BIAS = 64.0;               // 0x4126c8 (float)
const C_FALLOFF   = (1 / 182) * 512;    // 0x4126c0 * 0x4126b8
const C_AMP       = (1 / 255) * 0.2;    // 0x4126b0 * 0x4124c0
const C_W04 = 0.4;                      // 0x412568 (double)
const C_W09 = 0.9;                      // 0x4126a8 (double)
const C_W16 = 1.6;                      // 0x4126a0 (double)

const DESIGN_YELLOW = 0xffd7b45a;
const SKY_BLUE      = 0xff7dafc8;       // DAT_004b4f64, set by FUN_0040f285

// FUN_0040bf80's design fan — 7 vertices, 5 triangles fanned off v6.
const FAN_XY = [
  [633, 314], [542, 314], [516, 340], [54, 340], [28, 366], [28, 418], [633, 418],
];
const FAN_TRIS = [[0, 1, 6], [1, 2, 6], [2, 3, 6], [3, 4, 6], [4, 5, 6]];

// FUN_0040b630: a 72x94 1-bit mask blitted into a 256x256 ARGB texture
// (9 bytes per row, MSB first) — DAT_00420ff8 .. 0x421346.
const LOGO_BITS_B64 =
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAADgAAAAAAAAAYSAAA' +
  'AAAAAAAMwAAAAAAAAAAAzgAAAAAAAAAMwAAAAAAAAAAY2AAAAAAAAAABjAAAAAAAAAABhgAA' +
  'AAAAAAADAAAAAAAAAAAeAAAAAAAAAAD4AAAAAAAAAAOAAAAAAAAAAAcAAAAAAAAAAAYAAAAA' +
  'AAAAAAQAAAAAAAAAAE6AAAAAAAAAAP/AAAAAAAAAAP/AAAAAAAAAAP/AAAAAAAAAAP/AAAAA' +
  'AAAAAP/AAAAAAAAAAP/AAAAAAAAAA//gAAAAAAAAP//8AAAAAAAB////AAAAAAAH////wAAA' +
  'AAAf////8AAAAAA//////AAAAAB//////gAAAAH//////4AAAAP//////8AAAAf//////+AA' +
  'AA////////AAAB////////gAAD////////gAAD////////wAAH////////4AAP////////4A' +
  'AP////////8AAf////////8AAf////////+AA/////////+AA//////////AA//////////A' +
  'B//////////gB//////////gB//////////gD//////////gD//////////wD//////////w' +
  'D//////////wD//////////wD//////////wD//////////wD//////////wD//////////w' +
  'D//////////wD//////////wD//////////wD//////////gD//////////gB//////////g' +
  'B//////////gB//////////gA//////////AA//////////AA/////////+AAf////////+A' +
  'Af////////8AAP////////8AAP////////4AAH////////4AAD////////wAAD////////gA' +
  'AB////////gAAA////////AAAAf//////+AAAAP//////8AAAAH//////4AAAAB//////gAA' +
  'AAA//////AAAAAAP////8AAAAAAH////wAAAAAAA////AAAAAAAAP//4AAAAAAAAAf+AAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const LOGO_W = 72, LOGO_H = 94, LOGO_ROW_BYTES = 9;

// -------------------------------------------------------------------------
// Scene E (variant 0) constants — see eff_e.js for the full commentary.
// -------------------------------------------------------------------------
const E_PHASE_STEP_MS = 0x32;         // 50 ms lag per ring
const E_PHASE_SCALE   = 1 / 1200;     // 0x4125b0 (double)
const E_RING_STEP     = 45.0;         // 0x420fcc (float)
const E_FLASH_R0      = 150.0;        // 0x4124b0 (double)
const E_FLASH_RATE    = 0.1;          // 0x412570 (double)
const E_BRIGHT_MAX    = 31.0;         // 0x412644 (float)
const E_CX_RATE       = 1.447;        // 0x412638 (double)
const E_CX_AMP        = 80.0;         // 0x412630 (float)
const E_CX_BASE       = 320.0;        // 0x4123d8 (float)
const E_CY_RATE       = 1.115;        // 0x412628 (double)
const E_CY_AMP        = 60.0;         // 0x412500 (float)
const E_CY_BASE       = 240.0;        // 0x4123d4 (float)
const E_CORNER = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];  // 0x412620/508/618
const E_RING_R0       = 100.0;
const E_RINGS_ALLOC   = 32;           // buffers hold 32 rings ...
const E_RINGS_DRAWN   = 16;           // ... but the draw call only asks for 16
                                      // (nVtx = 0x40, nIdx = 0x60) — verbatim.

// -------------------------------------------------------------------------
// helpers
// -------------------------------------------------------------------------
const _fb = new ArrayBuffer(4);
const _fu = new Uint32Array(_fb), _ff = new Float32Array(_fb);
/** Reinterpret a 32-bit pattern as a float, so bit-exact .rdata immediates
 *  can be transcribed as they appear in the decompile. */
function f32(bits) { _fu[0] = bits >>> 0; return _ff[0]; }

/** x87 `fistp` with the default rounding mode (nearest, ties to even). */
function ftol(x) {
  const r = Math.round(x);
  // Math.round breaks ties upward; x87 breaks them to even.
  return (x - Math.floor(x) === 0.5 && (r & 1)) ? r - 1 : r;
}

/** The Borland-style 32-bit LCG at DAT_0041a2a4/DAT_0041a2a6 (FUN_0040bd10). */
function makeRand(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 0x015a4e35) + 1) >>> 0; return (s >>> 16) & 0x7fff; };
}
const RAND_SEED = 0xabf828c9;         // .data initial value
// The generators share one stream and run in a fixed order (FUN_0040f285):
// FUN_0040df90 burns 32*64*64 + 16*16 = 131328 draws, then FUN_004087c0
// (scene F) burns 4*2048 = 8192, and only then does FUN_0040bd10 run.
const RAND_SKIP_D = 131328 + 8192;

/** FUN_0040607f — a 256x256 radial falloff, squared and clamped.  Note it
 *  ignores its texture-struct argument entirely and is purely procedural. */
function radialGlowPixels() {
  const px = new Uint32Array(256 * 256);
  let p = 0;
  for (let y = -128; y < 128; y++) {
    for (let x = -128; x < 128; x++) {
      const d = Math.sqrt(x * x + y * y);
      let i = ftol((255.0 - (d + d)) * 1.0);     // param_2 = 1.0 at both sites
      if (i > 0) i = (i * i) >> 8;
      if (i < 0) i = 0;
      if (i > 0xff) i = 0xff;
      px[p++] = (0xff000000 | (i * 0x10101)) >>> 0;
    }
  }
  return px;
}

/** FUN_0040b630 — expand a 1-bit mask into the top-left of a 256x256 ARGB
 *  surface: set bit -> opaque white, clear bit -> transparent white. */
function maskPixels(b64, w, h, rowBytes, size) {
  const bin = atob(b64);
  const px = new Uint32Array(size * size);
  for (let i = 0; i < px.length; i++) px[i] = 0x00ffffff;
  for (let y = 0; y < h; y++) {
    for (let bx = 0; bx < rowBytes; bx++) {
      const byte = bin.charCodeAt(y * rowBytes + bx);
      for (let k = 0; k < 8; k++) {
        const x = bx * 8 + k;
        if (x >= w) break;
        px[y * size + x] = ((byte >> (7 - k)) & 1) ? 0xffffffff : 0x00ffffff;
      }
    }
  }
  return px;
}

// =========================================================================

export function makeScene(ctx, variant = 0) {
  const { K, d3d, textures } = ctx;

  let sphere, saved, parts, cam;
  let base, baseSaved;      // the untessellated vertex set the billboards ride
  let texEnv, texGlowA, texGlowB, texLogo;

  // FUN_0040bf80's clock/accumulator globals
  let t300 = 0;          // DAT_00510300, base for _DAT_00510270
  let t294 = 0;          // _DAT_00510294, the previous frame's timestamp
  let uTime = 0;         // _DAT_00510270
  let blobS = 0;         // _DAT_005102f4, the blob phase
  let spinX = 0;         // _DAT_005102cc  (NOT reset by FUN_0040bf50)
  let spinY = 0;         // _DAT_005102d0  (idem)
  let freeze = false;    // DAT_00510304
  let fade = 0;          // _DAT_005101bc
  let fadeT0 = 0;        // FUN_0040f285's local_10
  let entered = false;
  let lastPos = -1;

  // scene-E-in-scene-D state (FUN_00409d8d / FUN_00409da6(0))
  let eT0 = 0;           // _DAT_00510200
  let eFlash = false;    // DAT_005101b0
  let eFlashT0 = 0;      // _DAT_005101f8
  let ePhase, eVerts, eIdx;

  const tri = [
    [0, 0, 0.01, 100, DESIGN_YELLOW, 0, 0, 0, 0],
    [0, 0, 0.01, 100, DESIGN_YELLOW, 0, 0, 0, 0],
    [0, 0, 0.01, 100, DESIGN_YELLOW, 0, 0, 0, 0],
  ];

  function init() {
    // FUN_0040f285 sets the clear colour once, up front.
    d3d.clearColor = SKY_BLUE;

    // --- FUN_0040bd10 -----------------------------------------------------
    cam = createCamera(0, 0, 0, 0, 0, 0);

    texEnv = textures.dr_64_envmap;                       // DAT_005102d8
    // Both glow handles are the SAME image uploaded twice with different flags
    // (the original creates two surfaces); keep the two flag values.
    const hiGlow = textures && textures.proc_radial_k100;
    const glow = hiGlow ? null : radialGlowPixels();
    texGlowA = hiGlow                                     // DAT_00510278 (stage 1)
      ? d3d.createTextureFromImage(hiGlow, 8 | D3DTEX_MIPMAP)
      : K.createTexture(glow, 256, 256, 8);
    texGlowB = hiGlow                                     // DAT_00510298 (particles)
      ? d3d.createTextureFromImage(hiGlow, 0 | D3DTEX_MIPMAP)
      : K.createTexture(glow, 256, 256, 0);
    texLogo = textures && textures.proc_d_logo            // DAT_005102b0 (FUN_0040b630)
      ? d3d.createTextureFromImage(textures.proc_d_logo, 2 | D3DTEX_MIPMAP)
      : K.createTexture(
        maskPixels(LOGO_BITS_B64, LOGO_W, LOGO_H, LOGO_ROW_BYTES, 256), 256, 256, 2);

    // REMASTER (K.tess; ?quality=original pins it to 1): the same generator,
    // `tess` times more subdivisions. This is the one mesh in the demo that is
    // reshaped per-vertex every frame, so the blob spikes and the sphere-map uv
    // are only ever as smooth as the mesh is fine.
    // Cap 4: vertices = subdiv^2*20/2 + 2 and faces = subdiv^2*20, and
    // DrawIndexedPrimitive only issues gl.UNSIGNED_SHORT (createMesh also masks
    // nFaces to 16 bits), so subdiv 56 -> 31362/62720 is the last step that fits.
    const tess = Math.max(1, Math.min(4, Math.floor(K.tess || 1)));
    sphere = createGeoSphere(14 * tess, 100.0, 1.0, 0);   // 1962 / 3920 at tess 1
    saved = new Float32Array(sphere.verts);               // DAT_005102f0

    // The billboards are choreography, not tessellation: their count, their
    // sizes and their PRNG draws all stay at the original 1962. They ride the
    // ORIGINAL vertex set, which at tess > 1 is carried by this second,
    // untessellated copy — deformed by the same function, so every billboard
    // sits exactly where it does today. (At tess = 1 it *is* the drawn sphere,
    // so nothing extra is built or deformed.)
    base = tess > 1 ? createGeoSphere(14, 100.0, 1.0, 0) : sphere;
    baseSaved = tess > 1 ? new Float32Array(base.verts) : saved;

    const rnd = makeRand(RAND_SEED);
    for (let i = 0; i < RAND_SKIP_D; i++) rnd();
    parts = createParticles(base.nVerts);
    for (let i = 0; i < base.nVerts; i++) {
      parts.color[i] = 0xffffffff;
      const r = rnd() * (1 / 32768);
      parts.size[i] = r + r + 1.0;                        // 1 .. 3
    }

    // --- FUN_00409bb0's ring buffers (variant-0 slice) --------------------
    ePhase = new Float32Array(E_RINGS_ALLOC);
    eVerts = makeVertexScratch(FVF_XYZRHW_DIFFUSE_TEX2, E_RINGS_ALLOC * 4);
    eIdx = new Uint16Array(E_RINGS_ALLOC * 6);
    const Z = f32(0x3f7fff58), RHW = f32(0x3f800054);
    for (let i = 0; i < E_RINGS_ALLOC * 4; i++) {
      const b = eVerts.base(i);
      eVerts.f32[b + 2] = Z;
      eVerts.f32[b + 3] = RHW;
      eVerts.u32[eVerts.colorIndex(i)] = 0x1f1f1f1f;
      const c = i & 3;
      eVerts.f32[b + 5] = (c === 1 || c === 2) ? 1.0 : 0.0;
      eVerts.f32[b + 6] = (c === 2 || c === 3) ? 1.0 : 0.0;
    }
    for (let q = 0; q < E_RINGS_ALLOC; q++) {
      const b = q * 4, o = q * 6;
      eIdx[o] = b; eIdx[o + 1] = b + 1; eIdx[o + 2] = b + 2;
      eIdx[o + 3] = b + 2; eIdx[o + 4] = b + 3; eIdx[o + 5] = b;
    }
  }

  /** FUN_0040bf50 — the per-entry timer reset (+ FUN_00409d8d beside it). */
  function resetTimers(ms) {
    t300 = ms;
    blobS = 0;
    t294 = ms;
    fadeT0 = ms;
    fade = 0;
    eFlash = false;
    // eT0 (FUN_00409d8d's _DAT_00510200) deliberately stays 0 — see the note
    // in drawMoire().
  }

  // ---- FUN_0040b780 ------------------------------------------------------
  function wrap(t) {
    const n = ftol(t);
    return (t - n) + (n & 0x7f);
  }
  function blob(dx, dy) {
    const X = wrap(dx) - C_WRAP_BIAS;
    const Y = wrap(dy) - C_WRAP_BIAS;
    const d2 = Y * Y + X * X;
    // The original reads a sqrt LUT (FUN_00404aa0 / DAT_004b4f68); it is a
    // float-bit approximation of sqrt accurate to ~1e-5, so use the real one.
    const sq = d2 === 0 ? 0.0 : Math.sqrt(d2);
    let v = C_UV_SCALE - sq * C_FALLOFF;
    if (v < 0) v = 0;
    return v * C_AMP;
  }

  const bx = [0, 0, 0, 0], by = [0, 0, 0, 0];

  function deform() {
    const S = blobS;
    for (let k = 0; k < 4; k++) {
      bx[k] = S * BLOB[k][0] + BLOB[k][1];
      by[k] = S * BLOB[k][2] + BLOB[k][3];
    }
    displace(sphere.verts, saved, sphere.nVerts);
    // same field, evaluated on the original vertex set for the billboards
    if (base !== sphere) displace(base.verts, baseSaved, base.nVerts);
    K.meshEnvMapUV(sphere, cam, 3.0, 0);
  }

  /** The body of FUN_0040b780, verbatim, over one (verts, saved) pair. */
  function displace(V, saved, n) {
    // pass 1: (x, z) -> the saved copy's texcoord set 0, the blob domain
    for (let i = 0; i < n; i++) {
      const b = i * 8;
      saved[b + 4] = (saved[b] * C_BLOB_STEP + C_HALF) * C_HALF;
      saved[b + 5] = (saved[b + 2] * C_BLOB_STEP + C_HALF) * C_HALF;
    }

    for (let i = 0; i < n; i++) {
      const b = i * 8;
      const U = saved[b + 4] * C_UV_SCALE;
      const W = saved[b + 5] * C_UV_SCALE;

      const v0 = blob(bx[0] + U, by[0] + W);
      const v1 = blob(bx[1] + U, by[1] + W);
      const v2 = blob(bx[2] + U, by[2] + W);
      const v3 = blob(bx[3] + U, by[3] + W);

      let A = v0;
      let a1 = v0 * C_W09, a2 = v0 * C_W04, a3 = v0 * C_W04;
      A += v1; a1 += A * C_W04; a2 += A * C_W04; a3 += A * C_W16;
      A += v2; a1 += A * C_W16; a2 += A * C_W09; a3 += A * C_W09;
      A += v3;

      V[b]     = (a1 + A * C_W04) * saved[b]     * C_W04;
      V[b + 1] = (a2 + A * C_W16) * saved[b + 1] * C_W04;
      V[b + 2] = (a3 + A * C_W04) * saved[b + 2] * C_W04;
    }
  }

  // ---- FUN_00409da6(0), inlined for the 0xb38..0xc00 overlap -------------
  //
  // The original's _DAT_00510200 is set by FUN_00409d8d immediately before the
  // `pos < 0xc00` block and is NOT reset again before the `pos < 0xe00` block,
  // so the ring phases run continuously across the D -> E cut.  eff_e.js is a
  // separate module and cannot see that timestamp, so BOTH copies of the
  // variant-0 code keep eT0 = 0 (the demo clock).  That shifts the phase by a
  // constant relative to the original but keeps the two halves seamless, which
  // is what is actually visible.
  function drawMoire(ms, pos) {
    for (let i = 0; i < E_RINGS_ALLOC; i++) {
      ePhase[i] = (ms - i * E_PHASE_STEP_MS - eT0) * E_PHASE_SCALE;
    }
    const row = pos & 0x1f;
    if (row === 0x14 || row === 0x16 || row === 0x17) { eFlash = true; eFlashT0 = ms; }

    K.setTextureHandle(textures.dr_256_grid_panels, null);
    d3d.dispatchState(1, 0);
    d3d.dispatchState(3, 0);
    d3d.dispatchState(5, 1);
    d3d.SetRenderState(D3DRS_SRCBLEND, D3DBLEND_ONE);
    d3d.SetRenderState(D3DRS_DESTBLEND, D3DBLEND_ONE);

    let radius = E_RING_R0;
    let step = E_RING_STEP;
    if (eFlash) {
      step = E_FLASH_R0 - (ms - eFlashT0) * E_FLASH_RATE;
      if (step < E_RING_STEP) { eFlash = false; step = E_RING_STEP; }
    }
    let bright = ftol(fade * E_BRIGHT_MAX);
    if (eFlash) bright = ftol((ms - eFlashT0) * E_FLASH_RATE);
    if (bright > 0x1f) bright = 0x1f;
    const color = (bright * 0x1010101) >>> 0;

    const F = eVerts.f32, U32 = eVerts.u32;
    for (let i = 0; i < E_RINGS_ALLOC; i++) {
      const p = ePhase[i];
      const a = Math.sin(p);
      const cx = Math.sin(p * E_CX_RATE) * E_CX_AMP + E_CX_BASE;
      const cy = Math.cos(p * E_CY_RATE) * E_CY_AMP + E_CY_BASE;
      for (let c = 0; c < 4; c++) {
        const vi = i * 4 + c, b = eVerts.base(vi);
        F[b]     = Math.sin(a + E_CORNER[c]) * radius + cx;
        F[b + 1] = Math.cos(a + E_CORNER[c]) * radius + cy;
        U32[eVerts.colorIndex(vi)] = color;
      }
      radius += step;
    }
    d3d.DrawIndexedPrimitive(D3DPT_TRIANGLELIST, FVF_XYZRHW_DIFFUSE_TEX2,
      eVerts.bytes, E_RINGS_DRAWN * 4, eIdx, E_RINGS_DRAWN * 6, 0);
    d3d.dispatchState(5, 0);
  }

  // ---- FUN_0040bf80 ------------------------------------------------------
  function render(pos, extra) {
    const ms = (extra && extra.ms) || 0;
    if (!entered || pos < lastPos) resetTimers(ms);
    entered = true; lastPos = pos;

    // FUN_0040f285's fade ramp (held at 0 until the scene-E overlay starts)
    fade = (ms - fadeT0) / C_FADE_MS;
    if (fade < 0) fade = 0;
    if (fade > 1) fade = 1;
    if (pos < 0xb38) { fadeT0 = ms; fade = 0; }

    uTime = (ms - t300) * C_TIME_SCALE;
    if (!freeze) {
      blobS += Math.sin((ms - t294) * C_WOBBLE_RATE) * C_WOBBLE_AMP + C_BLOB_STEP;
    }
    spinX += (ms - t294) * C_SPIN_RATE;
    spinY += (ms - t294) * C_SPIN_RATE;
    t294 = ms;
    freeze = (ftol(uTime * C_COUNT_SCALE) & 0x7f) >= 0x60;

    d3d.dispatchState(1, 0);
    K.setTextureHandle(texEnv, texGlowA);       // FUN_0040406d(0x5102d8, 0x510278)
    d3d.dispatchState(1, 2);                    // stage 1 = MODULATE

    cam.fov = fade * C_FOV_RANGE + C_FOV_BASE;
    cam.roll = Math.sin(spinX * C_ROLL_RATE);
    cam.ax = 0; cam.ay = 0; cam.az = 0;
    cam.ex = Math.cos(spinX * C_EYE_X_RATE) * C_EYE_RADIUS;
    cam.ey = 0;
    cam.ez = Math.sin(spinX * C_EYE_Z_RATE) * C_EYE_RADIUS;
    K.setCamera(cam);

    setMeshRotation(sphere, spinX, spinY, 0.0);
    deform();

    // billboards ride the sphere's vertices (the untessellated set — see init)
    for (let i = 0; i < base.nVerts; i++) {
      parts.pos[i * 3]     = base.verts[i * 8];
      parts.pos[i * 3 + 1] = base.verts[i * 8 + 1];
      parts.pos[i * 3 + 2] = base.verts[i * 8 + 2];
    }

    d3d.SetRenderState(D3DRS_ZWRITEENABLE, 0);
    d3d.dispatchState(3, 0);                    // cull NONE
    d3d.dispatchState(5, 1);                    // alpha blend on
    d3d.SetRenderState(D3DRS_SRCBLEND, D3DBLEND_ONE);
    d3d.SetRenderState(D3DRS_DESTBLEND, D3DBLEND_ONE);
    K.drawMesh(sphere);

    parts.m.set(sphere.m);                      // 16 dwords, verbatim
    d3d.dispatchState(3, 0);
    d3d.SetRenderState(D3DRS_ZFUNC, D3DCMP_ALWAYS);
    d3d.SetRenderState(D3DRS_SRCBLEND, D3DBLEND_ONE);
    d3d.SetRenderState(D3DRS_DESTBLEND, D3DBLEND_ONE);
    d3d.dispatchState(1, 0);
    K.setTextureHandle(texGlowB, null);
    K.drawParticles(parts, cam);
    d3d.dispatchState(5, 0);
    K.setTextureHandle(null);

    // ---- 2D design layer ------------------------------------------------
    const slide = fade * C_SLIDE_RANGE + C_SLIDE_BASE;
    for (const t of FAN_TRIS) {
      for (let k = 0; k < 3; k++) {
        tri[k][0] = FAN_XY[t[k]][0];
        tri[k][1] = FAN_XY[t[k]][1] + slide;
      }
      K.drawTri2D(tri[0], tri[1], tri[2]);
    }

    K.drawTextRight('we lost our explosive', 540.0, slide + 355.0, 192.0, 0xff000000);
    K.drawTextRight('please return it',      540.0, slide + 375.0, 128.0, 0xff000000);
    K.drawTextRight('parnassiaveld ###',     540.0, slide + 400.0,  64.0, 0xff000000);
    K.drawTextRight('amsterdam',             540.0, slide + 405.0,  64.0, 0xff000000);

    K.setTextureHandle(texLogo, null);
    d3d.dispatchState(5, 1);
    d3d.SetRenderState(D3DRS_SRCBLEND, D3DBLEND_SRCALPHA);
    d3d.SetRenderState(D3DRS_DESTBLEND, D3DBLEND_INVSRCALPHA);
    const ly0 = slide + 320.0, ly1 = slide + 413.0;
    const U1 = 0.28125, V1 = 0.3671875;         // 72/256, 94/256
    K.drawQuad2D(
      [550.0, ly0, 0.01, 100.0, 0xffffffff, 0, 0, 0, 0],
      [621.0, ly0, 0.01, 100.0, 0xffffffff, U1, 0, U1, 0],
      [621.0, ly1, 0.01, 100.0, 0xffffffff, U1, V1, U1, V1],
      [550.0, ly1, 0.01, 100.0, 0xffffffff, 0, V1, 0, V1]);
    d3d.dispatchState(5, 0);
    d3d.SetRenderState(D3DRS_ZFUNC, D3DCMP_LESSEQUAL);
    d3d.SetRenderState(D3DRS_ZWRITEENABLE, 1);

    // ---- the scene-E overlay that shares this block ----------------------
    if (pos >= 0xb38) drawMoire(ms, pos);
  }

  /**
   * REGISTRY PROTOCOL: restore the state a real playthrough has when it FIRST
   * reaches this scene, so a cold render can start from a defined point.
   *
   * The distinction plan risk R2 warns about: this is NOT "call the original's
   * reset". FUN_0040bf50 deliberately leaves spinX/spinY alone (:214-215), so
   * clearing them models something the binary does not do — on a genuine REWIND
   * the camera keeps its accumulated spin. But at FIRST ENTRY they are zero,
   * because nothing has run yet, and first entry is what a cold render
   * reproduces. So zero them here and let render() fire the authentic
   * resetTimers() through its own entry path (:437) rather than duplicating
   * that logic where it could drift.
   *
   * spinX/spinY are recoverable in closed form regardless: `spinX += (ms - t294)`
   * with `t294 = ms` every frame (:450-452) telescopes to
   * (ms - msAtEntry) * C_SPIN_RATE, independent of how many steps got there.
   * blobS (:448) is the one that is not — nonlinear in dt plus a per-frame step
   * — so a cold render has to walk the frames for it.
   */
  function reset(ms) {
    spinX = 0; spinY = 0;
    entered = false; lastPos = -1;
    resetTimers(ms);
  }

  return { init, render, reset };
}
