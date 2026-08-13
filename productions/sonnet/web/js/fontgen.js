// fontgen.js — texgen op 17, the GDI font atlas, ported to the browser.
//
// `re/gen/TEXGEN_PORT.md` §4 lists op 17 as "not portable" and §19 bakes it offline
// with node-canvas. That was reasoned from Node, where it is true. **A browser has
// the exact equivalent of every GDI call the op makes:**
//
//   CreateFontA(cHeight, ..., cWeight, ..., "times new roman")  ->  ctx.font
//   SetTextColor(0x00ffffff) / SetBkMode(TRANSPARENT)           ->  fillStyle, no clear
//   SetTextAlign(TA_LEFT|TA_TOP)                                ->  textBaseline + our y
//   TextOutA(dc, x, y, s, n)                                    ->  ctx.fillText
//   GetDIBits(...)                                              ->  ctx.getImageData
//
// and it is safe to substitute one rasteriser for the other **because the consumer
// scans the atlas for glyph extents instead of trusting metrics** (§18: FUN_00406c98
// walks each 128-row band column by column and splits at the blank columns). Glyph
// widths, hinting and AA ramps may all differ from GDI's; the demo re-derives every
// UV rectangle from the pixels it finds, so none of that reaches the screen as a
// layout error. What must be right is the glyph ORDER, the four bands at
// y = 0/128/256/384, and a blank column between consecutive glyphs.
//
// That removes the last asset of the restoration that had to ship as an image.
//
// Everything below is transcribed from `js/bake_font.mjs`, which is the offline
// version of the same reconstruction; the two are kept deliberately identical so the
// generated atlas can be diffed against `baked/font_atlas_<N>x.png`.

import { buildGlyphTable } from './text.js';

// The two charset strings, verbatim from VA 0x41aa1c and 0x41a9dc.
export const STR_LOWER = "a b c d e f g h i j k l m n o p q r s t u v w x y z 0 1 2 3 4 5 6 7 8 9 , ! ? '";
export const STR_UPPER = 'A B C D E F G H I J K L M N O P Q R S T U V W X Y Z ( ) [ ] : .';

// GDI's mapping of the requested cell height to an em size. Times New Roman:
// unitsPerEm 2048, usWinAscent 1825, usWinDescent 443.
//   cHeight = ftol(2048 * 0.0390625) = 80          (0x419034 = 1/25.6)
//   ppem    = MulDiv(80, 2048, 1825+443) = 72
//   tmAscent = MulDiv(1825, 72, 2048) = 64         -> baseline at y + 64
const UPEM = 2048, WIN_ASCENT = 1825, WIN_DESCENT = 443, LF_HEIGHT = 80;
const muldiv = (a, b, c) => Math.round((a * b) / c);
export const PPEM = muldiv(LF_HEIGHT, UPEM, WIN_ASCENT + WIN_DESCENT);   // 72
export const TM_ASCENT = muldiv(WIN_ASCENT, PPEM, UPEM);                 // 64

export const FACE = '"Times New Roman"';

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

/**
 * Is the real face present? A substituted serif would still produce a usable atlas
 * (the scan does not care), but it would no longer be the original's type, so the
 * caller is given the chance to fall back to the bake and SAY SO.
 */
export function hasTimesNewRoman() {
  try {
    if (typeof document === 'undefined' || !document.fonts) return false;
    // document.fonts.check() only reports on loaded @font-face rules, not on local
    // system faces, so measure instead: compare the face against a forced fallback.
    const cv = makeCanvas(8, 8);
    const g = cv.getContext('2d');
    const probe = 'ABCXYZabcxyz0123';
    g.font = `72px ${FACE}, monospace`;
    const a = g.measureText(probe).width;
    g.font = '72px monospace';
    const b = g.measureText(probe).width;
    if (Math.abs(a - b) > 0.5) return true;
    // A monospace fallback is unlikely to tie with Times; if it does, try serif too.
    g.font = '72px serif';
    return Math.abs(a - g.measureText(probe).width) < 0.5;
  } catch { return false; }
}

/**
 * FUN_00413479 — the GDI worker — as a canvas.
 * @returns {{width, height, rgba: Uint8ClampedArray, widths: number[], px, asc}}
 */
export function renderFontAtlas(scale = 1) {
  const W = 2048 * scale, H = 512 * scale;
  const cv = makeCanvas(W, H);
  const g = cv.getContext('2d', { willReadFrequently: true });

  // The op uploads the existing layer into the bitmap first and draws with
  // SetBkMode(TRANSPARENT); for res 11 that layer is black.
  g.fillStyle = '#000000';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#ffffff';               // SetTextColor(0x00ffffff)
  g.textBaseline = 'alphabetic';         // we place the baseline ourselves
  g.textAlign = 'left';                  // SetTextAlign(TA_LEFT)

  const px = PPEM * scale;
  const asc = TM_ASCENT * scale;

  // TextOutA accumulates INTEGER per-glyph advances, so every glyph origin is on a
  // whole pixel. Canvas positions subpixel, which drifts several pixels across a
  // 79-character row — draw character by character on integer origins instead.
  const drawRow = (text, y, bold) => {
    g.font = `${bold ? 'bold ' : ''}${px}px ${FACE}, serif`;
    let x = 0;
    for (const ch of text) {
      g.fillText(ch, x, y + asc);
      x += Math.round(g.measureText(ch).width);
    }
    return x;
  };

  // The four TextOutA calls, in the original's order (§17): the two strings are each
  // drawn twice, regular then bold, into four 128-row bands.
  const widths = [
    drawRow(STR_LOWER, 0 * 128 * scale, false),
    drawRow(STR_UPPER, 1 * 128 * scale, false),
    drawRow(STR_LOWER, 2 * 128 * scale, true),
    drawRow(STR_UPPER, 3 * 128 * scale, true),
  ];

  const rgba = g.getImageData(0, 0, W, H).data;
  // `((u8*)buf)[i*4+3] |= 0xff` — the op forces the top byte, then writes only
  // components 1..3 back into the layer, whose alpha stays 1.0.
  for (let i = 3; i < rgba.length; i += 4) rgba[i] = 255;
  return { width: W, height: H, rgba, widths, px, asc };
}

/**
 * The atlas as `text.js`'s `loadAtlas` returns it, but generated rather than fetched.
 * Same post-processing as loadAtlas: take the BLUE channel (the original's
 * `buf[i] &= 0xff`), scan it for glyph boxes, and republish as
 * `alpha = coverage, rgb = white` (`buf[i] = buf[i] << 24 | 0xffffff`).
 */
export function makeAtlas(d3d, scale = 1) {
  const r = renderFontAtlas(scale);
  const n = r.width * r.height;
  const cov = new Uint8Array(n);
  const argb = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    const b = r.rgba[i * 4 + 2];
    cov[i] = b;
    argb[i] = ((b << 24) | 0xffffff) >>> 0;
  }
  const uv = buildGlyphTable(cov, r.width, r.height);
  const texture = d3d.createTexture(argb, r.width, r.height, { levels: 0 });
  return {
    texture, uv, width: r.width, height: r.height, coverage: cov,
    generated: true, rowWidths: r.widths,
  };
}

export default makeAtlas;
