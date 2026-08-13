// capture.mjs — visual verification of the text engine against the reference capture.
//
// Boots the port headless at a list of MUSIC POSITIONS, screenshots the canvas, pulls
// the matching frame out of reference/sonnet_ref.mkv, and writes a side-by-side
// montage plus similarity numbers.
//
//   node web/test/capture.mjs                 # the default position list
//   node web/test/capture.mjs 0x0300 0x0900   # specific positions
//   node web/test/capture.mjs --bg=b0b0b0     # paint the backbuffer (see below)
//
// Two regimes, and they are not equally strong:
//
//  * 0x0200..0x03ff — the TITLE CARD. Objects 0 and 2..10 are all still disabled, so
//    every pixel on screen comes from object 1. This is a true pixel comparison and
//    the numbers below are meaningful.
//  * everything after 0x0400 — the poem is BLACK text over the 3D scenes, which are
//    another agent's objects 2..10. Until those exist the comparison can only check
//    that the text lands in the right place, so we render on a flat background and
//    compare the two TEXT MASKS (dark ink over a light field), not raw pixels.
//
// The reference video runs 2.43 s ahead of music position 0 — measured from the
// title card's fade-in, which starts at 0x0200 (20.87 s) and is visible at 23.30 s.

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(HERE, '..');
const WORK = path.join(WEB, '..');
const ROOT = path.join(WORK, '..', '..');   // the repo root
const require = createRequire(path.join(ROOT, 'productions/ptct/work/js/package.json'));
const puppeteer = require('puppeteer-core');
const { createCanvas, loadImage } = require('canvas');

const { positionToSeconds } = await import(path.join(WEB, 'js/timeline.js'));

const REF = path.join(WORK, 'work/reference/sonnet_ref.mkv');
const OUT = path.join(HERE, 'shots');
fs.mkdirSync(OUT, { recursive: true });

export const REF_OFFSET = 2.43;
const SETTLE = (6 * 2.5 / 92) / 2;   // must match main.js's SETTLE_MS

const argv = process.argv.slice(2);
let extra = '', userBg = null;
for (const a of argv) {
  const m = a.match(/^--(bg|quality)=(.+)$/);
  if (!m) continue;
  if (m[1] === 'bg') userBg = m[2];
  else extra += `&${m[1]}=${encodeURIComponent(m[2])}`;
}
const INK_BG = userBg || 'b0b0b0';
const asked = argv.filter(a => !a.startsWith('--'))
  .map(s => s.startsWith('0x') ? parseInt(s, 16) : parseInt(s, 10));

// Title-card frames first (pure text-engine output), then one line per poem stanza.
// NB rows are 0..63, so the low byte never exceeds 0x3f.
const DEFAULTS = [
  0x0210, 0x0300, 0x0330,                                  // title card + bars
  0x0410, 0x0500, 0x0600, 0x0630, 0x0830, 0x0930,          // spring
  0x0b00, 0x0d00, 0x1010, 0x1130, 0x1300, 0x1520,          // summer
  0x1600, 0x1800, 0x1b00, 0x1d00, 0x2000, 0x2200,          // autumn/winter
  0x2900, 0x2b30,                                          // the credits
];
const POSITIONS = asked.length ? asked : DEFAULTS;
const TITLE_CARD = (p) => p >= 0x0200 && p < 0x0400;

// ------------------------------------------------------------------ static server
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png', '.xm': 'application/octet-stream',
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
await new Promise(r => server.listen(0, r));
const port = server.address().port;

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--use-angle=metal', '--hide-scrollbars', '--window-size=900,760'],
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 760, deviceScaleFactor: 1 });
page.on('console', m => { if (m.type() === 'error') console.log('[page]', m.text()); });
page.on('pageerror', e => console.log('[pageerror]', e.message));

// The page picks its backbuffer colour up at boot, and the two regimes want
// different ones, so reload whenever the regime changes.
let curBg = 'INIT';
async function useBg(bg) {
  if (bg === curBg) return;
  curBg = bg;
  await page.goto(`http://127.0.0.1:${port}/web/index.html?pos=0x0200&debug` +
    `${extra}${bg ? '&bg=' + bg + '&skip=0' : ''}`, { waitUntil: 'networkidle0' });
  await page.waitForFunction('window.__sonnetReady === true', { timeout: 60000 });
}

// --------------------------------------------------------------------- comparisons
const results = [];
for (const pos of POSITIONS) {
  const hex = '0x' + pos.toString(16).padStart(4, '0');
  // The credits are LIGHT grey text, so they need a dark field to stand out; the
  // rest of the poem is black ink and needs a light one.
  await useBg(TITLE_CARD(pos) ? null : (pos >= 0x2b00 ? '303030' : INK_BG));
  // RACE FIX (found by the sweep agent, 2026-08-05): the canvas is created with
  // preserveDrawingBuffer:false, so its contents are undefined once control returns
  // to the browser. `render(); setTimeout(40); elementHandle.screenshot()` can and
  // does capture a CLEARED buffer — observed reporting RMSE 136 where the truth was
  // 26, and consistently so within a session, which makes it look like a real
  // regression rather than a harness fault.
  //
  // The fix is to render and read back inside ONE page.evaluate, so nothing can
  // clear the buffer in between. Any earlier numbers taken with the old path
  // should be treated as suspect.
  const ours = path.join(OUT, `ours_${hex}.png`);
  const { info, dataUrl } = await page.evaluate(p => {
    const i = window.__sonnetRender(p);
    const c = document.querySelector('#screen');
    return { info: i, dataUrl: c.toDataURL('image/png') };
  }, pos);
  fs.writeFileSync(ours, Buffer.from(dataUrl.split(',')[1], 'base64'));

  const refT = positionToSeconds(pos) + REF_OFFSET + SETTLE;
  const refPng = path.join(OUT, `ref_${hex}.png`);
  execFileSync('ffmpeg', ['-v', 'error', '-ss', String(refT), '-i', REF,
    '-frames:v', '1', '-vf', 'scale=640:480', refPng, '-y']);

  const [A, B] = await Promise.all([pix(ours), pix(refPng)]);
  const r = TITLE_CARD(pos) ? comparePixels(A, B) : compareInkMasks(A, B);
  // Two situations the ink metric cannot speak to, called out rather than averaged in.
  if (meanLum(B) < 12) r.note = 'reference is mid fade-to-black (object 0), skip=0 here';
  else if (!r.inkOurs && info.quads) r.note = 'both mid-fade; below the mask threshold';
  r.pos = hex; r.t = refT; r.mode = TITLE_CARD(pos) ? 'pixel' : 'ink-mask';
  r.quads = info.quads;
  results.push(r);
  montage(ours, refPng, path.join(OUT, `cmp_${hex}.png`), hex, r);
  console.log(`${hex}  t=${refT.toFixed(2)}s  ${r.mode.padEnd(9)}  ` +
    Object.entries(r).filter(([k]) => !['pos', 't', 'mode', 'quads'].includes(k))
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${typeof v === 'number' ? v.toFixed(3) : v}`).join('  ') +
    `  quads=${r.quads}`);
}

// ---------------------------------------------------- object 0, the fade to black
//
// The compositor draws no geometry we can compare glyph-for-glyph; what it does is
// take the whole frame to black over a fixed time. So measure that directly: for
// every method-4 event that ramps alpha to 255, sample the reference's mean
// brightness and time how long it takes to bottom out. Our model says
// fadeT += dt*0.01 with the object's time scale of 60, i.e. 1/0.6 = 1.667 s.
if (!asked.length) {
  const tl = JSON.parse(fs.readFileSync(path.join(WEB, 'assets/timeline.json'), 'utf8'));
  const downs = tl.events.filter(e => e.obj === 0 && e.m === 4 && e.f === 255);
  console.log(`\nobject 0 — fade-to-black duration (model: ${(1 / 0.6).toFixed(2)} s)`);
  const measured = [];
  for (const e of downs) {
    const t0 = positionToSeconds(e.t) + REF_OFFSET;
    const raw = execFileSync('ffmpeg', ['-v', 'error', '-ss', String(t0 - 0.4), '-i', REF,
      '-t', '3.2', '-vf', 'fps=20,scale=32:24,format=gray', '-f', 'rawvideo', '-'],
      { maxBuffer: 1 << 24 });
    const N = 32 * 24, lum = [];
    for (let i = 0; i + N <= raw.length; i += N) {
      let s2 = 0; for (let k = 0; k < N; k++) s2 += raw[i + k];
      lum.push(s2 / N);
    }
    const peak = Math.max(...lum.slice(0, 8));
    const startI = lum.findIndex((v, i) => i > 0 && v < peak * 0.9);
    const endI = lum.findIndex((v, i) => i > startI && startI >= 0 && v < peak * 0.05);
    if (startI < 0 || endI < 0) { console.log(`  0x${e.t.toString(16)}  inconclusive`); continue; }
    const dur = (endI - startI) / 20;
    measured.push(dur);
    console.log(`  0x${e.t.toString(16).padStart(4, '0')}  starts ${(t0 + startI / 20 - 0.4).toFixed(2)} s ` +
      `(event ${t0.toFixed(2)} s)   ${dur.toFixed(2)} s to black`);
  }
  if (measured.length) {
    const mean = measured.reduce((a, b) => a + b, 0) / measured.length;
    console.log(`  mean ${mean.toFixed(2)} s over ${measured.length} fades ` +
      `(model 1.67 s, error ${((mean / (1 / 0.6) - 1) * 100).toFixed(0)}%)`);
    results.push({ check: 'compositor fade to black', meanSeconds: mean, model: 1 / 0.6 });
  }
}

fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 1));
await browser.close();
server.close();

// --------------------------------------------------------------------- helpers
function meanLum(d) {
  let s = 0;
  for (let i = 0; i < 640 * 480; i++)
    s += 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
  return s / (640 * 480);
}

async function pix(file) {
  const im = await loadImage(file);
  const c = createCanvas(640, 480);
  const g = c.getContext('2d');
  g.drawImage(im, 0, 0, 640, 480);
  return g.getImageData(0, 0, 640, 480).data;
}

/** Straight photometric comparison — only valid where we own every pixel. */
function comparePixels(a, b) {
  let se = 0, n = 640 * 480;
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 3; k++) { const d = a[i * 4 + k] - b[i * 4 + k]; se += d * d; }
  }
  const rmse = Math.sqrt(se / (n * 3));
  return { rmse, psnr: 20 * Math.log10(255 / Math.max(rmse, 1e-6)) };
}

/**
 * The poem is black ink. Isolate it in both images as "much darker than the local
 * background" and score the overlap. This is insensitive to the 3D scene behind the
 * text (which we do not render yet) but very sensitive to position, size and
 * letter-spacing — exactly what the text engine is responsible for.
 */
function compareInkMasks(a, b) {
  const ma = inkMask(a), mb = inkMask(b);
  // Score each LINE separately. The poem often puts two lines at opposite ends of
  // the screen, and a single bounding box would then span most of the frame and be
  // dominated by whatever the 3D scene is doing in between.
  const bands = rowBands(ma, 8);
  if (!bands.length) return { iou: 0, inkOurs: 0, note: 'no ink rendered' };

  const score = (band, sx, sy) => {
    let inter = 0, uni = 0, na = 0, nb = 0;
    for (let y = band.y0; y <= band.y1; y++) for (let x = band.x0; x <= band.x1; x++) {
      const A = ma[y * 640 + x];
      const yy = y + sy, xx = x + sx;
      const B = (yy >= 0 && yy < 480 && xx >= 0 && xx < 640) ? mb[yy * 640 + xx] : 0;
      if (A) na++;
      if (B) nb++;
      if (A && B) inter++;
      if (A || B) uni++;
    }
    return { iou: uni ? inter / uni : 0, na, nb };
  };

  let wSum = 0, iouSum = 0, bestSum = 0, na = 0, nb = 0, sdx = 0, sdy = 0;
  for (const band of bands) {
    const at0 = score(band, 0, 0);
    let best = at0.iou, bdx = 0, bdy = 0;
    for (let sy = -8; sy <= 8; sy += 2) for (let sx = -8; sx <= 8; sx += 2) {
      const v = score(band, sx, sy).iou;
      if (v > best) { best = v; bdx = sx; bdy = sy; }
    }
    const w = at0.na;
    wSum += w; iouSum += at0.iou * w; bestSum += best * w;
    sdx += bdx * w; sdy += bdy * w;
    na += at0.na; nb += at0.nb;
  }
  return {
    iou: wSum ? iouSum / wSum : 0,
    iouBest: wSum ? bestSum / wSum : 0,
    dx: wSum ? sdx / wSum : 0,
    dy: wSum ? sdy / wSum : 0,
    lines: bands.length, inkOurs: na, inkRef: nb,
    note: na < 250 ? 'faint (mid-fade in both)' : undefined,
  };
}

/** Split our mask into horizontal bands of ink, one per rendered line. */
function rowBands(m, pad) {
  const rows = new Uint8Array(480);
  for (let y = 0; y < 480; y++)
    for (let x = 0; x < 640; x++) if (m[y * 640 + x]) { rows[y] = 1; break; }
  const bands = [];
  let y = 0;
  while (y < 480) {
    if (!rows[y]) { y++; continue; }
    let e = y;
    while (e + 1 < 480 && (rows[e + 1] || (rows[e + 2] && e + 2 < 480))) e++;
    let x0 = 640, x1 = -1;
    for (let yy = y; yy <= e; yy++) for (let x = 0; x < 640; x++)
      if (m[yy * 640 + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
    bands.push({
      y0: Math.max(0, y - pad), y1: Math.min(479, e + pad),
      x0: Math.max(0, x0 - pad), x1: Math.min(639, x1 + pad),
    });
    y = e + 1;
  }
  return bands;
}

function inkMask(d) {
  const W = 640, H = 480, m = new Uint8Array(W * H);
  const lum = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++)
    lum[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
  const R = 8;   // a 17 px horizontal neighbourhood — wider than any stem
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let mx = 0, mn = 255;   // local extremes over the neighbourhood
      for (let k = -R; k <= R; k++) {
        const xx = x + k; if (xx < 0 || xx >= W) continue;
        const v = lum[y * W + xx];
        if (v > mx) mx = v;
        if (v < mn) mn = v;
      }
      // Two-sided: most of the poem is BLACK ink over bright scenery, but the intro
      // and the credits are LIGHT text over black, so score "locally extreme" either
      // way. The 45-level margin keeps 3D shading out of the mask.
      const v = lum[y * W + x];
      if ((mx > 30 && v < mx - 28) || (mn < 225 && v > mn + 28)) m[y * W + x] = 1;
    }
  }
  return m;
}

function centroid(m) {
  let sx = 0, sy = 0, n = 0;
  for (let y = 0; y < 480; y++) for (let x = 0; x < 640; x++)
    if (m[y * 640 + x]) { sx += x; sy += y; n++; }
  return n ? { x: sx / n, y: sy / n } : null;
}

function montage(ours, ref, out, label, r) {
  Promise.all([loadImage(ours), loadImage(ref)]).then(([A, B]) => {
    const c = createCanvas(1280, 500);
    const g = c.getContext('2d');
    g.fillStyle = '#111'; g.fillRect(0, 0, 1280, 500);
    g.drawImage(A, 0, 20, 640, 480);
    g.drawImage(B, 640, 20, 640, 480);
    g.fillStyle = '#7fa7d7'; g.font = '13px monospace';
    g.fillText(`OURS ${label}  ${r.mode}  ` +
      (r.rmse !== undefined ? `rmse ${r.rmse.toFixed(1)}`
        : `iou ${r.iou.toFixed(3)} best ${(r.iouBest ?? 0).toFixed(3)} @ ${r.dx},${r.dy}`), 8, 14);
    g.fillText(`REFERENCE t=${r.t.toFixed(2)}s`, 648, 14);
    fs.writeFileSync(out, c.toBuffer('image/png'));
  });
}
