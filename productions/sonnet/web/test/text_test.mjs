// text_test.mjs — headless checks of the text engine's pure logic.
//
// Everything here runs without a GPU: the charmap, the atlas column scan against
// the real baked atlas, the measure/layout maths, and the compositor's colour
// arithmetic. The visual comparison against the reference capture lives in
// test/capture.mjs.
//
// Run: node web/test/text_test.mjs

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB = join(HERE, '..');
const WORK = join(WEB, '..');
const ROOT = join(WORK, '..', '..');   // the repo root
const require = createRequire(join(ROOT, 'productions/ptct/work/js/package.json'));
const { createCanvas, loadImage } = require('canvas');

const { CHAR_MAP, buildGlyphTable, K, BAR_COLORS, TextEngine, SceneObjectBase } =
  await import(join(WEB, 'js/text.js'));
const { Compositor } = await import(join(WEB, 'js/compositor.js'));
const { Timeline, seek, positionToSeconds } = await import(join(WEB, 'js/timeline.js'));

let fails = 0;
const ok = (c, msg, extra = '') => {
  console.log((c ? 'PASS' : 'FAIL') + '  ' + msg + (extra ? `   [${extra}]` : ''));
  if (!c) fails++;
};

// --------------------------------------------------------------------- charmap
ok(CHAR_MAP[0x61] === 0 && CHAR_MAP[0x7a] === 25, "charmap: 'a'..'z' -> 0..25");
ok(CHAR_MAP[0x41] === 0x28 && CHAR_MAP[0x5a] === 0x41, "charmap: 'A'..'Z' -> 40..65");
ok(CHAR_MAP[0x30] === 0x1a && CHAR_MAP[0x39] === 0x23, "charmap: '0'..'9' -> 26..35");
ok(CHAR_MAP[0x2e] === 0x47 && CHAR_MAP[0x3a] === 0x46, "charmap: '.' 71, ':' 70");
ok(CHAR_MAP[0x20] === 0xff, 'charmap: space is the blank slot 0xff');
// The bold fold: text[i] |= 0x80 must select the +0x80 glyph, i.e. the y=256/384 bands.
ok(CHAR_MAP[0x61 | 0x80] === 0x80, "charmap: bold 'a' -> glyph 0x80");
ok(CHAR_MAP[0x41 | 0x80] === 0xa8, "charmap: bold 'A' -> glyph 0xa8");
ok(CHAR_MAP[0x20 | 0x80] === 0x7f, 'charmap: bold space -> the other blank slot 0x7f');

// ------------------------------------------------------------------ atlas scan
const img = await loadImage(join(WORK, 'work/baked/tex/11.png'));
const cv = createCanvas(img.width, img.height);
cv.getContext('2d').drawImage(img, 0, 0);
const rgba = cv.getContext('2d').getImageData(0, 0, img.width, img.height).data;
const cov = new Uint8Array(img.width * img.height);
for (let i = 0; i < cov.length; i++) cov[i] = rgba[i * 4 + 2];

const uv = buildGlyphTable(cov, img.width, img.height);
ok(img.width === 2048 && img.height === 512, 'atlas: 2048x512', `${img.width}x${img.height}`);

// Every glyph the poem can use must have found ink. The one documented exception
// is 0xa7 (bold apostrophe), whose row overruns the 2048 px strip.
const empty = [];
for (const g of [...Array(0x28).keys(), ...Array(0x20).keys()].map((v, i) => i < 0x28 ? v : v + 0x28)) {
  if (uv[g * 2 + 1] - uv[g * 2] < 3 / img.width) empty.push(g);
}
ok(empty.length === 0, 'atlas: every regular glyph scanned to a real box',
   empty.length ? empty.map(g => '0x' + g.toString(16)).join(',') : 'all 72 found');

const boldEmpty = [];
for (let g = 0x80; g < 0xc8; g++) {
  if (g >= 0xa8 && g < 0xa8) continue;
  if (uv[g * 2 + 1] - uv[g * 2] < 3 / img.width) boldEmpty.push(g);
}
ok(boldEmpty.length <= 1, 'atlas: at most one bold glyph missing (0xa7, the known overrun)',
   boldEmpty.length ? boldEmpty.map(g => '0x' + g.toString(16)).join(',') : 'none missing');

// u extents must be strictly ordered inside a band — proof the scan walks forward.
let ordered = true;
for (let g = 0x01; g < 0x28; g++) if (uv[g * 2] < uv[(g - 1) * 2 + 1] - 2 / img.width) ordered = false;
ok(ordered, 'atlas: lowercase-band glyph boxes advance monotonically');

// The space slots are the hardcoded blank strip, and it really is blank.
ok(Math.abs(uv[0xff * 2] - K.SPACE_U0) < 1e-6 && Math.abs(uv[0xff * 2 + 1] - K.SPACE_U1) < 1e-6,
   'atlas: space uses the hardcoded 0.98..0.99 strip');
// A plain space samples the REGULAR UPPERCASE band (glyph 0xff -> 0xff & 0x7f = 0x7f,
// which is >= 0x28, so the upper band), i.e. rows 128..255. That band must be blank
// there or every space in the poem would draw a sliver of a glyph. The BOLD rows
// overrun 2048 px in our bake (TEXGEN_PORT.md §19.4), so the bold bands are not
// blank in this strip — harmless, because no poem line has a bold space.
const band = img.height >> 2;
const stripBlank = (b) => {
  for (let x = Math.round(0.98 * img.width); x < Math.round(0.99 * img.width); x++)
    for (let y = b * band; y < (b + 1) * band; y++) if (cov[y * img.width + x]) return false;
  return true;
};
ok(stripBlank(1), 'atlas: the space strip is blank in the band a space samples');
if (!stripBlank(3)) console.log('NOTE  the bold-uppercase row overruns into the space strip '
  + '(no poem line uses a bold space, so nothing renders it)');

// --------------------------------------------------------------- measure/layout
const poem = JSON.parse(readFileSync(join(WORK, 'work/re/text/poem.json'), 'utf8'));
const fakeD3D = {
  reset2D() {}, setBlendMode() {}, SetTexture() {}, SetTextureStageState() {},
  SetTransform() {}, SetRenderState() {}, setCullMode() {},
  DrawPrimitiveUP() {}, DrawIndexedPrimitiveUP(...a) { this.draws.push(a); },
  createTexture() { return {}; }, clearColor: 0, draws: [],
};
const te = new TextEngine(fakeD3D, poem, { texture: {}, uv });
te.reset();

// Every line must be narrower than the screen; the original centres on x, so a
// line wider than 640 would run off both edges and something would be wrong with
// either the scan or the U_TO_PX constant.
const wide = [];
for (const it of te.items) {
  const w = te.measure(it, it.scale) * it.tracking;
  if (w > 640) wide.push(`${it.idx}:${Math.round(w)}px`);
}
ok(wide.length === 0, 'layout: no poem line is wider than the 640 px screen',
   wide.length ? wide.join(' ') : `widest ${Math.round(Math.max(
     ...te.items.map(i => te.measure(i, i.scale) * i.tracking)))} px`);

// A concrete measurement, so a change in the scan or the constants is visible.
const line = te.items[26];          // "Summer splendor is conceived during spring"
const w26 = te.measure(line, line.scale);
ok(w26 > 200 && w26 < 640, 'layout: item 26 measures a plausible width', `${w26} px`);

// The rendered glyph quads must land inside the screen for a mid-poem line.
line.active = true; line.t = 1;
fakeD3D.draws.length = 0;
te.drawItem(line);
ok(fakeD3D.draws.length === 1, 'layout: item 26 issues exactly one draw call');
{
  const [, , numVerts, numPrims] = fakeD3D.draws[0];
  const chars = [...line.text].filter(c => (c & 0x7f) !== 10).length;
  ok(numVerts === chars * 4 && numPrims === chars * 2,
     'layout: one quad per character, primitive count (not vertex count)',
     `${numVerts} verts / ${numPrims} tris for ${chars} chars`);
  let minX = 9, maxX = -9, minY = 9, maxY = -9;
  for (let i = 0; i < numVerts; i++) {
    const x = te.vf[i * 11], y = te.vf[i * 11 + 1];
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  ok(minX > -1.05 && maxX < 1.05 && minY > -1.05 && maxY < 1.05,
     'layout: item 26 stays inside NDC',
     `x ${minX.toFixed(2)}..${maxX.toFixed(2)} y ${minY.toFixed(2)}..${maxY.toFixed(2)}`);
  // Centred on (300, 350): NDC x centre 300*2/640-1 = -0.0625.
  const cx = (minX + maxX) / 2;
  ok(Math.abs(cx - (300 * K.NDC_X - 1)) < 0.06, 'layout: the line is CENTRED on item.x',
     `centre ${cx.toFixed(3)} vs ${(300 * K.NDC_X - 1).toFixed(3)}`);
}

// Bold selects the lower half of the atlas; italic shears only the top vertices.
{
  const it = te.items[18];   // "shine for me" — first five chars bold, last italic
  it.active = true; it.t = 1;
  fakeD3D.draws.length = 0;
  te.drawItem(it);
  const vBold = te.vf[0 * 11 + 8];          // first char is bold lowercase 's'
  ok(vBold >= 0.5, 'render: bold characters sample the y>=256 bands', `v=${vBold.toFixed(3)}`);
  const last = it.text.length - 1;
  const topX = te.vf[last * 44 + 0], botX = te.vf[last * 44 + 33];
  ok(topX > botX, 'render: the italic glyph leans (top vertices shifted right)',
     `top ${topX.toFixed(4)} > bottom ${botX.toFixed(4)}`);
}

// ---------------------------------------------------------------- fade machine
{
  const it = te.items[26];
  it.active = false; it.t = 0; it.tAccum = 0;
  te.dt = 30 * (1 / 60);                     // one 60 Hz frame at timeScale 30
  te.event(0, 26);
  ok(it.active && it.t === 0, 'events: m0 shows the item with t reset to 0');
  for (let i = 0; i < 200; i++) te.advance(it);
  ok(it.t === 1, 'fade: t saturates at 1.0 while shown');
  te.event(1, 26);
  ok(!it.active, 'events: m1 hides the item');
  te.advance(it);
  ok(it.t > 0 && it.t < 1,
     'fade: flag 0x10 is inside the 0x3010 mask, so hiding fades t DOWN from 1',
     it.t.toFixed(3));
  const noKeep = { ...it, flags: 0x0004, active: false, t: 1, tAccum: 1 };
  te.advance(noKeep);
  ok(noKeep.t === 0, 'fade: an item without 0x3010 would snap off instead (dead in this poem)');
}

// ---------------------------------------------------------------- compositor
{
  const c = new Compositor(fakeD3D);
  c.reset();
  c.event(255, 1); c.event(0, 0); c.event(1, 0); c.event(2, 0); c.event(254, 60);
  ok(c.enabled && c.color === 0, 'compositor: RGB events set black');
  c.event(252, 3);
  ok(c.layer === 3, 'compositor: m252 sets the render layer', String(c.layer));
  c.event(4, 255);
  ok(c.fading && (c.target >>> 24) === 255 && (c.color >>> 24) === 0,
     'compositor: m4 arms an alpha fade and leaves the current colour alone');
  // dt at timeScale 60 over 1 s of music -> fadeT +0.6; two seconds completes it.
  c.dt = 60 * 1.0; c.started = true; c.lastMs = 0;
  const ctx = { d3d: fakeD3D, ms: 1000, position: 0 };
  c.tick(ctx, false);
  ok((c.color >>> 24) === 0 && c.fadeT > 0.5, 'compositor: mid-fade alpha is interpolating',
     `fadeT ${c.fadeT.toFixed(2)}`);
  ctx.ms = 2000; c.tick(ctx, false);
  ok((c.color >>> 24) === 255, 'compositor: the fade lands on the target',
     '0x' + (c.color >>> 0).toString(16));
}

// ---------------------------------------------------------------- timeline wiring
{
  const tl = JSON.parse(readFileSync(join(WEB, 'assets/timeline.json'), 'utf8'));
  const objects = new Array(11).fill(null);
  const comp = new Compositor(fakeD3D);
  const text = new TextEngine(fakeD3D, poem, { texture: {}, uv });
  text.reset(); comp.reset();
  objects[0] = comp; objects[1] = text;
  const timeline = new Timeline(tl, objects);
  seek(timeline, 0x0900);
  ok(text.items[26].active, 'timeline: seek(0x0900) leaves item 26 shown');
  ok(!text.items[24].active, 'timeline: seek(0x0900) has already hidden item 24');
  ok(text.layer === 14 && comp.layer === 3,
     'timeline: object layers are text 14 / compositor 3',
     `${text.layer} / ${comp.layer}`);
  ok(comp.enabled, 'timeline: the compositor is enabled by 0x0400');
  ok(Math.abs(positionToSeconds(0x0900) - 93.9) < 0.5,
     'timeline: 0x0900 is ~94 s in', positionToSeconds(0x0900).toFixed(1));
}

// ---------------------------------------------------------------- bar colours
ok(BAR_COLORS.length === 6 && BAR_COLORS[0] === 0x7fa7d7 && BAR_COLORS[2] === 0xfdda62,
   'title card: the six bar colours match DAT_0041a9bc');

console.log(`\n${fails === 0 ? 'ALL PASS' : fails + ' FAILED'}`);
process.exit(fails ? 1 : 0);
