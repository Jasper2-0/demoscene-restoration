// capsweep.mjs — every scene, scored against the capture, worst first.
//
//   node work/re/capsweep.mjs [--part=p1|p3|both] [--out=DIR] [--worst=6]
//   node work/re/capsweep.mjs --align=p3     # find part three's capture offset
//
// capcheck.mjs asks one question — does the picture agree — and answers it with
// one number. This asks WHERE it disagrees, which is the question you want once
// the answer to the first one is "not yet". It sweeps a part, scores each scene
// against the reference at the same moment, ranks them, and writes the worst
// few out as side-by-side PNGs so the difference can be looked at rather than
// inferred from a correlation.
//
// A DIAGNOSTIC, NOT A CHECK. It asserts nothing and is not in checkall.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { withPage, findChrome } from '../../../../tools/harness/index.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROD = path.resolve(HERE, '..', '..');
const argv = process.argv.slice(2);
const arg = (k, d) => {
  const a = argv.find((x) => x.startsWith(`--${k}=`));
  return a ? a.split('=')[1] : d;
};
const prod = JSON.parse(fs.readFileSync(path.join(PROD, 'prod.json'), 'utf8'));
const cap = prod.captures?.find((c) => c.alignmentOffsetMs != null);
const CAPTURE = path.resolve(PROD, '..', '..', cap.path);
const OUT = arg('out', '/tmp/capsweep');
const WORST = Number(arg('worst', 6));
const ALIGN = arg('align', null);
const PART = arg('part', ALIGN ?? 'p1');
// Part one begins where the audio alignment says. Part three's start inside the
// capture is a SECOND offset that nothing has measured — the two parts run
// consecutively there and our clock restarts at zero for each — so it is
// searched for rather than assumed, and `--align=p3` is how.
const OFFSETS = { p1: -(cap.alignmentOffsetMs / 1000), p3: Number(arg('p3off', 297.5)) };

const GX = 64, GY = 48;
const PROFILE = process.env.PP_PROFILE ?? '/tmp/pp-chrome-profile';
const zncc = (a, b) => {
  let ma = 0, mb = 0;
  for (let i = 0; i < a.length; i++) { ma += a[i]; mb += b[i]; }
  ma /= a.length; mb /= b.length;
  let n = 0, da = 0, db = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] - ma, y = b[i] - mb; n += x * y; da += x * x; db += y * y;
  }
  return da && db ? n / Math.sqrt(da * db) : 0;
};

/** The whole capture at 1 fps as GXxGY luma grids — one ffmpeg pass. */
function captureGrids() {
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', CAPTURE,
    '-vf', `fps=1,scale=${GX}:${GY}`, '-f', 'rawvideo', '-pix_fmt', 'gray', '-'],
  { maxBuffer: 1 << 28 });
  const n = raw.length / (GX * GY);
  return Array.from({ length: n }, (_, i) =>
    Float64Array.from(raw.subarray(i * GX * GY, (i + 1) * GX * GY)));
}

function crc32(buf) {
  let c = ~0;
  for (const b of buf) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1)); }
  return ~c >>> 0;
}
const png = (w, h, rgb) => {
  const rawb = Buffer.alloc((w * 3 + 1) * h);
  let o = 0;
  for (let y = 0; y < h; y++) {
    rawb[o++] = 0;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      rawb[o++] = rgb[i]; rawb[o++] = rgb[i + 1]; rawb[o++] = rgb[i + 2];
    }
  }
  const chunk = (t, d) => {
    const c = Buffer.concat([Buffer.from(t), d]);
    const l = Buffer.alloc(4); l.writeUInt32BE(d.length);
    const cr = Buffer.alloc(4); cr.writeUInt32BE(crc32(c));
    return Buffer.concat([l, c, cr]);
  };
  const ih = Buffer.alloc(13);
  ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(rawb, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))]);
};

const GRID = `((gx, gy) => {
  const c = document.querySelector('canvas');
  const gl = c.getContext('webgl2');
  const px = new Uint8Array(c.width * c.height * 4);
  gl.readPixels(0, 0, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const g = new Float64Array(gx * gy);
  const cw = c.width / gx, ch = c.height / gy;
  const rgb = new Uint8Array(c.width * c.height * 3);
  for (let y = 0; y < c.height; y++) {
    const row = c.height - 1 - y;
    for (let x = 0; x < c.width; x++) {
      const o = (row * c.width + x) * 4, q = (y * c.width + x) * 3;
      rgb[q] = px[o]; rgb[q + 1] = px[o + 1]; rgb[q + 2] = px[o + 2];
      g[((y / ch) | 0) * gx + ((x / cw) | 0)] +=
        0.299 * px[o] + 0.587 * px[o + 1] + 0.114 * px[o + 2];
    }
  }
  return { g: Array.from(g, (v) => v / (cw * ch)), rgb: Array.from(rgb) };
})(${GX}, ${GY})`;

if (!findChrome()) { console.log('capsweep: no Chrome'); process.exit(77); }
fs.mkdirSync(OUT, { recursive: true });

const parts = PART === 'both' ? ['p1', 'p3'] : [PART];
const refs = captureGrids();
console.log(`capture: ${refs.length} seconds at 1 fps`);

for (const part of parts) {
  // Sample every scene at a few points inside its span.
  let frames = null;
  await withPage({
    root: 'productions/planet-potion/web', path: '/index.html',
    query: `?show=${part}&at=0`
      + (arg('texenv', null) !== null ? `&texenv=${arg('texenv')}` : '')
      + (arg('texalpha', null) !== null ? `&texalpha=${arg('texalpha')}` : ''),
    // A PERSISTENT PROFILE, so the page's IndexedDB survives between runs and
    // the softsynth is paid for once rather than once per invocation. Puppeteer
    // hands every launch a fresh temp profile otherwise, which is right for a
    // check and wrong for a tool you run twenty times in an afternoon.
    extraArgs: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader',
      `--user-data-dir=${PROFILE}`],
  }, async ({ page }) => {
    await page.waitForFunction('window.__ppReady === true', { timeout: 180000 });
    const last = await page.evaluate('window.__pp.lastTick');
    const step = Number(arg('step', 4)) * 50;
    const ticks = [];
    for (let k = step; k < last; k += step) ticks.push(k);
    frames = await page.evaluate(
      `window.__pp.sweep(${JSON.stringify(ticks)}, (info) => ({`
      + ` slot: info && info.slot, draws: info && info.objects, ...${GRID} }))`);
    frames.forEach((f, i) => { if (f) f.tick = ticks[i]; });
  });
  frames = frames.filter(Boolean);

  if (ALIGN === part) {
    let best = [-2, 0];
    for (let lag = 0; lag <= 400; lag += 1) {
      let t = 0, n = 0;
      for (const f of frames) {
        const ct = Math.round(f.tick / 50 + lag);
        if (ct >= 0 && ct < refs.length) { t += zncc(refs[ct], Float64Array.from(f.g)); n++; }
      }
      if (n > frames.length * 0.8 && t / n > best[0]) best = [t / n, lag];
    }
    console.log(`${part}: best capture offset ${best[1]} s, mean ZNCC ${best[0].toFixed(3)}`);
    continue;
  }

  const off = OFFSETS[part];
  const byScene = new Map();
  for (const f of frames) {
    const ct = Math.round(f.tick / 50 + off);
    if (ct < 0 || ct >= refs.length) continue;
    const s = zncc(refs[ct], Float64Array.from(f.g));
    const e = byScene.get(f.slot) ?? { n: 0, sum: 0, worst: 2, at: null, draws: 0 };
    e.n++; e.sum += s; e.draws = Math.max(e.draws, f.draws ?? 0);
    if (s < e.worst) { e.worst = s; e.at = f; }
    byScene.set(f.slot, e);
  }
  const rows = [...byScene].map(([slot, e]) =>
    ({ slot, mean: e.sum / e.n, worst: e.worst, at: e.at, draws: e.draws }))
    .sort((a, b) => a.mean - b.mean);

  console.log(`\n${part}: ${rows.length} scenes, capture offset ${off} s`);
  console.log('  scene     mean    worst   draws');
  for (const r of rows) {
    console.log(`  ${r.slot}  ${r.mean.toFixed(3).padStart(7)} `
      + `${r.worst.toFixed(3).padStart(8)}  ${String(r.draws).padStart(6)}`);
  }

  for (const r of rows.slice(0, WORST)) {
    const t = Math.round(r.at.tick / 50 + off);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(t), '-i', CAPTURE,
      '-frames:v', '1', path.join(OUT, `${part}_${r.slot}_ref.png`)]);
    fs.writeFileSync(path.join(OUT, `${part}_${r.slot}_ours.png`),
      png(640, 480, Uint8Array.from(r.at.rgb)));
  }
  console.log(`\nwrote the worst ${Math.min(WORST, rows.length)} scenes to ${OUT}/`);
}
