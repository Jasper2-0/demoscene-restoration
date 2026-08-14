// channels.mjs — per-CHANNEL statistics for one instant, ours vs the reference.
//
//   node productions/lapsus/work/verify/channels.mjs flu2 5.59
//   node productions/lapsus/work/verify/channels.mjs flu2 5.59 norefl=1
//
// score1.mjs answers "how close is this frame" in luma. That is the right
// question for a timing or geometry fault and the WRONG one for a colour
// fault: a surface can carry a strong warm cast and still correlate at 0.85,
// because correlation is invariant to exactly the affine change of level a
// colour bug produces. flu2 (#12) has been argued about in R/G/B ratios for
// several sessions with the numbers re-derived by hand each time, so here they
// are as a tool.
//
// WHAT IT MEASURES, and why each choice:
//
//   * LIT PIXELS ONLY. The frames are mostly black background, which would
//     dominate any whole-frame mean and hide the object entirely. A pixel
//     counts when EITHER side is above the threshold, so "we are black where
//     the capture is not" is included rather than silently dropped — that
//     asymmetry is the actual complaint in several of these issues.
//   * R/B RATIO, because it is the cast in one number and it is what the
//     reflection textures differ in (they are all warm).
//   * LIT AREA on each side separately. Equal means with different areas is a
//     different fault from equal areas with different means.
//   * A COARSE HISTOGRAM, because "too dark" and "missing mid-tone" look the
//     same in a mean and completely different in a histogram — flu2's fault is
//     the second, and the mean alone sent an earlier round after the first.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { withPage, shootCanvas, fromRepo } from '../../../../tools/harness/index.mjs';

const W = 640, H = 480, N = W * H;
const part = process.argv[2], local = parseFloat(process.argv[3]);
const extra = process.argv.slice(4).filter((a) => a.includes('='));
const LIT = Number(process.argv.find((a) => a.startsWith('--lit='))?.slice(6) ?? 40);
// --box=x0,y0,x1,y1 restricts BOTH sides to a region. Needed because `?onlyobj=`
// filters only OUR render while the reference keeps every object, so isolating
// an object by that route silently compares one object against two. flu2 is the
// case in point: its dezz.lwo title overlay is bright neutral text on the right,
// and including it drags the reference's measured colour cast toward neutral no
// matter what the metal is doing.
const BOX = (process.argv.find((a) => a.startsWith('--box='))?.slice(6) ?? '')
  .split(',').map(Number);
const [X0, Y0, X1, Y1] = BOX.length === 4 ? BOX : [0, 0, W, H];
if (!part || !Number.isFinite(local)) {
  console.error('usage: node channels.mjs <part> <local> [k=v ...] [--lit=40] [--box=x0,y0,x1,y1]');
  process.exit(2);
}

const prod = JSON.parse(fs.readFileSync(fromRepo('productions/lapsus/prod.json'), 'utf8'));
const cap = prod.captures[0], MKV = fromRepo(cap.path);
const offsets = cap.visualTrackOffsetsMs ?? cap.trackOffsetsMs;
const PH = {
  1: { off: offsets['data/mjuusik/1.mp3'] / 1000,
       p: { empt: 1, flu2: 14, pene: 23, krediili: 31, silli: 47, syrjakyla: 55,
            paleksi: 64.531, pehko: 74.062, hulluolli: 83.593 } },
  2: { off: offsets['data/mjuusik/2.mp3'] / 1000,
       p: { kuubiotekniikka: 0, diskojea: 13.8, kartonki: 22.3, hairball: 29.7,
            higherbiing: 36.7, viherio: 50.7, morko: 61.16, turska: 64.7,
            rad_out: 72.2, kaivoalieni: 86.2, made: 99.7, hedi: 105.2 } },
};
const ph = PH[1].p[part] !== undefined ? PH[1] : PH[2];
const captureTime = ph.off + ph.p[part] + local;

const TMP = path.join(process.env.TMPDIR ?? '/tmp', 'lapsus-channels');
fs.mkdirSync(TMP, { recursive: true });

// rgb24 rather than gray: the whole point is the channels.
const rgb = (png, raw) => {
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', png, '-vf',
    `scale=${W}:${H},format=rgb24`, '-f', 'rawvideo', raw]);
  return fs.readFileSync(raw);
};

await withPage({ root: 'productions/lapsus', path: '/web/index.html',
  query: `?scene=${part}&t=${local}${extra.length ? '&' + extra.join('&') : ''}`,
  width: W, height: H, viewport: { width: W, height: H } }, async ({ page }) => {
  await page.waitForFunction('window.__lapsusReady === true', { timeout: 60000 });
  const e = await page.evaluate(() => window.__lapsusError ?? null);
  if (e) throw new Error(e);
  fs.writeFileSync(`${TMP}/o.png`, await shootCanvas(page, { canvasSelector: '#c', warmupFrames: 2 }));
});
execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(captureTime), '-i', MKV,
  '-frames:v', '1', `${TMP}/r.png`]);

const A = rgb(`${TMP}/o.png`, `${TMP}/o.raw`), B = rgb(`${TMP}/r.png`, `${TMP}/r.raw`);
const luma = (b, i) => 0.2126 * b[i] + 0.7152 * b[i + 1] + 0.0722 * b[i + 2];

const acc = { a: [0, 0, 0], b: [0, 0, 0], n: 0, litA: 0, litB: 0 };
const BANDS = [0, 32, 64, 96, 128, 160, 192, 224, 256];
const histA = new Array(BANDS.length - 1).fill(0), histB = histA.slice();
let inBox = 0;
for (let p = 0; p < N; p++) {
  const px = p % W, py = (p / W) | 0;
  if (px < X0 || px >= X1 || py < Y0 || py >= Y1) continue;
  inBox++;
  const i = p * 3, la = luma(A, i), lb = luma(B, i);
  if (la >= LIT) acc.litA++;
  if (lb >= LIT) acc.litB++;
  for (let k = 0; k < BANDS.length - 1; k++) {
    if (la >= BANDS[k] && la < BANDS[k + 1]) histA[k]++;
    if (lb >= BANDS[k] && lb < BANDS[k + 1]) histB[k]++;
  }
  // EITHER side lit, so "black in ours, lit in the capture" is counted rather
  // than excluded by the very condition it violates.
  if (la < LIT && lb < LIT) continue;
  for (let c = 0; c < 3; c++) { acc.a[c] += A[i + c]; acc.b[c] += B[i + c]; }
  acc.n++;
}

const mean = (v) => v.map((x) => x / Math.max(acc.n, 1));
const [ar, ag, ab] = mean(acc.a), [br, bg, bb] = mean(acc.b);
const pct = (x) => (100 * x / Math.max(inBox, 1)).toFixed(1) + '%';

console.log(`\n  ${part} @${local}s   ${extra.join(' ') || '(baseline)'}` +
  `   capture ${captureTime.toFixed(2)}s   lit >= ${LIT}` +
  (BOX.length === 4 ? `   box ${X0},${Y0}..${X1},${Y1}` : ''));
console.log(`\n  over ${acc.n} pixels lit on either side:\n`);
console.log('           R       G       B     R/B    lit area');
console.log(`  ours   ${ar.toFixed(1).padStart(6)}  ${ag.toFixed(1).padStart(6)}  ` +
  `${ab.toFixed(1).padStart(6)}  ${(ar / (ab || 1)).toFixed(2).padStart(6)}   ${pct(acc.litA)}`);
console.log(`  ref    ${br.toFixed(1).padStart(6)}  ${bg.toFixed(1).padStart(6)}  ` +
  `${bb.toFixed(1).padStart(6)}  ${(br / (bb || 1)).toFixed(2).padStart(6)}   ${pct(acc.litB)}`);
// The per-channel factor we would have to multiply by to land on the capture.
// A flat row is a LEVEL fault; a sloped row is a CAST fault. They have
// different causes and this is the cheapest way to tell them apart.
console.log(`\n  ours x (${(br / (ar || 1)).toFixed(3)}, ${(bg / (ag || 1)).toFixed(3)}, ` +
  `${(bb / (ab || 1)).toFixed(3)}) would match the reference's mean` +
  `\n    (flat => level fault; sloped => cast fault)`);

console.log('\n  luma histogram, share of the measured region:\n');
console.log('    band     ours     ref');
for (let k = 0; k < histA.length; k++) {
  const d = (100 * (histA[k] - histB[k]) / Math.max(inBox, 1));
  console.log(`   ${String(BANDS[k]).padStart(4)}-${String(BANDS[k + 1] - 1).padEnd(4)} ` +
    `${pct(histA[k]).padStart(7)} ${pct(histB[k]).padStart(7)}   ` +
    `${d > 0 ? '+' : ''}${d.toFixed(1)}`);
}
