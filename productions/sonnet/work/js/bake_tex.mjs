// bake_tex.mjs — run all 28 texgen programs, write PNGs + contact sheet + manifest.
//
//   node js/bake_tex.mjs [--scale N] [--kernel METHOD] [--out DIR]
//
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RESOURCES } from './resources.mjs';
import { runTexgen, parseProgram } from './texgen.mjs';
import { encodePNG, decodePNG } from './png.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 ? process.argv[i + 1] : def;
}

const scale = Number(arg('scale', 1));
const kernel = arg('kernel', 'continuous');
const outDir = resolve(ROOT, arg('out', 'baked/tex'));
mkdirSync(outDir, { recursive: true });

const NTEX = 28;
const FONT_TEX = 11;          // the 2048x512 strip whose only op is 17 (GDI font atlas)
const manifest = [];
const results = [];

// Texture 11's single op is the Win32 GDI font atlas (op 17), which cannot be ported
// literally.  It is reproduced offline by `node js/bake_font.mjs --scale N` and injected
// here.  See re/gen/TEXGEN_PORT.md §17-§18 for the reverse-engineering and for an honest
// list of where the offline bake cannot match GDI.
const fontPath = resolve(ROOT, `baked/font_atlas_${scale}x.png`);
let fontAtlas = null;
if (existsSync(fontPath)) {
  fontAtlas = decodePNG(readFileSync(fontPath));
  console.log(`font atlas: ${fontPath} (${fontAtlas.width}x${fontAtlas.height})`);
} else {
  console.warn(`font atlas: MISSING ${fontPath} — texture ${FONT_TEX} will bake BLACK.`
    + `\n            run:  node js/bake_font.mjs --scale ${scale}`);
}

for (let id = 0; id < NTEX; id++) {
  const prog = parseProgram(RESOURCES[id]);
  const t0 = Date.now();
  const r = runTexgen(RESOURCES[id], { scale, kernel });
  if (id === FONT_TEX && fontAtlas) {
    if (fontAtlas.width !== r.width || fontAtlas.height !== r.height) {
      throw new Error(`font atlas is ${fontAtlas.width}x${fontAtlas.height}, expected ${r.width}x${r.height}`);
    }
    // Op 17 writes components 1..3 (R,G,B) and leaves the layer's alpha alone, and the
    // instruction's channel mask is 0x07 = RGB — so inject RGB only and keep the VM's
    // alpha.  (FUN_00405?? consumes only the B channel, then moves it into alpha.)
    for (let i = 0; i < r.width * r.height; i++) {
      r.rgba[i * 4] = fontAtlas.rgba[i * 4];
      r.rgba[i * 4 + 1] = fontAtlas.rgba[i * 4 + 1];
      r.rgba[i * 4 + 2] = fontAtlas.rgba[i * 4 + 2];
    }
    r.unimplemented = [];
    r.injected = 'font_atlas';
  }
  const ms = Date.now() - t0;
  writeFileSync(`${outDir}/${id}.png`, encodePNG(r.width, r.height, r.rgba));
  results.push(r);
  manifest.push({
    id,
    width: r.width,
    height: r.height,
    opcount: r.opcount,
    ops: r.opsUsed.map(String),
    unimplemented: r.unimplemented.map(String),
    injected: r.injected,
    ms,
  });
  console.log(`tex ${String(id).padStart(2)}  ${r.width}x${r.height}  ${String(r.opcount).padStart(2)} ops  ${ms}ms`
    + (r.unimplemented.length ? `  UNIMPLEMENTED ${r.unimplemented}` : ''));
}

// ---- contact sheet: 7 x 4 cells of 160px -----------------------------------
const CELL = 160, COLS = 7, ROWS = Math.ceil(NTEX / COLS), PAD = 4;
const CW = CELL + PAD, SW = COLS * CW + PAD, SH = ROWS * CW + PAD;
const sheet = new Uint8ClampedArray(SW * SH * 4);
for (let i = 0; i < SW * SH; i++) { sheet[i * 4 + 3] = 255; sheet[i * 4] = sheet[i * 4 + 1] = sheet[i * 4 + 2] = 24; }
for (let id = 0; id < NTEX; id++) {
  const r = results[id];
  const ox = PAD + (id % COLS) * CW, oy = PAD + Math.floor(id / COLS) * CW;
  for (let y = 0; y < CELL; y++) {
    const sy = Math.min(r.height - 1, Math.floor(y * r.height / CELL));
    for (let x = 0; x < CELL; x++) {
      const sx = Math.min(r.width - 1, Math.floor(x * r.width / CELL));
      const s = (sy * r.width + sx) * 4, d = ((oy + y) * SW + ox + x) * 4;
      // alpha-composite over a checkerboard so alpha-only textures are visible
      const chk = (((x >> 3) ^ (y >> 3)) & 1) ? 96 : 160;
      const a = r.rgba[s + 3] / 255;
      sheet[d] = r.rgba[s] * a + chk * (1 - a);
      sheet[d + 1] = r.rgba[s + 1] * a + chk * (1 - a);
      sheet[d + 2] = r.rgba[s + 2] * a + chk * (1 - a);
      sheet[d + 3] = 255;
    }
  }
}
writeFileSync(`${outDir}/contact.png`, encodePNG(SW, SH, sheet));

writeFileSync(`${outDir}/manifest.json`, JSON.stringify({
  scale, kernel, generated: new Date().toISOString(), textures: manifest,
}, null, 2));

console.log(`\nwrote ${NTEX} PNGs + contact.png + manifest.json to ${outDir}`);
