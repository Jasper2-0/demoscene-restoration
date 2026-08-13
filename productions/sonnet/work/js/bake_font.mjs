// bake_font.mjs — OFFLINE reproduction of texgen op 17, the Win32 GDI font atlas.
//
// Op 17 (FUN_004136a2 -> FUN_00413479) is a Win32 GDI call sequence and cannot be
// ported literally.  Everything it does is fully reverse-engineered in
// re/gen/TEXGEN_PORT.md §17; this script reproduces it with node-canvas + the real
// Times New Roman that ships with macOS, and writes the result as a PNG that
// bake_tex.mjs injects as texture 11.
//
//   node js/bake_font.mjs [--scale N] [--out FILE] [--canvas PATH_TO_node_modules/canvas]
//
// Defaults to baked/font_atlas_<N>x.png.  Run it once per scale you intend to bake.
//
// WHAT THE ORIGINAL DOES (all values read from the binary, not the decompile):
//
//   cHeight = ftol(canvasWidth * 0.0390625) = ftol(2048/25.6) = 80, POSITIVE, so it is
//            a CELL height (tmHeight), not an em size.
//   CreateFontA(80,0,0,0, 100, 0,0,0, 0,0,0, 4, 0, "times new roman")   regular
//   CreateFontA(80,0,0,0, 700, 0,0,0, 0,0,0, 4, 0, "times new roman")   bold
//            iQuality = 4 = ANTIALIASED_QUALITY  -> grayscale AA, NOT ClearType
//            iCharSet = 0 = ANSI_CHARSET, iOutPrecision = 0 = OUT_DEFAULT_PRECIS
//   SetBkMode(TRANSPARENT); SetTextColor(0x00ffffff); SetTextAlign(0)  [TA_LEFT|TA_TOP]
//   TextOutA at (0,0) regular-lower, (0,128) regular-upper,
//                (0,256) bold-lower,   (0,384) bold-upper
//   glyph coverage is read back into canvas components 1..3 (R,G,B); alpha untouched.
//
// GDI -> em size:  for a POSITIVE lfHeight the mapper picks
//   ppem = MulDiv(lfHeight, unitsPerEm, usWinAscent + usWinDescent)
// Times New Roman: unitsPerEm 2048, usWinAscent 1825, usWinDescent 443
//   ppem = 80 * 2048 / 2268 = 72.25 -> 72
// and then  tmAscent = MulDiv(1825, 72, 2048) = 64,  tmDescent = MulDiv(443, 72, 2048)
//   = 16,  tmHeight = 80  — which is exactly the requested cell height, confirming 72.
// TA_TOP means the y passed to TextOutA is the top of the CELL, so the baseline sits at
// y + tmAscent = y + 64.
//
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodePNG } from './png.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 ? process.argv[i + 1] : def;
}

// --- the two charset strings, verbatim from VA 0x41aa1c and 0x41a9dc ---------
export const STR_LOWER = "a b c d e f g h i j k l m n o p q r s t u v w x y z 0 1 2 3 4 5 6 7 8 9 , ! ? '";
export const STR_UPPER = 'A B C D E F G H I J K L M N O P Q R S T U V W X Y Z ( ) [ ] : .';

// --- Times New Roman metrics, from the font, used to reproduce GDI's mapping --
const UPEM = 2048, WIN_ASCENT = 1825, WIN_DESCENT = 443;
const LF_HEIGHT = 80;                                   // ftol(2048 * 0.0390625)
const muldiv = (a, b, c) => Math.round((a * b) / c);     // Win32 MulDiv (round-half-up)
export const PPEM = muldiv(LF_HEIGHT, UPEM, WIN_ASCENT + WIN_DESCENT);   // 72
export const TM_ASCENT = muldiv(WIN_ASCENT, PPEM, UPEM);                 // 64

export function renderFontAtlas(scale = 1, canvasModule) {
  const W = 2048 * scale, H = 512 * scale;
  const { createCanvas } = canvasModule;
  const cv = createCanvas(W, H);
  const g = cv.getContext('2d');

  // The original uploads the existing canvas first (black for res 11) and draws with
  // SetBkMode(TRANSPARENT), so the background is whatever was there: pure black.
  g.fillStyle = '#000000';
  g.fillRect(0, 0, W, H);

  g.fillStyle = '#ffffff';                 // SetTextColor(0x00ffffff)
  g.textBaseline = 'alphabetic';           // we position the baseline ourselves
  g.antialias = 'gray';                    // ANTIALIASED_QUALITY, not subpixel/ClearType

  const px = PPEM * scale;
  const asc = TM_ASCENT * scale;

  // GDI advances each glyph by an INTEGER number of pixels (GetCharWidth32 / the ABC
  // widths are integers) and TextOutA accumulates them, so glyph origins are always on
  // whole pixels.  Cairo positions subpixel by default, which drifts across an
  // 80-character string.  Draw character by character on integer origins instead.
  const drawRow = (text, y, bold) => {
    g.font = `${bold ? 'bold ' : ''}${px}px "Times New Roman"`;
    let x = 0;
    for (const ch of text) {
      g.fillText(ch, x, y + asc);
      x += Math.round(g.measureText(ch).width);
    }
    return x;
  };

  const widths = [
    drawRow(STR_LOWER, 0 * 128 * scale, false),
    drawRow(STR_UPPER, 1 * 128 * scale, false),
    drawRow(STR_LOWER, 2 * 128 * scale, true),
    drawRow(STR_UPPER, 3 * 128 * scale, true),
  ];

  const rgba = new Uint8ClampedArray(cv.getContext('2d').getImageData(0, 0, W, H).data);
  // The original forces the top byte of every DIB texel to 0xff, but only components
  // 1..3 (R,G,B) are read back into the layer, and the layer's alpha stays 1.0.  Match
  // that: opaque, colour = glyph coverage.
  for (let i = 3; i < rgba.length; i += 4) rgba[i] = 255;
  return { width: W, height: H, rgba, widths, px, asc };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const scale = Number(arg('scale', 1));
  const canvasPath = arg('canvas',
    resolve(HERE, '..', '..', '..', '..', 'node_modules/canvas'));   // hoisted at the repo root
  const out = resolve(ROOT, arg('out', `baked/font_atlas_${scale}x.png`));
  const require = createRequire(import.meta.url);
  const canvasModule = require(canvasPath);

  const r = renderFontAtlas(scale, canvasModule);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, encodePNG(r.width, r.height, r.rgba));
  console.log(`font atlas ${r.width}x${r.height}  em=${r.px}px  baseline=+${r.asc}px`);
  console.log(`  row widths (must be <= ${r.width}): ${r.widths.join(', ')}`);
  console.log(`  -> ${out}`);
}
