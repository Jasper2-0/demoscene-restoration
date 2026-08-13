// Bake the engine's runtime GDI text surfaces to PNG strips so the web port
// needs no fonts at runtime (deterministic across viewers' systems).
//
// eff1D greetings typewriter: createFont(1 /*Courier New*/, 16, false, 0),
//   each line -> textToAlphaBuffer(str, buf, 0, 0, 512, 16) — 512x16, 64 cells.
// eff3C flashes: createFont(0 /*Arial*/, 32, false, 0),
//   "   p l e a s e   i t" -> 256x32 buffer at (0, -4). The engine then runs
//   blurGrayscale — left to the effect code; strips here are raw aliased GDI.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import canvasPkg from 'canvas';
import { gdiTextToMap } from './gdi_text.mjs';

const { createCanvas } = canvasPkg;
const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', '..', 'web', 'assets', 'text');
fs.mkdirSync(outDir, { recursive: true });

// Supersample factor: strips are baked at SSx the original buffer size with
// identical GDI layout metrics — same glyph geometry, just more texels under
// the same on-screen quads (the originals were genuinely 512x16 / 256x32).
const SS = 4;

const GREETS = [
  'The Aardbei Machine marches on',
  'Greeting the following cookie-things:',
  '',
  '3state', 'domage', 'haujobb', 'inf', 'infuse project', 'nosferatu',
  'nostalgia', 'rash', 'replay', 'sub97', 'the black lotus',
  'total eclipse', 'tpolm', 'twilight',
];

function writeStrip(file, map, W, H) {
  const c = createCanvas(W, H);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(W, H);
  // Coverage lives in RGB (luminance), alpha opaque: the effects draw these
  // strips with glBlendFunc(ONE, ONE), which ignores alpha — luminance-RGB
  // gives correct additive AA edges and is immune to PNG premultiply quirks
  // (matches the original's intensity-buffer semantics).
  for (let i = 0; i < W * H; i++) {
    const v = map[i];
    img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  fs.writeFileSync(file, c.toBuffer('image/png'));
}

const manifest = { greets: [], pleaseIt: 'please_it.png', scale: SS, lineLens: GREETS.map((s) => s.length) };
GREETS.forEach((line, i) => {
  const map = new Uint8Array(512 * SS * 16 * SS);
  // gridW = 8·SS: exact 1/64-strip character cells, matching the engine's
  // reveal-mask math (u_max = chars/64) and GDI's integer-hinted advances
  if (line) gdiTextToMap(map, 512 * SS, 16 * SS, line, 1, 16 * SS, 400, false, 0, 0, 8 * SS);
  const name = `greet_${String(i).padStart(2, '0')}.png`;
  writeStrip(path.join(outDir, name), map, 512 * SS, 16 * SS);
  manifest.greets.push(name);
});

{
  const map = new Uint8Array(256 * SS * 32 * SS);
  gdiTextToMap(map, 256 * SS, 32 * SS, '   p l e a s e   i t', 0, 32 * SS, 400, false, 0, -4 * SS);
  writeStrip(path.join(outDir, 'please_it.png'), map, 256 * SS, 32 * SS);
}

fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log('wrote', manifest.greets.length, 'greeting strips + please_it.png to', outDir);
