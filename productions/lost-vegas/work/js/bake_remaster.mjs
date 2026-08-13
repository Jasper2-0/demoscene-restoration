#!/usr/bin/env node
/*
 * bake_remaster.mjs — the "Lost Vegas" texture remaster layer.
 *
 *   node productions/lost-vegas/work/js/bake_remaster.mjs [--exe=PATH] [--out=DIR] [--scale=4]
 *                                     [--only=dr,sheets,proc] [--alpha8] [--quiet]
 *
 * STRICTLY ADDITIVE.  Nothing here touches the authentic pipeline: the 1x
 * assets in web/assets/ are still produced, byte for byte, by bake_dr.mjs,
 * and `?quality=original` never loads anything this script writes.
 *
 * The intro's imagery comes from three different places and each needs a
 * different technique.  Nothing below invents detail; every output is either
 * the same closed-form maths evaluated on a finer lattice, the correct
 * band-limited reconstruction of a signal that was already stored, or — for
 * the embedded type — the ORIGINAL OUTLINES re-rasterised at the higher
 * resolution from the same typeface the designer used.
 *
 *  1. PROCEDURAL  — the CPU generators (radial falloff, the 16-texel grid
 *     floor, the grid-line post-pass on the two DR panel sheets, the finale's
 *     32 per-glyph noise textures).  Re-evaluated at S times the resolution on
 *     a lattice that CONTAINS the original one, so every original sample is
 *     reproduced exactly and the added samples are the real function in
 *     between.  The finale textures mix a random lattice into the image; that
 *     lattice is pinned to the original 64x64 sample points and bilinearly
 *     reconstructed, so the noise is interpolated, never re-drawn.
 *
 *  2. MPEG        — the four "DR design generator" images are MPEG-1 I-frames.
 *     Each 8x8 DCT block is zero-padded to 8S x 8S and inverse-transformed at
 *     that size (see dr.mjs idctScaled).  That is the exact dual of libjpeg's
 *     scaled decoding and the mathematically correct band-limited
 *     reconstruction of what the encoder stored.  The authentic full-range
 *     JFIF colour coefficients (1.402 / 1.772) are kept.
 *
 *  3. BITMAP SHEETS — four 1/2-bpp sheets flattened into .data at build time.
 *     Two of them are pure SHAPES (a bracket and a bomb): those are upscaled
 *     as hard-edged vector-style masks via a signed distance field recovered
 *     from the source coverage.  The other two carry TYPE, which was
 *     identified as Verdana (see TYPE below) and is therefore re-rasterised
 *     from the real outlines at S times the size — genuine new detail, from
 *     the same source the designer used.
 *
 * TYPE IDENTIFICATION (evidence in the report; harness in scratch)
 * ---------------------------------------------------------------
 * Matching was done on grayscale COVERAGE (mean |Δ| per texel, 0..255) with a
 * sub-pixel placement search, over Arial/Arial Bold/Arial Black/Arial Narrow/
 * Tahoma/Verdana/Trebuchet/Impact/Courier/Comic Sans/Georgia/Helvetica:
 *
 *   "legend"                     Verdana Bold 16px   MAE  6.59  IoU 0.959
 *                                (Arial Black 16.5px MAE 12.30  IoU 0.843)
 *   "domage ... elitegroup"      Verdana      8.5px  MAE 14.10  (+0.5px track)
 *   "<description of effect>..." Verdana      10px   MAE 15.63  (+1px track)
 *   "watch and learn"            Verdana      10px   MAE 13.82  (+1px track)
 *
 * Verdana wins every sample, by a wide margin on the two large ones.  All five
 * group names solve to a single shared baseline (y = 71.4), which is a good
 * independent check that the fit is real and not curve-fitting noise.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { runDR, applyGridLines, decodeFontAtlas } from './dr.mjs';
import { encodePng, mapPe } from './bakelib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const workLv = path.resolve(here, '..');       // productions/lost-vegas/work
const prod = path.resolve(workLv, '..');       // productions/lost-vegas

let exePath = path.join(workLv, 'unpacked', '3s-vegas-u.exe');
let outDir = path.join(prod, 'web', 'assets', 'remaster');
let S = 4;
let only = null;
let quiet = false;
let alpha8 = false;          // keep 8-bit alpha instead of re-quantising to 2 bits
for (const a of process.argv.slice(2)) {
  let m;
  if ((m = a.match(/^--exe=(.+)$/))) exePath = m[1];
  else if ((m = a.match(/^--out=(.+)$/))) outDir = m[1];
  else if ((m = a.match(/^--scale=(\d+)$/))) S = parseInt(m[1], 10);
  else if ((m = a.match(/^--only=(.+)$/))) only = new Set(m[1].split(','));
  else if (a === '--alpha8') alpha8 = true;
  else if (a === '--quiet') quiet = true;
  else { console.error(`unknown argument: ${a}`); process.exit(2); }
}
const want = (k) => !only || only.has(k);
const log = (...a) => { if (!quiet) console.log(...a); };

const exe = fs.readFileSync(exePath);
const pe = mapPe(exe);
fs.mkdirSync(outDir, { recursive: true });

/* ------------------------------------------------------------------ *
 * node-canvas lives in the verify/tools installs, not next to this file
 * ------------------------------------------------------------------ */
let canvasPkg = null;
for (const root of [path.join(workLv, 'verify'), path.resolve(prod, '../ptct/work/js')]) {
  try { canvasPkg = createRequire(path.join(root, 'x.cjs'))('canvas'); break; } catch { /* next */ }
}

/* =================================================================== *
 * Reporting helpers
 * =================================================================== */

function stats(rgba, n, withAlpha = false) {
  const mn = [255, 255, 255, 255], mx = [0, 0, 0, 0], su = [0, 0, 0, 0];
  const nc = withAlpha ? 4 : 3;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < nc; c++) {
      const v = rgba[i * 4 + c];
      if (v < mn[c]) mn[c] = v;
      if (v > mx[c]) mx[c] = v;
      su[c] += v;
    }
  }
  return { min: mn.slice(0, nc), max: mx.slice(0, nc), mean: su.slice(0, nc).map((v) => v / n) };
}

const fmtStats = (s) => s.min.map((_, c) =>
  `${'RGBA'[c]} ${s.min[c]}..${s.max[c]} mean ${s.mean[c].toFixed(2)}`).join('  ');

/** Box-downsample an S-times image and report per-channel mean/max |Δ| vs 1x. */
function downsampleDiff(hi, W, H, s, ref, channels = 3, chOff = 0) {
  const sum = [0, 0, 0, 0], mx = [0, 0, 0, 0];
  const n = W * H, inv = 1 / (s * s);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      for (let k = 0; k < channels; k++) {
        const c = k + chOff;
        let a = 0;
        for (let j = 0; j < s; j++) {
          const row = (y * s + j) * W * s;
          for (let i = 0; i < s; i++) a += hi[(row + x * s + i) * 4 + c];
        }
        const e = Math.abs(a * inv - ref[(y * W + x) * 4 + c]);
        sum[k] += e;
        if (e > mx[k]) mx[k] = e;
      }
    }
  }
  return { mean: sum.slice(0, channels).map((v) => v / n), max: mx.slice(0, channels) };
}

const fmtDiff = (d) =>
  `mean |Δ| ${d.mean.map((v) => v.toFixed(3)).join(' / ')}  max ${d.max.map((v) => v.toFixed(2)).join(' / ')}`;

const REPORT = [];
function record(name, w, h, rgba, extra = '', withAlpha = false) {
  const st = stats(rgba, w * h, withAlpha);
  REPORT.push({ name, w, h, st, extra });
  log(`  ${name.padEnd(26)} ${String(w).padStart(4)}x${String(h).padEnd(4)}  ${fmtStats(st)}` +
      `${extra ? '\n' + ' '.repeat(30) + extra : ''}`);
}

/* =================================================================== *
 * Signed distance fields — for the hard-edged 1/2-bpp SHAPE sheets
 * =================================================================== */

const INF = 1e20;

/** 1-D squared EDT (Felzenszwalb & Huttenlocher). */
function edt1d(f, d, v, z, n) {
  let k = 0;
  v[0] = 0; z[0] = -INF; z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++; v[k] = q; z[k] = s; z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
}

/** 2-D squared EDT of a binary mask (1 = seed). */
function edt2d(mask, W, H) {
  const g = new Float64Array(W * H);
  for (let i = 0; i < W * H; i++) g[i] = mask[i] ? 0 : INF;
  const n = Math.max(W, H);
  const f = new Float64Array(n), d = new Float64Array(n);
  const v = new Int32Array(n + 1), z = new Float64Array(n + 2);
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) f[y] = g[y * W + x];
    edt1d(f, d, v, z, H);
    for (let y = 0; y < H; y++) g[y * W + x] = d[y];
  }
  for (let y = 0; y < H; y++) {
    const o = y * W;
    for (let x = 0; x < W; x++) f[x] = g[o + x];
    edt1d(f, d, v, z, W);
    for (let x = 0; x < W; x++) g[o + x] = d[x];
  }
  return g;
}

/**
 * Recover a signed distance field from an anti-aliased coverage sheet.
 *
 * `cov` is W x H coverage in [0,1] sampled at texel centres.  The implied
 * shape is the 0.5-coverage isocontour; for the straight edges and right
 * angles of this artwork that IS the original outline, because the 2-bit
 * alpha carries the sub-texel edge position.  Nothing is guessed.
 *
 * Returns { d, W: W*scale, H: H*scale } with `d` in ORIGINAL texel units,
 * positive inside.
 */
function sdfFromCoverage(cov, W, H, scale, sub = 4, margin = 6) {
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (cov[y * W + x] > 0) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  const OW = W * scale, OH = H * scale;
  const out = new Float32Array(OW * OH).fill(-INF);
  if (x1 < 0) return { d: out, W: OW, H: OH };

  x0 = Math.max(0, x0 - margin); y0 = Math.max(0, y0 - margin);
  x1 = Math.min(W - 1, x1 + margin); y1 = Math.min(H - 1, y1 + margin);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;

  const F = scale * sub;
  const mw = cw * F, mh = ch * F;
  const mask = new Uint8Array(mw * mh);
  const at = (xx, yy) => (xx < 0 || yy < 0 || xx >= W || yy >= H) ? 0 : cov[yy * W + xx];
  for (let my = 0; my < mh; my++) {
    const py = y0 + (my + 0.5) / F - 0.5;
    const jy = Math.floor(py), fy = py - jy;
    for (let mx = 0; mx < mw; mx++) {
      const px = x0 + (mx + 0.5) / F - 0.5;
      const jx = Math.floor(px), fx = px - jx;
      const c = at(jx, jy) * (1 - fx) * (1 - fy) + at(jx + 1, jy) * fx * (1 - fy)
              + at(jx, jy + 1) * (1 - fx) * fy + at(jx + 1, jy + 1) * fx * fy;
      /* Corner fix, per QUADRANT.  A separable interpolant of a step corner is
       * a product, so thresholding it alone chamfers every convex right angle
       * by ~0.29 texels.  A fully covered texel whose two neighbours on this
       * side are both fully empty IS a right angle, so its quadrant is solid
       * (and the mirror case for a notch).  45-degree cuts and partially
       * covered edge texels are left to the interpolant, which is where the
       * sub-texel edge position lives — a blanket "coverage 1 means solid"
       * rule instead re-introduces staircases along the diagonals. */
      const hx = x0 + ((mx / F) | 0), hy = y0 + ((my / F) | 0);
      const home = at(hx, hy);
      const qx = (mx % F) * 2 < F ? -1 : 1, qy = (my % F) * 2 < F ? -1 : 1;
      const nx = at(hx + qx, hy), ny = at(hx, hy + qy);
      let m = c >= 0.5 ? 1 : 0;
      if (home >= 1 && nx <= 0 && ny <= 0) m = 1;
      else if (home <= 0 && nx >= 1 && ny >= 1) m = 0;
      mask[my * mw + mx] = m;
    }
  }

  const invm = new Uint8Array(mw * mh);
  for (let i = 0; i < mw * mh; i++) invm[i] = mask[i] ? 0 : 1;
  const dIn = edt2d(invm, mw, mh);
  const dOut = edt2d(mask, mw, mh);
  const sd = new Float32Array(mw * mh);
  for (let i = 0; i < mw * mh; i++) {
    sd[i] = mask[i] ? Math.sqrt(dIn[i]) - 0.5 : -(Math.sqrt(dOut[i]) - 0.5);
  }

  for (let Y = 0; Y < OH; Y++) {
    const my = (Y - y0 * scale + 0.5) * sub - 0.5;
    if (my < -1 || my > mh) continue;
    const iy = Math.floor(my), ty = my - iy;
    for (let X = 0; X < OW; X++) {
      const mx = (X - x0 * scale + 0.5) * sub - 0.5;
      if (mx < -1 || mx > mw) continue;
      const ix = Math.floor(mx), tx = mx - ix;
      const gq = (xx, yy) => sd[Math.min(mh - 1, Math.max(0, yy)) * mw
                              + Math.min(mw - 1, Math.max(0, xx))];
      const v = gq(ix, iy) * (1 - tx) * (1 - ty) + gq(ix + 1, iy) * tx * (1 - ty)
              + gq(ix, iy + 1) * (1 - tx) * ty + gq(ix + 1, iy + 1) * tx * ty;
      out[Y * OW + X] = v / F;
    }
  }
  return { d: out, W: OW, H: OH };
}

/** SDF -> ideal box-filtered coverage on the OUTPUT grid (one-texel edge). */
function sdfCoverage(sdf, scale) {
  const { d, W, H } = sdf;
  const cov = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const a = 0.5 + d[i] * scale;
    cov[i] = a < 0 ? 0 : a > 1 ? 1 : a;
  }
  return cov;
}

/* =================================================================== *
 * 2. The four DR (MPEG-1) textures
 * =================================================================== */

const DR = [
  { name: 'dr_256_grid_panels', addr: 0x0041ba9c, len: 2632, w: 256, h: 256, grid: 8 },
  { name: 'dr_64_grid_small',   addr: 0x0041c4e8, len: 3062, w: 64,  h: 64,  grid: 4 },
  { name: 'dr_64_envmap',       addr: 0x0041d0e4, len: 3724, w: 64,  h: 64,  grid: 0 },
  { name: 'dr_64_finale',       addr: 0x0041df74, len: 3067, w: 64,  h: 64,  grid: 0 },
];

function bakeDR() {
  log(`\n== MPEG-1 I-frames: DCT-domain upsampling to ${S}x ==`);
  for (const t of DR) {
    const bytes = new Uint8Array(pe.read(t.addr, t.len + 64));
    const lo = runDR(bytes, { width: t.w, height: t.h });        // authentic 1x
    if (t.grid) applyGridLines(lo, t.grid);
    const hi = runDR(bytes, { width: t.w, height: t.h, scale: S });
    /* the grid-line post-pass (FUN_00409bb0) is PROCEDURAL, so it is
     * regenerated on the finer lattice rather than upscaled */
    if (t.grid) applyGridLines(hi, t.grid, S);
    fs.writeFileSync(path.join(outDir, `${t.name}.png`), encodePng(hi.width, hi.height, hi.rgba));
    record(t.name, hi.width, hi.height, hi.rgba,
      `box-downsample vs authentic 1x decode: ${fmtDiff(downsampleDiff(hi.rgba, t.w, t.h, S, lo.rgba))}`);
  }
}

/* =================================================================== *
 * 3. The four embedded bitmap sheets
 * =================================================================== */

const FONT_ADDR = 0x0041a2b8, FONT_END = 0x0041b638;

/* Verdana, the typeface identified in every type-bearing sheet. */
const VERDANA = '/System/Library/Fonts/Supplemental/Verdana.ttf';
const VERDANA_BOLD = '/System/Library/Fonts/Supplemental/Verdana Bold.ttf';
let typeReady = false;
function ensureType() {
  if (typeReady) return canvasPkg !== null;
  typeReady = true;
  if (!canvasPkg) { console.error('  !! node-canvas not found — type sheets will be SDF-upscaled instead'); return false; }
  try {
    canvasPkg.registerFont(VERDANA, { family: 'RM_Verdana', weight: 'normal' });
    canvasPkg.registerFont(VERDANA_BOLD, { family: 'RM_Verdana', weight: 'bold' });
  } catch (e) { console.error('  !! Verdana not available:', e.message); canvasPkg = null; return false; }
  return true;
}

/**
 * Rasterise the identified type at `scale` times the original size.
 *
 * `items` are in ORIGINAL sheet coordinates: em / track / x / baseline, all
 * multiplied by `scale` here.  Tracking is applied the same way the fit
 * measured it — one fillText per character, advancing by the glyph's own
 * advance plus the tracking — so positions scale exactly.  `track === 0` uses
 * a single fillText so the face's kerning still applies, matching the fit.
 */
function renderType(W, H, items, scale) {
  const { createCanvas } = canvasPkg;
  const c = createCanvas(W, H);
  const g = c.getContext('2d');
  g.antialias = 'gray';
  g.fillStyle = '#fff';
  g.textBaseline = 'alphabetic';
  for (const t of items) {
    g.font = `${t.weight === 'bold' ? 'bold ' : ''}${t.em * scale}px "RM_Verdana"`;
    const x = t.x * scale, base = t.baseline * scale;
    if (!t.track) g.fillText(t.str, x, base);
    else {
      let px = x;
      for (const ch of t.str) { g.fillText(ch, px, base); px += g.measureText(ch).width + t.track * scale; }
    }
  }
  const d = g.getImageData(0, 0, W, H).data;
  const cov = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) cov[i] = d[i * 4 + 3] / 255;
  return cov;
}

const SHEETS = [
  {
    name: 'proc_credits_design', fn: 'FUN_00406160',
    addr: 0x0041eb74, end: 0x00420704, bpp: 2, rowBytes: 0x54, sheet: 512,
    rgb: [255, 255, 255],
    where: 'eff_credits.js — the yellow angular design overlay (DAT_00510068)',
    /* the type is KNOCKED OUT of the opaque panel; fill those boxes solid
     * before the SDF so the panel upscales as one polygon, then subtract the
     * freshly rasterised type.  Both boxes verified strictly inside the panel
     * (its left edge is a 45-degree diagonal at x = 258-y for y<43 and
     * x = 85-y for y>=43; both boxes clear it by >100 texels). */
    knockout: true,
    /* x1 is INCLUSIVE and the art is 336 wide, so it must stop at 335 —
     * 336 would solidify a column outside the artwork. */
    fillRects: [[255, 14, 325, 36], [45, 61, 335, 75]],
    text: [
      { str: 'legend',     weight: 'bold',   em: 16,  track: 0,   x: 259,     baseline: 30.025 },
      { str: 'domage',     weight: 'normal', em: 8.5, track: 0.5, x: 50.75,   baseline: 71.4 },
      { str: 'aarbei',     weight: 'normal', em: 8.5, track: 0.5, x: 112.875, baseline: 71.4 },
      { str: 'acme',       weight: 'normal', em: 8.5, track: 0.5, x: 169.75,  baseline: 71.4 },
      { str: '3state',     weight: 'normal', em: 8.5, track: 0.5, x: 225.0,   baseline: 71.4 },
      { str: 'elitegroup', weight: 'normal', em: 8.5, track: 0.5, x: 286.0,   baseline: 71.4 },
    ],
  },
  {
    name: 'proc_f_logo1', fn: 'FUN_00408550',
    addr: 0x00420734, end: 0x00420830, bpp: 1, rowBytes: 7, sheet: 256,
    rgb: [255, 255, 255], where: 'eff_f.js texLogo1 (DAT_00510130) — SHAPE, not type',
  },
  {
    name: 'proc_f_logo2', fn: 'FUN_004086b0',
    addr: 0x00420830, end: 0x00420f98, bpp: 2, rowBytes: 6, sheet: 512,
    rgb: [0, 0, 0],
    where: 'eff_f.js texLogo2 (DAT_00510170) — BLACK texels, drawn vertically',
    /* stored 24 wide x 316 tall; rotate CCW to read it.  Pure type, so the
     * sheet IS the type: no panel, no knockout. */
    rotated: { w: 24, h: 316 },
    text: [
      { str: '<description of effect>:3state patent pending 3s#1',
        weight: 'normal', em: 10, track: 1, x: 4.125, baseline: 8.95 },
      { str: 'watch and learn',
        weight: 'normal', em: 10, track: 1, x: 3.875, baseline: 21.0 },
    ],
  },
  {
    name: 'proc_d_logo', fn: 'FUN_0040b630',
    addr: 0x00420ff8, end: 0x00421346, bpp: 1, rowBytes: 9, sheet: 256,
    rgb: [255, 255, 255],
    where: 'eff_d.js texLogo (DAT_005102b0) — SHAPE (a bomb), not type',
  },
];

/** decode one embedded sheet into 0..1 coverage over its full square texture */
function sheetCoverage(spec) {
  const bytes = new Uint8Array(pe.read(spec.addr, spec.end - spec.addr));
  const rows = Math.floor(bytes.length / spec.rowBytes);
  const N = spec.sheet;
  const cov = new Float32Array(N * N);
  const perByte = spec.bpp === 1 ? 8 : 4;
  for (let y = 0; y < rows; y++) {
    for (let b = 0; b < spec.rowBytes; b++) {
      const byte = bytes[y * spec.rowBytes + b];
      for (let k = 0; k < perByte; k++) {
        const x = b * perByte + k;
        if (x >= N) break;
        const v = spec.bpp === 1 ? ((byte >> (7 - k)) & 1) * 3 : ((byte >> (6 - 2 * k)) & 3);
        cov[y * N + x] = v / 3;
      }
    }
  }
  return { cov, N, rows, width: spec.rowBytes * perByte };
}

/** coverage -> RGBA, re-quantised to the original 2-bit alpha unless --alpha8 */
function covToRgba(cov, n, rgb) {
  const rgba = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    rgba[i * 4] = rgb[0]; rgba[i * 4 + 1] = rgb[1]; rgba[i * 4 + 2] = rgb[2];
    const a = cov[i] < 0 ? 0 : cov[i] > 1 ? 1 : cov[i];
    rgba[i * 4 + 3] = alpha8 ? Math.round(a * 255) : Math.round(a * 3) * 0x55;
  }
  return rgba;
}

function bakeSheets() {
  log(`\n== Embedded bitmap sheets at ${S}x ==`);
  const haveType = ensureType();
  for (const spec of SHEETS) {
    const { cov, N, rows, width } = sheetCoverage(spec);
    const OW = N * S;
    let out = new Float32Array(OW * OW);
    let how;

    if (spec.text && haveType) {
      if (spec.rotated) {
        /* pure type, stored rotated: rasterise it the way it reads, then
         * rotate back into the sheet's own coordinate space (the scene keeps
         * doing the on-screen rotation exactly as before). */
        const RW = spec.rotated.h * S, RH = spec.rotated.w * S;   // 1264 x 96
        const t = renderType(RW, RH, spec.text, S);
        /* readable(x,y) = stored(row = x, col = Wstored-1-y) */
        const SW = spec.rotated.w * S;
        for (let r = 0; r < RW; r++) {
          for (let c = 0; c < SW; c++) out[r * OW + c] = t[(SW - 1 - c) * RW + r];
        }
        how = `type re-rasterised from Verdana outlines at ${S}x, rotated back into the strip`;
      } else {
        /* panel with knocked-out type: solidify the type boxes, upscale the
         * panel polygon, then subtract the fresh type coverage. */
        const solid = Float32Array.from(cov);
        for (const [rx0, ry0, rx1, ry1] of spec.fillRects) {
          for (let y = ry0; y <= ry1; y++) for (let x = rx0; x <= rx1; x++) solid[y * N + x] = 1;
        }
        const panel = sdfCoverage(sdfFromCoverage(solid, N, N, S), S);
        const t = renderType(OW, OW, spec.text, S);
        for (let i = 0; i < OW * OW; i++) out[i] = panel[i] * (1 - t[i]);
        how = `panel SDF-upscaled, type re-rasterised from Verdana outlines at ${S}x and knocked out`;
      }
    } else {
      out = sdfCoverage(sdfFromCoverage(cov, N, N, S), S);
      how = 'hard-edged mask upscaled via a signed distance field (shape, not type)';
    }

    const rgba = covToRgba(out, OW * OW, spec.rgb);
    fs.writeFileSync(path.join(outDir, `${spec.name}.png`), encodePng(OW, OW, rgba));

    const ref = new Uint8ClampedArray(N * N * 4);
    for (let i = 0; i < N * N; i++) {
      ref[i * 4] = spec.rgb[0]; ref[i * 4 + 1] = spec.rgb[1]; ref[i * 4 + 2] = spec.rgb[2];
      ref[i * 4 + 3] = Math.round(cov[i] * 3) * 0x55;
    }
    const d = downsampleDiff(rgba, N, N, S, ref, 1, 3);
    record(`${spec.name}.png`, OW, OW, rgba,
      `${spec.fn}, ${width}x${rows} art in a ${N}^2 sheet\n${' '.repeat(30)}${how}\n` +
      `${' '.repeat(30)}alpha box-downsample vs 1x: mean |Δ| ${d.mean[0].toFixed(3)} max ${d.max[0].toFixed(2)}`,
      true);
  }
}

/* =================================================================== *
 * 4. Procedural regeneration
 * =================================================================== */

/* --- FUN_0040607f — the 256^2 radial falloff ----------------------- *
 * Original: for y,x in -128..127  i = ftol((255 - 2*sqrt(x^2+y^2)) * k);
 *           if (i > 0) i = (i*i) >> 8;  clamp;  ARGB = 0xff000000 | i*0x10101
 * The sample for original texel p is at coordinate p - 128, so evaluating the
 * fine texel X at (X / S) - 128 puts every original sample back on the grid at
 * X = S*p and fills in the real curve in between.                        */
const ftol = (v) => (v < 0 ? Math.ceil(v) : Math.floor(v));

function radialGlow(k, scale) {
  const N = 256 * scale;
  const px = new Uint8ClampedArray(N * N * 4);
  for (let Y = 0; Y < N; Y++) {
    const y = Y / scale - 128;
    for (let X = 0; X < N; X++) {
      const x = X / scale - 128;
      const r = Math.sqrt(x * x + y * y);
      let i = ftol((255.0 - (r + r)) * k);
      if (i > 0) i = (i * i) >> 8;
      if (i < 0) i = 0;
      if (i > 0xff) i = 0xff;
      const o = (Y * N + X) * 4;
      px[o] = px[o + 1] = px[o + 2] = i; px[o + 3] = 255;
    }
  }
  return { rgba: px, W: N, H: N };
}

/* --- FUN_00406280 / FUN_0040aca0 — the 16-texel grid floor ---------- *
 * 256^2 opaque black, white where x % 16 == 0 or y % 16 == 0.  At scale S the
 * line is S texels of a 16S pitch: the same proportion, and every original
 * texel is reproduced exactly.                                            */
function gridFloor(scale) {
  const N = 256 * scale;
  const px = new Uint8ClampedArray(N * N * 4);
  const pitch = 16 * scale;
  for (let Y = 0; Y < N; Y++) {
    for (let X = 0; X < N; X++) {
      const on = (X % pitch) < scale || (Y % pitch) < scale;
      const o = (Y * N + X) * 4;
      px[o] = px[o + 1] = px[o + 2] = on ? 255 : 0;
      px[o + 3] = 255;
    }
  }
  return { rgba: px, W: N, H: N };
}

/* --- FUN_0040df90 — the finale's 32 per-glyph textures -------------- *
 * a(x,y) = clamp255( fontAlpha(glyph, x, y) + (rand_hi & 0x3f) ), written
 * backwards so each tile ends up rotated 180 degrees.  The noise term is a
 * random LATTICE: one draw per original 64x64 texel, in the original order.
 * The lattice is PINNED — bilinear reconstruction with its nodes at the
 * original texel centres, so the fine field passes exactly through the 2000
 * build's values and the added samples are interpolation, not new randomness.
 *
 * The glyph term still comes from the 2-bit font atlas (via its SDF).  When
 * the vector redraw of the typography lands, re-point this at those outlines
 * and the tiles get real glyph detail as well.                            */
const BANNER = 'threestate**in***lost***vegas**';
const RECT_ADDR = 0x0041b638;

function fontSdf() {
  const atlasBytes = new Uint8Array(pe.read(FONT_ADDR, FONT_END - FONT_ADDR));
  const src = decodeFontAtlas(atlasBytes);
  const cov = new Float32Array(256 * 256);
  for (let i = 0; i < 256 * 256; i++) cov[i] = src.rgba[i * 4 + 3] / 255;
  return { sdf: sdfFromCoverage(cov, 256, 256, S), src };
}

function makeLcg() {
  let rng = 0xabf828c9 >>> 0;
  return () => { rng = (Math.imul(rng, 0x015a4e35) + 1) >>> 0; return (rng >>> 16) & 0x3f; };
}

function glyphRect(rects, ch) {
  if (ch === '*') return [0, 0, 0, 0];
  const idx = ch.charCodeAt(0) - 0x61;
  const o = (((idx % 256) + 256) % 256) * 4;
  return [rects[o], rects[o + 1], rects[o + 2] - rects[o], rects[o + 3] - rects[o + 1]];
}

function bakeFinaleGlyphs(sdf, rects) {
  const draw = makeLcg();
  const TILE = 64 * S, COLS = 8, ROWS = 4, AW = COLS * TILE;
  const atlas = new Uint8ClampedArray(AW * ROWS * TILE * 4);
  for (let ci = 0; ci < 32; ci++) {
    const ch = ci < BANNER.length ? BANNER[ci] : '\0';
    const [x0, y0, w, h] = glyphRect(rects, ch);
    const lat = new Float32Array(64 * 64);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) lat[y * 64 + x] = draw();
    const tx = (ci % COLS) * TILE, ty = ((ci / COLS) | 0) * TILE;
    for (let Y = 0; Y < TILE; Y++) {
      for (let X = 0; X < TILE; X++) {
        let a = 0;
        if (ch !== '*' && w > 0) {
          const gx = ((w / 2) | 0) * S - 32 * S + X;
          const gy = ((h / 2) | 0) * S - 32 * S + Y;
          if (gx >= 0 && gx < w * S && gy >= 0 && gy < h * S) {
            const d = sdf.d[(gy + y0 * S) * sdf.W + gx + x0 * S] * S;
            a = 255 * Math.min(1, Math.max(0, 0.5 + d));
          }
        }
        const fy = (Y + 0.5) / S - 0.5, fx = (X + 0.5) / S - 0.5;
        const jy = Math.floor(fy), jx = Math.floor(fx);
        const wy = fy - jy, wx = fx - jx;
        const L = (xx, yy) => lat[Math.min(63, Math.max(0, yy)) * 64 + Math.min(63, Math.max(0, xx))];
        a += L(jx, jy) * (1 - wx) * (1 - wy) + L(jx + 1, jy) * wx * (1 - wy)
           + L(jx, jy + 1) * (1 - wx) * wy + L(jx + 1, jy + 1) * wx * wy;
        if (a > 255) a = 255;
        const v = Math.round(a);
        const dst = (TILE * TILE - 1) - (Y * TILE + X);      // 180-degree rotation
        const o = ((ty + ((dst / TILE) | 0)) * AW + tx + (dst % TILE)) * 4;
        atlas[o] = atlas[o + 1] = atlas[o + 2] = atlas[o + 3] = v;
      }
    }
  }
  return { atlas, AW, AH: ROWS * TILE, TILE, COLS, ROWS };
}

function bakeFinaleGlyphs1x(rects, alphaSrc) {
  const draw = makeLcg();
  const COLS = 8, ROWS = 4, TILE = 64, AW = COLS * TILE;
  const atlas = new Uint8ClampedArray(AW * ROWS * TILE * 4);
  for (let ci = 0; ci < 32; ci++) {
    const ch = ci < BANNER.length ? BANNER[ci] : '\0';
    const [x0, y0, w, h] = glyphRect(rects, ch);
    const tx = (ci % COLS) * TILE, ty = ((ci / COLS) | 0) * TILE;
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const n = draw();
        let a = 0;
        if (ch !== '*' && w > 0) {
          const gx = ((w / 2) | 0) - 32 + x, gy = ((h / 2) | 0) - 32 + y;
          if (gx >= 0 && gx < w && gy >= 0 && gy < h) a = alphaSrc.rgba[((gy + y0) * 256 + gx + x0) * 4 + 3];
        }
        a += n;
        if (a > 255) a = 255;
        const dst = 4095 - (y * 64 + x);
        const o = ((ty + ((dst / 64) | 0)) * AW + tx + (dst % 64)) * 4;
        atlas[o] = atlas[o + 1] = atlas[o + 2] = atlas[o + 3] = a;
      }
    }
  }
  return { atlas, AW, AH: ROWS * TILE };
}

function bakeProc() {
  log(`\n== Procedural generators, re-evaluated at ${S}x ==`);

  for (const [k, tag] of [[1.0, '100'], [1.1, '110']]) {
    const g = radialGlow(k, S);
    fs.writeFileSync(path.join(outDir, `proc_radial_k${tag}.png`), encodePng(g.W, g.H, g.rgba));
    record(`proc_radial_k${tag}.png`, g.W, g.H, g.rgba,
      `FUN_0040607f(k=${k}); ${fmtDiff(downsampleDiff(g.rgba, 256, 256, S, radialGlow(k, 1).rgba, 1))}`);
  }

  const gf = gridFloor(S);
  fs.writeFileSync(path.join(outDir, 'proc_grid16.png'), encodePng(gf.W, gf.H, gf.rgba));
  record('proc_grid16.png', gf.W, gf.H, gf.rgba,
    `FUN_00406280 / FUN_0040aca0; ${fmtDiff(downsampleDiff(gf.rgba, 256, 256, S, gridFloor(1).rgba, 1))}`);

  const { sdf, src } = fontSdf();
  const rects = new Uint8Array(pe.read(RECT_ADDR, 128 * 4));
  const fin = bakeFinaleGlyphs(sdf, rects);
  fs.writeFileSync(path.join(outDir, 'proc_finale_glyphs.png'), encodePng(fin.AW, fin.AH, fin.atlas));
  const fin1 = bakeFinaleGlyphs1x(rects, src);
  record('proc_finale_glyphs.png', fin.AW, fin.AH, fin.atlas,
    `FUN_0040df90, 32 x ${fin.TILE}^2 tiles in an ${fin.COLS}x${fin.ROWS} grid, banner order,\n` +
    `${' '.repeat(30)}each already rotated 180 deg as the original writes it;\n` +
    `${' '.repeat(30)}${fmtDiff(downsampleDiff(fin.atlas, fin1.AW, fin1.AH, S, fin1.atlas, 1))}` +
    ` (a 4x box-average of an interpolated noise lattice is smoother than the\n` +
    `${' '.repeat(30)}lattice itself — the field still passes through every original value)`);
}

/* =================================================================== *
 * main
 * =================================================================== */

log(`exe  : ${exePath}`);
log(`out  : ${outDir}`);
log(`scale: ${S}x    alpha: ${alpha8 ? '8-bit' : '2-bit (as the original)'}`);

if (want('dr')) bakeDR();
if (want('sheets')) bakeSheets();
if (want('proc')) bakeProc();

log(`\nwrote ${REPORT.length} PNGs to ${outDir}`);
