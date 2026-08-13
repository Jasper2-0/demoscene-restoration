#!/usr/bin/env node
/*
 * bake_textures.mjs — bake every .atg script to PNG.
 *
 *   node work/js/bake_textures.mjs [--scale=N] [--text=auto|gdi|builtin]
 *
 * scale 1 (default):
 *   work/unpacked/extracted/*.atg  -> work/baked/textures/<name>.png
 *   plus the known-good test scripts embedded in atgfiles.cpp
 *     -> work/baked/atglib-tests/<name>.atg  and  textures/atglib_<name>.png
 *
 * scale N>1 (power of two — the "remaster" bake, e.g. --scale=4):
 *   intro scripts -> work/baked/textures<N>x/<name>.png   (256N x 256N)
 *   validation    -> per-channel mean-abs-diff of the box-downsampled N×
 *                    output vs a 1x run (same text rasterizer), plus
 *                    side-by-side comparison PNGs in work/baked/compare<N>x/
 *                    (256 reference | downsampled N× | native N× centre crop)
 *
 * --text: which 0x29 rasterizer to use.
 *   builtin — embedded 5x7 font (dependency-free fallback)
 *   gdi     — gdi_text.mjs: node-canvas + genuine Arial/Courier metrics
 *   auto    — gdi when node-canvas is available (the shipped bake),
 *             builtin otherwise
 *
 * PNG encoding uses node:zlib only.
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { runAtg } from './atg.js';

/* ------------------------------ args ------------------------------ */

let scale = 1, textMode = 'auto';
for (const a of process.argv.slice(2)) {
  let m;
  if ((m = a.match(/^--scale=(\d+)$/))) scale = parseInt(m[1], 10);
  else if ((m = a.match(/^--text=(auto|gdi|builtin)$/))) textMode = m[1];
  else { console.error(`unknown argument: ${a}`); process.exit(2); }
}

let gdiRasterizer = null;
if (textMode === 'gdi' || textMode === 'auto') {
  try {
    const { makeAtgTextRasterizer } = await import('./gdi_text.mjs');
    gdiRasterizer = makeAtgTextRasterizer();
    console.log('text: GDI-faithful rasterizer (system Arial/Courier New)');
  } catch (e) {
    if (textMode === 'gdi') { console.error('gdi text unavailable:', e.message); process.exit(1); }
    console.log('text: embedded fallback font (node-canvas unavailable:', e.message + ')');
  }
} else {
  console.log('text: embedded 5x7 font (bit-exact reference rasterizer)');
}
const runOpts = s => ({ scale: s, textRasterizer: gdiRasterizer });

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');           // repo root
const srcDir = path.join(root, 'work', 'unpacked', 'extracted');
const outDir = path.join(root, 'work', 'baked',
                         scale === 1 ? 'textures' : `textures${scale}x`);
const cmpDir = path.join(root, 'work', 'baked', `compare${scale}x`);
const testDir = path.join(root, 'work', 'baked', 'atglib-tests');
const atgfilesCpp = path.join(root, 'work', 'atg', 'atglib', 'example', 'atgfiles.cpp');

/* ------------------------- minimal PNG encoder ------------------------- */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++)
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'latin1');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;    // bit depth
  ihdr[9] = 6;    // colour type RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const src = y * width * 4, dst = y * (width * 4 + 1);
    raw[dst] = 0;
    raw.set(rgba.subarray(src, src + width * 4), dst + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ------------------- extract test scripts from atgfiles.cpp ------------------- */

function extractAtgfiles() {
  if (!fs.existsSync(atgfilesCpp)) return [];
  const text = fs.readFileSync(atgfilesCpp, 'latin1');
  const out = [];
  const re = /(?:unsigned\s+char|byte)\s+(\w+)\s*\[\s*\d*\s*\]\s*=\s*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(text))) {
    const bytes = m[2].match(/0x[0-9a-fA-F]+|\d+/g).map(s => parseInt(s) & 0xff);
    out.push({ name: m[1], bytes: Uint8Array.from(bytes) });
  }
  return out;
}

/* -------------------------- image helpers -------------------------- */

function stats(rgba) {
  const ch = [
    { name: 'R', min: 255, max: 0, sum: 0 },
    { name: 'G', min: 255, max: 0, sum: 0 },
    { name: 'B', min: 255, max: 0, sum: 0 },
  ];
  const n = rgba.length / 4;
  for (let i = 0; i < rgba.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const v = rgba[i + c];
      const s = ch[c];
      if (v < s.min) s.min = v;
      if (v > s.max) s.max = v;
      s.sum += v;
    }
  }
  return ch.map(s => `${s.name}[${s.min}..${s.max} μ${(s.sum / n).toFixed(1)}]`).join(' ');
}

/* box-downsample S× RGBA to 256x256 */
function downsample(rgba, S) {
  const D = 256 * S, out = new Uint8ClampedArray(256 * 256 * 4);
  const area = S * S;
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < S; sy++) {
        let p = ((y * S + sy) * D + x * S) * 4;
        for (let sx = 0; sx < S; sx++, p += 4) {
          r += rgba[p]; g += rgba[p + 1]; b += rgba[p + 2];
        }
      }
      const o = (y * 256 + x) * 4;
      out[o] = Math.round(r / area);
      out[o + 1] = Math.round(g / area);
      out[o + 2] = Math.round(b / area);
      out[o + 3] = 255;
    }
  }
  return out;
}

/* per-channel mean abs diff between two 256x256 RGBA buffers, with an
 * optional integer (dx,dy) shift (wrapping) applied to `b` */
function madShift(a, b, dx = 0, dy = 0) {
  const sums = [0, 0, 0];
  for (let y = 0; y < 256; y++) {
    const ys = ((y + dy) & 0xff) * 256;
    for (let x = 0; x < 256; x++) {
      const pa = (y * 256 + x) * 4;
      const pb = (ys + ((x + dx) & 0xff)) * 4;
      sums[0] += Math.abs(a[pa] - b[pb]);
      sums[1] += Math.abs(a[pa + 1] - b[pb + 1]);
      sums[2] += Math.abs(a[pa + 2] - b[pb + 2]);
    }
  }
  return sums.map(s => s / 65536);
}

/* 3-panel comparison image: 256 ref | downsampled N× | native N× centre crop */
function comparePanel(ref, down, big, S) {
  const W = 256 * 3 + 8, H = 256;
  const out = new Uint8ClampedArray(W * H * 4);
  const blit = (src, srcW, sx0, sy0, dx0) => {
    for (let y = 0; y < 256; y++)
      for (let x = 0; x < 256; x++) {
        const s = ((sy0 + y) * srcW + sx0 + x) * 4, d = (y * W + dx0 + x) * 4;
        out[d] = src[s]; out[d + 1] = src[s + 1];
        out[d + 2] = src[s + 2]; out[d + 3] = 255;
      }
  };
  blit(ref, 256, 0, 0, 0);
  blit(down, 256, 0, 0, 260);
  const D = 256 * S, c0 = (D - 256) >> 1;
  blit(big, D, c0, c0, 520);
  return { width: W, height: H, rgba: out };
}

/* ------------------------------ main ------------------------------ */

fs.mkdirSync(outDir, { recursive: true });
if (scale > 1) fs.mkdirSync(cmpDir, { recursive: true });

let failures = 0;
const valRows = [];

function bake(label, bytes, pngPath, validate) {
  try {
    const t0 = performance.now();
    const { width, height, rgba } = runAtg(bytes, runOpts(scale));
    fs.writeFileSync(pngPath, encodePng(width, height, rgba));
    let extra = '';
    if (validate && scale > 1) {
      const ref = runAtg(bytes, runOpts(1)).rgba;      // same rasterizer, 1x
      const down = downsample(rgba, scale);
      const mad = madShift(ref, down);
      // misregistration probe: does a 1px shift explain the image better?
      let shiftNote = '';
      const base = (mad[0] + mad[1] + mad[2]) / 3;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const m = madShift(ref, down, dx, dy);
        if ((m[0] + m[1] + m[2]) / 3 < base * 0.8) shiftNote = ` ** SHIFTED(${dx},${dy})? **`;
      }
      const flag = base > 15 ? ' ** SUSPICIOUS **' : '';
      valRows.push({ label, mad, note: (flag + shiftNote).trim() });
      extra = `  MAD R${mad[0].toFixed(2)} G${mad[1].toFixed(2)} B${mad[2].toFixed(2)}${flag}${shiftNote}`;
      const panel = comparePanel(ref, down, rgba, scale);
      fs.writeFileSync(path.join(cmpDir, path.basename(pngPath)),
                       encodePng(panel.width, panel.height, panel.rgba));
    }
    console.log(`  ok  ${label.padEnd(24)} ${stats(rgba)}` +
                `  ${(performance.now() - t0).toFixed(0)}ms${extra}`);
  } catch (e) {
    failures++;
    console.error(`  FAIL ${label.padEnd(23)} ${e.message}`);
  }
}

console.log(`scale ${scale} -> ${outDir}`);
console.log(`intro scripts (${srcDir}):`);
for (const f of fs.readdirSync(srcDir).filter(f => f.endsWith('.atg')).sort()) {
  const bytes = fs.readFileSync(path.join(srcDir, f));
  bake(f, bytes, path.join(outDir, f.replace(/\.atg$/, '.png')), true);
}

if (scale === 1) {
  const tests = extractAtgfiles();
  if (tests.length) {
    fs.mkdirSync(testDir, { recursive: true });
    console.log(`\natglib example scripts (from atgfiles.cpp):`);
    for (const { name, bytes } of tests) {
      fs.writeFileSync(path.join(testDir, `${name}.atg`), bytes);
      bake(`${name}.atg`, bytes, path.join(outDir, `atglib_${name}.png`), false);
    }
  }
}

if (valRows.length) {
  console.log(`\nvalidation (box-downsampled ${scale}x vs 1x, same text rasterizer):`);
  console.log('  texture                    MAD R     G     B   notes');
  for (const { label, mad, note } of valRows)
    console.log(`  ${label.padEnd(24)} ${mad.map(v => v.toFixed(2).padStart(6)).join('')}   ${note}`);
}

console.log(failures ? `\n${failures} failure(s)` : '\nall scripts baked successfully');
process.exit(failures ? 1 : 0);
