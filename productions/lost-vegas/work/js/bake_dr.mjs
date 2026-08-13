#!/usr/bin/env node
/*
 * bake_dr.mjs — locate every DR bitstream in 3s-vegas-u.exe, run the DR
 * design generator over each and write PNGs to work/baked/dr/.
 *
 *   node productions/lost-vegas/work/js/bake_dr.mjs [--exe=PATH] [--out=DIR] [--raw]
 *
 * Also bakes the 2bpp bitmap font atlas + a glyph-rect overlay sheet, since
 * the intro's blocky typography is a bitmap font (NOT procedural — see
 * re/engine/DR_FORMAT.md §7).
 *
 * --raw  additionally writes the pre-post-process versions of the two
 *        textures that FUN_00409bb0 grid-lines after decoding.
 *
 * PNG encoding is node:zlib only; no npm dependencies.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  runDR, applyGridLines, decodeFontAtlas, parseGlyphRects, glyphIndex,
  layoutText, renderText,
} from './dr.mjs';
import { encodePng, mapPe } from './bakelib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const workLv = path.resolve(here, '..');

let exePath = path.join(workLv, 'unpacked', '3s-vegas-u.exe');
let outDir  = path.join(workLv, 'baked', 'dr');
let wantRaw = false;
for (const a of process.argv.slice(2)) {
  let m;
  if ((m = a.match(/^--exe=(.+)$/))) exePath = m[1];
  else if ((m = a.match(/^--out=(.+)$/))) outDir = m[1];
  else if (a === '--raw') wantRaw = true;
  else { console.error(`unknown argument: ${a}`); process.exit(2); }
}

/* --------------------- known DR call sites ------------------------ */
/* addr -> {name, w, h, post, where}.  Call sites from re/out/lv.c.     */
const KNOWN = {
  0x0041ba9c: { name: 'dr_256_grid_panels', w: 256, h: 256, post: 'grid8',
                where: 'FUN_00409bb0 -> DAT_005101e0 (FUN_0040604d, 256x256, flags 0)' },
  0x0041c4e8: { name: 'dr_64_grid_small',   w: 64,  h: 64,  post: 'grid4',
                where: 'FUN_00409bb0 -> DAT_005101c0 (FUN_0040604d, 64x64, flags 0)' },
  0x0041d0e4: { name: 'dr_64_envmap',       w: 64,  h: 64,  post: null,
                where: 'FUN_004087c0/FUN_0040bd10/FUN_0040c730 (FUN_00405fe6, 64x64, flags 0)' },
  0x0041df74: { name: 'dr_64_finale',       w: 64,  h: 64,  post: null,
                where: 'FUN_0040df90 -> DAT_00510370 (FUN_00405fe6, 64x64, flags 0)' },
};

/* -------------------------- scan + bake --------------------------- */

const exe = fs.readFileSync(exePath);
const pe = mapPe(exe);
console.log(`exe   : ${exePath}`);
console.log(`base  : 0x${pe.imageBase.toString(16)}  sections: ${pe.secs.map(s => s.name).join(' ')}`);

/* find every 00 00 01 B3 (MPEG-1 sequence_header_code) in the mapped image */
const found = [];
for (let i = 0; i + 4 <= pe.image.length; i++) {
  if (pe.image[i] === 0 && pe.image[i + 1] === 0 && pe.image[i + 2] === 1 && pe.image[i + 3] === 0xb3)
    found.push(i + pe.imageBase);
}
console.log(`streams: ${found.length} sequence headers found: ${found.map(a => '0x' + a.toString(16)).join(' ')}\n`);

fs.mkdirSync(outDir, { recursive: true });

function stats(img) {
  const { rgba, width, height } = img;
  let rmin = 255, rmax = 0, gmin = 255, gmax = 0, bmin = 255, bmax = 0;
  let rs = 0, gs = 0, bs = 0;
  const uniq = new Set();
  for (let i = 0; i < width * height; i++) {
    const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2];
    if (r < rmin) rmin = r; if (r > rmax) rmax = r;
    if (g < gmin) gmin = g; if (g > gmax) gmax = g;
    if (b < bmin) bmin = b; if (b > bmax) bmax = b;
    rs += r; gs += g; bs += b;
    if (uniq.size < 4096) uniq.add((r << 16) | (g << 8) | b);
  }
  const n = width * height;
  return {
    r: [rmin, rmax], g: [gmin, gmax], b: [bmin, bmax],
    mean: [(rs / n).toFixed(1), (gs / n).toFixed(1), (bs / n).toFixed(1)],
    colours: uniq.size >= 4096 ? '>=4096' : uniq.size,
    degenerate: rmax === rmin && gmax === gmin && bmax === bmin,
  };
}

const report = [];
for (let i = 0; i < found.length; i++) {
  const addr = found[i];
  const end = i + 1 < found.length ? found[i + 1] : addr + 0x4000;
  const k = KNOWN[addr] ?? { name: `dr_${addr.toString(16)}`, w: null, h: null, post: null, where: '(unreferenced)' };
  const bytes = new Uint8Array(pe.read(addr, Math.min(end - addr + 64, pe.image.length - (addr - pe.imageBase))));
  const img = runDR(bytes, k.w ? { width: k.w, height: k.h } : {});
  if (!img.ok) { console.log(`${k.name}: header parse FAILED`); continue; }

  if (wantRaw && k.post) {
    fs.writeFileSync(path.join(outDir, `${k.name}_raw.png`), encodePng(img.width, img.height, img.rgba));
  }
  if (k.post === 'grid8') applyGridLines(img, 8);
  if (k.post === 'grid4') applyGridLines(img, 4);

  const file = path.join(outDir, `${k.name}.png`);
  fs.writeFileSync(file, encodePng(img.width, img.height, img.rgba));
  const st = stats(img);
  report.push({ addr, ...k, size: end - addr, st });
  console.log(
    `${k.name.padEnd(20)} @0x${addr.toString(16)} ${String(end - addr).padStart(5)}B  ` +
    `${img.width}x${img.height}  seq ${img.seqWidth}x${img.seqHeight} mb ${img.mbW}x${img.mbH}  ` +
    `R${st.r[0]}-${st.r[1]} G${st.g[0]}-${st.g[1]} B${st.b[0]}-${st.b[1]}  ` +
    `mean ${st.mean.join('/')}  colours ${st.colours}` +
    `${st.degenerate ? '  *** DEGENERATE ***' : ''}${k.post ? `  post=${k.post}` : ''}`);
}

/* ---------------------------- the font ---------------------------- */

const FONT_ADDR = 0x0041a2b8, FONT_END = 0x0041b638, RECT_ADDR = 0x0041b638, NGLYPH = 38;
const atlasBytes = new Uint8Array(pe.read(FONT_ADDR, FONT_END - FONT_ADDR));
const font = decodeFontAtlas(atlasBytes);
/* font.png == the sheet exactly as FUN_00404b10 uploads it: white, 4-level
 * alpha.  font_atlas.png is the same image (kept as an alias).             */
fs.writeFileSync(path.join(outDir, 'font.png'), encodePng(font.width, font.height, font.rgba));
fs.writeFileSync(path.join(outDir, 'font_atlas.png'), encodePng(font.width, font.height, font.rgba));

/* yellow-on-transparent preview: how the design layer actually renders */
const fontY = decodeFontAtlas(atlasBytes, { colour: [255, 214, 0] });
fs.writeFileSync(path.join(outDir, 'font_atlas_yellow.png'), encodePng(fontY.width, fontY.height, fontY.rgba));

/* glyph rectangles drawn over the atlas, for verification.
 * 128 entries are read so that out-of-range characters ('*', '.', ...)
 * reproduce the exe's over-read of the table — see DR_FORMAT.md §7.3.  */
const rects = parseGlyphRects(new Uint8Array(pe.read(RECT_ADDR, 128 * 4)), 128);
const ov = decodeFontAtlas(atlasBytes);
const put = (x, y, r, g, b) => {
  if (x < 0 || y < 0 || x >= 256 || y >= 256) return;
  const o = (y * 256 + x) * 4;
  ov.rgba[o] = r; ov.rgba[o + 1] = g; ov.rgba[o + 2] = b; ov.rgba[o + 3] = 255;
};
for (const r of rects.slice(0, NGLYPH)) {
  for (let x = r.x0; x <= r.x1; x++) { put(x, r.y0, 255, 0, 0); put(x, r.y1, 255, 0, 0); }
  for (let y = r.y0; y <= r.y1; y++) { put(r.x0, y, 255, 0, 0); put(r.x1, y, 255, 0, 0); }
}
fs.writeFileSync(path.join(outDir, 'font_atlas_rects.png'), encodePng(256, 256, ov.rgba));

let nz = 0;
for (let i = 3; i < font.rgba.length; i += 4) if (font.rgba[i]) nz++;
console.log(`\nfont_atlas           @0x${FONT_ADDR.toString(16)} ${FONT_END - FONT_ADDR}B  256x256 ` +
            `(${font.rows} rows used)  2bpp alpha, ${nz} non-transparent texels`);
console.log(`glyph rects          @0x${RECT_ADDR.toString(16)} ${NGLYPH * 4}B  ${NGLYPH} glyphs ` +
            `(a-z 0-9 # +), y range ${Math.min(...rects.slice(0, NGLYPH).map(r => r.y0))}..` +
            `${Math.max(...rects.slice(0, NGLYPH).map(r => r.y1))}`);
const chars = [...'abcdefghijklmnopqrstuvwxyz0123456789#+'];
console.log('\nglyph table (char: x0,y0 - x1,y1  wxh):');
console.log(chars.map((c) => {
  const r = rects[glyphIndex(c)];
  return `  ${c}: ${r.x0},${r.y0}-${r.x1},${r.y1} ${r.x1 - r.x0}x${r.y1 - r.y0}`;
}).join('\n'));

/* metrics JSON — the contract for the renderer agent */
const KERN = { a: -4, g: -4, e: -1, h: -2, c: -2, i: -2, k: 2, p: 2, x: 2, z: 2 };
fs.writeFileSync(path.join(outDir, 'font_metrics.json'), JSON.stringify({
  source: { exe: path.basename(exePath), atlas: `0x${FONT_ADDR.toString(16)}`,
            atlasBytes: FONT_END - FONT_ADDR, rects: `0x${RECT_ADDR.toString(16)}`,
            builder: 'FUN_00404b10', metrics: 'FUN_00404c30', layout: 'FUN_00404f10/FUN_00404dd0' },
  atlas: { width: 256, height: 256, rowsUsed: font.rows, bitsPerPixel: 2,
           bytesPerRow: 64, colour: [255, 255, 255],
           alphaLevels: [0, 0x55, 0xaa, 0xff], note: 'white texels, 2-bit alpha' },
  constants: { uvScale: 1 / 255, unitScale: 1 / 256, spaceWidthUnits: 16,
               charGapUnits: 4, centreFactor: 0.5 },
  glyphs: Object.fromEntries(chars.map(c => {
    const r = rects[glyphIndex(c)];
    return [c, { index: glyphIndex(c), x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1,
                 w: r.x1 - r.x0, h: r.y1 - r.y0, kern: KERN[c] ?? 0 }];
  })),
  specialChars: { ' ': 'advance only: scale*16/256 + gap',
                  '*': 'index 42 -> zero rect (over-read); renders nothing, advances by the gap only' },
}, null, 2));

/* --- sample strips of the intro's own strings, for a visual check ------ */
const STRINGS = [
  'lost vegas', 'threestate', 'effect vs design', 'mass media',
  'we lost our explosive', 'please return it', 'hard facts # we are better',
  'effect of the year', 'cheap imitations', 'why limit ourselves',
  'sagacity sarix stevie distance', 'threestate**in***lost***vegas**',
  'abcdefghijklmnopqrstuvwxyz', '0123456789#+',
];
const strips = STRINGS.map(s => renderText(s, { rects, atlas: font, scale: 2 }));
const SW = Math.max(...strips.map(s => s.width));
const SH = strips.reduce((a, s) => a + s.height + 6, 6);
const sheet = new Uint8ClampedArray(SW * SH * 4);
for (let i = 0; i < SW * SH; i++) {   // sky-blue backdrop, as in the capture
  sheet[i * 4] = 0x5a; sheet[i * 4 + 1] = 0x8c; sheet[i * 4 + 2] = 0xc0; sheet[i * 4 + 3] = 255;
}
let yy = 6;
for (const s of strips) {
  for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) {
    const a = s.rgba[(y * s.width + x) * 4 + 3] / 255;
    if (!a) continue;
    const o = ((yy + y) * SW + x) * 4;
    for (let c = 0; c < 3; c++) sheet[o + c] = s.rgba[(y * s.width + x) * 4 + c] * a + sheet[o + c] * (1 - a);
  }
  yy += s.height + 6;
}
fs.writeFileSync(path.join(outDir, 'text_samples.png'), encodePng(SW, SH, sheet));
console.log(`\ntext_samples.png     ${SW}x${SH}  ${STRINGS.length} strings rendered at scale 2`);
console.log(`  widths (exe units, scale=255): ` +
  STRINGS.slice(0, 4).map(s => `"${s}"=${layoutText(s, { rects }).width.toFixed(1)}`).join('  '));

console.log(`\nwrote ${report.length + 6} PNGs + font_metrics.json to ${outDir}`);
