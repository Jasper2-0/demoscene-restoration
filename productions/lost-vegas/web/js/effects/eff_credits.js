// eff_credits.js — "scene G", music position 0x1400 .. 0x1600 (~125 s .. ~140 s).
//
// Despite the id, this is NOT the end credits: it is the **"hard facts" bar
// chart** — five env-mapped boxes of different heights standing on a black
// wireframe grid floor, sky-blue fogged background, with the intro's yellow
// design furniture composited on top: a "legend" panel (a 2 bpp bitmap sheet
// out of .data), five coloured legend swatches that match the bars, three
// angular yellow bars, and the right-aligned black slogan
// "hard facts # we are better". The scene opens with a big additive white
// radial flash.
//
// Ported from work/re/out/lv.c (Ghidra, image base 0x400000):
//   init      FUN_00406500        (latch the scene start time)
//   render    FUN_00406520        (this is the reference implementation of the
//                                  yellow design-bar overlay system)
//   generators FUN_00406280       (camera, grid texture, floor quad, box mesh,
//                                  radial env map, bar base heights)
//              FUN_00406160       (the 512x512 "legend" sheet)
//              FUN_0040607f       (the 256x256 radial env map)
//              FUN_00401390/1590  (axis-aligned box mesh builder)
//
// Everything the decompile lost to Ghidra's x87 handling was recovered from
// the disassembly (0x406520..0x40737f); see the notes at each site.

import {
  D3DRS_ZWRITEENABLE, D3DRS_SRCBLEND, D3DRS_DESTBLEND,
  D3DBLEND_ONE, D3DBLEND_SRCALPHA, D3DBLEND_INVSRCALPHA,
  D3DTSS_MAGFILTER, D3DTSS_MINFILTER,
  D3DTFG_POINT, D3DTFG_LINEAR, D3DTFN_POINT, D3DTFN_LINEAR, D3DTEX_MIPMAP,
} from '../minid3d7.js';
import { createMesh, createCamera } from '../kernel.js';

// ---------------------------------------------------------------------------
// timeline helpers
//
// The original mixes two clocks: scene boundaries come from the music
// position, while smooth motion is driven by timeGetTime(). Two consequences
// for the port:
//
//  * anything measured *from a scene event* (the opening flash, the beat
//    pulse) is reconstructed from the music position, so a frame is a pure
//    function of `pos` and single-frame debug renders are exact. The module is
//    speed 6 / 125 BPM => 120 ms per row, 64 rows per pattern, and `pos` is
//    (pattern << 8) | row with the engine's +0x200 offset past 0x1ff — so only
//    rows 0..63 of each pattern are reachable.
//  * the free-running sines that steer the camera read the *raw* timeGetTime
//    (system uptime, not process start), so their phase is arbitrary by
//    construction; `extra.ms` feeds them when it is available.
// ---------------------------------------------------------------------------
const SCENE_POS0 = 0x1400;
const MS_PER_ROW = 120;

function absRow(pos) {
  const pat = pos >= 0x400 ? (pos >> 8) - 2 : (pos >> 8);
  return pat * 64 + (pos & 0xff);
}
/** milliseconds of music between two positions */
// `frac` = fraction through the current row (extra.rowFrac, from the audio
// clock). Without it, row-derived motion advances in 120 ms steps.
const sceneMs = (pos, from, frac = 0) =>
  (absRow(pos) - absRow(from) + frac) * MS_PER_ROW;

/** rows back to the most recent beat trigger: the original resets its pulse
 *  timer whenever the low nibble of the music position is 4, 6 or 7. */
function rowsSinceBeat(pos) {
  const row = pos & 0xff;
  for (let back = 0; back < 64; back++) {
    const k = ((row - back) + 64) & 0x3f & 0xf;
    if (k === 4 || k === 6 || k === 7) return back;
  }
  return 64;
}

// ---------------------------------------------------------------------------
// FUN_00401390 — fill an 8-vertex / 12-face mesh with an axis-aligned box.
// (FUN_00401590 = FUN_00402040(8, 0xc) + this.)  The vertex order is
// (x0,y0,z0) (x1,y0,z0) (x0,y1,z0) (x1,y1,z0) (x0,y0,z1) ... and every vertex
// carries the same diffuse.  UVs are left at zero — the env mapper writes them.
// ---------------------------------------------------------------------------
const BOX_INDICES = new Uint16Array([
  2, 6, 0, 6, 4, 0, 6, 7, 4, 7, 5, 4, 7, 3, 5, 3, 1, 5,
  3, 2, 1, 2, 0, 1, 0, 4, 1, 4, 5, 1, 3, 7, 2, 7, 6, 2,
]);

function boxMesh(obj, x0, y0, z0, x1, y1, z1, color) {
  const V = obj.verts, C = obj.vertsU32;
  const P = [
    x0, y0, z0, x1, y0, z0, x0, y1, z0, x1, y1, z0,
    x0, y0, z1, x1, y0, z1, x0, y1, z1, x1, y1, z1,
  ];
  for (let i = 0; i < 8; i++) {
    const b = i * 8;
    V[b] = P[i * 3]; V[b + 1] = P[i * 3 + 1]; V[b + 2] = P[i * 3 + 2];
    C[b + 3] = color >>> 0;
  }
  obj.indices.set(BOX_INDICES);
}

// ---------------------------------------------------------------------------
// FUN_0040607f(scale, flags) — the 256x256 radial "env map".
//
//   for y in -128..127, x in -128..127:
//     v = (255 - 2*sqrt(x^2+y^2)) * scale        (255.0 is _DAT_004123d0)
//     i = round(v); if (i > 0) i = (i*i) >> 8; clamp 0..255
//     pixel = i * 0x10101 - 0x1000000            (= 0xFF <i><i><i>)
//
// A bright disc that falls off to black at r = 127.5 — every "chrome" object
// in this intro is just this, sphere-mapped.
// ---------------------------------------------------------------------------
function makeRadialTexture(K, scale, flags) {
  const px = new Uint32Array(256 * 256);
  let p = 0;
  for (let y = -128; y < 128; y++) {
    for (let x = -128; x < 128; x++) {
      const r = Math.sqrt(x * x + y * y);
      let i = Math.round((255.0 - (r + r)) * scale);
      if (i > 0) i = (i * i) >> 8;
      if (i < 0) i = 0;
      if (i > 255) i = 255;
      px[p++] = (0xff000000 | (i << 16) | (i << 8) | i) >>> 0;
    }
  }
  return K.createTexture(px, 256, 256, flags);
}

// ---------------------------------------------------------------------------
// FUN_00406280's grid texture — 256x256 OPAQUE black, with a white row every
// 16 rows and a white column every 16 columns. Tiled 5x5 over the floor quad it
// gives the black wireframe ground plane.
//
// The original zero-fills the buffer, which leaves alpha 0 — but it uploads
// with flags 0, i.e. WITHOUT the alpha-surface bit, so DirectDraw picks RGB565
// and the alpha byte is discarded: every texel is opaque on the device. We
// write 0xff000000 explicitly, matching eff_c.js's copy of the same generator
// and the original's actual on-device result. (No visible change here, since
// the floor draws with alpha blending off — but the two copies now agree, and
// this is the same trap that once rendered scene C's floor sky-blue.)
// ---------------------------------------------------------------------------
function makeGridTexture(K) {
  const px = new Uint32Array(256 * 256);       // FUN_004051c3 + zero fill
  px.fill(0xff000000);                         // opaque on the device (see above)
  for (let k = 0; k < 16; k++) {               // 16 full horizontal lines
    const base = k * 16 * 256;
    for (let i = 0; i < 256; i++) px[base + i] = 0xffffffff;
  }
  for (let y = 0; y < 256; y++) {              // 16 vertical lines, every row
    for (let k = 0; k < 16; k++) px[y * 256 + k * 16] = 0xffffffff;
  }
  return K.createTexture(px, 256, 256, 0);
}

// ---------------------------------------------------------------------------
// FUN_00406160 — the "legend" panel.
//
// 0x0041eb74 .. 0x00420704 is a raw 2 bits-per-pixel bitmap, 84 bytes (= 336
// pixels) per row, 84 rows, expanded into a 512x512 ARGB texture as white
// texels with 2-bit alpha {0x00,0x55,0xAA,0xFF} — the same trick as the font
// sheet (DR_FORMAT.md §7). It is the yellow angular panel that carries the
// word "legend" and the five series names. Embedded verbatim because it is
// executable data, not one of the baked DR streams.
// ---------------------------------------------------------------------------
const LEGEND_B64 =
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC//////////' +
  '////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAL//////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAv//////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC///////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAb///////////////////////////AAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABv///////////////////////////' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAG////////////' +
  '////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAb////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAACv////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAK/////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAr/////////////////////////////AAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC//////////////////////////////' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAL//////////////' +
  '////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'Av//////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAC///////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAL///////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAv///////////////////////////////AAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC//////+r/////////////////q//////' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAL//////8D////////' +
  '/////////Qv/////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAv' +
  '//////8D/////////////////Qv/////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAC///////8D/////////////////Qv/////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAL///////8D/gB/4BQ/0Av0JAv9AAv/////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAv///////8D9AAPgAA/AAHwAAPwAAv/////AAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC////////8D4H0LAfA9C4DwGgLQLQv/////' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAL////////8D0FUGA/A8' +
  'BUCwP0LAvQv/////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAv//' +
  '//////8DwAAGA/A8AACwP0LA/Qv/////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAC/////////8DwKqqA/A8CqrwP0LA/Qv/////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAL/////////8D0H/bAFA9C/nwP0LAfQv/////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAv/////////8D8AALgAA+AADwP0LgAAv/////AAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC//////////8D/QAL5GA/gAHwP0L0AQv/////' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAL/////////////+r/7+A/' +
  '/q//////r///////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAv////' +
  '////////////gAC/////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAC/////////////////gAH/////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAL/////////////////+q//////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAv/////////////////////////////////////AAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC//////////////////////////////////////' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAL//////////////////////' +
  '////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAv//////' +
  '////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAC///////////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAACL///////////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACv///////////////////////////////////////AAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACv///////////////////////////////////////' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD////////////////////////' +
  '////////////////AAAAAAAAAAAAAC//////////////////////////////////////////////////////////////////' +
  '////////////////////////////////AAAAAAAAAAAAAL//////////////////////////////////////////////////' +
  '////////////////////////////////////////////////AAAAAAAAAAAAAv//////////////////////////////////' +
  '////////////////////////////////////////////////////////////////AAAAAAAAAAAAC///////////////////' +
  '////////////////////////////////////////////////////////////////////////////////AAAAAAAAAAAAL///' +
  '////////////////////////////////////////////////////////////////////////////////////////////////' +
  'AAAAAAAAAAAAv///////////////////////////////////////////////////////////////////////////////////' +
  '////////////////AAAAAAAAAAAC////////////////////////////////////////////////////////////////////' +
  '////////////////////////////////AAAAAAAAAAAL////////////////////////////////////////////////////' +
  '////////////////////////////////////////////////AAAAAAAAAAAv////////////////////////////////////' +
  '////////////////////////////////////////////////////////////////AAAAAAAAAAC/////////////////////' +
  '////////////////////////////////////////////////////////////////////////////////AAAAAAAAAAL/////' +
  '////////////////////////////////////////////////////////////////////////////////////////////////' +
  'AAAAAAAAAAv/////////////////////////////////////////////////////////////////////////////////////' +
  '////////////////AAAAAAAAAC//////////////////////////////////////////////////////////////////////' +
  '////////////////////////////////AAAAAAAAAL//////////////////////////////////////////////////////' +
  '////////////////////////////////////////////////AAAAAAAAAv//////////////////////////////////////' +
  '////////////////////////////////////////////////////////////////AAAAAAAAC///////////////////////' +
  '////////////////////////////////////////////////////////////////////////////////AAAAAAAAL///////' +
  '////////////////////////////////////////////////////////////////////////////////////////////////' +
  'AAAAAAAAv///////////////////////////////////////////////////////////////////////////////////////' +
  '////////////////AAAAAAAC////////////////////////////////////////////////////////////////////////' +
  '////////////////////////////////AAAAAAAL////////////////////////////////////////////////////////' +
  '////////////////////////////////////////////////AAAAAAAv////////////////////////////////////////' +
  '////////////////////////////////////////////////////////////////AAAAAAC///////////v/////////////' +
  '///////////v/////////////////////////////////////////////////////7//////////////AAAAAAL/////////' +
  '//b////////////////////////P//+v///////////////////////////wL/+v//f//////////////z33////////////' +
  'AAAAAAv//////////5b5/pp/W/l/X/////////W+b+rJvm+v/////////W/W6af5v///////////n5sbl+G5v//////////+' +
  'bz7hvX+a6bm+u+m/AAAAAC///////////ibWPGJeo9Y9l////////+o+l8rGfJtv////////+o9qxiXyb//////////9fWtb' +
  'qfKyb//////////5jzzytl4m1uY9s8Y/AAAAAL///////////bbPPPOeQ888A////////+Q9B8/POAdv////////+Q8/zzng' +
  'H//////////+bhtvgPPgH//////////0Czzz8A2229tts88/AAAAAv///////////bbbPPOds9s8/////////9s858/POf9v' +
  '////////9s8/zznn////////////n+NvPPPn///////////2/zzz8/2229tts88/AAAAC////////////xLgvPOeE+E+B///' +
  '/////+E9F8/EvQtv////////+E+Czzn0L//////////gPgeHhPR0L//////////8Czz0eB8S2/R+A8S/AAAAL///////////' +
  '/////////+p///////////////////////////////////////////////////////////////////////////+j/////8//' +
  'AAAAv/////////////////////X/////////////////////////////////////////////////////////////////////' +
  '//////9b/////+//AAAC////////////////////////////////////////////////////////////////////////////' +
  '////////////////////////////////AAAL////////////////////////////////////////////////////////////' +
  '////////////////////////////////////////////////AAAv////////////////////////////////////////////' +
  '////////////////////////////////////////////////////////////////AAC/////////////////////////////' +
  '////////////////////////////////////////////////////////////////////////////////AAL/////////////' +
  '////////////////////////////////////////////////////////////////////////////////////////////////' +
  'AAv/////////////////////////////////////////////////////////////////////////////////////////////' +
  '////////////////AC//////////////////////////////////////////////////////////////////////////////' +
  '////////////////////////////////AL//////////////////////////////////////////////////////////////' +
  '////////////////////////////////////////////////Av//////////////////////////////////////////////' +
  '////////////////////////////////////////////////////////////////C///////////////////////////////' +
  '////////////////////////////////////////////////////////////////////////////////D///////////////' +
  '////////////////////////////////////////////////////////////////////////////////////////////////';

// ---------------------------------------------------------------------------
// the scene
// ---------------------------------------------------------------------------
export function makeScene(ctx, variant = 0) {
  const { K, d3d, textures } = ctx;

  // ---- state (the original's globals) ------------------------------------
  let cam = null;                  // DAT_00510000
  let radialTex = null;            // DAT_00510028   FUN_0040607f(1.0, 0)
  let gridTex = null;              // DAT_0050ffe8
  let legendTex = null;            // DAT_00510068   FUN_00406160
  let floorQuad = null;            // DAT_0051009c
  let bar = null;                  // DAT_00510008   the reused box mesh
  const baseH = [70, 170, 110, 250, 50];       // DAT_00510010 .. DAT_00510020
  const height = new Float32Array(5);          // DAT_00510050 .. DAT_00510060
  const barColor = new Uint32Array(5);         // DAT_00510080 .. DAT_00510090

  // ---- 2D helpers --------------------------------------------------------
  const BLACK = 0xff000000;
  const YELLOW = 0xffd7b45a;                     // the intro's design yellow
  const Z2D = 0.01, RHW2D = 100.0;
  const v2d = (x, y, c, u = 0, v = 0) => [x, y, Z2D, RHW2D, c, u, v, u, v];
  const quad = (x0, y0, x1, y1, c) => K.drawQuad2D(
    v2d(x0, y0, c), v2d(x1, y0, c), v2d(x1, y1, c), v2d(x0, y1, c));

  // ---- init (FUN_00406280 up front + FUN_00406500 per entry) -------------
  function init() {
    if (cam) return;

    cam = createCamera(-200, 360, -400, 0, 0, 0);   // FUN_00402680
    // The README's proc_grid16 row names FUN_00406280 (this builder) alongside
    // scene C's FUN_0040aca0, and its proc_radial_k100 row names FUN_0040607f,
    // which is what makeRadialTexture is. Both baked sheets are fully opaque,
    // and makeGridTexture now matches (see its comment).
    gridTex = textures && textures.proc_grid16
      ? d3d.createTextureFromImage(textures.proc_grid16, 0 | D3DTEX_MIPMAP)
      : makeGridTexture(K);
    radialTex = textures && textures.proc_radial_k100
      ? d3d.createTextureFromImage(textures.proc_radial_k100, 0 | D3DTEX_MIPMAP)
      : makeRadialTexture(K, 1.0, 0);
    // FUN_00406160's 512^2 sheet, or the 4x re-rasterised bake of it. flags 2
    // either way: the panel is opaque white with the type knocked out of the
    // ALPHA channel, so the alpha byte has to survive.
    legendTex = textures && textures.proc_credits_design
      ? d3d.createTextureFromImage(textures.proc_credits_design, 2 | D3DTEX_MIPMAP)
      : makeLegendTexture(K);

    // the ground: one quad at y = -10 spanning +-1000, uv 0..5 (WRAP)
    floorQuad = createMesh(4, 2);
    const V = floorQuad.verts;
    const P = [-1000, -10, -1000, 0, 0, 1000, -10, -1000, 5, 0,
      1000, -10, 1000, 5, 5, -1000, -10, 1000, 0, 5];
    for (let i = 0; i < 4; i++) {
      const b = i * 8, s = i * 5;
      V[b] = P[s]; V[b + 1] = P[s + 1]; V[b + 2] = P[s + 2];
      V[b + 4] = P[s + 3]; V[b + 5] = P[s + 4];
      floorQuad.vertsU32[b + 3] = 0xffffffff;
    }
    floorQuad.indices.set([0, 1, 2, 2, 3, 0]);

    // FUN_00401590(-10,0,-10, 10,200,10, 0x3f9681b7) — the box is rebuilt with
    // real bounds every frame, so only the allocation matters here.
    bar = createMesh(8, 12);
    boxMesh(bar, -10, 0, -10, 10, 200, 10, 0x3f9681b7);
  }

  // ---- render (FUN_00406520) ---------------------------------------------
  function render(pos, extra) {
    const rowFrac = (extra && typeof extra.rowFrac === 'number') ? extra.rowFrac : 0;
    if (!cam) init();
    const el = sceneMs(pos, SCENE_POS0, rowFrac);          // ms since FUN_00406500
    const now = (extra && extra.ms > 0) ? extra.ms : el;   // free-running phase

    // SetRenderState(D3DRS_ZWRITEENABLE, 2) — literally 2 in the binary; any
    // non-zero is "write enabled".
    d3d.SetRenderState(D3DRS_ZWRITEENABLE, 1);
    d3d.setCullMode(0);                          // FUN_0040484a(3,0)
    d3d.clearColor = 0xff7dafc8;                 // DAT_004b4f64 (next Clear)
    d3d.enableFog(0xff7dafc8, 0.001);            // DAT_0041a2a8/ac + (4,1)
    // The previous scene leaves blending off (FUN_00406520 ends with (5,0));
    // make that explicit so a cold jump to this position looks the same.
    d3d.setAlphaBlend(0);

    // camera — fov 80, a slow lissajous drift, aimed at (-100, 90, 0)
    cam.fov = 80.0;
    cam.ex = Math.sin(now * 0.001) * 50.0 - 100.0;
    cam.ey = Math.cos(now * 0.00125) * 15.0 + 40.0;
    cam.ez = -350.0;
    cam.ax = -100.0; cam.ay = 90.0; cam.az = 0.0;
    K.setCamera(cam);

    d3d.setStage1Op(0);                          // FUN_0040484a(1,0)
    K.setTextureHandle(radialTex);               // FUN_0040406d(0x510028)

    // ---- the beat pulse -------------------------------------------------
    // b = 35 - (now - lastHit) * 0.05, floored at 0. The original latches
    // lastHit = timeGetTime() on every frame whose music position has low
    // nibble 4, 6 or 7; measuring the same interval on the music clock gives
    // the identical ramp, quantised to the 120 ms row grid.
    let b = 35.0 - (rowsSinceBeat(pos) + rowFrac) * MS_PER_ROW * 0.05;
    if (b < 0.0) b = 0.0;

    let k = b * (1.0 / 35.0) + 1.0;              // 0x412430 = 1/35
    if (k < 1.0) k = 1.0;

    // the five bar colours, each channel = min(255, round(k * base))
    const chan = [
      180, 129, 126,   // 0x412428/24/20
      155, 133, 48,    // 0x41241c/18/14
      135, 176, 48,    // 0x412410/0c/14
      211, 225, 66,    // 0x412408/04/00
      153, 211, 223,   // 0x4123fc/(211)/0x4123f8
    ];
    for (let i = 0; i < 5; i++) {
      const r = Math.min(255, Math.round(k * chan[i * 3]));
      const g = Math.min(255, Math.round(k * chan[i * 3 + 1]));
      const bl = Math.min(255, Math.round(k * chan[i * 3 + 2]));
      barColor[i] = (0xff000000 | (r << 16) | (g << 8) | bl) >>> 0;
    }

    // heights: base + beat + 50 * sin(cos(t)) — the original re-reads
    // timeGetTime inside the loop, so all five share one wobble.
    const wob = Math.sin(Math.cos(now * 0.001)) * 50.0;
    for (let i = 0; i < 5; i++) height[i] = wob + b + baseH[i];

    // ---- the five bars --------------------------------------------------
    // x = -330, -220, -110, 0, 110 (edi runs -330 .. 110 step 110)
    for (let i = 0, x = -330; i < 5; i++, x += 110) {
      boxMesh(bar, -50, 0, -50, 50, height[i], 50, barColor[i]);
      bar.px = x;
      K.meshEnvMapUV(bar, cam, 1.0, 1);
      K.drawMesh(bar);
    }

    K.setTextureHandle(gridTex);                 // FUN_0040406d(0x50ffe8)
    K.drawMesh(floorQuad);

    // =====================================================================
    // the 2D design layer — FVF 0x244, z = 0.01, rhw = 100, flat diffuse.
    // Vertex order is always top-left, top-right, bottom-right, bottom-left
    // (recovered from the push order at 0x406ab0..0x406b7f); the yellow bars
    // near the end are pushed bottom-first in the original, which is
    // invisible under D3DCULL_NONE but is transcribed as-is below.
    // =====================================================================
    d3d.setCullMode(0);
    d3d.SetTextureStageState(0, D3DTSS_MAGFILTER, D3DTFG_POINT);
    d3d.SetTextureStageState(0, D3DTSS_MINFILTER, D3DTFN_POINT);
    K.setTextureHandle(null);

    // black knock-out plates: they show through the transparent glyphs of the
    // legend sheet drawn on top of them.
    quad(334, 342, 620, 376, BLACK);
    quad(534, 303, 620, 331, BLACK);

    // the legend panel: 336x84 texels of the 512x512 sheet, 1:1 on screen
    K.setTextureHandle(legendTex);
    d3d.setAlphaBlend(1);
    d3d.SetRenderState(D3DRS_SRCBLEND, D3DBLEND_SRCALPHA);
    d3d.SetRenderState(D3DRS_DESTBLEND, D3DBLEND_INVSRCALPHA);
    K.drawQuad2D(
      v2d(284, 292, YELLOW, 0, 0),
      v2d(620, 292, YELLOW, 0.65625, 0),
      v2d(620, 376, YELLOW, 0.65625, 0.1640625),
      v2d(284, 376, YELLOW, 0, 0.1640625));

    d3d.SetTextureStageState(0, D3DTSS_MAGFILTER, D3DTFG_LINEAR);
    d3d.SetTextureStageState(0, D3DTSS_MINFILTER, D3DTFN_LINEAR);
    K.setTextureHandle(null);

    // five 14x14 legend swatches, one per bar, in the bar's own colour
    const swx = [320, 379, 435, 492, 552];
    for (let i = 0; i < 5; i++) quad(swx[i], 351, swx[i] + 14, 365, barColor[i]);

    // the angular yellow furniture
    K.drawQuad2D(                                       // 382..620 x 402..425
      v2d(382, 425, YELLOW, 0, 0), v2d(620, 425, YELLOW, 0, 0),
      v2d(620, 402, YELLOW, 0, 0), v2d(382, 402, YELLOW, 0, 0));
    K.drawQuad2D(                                       // 216..374 x 410..425
      v2d(216, 425, YELLOW, 0, 0), v2d(374, 425, YELLOW, 0, 0),
      v2d(374, 410, YELLOW, 0, 0), v2d(216, 410, YELLOW, 0, 0));
    K.drawQuad2D(                                       // 216..620 x 376..402
      v2d(216, 402, YELLOW, 0, 0), v2d(620, 402, YELLOW, 0, 0),
      v2d(620, 376, YELLOW, 0, 0), v2d(216, 376, YELLOW, 0, 0));

    // FUN_00404e70(s, 620.0, 384.0, 140.0, 0xff000000) — Ghidra dropped the
    // colour argument; it is black (push 0xff000000 at 0x4071c0).
    K.drawTextRight('hard facts # we are better', 620, 384, 140, 0xff000000);

    // ---- the opening flash ----------------------------------------------
    // f = 20 - elapsed * 0.02; while f > 0 an additive white radial quad of
    // half-size f*f*32 is centred on (320, 240) — a one-second bloom.
    d3d.SetRenderState(D3DRS_ZWRITEENABLE, 1);
    K.setTextureHandle(radialTex);
    d3d.setAlphaBlend(1);
    d3d.SetRenderState(D3DRS_SRCBLEND, D3DBLEND_ONE);
    d3d.SetRenderState(D3DRS_DESTBLEND, D3DBLEND_ONE);
    const f = 20.0 - el * 0.02;
    if (f > 0.0) {
      const c = f * f * 32.0;
      K.drawQuad2D(
        v2d(320 - c, 240 - c, 0xffffffff, 0, 0),
        v2d(320 + c, 240 - c, 0xffffffff, 1, 0),
        v2d(320 + c, 240 + c, 0xffffffff, 1, 1),
        v2d(320 - c, 240 + c, 0xffffffff, 0, 1));
    }
    d3d.setAlphaBlend(0);                        // FUN_0040484a(5,0)
  }

  function makeLegendTexture(kern) {
    const src = b64(LEGEND_B64);
    const px = new Uint32Array(512 * 512);
    let s = 0;
    for (let row = 0; row < 84; row++) {
      let d = row * 512;
      for (let i = 0; i < 84; i++) {
        const byte = src[s++];
        for (let j = 0; j < 4; j++) {
          px[d++] = (((byte >> (6 - 2 * j)) & 3) * 0x55000000 + 0x00ffffff) >>> 0;
        }
      }
    }
    return kern.createTexture(px, 512, 512, 2);
  }

  return { init, render };
}

function b64(s) {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
