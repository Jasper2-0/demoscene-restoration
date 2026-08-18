// capcheck.mjs — our picture against the video capture.
//
//   node work/re/capcheck.mjs [capture.mkv] [--samples=20] [--record=DIR]
//
// EVERY OTHER SUITE HERE MEASURES AGAINST draws.json, which is a recording of
// the ORIGINAL's own draw calls. That is a very strong oracle for the engine
// and it says nothing whatever about the picture: the shim could have the wrong
// blend mode, the wrong fog, the wrong texture filter, or the whole thing
// upside down, and 45,327 primitives would still match. METHOD.md §7 makes the
// capture ground truth precisely because it is the only thing downstream of
// every choice at once.
//
// WHAT THIS CANNOT BE. Pixel equality is impossible and asking for it would be
// a check designed to fail: the capture is H.264 at 29.97 fps of a 16-bit
// dithered Amiga framebuffer, and we render 8-bit RGBA at 50 Hz through
// WebGL2. So the comparison is a zero-mean normalised cross-correlation of the
// LUMA on a coarse grid — it asks "is this the same picture", not "are these
// the same bytes".
//
// ⚠ THIS CHECK CURRENTLY FAILS, DELIBERATELY, and is not wired into
// checkall.sh. It is the frontier, in the same way scenegram.py reported 0/29
// for most of this project's life: the number it prints is the honest state of
// the picture, and hiding it behind a threshold nobody would ever raise is
// worse than a red line.
//
// WHERE IT STANDS. The composition is right — put ours and the reference side
// by side at 100 s and the same shard cloud, the same letterbox and the same
// vignette are in the same places. The shading is not: mean ZNCC 0.202 with
// texenv=1 against -0.269 with the default, and 6 of 16 frames identifying
// themselves. Two things it has already found and one it has already decided
// are in the commit log.
//
// AND IT CARRIES ITS OWN CONTROL, because a blurry metric on two dark frames
// will happily report 0.9 for any pairing. Every capture frame is scored
// against every one of ours, and what is asserted is that the DIAGONAL wins:
// the frame at t matches our frame at t better than it matches our frame at any
// other sampled time. A comparison that cannot tell the frames apart fails
// that, whatever its correlation says.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { withPage, findChrome } from '../../../../tools/harness/index.mjs';

const ABSENT = 77;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROD = path.resolve(HERE, '..', '..');
const argv = process.argv.slice(2);
const arg = (k, d) => {
  const a = argv.find((x) => x.startsWith(`--${k}=`));
  return a ? a.split('=')[1] : d;
};
const prod = JSON.parse(fs.readFileSync(path.join(PROD, 'prod.json'), 'utf8'));
const cap = prod.captures?.find((c) => c.alignmentOffsetMs !== null
  && c.alignmentOffsetMs !== undefined);
const CAPTURE = argv.find((a) => !a.startsWith('--'))
  ?? path.resolve(PROD, '..', '..', cap?.path ?? '');
const OFFSET_MS = cap?.alignmentOffsetMs;
const RECORD = arg('record', null);
const SAMPLES = Number(arg('samples', 20));

// The grid. 640x480 into 64x48 cells of 10x10 — coarse enough to survive H.264
// and a frame-rate mismatch, fine enough that two different scenes cannot
// score alike.
const GX = 64, GY = 48;

let failed = 0;
const ok = (name, pass, detail = '') => {
  console.log(`${pass ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
  if (!pass) failed++;
};

if (!fs.existsSync(CAPTURE)) {
  console.log(`capcheck: no capture at ${CAPTURE} — `
    + 'node tools/fetch/capture.mjs planet-potion. Skipping.');
  process.exit(ABSENT);
}
if (OFFSET_MS === null || OFFSET_MS === undefined) {
  console.log('capcheck: prod.json has no alignmentOffsetMs — run capalign '
    + 'with --record first. Skipping.');
  process.exit(ABSENT);
}
if (!findChrome()) {
  console.log('capcheck: no Chrome. Skipping.');
  process.exit(ABSENT);
}
try {
  execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
} catch {
  console.log('capcheck: no ffmpeg. Skipping.');
  process.exit(ABSENT);
}

// Part one only. Part three's start inside the capture is a SECOND alignment
// and nothing has measured it: the two parts run consecutively there and our
// clock restarts at zero for each, so a p3 comparison would be testing a guess
// about the gap rather than the picture.
const P1_SECONDS = 288.4;
const times = Array.from({ length: SAMPLES },
  (_, i) => +(6 + (P1_SECONDS - 12) * (i / (SAMPLES - 1))).toFixed(2));

/** One capture frame, as a GX x GY grid of mean luma. */
function captureGrid(seconds) {
  const at = Math.max(0, seconds - OFFSET_MS / 1000);
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-ss', String(at),
    '-i', CAPTURE, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'gray',
    '-s', '640x480', '-'], { maxBuffer: 1 << 26 });
  if (raw.length !== 640 * 480) throw new Error(`ffmpeg gave ${raw.length} bytes`);
  const g = new Float64Array(GX * GY);
  for (let y = 0; y < 480; y++) {
    for (let x = 0; x < 640; x++) {
      g[(y / 10 | 0) * GX + (x / 10 | 0)] += raw[y * 640 + x];
    }
  }
  for (let i = 0; i < g.length; i++) g[i] /= 100;
  return g;
}

/** Zero-mean normalised cross-correlation: 1.0 identical, 0 unrelated. */
function zncc(a, b) {
  let ma = 0, mb = 0;
  for (let i = 0; i < a.length; i++) { ma += a[i]; mb += b[i]; }
  ma /= a.length; mb /= b.length;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] - ma, y = b[i] - mb;
    num += x * y; da += x * x; db += y * y;
  }
  return da && db ? num / Math.sqrt(da * db) : 0;
}

// READ THE FRAMEBUFFER, not a screenshot: a screenshot is the canvas after the
// page has scaled it to the window, and the scaling is the browser's business
// rather than the port's. GL's origin is bottom-left and the video's is
// top-left, so the rows are flipped here.
const PROBE = `((gx, gy) => {
  const c = document.querySelector('canvas');
  const gl = c.getContext('webgl2');
  const px = new Uint8Array(c.width * c.height * 4);
  gl.readPixels(0, 0, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const g = new Float64Array(gx * gy);
  const cw = c.width / gx, ch = c.height / gy;
  for (let y = 0; y < c.height; y++) {
    const row = c.height - 1 - y;
    for (let x = 0; x < c.width; x++) {
      const o = (row * c.width + x) * 4;
      const l = 0.299 * px[o] + 0.587 * px[o + 1] + 0.114 * px[o + 2];
      g[((y / ch) | 0) * gx + ((x / cw) | 0)] += l;
    }
  }
  const n = cw * ch;
  return Array.from(g, (v) => v / n);
})(${GX}, ${GY})`;

// ONE FORWARD PASS for all of them. The animation is stateful — the beat sync
// and the loop modes accumulate, and the overlay runs on the part's clock, not
// the scene's — so a frame is not a function of its tick alone and each sample
// would otherwise cost a replay of everything before it.
const ours = [];
const draws = [];
await withPage({
  root: 'productions/planet-potion/web', path: '/index.html',
  query: `?show=p1&at=0${arg('texenv', null) ? `&texenv=${arg('texenv')}` : ''}`,
  extraArgs: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
}, async ({ page }) => {
  await page.waitForFunction('window.__ppReady === true', { timeout: 180000 });
  const got = await page.evaluate(
    `window.__pp.sweep(${JSON.stringify(times.map((t) => Math.round(t * 50)))},`
    + ` (info) => ({ draws: info && info.objects, g: ${PROBE} }))`);
  for (const r of got) {
    draws.push(r?.draws ?? 0);
    ours.push(Float64Array.from(r?.g ?? new Array(GX * GY).fill(0)));
  }
});

const theirs = times.map(captureGrid);

if (RECORD) {
  fs.mkdirSync(RECORD, { recursive: true });
  for (let i = 0; i < times.length; i++) {
    const at = Math.max(0, times[i] - OFFSET_MS / 1000);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(at), '-i', CAPTURE,
      '-frames:v', '1', path.join(RECORD, `ref_${times[i]}.png`)]);
  }
  console.log(`wrote reference frames to ${RECORD}/`);
}

// The full matrix: every capture frame against every one of ours.
let diagonalWins = 0, sumDiag = 0, worst = 1, worstAt = 0;
const rows = [];
for (let i = 0; i < times.length; i++) {
  let best = -2, bestJ = -1;
  for (let j = 0; j < times.length; j++) {
    const s = zncc(theirs[i], ours[j]);
    if (s > best) { best = s; bestJ = j; }
  }
  const d = zncc(theirs[i], ours[i]);
  sumDiag += d;
  if (d < worst) { worst = d; worstAt = times[i]; }
  if (bestJ === i) diagonalWins++;
  rows.push([times[i], d, best, times[bestJ], draws[i]]);
}

console.log(`\n${times.length} samples across part one, capture sampled at `
  + `t - ${OFFSET_MS} ms\n`);
console.log('    t      ours-vs-ref   best match   draws');
for (const [t, d, b, bt, n] of rows) {
  console.log(`  ${String(t).padStart(6)}s   ${d.toFixed(3).padStart(9)}`
    + `   ${bt === t ? '   (itself)' : `${String(bt).padStart(7)}s`}`
    + ` ${b.toFixed(3)}   ${String(n).padStart(5)}`);
}

const mean = sumDiag / times.length;
console.log('');
ok('every frame is rendered', draws.every((n) => n > 0),
  `${draws.filter((n) => n > 0).length}/${draws.length} drew something`);
// THE REAL ASSERTION. Correlation alone proves nothing on dark frames; this is
// the one that says the pictures line up in TIME as well as in content.
ok('each capture frame matches our frame at the same moment better than at any '
  + 'other', diagonalWins === times.length,
  `${diagonalWins}/${times.length}`);
ok('and the match is a match, not a coincidence', mean > 0.5,
  `mean ZNCC ${mean.toFixed(3)}, worst ${worst.toFixed(3)} at ${worstAt}s`);

if (failed) process.exit(1);
console.log('\nthe picture agrees with the capture, frame for frame in time');
