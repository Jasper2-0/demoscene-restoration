// generate_test.mjs — prove the browser generates what the bake baked.
//
// The port no longer downloads its content: textures come from js/texgen.mjs over
// the intro's own 4 KB resource archive, the font atlas from js/fontgen.js (texgen
// op 17 on a canvas) and the module from audio/writexm.mjs over the four embedded
// streams. `baked/` is kept as the fallback path AND as the regression corpus, and
// this is the test that uses it as one.
//
//   node web/test/generate_test.mjs [--keep]
//
// Three checks, of three different strengths:
//
//  1. TEXTURES — exact. The same `runTexgen` runs in both places, so every one of
//     the 28 programs must be byte-identical to baked/tex/<id>.png. Anything else
//     means the browser's floating point or typed-array behaviour diverges from
//     Node's, which would be a real and interesting bug.
//  2. MODULE — exact. buildXm() must reproduce extracted/sonnet.xm byte for byte.
//  3. FONT ATLAS — NOT exact, and cannot be. The bake rasterises with cairo/
//     FreeType and the browser with the platform's own rasteriser, so glyph stems
//     and AA ramps land differently (TEXGEN_PORT.md §19 lists the same limitation
//     against GDI itself). What must match is the thing the demo actually consumes:
//     §18's column scan finds the same glyph boxes in the same bands. That is
//     checked exactly; the pixels are only reported.

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(HERE, '..');
const WORK = path.join(WEB, '..');
const ROOT = path.join(WORK, '..', '..');   // the repo root
const require = createRequire(path.join(ROOT, 'productions/ptct/work/js/package.json'));
const puppeteer = require('puppeteer-core');

const { decodePNG } = await import(path.join(WORK, 'work/js/png.mjs'));

let fails = 0;
const ok = (c, msg, extra = '') => {
  console.log((c ? 'PASS' : 'FAIL') + '  ' + msg + (extra ? `   [${extra}]` : ''));
  if (!c) fails++;
};

// ------------------------------------------------------------------ static server
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png', '.xm': 'application/octet-stream',
  '.bin': 'application/octet-stream',
};
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  const p = path.join(WORK, rel);
  try {
    const data = fs.readFileSync(p);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, r));
const PORT = server.address().port;

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--use-angle=metal', '--hide-scrollbars', '--window-size=900,760'],
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 760, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[page]', m.text()); });

// warm=0: this test PROVES the browser generates its content, so the main boot
// must never load the warm store. The store gets its own section below, where
// warm and cold boots are compared artifact for artifact.
await page.goto(`http://127.0.0.1:${PORT}/web/index.html?pos=0x0200&quality=original&warm=0`,
  { waitUntil: 'networkidle0' });
await page.waitForFunction('window.__sonnetReady === true', { timeout: 120000 });

// ---------------------------------------------------------------------- timings
const timings = await page.evaluate(() => window.__sonnetTimings);
console.log('\nboot phases (headless Chrome, ANGLE/Metal):');
for (const p of timings.phases) console.log(`  ${p.name.padEnd(10)} ${p.ms.toFixed(1)} ms`);
console.log(`  ${'TOTAL'.padEnd(10)} ${timings.total.toFixed(1)} ms`);
if (timings.textures) {
  const t = [...timings.textures].sort((a, b) => b.ms - a.ms).slice(0, 6);
  console.log('  slowest programs: ' + t.map((x) => `${x.id}:${x.ms.toFixed(0)}ms`).join(' '));
}
ok(timings.atlasSource === 'generated', 'font atlas was GENERATED, not downloaded',
   String(timings.atlasSource));

// One probe of everything the warm store installs, hashed. Used twice: on this
// cold page and on a warm-booted page in the equivalence section below.
// ⚠ Must run on the cold page NOW, before the texture-comparison section — that
// section calls runTexgen directly, and texgen draws from the shared RNG
// stream, so probing after it would compare a polluted stream position.
const probeBuiltState = async (pg) => pg.evaluate(async () => {
  const MG = await import('/work/js/meshgen.mjs');
  const s7 = await import('/web/js/scene7.js');
  const { allTextureIds } = await import('/web/js/assets.js');
  const fnv = (b) => {
    let h = 0x811c9dc5;
    for (let i = 0; i < b.length; i++) { h ^= b[i]; h = Math.imul(h, 0x01000193) >>> 0; }
    return h >>> 0;
  };
  const tex = {};
  for (const { id, scale } of s7.texturePlan(allTextureIds())) {
    tex[`${id}@${scale}`] = fnv(s7.texgenImage(id, scale).rgba);
  }
  const shadows = {};
  for (const o of window.__sonnetObjects || []) {
    if (o && o.shadow && o.sceneIdx !== undefined) shadows[o.sceneIdx] = fnv(o.shadow);
  }
  return {
    rng: MG.randState() >>> 0, tex, shadows,
    warm: window.__sonnetTimings.warm,
    bootMs: window.__sonnetTimings.phases.reduce((a, p) => a + p.ms, 0),
  };
});
const coldState = await probeBuiltState(page);

// --------------------------------------------------------------------- textures
console.log('\ntextures — browser texgen vs baked/tex/*.png');
const texResults = await page.evaluate(async () => {
  const { RESOURCES } = await import('/work/js/resources.mjs');
  const { runTexgen } = await import('/work/js/texgen.mjs');
  const out = [];
  for (let id = 0; id < 28; id++) {
    // 11 is the font strip: its only op is 17, which is the GDI atlas and is not a
    // pixel program at all. Compared separately below.
    const r = runTexgen(RESOURCES[id]);
    let h = 0x811c9dc5;
    for (let i = 0; i < r.rgba.length; i++) {
      h ^= r.rgba[i];
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    out.push({ id, w: r.width, h: r.height, hash: h });
  }
  return out;
});

const fnv = (buf) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < buf.length; i++) { h ^= buf[i]; h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
};

let agree = 0, compared = 0;
const disagreements = [];
for (const t of texResults) {
  if (t.id === 11) continue;                    // handled by the atlas section
  const png = decodePNG(fs.readFileSync(path.join(WORK, 'work/baked/tex', `${t.id}.png`)));
  compared++;
  const same = png.width === t.w && png.height === t.h && fnv(png.rgba) === t.hash;
  if (same) agree++; else disagreements.push(t.id);
  console.log(`  tex ${String(t.id).padStart(2)}  ${t.w}x${t.h}  ` +
              (same ? 'identical' : 'DIFFERS'));
}
ok(agree === compared, `texgen: ${agree}/${compared} programs byte-identical to the bake`,
   disagreements.length ? 'differs: ' + disagreements.join(',') : 'all');

// ------------------------------------------------------------------- font atlas
console.log('\nfont atlas — browser op 17 vs baked/font_atlas_1x.png');
const atlasCmp = await page.evaluate(async () => {
  const { renderFontAtlas } = await import('/web/js/fontgen.js');
  const { buildGlyphTable } = await import('/web/js/text.js');
  const r = renderFontAtlas(1);
  const cov = new Uint8Array(r.width * r.height);
  for (let i = 0; i < cov.length; i++) cov[i] = r.rgba[i * 4 + 2];
  const uv = buildGlyphTable(cov, r.width, r.height);
  let ink = 0;
  for (let i = 0; i < cov.length; i++) if (cov[i] > 8) ink++;
  return { width: r.width, height: r.height, widths: r.widths, uv: Array.from(uv), ink };
});

const bakedAtlas = decodePNG(fs.readFileSync(path.join(WORK, 'work/baked/font_atlas_1x.png')));
const bakedCov = new Uint8Array(bakedAtlas.width * bakedAtlas.height);
for (let i = 0; i < bakedCov.length; i++) bakedCov[i] = bakedAtlas.rgba[i * 4 + 2];
const { buildGlyphTable } = await import(path.join(WEB, 'js/text.js'));
const bakedUv = buildGlyphTable(bakedCov, bakedAtlas.width, bakedAtlas.height);
let bakedInk = 0;
for (let i = 0; i < bakedCov.length; i++) if (bakedCov[i] > 8) bakedInk++;

ok(atlasCmp.width === bakedAtlas.width && atlasCmp.height === bakedAtlas.height,
   'atlas: same 2048x512 strip', `${atlasCmp.width}x${atlasCmp.height}`);

// §18: the demo derives every glyph box by scanning. The invariant is that the scan
// finds a box for the same glyph indices, in the same band — not that the boxes are
// the same width.
const found = (uv) => {
  const s = new Set();
  for (let g = 0; g < uv.length / 2; g++) if (uv[g * 2 + 1] > uv[g * 2]) s.add(g);
  return s;
};
const fa = found(atlasCmp.uv), fb = found(bakedUv);
const onlyBake = [...fb].filter((g) => !fa.has(g));
const onlyGen = [...fa].filter((g) => !fb.has(g));
ok(onlyBake.length === 0 && onlyGen.length === 0,
   `atlas: the glyph scan finds the same ${fb.size} glyphs`,
   onlyBake.length || onlyGen.length
     ? `bake-only ${onlyBake} / gen-only ${onlyGen}` : `${fa.size} glyphs`);

// How different are they really? Report, do not assert — different rasterisers.
let maxDx = 0, sumDx = 0, n = 0;
for (const g of fb) {
  if (!fa.has(g)) continue;
  const wA = (atlasCmp.uv[g * 2 + 1] - atlasCmp.uv[g * 2]) * atlasCmp.width;
  const wB = (bakedUv[g * 2 + 1] - bakedUv[g * 2]) * bakedAtlas.width;
  const d = Math.abs(wA - wB);
  maxDx = Math.max(maxDx, d); sumDx += d; n++;
}
console.log(`  glyph box width: mean |delta| ${(sumDx / n).toFixed(2)} px, ` +
            `max ${maxDx.toFixed(2)} px over ${n} glyphs`);
console.log(`  row advance sums: generated ${atlasCmp.widths.join('/')} ` +
            `(the strip is ${atlasCmp.width} wide)`);
console.log(`  inked texels: generated ${atlasCmp.ink}, baked ${bakedInk}, ` +
            `ratio ${(atlasCmp.ink / bakedInk).toFixed(3)}`);

// ----------------------------------------------------------------------- module
console.log('\nmodule — browser buildXm vs extracted/sonnet.xm');
const xmCmp = await page.evaluate(async () => {
  const { installBuffer, preloadFile } = await import('/web/js/node_compat.js');
  installBuffer();
  await preloadFile(new URL('/work/unpacked/sonnet_img.bin', location.href).href);
  const t0 = performance.now();
  const { buildXm } = await import('/work/audio/writexm.mjs');
  const b = buildXm({ panMode: 'correct' });
  const ms = performance.now() - t0;
  let h = 0x811c9dc5;
  for (let i = 0; i < b.length; i++) { h ^= b[i]; h = Math.imul(h, 0x01000193) >>> 0; }
  return { length: b.length, hash: h >>> 0, ms };
});
const refXm = fs.readFileSync(path.join(WORK, 'work/extracted/sonnet.xm'));
ok(xmCmp.length === refXm.length && xmCmp.hash === fnv(refXm),
   'module: browser-generated XM is byte-identical to extracted/sonnet.xm',
   `${xmCmp.length} B in ${xmCmp.ms.toFixed(0)} ms`);

// ------------------------------------------------------- warm-store equivalence
// The license to trust the precalc disk cache (js/warmstore.js): a warm boot
// must be indistinguishable from a cold one — same RNG stream position at
// __scenesReady, byte-identical texture cache, byte-identical shadow bakes.
// The cold side is the page already booted above (warm=0).
console.log('\nwarm store — ?warm=1 boot vs the cold boot above');
const { ensureWarmStore } = await import('./warmstore_node.mjs');
await ensureWarmStore('quality=original');
const warmPage = await browser.newPage();
warmPage.on('pageerror', (e) => console.log('[pageerror]', e.message));
await warmPage.goto(`http://127.0.0.1:${PORT}/web/index.html?pos=0x0200&quality=original&warm=1`,
  { waitUntil: 'networkidle0' });
await warmPage.waitForFunction('window.__sonnetReady === true', { timeout: 120000 });
const warmState = await probeBuiltState(warmPage);
await warmPage.close();

ok(warmState.warm === 'loaded', 'warm boot actually LOADED the store', warmState.warm);
ok(coldState.rng === warmState.rng,
   'RNG stream position at __scenesReady identical warm vs cold',
   `0x${coldState.rng.toString(16)}${coldState.rng === warmState.rng ? '' :
     ' vs 0x' + warmState.rng.toString(16)}`);
const texKeys = Object.keys(coldState.tex);
const texDiff = texKeys.filter((k) => coldState.tex[k] !== warmState.tex[k]);
ok(texDiff.length === 0 && texKeys.length === Object.keys(warmState.tex).length,
   `texture cache byte-identical warm vs cold (${texKeys.length} entries)`,
   texDiff.length ? 'differs: ' + texDiff.join(',') : 'all');
const shKeys = Object.keys(coldState.shadows);
const shDiff = shKeys.filter((k) => coldState.shadows[k] !== warmState.shadows[k]);
ok(shKeys.length > 0 && shDiff.length === 0
     && shKeys.length === Object.keys(warmState.shadows).length,
   `shadow bakes byte-identical warm vs cold (${shKeys.length} scenes)`,
   shDiff.length ? 'differs: scene ' + shDiff.join(',') : shKeys.length + ' scenes');
console.log(`  boot: cold ${coldState.bootMs.toFixed(0)} ms -> warm ${warmState.bootMs.toFixed(0)} ms`);

// ---------------------------------------------------------------------- payload
const size = (p) => { try { return fs.statSync(path.join(WORK, p)).size; } catch { return 0; } };
const gz = (p) => {
  const zlib = require('node:zlib');
  try { return zlib.gzipSync(fs.readFileSync(path.join(WORK, p)), { level: 9 }).length; }
  catch { return 0; }
};
const bakedPayload = size('work/extracted/sonnet.xm') + size('work/baked/tex_2x/11.png');
const genPayload = size('work/unpacked/sonnet_img.bin');
console.log(`\npayload the generators replace:` +
  `\n  baked      ${bakedPayload} B raw / ${gz('work/extracted/sonnet.xm') + gz('work/baked/tex_2x/11.png')} B gzip` +
  `\n  generated  ${genPayload} B raw / ${gz('work/unpacked/sonnet_img.bin')} B gzip`);

await browser.close();
server.close();
console.log(`\n${fails === 0 ? 'ALL PASS' : fails + ' FAILED'}`);
process.exit(fails ? 1 : 0);
