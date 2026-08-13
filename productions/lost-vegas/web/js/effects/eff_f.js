// eff_f.js — scene F, music pos [0xe00, 0x1200)   "effect of the year"
//
// Ported one-for-one from work/re/out/lv.c (image base 0x400000):
//
//   generator  FUN_004087c0   (+ FUN_00408550 and FUN_004086b0, two procedural
//                               texture generators)
//   init       FUN_00408cc0
//   per frame  FUN_00408e90   (+ FUN_00408ce0, the tube/particle animator)
//
// WHAT IT IS
// ----------
// A 4000-unit-long chrome TUBE: 400 rings of 16 vertices (6400 verts / 12768
// faces), radius modulated along its length by sin(sin(u*0.773)*pi)*30 + 60 and
// twisted by sin(u)*2.5 radians per ring, environment-mapped through the 64x64
// DR chrome map with a 256x256 radial glow MODULATEd over it on stage 1, EXP
// fogged into the sky-blue background.  The index buffer alternates the quad
// winding every column, so with D3DCULL_CCW every second longitudinal strip is
// backface-culled — that is where the slotted/see-through look comes from, and
// it is verbatim from FUN_004087c0.
//
// REMASTER (K.tess; ?quality=original pins it to 1): the tube is rebuilt with
// `tess` times more RINGS through the same parametric formulas. The 16-segment
// cross-section is left alone on purpose — see tubeSize() for the measurement
// that says why.
//
// 2048 additive billboards ride the same helical field at a smaller radius
// (sin(sin*pi)*20 + 40), their alpha driven by |seed.z - camera.z| so they pop
// as the camera flies through them.
//
// The camera does a two-stage move: below music pos 0x1000 it wobbles around
// the tube mouth looking off to x = 350; at 0x1000 a 2000 ms ramp
// (_DAT_00510114) swings it onto a 150-radius orbit and pushes it from
// z = 1600 to z = 2000 down the tube.  The same ramp slides the whole yellow
// "design" layer in from the left.
//
// The design layer is: a hollow rectangular frame, a bar, a big yellow arrow
// (which oscillates +/-20 px), the 56x36 "3s#1" bitmap, the 24x316 vertical
// text strip, and three text lines.

import {
  createMesh, createParticles, createCamera,
} from '../kernel.js';
import {
  D3DRS_ZWRITEENABLE, D3DRS_ZFUNC, D3DRS_SRCBLEND, D3DRS_DESTBLEND,
  D3DBLEND_ONE, D3DBLEND_SRCALPHA, D3DBLEND_INVSRCALPHA,
  D3DCMP_ALWAYS, D3DCMP_LESSEQUAL,
  D3DTSS_MAGFILTER, D3DTSS_MINFILTER, D3DTFG_POINT, D3DTFG_LINEAR,
  D3DTFN_POINT, D3DTFN_LINEAR, D3DTEX_MIPMAP,
} from '../minid3d7.js';

// --- .rdata constants ----------------------------------------------------
const C_T_SCALE     = 1 / 1200;      // 0x4125b0 (double)
const C_DT_SCALE    = 0.001;         // 0x4123f0 (double)
const SKY_BLUE      = 0xff7dafc8;    // DAT_004b4f64 / DAT_0041a2a8
const FOG_DENSITY   = 0.003;         // DAT_0041a2ac = 0x3b449ba6

const C_FOV_RATE    = 0.8746353;     // 0x4125a8 (double)
const C_FOV_AMP     = 20.0;          // 0x4124f0 (float)
const C_FOV_BASE    = 120.0;         // 0x4124b8 (float)
const C_ROLL_RATE   = 0.673;         // 0x4125a0 (double)
const C_RAMP_RATE   = 0.0005;        // 0x412598 (double)
const C_EYE_A_RATE  = 1.38529;       // 0x412590 (double)
const C_ORBIT_RATE  = 0.14577;       // 0x412588 (double)
const C_ORBIT_R     = 150.0;         // 0x412580 (float)
const C_EYE_Z_RATE  = 1.112;         // 0x412578 (double)
const C_EYE_Z_AMP   = 100.0;         // 0x412454 (float)
const C_EYE_Z_K     = 0.1;           // 0x412570 (double)
const C_EYE_Z_B     = 0.4;           // 0x412568 (double)
const C_TUBE_LEN    = 4000.0;        // 0x4124d8 (double)
const C_AT_X        = 350.0;         // 0x412560 (float)
const C_AT_Z        = 2000.0;        // 0x44fa0000

const C_SEG         = Math.PI / 8;   // 0x4124e8 (double) = 0.39269908169872414
const C_RADIUS0     = 50.0;          // 0x412458 (float)  base tube radius
const C_UV          = 0.02;          // 0x4124e0 (float)
const C_U_RATE      = 1.75;          // 0x412518 (float)
const C_R_RATE      = 0.773;         // 0x412510 (double)
const C_PI          = Math.PI;       // 0x412508 (double)
const C_R_AMP       = 30.0;          // 0x412504 (float)
const C_R_BASE      = 60.0;          // 0x412500 (float)
const C_TWIST       = 2.5;           // 0x412468 (double)
const C_U_STEP      = 0.15;          // 0x4124f8 (double)
const C_SEED_Z_K    = 0.1;           // 0x4124f4 (float)
const C_PR_AMP      = 20.0;          // 0x4124f0 (float)
const C_PR_BASE     = 40.0;          // 0x412448 (float)
const C_PSIZE_AMP   = 16.0;          // 0x4123c0 (double)
const C_PSIZE_BASE  = 8.0;           // 0x4124d0 (double)
const C_PFADE       = 0.00125;       // 0x412450 (float)
const C_255         = 255.0;         // 0x412558 (double)
const C_SLIDE_RATE  = 0.5;           // 0x4120a8 (double)
const C_SLIDE_MAX   = 400.0;         // 0x412550 (float)
const C_ARROW_RATE  = 0.002;         // 0x412540 (double)
const C_ARROW_AMP   = 20.0;          // 0x4124f0 (float)
const C_TEXT_SLIDE  = 0.3;           // 0x412530 (double)
const C_TEXT_Y      = 435.0;         // 0x412528 (double)
const C_LV_X_K      = 440.0;         // 0x412520 (float)
const C_LV_X_B      = 430.0;         // 0x41251c (float)

const RINGS = 400, SEGS = 16;
// (the original's counts, i.e. the tess = 1 size: 0x1900 verts / 0x31e0 faces)
const NPART = 0x800;                 // 2048
// The tube's face count is what limits tessellation, not its vertex count:
// DrawIndexedPrimitive only ever issues gl.UNSIGNED_SHORT and createMesh masks
// nFaces to 16 bits, so (rings-1) * segs * 2 must stay <= 65535, i.e. the whole
// mesh can only grow ~5x. See tubeSize() for how that budget is spent.
const FACE_BUDGET = 32767;           // (rings - 1) * segs, i.e. nFaces / 2

const DESIGN_YELLOW = 0xffd7b45a;

// --- FUN_00408e90's 2D design layer (all x get + `slide`) ----------------
const GRP_A_XY = [
  [246, 37], [625, 37], [625, 396], [246, 396],
  [263, 55], [608, 55], [608, 383], [263, 383], [0, 0],
];
const GRP_A_TRIS = [
  [3, 7, 4], [3, 4, 0], [0, 1, 5], [0, 4, 5],
  [1, 5, 2], [5, 2, 6], [6, 2, 3], [6, 7, 3],
];
const GRP_B_XY = [[299, 395], [625, 395], [625, 430], [299, 430]];
const GRP_B_TRIS = [[0, 1, 2], [2, 3, 0]];
// the arrow — additionally offset by sin(t*0.002)*20
const GRP_C_XY = [
  [288, 220], [421, 86], [421, 353], [421, 186], [421, 253],
  [581, 253], [514, 186], [514, 158], [581, 158],
];
const GRP_C_TRIS = [[0, 1, 2], [3, 4, 6], [6, 4, 5], [5, 6, 8], [7, 6, 8]];

// FUN_00408550: 56x36 1-bit mask -> 256x256, 7 bytes/row, MSB first.
const LOGO1_B64 =
  'f////////H////////x////////8AB///////AAP//////wAB//////8AAH//////AAA////' +
  '//wAAH/////8AAA//////AAAD/////wAAAf////8AAAD/////AAAAP////wAAAB////8AAAA' +
  'P////AAAAB////wAAAAH///8AAAAA////AAAAAH///wAAAAAAAAMAAAAAAAADH///////8x/' +
  '///////Mf///////zH///////8x////////Mf///////zH///////8x////////Mf///////' +
  'zH///////8x////////Mf///////zH///////8wAAAAAAAAA';
// FUN_004086b0: 24x316 2-bit alpha strip -> 512x512, 6 bytes/row, MSB first.
const LOGO2_B64 =
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAG5AAAQAA9AAACwAACoAACUAABtAAFMA' +
  'ApAAAMFAAbkAAUCAAAVAAAAAAAAAAAAAAFAAAFQAA7WAAptAAgiAAwCAAgiAAgCAA+9AA+vo' +
  'AVQAAVVQAAAAAAAAAABAAFQAAf/wAesAAwFAAxSAAgBAAhSAAAAAAxpAAFQAAQUAAdsAAAAA' +
  'AwCAAQUAAgCAAx5AAgFAAiSAAAAAA3CAAAAAAJEAA//4AAAAAAFAAAAAAACAAFQAAVaAAdsA' +
  'AVUAAwCAAAAAAgCAAAAAAgFAAAAAAAAAAAAAAAAAAAAAA/9AAAAAAAIAAFAAAAFAA7WAAAAA' +
  'AgiAAAAAAgiAA/9kA+9AAAAAAVQAAAAAAAAAAAAAAAAAP/9AA/9AAgFAAAFAAwCAAACAApaA' +
  'AVaAAGkAAVUAAAAAAAAAAABAAFQAAf/wAptAAwFAAwCAAgBAAgCAAAAAA+voAAAAAVVQA/9k' +
  'AAAAAAAAAAAAAAAAAAAAABQAAAAAAZdAAAAAAwCAAAAAAwCAAAAAAddAA//4ABQAAAAAAAAA' +
  'AAAAAAAAAFQAA/9AAesAAAFAAxSAAACAAhSAAVaAAxpAAVUAAQUAAAAAAAAAAAAAAFAAAAAA' +
  'A7WAAAAAAgiAAAAAAgiAAAAAA+9AABQAAVQAAZdAAAAAAwCAAAAAAwCAA/9AAddAAAIAABQA' +
  'AAFAAAAAAAAAAABAAAAAA//wA/9AAAFIAAFAAABIAACAAAAAAVaAAAAAAVUAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAFQAAAAAAesAAAAAAxSAAAAAAhSAAAAAAxpAAAAAAQUAAAAAAAAAAAAAAABA' +
  'AAAAA//wAAAAAAFIAAAAAABIAAAAAABAAAAAA//wAAAAAAFIAAAAAABIAAAAAAAAAAAAAFQA' +
  'AAAAAesAAAAAAxSAAAAAAhSAAAAAAxpAAAAAAQUAAAAAAAAAAAAAAFQAAAAAAdsAAAAAAwCA' +
  'AAAAAgCAAAAAAgFAAAAAAAAAAAAAAABAAAAAAf/wAAAAAwFAAAAAAgBAAAAAAAAAAAAAAAAA' +
  'AAAAAUCAAAAAAMFAAAAAAJIAAAAAACIAAAAAACgAAAAAABgAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAQEAAAAAA0NAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAgAAAAAgEUAAAAAwYU' +
  'AAAAAp3wAAAAAFAAAAAAAAAAAAAAAQUAAAAAAx5AAAAAAiSAAAAAA3CAAAAAAJEAAAAAAAAA' +
  'AAAAAABAAAAAAf/wAAAAAwFAAAAAAgBAAAAAAAAAAAAAAFAAAAAAA7WAAAAAAgiAAAAAAgiA' +
  'AAAAA+9AAAAAAVQAAAAAAAAAAAAAAABAAAAAAf/wAAAAAwFAAAAAAgBAAAAAAAAAAAAAAFQA' +
  'AAAAAesAAAAAAxSAAAAAAhSAAAAAAxpAAAAAAQUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAP/9AAAAAAgFAAAAAAwCAAAAAApaAAAAAAGkAAAAAAAAAAAAAAAAA' +
  'AAAAAFAAAAAAA7WAAAAAAgiAAAAAAgiAAAAAA+9AAAAAAVQAAAAAAAAAAAAAAABAAAAAAf/w' +
  'AAAAAwFAAAAAAgBAAAAAAAAAAAAAAFQAAAAAAesAAAAAAxSAAAAAAhSAAAAAAxpAAAAAAQUA' +
  'AAAAAAAAAAAAAAAAAAAAA/9AAAAAAAFAAAAAAACAAAAAAVaAAAAAAVUAAAAAAAAAAAAAAABA' +
  'AAAAAf/wAAAAAwFAAAAAAgBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAP/9AAAAAAgFAAAAAAwCAAAAAApaAAAAAAGkAAAAAAAAAAAAAAAAAAAAAAFQAAAAAAesA' +
  'AAAAAxSAAAAAAhSAAAAAAxpAAAAAAQUAAAAAAAAAAAAAAAAAAAAAA/9AAAAAAAFAAAAAAACA' +
  'AAAAAVaAAAAAAVUAAAAAAAAAAAAAAFQAAAAAAptAAAAAAwCAAAAAAgCAAAAAA+voAAAAAVVQ' +
  'AAAAAAAAAAAAAAAAAAAAA/9kAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/9AAAAAAAFAAAAAAACA' +
  'AAAAAVaAAAAAAVUAAAAAAAAAAAAAAFQAAAAAMptAAAAAIwCAAAAAMgCAAAAAH+tAAAAAAVUA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAgAAAAAgEU' +
  'AAAAAwYUAAAAAp3wAAAAAFAAAAAAAAAAAAAAAQUAAAAAAx5AAAAAAiSAAAAAA3CAAAAAAJEA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAACEAAAAAAXFAAAAAADaQAAAAAXFAAAAAADaQAAAAACFA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAgBAAAAAA1WgAAAAA6qgAAAAAgAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAA';

// -------------------------------------------------------------------------
function ftol(x) {
  const r = Math.round(x);
  return (x - Math.floor(x) === 0.5 && (r & 1)) ? r - 1 : r;
}
function makeRand(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 0x015a4e35) + 1) >>> 0; return (s >>> 16) & 0x7fff; };
}
const RAND_SEED = 0xabf828c9;
// FUN_004087c0 is the second generator FUN_0040f285 runs; FUN_0040df90 ahead of
// it burns 32*64*64 + 16*16 = 131328 draws from the shared stream.
const RAND_SKIP_F = 131328;

/** FUN_0040607f — a purely procedural 256x256 radial falloff. */
function radialGlowPixels() {
  const px = new Uint32Array(256 * 256);
  let p = 0;
  for (let y = -128; y < 128; y++) {
    for (let x = -128; x < 128; x++) {
      const d = Math.sqrt(x * x + y * y);
      let i = ftol(255.0 - (d + d));
      if (i > 0) i = (i * i) >> 8;
      if (i < 0) i = 0;
      if (i > 0xff) i = 0xff;
      px[p++] = (0xff000000 | (i * 0x10101)) >>> 0;
    }
  }
  return px;
}

/** FUN_00408550 — 1 bit per pixel: set -> opaque WHITE, clear -> transparent. */
function mask1bpp(b64, w, h, rowBytes, size) {
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

/**
 * REMASTER, additive: the tube's tessellation. RINGS scale with `tess`; SEGS
 * deliberately DO NOT.
 *
 * Measured, not assumed (screenshots at 0xe80/0x1000/0x1080): subdividing the
 * ring cross-section turns the copper chrome into dark grey. The reason is the
 * alternating winding. Every second column is wound backwards so it gets
 * culled, and FUN_004022a0 averages FACE normals into vertex normals without
 * looking at winding — so each column boundary accumulates n and -n, and the
 * near-cancelled normals it produces are what the sphere map samples. That
 * artifact IS the chrome look. Subdividing a column gives its interior
 * vertices honest outward normals, the sphere map samples somewhere else, and
 * the tube goes black. Even a 2x split visibly desaturates it.
 *
 * Rings are the safe axis: adding rings leaves every vertex bordering the same
 * two columns with the same opposite windings, so the normal field keeps its
 * character while the ribbons' curvature along z and their env-map uv get
 * `tess` times more samples — which is what smooths the ribbon edges.
 *
 * Cap: DrawIndexedPrimitive only issues gl.UNSIGNED_SHORT and createMesh masks
 * nFaces to 16 bits, so (rings - 1) * segs * 2 <= 65535, i.e. rings <= 2048.
 */
function tubeSize(tess) {
  const t = Math.max(1, Math.floor(tess || 1));
  const segs = SEGS;
  const rings = RINGS * Math.max(1, Math.min(t, Math.floor(FACE_BUDGET / (RINGS * segs))));
  return { rings, segs };
}

/** FUN_004086b0 — 2 bits per pixel: alpha = n * 0x55, RGB = 0 (black glyphs). */
function mask2bpp(b64, w, h, rowBytes, size) {
  const bin = atob(b64);
  const px = new Uint32Array(size * size);
  for (let i = 0; i < px.length; i++) px[i] = 0x00ffffff;
  for (let y = 0; y < h; y++) {
    for (let bx = 0; bx < rowBytes; bx++) {
      const byte = bin.charCodeAt(y * rowBytes + bx);
      for (let k = 0; k < 4; k++) {
        const x = bx * 4 + k;
        if (x >= w) break;
        px[y * size + x] = (((byte >> (6 - k * 2)) & 3) * 0x55000000) >>> 0;
      }
    }
  }
  return px;
}

// =========================================================================

export function makeScene(ctx, variant = 0) {
  const { K, d3d, textures } = ctx;

  let tube, parts, seeds, cam;
  let texEnv, texGlowA, texGlowB, texLogo1, texLogo2;
  // tube tessellation (RINGS/SEGS and the original constants when tess = 1)
  let nRing = RINGS, nSeg = SEGS;
  let segAngle = C_SEG, ringZ = 10, uStep = C_U_STEP;

  let tBase = 0;         // _DAT_005101a4  (FUN_00408cc0)
  let tPrev = 0;         // _DAT_00510148
  let tRamp = 0;         // _DAT_005101a0
  let dt = 0;            // _DAT_00510168
  let T = 0;             // _DAT_00510110
  let ramp = 0;          // _DAT_00510114
  let entered = false;
  let lastPos = -1;

  const tri = [
    [0, 0, 0.01, 100, DESIGN_YELLOW, 0, 0, 0, 0],
    [0, 0, 0.01, 100, DESIGN_YELLOW, 0, 0, 0, 0],
    [0, 0, 0.01, 100, DESIGN_YELLOW, 0, 0, 0, 0],
  ];

  function init() {
    d3d.clearColor = SKY_BLUE;

    // --- FUN_00408550 / FUN_004086b0 (the two procedural textures) --------
    // flags 2 on both, as the original: the mask lives in the ALPHA channel
    // (logo1 white-on-transparent, logo2 black ink), so the alpha byte matters.
    // logo2 stays stored rotated — the scene does the on-screen rotation.
    texLogo1 = textures && textures.proc_f_logo1
      ? d3d.createTextureFromImage(textures.proc_f_logo1, 2 | D3DTEX_MIPMAP)
      : K.createTexture(mask1bpp(LOGO1_B64, 56, 36, 7, 256), 256, 256, 2);
    texLogo2 = textures && textures.proc_f_logo2
      ? d3d.createTextureFromImage(textures.proc_f_logo2, 2 | D3DTEX_MIPMAP)
      : K.createTexture(mask2bpp(LOGO2_B64, 24, 316, 6, 512), 512, 512, 2);

    // --- FUN_004087c0 -----------------------------------------------------
    cam = createCamera(0, 0, 0, 0, 0, 0);
    texEnv = textures.dr_64_envmap;                   // DAT_00510188
    const hiGlow = textures && textures.proc_radial_k100;
    const glow = hiGlow ? null : radialGlowPixels();
    texGlowA = hiGlow                                 // DAT_00510118 (stage 1)
      ? d3d.createTextureFromImage(hiGlow, 8 | D3DTEX_MIPMAP)
      : K.createTexture(glow, 256, 256, 8);
    texGlowB = hiGlow                                 // DAT_00510150 (particles)
      ? d3d.createTextureFromImage(hiGlow, 0 | D3DTEX_MIPMAP)
      : K.createTexture(glow, 256, 256, 0);

    // REMASTER: nRing/nSeg are RINGS/SEGS at tess = 1 and every derived
    // quantity below (ring spacing, segment angle, u step) is written as the
    // original constant scaled by the multiplier, so tess = 1 is bit-identical.
    ({ rings: nRing, segs: nSeg } = tubeSize(K.tess));
    segAngle = C_SEG * (SEGS / nSeg);                 // 2*pi / nSeg
    ringZ = 10 * (RINGS / nRing);                     // still 4000 units long
    uStep = C_U_STEP * (RINGS / nRing);               // same twist per unit z

    tube = createMesh(nRing * nSeg, (nRing - 1) * nSeg * 2);
    const V = tube.verts;
    let o = 0;
    for (let r = 0; r < nRing; r++) {
      const z = r * ringZ;
      for (let j = 0; j < nSeg; j++) {
        const x = Math.sin(j * segAngle) * C_RADIUS0;
        const y = Math.cos(j * segAngle) * C_RADIUS0;
        V[o] = x; V[o + 1] = y; V[o + 2] = z;
        let u = x * C_UV;
        if (u < 0) u = -u;                            // u = |x * 0.02|
        V[o + 4] = u;
        V[o + 5] = z * C_UV;
        o += 8;
      }
    }
    // Alternating winding per column — every second strip is backface-culled.
    // `flip` toggles once per quad and there are an even number of quads per
    // ring, so it is exactly the COLUMN parity and adding rings cannot disturb
    // it: the slots keep their original width, phase and count. (This is also
    // why tubeSize() must not subdivide the columns themselves.)
    const I = tube.indices;
    let p = 0, flip = false;
    for (let r = 0; r < nRing - 1; r++) {
      for (let j = 0; j < nSeg; j++) {
        const n = (j + 1) % nSeg;
        const a = r * nSeg + j, b = r * nSeg + n;
        const c = (r + 1) * nSeg + n, d = (r + 1) * nSeg + j;
        if (flip) {
          I[p] = a; I[p + 1] = b; I[p + 2] = c;
          I[p + 3] = a; I[p + 4] = c; I[p + 5] = d;
        } else {
          I[p] = a; I[p + 1] = c; I[p + 2] = b;
          I[p + 3] = a; I[p + 4] = d; I[p + 5] = c;
        }
        p += 6;
        flip = !flip;
      }
    }

    const rnd = makeRand(RAND_SEED);
    for (let i = 0; i < RAND_SKIP_F; i++) rnd();
    seeds = new Float32Array(NPART * 3);              // DAT_0051014c
    parts = createParticles(NPART);                   // DAT_00510104
    for (let i = 0; i < NPART; i++) {
      let r0 = rnd() * (1 / 32768); seeds[i * 3]     = (r0 + r0) - 1.0;
      let r1 = rnd() * (1 / 32768); seeds[i * 3 + 1] = (r1 + r1) - 1.0;
      seeds[i * 3 + 2] = rnd() * (1 / 32768) * C_TUBE_LEN;
      parts.color[i] = 0xffffffff;
      parts.size[i] = rnd() * (1 / 32768) * C_PSIZE_AMP + C_PSIZE_BASE;
    }
  }

  /** FUN_00408cc0 */
  function reset(ms) { tBase = ms; tPrev = ms; dt = 0; tRamp = ms; }

  /** FUN_00408ce0 — twist the tube and swirl the particles. */
  function animate() {
    const V = tube.verts;
    let u = T * C_U_RATE;
    let o = 0;
    for (let r = 0; r < nRing; r++) {
      const rad = Math.sin(Math.sin(u * C_R_RATE) * C_PI) * C_R_AMP + C_R_BASE;
      const s = Math.sin(u);
      for (let j = 0; j < nSeg; j++) {
        const a = j * segAngle + s * C_TWIST;
        V[o] = Math.sin(a) * rad;
        V[o + 1] = Math.cos(a) * rad;
        o += 8;
      }
      u += uStep;
    }

    const P = parts.pos;
    for (let i = 0; i < NPART; i++) {
      const sx = seeds[i * 3], sy = seeds[i * 3 + 1], sz = seeds[i * 3 + 2];
      const f = sz * C_SEED_Z_K * C_U_STEP + T * C_U_RATE;
      const rad = Math.sin(Math.sin(f * C_R_RATE) * C_PI) * C_PR_AMP + C_PR_BASE;
      const cf = Math.cos(f), sf = Math.sin(f);
      P[i * 3]     = cf * sx * rad + sf * sy * rad;
      P[i * 3 + 1] = cf * sy * rad - sf * sx * rad;
      P[i * 3 + 2] = sz;
    }
  }

  function drawTris(list, xy, dx, dy) {
    for (const t of list) {
      for (let k = 0; k < 3; k++) {
        tri[k][0] = xy[t[k]][0] + dx;
        tri[k][1] = xy[t[k]][1] + dy;
      }
      K.drawTri2D(tri[0], tri[1], tri[2]);
    }
  }

  // ---- FUN_00408e90 ------------------------------------------------------
  function render(pos, extra) {
    const ms = (extra && extra.ms) || 0;
    if (!entered || pos < lastPos) reset(ms);
    entered = true; lastPos = pos;

    T = (ms - tBase) * C_T_SCALE;
    dt = (ms - tPrev) * C_DT_SCALE;
    tPrev = ms;

    d3d.clearColor = SKY_BLUE;
    d3d.enableFog(SKY_BLUE, FOG_DENSITY);        // FUN_0040484a(4,1) -> FUN_004047f9
    d3d.dispatchState(1, 0);
    K.setTextureHandle(texEnv, texGlowA);        // FUN_0040406d(0x510188, 0x510118)
    d3d.dispatchState(1, 2);                     // stage 1 = MODULATE

    cam.fov = Math.sin(T * C_FOV_RATE) * C_FOV_AMP + C_FOV_BASE;
    cam.roll = Math.sin(T * C_ROLL_RATE);

    if (pos < 0x1000) tRamp = ms;
    ramp = (ms - tRamp) * C_RAMP_RATE;
    if (ramp < 0) ramp = 0; else if (ramp > 1) ramp = 1;

    cam.ex = Math.sin(T * C_ORBIT_RATE) * C_ORBIT_R * ramp
           + (1 - ramp) * Math.sin(T * C_EYE_A_RATE) * C_FOV_AMP;
    cam.ey = Math.cos(T * C_ORBIT_RATE) * C_ORBIT_R * ramp;
    cam.ez = Math.sin(T * C_EYE_Z_RATE) * ramp * C_EYE_Z_AMP
           + (ramp * C_EYE_Z_K + C_EYE_Z_B) * C_TUBE_LEN;
    cam.ax = (1 - ramp) * C_AT_X;
    cam.ay = 0;
    cam.az = C_AT_Z;
    K.setCamera(cam);

    animate();
    K.meshEnvMapUV(tube, cam, 1.0, 0);

    d3d.dispatchState(5, 0);                     // alpha blend off
    d3d.dispatchState(3, 1);                     // cull CCW
    tube.m.set(IDENT);                           // FUN_00401a10
    K.drawMesh(tube);

    // billboard alpha from the distance to the camera along z
    for (let i = 0; i < NPART; i++) {
      let f = seeds[i * 3 + 2] - cam.ez;
      if (f < 0) f = -f;
      f *= C_PFADE;
      if (f > 1) f = 1;
      const c = ftol((1 - f) * C_255);
      parts.color[i] = (((c << 24) >>> 0) + 0x6f6f6f) >>> 0;
    }

    d3d.dispatchState(4, 0);                     // fog off
    d3d.dispatchState(5, 1);
    d3d.SetRenderState(D3DRS_ZWRITEENABLE, 0);
    d3d.SetRenderState(D3DRS_SRCBLEND, D3DBLEND_SRCALPHA);
    d3d.SetRenderState(D3DRS_DESTBLEND, D3DBLEND_ONE);
    d3d.dispatchState(3, 0);
    d3d.dispatchState(1, 0);
    K.setTextureHandle(texGlowB, null);
    K.drawParticles(parts, cam);

    // ---- 2D design layer ------------------------------------------------
    let slide = 0;
    if (pos >= 0x1000) {
      slide = (ms - tRamp) * C_SLIDE_RATE;
      if (slide < 0) slide = 0; else if (slide > C_SLIDE_MAX) slide = C_SLIDE_MAX;
    }

    d3d.SetRenderState(D3DRS_ZFUNC, D3DCMP_ALWAYS);
    K.setTextureHandle(null);
    d3d.dispatchState(5, 0);

    drawTris(GRP_A_TRIS, GRP_A_XY, slide, 0);
    drawTris(GRP_B_TRIS, GRP_B_XY, slide, 0);
    const arrow = Math.sin((ms - tBase) * C_ARROW_RATE) * C_ARROW_AMP + slide;
    drawTris(GRP_C_TRIS, GRP_C_XY, arrow, 0);

    d3d.SetTextureStageState(0, D3DTSS_MAGFILTER, D3DTFG_POINT);
    d3d.SetTextureStageState(0, D3DTSS_MINFILTER, D3DTFN_POINT);

    K.setTextureHandle(texLogo1, null);
    d3d.dispatchState(5, 1);
    d3d.SetRenderState(D3DRS_SRCBLEND, D3DBLEND_SRCALPHA);
    d3d.SetRenderState(D3DRS_DESTBLEND, D3DBLEND_INVSRCALPHA);
    {
      const x0 = slide + 245.0, x1 = slide + 300.0;
      const u1 = 0.21484375, v1 = 0.13671875;      // 55/256, 35/256
      K.drawQuad2D(
        [x0, 395.0, 0.01, 100.0, DESIGN_YELLOW, 0, 0, 0, 0],
        [x1, 395.0, 0.01, 100.0, DESIGN_YELLOW, u1, 0, u1, 0],
        [x1, 430.0, 0.01, 100.0, DESIGN_YELLOW, u1, v1, u1, v1],
        [x0, 430.0, 0.01, 100.0, DESIGN_YELLOW, 0, v1, 0, v1]);
    }
    K.setTextureHandle(texLogo2, null);
    {
      const x0 = slide + 213.0, x1 = slide + 237.0;
      const u1 = 0.046875, v1 = 0.6171875;         // 24/512, 316/512
      K.drawQuad2D(
        [x0, 40.0, 0.01, 100.0, DESIGN_YELLOW, 0, 0, 0, 0],
        [x1, 40.0, 0.01, 100.0, DESIGN_YELLOW, u1, 0, u1, 0],
        [x1, 356.0, 0.01, 100.0, DESIGN_YELLOW, u1, v1, u1, v1],
        [x0, 356.0, 0.01, 100.0, DESIGN_YELLOW, 0, v1, 0, v1]);
    }
    d3d.SetTextureStageState(0, D3DTSS_MAGFILTER, D3DTFG_LINEAR);
    d3d.SetTextureStageState(0, D3DTSS_MINFILTER, D3DTFN_LINEAR);

    const ty = slide * C_TEXT_SLIDE + C_TEXT_Y;
    K.drawTextRight('effect of the year', 625.0, ty, 160.0, 0xff000000);
    K.drawTextAt('3s#1', 246.0, ty, 160.0, 0xffffffff);
    K.drawTextAt('lost # vegas', ramp * C_LV_X_K - C_LV_X_B, 446.0, 256.0, 0xff000000);

    d3d.dispatchState(5, 0);
    d3d.SetRenderState(D3DRS_ZWRITEENABLE, 1);
    d3d.SetRenderState(D3DRS_ZFUNC, D3DCMP_LESSEQUAL);
  }

  return { init, render };
}

const IDENT = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
