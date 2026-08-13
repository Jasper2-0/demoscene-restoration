// eff_finale.js — "scene H", the closing run. Music position 0x1600 .. 0x1a20
// (~140 s .. ~175 s), after which the demo is over.
//
// Three things happen, all in one renderer:
//
//  1. 0x1600+  a huge golden tiled ground mesh — a 16x16 grid whose height is
//     |cell - centre|^2, i.e. a shallow crater the camera sits in — textured
//     with the DR stream `dr_64_finale` tiled once per cell and drowned in
//     sky-blue exponential fog. The camera cross-fades from one flight path to
//     another over the first 7 seconds (which is why the first few seconds are
//     almost pure sky).
//  2. 0x1700 .. 0x1a00  the "letter tree": a recursive L-system grown live out
//     of the ground, its branches gold boxes (sphere-mapped with a radial
//     highlight, which is what makes them read as black shards with gold
//     edges) and its leaves picture-frame quads carrying the glyphs of
//     "threestate**in***lost***vegas**" as noisy 64x64 textures.
//  3. 0x1900+  a full-screen fade quad (to sky blue, then to black) and the
//     end credits — sagacity / sarix / stevie / distance — fading in one per
//     second, in black, centred.
//
// Ported from work/re/out/lv.c (Ghidra, image base 0x400000):
//   generator FUN_0040df90   glyph textures, env maps, meshes, the tree, floor
//   init      FUN_0040e940   latch three timestamps
//   render    FUN_0040eb90
//   helpers   FUN_0040e960 (draw a branch box)  FUN_0040ea00 (draw a leaf quad)
//             FUN_0040ead0 (walk the tree)      FUN_0040d890 (build the tree)
//             FUN_0040de40 (arm the growth)     FUN_0040df20 (advance it)
//
// Ghidra dropped a great deal here; everything below was checked against the
// disassembly of 0x40d890..0x40f251. The three worst cases:
//   * FUN_0040e960/FUN_0040ea00 lost their whole parameter lists — they are
//     (x, y, z, m[16], scale) and (x, y, z, m[16], scale, texIndex), passed by
//     value on the stack (0x40e960: `fld [esp+0x50]`).
//   * node+0x6c is an *integer* 0..31 (`and edx,0x1f; mov [edi+0x6c],edx`);
//     Ghidra types the node as float* and prints `(float)(rand & 0x1f)`, which
//     would have made every leaf show the same glyph.
//   * the loop constants at 0x4127a0/0x412800/0x4127f0/0x412478 are qwords
//     (0.25, 0.75, 0.8, 1/32767); read as floats they come out as 0.0 and the
//     ground would have been flat.

import {
  D3DMatrix,
  D3DRS_SRCBLEND, D3DRS_DESTBLEND, D3DBLEND_SRCALPHA, D3DBLEND_INVSRCALPHA,
  D3DTSS_MAGFILTER, D3DTSS_MINFILTER,
  D3DTFG_POINT, D3DTFG_LINEAR, D3DTFN_POINT, D3DTFN_LINEAR, D3DTEX_MIPMAP,
} from '../minid3d7.js';
import { createMesh, createCamera } from '../kernel.js';

// ---------------------------------------------------------------------------
// timeline (see eff_credits.js for the clock policy: intervals measured from a
// scene event come from the music position — 120 ms per row, 64 rows per
// pattern — while the free-running camera sines take `extra.ms`, since the
// original reads raw timeGetTime for them and their phase is arbitrary.)
// ---------------------------------------------------------------------------
const SCENE_POS0 = 0x1600;
const GROW_POS = 0x1700;      // the tree is drawn/grown from here ...
const END_POS = 0x1a00;       // ... to here,
const HOLD_POS = 0x1900;      // and the outro wash starts here
const MS_PER_ROW = 120;
function absRow(pos) {
  const pat = pos >= 0x400 ? (pos >> 8) - 2 : (pos >> 8);
  return pat * 64 + (pos & 0xff);
}
// `frac` is the fraction elapsed through the current row (from the audio clock,
// supplied as extra.rowFrac). Without it every value derived from the row index
// advances in 120 ms steps — visibly stepped growth and stuttering camera.
const sceneMs = (pos, from, frac = 0) =>
  (absRow(pos) - absRow(from) + frac) * MS_PER_ROW;
const GROW_MAX = (absRow(END_POS) - absRow(GROW_POS)) * MS_PER_ROW;

// ---------------------------------------------------------------------------
// the intro's PRNG — a 32-bit LCG kept as two 16-bit halves in
// DAT_0041a2a4/DAT_0041a2a6.  state = state * 0x015A4E35 + 1, result is
// (state >> 16) & 0x7fff.  FUN_00403ba0(seed) writes the whole state.
// The .data seed is 0x28c9 / 0xabf8.
// ---------------------------------------------------------------------------
let rngState = 0xabf828c9 >>> 0;
const srand = (v) => { rngState = v >>> 0; };
function rnd() {
  rngState = (Math.imul(rngState, 0x015a4e35) + 1) >>> 0;
  return (rngState >>> 16) & 0x7fff;
}
/** the low 6 bits of the same draw — `(int)DAT_0041a2a4 & 0x3f` */
const rndHi6 = () => (rngState >>> 16) & 0x3f;

// ---------------------------------------------------------------------------
// row-major 4x4 helpers, transcribed from the originals
// ---------------------------------------------------------------------------
/** FUN_00401730(m, s, s, s): m = m * scale(s,s,s) */
function scaleInPlace(m, s) {
  for (let i = 0; i < 4; i++) { m[i * 4] *= s; m[i * 4 + 1] *= s; m[i * 4 + 2] *= s; }
}
/** generic row-major A*B into out (out must not alias) */
function mul4(out, a, b) {
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[i * 4 + k] * b[k * 4 + j];
      out[i * 4 + j] = s;
    }
  }
}
/** FUN_004015f0(out, a, b): the 3x3 part of a*b, translation row cleared */
function mul3(out, a, b) {
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      out[i * 4 + j] = a[i * 4] * b[j] + a[i * 4 + 1] * b[4 + j] + a[i * 4 + 2] * b[8 + j];
    }
    out[i * 4 + 3] = 0;
  }
  out[12] = out[13] = out[14] = 0; out[15] = 1;
}
const _rot = new Float32Array(16);
const _tmp = new Float32Array(16);
/** FUN_004017f0(m, rx, ry, rz): m = rotX(rx) * rotY(ry) * rotZ(rz) */
function rotXYZ(m, rx, ry, rz) {
  m.set(D3DMatrix.rotationX(rx).m);
  _rot.set(D3DMatrix.rotationY(ry).m); mul4(_tmp, m, _rot); m.set(_tmp);
  _rot.set(D3DMatrix.rotationZ(rz).m); mul4(_tmp, m, _rot); m.set(_tmp);
}

// ---------------------------------------------------------------------------
// meshes
// ---------------------------------------------------------------------------
const BOX_INDICES = new Uint16Array([
  2, 6, 0, 6, 4, 0, 6, 7, 4, 7, 5, 4, 7, 3, 5, 3, 1, 5,
  3, 2, 1, 2, 0, 1, 0, 4, 1, 4, 5, 1, 3, 7, 2, 7, 6, 2,
]);
/** an 8-vertex box-topology mesh from an explicit vertex table */
function makeBoxTopology(rows) {
  const obj = createMesh(8, 12);
  for (let i = 0; i < 8; i++) {
    const b = i * 8, r = rows[i];
    obj.verts[b] = r[0]; obj.verts[b + 1] = r[1]; obj.verts[b + 2] = r[2];
    obj.vertsU32[b + 3] = r[3] >>> 0;
    obj.verts[b + 4] = r[4] || 0; obj.verts[b + 5] = r[5] || 0;
  }
  obj.indices.set(BOX_INDICES);
  return obj;
}

// FUN_0040607f — the 256x256 radial highlight (see eff_credits.js for the
// annotated version; duplicated here on purpose, no cross-effect coupling).
function makeRadialTexture(K, scale, flags) {
  const px = new Uint32Array(256 * 256);
  let p = 0;
  for (let y = -128; y < 128; y++) {
    for (let x = -128; x < 128; x++) {
      let i = Math.round((255.0 - 2.0 * Math.sqrt(x * x + y * y)) * scale);
      if (i > 0) i = (i * i) >> 8;
      if (i < 0) i = 0;
      if (i > 255) i = 255;
      px[p++] = (0xff000000 | (i << 16) | (i << 8) | i) >>> 0;
    }
  }
  return K.createTexture(px, 256, 256, flags);
}

// ---------------------------------------------------------------------------
// the 2 bpp font sheet (FUN_00404b10) + the glyph rectangle table.
//
// 0x0041a2b8 .. 0x0041b6d0 verbatim: 4992 bytes of 2-bit pixels (64 bytes =
// 256 pixels per row, 78 rows) followed by the 38x4-byte glyph box table at
// 0x0041b638. FUN_0040df90 samples the *expanded alpha plane* of this sheet
// on the CPU, which the kernel's font texture cannot give us, so the source
// bytes are embedded. Note the deliberate over-read: the 32nd iteration runs
// on the string's NUL terminator, index -97, which lands inside the pixel data
// and produces a garbage-but-deterministic 32nd glyph.
// ---------------------------------------------------------------------------
const FONT_B64 =
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH4' +
  'AAAAAAAAAAAAAAAAAAAAAAAAfh////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC+AAAAAAAAAAA' +
  'AAAAAAAAAAAAAL4v///////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAvgAAAAAAAAAAAAAAAAAAAAA' +
  'AAC+L////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKqqqqqqAL+qqqqqqAACqqqqqqqQCqqqqqq/i/VVVVV' +
  'VVQCqqqqqqqgCqqqqqqqgqAAAAAAGkqAAAAAAAAqAAAL//////8C///////8AD///////4D///////4vgAAAAAAAC///////' +
  '8B///////8PwAAAAAC+PwAAAAAAAPwAAL///////wv///////wD///////+D///////+L4AAAAAAAC////////B////////D' +
  '8AAAAAAvj8AAAAAAAD8AAH+qqqqqq/L+qqqqqq/D9VVVVVVVD+VVVVVVVC////////x/VVVVVVVR/VVVVVVVQ/qqqqqqv4/A' +
  'AAAAAAA/AAC+AAAAAAPy+AAAAAAPw/AAAAAAAA/AAAAAAAAv///////8vgAAAAAAAvgAAAAAAAP///////+PwAAAAAAAPwAA' +
  'vgAAAAAD8vgAAAAAD8PwAAAAAAAPwAAAAAAAL////////L4AAAAAAAL4AAAAAAAD////////j8AAAAAAAD8AAL4AAAAAA/L4' +
  'AAAAAA/D8AAAAAAAD8AAAAAAAC/VVVVVVVS+AAAAAAAC+AAAAAAAA/qqqqqqv4/AAAAAAAA/AAC+AAAAAAPy+AAAAAAPw/AA' +
  'AAAAAA/AAAAAAAAvgAAAAAAAvgAAAAAAAvgAAAAAD8PwAAAAAC+PwAAAAAAAPwAAvgAAAAAD8vgAAAAAD8PwAAAAAAAPwAAA' +
  'AAAAL4AAAAAAAL4AAAAAAAL4AAAAAA/D8AAAAAAvj8AAAAAAAD8AAL9VVVVVV/H8AAAAAB/D9AAAAAAAD9AAAAAAAB+AAAAA' +
  'AAC/AAAAAAAB/AAAAAAPw/AAAAAAL4/AAAAAAAA/AAC////////w////////Qf///////4f///////4P///////8v///////' +
  '8P///////0PwAAAAAC+Py////////QAAv///////8D///////QB///////+B///////+A////////L////////A///////0D' +
  '8AAAAAAvj8v///////QAAL////////AP//////QAH///////gH///////gD///////y////////wD//////0A/AAAAAAL4/L' +
  '///////QAAC+AAAAAAPwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAvgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'vgAAAAAD8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAL4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAL4AAAAAA/AA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC+AAAAAAAAAAAAAAAAAAAAAAAAAAfgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAL4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC+AAAAAAAAAAACoAAAAqqqSoAAAAAAAACqqqqqqgACqqqqqqgACqqqqq' +
  'qgAAqqqqqqoAAqqqqqqoAAqqqqqqqoP6qqqqqoAAAAA/AAAA///4/AAAAAAAAC///////AB///////AC///////AA///////' +
  'gA///////gAv///////B///////wAAAAPwAAB///+PwAAAAAAAC///////8B///////8C///////8A///////+A///////+A' +
  'v///////wH///////AAAAD8AAB/1VVD8AAAAAAAB/VVb9VVfx/qqqqqqvx/qqqqqqvw/qqqqqqv4/qqqqqqv4f1VVVVVVUAa' +
  'qqqqqr8AAAA/AAB/gAAA/AAAAAAAAvgAB/AAD8vgAAAAAD8vgAAAAAD8PwAAAAAC+PwAAAAAC+L4AAAAAAAAAAAAAAA/AAAA' +
  'PwAB/gAAAPwAAAAAAAL4AAfwAA/L4AAAAAA/L4AAAAAA/D8AAAAAAvj8AAAAAAvi+AAAAAAAAAAAAAAAPwAAAD+qq/1VVAD8' +
  'AAAAAAAC+AAH8AAPy+AAAAAAPy+AAAAAAPw/AAAAAAL4/AAAAAAL4vgAAAAAAAAAAAAAAD8AAAA///////9A/AAAAAAAAvgA' +
  'B/AAD8vgAAAAAD8vgAAAAAD8PwAAAAAC+PwAAAAAC+L4AAAAAAAAAAAAAAA/AAAAP///////0PwAAAAAAAL4AAfwAA/L4AAA' +
  'AAA/L4AAAAAA/D8AAAAAAvj8AAAAAAvi+AAAAAAAAAAAAAAAPwAAAD////////T9AAAAAAAC+AAH8AAPy+AAAAAAPx/AAAAA' +
  'Afw/QAAAAAL4/QAAAAAL4vgAAAAAAAAAAAAAAD8AAAA/AAAAAAL4////////4vgAB/AAD8vgAAAAAD8P///////0P///////' +
  '8H///////+L4AAAAAAAL///////9AAAAPwAAAAAC+P///////+L4AAfwAA/L4AAAAAA/A///////0D///////8Af///////i' +
  '+AAAAAAAC///////9AAAAD8AAAAAAvj////////i+AAH8AAPy+AAAAAAPwD//////0A///////8AB///////4vgAAAAAAAv/' +
  '/////9AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPwAAAAAAAAAAAAAAC+AAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD8AAAAAAAAAAAAAAAvgAAAAAAAAAAAAAAAAAAAAAB+AAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfgAAAAAAAAAAvgAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAL4AAAAAAAAAAL4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAvgAAAAAAAAC+AAAAAAAAAAC/qqqqqqqgqAAAAAAGkqgAAAAACqhpAACoAAKhqqAAA' +
  'AKqgqAAAAAAGkAqqqqqqv4aQCqqqqqq/iqqqqqqq/gAv///////8PwAAAAAC+H/AAAAAC/wvgAA/AAD8v/wAAAD/8PwAAAAA' +
  'C+A///////+L4D///////4////////4AL////////D8AAAAAAvgf8AAAAC/wL4AAPwAA/L/8AAAA//D8AAAAAAvg////////' +
  'i+D///////+P///////+AC/VVVVVVVQ/AAAAAAL4B/wAAAC/wC+AAD8AAPwVVAAAAFVQ/AAAAAAL4/lVVVVVVQvj+VVVVVVV' +
  'BVVVVVVV/gAvgAAAAAAAPwAAAAAC+AH/AAAC/wAvgAA/AAD8AAAAAAAAAPwAAAAAC+PwAAAAAAAL4/AAAAAAAAAAAAAAAL4A' +
  'L4AAAAAAAD8AAAAAAvgAf8AAC/wAL4AAPwAA/L////////D8AAAAAAvj8AAAAAAAC+PwAAAAAAAAAAAAAAC+AC+AAAAAAAA/' +
  'AAAAAAL4AB/wAC/wAC+AAD8AAPy////////w/AAAAAAL4/AAAAAAAAvj8AAAAAAAAAAAAAAAvgAvgAAAAAAAPwAAAAAC+AAH' +
  '/AC/wAAvgAA/AAD8v///////8PwAAAAAC+PwAAAAAAAL4/AAAAAAAAAAAAAAAL4AL4AAAAAAAD8AAAAAAvgAAf8C/wAAL4AA' +
  'PwAA/AAAAAAAAAD8AAAAAAvj8AAAAAAAC+PwAAAAAAAAAAAAAAC+AC+AAAAAAAA/QAAAAAL4AAB/y/wAAB+AAH8AAPwAAAAA' +
  'AAAA/QAAAAAL4/QAAAAAAAvj9AAAAAAAAAAAAAAAvgAvgAAAAAAAH///////8AAAH//wAAAP///////0v/wAAAD/8H//////' +
  '/+H///////+L4f///////4////////wAL4AAAAAAAAf//////8AAAAf/wAAAA///////0L/8AAAA//Af///////gf///////' +
  'i+B///////+P///////wAC+AAAAAAAAB//////8AAAAB/wAAAAD//////0C//AAAAP/wB///////4B///////4vgH///////' +
  'j///////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAvgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB+' +
  'AAAAAAAA/AAAAAAAAAAAAAAAAAB//////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAvgAAAAAAAPwA' +
  'AAAAAAAAAAAAAAAB///////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAL4AAAAAAAD8AAAAAAAAAAAA' +
  'AAAAB////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABpAAAAAAKg/qqqqqqgA/6qqqqqoAqqqqqqqoA/lVVVV' +
  'Vf4AqqqqqqoAAqqqqqqoAAAAAAAAAAAAAAAAAAAAAAAvgAAAAAD8H///////AP///////gP///////gPwAAAAAC+Av//////' +
  'wAv//////wALLAA/AAAAAAAAAAAAAAAAL4AAAAAA/Af//////8D///////+D///////+D8AAAAAAvgv///////Av///////A' +
  'CywAPwAAAAAAAAAAAAAAAC+AAAAAAPwBqqqqqqvw/qqqqqqv4VVVVVVVb4/AAAAAAL4f6qqqqqr8f6qqqqqr8P//wD8AAAAA' +
  'AAAAAAAAAAAvgAAAAAD8AAAAAAAD8PwAAAAAC+AAAAAAAC+PwAAAAAC+L4AAAAAA/L4AAAAAA/Cvvo///AAAAAAAAAAAAAAA' +
  'L4AAAAAA/AAAAAAAA/D8AAAAAAvgAAAAAAAvj////////i+AAAAAAPy+AAAAAAPwCywP//wAAAAAAAAAAAAAAC+AAAAAAPwA' +
  'AAAAAAPw/AAAAAAL4AAAAAAAL4////////4vgAAAAAD8vgAAAAAD8K+/yr+oAAAAAAAAAAAAAAAvgAAAAAD8AAAAAAAD8PwA' +
  'AAAAC+AAAAAAAC+P///////+L4AAAAAA/L4AAAAAA/CvvoA/AAAAAAAAAAAAAAAAL4AAAAAA/AAAAAAAA/D8AAAAAAvgAAAA' +
  'AAAvj9AAAAAAvi+AAAAAAPy+AAAAAAPwCywAPwAAAAAAAAAAAAAAAB+AAAAAAPwAAAAAAAPw/QAAAAAL4AAAAAAAL4/AAAAA' +
  'AL4f6qqqqqv8fwAAAAAH8AosAC4AAAAAAAAAAAAAAAAP///////8v///////0H///////8AAAAAAAC+PwAAAAAC+D///////' +
  '/D///////9AAAAAAAAAAAAAAAAAAAAAAA////////L///////0Af//////8AAAAAAAAvj8AAAAAAvgP///////wP//////9A' +
  'AAAAAAAAAAAAAAAAAAAAAAD///////y///////0AB//////8AAAAAAAAL4/QAAAAAL4A///////8A//////9AAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAD8AAAAAAAAAAAAAAAAAAAAAAAAAAAH///////8AAAAAAAA/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAA/AAAAAAAAAAAAAAAAAAAAAAAAAAAAf//////8AAAAAAAAPwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPwA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAB//////8AAAAAAAAD8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAaFBsANRQ3AFAUUgBrFG4AhhSIAKEUowC9FL4A2BTZAN0S3wD4EgEWGiQcFDUk' +
  'NxRRJFMUbCRtFIckiRaiJaQUvSW/FNgk2xT0JAElGzYdJTc2OCVUNlYlbzZxJ4o2jCWlNqcnwTalN75KwyXFNscl4DbiJfs2' +
  'AjcbSh03Nko4N1FKUzdsSm43iEqKN6NKwDfJSss30ko=';
const RECT_OFF = 0x41b638 - 0x41a2b8;            // 5024

const BANNER = 'threestate**in***lost***vegas**';

// FUN_0040df90's glyph pass, verbatim: sample the expanded 2 bpp alpha plane
// per banner character into a 64x64 tile, add 6 bits of noise per texel, and
// write the tile backwards so it ends up rotated 180 degrees.
function makeGlyphTextures(K) {
  const font = b64(FONT_B64);
  const alpha = new Uint8Array(256 * 256);          // FUN_00404b10's plane
  for (let row = 0; row < 78; row++) {
    for (let i = 0; i < 64; i++) {
      const byte = font[row * 64 + i];
      for (let k = 0; k < 4; k++) {
        alpha[row * 256 + i * 4 + k] = ((byte >> (6 - 2 * k)) & 3) * 0x55;
      }
    }
  }
  const rect = (idx) => {           // signed index — the NUL case over-reads
    const o = RECT_OFF + idx * 4;
    return [font[o], font[o + 1], font[o + 2], font[o + 3]];
  };

  const out = [];
  const buf = new Uint32Array(64 * 64);
  for (let ci = 0; ci < 32; ci++) {
    const ch = ci < BANNER.length ? BANNER[ci] : '\0';
    const idx = ch.charCodeAt(0) - 0x61;
    let x0 = 0, y0 = 0, w = 0, h = 0;
    if (ch !== '*') {
      const r = rect(idx);
      x0 = r[0]; y0 = r[1]; w = r[2] - x0; h = r[3] - y0;
    }
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        rnd();
        let a = 0;
        if (ch !== '*') {
          const gx = ((w / 2) | 0) - 32 + x;
          const gy = ((h / 2) | 0) - 32 + y;
          if (gx >= 0 && gx < w && gy >= 0 && gy < h) {
            a = alpha[(gy + y0) * 256 + gx + x0];
          }
        }
        a += rndHi6();
        if (a > 255) a = 255;
        // written backwards from the end of the buffer: the sheet ends up
        // rotated 180 degrees, exactly as in the original.
        buf[4095 - (y * 64 + x)] = (a * 0x01010101) >>> 0;
      }
    }
    out.push(K.createTexture(buf, 64, 64, 0));
  }
  return out;
}

// ---------------------------------------------------------------------------
export function makeScene(ctx, variant = 0) {
  const { K, d3d, textures } = ctx;

  // ---- state -------------------------------------------------------------
  let cam = null;                 // DAT_00510340
  let glyphTex = null;            // DAT_00510398 .. (32 handles)
  let radialA = null;             // DAT_005106a0  FUN_0040607f(1.0, 0)
  let radialB = null;             // DAT_00510350  FUN_0040607f(1.0, 8)
  let branchMesh = null;          // DAT_00510344
  let leafMesh = null;            // DAT_00510388
  let floorMesh = null;           // DAT_00510698
  let root = null;                // DAT_00510394
  let floorTex = null;            // DAT_00510370 = dr_64_finale

  let simMs = 0;                  // growth simulated so far, ms
  let texCounter = 0;             // DAT_0051038c

  // =========================================================================
  // FUN_0040df90 — the up-front generator
  // =========================================================================
  function init() {
    simMs = 0;
    if (cam) { resetGrowth(); return; }

    cam = createCamera(280, 20, 0, 0, 150, 0);

    // -- the 32 glyph textures ---------------------------------------------
    // The remastered atlas arrives pre-sliced into 32 tiles (main.js), each
    // already rotated 180 degrees the way FUN_0040df90 writes them, so it goes
    // up as-is with the same flags 0. Skipping the CPU generator also skips its
    // 32*64*64 rnd() draws, which is safe here: srand(0x839b7) below resets the
    // stream before anything else reads it.
    const hiGlyphs = textures && textures.proc_finale_glyphs;
    glyphTex = (hiGlyphs && hiGlyphs.length === 32)
      ? hiGlyphs.map((tile) => d3d.createTextureFromImage(tile, 0 | D3DTEX_MIPMAP))
      : makeGlyphTextures(K);

    radialA = textures && textures.proc_radial_k100
      ? d3d.createTextureFromImage(textures.proc_radial_k100, 0 | D3DTEX_MIPMAP)
      : makeRadialTexture(K, 1.0, 0);
    radialB = textures && textures.proc_radial_k100
      ? d3d.createTextureFromImage(textures.proc_radial_k100, 8 | D3DTEX_MIPMAP)
      : makeRadialTexture(K, 1.0, 8);

    // -- the branch box: 100 x 80 x 40, design yellow ----------------------
    branchMesh = makeBoxTopology([
      [-50, 0, -20, 0xffd7b45a], [50, 0, -20, 0xffd7b45a],
      [-50, 80, -20, 0xffd7b45a], [50, 80, -20, 0xffd7b45a],
      [-50, 0, 20, 0xffd7b45a], [50, 0, 20, 0xffd7b45a],
      [-50, 80, 20, 0xffd7b45a], [50, 80, 20, 0xffd7b45a],
    ]);

    // -- the leaf "picture frame": a big front face at z=20 and a smaller one
    //    at z=30, uv 0..1 outside and 0.12..0.88 inside.
    leafMesh = makeBoxTopology([
      [-45, 5, 20, 0xffffffff, 0, 0], [45, 5, 20, 0xffffffff, 1, 0],
      [-45, 75, 20, 0xffffffff, 0, 1], [45, 75, 20, 0xffffffff, 1, 1],
      [-35, 15, 30, 0xffffffff, 0.12, 0.12], [35, 15, 30, 0xffffffff, 0.88, 0.12],
      [-35, 65, 30, 0xffffffff, 0.12, 0.88], [35, 65, 30, 0xffffffff, 0.88, 0.88],
    ]);

    // -- the tree ----------------------------------------------------------
    srand(0x839b7);                                   // FUN_00403ba0
    root = newNode(null);
    root.m.set(IDENT);
    root.x = root.y = root.z = 0;
    root.scale = 1.0;
    // The generator allocates the trunk base as root's slot 0 but explicitly
    // writes NULL into its *parent* link (`*(ch0+0x58) = 0`) before calling
    // FUN_0040d890 on it — which is what selects that function's root case.
    root.ch[0] = newNode(null);
    buildTree(root.ch[0], 1);                          // FUN_0040d890
    armGrowth(root);                                   // FUN_0040de40

    // -- the ground --------------------------------------------------------
    // REMASTER (additive, behind K.tess): the ground is not a plane but a
    // crater — height is |cell - centre|^2 — so the 125-unit cells are plainly
    // visible as facets along the rim silhouette. `t` splits every cell into
    // t x t, evaluating the SAME height function at the finer positions.
    //
    // t = 1 reproduces the original array sizes, index layout and float values
    // exactly (125.0/1, fj/1 and the lerp weights 1.0/0.0 are all exact).
    // Cap 12: the index buffer is u16 and nFaces is masked to 16 bits by
    // createMesh, and 0x1c2 * 12^2 = 64800 is the last multiplier that fits.
    const t = Math.max(1, Math.min(12, Math.floor(K.tess || 1)));
    const G = 15 * t + 1;                              // grid points per axis
    const t2 = t * t;
    floorMesh = createMesh(G * G, 0x1c2 * t2);
    // The 256 PRNG draws stay on the shared stream in their original order and
    // count — the fine vertices bilinearly interpolate this same 16x16 field,
    // so the bumps keep their original amplitude AND spatial frequency (a
    // per-fine-vertex draw would have turned the crater into t-times
    // higher-frequency noise, which is a different surface, not a smoother one).
    const R = new Float32Array(256);
    // `d < 2` flattens the crater floor. That is a STEP in the height field:
    // the original only ever samples it at cell centres, so the drop lands as
    // one cell's worth of slope. Sampled t times finer it becomes a literal
    // vertical cliff ringing the camera (measured: a visible chevron ridge
    // across the near ground). Carrying the cut as a 0/1 field interpolated on
    // the COARSE grid keeps the transition exactly one cell wide, as drawn.
    const gate = new Float32Array(256);
    for (let i = 0; i < 16; i++) {
      for (let j = 0; j < 16; j++) {
        R[i * 16 + j] = rnd();
        gate[i * 16 + j] =
          Math.sqrt((j - 8) * (j - 8) + (i - 8) * (i - 8)) < 2.0 ? 0.0 : 1.0;
      }
    }
    const bilerp = (F, u, v) => {                      // u = column, v = row
      const j0 = Math.min(15, Math.floor(u)), i0 = Math.min(15, Math.floor(v));
      const j1 = Math.min(15, j0 + 1), i1 = Math.min(15, i0 + 1);
      const fu = u - j0, fv = v - i0;
      const a = F[i0 * 16 + j0] * (1 - fu) + F[i0 * 16 + j1] * fu;
      const c = F[i1 * 16 + j0] * (1 - fu) + F[i1 * 16 + j1] * fu;
      return a * (1 - fv) + c * fv;
    };
    const V = floorMesh.verts, C = floorMesh.vertsU32;
    const step = 125.0 / t;
    for (let fi = 0; fi < G; fi++) {
      const gi = fi / t;                               // position in cell units
      const z = fi * step - 1000.0;
      for (let fj = 0; fj < G; fj++) {
        const gj = fj / t;
        const b = (fi * G + fj) * 8;
        V[b] = fj * step - 1000.0;
        V[b + 2] = z;
        C[b + 3] = 0xffffffff;
        V[b + 4] = gj; V[b + 5] = gi;                  // uv = cell index, WRAP
        const d = Math.sqrt((gj - 8) * (gj - 8) + (gi - 8) * (gi - 8));
        const r = bilerp(R, gj, gi);
        // the `if (d < 2.0) y = 0.0` of the original IS `gate` — zero at every
        // coarse vertex inside the floor, so t = 1 gives the same values
        const y = d * d * 6.0 * (r * (1 / 32767) * 0.25 + 0.75) * bilerp(gate, gj, gi);
        V[b + 1] = y;
      }
    }
    // Index writes use a 0xc0-byte row stride but only fill 0xb4 of it, and
    // the buffer is only 0x1c2*3 shorts: the original overruns its allocation
    // by 84 shorts. Typed-array writes past the end are dropped, which
    // reproduces exactly the triangles the original actually draws (rows 0..13
    // complete, one quad of row 14, the rest degenerate zeroes).
    // Scaling the row stride, the per-cell block and the buffer all by t^2
    // keeps that truncation landing in exactly the same place: cell (14, 0)
    // still ends flush with the end of the buffer and (14, 1) onwards is still
    // dropped, so the missing far row survives tessellation.
    const I = floorMesh.indices;
    const put = (k, v) => { if (k < I.length) I[k] = v; };
    for (let i = 0; i < 15; i++) {
      for (let j = 0; j < 15; j++) {
        let o = (i * 96 + j * 6) * t2;                 // 0xc0 / 2, 0xc / 2
        for (let a = 0; a < t; a++) {
          for (let c = 0; c < t; c++) {
            const v00 = (i * t + a) * G + (j * t + c);
            const v10 = v00 + G;
            put(o, v00);
            put(o + 1, v00 + 1);
            put(o + 2, v10 + 1);
            put(o + 3, v10 + 1);
            put(o + 4, v10);
            put(o + 5, v00);
            o += 6;
          }
        }
      }
    }

    floorTex = textures && textures.dr_64_finale ? textures.dr_64_finale : null;
  }

  // =========================================================================
  // FUN_0040d890 — grow the L-system
  //
  // Each node hangs off one of its parent's four slots; the slot decides both
  // the sign `c` and which of two joint types is used:
  //   slot 0/1 -> rot (0, 0, -0.73c)      offset (50c, 80, 0) * parentScale
  //   slot 2/3 -> rot (-0.73c, 0.2, 0)    offset (0, 80, -20c) * parentScale
  // The node's frame is parentFrame * localRot (3x3 only) and its position is
  // parentPos + offset * parentFrame. Scale decays 0.8 per level; slots 0..2
  // spawn with probability 25000/32768 and slot 3 continues the trunk, both
  // capped at depth 7.
  //
  // A parent-less node takes the root path instead: identity frame, (0, 80, 0),
  // scale 1, and all four children unconditionally. The caller hands us exactly
  // one such node (the trunk base), so the trunk leaves the ground vertically.
  // =========================================================================
  const TREE_K = 0.73;                               // _DAT_005106b8

  function newNode(parent) {
    return {
      x: 0, y: 0, z: 0,
      m: new Float32Array(16),
      scale: 0, target: 0, cur: 0, rate: 0, tex: 0,
      ch: [null, null, null, null],
      parent,
    };
  }

  function buildTree(node, depth) {
    let d = depth + 1;
    for (;;) {
      const p = node.parent;

      // ---- the root case (`if ([edi+0x58] == 0)` at 0x40d8a6) --------------
      // The trunk base is not hung off a joint at all: it gets the identity
      // frame, stands at (0, 80, 0) with scale 1, and spawns all four children
      // *unconditionally* — no PRNG draw is spent on those four decisions, only
      // the one for `tex`. Missing this was the whole bug: the base was being
      // treated as its parent's slot 0, i.e. rotZ(+0.73), which tipped the
      // entire tree ~42 degrees sideways at the ground and left it a single
      // one-armed chain instead of a four-way crown.
      if (!p) {
        node.m.set(IDENT);
        node.x = 0.0; node.y = 80.0; node.z = 0.0;   // 0x42a00000
        node.scale = 1.0;
        node.tex = rnd() & 0x1f;
        node.ch[0] = node.ch[1] = node.ch[2] = node.ch[3] = null;
        for (let k = 0; k < 3; k++) {
          node.ch[k] = newNode(node);
          buildTree(node.ch[k], d);
        }
        node.ch[3] = newNode(node);
        d = d + 1;                                   // `inc esi`
        node = node.ch[3];
        continue;
      }

      let c = 0, flag = 0;
      if (node === p.ch[0]) { c = -1; flag = 1; }
      if (node === p.ch[1]) { c = 1; flag = 1; }
      if (node === p.ch[2]) { c = -1; flag = 0; }
      if (node === p.ch[3]) { c = 1; flag = 0; }

      if (flag) rotXYZ(node.m, 0, 0, -(TREE_K * c));
      else rotXYZ(node.m, -(TREE_K * c), 0.2, 0);
      mul3(_tmp, p.m, node.m);
      node.m.set(_tmp);

      let ox, oy, oz;
      if (flag) { ox = c * p.scale * 50.0; oy = p.scale * 80.0; oz = 0.0; }
      else { ox = 0.0; oy = p.scale * 80.0; oz = c * p.scale * -20.0; }
      const P = p.m;
      node.x = p.x + ox * P[0] + oy * P[4] + oz * P[8];
      node.y = p.y + ox * P[1] + oy * P[5] + oz * P[9];
      node.z = p.z + ox * P[2] + oy * P[6] + oz * P[10];
      node.scale = p.scale * 0.8;                    // qword 0x4127f0

      node.tex = rnd() & 0x1f;
      node.ch[0] = node.ch[1] = node.ch[2] = node.ch[3] = null;

      for (let k = 0; k < 3; k++) {
        if (rnd() < 25000 && d < 7) {
          node.ch[k] = newNode(node);
          buildTree(node.ch[k], d);
        }
      }
      if (rnd() >= 25000 || d > 6) return;
      node.ch[3] = newNode(node);
      d = d + 1;
      node = node.ch[3];
    }
  }

  /** FUN_0040de40 — post-order: move the built scale to `target`, zero `cur`,
   *  pick a growth rate in [0.01, 0.03]. */
  function armGrowth(n) {
    if (!n) return;
    for (let k = 0; k < 4; k++) if (n.ch[k]) armGrowth(n.ch[k]);
    n.target = n.scale;
    n.cur = 0;
    n.rate = rnd() * (1 / 32767) * 0.02 + 0.01;
  }
  /** re-arm without touching the PRNG (used when the debug clock rewinds) */
  function resetGrowth(n) {
    n = n || root;
    if (!n) return;
    n.cur = 0;
    for (let k = 0; k < 4; k++) if (n.ch[k]) resetGrowth(n.ch[k]);
  }

  /** FUN_0040df20 — a node only starts growing once its parent is finished. */
  function advanceGrowth(n, dt) {
    while (n) {
      if (n.target <= n.cur) {
        advanceGrowth(n.ch[0], dt);
        advanceGrowth(n.ch[1], dt);
        advanceGrowth(n.ch[2], dt);
        n = n.ch[3];
        continue;
      }
      const v = n.rate * n.target * dt + n.cur;
      n.cur = v > n.target ? n.target : v;
      return;
    }
  }

  // =========================================================================
  // FUN_0040ead0 / FUN_0040e960 / FUN_0040ea00 — walk and draw
  // =========================================================================
  function drawTree(n, mode) {
    if (!n) return;
    drawTree(n.ch[0], mode); drawTree(n.ch[1], mode);
    drawTree(n.ch[2], mode); drawTree(n.ch[3], mode);
    if (mode === 0) drawBranch(n);
    else drawLeaf(n);
  }

  function drawBranch(n) {
    if (n.cur === 0) return;                        // `if (scale != 0.0)`
    branchMesh.m.set(n.m);
    branchMesh.px = n.x; branchMesh.py = n.y; branchMesh.pz = n.z;
    scaleInPlace(branchMesh.m, n.cur);
    K.meshEnvMapUV(branchMesh, cam, 1.0, 1);
    K.drawMesh(branchMesh);
  }

  function drawLeaf(n) {
    if (n.cur === 0) return;
    leafMesh.m.set(n.m);
    leafMesh.px = n.x; leafMesh.py = n.y; leafMesh.pz = n.z;
    scaleInPlace(leafMesh.m, n.cur);
    K.setTextureHandle(glyphTex[(texCounter + n.tex) & 0x1f], radialB);
    d3d.setStage1Op(2);                             // stage 1 MODULATE
    K.meshEnvMapUV(leafMesh, cam, 1.0, 0);          // env map into set 1 only
    K.drawMesh(leafMesh);
  }

  // =========================================================================
  // FUN_0040eb90
  // =========================================================================
  function render(pos, extra) {
    if (!cam) init();
    // _DAT_0051069c / DAT_00510348 are latched by the original at the scene
    // start and at the 0x1900 crossing; both intervals are reconstructed here
    // from the music position, so every frame is a pure function of `pos`.
    const rowFrac = (extra && typeof extra.rowFrac === 'number') ? extra.rowFrac : 0;
    const el = sceneMs(pos, SCENE_POS0, rowFrac);
    const now = (extra && extra.ms > 0) ? extra.ms : el;   // free-running phase

    d3d.SetTextureStageState(0, D3DTSS_MAGFILTER, D3DTFG_POINT);
    d3d.SetTextureStageState(0, D3DTSS_MINFILTER, D3DTFN_POINT);
    d3d.setCullMode(2);                              // FUN_0040484a(3,2) = CW
    d3d.clearColor = 0xff7dafc8;
    d3d.enableFog(0xff7dafc8, 0.003);                // 0x3b449ba6
    // the credits scene exits with blending off; make that explicit so a cold
    // jump into this position renders identically.
    d3d.setAlphaBlend(0);

    texCounter = Math.round(el * 0.01);              // qword 0x412760

    // camera: a 7 s cross-fade between two flight paths (qword 0x412828)
    let f = el * 0.00014285714285714287;
    if (f < 0) f = 0; else if (f > 1) f = 1;
    const g = 1.0 - f;
    cam.fov = 135.0;
    cam.ex = Math.cos(now * 0.0014285714) * 125.0 * g
           + Math.sin(now * 0.001) * 125.0 * f;
    cam.ey = g * 40.0 + (Math.cos(now * 0.00125) * 35.0 + 40.0) * f;
    cam.ez = g * -300.0 + f * 100.0;
    cam.ax = 0; cam.ay = 150; cam.az = 0;
    K.setCamera(cam);

    // ---- the tree -------------------------------------------------------
    if (pos >= GROW_POS && pos < END_POS) {
      // Growth is an integration (_DAT_0051034c = frame_dt_ms / 30), so it is
      // carried incrementally; the target is the music time since 0x1700, and
      // the state rewinds and replays if the caller seeks backwards. Growth is
      // linear in dt except at the parent -> child hand-over, so the fixed
      // 16 ms step matches the original's per-frame delta closely.
      let want = sceneMs(pos, GROW_POS, rowFrac);
      if (want > GROW_MAX) want = GROW_MAX;
      if (want < simMs) { resetGrowth(); simMs = 0; }
      while (simMs < want) {
        const step = Math.min(16, want - simMs);
        advanceGrowth(root, step * (1 / 30));
        simMs += step;
      }

      d3d.setStage1Op(0);
      K.setTextureHandle(radialA);
      drawTree(root, 0);                             // gold branch boxes
      drawTree(root, 1);                             // glyph leaf frames
    }

    // ---- the ground -----------------------------------------------------
    d3d.SetTextureStageState(0, D3DTSS_MAGFILTER, D3DTFG_LINEAR);
    d3d.SetTextureStageState(0, D3DTSS_MINFILTER, D3DTFN_LINEAR);
    d3d.setStage1Op(0);
    K.setTextureHandle(floorTex);
    K.drawMesh(floorMesh);

    if (pos < HOLD_POS) return;

    // ---- the outro ------------------------------------------------------
    d3d.setCullMode(0);
    K.setTextureHandle(null);
    d3d.setAlphaBlend(1);
    d3d.SetRenderState(D3DRS_SRCBLEND, D3DBLEND_SRCALPHA);
    d3d.SetRenderState(D3DRS_DESTBLEND, D3DBLEND_INVSRCALPHA);

    // full-screen wash: opaque sky blue over 2 s, then to black over the next
    // 2 s starting 10 s in.  (qword 0x412598 = 0.0005, 0x412818 = 5.0)
    const hold = sceneMs(pos, HOLD_POS, rowFrac);
    const te = hold * 0.0005;
    let rgb = 0x7dafc8;
    if (te > 5.0) {
      let u = te - 5.0;
      if (u > 1.0) u = 1.0; else if (u < 0.0) u = 0.0;
      u = 1.0 - u;
      rgb = (Math.round(u * 125.0) << 16) + (Math.round(u * 175.0) << 8)
          + Math.round(u * 200.0);
    }
    let av = te; if (av < 0) av = 0; else if (av > 1) av = 1;
    const col = ((Math.round(av * 255.0) << 24) + rgb) >>> 0;
    const w = (x, y) => [x, y, 0.01, 100.0, col, 0, 0, 0, 0];
    K.drawTri2D(w(0, 0), w(640, 0), w(640, 480));
    K.drawTri2D(w(640, 480), w(0, 480), w(0, 0));

    // the end credits, black, centred on x = 320, one per second
    // (qword 0x412810 = 1/3000)
    const name = (s, y, off) => {
      let t = (hold - off) * (1 / 3000);
      if (t < 0) t = 0; else if (t > 1) t = 1;
      K.drawText(s, 320, y, 256, (Math.round(t * 255.0) << 24) >>> 0);
    };
    name('sagacity', 190, 4000);
    name('sarix', 220, 5000);
    name('stevie', 250, 6000);
    name('distance', 280, 7000);
  }

  return { init, render };
}

const IDENT = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

function b64(s) {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
