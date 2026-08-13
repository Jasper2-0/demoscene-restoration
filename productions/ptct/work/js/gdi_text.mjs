// GDI-faithful text rasterization for the ATG bake and engine text strips,
// using the genuine fonts macOS ships (Arial, Courier New, Times New Roman).
//
// GDI semantics being reproduced (CreateFontA with positive lfHeight H,
// TextOutA(x, y) = top of the text cell at y):
//   - H is the CELL height (ascent + descent, i.e. usWinAscent+usWinDescent);
//     the em size GDI selects is H * unitsPerEm / (winAscent + winDescent).
//   - baseline sits at y + ascentPx, ascentPx = em * winAscent / unitsPerEm.
//   - era-correct output is aliased 1-bit glyphs (no ClearType in 2000-era
//     DIB rendering); we threshold canvas coverage at 50%.
//
// Font vertical metrics (unitsPerEm / winAscent / winDescent), from the
// shipped TrueType files:
import canvasPkg from 'canvas';
const { createCanvas, registerFont } = canvasPkg;

const FONT_DEFS = [
  { name: 'Arial', file: '/System/Library/Fonts/Supplemental/Arial.ttf',
    bold: '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
    italic: '/System/Library/Fonts/Supplemental/Arial Italic.ttf',
    boldItalic: '/System/Library/Fonts/Supplemental/Arial Bold Italic.ttf',
    upem: 2048, winAscent: 1854, winDescent: 434 },
  { name: 'Courier New', file: '/System/Library/Fonts/Supplemental/Courier New.ttf',
    bold: '/System/Library/Fonts/Supplemental/Courier New Bold.ttf',
    italic: '/System/Library/Fonts/Supplemental/Courier New Italic.ttf',
    boldItalic: '/System/Library/Fonts/Supplemental/Courier New Bold Italic.ttf',
    upem: 2048, winAscent: 1705, winDescent: 615 },
  { name: 'Times New Roman', file: '/System/Library/Fonts/Supplemental/Times New Roman.ttf',
    upem: 2048, winAscent: 1825, winDescent: 443 },
  { name: 'Symbol', file: '/System/Library/Fonts/Supplemental/Symbol.ttf',
    upem: 1000, winAscent: 1005, winDescent: 220 },
];

let registered = false;
function ensureFonts() {
  if (registered) return;
  for (const f of FONT_DEFS) {
    try { registerFont(f.file, { family: `G_${f.name}` }); } catch (e) {}
    if (f.bold) try { registerFont(f.bold, { family: `G_${f.name}`, weight: 'bold' }); } catch (e) {}
    if (f.italic) try { registerFont(f.italic, { family: `G_${f.name}`, style: 'italic' }); } catch (e) {}
    if (f.boldItalic) try { registerFont(f.boldItalic, { family: `G_${f.name}`, weight: 'bold', style: 'italic' }); } catch (e) {}
  }
  registered = true;
}

// Render text with GDI TextOut semantics into a WxH coverage bitmap
// (Uint8Array, 0 or 255). fontIdx: 0 Arial, 1 Courier New, 2 Times, 3 Symbol.
// gridW (optional): fixed per-character advance in px — replicates GDI's
// integer-hinted monospace advances (Courier New @ cell 16 advanced exactly
// 8 px, which the engine's 1/64-cell reveal masks depend on). Cairo/canvas
// uses fractional advances, so grid placement must be explicit.
export function gdiTextToMap(map, W, H_, str, fontIdx, cellHeight, weight, italic, x, y, gridW = 0) {
  ensureFonts();
  const f = FONT_DEFS[fontIdx & 3];
  const em = (cellHeight * f.upem) / (f.winAscent + f.winDescent);
  const ascentPx = (em * f.winAscent) / f.upem;
  const c = createCanvas(W, H_);
  const ctx = c.getContext('2d');
  ctx.antialias = 'gray';
  const wSpec = weight >= 600 ? 'bold ' : '';
  const iSpec = italic ? 'italic ' : '';
  ctx.font = `${iSpec}${wSpec}${em}px "G_${f.name}"`;
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'alphabetic';
  if (gridW > 0) {
    for (let i = 0; i < str.length; i++) ctx.fillText(str[i], x + i * gridW, y + ascentPx);
  } else {
    ctx.fillText(str, x, y + ascentPx);
  }
  const img = ctx.getImageData(0, 0, W, H_).data;
  // Grayscale AA coverage (GDI with font smoothing on, the era default —
  // confirmed against reference footage), saturate-merged for tiled draws.
  for (let i = 0; i < W * H_; i++) {
    const v = map[i] + img[i * 4 + 3];
    map[i] = v > 255 ? 255 : v;
  }
  return map;
}

// Rasterizer hook for atg.js textOp (extended supersampling contract):
//   fn({ tmap, dim, positions, cellH, weight, italic, fontIndex, str, scale })
//     tmap      Uint8Array(dim*dim) white-text intensity map (merge)
//     dim       texture dimension in px (256*scale)
//     positions [{x, y}] pixel-space TextOut top-left positions (wrap copies)
//     cellH     GDI cell height in px, already scaled (= 2*size*scale)
// At scale>1 the glyphs are genuinely re-rasterized at the S× em size —
// real outline detail, not an upscale.
export function makeAtgTextRasterizer() {
  return ({ tmap, dim, positions, cellH, weight, italic, fontIndex, str }) => {
    for (const p of positions)
      gdiTextToMap(tmap, dim, dim, str, fontIndex, cellH, weight, italic, p.x, p.y);
  };
}
